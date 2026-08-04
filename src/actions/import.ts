"use server";

import { createClient } from "@/lib/supabase/server";
import { categorisationService } from "@/domain/services/categorisation.service";
import {
  detectBankFormat,
  parseCsvContent,
} from "@/domain/adapters/csv-adapters";
import {
  parseBalanceToCents,
  resolveAccountBalanceCents,
  signedTransactionCents,
} from "@/lib/accounts/balance";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const importSchema = z.object({
  accountId: z.string().uuid(),
  csvContent: z.string().min(1).max(5_000_000),
  fileName: z.string().max(255),
});

export async function importCsvStatement(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const parsed = importSchema.safeParse({
    accountId: formData.get("accountId"),
    csvContent: formData.get("csvContent"),
    fileName: formData.get("fileName"),
  });

  if (!parsed.success) {
    return { error: "Invalid import data" };
  }

  const { accountId, csvContent, fileName } = parsed.data;

  const { data: account } = await supabase
    .from("accounts")
    .select("id, account_type")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!account) {
    return { error: "Account not found" };
  }

  const rows = parseCsvContent(csvContent);

  if (rows.length < 1) {
    return { error: "CSV file appears empty or invalid" };
  }

  const headers = rows[0]!;
  const adapter = detectBankFormat(headers);

  if (!adapter) {
    return { error: "Could not detect bank format. Supported: CommBank, Westpac." };
  }

  const normalised = adapter.parse(rows);
  if (normalised.length === 0) {
    return { error: "No transactions found in this CSV." };
  }

  const errors: Array<{ row: number; message: string }> = [];

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      user_id: user.id,
      account_id: accountId,
      source: "csv",
      bank_format: adapter.bankId,
      status: "processing",
      total_rows: normalised.length,
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    return { error: batchError?.message ?? "Failed to create import batch" };
  }

  const { data: merchantRules } = await supabase
    .from("merchant_rules")
    .select("*")
    .eq("user_id", user.id);

  const mappedRules = (merchantRules ?? []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    merchantPattern: r.merchant_pattern,
    category: r.category,
    subcategory: r.subcategory,
    transactionType: r.transaction_type,
  }));

  let importedRows = 0;
  let duplicateRows = 0;
  let uncertainCount = 0;

  for (let i = 0; i < normalised.length; i++) {
    const txn = normalised[i]!;

    if (txn.providerTransactionId) {
      const { data: existing } = await supabase
        .from("transactions")
        .select("id")
        .eq("user_id", user.id)
        .eq("account_id", accountId)
        .eq("provider_transaction_id", txn.providerTransactionId)
        .maybeSingle();

      if (existing) {
        duplicateRows++;
        continue;
      }
    }

    const classification = categorisationService.classify(txn, mappedRules);
    if (categorisationService.isUncertain(classification)) {
      uncertainCount++;
    }

    const { error: insertError } = await supabase.from("transactions").insert({
      user_id: user.id,
      account_id: accountId,
      provider_transaction_id: txn.providerTransactionId,
      transaction_date: txn.transactionDate,
      posted_date: txn.postedDate,
      description: txn.description,
      normalised_merchant:
        txn.normalisedMerchant ??
        categorisationService.normaliseMerchant(txn.description),
      amount_cents: txn.amountCents,
      direction: txn.direction,
      category: classification.category,
      subcategory: classification.subcategory,
      confidence_score: classification.confidenceScore,
      transaction_type: classification.transactionType,
      source: "csv",
      import_batch_id: batch.id,
      raw_metadata: txn.rawMetadata,
    });

    if (insertError) {
      errors.push({ row: i + 1, message: insertError.message });
    } else {
      importedRows++;
    }
  }

  const { data: allTxns } = await supabase
    .from("transactions")
    .select("amount_cents, direction, transaction_date, raw_metadata")
    .eq("account_id", accountId)
    .eq("user_id", user.id);

  const importedBalances = (allTxns ?? [])
    .map((t) => {
      const meta = (t.raw_metadata ?? {}) as Record<string, unknown>;
      const balanceCents = parseBalanceToCents(meta.balance);
      if (balanceCents === null) return null;
      return { date: t.transaction_date as string, balanceCents };
    })
    .filter((x): x is { date: string; balanceCents: number } => x !== null);

  const transactionNetCents = (allTxns ?? []).reduce(
    (sum, t) =>
      sum +
      signedTransactionCents(
        t.amount_cents as number,
        t.direction as "debit" | "credit"
      ),
    0
  );

  const balanceCents = resolveAccountBalanceCents({
    accountType: account.account_type as string,
    importedBalances,
    transactionNetCents,
  });

  await supabase
    .from("accounts")
    .update({
      current_balance_cents: balanceCents,
      available_balance_cents:
        account.account_type === "credit_card"
          ? Math.max(0, balanceCents)
          : balanceCents,
      last_synced_at: new Date().toISOString(),
    })
    .eq("id", accountId)
    .eq("user_id", user.id);

  await supabase
    .from("import_batches")
    .update({
      status: "completed",
      imported_rows: importedRows,
      duplicate_rows: duplicateRows,
      error_rows: errors.length,
      error_report: errors,
      completed_at: new Date().toISOString(),
    })
    .eq("id", batch.id);

  await supabase.from("imported_files").insert({
    import_batch_id: batch.id,
    user_id: user.id,
    file_name: fileName,
    file_size_bytes: csvContent.length,
  });

  await supabase.from("audit_events").insert({
    user_id: user.id,
    event_type: "data_import",
    metadata: {
      batchId: batch.id,
      bankFormat: adapter.bankId,
      importedRows,
      duplicateRows,
      balanceCents,
    },
  });

  revalidatePath("/home");
  revalidatePath("/activity");
  revalidatePath("/import");

  return {
    success: true,
    batchId: batch.id,
    totalRows: normalised.length,
    importedRows,
    duplicateRows,
    errorRows: errors.length,
    errors,
    understoodCount: importedRows - uncertainCount,
    uncertainCount,
    bankFormat: adapter.displayName,
    balanceCents,
  };
}
