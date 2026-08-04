import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface AiSummaryCardProps {
  summary: string;
}

export function AiSummaryCard({ summary }: AiSummaryCardProps) {
  return (
    <Card className="mk-rise mk-rise-delay-2 bg-gradient-to-br from-[#2a241c] to-[#1f2a22]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ffb84d]/15">
            <Sparkles className="h-4 w-4 text-[#ffb84d]" />
          </span>
          Khata says
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-[#d9d0c4]">{summary}</p>
      </CardContent>
    </Card>
  );
}
