import { createClient } from "@/lib/supabase/server";
import { categorisationService } from "@/domain/services/categorisation.service";
import {
  isBasiqConfigured,
  listBasiqAccounts,
  listBasiqTransactions,
  type BasiqAccount,
} from "@/lib/basiq/client";
import {
  displayInstitution,
  mapBasiqAccountType,
  mapBasiqBalances,
  mapBasiqTransaction,
} from "@/lib/basiq/mappers";
import { format, subDays } from "date-fns";

export async function syncBasiqDataForUser(input: {
  userId: string;
  basiqUserId: string;
  lookbackDays?: number;
}) {
  if (!isBasiqConfigured()) {
    return { error: "Basiq is not configured" };
  }

  const supabase = await createClient();
  const lookbackDays = input.lookbackDays ?? 90;
  const from = format(subDays(new Date(), lookbackDays), "yyyy-MM-dd");

  const accounts = await listBasiqAccounts(input.basiqUserId);
  if (accounts.length === 0) {
    return {
      success: true as const,
      accountCount: 0,
      importedRows: 0,
      message:
        "No bank accounts returned yet. Finish consent and try Sync again.",
    };
  }

  const { data: merchantRules } = await supabase
    .from("merchant_rules")
    .select("*")
    .eq("user_id", input.userId);

  const mappedRules = (merchantRules ?? []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    merchantPattern: r.merchant_pattern,
    category: r.category,
    subcategory: r.subcategory,
    transactionType: r.transaction_type,
  }));

  const byConnection = new Map<string, BasiqAccount[]>();
  for (const account of accounts) {
    const key = account.connection || "unknown";
    const list = byConnection.get(key) ?? [];
    list.push(account);
    byConnection.set(key, list);
  }

  let importedRows = 0;
  let accountCount = 0;

  for (const [basiqConnectionId, connAccounts] of byConnection) {
    const institutionLabel = displayInstitution(connAccounts[0]!);

    const { data: existingConns } = await supabase
      .from("bank_connections")
      .select("id, metadata")
      .eq("user_id", input.userId)
      .eq("provider", "basiq");

    const existingConn = (existingConns ?? []).find((c) => {
      const meta = (c.metadata ?? {}) as Record<string, unknown>;
      return meta.basiqConnectionId === basiqConnectionId;
    });

    let connectionId = existingConn?.id as string | undefined;

    if (!connectionId) {
      const { data: created, error } = await supabase
        .from("bank_connections")
        .insert({
          user_id: input.userId,
          provider: "basiq",
          status: "connected",
          last_synced_at: new Date().toISOString(),
          metadata: {
            basiqUserId: input.basiqUserId,
            basiqConnectionId,
            institutionLabel,
          },
        })
        .select("id")
        .single();

      if (error || !created) {
        return { error: error?.message ?? "Failed to save bank connection" };
      }
      connectionId = created.id;
    } else {
      await supabase
        .from("bank_connections")
        .update({
          status: "connected",
          last_synced_at: new Date().toISOString(),
          metadata: {
            basiqUserId: input.basiqUserId,
            basiqConnectionId,
            institutionLabel,
          },
        })
        .eq("id", connectionId);
    }

    for (const basiqAccount of connAccounts) {
      const accountType = mapBasiqAccountType(basiqAccount.class?.type);
      const balances = mapBasiqBalances(basiqAccount);
      const purposeKey = `basiq:${basiqAccount.id}`;

      const { data: existingAccount } = await supabase
        .from("accounts")
        .select("id")
        .eq("user_id", input.userId)
        .eq("purpose", purposeKey)
        .maybeSingle();

      let accountId = existingAccount?.id as string | undefined;

      if (!accountId) {
        const { data: createdAccount, error } = await supabase
          .from("accounts")
          .insert({
            user_id: input.userId,
            bank_connection_id: connectionId,
            name: basiqAccount.name,
            account_type: accountType,
            institution_label: institutionLabel,
            masked_identifier: basiqAccount.accountNo
              ? `****${basiqAccount.accountNo.slice(-4)}`
              : null,
            current_balance_cents: balances.currentBalanceCents,
            available_balance_cents: balances.availableBalanceCents,
            currency: basiqAccount.currency || "AUD",
            included_in_safe_to_spend:
              accountType !== "credit_card" && accountType !== "loan",
            data_source: "open_banking",
            connection_status: "connected",
            last_synced_at: new Date().toISOString(),
            purpose: purposeKey,
          })
          .select("id")
          .single();

        if (error || !createdAccount) {
          return { error: error?.message ?? "Failed to create account" };
        }
        accountId = createdAccount.id;
      } else {
        await supabase
          .from("accounts")
          .update({
            bank_connection_id: connectionId,
            current_balance_cents: balances.currentBalanceCents,
            available_balance_cents: balances.availableBalanceCents,
            connection_status: "connected",
            last_synced_at: new Date().toISOString(),
            data_source: "open_banking",
            institution_label: institutionLabel,
          })
          .eq("id", accountId);
      }

      accountCount++;

      const txns = await listBasiqTransactions(input.basiqUserId, {
        accountId: basiqAccount.id,
        from,
        limit: 500,
      });

      for (const raw of txns) {
        const normalised = mapBasiqTransaction(raw);
        if (!normalised?.providerTransactionId) continue;

        const { data: existing } = await supabase
          .from("transactions")
          .select("id")
          .eq("user_id", input.userId)
          .eq("provider_transaction_id", normalised.providerTransactionId)
          .maybeSingle();

        if (existing) continue;

        const classification = categorisationService.classify(
          normalised,
          mappedRules
        );

        const { error: insertError } = await supabase.from("transactions").insert({
          user_id: input.userId,
          account_id: accountId,
          provider_transaction_id: normalised.providerTransactionId,
          transaction_date: normalised.transactionDate,
          posted_date: normalised.postedDate,
          description: normalised.description,
          normalised_merchant:
            normalised.normalisedMerchant ??
            categorisationService.normaliseMerchant(normalised.description),
          amount_cents: normalised.amountCents,
          direction: normalised.direction,
          category: classification.category,
          subcategory: classification.subcategory,
          confidence_score: classification.confidenceScore,
          transaction_type: classification.transactionType,
          source: "open_banking",
          raw_metadata: normalised.rawMetadata,
        });

        if (!insertError) importedRows++;
      }
    }
  }

  await supabase.from("audit_events").insert({
    user_id: input.userId,
    event_type: "basiq_sync",
    metadata: {
      basiqUserId: input.basiqUserId,
      accountCount,
      importedRows,
    },
  });

  return {
    success: true as const,
    accountCount,
    importedRows,
    message: `Synced ${accountCount} accounts and ${importedRows} new transactions.`,
  };
}
