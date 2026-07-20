import type { NormalisedTransaction, Transaction } from "@/domain/models";

export interface TransferMatchCandidate {
  debitTransaction: Transaction;
  creditTransaction: Transaction;
  matchType: "internal_transfer" | "credit_card_repayment";
  confidenceScore: number;
}

export interface TransferDetectionOptions {
  dateRangeDays?: number;
  amountToleranceCents?: number;
}

export class TransferDetectionService {
  detectMatches(
    transactions: Transaction[],
    options: TransferDetectionOptions = {}
  ): TransferMatchCandidate[] {
    const dateRangeDays = options.dateRangeDays ?? 3;
    const amountTolerance = options.amountToleranceCents ?? 0;

    const debits = transactions.filter(
      (t) =>
        t.direction === "debit" &&
        !t.transferMatchId &&
        t.transactionType !== "credit_card_repayment"
    );
    const credits = transactions.filter(
      (t) =>
        t.direction === "credit" &&
        !t.transferMatchId &&
        t.transactionType !== "internal_transfer"
    );

    const matches: TransferMatchCandidate[] = [];
    const usedCreditIds = new Set<string>();

    for (const debit of debits) {
      const debitAmount = Math.abs(debit.amountCents);

      for (const credit of credits) {
        if (usedCreditIds.has(credit.id)) continue;
        if (debit.accountId === credit.accountId) continue;

        const creditAmount = Math.abs(credit.amountCents);
        const amountDiff = Math.abs(debitAmount - creditAmount);
        if (amountDiff > amountTolerance) continue;

        const debitDate = new Date(debit.transactionDate);
        const creditDate = new Date(credit.transactionDate);
        const dayDiff = Math.abs(
          (debitDate.getTime() - creditDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (dayDiff > dateRangeDays) continue;

        let confidence = 0.7;
        if (amountDiff === 0) confidence += 0.15;
        if (dayDiff === 0) confidence += 0.1;

        const matchType = this.detectMatchType(debit, credit);
        if (matchType === "credit_card_repayment") confidence += 0.05;

        if (this.hasTransferDescription(debit.description) ||
            this.hasTransferDescription(credit.description)) {
          confidence += 0.1;
        }

        matches.push({
          debitTransaction: debit,
          creditTransaction: credit,
          matchType,
          confidenceScore: Math.min(confidence, 1),
        });
        usedCreditIds.add(credit.id);
        break;
      }
    }

    return matches;
  }

  private detectMatchType(
    debit: Transaction,
    credit: Transaction
  ): "internal_transfer" | "credit_card_repayment" {
    const combined = `${debit.description} ${credit.description}`.toLowerCase();
    if (
      combined.includes("credit card") ||
      combined.includes("cc payment") ||
      combined.includes("card payment")
    ) {
      return "credit_card_repayment";
    }
    return "internal_transfer";
  }

  private hasTransferDescription(description: string): boolean {
    return /transfer|tfr|osko|pay anyone|payment to/i.test(description);
  }

  /** Detect matches from normalised transactions before DB insert */
  detectFromNormalised(
    items: Array<NormalisedTransaction & { tempId: string; accountId: string }>
  ): Array<{
    debitTempId: string;
    creditTempId: string;
    matchType: "internal_transfer" | "credit_card_repayment";
  }> {
    const debits = items.filter((t) => t.direction === "debit");
    const credits = items.filter((t) => t.direction === "credit");
    const matches: Array<{
      debitTempId: string;
      creditTempId: string;
      matchType: "internal_transfer" | "credit_card_repayment";
    }> = [];
    const usedCredits = new Set<string>();

    for (const debit of debits) {
      for (const credit of credits) {
        if (usedCredits.has(credit.tempId)) continue;
        if (debit.accountId === credit.accountId) continue;
        if (Math.abs(debit.amountCents) !== Math.abs(credit.amountCents)) continue;

        const dayDiff = Math.abs(
          new Date(debit.transactionDate).getTime() -
            new Date(credit.transactionDate).getTime()
        ) / (1000 * 60 * 60 * 24);

        if (dayDiff > 3) continue;

        matches.push({
          debitTempId: debit.tempId,
          creditTempId: credit.tempId,
          matchType: this.detectMatchTypeFromDesc(debit.description, credit.description),
        });
        usedCredits.add(credit.tempId);
        break;
      }
    }

    return matches;
  }

  private detectMatchTypeFromDesc(
    debitDesc: string,
    creditDesc: string
  ): "internal_transfer" | "credit_card_repayment" {
    const combined = `${debitDesc} ${creditDesc}`.toLowerCase();
    if (combined.includes("credit card") || combined.includes("card payment")) {
      return "credit_card_repayment";
    }
    return "internal_transfer";
  }
}

export const transferDetectionService = new TransferDetectionService();
