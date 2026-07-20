"use client";

import { useState } from "react";
import { Plus, Calculator, Target, Upload, Banknote, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function FloatingActionButton() {
  const [open, setOpen] = useState(false);

  const actions = [
    { href: "/wishlist/afford", label: "Can I afford this?", icon: Calculator },
    { href: "/goals/new", label: "Add a goal", icon: Target },
    { href: "/import", label: "Import statement", icon: Upload },
    { href: "/activity/add", label: "Add cash transaction", icon: Banknote },
    { href: "/activity/review", label: "Review unknown", icon: HelpCircle },
  ];

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="mb-2 flex flex-col gap-1.5 rounded-2xl border border-zinc-700 bg-zinc-900 p-2 shadow-xl">
          {actions.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 whitespace-nowrap"
            >
              <Icon className="h-4 w-4 text-emerald-400" />
              {label}
            </Link>
          ))}
        </div>
      )}
      <Button
        size="icon"
        className="h-14 w-14 rounded-full shadow-lg shadow-emerald-500/20"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close quick actions" : "Open quick actions"}
        aria-expanded={open}
      >
        <Plus className={`h-6 w-6 transition-transform ${open ? "rotate-45" : ""}`} />
      </Button>
    </div>
  );
}
