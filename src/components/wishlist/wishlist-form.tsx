"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWishlistItem } from "@/actions/wishlist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { dollarsToCents } from "@/lib/currency";

export function WishlistForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createWishlistItem({
        name,
        priceCents: dollarsToCents(Number(price)),
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setName("");
      setPrice("");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="p-5">
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="wish-name">Item</Label>
            <Input
              id="wish-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Steam Deck"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wish-price">Price (AUD)</Label>
            <Input
              id="wish-price"
              type="number"
              min="1"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Adding..." : "Add to wishlist"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
