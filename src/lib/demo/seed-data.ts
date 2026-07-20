/** Demo seed data for Mandeep — Melbourne, AUD, 3 months history */

export const DEMO_PROFILE = {
  displayName: "Mandeep",
  currency: "AUD",
  timezone: "Australia/Melbourne",
  locale: "en-AU",
  paydayFrequency: "monthly" as const,
  incomeType: "hourly" as const,
  incomeCents: 412600,
  hourlyRateCents: 4500,
  estimatedTaxRate: 22,
  financialTone: "direct" as const,
  minimumBufferCents: 50000,
  cautionLevel: "balanced" as const,
};

export const DEMO_ACCOUNTS = [
  {
    name: "CommBank Smart Access",
    accountType: "everyday" as const,
    institutionLabel: "CommBank",
    maskedIdentifier: "****4521",
    currentBalanceCents: 284700,
    availableBalanceCents: 284700,
    purpose: "Daily spending",
    includedInSafeToSpend: true,
    isProtected: false,
    dataSource: "mock" as const,
  },
  {
    name: "CommBank Low Fee Credit Card",
    accountType: "credit_card" as const,
    institutionLabel: "CommBank",
    maskedIdentifier: "****8834",
    currentBalanceCents: -84000,
    availableBalanceCents: 416000,
    creditLimitCents: 500000,
    purpose: "Credit card",
    includedInSafeToSpend: true,
    isProtected: false,
    dataSource: "mock" as const,
  },
  {
    name: "Westpac Everyday",
    accountType: "everyday" as const,
    institutionLabel: "Westpac",
    maskedIdentifier: "****2290",
    currentBalanceCents: 192000,
    availableBalanceCents: 192000,
    purpose: "Bills",
    includedInSafeToSpend: false,
    isProtected: false,
    dataSource: "mock" as const,
  },
  {
    name: "Westpac Savings",
    accountType: "savings" as const,
    institutionLabel: "Westpac",
    maskedIdentifier: "****7712",
    currentBalanceCents: 485000,
    availableBalanceCents: 485000,
    purpose: "Business fund",
    includedInSafeToSpend: false,
    isProtected: true,
    dataSource: "mock" as const,
  },
];

export const DEMO_GOALS = [
  {
    name: "Emergency fund",
    targetAmountCents: 1000000,
    currentAmountCents: 320000,
    priority: 1,
    category: "emergency",
    icon: "shield",
  },
  {
    name: "IT business",
    targetAmountCents: 1000000,
    currentAmountCents: 485000,
    priority: 2,
    category: "business",
    icon: "briefcase",
  },
  {
    name: "Flight school",
    targetAmountCents: 2500000,
    currentAmountCents: 125000,
    priority: 3,
    category: "education",
    icon: "plane",
  },
];

export const DEMO_WISHLIST = [
  { name: "PS5", priceCents: 69900, category: "technology", priority: 1 },
  { name: "Motorcycle", priceCents: 850000, category: "vehicle", priority: 2 },
  { name: "Laptop", priceCents: 189900, category: "technology", priority: 3 },
];

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0]!;
}

export function generateDemoTransactions(): Array<{
  accountIndex: number;
  transactionDate: string;
  description: string;
  amountCents: number;
  direction: "debit" | "credit";
  category: string;
  transactionType: string;
}> {
  const txns = [
    // Income
    { accountIndex: 0, transactionDate: daysAgo(2), description: "ITSOFT PTY LTD SALARY", amountCents: 412600, direction: "credit" as const, category: "income", transactionType: "income" },
    { accountIndex: 0, transactionDate: daysAgo(32), description: "ITSOFT PTY LTD SALARY", amountCents: 412600, direction: "credit" as const, category: "income", transactionType: "income" },
    { accountIndex: 0, transactionDate: daysAgo(62), description: "ITSOFT PTY LTD SALARY", amountCents: 412600, direction: "credit" as const, category: "income", transactionType: "income" },

    // Rent
    { accountIndex: 2, transactionDate: daysAgo(5), description: "RENT PAYMENT - MELBOURNE PROP", amountCents: 185000, direction: "debit" as const, category: "rent", transactionType: "bill" },
    { accountIndex: 2, transactionDate: daysAgo(35), description: "RENT PAYMENT - MELBOURNE PROP", amountCents: 185000, direction: "debit" as const, category: "rent", transactionType: "bill" },

    // Groceries
    { accountIndex: 0, transactionDate: daysAgo(1), description: "WOOLWORTHS 1234 SOUTH MELB", amountCents: 8740, direction: "debit" as const, category: "groceries", transactionType: "expense" },
    { accountIndex: 0, transactionDate: daysAgo(8), description: "COLES 567 RICHMOND", amountCents: 6230, direction: "debit" as const, category: "groceries", transactionType: "expense" },
    { accountIndex: 0, transactionDate: daysAgo(15), description: "ALDI FITZROY", amountCents: 4890, direction: "debit" as const, category: "groceries", transactionType: "expense" },

    // Fuel
    { accountIndex: 0, transactionDate: daysAgo(3), description: "BP CONNECT SOUTH YARRA", amountCents: 7850, direction: "debit" as const, category: "fuel", transactionType: "expense" },
    { accountIndex: 0, transactionDate: daysAgo(12), description: "SHELL COLLINGWOOD", amountCents: 6920, direction: "debit" as const, category: "fuel", transactionType: "expense" },

    // Insurance
    { accountIndex: 2, transactionDate: daysAgo(10), description: "NRMA CAR INSURANCE", amountCents: 14200, direction: "debit" as const, category: "insurance", transactionType: "bill" },
    { accountIndex: 2, transactionDate: daysAgo(10), description: "BUPA HEALTH INSURANCE", amountCents: 19800, direction: "debit" as const, category: "insurance", transactionType: "bill" },

    // Subscriptions
    { accountIndex: 0, transactionDate: daysAgo(7), description: "OPENAI *CHATGPT SUBSCR", amountCents: 3280, direction: "debit" as const, category: "subscriptions", transactionType: "subscription" },
    { accountIndex: 0, transactionDate: daysAgo(14), description: "NETFLIX.COM", amountCents: 2299, direction: "debit" as const, category: "subscriptions", transactionType: "subscription" },
    { accountIndex: 0, transactionDate: daysAgo(20), description: "SPOTIFY PREMIUM", amountCents: 1499, direction: "debit" as const, category: "subscriptions", transactionType: "subscription" },

    // Gym
    { accountIndex: 0, transactionDate: daysAgo(6), description: "ANYTIME FITNESS FITZROY", amountCents: 1995, direction: "debit" as const, category: "gym", transactionType: "subscription" },

    // Takeaway
    { accountIndex: 0, transactionDate: daysAgo(1), description: "UBER EATS", amountCents: 3450, direction: "debit" as const, category: "takeaway", transactionType: "expense" },
    { accountIndex: 0, transactionDate: daysAgo(4), description: "MENULOG DOORDASH", amountCents: 2890, direction: "debit" as const, category: "takeaway", transactionType: "expense" },
    { accountIndex: 0, transactionDate: daysAgo(9), description: "UBER EATS", amountCents: 4120, direction: "debit" as const, category: "takeaway", transactionType: "expense" },

    // Phone & utilities
    { accountIndex: 2, transactionDate: daysAgo(11), description: "TELSTRA MOBILE", amountCents: 8900, direction: "debit" as const, category: "utilities", transactionType: "bill" },
    { accountIndex: 2, transactionDate: daysAgo(18), description: "ORIGIN ENERGY", amountCents: 15600, direction: "debit" as const, category: "utilities", transactionType: "bill" },

    // Transfer between accounts
    { accountIndex: 1, transactionDate: daysAgo(8), description: "TRANSFER TO COMMBANK SMART ACCESS", amountCents: 70000, direction: "credit" as const, category: "transfer", transactionType: "internal_transfer" },
    { accountIndex: 0, transactionDate: daysAgo(8), description: "TRANSFER FROM WESTPAC", amountCents: 70000, direction: "credit" as const, category: "transfer", transactionType: "internal_transfer" },
    { accountIndex: 2, transactionDate: daysAgo(8), description: "OSKO PAYMENT TO MANDEEP", amountCents: 70000, direction: "debit" as const, category: "transfer", transactionType: "internal_transfer" },

    // Credit card repayment
    { accountIndex: 2, transactionDate: daysAgo(15), description: "COMMBANK CC PAYMENT", amountCents: 84000, direction: "debit" as const, category: "transfer", transactionType: "credit_card_repayment" },
    { accountIndex: 1, transactionDate: daysAgo(15), description: "PAYMENT RECEIVED - THANK YOU", amountCents: 84000, direction: "credit" as const, category: "transfer", transactionType: "credit_card_repayment" },

    // Refund
    { accountIndex: 0, transactionDate: daysAgo(6), description: "REFUND - AMAZON AU", amountCents: 4599, direction: "credit" as const, category: "shopping", transactionType: "refund" },

    // Work expense
    { accountIndex: 0, transactionDate: daysAgo(13), description: "OFFICEWORKS 0342", amountCents: 8950, direction: "debit" as const, category: "work_expense", transactionType: "expense" },

    // Shared dinner reimbursement
    { accountIndex: 0, transactionDate: daysAgo(5), description: "OSKO FROM SARAH DINNER", amountCents: 4500, direction: "credit" as const, category: "dining", transactionType: "reimbursement" },
  ];

  return txns;
}

export const DEMO_INSIGHTS = [
  {
    insightType: "safe_to_spend_warning",
    title: "Balance looks healthy — for now",
    message:
      "Your bank balance looks healthy because rent has not left yet. That money is not free.",
    severity: "warning" as const,
  },
  {
    insightType: "overspending",
    title: "Takeaway vs groceries",
    message:
      "You spent more on takeaway than groceries this month. That is a choice.",
    severity: "info" as const,
  },
  {
    insightType: "goal_progress",
    title: "Business fund on track",
    message:
      "Your business fund is projected to reach $10,000 on 18 March.",
    severity: "positive" as const,
  },
];
