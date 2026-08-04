"use server";

import { createClient } from "@/lib/supabase/server";
import {
  verdictToWishlistStatus,
  type WishlistStatus,
} from "@/lib/wishlist/status";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const wishlistStatusEnum = z.enum([
  "thinking",
  "saving",
  "affordable",
  "wait",
  "not_affordable",
  "purchased",
  "abandoned",
]);

const createItemSchema = z.object({
  name: z.string().trim().min(1).max(160),
  priceCents: z.number().int().positive(),
  productUrl: z.string().trim().max(500).optional(),
  desiredPurchaseDate: z.string().optional(),
  status: wishlistStatusEnum.optional(),
  lastVerdict: z.string().optional(),
});

export async function createWishlistItem(input: {
  name: string;
  priceCents: number;
  productUrl?: string;
  desiredPurchaseDate?: string;
  status?: WishlistStatus;
  lastVerdict?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const parsed = createItemSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Enter an item name and a positive price." };
  }

  const {
    name,
    priceCents,
    productUrl,
    desiredPurchaseDate,
    status,
    lastVerdict,
  } = parsed.data;

  const resolvedStatus =
    status ??
    (lastVerdict ? verdictToWishlistStatus(lastVerdict) : "thinking");

  const { data, error } = await supabase
    .from("wishlist_items")
    .insert({
      user_id: user.id,
      name,
      price_cents: priceCents,
      product_url: productUrl || null,
      desired_purchase_date: desiredPurchaseDate || null,
      status: resolvedStatus,
      last_verdict: lastVerdict || null,
      last_calculated_at: lastVerdict ? new Date().toISOString() : null,
    })
    .select("id, name")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not add wishlist item." };
  }

  revalidatePath("/wishlist");
  revalidatePath("/wishlist/afford");
  revalidatePath("/home");
  return { success: true as const, item: data };
}

const updateStatusSchema = z.object({
  itemId: z.string().uuid(),
  status: wishlistStatusEnum,
  lastVerdict: z.string().optional(),
});

export async function updateWishlistStatus(input: {
  itemId: string;
  status: WishlistStatus;
  lastVerdict?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const parsed = updateStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid wishlist status update." };
  }

  const { itemId, status, lastVerdict } = parsed.data;

  const { error } = await supabase
    .from("wishlist_items")
    .update({
      status,
      last_verdict: lastVerdict ?? null,
      last_calculated_at: lastVerdict ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/wishlist");
  revalidatePath("/home");
  return { success: true as const };
}
