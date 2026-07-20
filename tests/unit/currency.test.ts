import { describe, it, expect } from "vitest";
import {
  formatCents,
  parseToCents,
  addCents,
  subtractCents,
  dollarsToCents,
  centsToWorkHours,
  computeAfterTaxHourly,
} from "@/lib/currency";

describe("CurrencyService", () => {
  it("formats cents as AUD", () => {
    expect(formatCents(1050)).toBe("$10.50");
    expect(formatCents(140000)).toBe("$1,400.00");
  });

  it("parses dollar strings to cents", () => {
    expect(parseToCents("$10.50")).toBe(1050);
    expect(parseToCents("1,400")).toBe(140000);
  });

  it("adds and subtracts cents without float errors", () => {
    expect(addCents(10, 20, 30)).toBe(60);
    expect(subtractCents(100, 33)).toBe(67);
  });

  it("converts dollars to cents", () => {
    expect(dollarsToCents(10.5)).toBe(1050);
  });

  it("computes work hours", () => {
    const afterTax = computeAfterTaxHourly(4500, 22);
    expect(centsToWorkHours(69900, afterTax)).toBeGreaterThan(0);
  });
});
