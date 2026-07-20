import { describe, it, expect } from "vitest";
import { CategorisationService } from "@/domain/services/categorisation.service";

describe("CategorisationService", () => {
  const service = new CategorisationService();

  it("classifies Woolworths as groceries", () => {
    const result = service.classify({
      providerTransactionId: null,
      transactionDate: "2025-07-01",
      postedDate: null,
      description: "WOOLWORTHS 1234 SOUTH MELB",
      normalisedMerchant: "WOOLWORTHS",
      amountCents: 8740,
      direction: "debit",
      rawMetadata: {},
    });

    expect(result.category).toBe("groceries");
    expect(result.confidenceScore).toBeGreaterThan(0.6);
  });

  it("applies user merchant rules first", () => {
    const result = service.classify(
      {
        providerTransactionId: null,
        transactionDate: "2025-07-01",
        postedDate: null,
        description: "ITSOFT PTY LTD SALARY",
        normalisedMerchant: "ITSOFT",
        amountCents: 412600,
        direction: "credit",
        rawMetadata: {},
      },
      [
        {
          id: "r1",
          userId: "u1",
          merchantPattern: "itsoft",
          category: "income",
          subcategory: null,
          transactionType: "income",
        },
      ]
    );

    expect(result.category).toBe("income");
    expect(result.confidenceScore).toBe(0.98);
  });
});
