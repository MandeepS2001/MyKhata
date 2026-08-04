import { describe, expect, it } from "vitest";
import {
  parseBalanceToCents,
  resolveAccountBalanceCents,
} from "@/lib/accounts/balance";

describe("parseBalanceToCents", () => {
  it("parses signed CommBank balances", () => {
    expect(parseBalanceToCents("+1352.63")).toBe(135263);
    expect(parseBalanceToCents("-84.00")).toBe(-8400);
    expect(parseBalanceToCents("1,234.56")).toBe(123456);
  });

  it("returns null for empty values", () => {
    expect(parseBalanceToCents("")).toBeNull();
    expect(parseBalanceToCents(undefined)).toBeNull();
  });
});

describe("resolveAccountBalanceCents", () => {
  it("uses CSV balance for everyday accounts", () => {
    expect(
      resolveAccountBalanceCents({
        accountType: "everyday",
        importedBalances: [
          { date: "2026-07-01", balanceCents: 100000 },
          { date: "2026-07-19", balanceCents: 135263 },
        ],
        transactionNetCents: 50000,
      })
    ).toBe(135263);
  });

  it("stores credit card debt from transaction net", () => {
    expect(
      resolveAccountBalanceCents({
        accountType: "credit_card",
        importedBalances: [{ date: "2026-07-19", balanceCents: 135263 }],
        transactionNetCents: -52520,
      })
    ).toBe(-52520);
  });
});
