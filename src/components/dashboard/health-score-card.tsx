import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HealthScoreResult } from "@/domain/services/health-score.service";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";

interface HealthScoreCardProps {
  result: HealthScoreResult;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 55) return "text-amber-400";
  return "text-red-400";
}

function scoreRing(score: number): string {
  if (score >= 80) return "border-emerald-500/40";
  if (score >= 55) return "border-amber-500/40";
  return "border-red-500/40";
}

export function HealthScoreCard({ result }: HealthScoreCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-emerald-400" />
          Financial health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full border-2",
              scoreRing(result.score)
            )}
          >
            <span className={cn("text-xl font-bold", scoreColor(result.score))}>
              {result.score}
            </span>
          </div>
          <div>
            <p className={cn("text-lg font-semibold", scoreColor(result.score))}>
              {result.grade}
            </p>
            <p className="text-xs text-zinc-500">Out of 100</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-zinc-500">Strength</p>
            <p className="font-medium text-emerald-400">{result.strength}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Weakness</p>
            <p className="font-medium text-amber-400">{result.weakness}</p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-zinc-300">
          {result.suggestion}
        </p>
      </CardContent>
    </Card>
  );
}
