import { LoaderCircle } from "lucide-react";

import { formatDateTime } from "../../lib/format";
import { formatKeyFull, formatKeyShort } from "../../lib/music";
import type { AudioDetailResponse } from "../../services/api";
import { ALERT_ACTION, EYEBROW, PRIMARY_BUTTON } from "./styles";

interface AnalysisRailProps {
  audio: AudioDetailResponse;
  isAnalyzing: boolean;
  analysisError: string;
  onAnalyse: () => void;
}

export function AnalysisRail({ audio, isAnalyzing, analysisError, onAnalyse }: AnalysisRailProps) {
  const { analysis, analysis_status: status } = audio;
  const bpm = analysis?.bpm ?? null;
  const musicalKey = analysis?.musical_key ?? null;
  const mode = analysis?.mode ?? null;
  const canAnalyse = (status === "PENDING" || status === "FAILED") && !analysisError;

  return (
    <aside
      aria-labelledby="song-analysis-heading"
      className="flex flex-col gap-6 border-t border-line bg-panel-accent p-5 sm:p-7 lg:border-l lg:border-t-0"
    >
      <h2 id="song-analysis-heading" className={EYEBROW}>
        Inside the sound
      </h2>

      <dl className="m-0 grid grid-cols-2 gap-6 sm:gap-9">
        <div className="min-w-0">
          <dt className="text-[11px] text-muted">Tempo</dt>
          <dd className="m-0 mt-2.5 flex items-baseline gap-1.5">
            <span className="font-mono text-[28px] leading-none text-ink sm:text-[32px]">
              {bpm === null ? "—" : Math.round(bpm)}
            </span>
            {bpm !== null && <span className="font-mono text-[10px] text-subtle">BPM</span>}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11px] text-muted">Scale / Key</dt>
          <dd className="m-0 mt-2.5">
            <span className="block truncate font-mono text-[28px] leading-none text-ink sm:text-[32px]">
              {musicalKey ? formatKeyShort(musicalKey, mode) : "—"}
            </span>
            {musicalKey && (
              <span className="mt-2 block truncate text-[10px] text-subtle">
                {formatKeyFull(musicalKey, mode)}
              </span>
            )}
          </dd>
        </div>
      </dl>

      {(status === "PENDING" || status === "PROCESSING" || status === "FAILED" || isAnalyzing || analysisError) && (
        <div className="flex flex-col items-start gap-3 text-xs">
          {status === "PENDING" && !isAnalyzing && (
            <p role="status" className="m-0 text-muted">This track has not been analysed yet.</p>
          )}
          {status === "PROCESSING" && (
            <p role="status" className="m-0 text-muted">Analysis is currently processing.</p>
          )}
          {isAnalyzing && (
            <p role="status" className="m-0 flex items-center gap-2 text-muted">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin text-accent" aria-hidden="true" />
              Analysing this audio file...
            </p>
          )}
          {status === "FAILED" && (
            <p role="alert" className="m-0 text-danger">
              {analysis?.error_message ?? "Analysis failed."}
            </p>
          )}
          {analysisError && (
            <div role="alert" className="flex flex-col items-start gap-2">
              <p className="m-0 text-danger">{analysisError}</p>
              <button type="button" onClick={onAnalyse} disabled={isAnalyzing} className={ALERT_ACTION}>
                Retry analysis
              </button>
            </div>
          )}
          {canAnalyse && (
            <button
              type="button"
              onClick={onAnalyse}
              disabled={isAnalyzing}
              className={`${PRIMARY_BUTTON} px-4 py-2 text-xs`}
            >
              {isAnalyzing
                ? "Analysing..."
                : status === "FAILED"
                  ? "Retry analysis"
                  : "Analyse this audio"}
            </button>
          )}
        </div>
      )}

      {analysis && (
        <div className="mt-auto flex flex-col gap-2 border-t border-line/70 pt-4 text-[10px] text-subtle">
          {analysis.status === "PARTIAL" && (
            <p role="status" className="m-0 text-warn">Some analyzers did not complete successfully.</p>
          )}
          {analysis.results && (
            <details className="group">
              <summary className="cursor-pointer select-none text-[11px] text-muted transition-colors hover:text-ink">
                Analyzer results
              </summary>
              <ul className="m-0 mt-2 flex max-h-40 list-none flex-col gap-1.5 overflow-y-auto p-0 font-mono">
                {Object.entries(analysis.results).map(([name, result]) => (
                  <li key={name} className="break-all">
                    <strong className="font-normal text-muted">{name.replaceAll("_", " ")}:</strong>{" "}
                    {result.status === "success"
                      ? JSON.stringify(result.data)
                      : <span className="text-danger">Failed{result.error ? ` — ${result.error}` : ""}</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <p className="m-0 font-mono">Analysis version: {analysis.analysis_version}</p>
          <p className="m-0 font-mono">Analysed: {formatDateTime(analysis.created_at)}</p>
        </div>
      )}
    </aside>
  );
}
