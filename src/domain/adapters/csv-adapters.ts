import type { NormalisedTransaction } from "@/domain/models";
import { parseToCents } from "@/lib/currency";
import { parse, isValid } from "date-fns";

export interface BankAdapter {
  readonly bankId: string;
  readonly displayName: string;
  canParse(headers: string[]): boolean;
  parse(rows: string[][]): NormalisedTransaction[];
}

function parseAustralianDate(value: string): string | null {
  const formats = ["dd/MM/yyyy", "d/M/yyyy", "yyyy-MM-dd", "dd-MM-yyyy"];
  for (const fmt of formats) {
    const parsed = parse(value.trim(), fmt, new Date());
    if (isValid(parsed)) {
      return parsed.toISOString().split("T")[0] ?? null;
    }
  }
  return null;
}

function parseAmount(value: string): { cents: number; direction: "debit" | "credit" } {
  const cleaned = value.replace(/[$,\s]/g, "").trim();
  if (cleaned.startsWith("-") || cleaned.includes("Dr")) {
    const cents = parseToCents(cleaned.replace(/Dr/i, "").replace("-", ""));
    return { cents: Math.abs(cents), direction: "debit" };
  }
  if (cleaned.includes("Cr") || !cleaned.startsWith("-")) {
    const cents = parseToCents(cleaned.replace(/Cr/i, ""));
    return { cents: Math.abs(cents), direction: cleaned.startsWith("-") ? "debit" : "credit" };
  }
  const cents = parseToCents(cleaned);
  return { cents: Math.abs(cents), direction: cents < 0 ? "debit" : "credit" };
}

export class CommBankCsvAdapter implements BankAdapter {
  readonly bankId = "commbank";
  readonly displayName = "CommBank";

  canParse(headers: string[]): boolean {
    const h = headers.map((x) => x.toLowerCase());
    return (
      h.some((x) => x.includes("date")) &&
      (h.some((x) => x.includes("amount")) || h.some((x) => x.includes("debit") || x.includes("credit")))
    );
  }

  parse(rows: string[][]): NormalisedTransaction[] {
    if (rows.length < 2) return [];
    const headers = rows[0]!.map((h) => h.toLowerCase().trim());
    const dateIdx = headers.findIndex((h) => h.includes("date"));
    const descIdx = headers.findIndex((h) => h.includes("description") || h.includes("narrative"));
    const amountIdx = headers.findIndex((h) => h === "amount");
    const debitIdx = headers.findIndex((h) => h.includes("debit"));
    const creditIdx = headers.findIndex((h) => h.includes("credit"));

    const results: NormalisedTransaction[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]!;
      if (!row[dateIdx]?.trim()) continue;

      const date = parseAustralianDate(row[dateIdx]!);
      if (!date) continue;

      const description = row[descIdx]?.trim() ?? "Unknown";
      let amountCents: number;
      let direction: "debit" | "credit";

      if (amountIdx >= 0 && row[amountIdx]) {
        const parsed = parseAmount(row[amountIdx]!);
        amountCents = parsed.cents;
        direction = parsed.direction;
      } else {
        const debitVal = row[debitIdx]?.trim();
        const creditVal = row[creditIdx]?.trim();
        if (debitVal) {
          amountCents = parseToCents(debitVal);
          direction = "debit";
        } else if (creditVal) {
          amountCents = parseToCents(creditVal);
          direction = "credit";
        } else {
          continue;
        }
      }

      results.push({
        providerTransactionId: `cba-${date}-${description.slice(0, 20)}-${amountCents}`,
        transactionDate: date,
        postedDate: date,
        description,
        normalisedMerchant: description.replace(/\s+/g, " ").slice(0, 80),
        amountCents,
        direction,
        rawMetadata: { row: i, bank: "commbank" },
      });
    }

    return results;
  }
}

export class WestpacCsvAdapter implements BankAdapter {
  readonly bankId = "westpac";
  readonly displayName = "Westpac";

  canParse(headers: string[]): boolean {
    const h = headers.map((x) => x.toLowerCase());
    return h.includes("date") && (h.includes("narrative") || h.includes("description"));
  }

  parse(rows: string[][]): NormalisedTransaction[] {
    if (rows.length < 2) return [];
    const headers = rows[0]!.map((h) => h.toLowerCase().trim());
    const dateIdx = headers.indexOf("date");
    const descIdx = headers.findIndex((h) => h.includes("narrative") || h.includes("description"));
    const debitIdx = headers.findIndex((h) => h.includes("debit"));
    const creditIdx = headers.findIndex((h) => h.includes("credit"));
    const balanceIdx = headers.findIndex((h) => h.includes("balance"));

    const results: NormalisedTransaction[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]!;
      if (!row[dateIdx]?.trim()) continue;

      const date = parseAustralianDate(row[dateIdx]!);
      if (!date) continue;

      const description = row[descIdx]?.trim() ?? "Unknown";
      const debitVal = row[debitIdx]?.trim();
      const creditVal = row[creditIdx]?.trim();

      let amountCents: number;
      let direction: "debit" | "credit";

      if (debitVal) {
        amountCents = parseToCents(debitVal);
        direction = "debit";
      } else if (creditVal) {
        amountCents = parseToCents(creditVal);
        direction = "credit";
      } else {
        continue;
      }

      results.push({
        providerTransactionId: `wbc-${date}-${description.slice(0, 20)}-${amountCents}`,
        transactionDate: date,
        postedDate: date,
        description,
        normalisedMerchant: description.replace(/\s+/g, " ").slice(0, 80),
        amountCents,
        direction,
        rawMetadata: {
          row: i,
          bank: "westpac",
          balance: balanceIdx >= 0 ? row[balanceIdx] : undefined,
        },
      });
    }

    return results;
  }
}

export const bankAdapters: BankAdapter[] = [
  new CommBankCsvAdapter(),
  new WestpacCsvAdapter(),
];

export function detectBankFormat(headers: string[]): BankAdapter | null {
  for (const adapter of bankAdapters) {
    if (adapter.canParse(headers)) {
      return adapter;
    }
  }
  return null;
}

export function parseCsvContent(content: string): string[][] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  return lines.map((line) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}
