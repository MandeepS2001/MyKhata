import { describe, expect, it } from "vitest";
import {
  CommBankCsvAdapter,
  detectBankFormat,
  parseCsvContent,
} from "@/domain/adapters/csv-adapters";

describe("CommBankCsvAdapter", () => {
  it("detects headerless NetBank exports", () => {
    const rows = parseCsvContent(`12/07/2026,"-18.20","DESI KOTHI ICE CREAM P CLAYTON SOUT"
11/07/2026,"-50.15","WOOLWORTHS 3806 CLAYTON VI"
10/07/2026,"-12.40","UBER *TRIP HELP.UBER.C Sydney AUS"`);

    const adapter = detectBankFormat(rows[0]!);
    expect(adapter?.bankId).toBe("commbank");

    const parsed = new CommBankCsvAdapter().parse(rows);
    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toMatchObject({
      transactionDate: "2026-07-12",
      amountCents: 1820,
      direction: "debit",
      description: "DESI KOTHI ICE CREAM P CLAYTON SOUT",
    });
    expect(parsed[1]?.amountCents).toBe(5015);
  });

  it("detects exports with headers", () => {
    const rows = parseCsvContent(`Date,Amount,Description
12/07/2026,-18.20,Coffee
11/07/2026,100.00,Salary`);

    const adapter = detectBankFormat(rows[0]!);
    expect(adapter?.bankId).toBe("commbank");

    const parsed = adapter!.parse(rows);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.direction).toBe("debit");
    expect(parsed[1]).toMatchObject({
      amountCents: 10000,
      direction: "credit",
    });
  });

  it("parses optional balance column in headerless files", () => {
    const rows = parseCsvContent(`01/06/2026,-9.50,COLES,1234.56`);
    const parsed = new CommBankCsvAdapter().parse(rows);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.rawMetadata).toMatchObject({ balance: "1234.56" });
  });
});
