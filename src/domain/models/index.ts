export type FinancialTone = "direct" | "blunt" | "roast";
export type IncomeType = "hourly" | "salary" | "variable" | "mixed";
export type PaydayFrequency = "weekly" | "fortnightly" | "monthly" | "irregular";
export type CautionLevel = "relaxed" | "balanced" | "conservative";
export type AccountType =
  | "everyday"
  | "savings"
  | "credit_card"
  | "loan"
  | "offset"
  | "investment"
  | "cash"
  | "other";
export type DataSource = "csv" | "manual" | "mock" | "open_banking";
export type TransactionDirection = "debit" | "credit";
export type TransactionType =
  | "expense"
  | "income"
  | "internal_transfer"
  | "credit_card_repayment"
  | "credit_card_purchase"
  | "savings_contribution"
  | "savings_withdrawal"
  | "refund"
  | "reimbursement"
  | "cash_withdrawal"
  | "bill"
  | "subscription"
  | "shared_expense"
  | "debt_payment"
  | "debt_draw"
  | "reversal"
  | "unknown";

export const TRANSACTION_CATEGORIES = [
  "groceries",
  "dining",
  "takeaway",
  "fuel",
  "transport",
  "shopping",
  "entertainment",
  "subscriptions",
  "bills",
  "rent",
  "utilities",
  "insurance",
  "health",
  "travel",
  "salary",
  "income",
  "education",
  "personal_care",
  "pet",
  "pets",
  "technology",
  "gym",
  "work_expense",
  "transfer",
  "debt_repayment",
  "savings",
  "other",
] as const;

export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];

export type HousingStatus =
  | "rent"
  | "own_outright"
  | "mortgage"
  | "live_with_family"
  | "other";

export type RecurringFrequency =
  | "weekly"
  | "fortnightly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "irregular";

export interface Profile {
  id: string;
  displayName: string | null;
  currency: string;
  timezone: string;
  locale: string;
  paydayFrequency: PaydayFrequency;
  nextPayday: string | null;
  incomeType: IncomeType;
  incomeCents: number | null;
  hourlyRateCents: number | null;
  estimatedTaxRate: number | null;
  financialTone: FinancialTone;
  showWorkHours: boolean;
  minimumBufferCents: number;
  cautionLevel: CautionLevel;
  onboardingCompleted: boolean;
  isDemo: boolean;
  hasCar: boolean;
  carPaymentCents: number | null;
  carPaymentFrequency: RecurringFrequency | null;
  housingStatus: HousingStatus | null;
  rentFrequency: RecurringFrequency | null;
  rentTotalCents: number | null;
  rentShareCents: number | null;
  rentIsSplit: boolean;
  mortgagePaymentCents: number | null;
  mortgagePaymentFrequency: RecurringFrequency | null;
  financialPriorities: string[];
}

export interface Account {
  id: string;
  userId: string;
  institutionId: string | null;
  name: string;
  accountType: AccountType;
  institutionLabel: string | null;
  maskedIdentifier: string | null;
  currentBalanceCents: number;
  availableBalanceCents: number;
  creditLimitCents: number | null;
  currency: string;
  includedInSafeToSpend: boolean;
  isProtected: boolean;
  includeInNetWorth: boolean;
  purpose: string | null;
  icon: string | null;
  dataSource: DataSource;
  lastSyncedAt: string | null;
  isArchived: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  providerTransactionId: string | null;
  transactionDate: string;
  postedDate: string | null;
  description: string;
  normalisedMerchant: string | null;
  amountCents: number;
  direction: TransactionDirection;
  category: string;
  subcategory: string | null;
  confidenceScore: number;
  transactionType: TransactionType;
  /** Semantic behaviour — may be richer than persisted transactionType. */
  behaviour: TransactionType;
  transferMatchId: string | null;
  transferGroupId: string | null;
  isWorkExpense: boolean;
  workUsePercentage: number;
  isReimbursable: boolean;
  notes: string | null;
  source: DataSource;
  importBatchId: string | null;
}

export interface MerchantRule {
  id: string;
  userId: string;
  merchantPattern: string;
  category: string;
  subcategory: string | null;
  transactionType: TransactionType | null;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmountCents: number;
  currentAmountCents: number;
  targetDate: string | null;
  priority: number;
  isProtected: boolean;
  category: string | null;
  icon: string | null;
}

export interface WishlistItem {
  id: string;
  userId: string;
  name: string;
  priceCents: number;
  savedAmountCents: number;
  status: string;
  category: string | null;
  ongoingMonthlyCostCents: number;
}

export interface BreakdownLine {
  label: string;
  amountCents: number;
  type: "positive" | "negative" | "neutral";
}

export type ConfidenceLevel = "high" | "medium" | "low";

export interface SafeToSpendResult {
  safeToSpendCents: number;
  confidence: ConfidenceLevel;
  confidenceReason?: string;
  breakdown: BreakdownLine[];
  assumptions: string[];
  daysUntilPayday: number;
  billsCovered: boolean;
  savingsProtected: boolean;
  dailyPaceCents: number;
  breathingRoom: "comfortable" | "stable" | "tight" | "critical";
  breathingRoomReason: string;
}

export type AffordabilityVerdict =
  | "yes"
  | "technically_yes"
  | "wait"
  | "no"
  | "absolutely_not"
  | "save_first"
  | "protected_savings_required";

export interface GoalDelay {
  goalId: string;
  goalName: string;
  delayDays: number;
}

export interface AffordabilityResult {
  verdict: AffordabilityVerdict;
  score: number;
  explanation: string;
  cashAfterPurchaseCents: number;
  safeToSpendAfterPurchaseCents: number;
  billsCovered: boolean;
  protectedSavingsUsedCents: number;
  emergencyBufferRemainingCents: number;
  goalDelays: GoalDelay[];
  earliestSafeDate: string | null;
  workHoursCost: number | null;
  suggestedAction: string;
  assumptions: string[];
  confidence: ConfidenceLevel;
}

export interface NormalisedTransaction {
  providerTransactionId: string | null;
  transactionDate: string;
  postedDate: string | null;
  description: string;
  normalisedMerchant: string | null;
  amountCents: number;
  direction: TransactionDirection;
  rawMetadata: Record<string, unknown>;
}

export interface ImportResult {
  batchId: string;
  totalRows: number;
  importedRows: number;
  duplicateRows: number;
  errorRows: number;
  errors: Array<{ row: number; message: string }>;
  understoodCount: number;
  uncertainCount: number;
}
