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
    throw new Error("Open Banking connections are coming soon.");
  }
  async refreshConnection(_connectionId: string): Promise<BankConnection> {
    void _connectionId;
    throw new Error("Open Banking connections are coming soon.");
  }
  async listAccounts(_connectionId: string): Promise<BankAccount[]> {
    void _connectionId;
    throw new Error("Open Banking connections are coming soon.");
  }
  async listTransactions(
    _accountId: string,
    _from: Date,
    _to: Date
  ): Promise<BankTransaction[]> {
    void _accountId;
    void _from;
    void _to;
    throw new Error("Open Banking connections are coming soon.");
  }
  async disconnect(_connectionId: string): Promise<void> {
    void _connectionId;
    throw new Error("Open Banking connections are coming soon.");
  }
  async getConnectionStatus(_connectionId: string): Promise<BankConnection["status"]> {
    void _connectionId;
    return "disconnected";
  }
  async renewConsent(_connectionId: string): Promise<BankConnection> {
    void _connectionId;
    throw new Error("Open Banking connections are coming soon.");
  }
}
