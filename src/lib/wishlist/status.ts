import type { AffordabilityVerdict } from "@/domain/models";

export type WishlistStatus =
  | "thinking"
  | "saving"
  | "affordable"
  | "wait"
  | "not_affordable"
  | "purchased"
  | "abandoned";

/** Map affordability verdict → wishlist_status enum. */
export function verdictToWishlistStatus(
  verdict: AffordabilityVerdict | string
): WishlistStatus {
  switch (verdict) {
    case "yes":
    case "technically_yes":
      return "affordable";
    case "wait":
    case "save_first":
      return "saving";
    case "no":
    case "protected_savings_required":
      return "wait";
    case "absolutely_not":
      return "not_affordable";
    default:
      return "thinking";
  }
}
