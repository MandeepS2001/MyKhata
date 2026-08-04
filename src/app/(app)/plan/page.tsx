import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import {
  Heart,
  Target,
  Repeat,
  Calculator,
  TrendingUp,
  Upload,
  ChevronRight,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const PLAN_LINKS = [
  {
    href: "/wishlist",
    label: "Wishlist",
    description: "Things you're thinking about buying",
    icon: Heart,
    tint: "bg-[#f0a59a]/15 text-[#f0a59a]",
  },
  {
    href: "/goals",
    label: "Goals & savings",
    description: "Give your money a job",
    icon: Target,
    tint: "bg-[#7dcea0]/15 text-[#7dcea0]",
  },
  {
    href: "/subscriptions",
    label: "Upcoming & subscriptions",
    description: "Recurring bills and payments",
    icon: Repeat,
    tint: "bg-[#8ecae6]/15 text-[#8ecae6]",
  },
  {
    href: "/wishlist/afford",
    label: "Affordability check",
    description: "Can I afford this right now?",
    icon: Calculator,
    tint: "bg-[#ffb84d]/15 text-[#ffb84d]",
  },
  {
    href: "/home/forecast",
    label: "Cash flow forecast",
    description: "Projected balance ahead of payday",
    icon: TrendingUp,
    tint: "bg-white/8 text-[#f7f1e8]",
  },
];

export default function PlanPage() {
  return (
    <AppShell>
      <div className="space-y-5">
        <div className="mk-rise">
          <p className="text-sm font-bold text-[#ffb84d]">Plan</p>
          <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight">
            Where money goes next
          </h1>
          <p className="mt-1 text-sm text-[#9a9186]">
            Wishlist, goals, bills, and future you.
          </p>
        </div>

        <div className="space-y-3">
          {PLAN_LINKS.map(({ href, label, description, icon: Icon, tint }) => (
            <Link key={href} href={href} className="block">
              <Card className="transition-transform active:scale-[0.99]">
                <CardContent className="flex items-center gap-4 p-4">
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                      tint
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-semibold text-[#f7f1e8]">
                      {label}
                    </p>
                    <p className="truncate text-xs text-[#9a9186]">
                      {description}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#6f675e]" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <Link href="/profile" className="block">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#ffb84d]/15 text-[#ffb84d]">
                <Settings className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display font-semibold text-[#f7f1e8]">
                  Settings & profile
                </p>
                <p className="truncate text-xs text-[#9a9186]">
                  Questionnaire, tone, notifications
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-[#6f675e]" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/import" className="block">
          <Card className="border-dashed border-white/10 bg-transparent shadow-none">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/5">
                <Upload className="h-5 w-5 text-[#9a9186]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#9a9186]">
                  Upload statement
                </p>
                <p className="text-xs text-[#6f675e]">Optional · secondary</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </AppShell>
  );
}
