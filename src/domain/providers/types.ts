export interface BankConnection {
  id: string;
  providerId: string;
  status: "connected" | "disconnected" | "pending" | "expired" | "error";
  institutionName: string;
  consentExpiresAt?: string;
  lastSyncedAt?: string;
}

export interface BankAccount {
  id: string;
  name: string;
  accountType: string;
  balanceCents: number;
  availableBalanceCents: number;
  currency: string;
  maskedNumber?: string;
}

export interface BankTransaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  amountCents: number;
  direction: "debit" | "credit";
}

export interface BankProvider {
  readonly providerId: string;
  readonly displayName: string;
  createConnection(userId: string): Promise<BankConnection>;
  refreshConnection(connectionId: string): Promise<BankConnection>;
  listAccounts(connectionId: string): Promise<BankAccount[]>;
  listTransactions(
    accountId: string,
    from: Date,
    to: Date
  ): Promise<BankTransaction[]>;
  disconnect(connectionId: string): Promise<void>;
  getConnectionStatus(connectionId: string): Promise<BankConnection["status"]>;
  renewConsent(connectionId: string): Promise<BankConnection>;
}
