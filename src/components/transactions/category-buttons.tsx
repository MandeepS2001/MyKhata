"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateTransactionCategory } from "@/actions/profile";
import { TRANSACTION_CATEGORIES } from "@/domain/models";
import { cn } from "@/lib/utils";

interface TransactionCategoryButtonsProps {
  transactionId: string;
  merchantPattern: string;
  currentCategory?: string | null;
}

const QUICK_CATEGORIES = [
  "groceries",
  "takeaway",
  "dining",
  "fuel",
  "transport",
  "shopping",
  "subscriptions",
  "other",
] as const;

function formatCategory(category: string): string {
  return category.replace(/_/g, " ");
}

export function TransactionCategoryButtons({
  transactionId,
  merchantPattern,
  currentCategory,
}: TransactionCategoryButtonsProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();

  const quickSet = new Set<string>(QUICK_CATEGORIES);
  const moreCategories = TRANSACTION_CATEGORIES.filter((c) => !quickSet.has(c));
  const visible: string[] = expanded
    ? [...QUICK_CATEGORIES, ...moreCategories]
    : [...QUICK_CATEGORIES];

  if (currentCategory && !visible.includes(currentCategory)) {
    visible.unshift(currentCategory);
  }

  function handleSelect(category: string) {
    startTransition(async () => {
      await updateTransactionCategory({
        transactionId,
        category,
        createMerchantRule: true,
        merchantPattern,
      });
      router.refresh();
    });
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        {visible.map((cat) => (
          <Button
            key={cat}
            variant="outline"
            size="sm"
            className={cn(
              "capitalize",
              currentCategory === cat &&
                "border-emerald-500 bg-emerald-500/10 text-emerald-400"
            )}
            disabled={pending}
            onClick={() => handleSelect(cat)}
          >
            {formatCategory(cat)}
          </Button>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-zinc-400"
        disabled={pending}
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? "Show fewer" : `More categories (${moreCategories.length})`}
      </Button>
    </div>
  );
}
