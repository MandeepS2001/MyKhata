"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateTransactionCategory } from "@/actions/profile";

interface TransactionCategoryButtonsProps {
  transactionId: string;
  merchantPattern: string;
}

const CATEGORIES = [
  "groceries", "takeaway", "dining", "fuel", "transport",
  "shopping", "subscriptions", "other",
];

export function TransactionCategoryButtons({
  transactionId,
  merchantPattern,
}: TransactionCategoryButtonsProps) {
  const [pending, startTransition] = useTransition();

  function handleSelect(category: string) {
    startTransition(async () => {
      await updateTransactionCategory({
        transactionId,
        category,
        createMerchantRule: true,
        merchantPattern,
      });
    });
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {CATEGORIES.map((cat) => (
        <Button
          key={cat}
          variant="outline"
          size="sm"
          className="capitalize"
          disabled={pending}
          onClick={() => handleSelect(cat)}
        >
          {cat.replace("_", " ")}
        </Button>
      ))}
    </div>
  );
}
