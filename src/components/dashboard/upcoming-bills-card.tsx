import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/currency";
import type { DetectedRecurring } from "@/domain/services/recurring.service";
import { CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";

interface UpcomingBillsCardProps {
  items: DetectedRecurring[];
}

export function UpcomingBillsCard({ items }: UpcomingBillsCardProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-zinc-400" />
            Upcoming in 14 days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500">
            No recurring bills detected in the next two weeks.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4 text-amber-400" />
          Upcoming in 14 days
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={`${item.merchant}-${item.nextExpectedDate}`}
            className="flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-200">
                {item.merchant}
              </p>
              <p className="text-xs text-zinc-500">
                {format(parseISO(item.nextExpectedDate), "EEE d MMM")}
                {item.isEssential ? " · Essential" : ""}
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-amber-400">
              {formatCents(-item.typicalAmountCents, { showSign: true })}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
