import type { NormalisedTransaction } from "@/domain/models";
import { parseToCents } from "@/lib/currency";
import { format, parse, isValid } from "date-fns";

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
      // Use local calendar date — toISOString() shifts AU midnights back a day.
      return format(parsed, "yyyy-MM-dd");
    }
  }
  return null;
}

function looksLikeAmount(value: string): boolean {
  const cleaned = value.replace(/["'$,\s]/g, "").trim();
  if (!cleaned) return false;
  if (/^(dr|cr)$/i.test(cleaned)) return false;
  return /^-?\d+(\.\d+)?(dr|cr)?$/i.test(cleaned);
}

function parseAmount(value: string): { cents: number; direction: "debit" | "credit" } {
  const cleaned = value.replace(/["'$,\s]/g, "").trim();
  if (cleaned.startsWith("-") || /dr$/i.test(cleaned)) {
    const cents = parseToCents(cleaned.replace(/dr$/i, "").replace("-", ""));
    return { cents: Math.abs(cents), direction: "debit" };
  }
  if (/cr$/i.test(cleaned)) {
    const cents = parseToCents(cleaned.replace(/cr$/i, ""));
    return { cents: Math.abs(cents), direction: "credit" };
  }
  const cents = parseToCents(cleaned);
  return { cents: Math.abs(cents), direction: "credit" };
}

function isHeaderlessCommBankRow(cells: string[]): boolean {
  if (cells.length < 3) return false;
  return Boolean(parseAustralianDate(cells[0] ?? "")) && looksLikeAmount(cells[1] ?? "");
}

export class CommBankCsvAdapter implements BankAdapter {
  readonly bankId = "commbank";
  readonly displayName = "CommBank";

  canParse(headers: string[]): boolean {
    if (isHeaderlessCommBankRow(headers)) return true;

    const h = headers.map((x) => x.toLowerCase().replace(/['"]/g, "").trim());
    return (
      h.some((x) => x.includes("date")) &&
      (h.some((x) => x.includes("amount")) ||
        h.some((x) => x.includes("debit") || x.includes("credit")))
    );
  }

  parse(rows: string[][]): NormalisedTransaction[] {
    if (rows.length === 0) return [];

    const headerless = isHeaderlessCommBankRow(rows[0]!);
    const startIdx = headerless ? 0 : 1;

    let dateIdx = 0;
    let descIdx = 2;
    let amountIdx = 1;
    let debitIdx = -1;
    let creditIdx = -1;
    let balanceIdx = rows[0]!.length >= 4 ? 3 : -1;

    if (!headerless) {
      const headers = rows[0]!.map((h) => h.toLowerCase().replace(/['"]/g, "").trim());
      dateIdx = headers.findIndex((h) => h.includes("date"));
      descIdx = headers.findIndex((h) => h.includes("description") || h.includes("narrative"));
      amountIdx = headers.findIndex((h) => h === "amount");
      debitIdx = headers.findIndex((h) => h.includes("debit"));
      creditIdx = headers.findIndex((h) => h.includes("credit"));
      balanceIdx = headers.findIndex((h) => h.includes("balance"));
      if (dateIdx < 0) return [];
    }

    const results: NormalisedTransaction[] = [];

    for (let i = startIdx; i < rows.length; i++) {
      const row = rows[i]!;
      if (!row[dateIdx]?.trim()) continue;

      const date = parseAustralianDate(row[dateIdx]!);
      if (!date) continue;

      const description = row[descIdx]?.trim() || "Unknown";
      let amountCents: number;
      let direction: "debit" | "credit";

      if (amountIdx >= 0 && row[amountIdx]?.trim()) {
        const parsed = parseAmount(row[amountIdx]!);
        amountCents = parsed.cents;
        direction = parsed.direction;
      } else {
        const debitVal = row[debitIdx]?.trim();
        const creditVal = row[creditIdx]?.trim();
        if (debitVal) {
          amountCents = Math.abs(parseToCents(debitVal.replace(/["']/g, "")));
          direction = "debit";
        } else if (creditVal) {
          amountCents = Math.abs(parseToCents(creditVal.replace(/["']/g, "")));
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
        rawMetadata: {
          row: i,
          bank: "commbank",
          balance: balanceIdx >= 0 ? row[balanceIdx] : undefined,
        },
      });
    }

    return results;
  }
}

export class WestpacCsvAdapter implements BankAdapter {
  readonly bankId = "westpac";
  readonly displayName = "Westpac";

  canParse(headers: string[]): boolean {
    // Avoid claiming headerless CommBank files.
    if (isHeaderlessCommBankRow(headers)) return false;

    const h = headers.map((x) => x.toLowerCase().replace(/['"]/g, "").trim());
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
