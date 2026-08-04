import type {
  MerchantRule,
  NormalisedTransaction,
  TransactionCategory,
  TransactionType,
} from "@/domain/models";

export interface ClassificationResult {
  category: string;
  subcategory: string | null;
  transactionType: TransactionType;
  confidenceScore: number;
}

const GLOBAL_MERCHANT_RULES: Array<{
  pattern: RegExp;
  category: TransactionCategory;
  type: TransactionType;
}> = [
  { pattern: /woolworths|coles|aldi|iga/i, category: "groceries", type: "expense" },
  { pattern: /uber\s*eats|menulog|doordash|deliveroo/i, category: "takeaway", type: "expense" },
  { pattern: /bp\s|shell|caltex|ampol|7-eleven.*fuel/i, category: "fuel", type: "expense" },
  { pattern: /myki|opal|translink|linkt|toll/i, category: "transport", type: "expense" },
  { pattern: /rent|real estate|property management/i, category: "rent", type: "bill" },
  { pattern: /agl|origin energy|energy australia|red energy/i, category: "utilities", type: "bill" },
  { pattern: /nrma|racv|allianz|bupa|medibank|nib/i, category: "insurance", type: "bill" },
  { pattern: /netflix|spotify|disney\+|stan|kayo|openai|chatgpt|adobe|microsoft 365/i, category: "subscriptions", type: "subscription" },
  { pattern: /gym|fitness first|anytime fitness/i, category: "gym", type: "subscription" },
  { pattern: /telstra|optus|vodafone|amaysim/i, category: "utilities", type: "bill" },
  { pattern: /officeworks|jb hi-fi|harvey norman|apple store/i, category: "technology", type: "expense" },
  { pattern: /salary|payroll|wages|itsoft/i, category: "income", type: "income" },
  { pattern: /transfer|tfr|osko|pay anyone/i, category: "transfer", type: "internal_transfer" },
  { pattern: /credit card payment|cc payment|card payment|payment received.*thank you/i, category: "transfer", type: "credit_card_repayment" },
];

const KEYWORD_RULES: Array<{
  keywords: string[];
  category: TransactionCategory;
  type: TransactionType;
}> = [
  { keywords: ["grocery", "supermarket", "market"], category: "groceries", type: "expense" },
  { keywords: ["restaurant", "cafe", "coffee"], category: "dining", type: "expense" },
  { keywords: ["petrol", "fuel", "service station"], category: "fuel", type: "expense" },
  { keywords: ["refund", "return"], category: "other", type: "refund" },
  { keywords: ["atm", "cash withdrawal"], category: "other", type: "cash_withdrawal" },
];

const CONFIDENCE_THRESHOLD = 0.6;

export class CategorisationService {
  classify(
    transaction: NormalisedTransaction,
    userRules: MerchantRule[] = []
  ): ClassificationResult {
    const merchant =
      transaction.normalisedMerchant?.toLowerCase() ??
      transaction.description.toLowerCase();

    // 1. User-specific merchant rules
    for (const rule of userRules) {
      if (merchant.includes(rule.merchantPattern.toLowerCase())) {
        return {
          category: rule.category,
          subcategory: rule.subcategory,
          transactionType: rule.transactionType ?? "expense",
          confidenceScore: 0.98,
        };
      }
    }

    // 2. Global merchant rules
    for (const rule of GLOBAL_MERCHANT_RULES) {
      if (
        rule.pattern.test(transaction.description) ||
        (transaction.normalisedMerchant &&
          rule.pattern.test(transaction.normalisedMerchant))
      ) {
        return {
          category: rule.category,
          subcategory: null,
          transactionType: rule.type,
          confidenceScore: 0.85,
        };
      }
    }

    // 3. Keyword rules
    const searchText = `${transaction.description} ${merchant}`.toLowerCase();
    for (const rule of KEYWORD_RULES) {
      if (rule.keywords.some((kw) => searchText.includes(kw))) {
        return {
          category: rule.category,
          subcategory: null,
          transactionType: rule.type,
          confidenceScore: 0.7,
        };
      }
    }

    // 4. Direction-based fallback
    if (transaction.direction === "credit") {
      return {
        category: "income",
        subcategory: null,
        transactionType: "income",
        confidenceScore: 0.5,
      };
    }

    return {
      category: "other",
      subcategory: null,
      transactionType: "unknown",
      confidenceScore: 0.3,
    };
  }

  isUncertain(result: ClassificationResult): boolean {
    return result.confidenceScore < CONFIDENCE_THRESHOLD;
  }

  normaliseMerchant(description: string): string {
    return description
      .replace(/\s+/g, " ")
      .replace(/\d{4,}/g, "")
      .replace(/[^\w\s&'-]/g, "")
      .trim()
      .slice(0, 80);
  }
}

export const categorisationService = new CategorisationService();
