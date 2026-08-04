import type { BankProvider, BankConnection, BankAccount, BankTransaction } from "./types";

/** Future Open Banking provider interface — not implemented in Phase 1 */
export abstract class BaseBankProvider implements BankProvider {
  abstract readonly providerId: string;
  abstract readonly displayName: string;

  abstract createConnection(userId: string): Promise<BankConnection>;
  abstract refreshConnection(connectionId: string): Promise<BankConnection>;
  abstract listAccounts(connectionId: string): Promise<BankAccount[]>;
  abstract listTransactions(
    accountId: string,
    from: Date,
    to: Date
  ): Promise<BankTransaction[]>;
  abstract disconnect(connectionId: string): Promise<void>;
  abstract getConnectionStatus(connectionId: string): Promise<BankConnection["status"]>;
  abstract renewConsent(connectionId: string): Promise<BankConnection>;
}

export class MockBankProvider extends BaseBankProvider {
  readonly providerId = "mock";
  readonly displayName = "Demo Bank";

  async createConnection(userId: string): Promise<BankConnection> {
    return {
      id: `mock-conn-${userId}`,
      providerId: this.providerId,
      status: "connected",
      institutionName: "Demo Bank",
      lastSyncedAt: new Date().toISOString(),
    };
  }

  async refreshConnection(connectionId: string): Promise<BankConnection> {
    return {
      id: connectionId,
      providerId: this.providerId,
      status: "connected",
      institutionName: "Demo Bank",
      lastSyncedAt: new Date().toISOString(),
    };
  }

  async listAccounts(_connectionId: string): Promise<BankAccount[]> {
    void _connectionId;
    return [];
  }

  async listTransactions(
    _accountId: string,
    _from: Date,
    _to: Date
  ): Promise<BankTransaction[]> {
    void _accountId;
    void _from;
    void _to;
    return [];
  }

  async disconnect(_connectionId: string): Promise<void> {
    void _connectionId;
  }

  async getConnectionStatus(_connectionId: string): Promise<BankConnection["status"]> {
    void _connectionId;
    return "connected";
  }

  async renewConsent(connectionId: string): Promise<BankConnection> {
    return this.refreshConnection(connectionId);
  }
}

export class ComingSoonBankProvider extends BaseBankProvider {
  readonly providerId = "basiq";
  readonly displayName = "Open Banking";

  async createConnection(_userId: string): Promise<BankConnection> {
    void _userId;
    throw new Error("Use /banks to connect via Basiq Consent UI.");
  }
  async refreshConnection(_connectionId: string): Promise<BankConnection> {
    void _connectionId;
    throw new Error("Use Sync on /banks to refresh Basiq data.");
  }
  async listAccounts(_connectionId: string): Promise<BankAccount[]> {
    void _connectionId;
    throw new Error("Use Sync on /banks to refresh Basiq data.");
  }
  async listTransactions(
    _accountId: string,
    _from: Date,
    _to: Date
  ): Promise<BankTransaction[]> {
    void _accountId;
    void _from;
    void _to;
    throw new Error("Use Sync on /banks to refresh Basiq data.");
  }
  async disconnect(_connectionId: string): Promise<void> {
    void _connectionId;
    throw new Error("Manage connections in the Basiq Consent UI from /banks.");
  }
  async getConnectionStatus(_connectionId: string): Promise<BankConnection["status"]> {
    void _connectionId;
    return "disconnected";
  }
  async renewConsent(connectionId: string): Promise<BankConnection> {
    void connectionId;
    throw new Error("Renew consent from /banks.");
  }
}

export function getBankProvider(providerId: string = "basiq"): BaseBankProvider {
  if (providerId === "mock") return new MockBankProvider();
  return new ComingSoonBankProvider();
}
