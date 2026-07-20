import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface InsightCardProps {
  title: string;
  message: string;
  severity: "info" | "warning" | "danger" | "positive";
}

const severityStyles = {
  info: "border-zinc-700",
  warning: "border-amber-500/30 bg-amber-950/20",
  danger: "border-red-500/30 bg-red-950/20",
  positive: "border-emerald-500/30 bg-emerald-950/20",
};

const severityText = {
  info: "text-zinc-300",
  warning: "text-amber-200",
  danger: "text-red-200",
  positive: "text-emerald-200",
};

export function InsightCard({ title, message, severity }: InsightCardProps) {
  return (
    <Card className={cn("border", severityStyles[severity])}>
      <CardContent className="p-4">
        <p className="text-sm font-semibold text-zinc-100">{title}</p>
        <p className={cn("mt-1 text-sm", severityText[severity])}>{message}</p>
      </CardContent>
    </Card>
  );
}
