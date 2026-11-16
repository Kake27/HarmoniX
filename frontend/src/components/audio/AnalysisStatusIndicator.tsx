import { LoaderCircle } from "lucide-react";

import type { AnalysisStatus } from "../../services/api";

const STATUS_DISPLAY: Record<AnalysisStatus, { label: string; text: string; dot: string }> = {
  COMPLETED: { label: "Analysis complete", text: "text-accent", dot: "bg-accent shadow-[0_0_10px] shadow-accent/50" },
  PARTIAL: { label: "Analysis partial", text: "text-warn", dot: "bg-warn" },
  PROCESSING: { label: "Analysing", text: "text-accent", dot: "" },
  PENDING: { label: "Not analysed", text: "text-subtle", dot: "bg-subtle" },
  FAILED: { label: "Analysis failed", text: "text-danger", dot: "bg-danger" },
};

interface AnalysisStatusIndicatorProps {
  status: AnalysisStatus;
  isAnalyzing: boolean;
}

export function AnalysisStatusIndicator({ status, isAnalyzing }: AnalysisStatusIndicatorProps) {
  const effective: AnalysisStatus = isAnalyzing ? "PROCESSING" : status;
  const display = STATUS_DISPLAY[effective];

  return (
    <span
      className={`inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] ${display.text}`}
    >
      {effective === "PROCESSING" ? (
        <LoaderCircle className="h-3 w-3 animate-spin" aria-hidden="true" />
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full ${display.dot}`} aria-hidden="true" />
      )}
      {display.label}
    </span>
  );
}
