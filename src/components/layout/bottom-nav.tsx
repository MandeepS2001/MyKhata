"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Activity,
  ClipboardList,
  MessageCircle,
  Plus,
  X,
  Wallet,
  Calculator,
  ArrowLeftRight,
  Heart,
  PiggyBank,
  Upload,
  HelpCircle,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/activity", label: "Activity", icon: Activity },
];

const navItemsRight = [
  { href: "/plan", label: "Plan", icon: ClipboardList },
  { href: "/coach", label: "Khata", icon: MessageCircle },
];

const primaryAction = {
  href: "/activity/add",
  label: "Add transaction",
  hint: "Spent, received, or moved money",
  icon: Wallet,
};

const secondaryActions = [
  { href: "/wishlist/afford", label: "Can I afford it?", icon: Calculator },
  { href: "/activity/add?mode=moved", label: "Move money", icon: ArrowLeftRight },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/goals/new", label: "Savings goal", icon: PiggyBank },
];

const tertiaryActions = [
  { href: "/import", label: "Upload statement", icon: Upload },
  { href: "/activity/review", label: "Review unknown", icon: HelpCircle },
  { href: "/banks", label: "Connect bank", icon: Landmark },
];

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-w-[52px] flex-col items-center gap-0.5 rounded-2xl px-2.5 py-1.5 text-[11px] font-bold transition-colors",
        isActive ? "text-[#ffb84d]" : "text-[#9a9186] hover:text-[#f7f1e8]"
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close quick actions"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px]"
        />
      )}

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.06] bg-[#1c1813]/96 backdrop-blur-xl"
        aria-label="Main navigation"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="relative mx-auto w-full max-w-lg px-2">
          {open && (
            <div className="absolute bottom-[calc(100%+0.75rem)] left-2 right-2 space-y-2 rounded-[1.75rem] border border-white/[0.06] bg-[#221e18] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
              <Link
                href={primaryAction.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-[1.25rem] bg-[#ffb84d] px-4 py-3.5 text-[#1a140c]"
              >
                <primaryAction.icon className="h-5 w-5 shrink-0" />
                <div>
                  <p className="text-sm font-extrabold">{primaryAction.label}</p>
                  <p className="text-xs text-[#1a140c]/70">{primaryAction.hint}</p>
                </div>
              </Link>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {secondaryActions.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="flex flex-col items-center gap-1.5 rounded-[1.15rem] bg-black/20 px-3 py-3 text-center text-xs font-bold text-[#f7f1e8] hover:bg-black/30"
                  >
                    <Icon className="h-5 w-5 text-[#ffb84d]" />
                    {label}
                  </Link>
                ))}
              </div>

              <div className="space-y-0.5 border-t border-white/[0.06] pt-2">
                {tertiaryActions.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[#9a9186] hover:bg-white/5 hover:text-[#f7f1e8]"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="flex h-[4.5rem] items-center justify-between px-1">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                isActive={pathname.startsWith(item.href)}
              />
            ))}

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close quick actions" : "Open quick actions"}
              aria-expanded={open}
              className={cn(
                "mx-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#ffb84d] text-[#1a140c] transition-transform",
                open && "rotate-45"
              )}
            >
              {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
            </button>

            {navItemsRight.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                isActive={pathname.startsWith(item.href)}
              />
            ))}
          </div>
        </div>
      </nav>
    </>
  );
}
