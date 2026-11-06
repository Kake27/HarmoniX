import { Link } from "react-router-dom";
import { LoaderCircle, Play, Search, Upload } from "lucide-react";

import { WaveformBars } from "./WaveformBars";
import { formatDuration, formatShortDate } from "../../lib/format";
import type { AudioLibraryItem } from "../../services/api";

interface LibrarySectionProps {
  items: AudioLibraryItem[];
  total: number;
  loading: boolean;
  error: string;
  query: string;
  onQueryChange: (query: string) => void;
  onRetry: () => void;
  onLoadMore: () => void;
  onUpload: () => void;
}

type StatusTone = "analyzed" | "analyzing" | "queued" | "failed" | "other";

function getStatusTone(status: string): StatusTone {
  const value = status.toLowerCase();
  if (/complete|analy[sz]ed|success|done/.test(value)) return "analyzed";
  if (/analy[sz]ing|processing|running/.test(value)) return "analyzing";
  if (/queue|pending|waiting/.test(value)) return "queued";
  if (/fail|error/.test(value)) return "failed";
  return "other";
}

const STATUS_STYLES: Record<StatusTone, { label: string; text: string; dot: string }> = {
  analyzed: { label: "Analyzed", text: "text-accent", dot: "bg-accent" },
  analyzing: { label: "Analyzing", text: "text-accent", dot: "" },
  queued: { label: "Queued", text: "text-warn", dot: "bg-warn" },
  failed: { label: "Failed", text: "text-danger", dot: "bg-danger" },
  other: { label: "Unknown", text: "text-muted", dot: "bg-muted" },
};

function StatusBadge({ status }: { status: string }) {
  const tone = getStatusTone(status);
  const style = STATUS_STYLES[tone];
  const label = tone === "other" ? status : style.label;

  return (
    <span className={`inline-flex items-center gap-2 text-sm ${style.text}`}>
      {tone === "analyzing" ? (
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      )}
      {label}
    </span>
  );
}

function formatKey(track: AudioLibraryItem): string {
  if (!track.musical_key) return "—";
  const mode = track.mode?.toLowerCase() ?? "";
  const modeLabel = mode.startsWith("min") ? "min" : mode.startsWith("maj") ? "maj" : track.mode ?? "";
  return modeLabel ? `${track.musical_key} ${modeLabel}` : track.musical_key;
}

const HEADER_CELL = "px-4 py-3 text-left font-mono text-[11px] font-normal uppercase tracking-wider text-subtle";
const BODY_CELL = "px-4 py-4 align-middle";

export function LibrarySection({
  items,
  total,
  loading,
  error,
  query,
  onQueryChange,
  onRetry,
  onLoadMore,
  onUpload,
}: LibrarySectionProps) {
  const normalizedQuery = query.trim().toLowerCase();
  const visibleItems = normalizedQuery
    ? items.filter((track) => track.original_filename.toLowerCase().includes(normalizedQuery))
    : items;

  return (
    <section aria-labelledby="library-heading" className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 id="library-heading" className="text-xl font-medium tracking-tight text-ink">
            Your library
          </h2>
          <span className="rounded-full bg-white/5 px-2.5 py-0.5 font-mono text-xs text-muted">
            {total}
          </span>
        </div>

        <label className="relative block w-full sm:w-72">
          <span className="sr-only">Search your audio</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search your audio..."
            className="h-11 w-full rounded-xl border border-field-line bg-panel pl-10 pr-4 text-sm text-ink placeholder:text-subtle transition-colors hover:border-field-hover focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-panel">
        {error ? (
          <div role="alert" className="flex flex-col items-center gap-4 px-6 py-14 text-center">
            <p className="text-sm text-danger">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg border border-field-line px-4 py-2 text-sm text-ink transition-colors hover:border-field-hover hover:bg-white/5"
            >
              Try again
            </button>
          </div>
        ) : loading && items.length === 0 ? (
          <div role="status" className="flex items-center justify-center gap-3 px-6 py-14 text-sm text-muted">
            <LoaderCircle className="h-4 w-4 animate-spin text-accent" />
            Loading your audio files...
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
            <p className="text-sm text-muted">Your library is empty. Upload a track to get started.</p>
            <button
              type="button"
              onClick={onUpload}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover"
            >
              <Upload className="h-4 w-4" />
              Upload audio
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[360px] border-collapse">
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className={HEADER_CELL}>File name</th>
                    <th scope="col" className={`${HEADER_CELL} hidden lg:table-cell`}>Waveform</th>
                    <th scope="col" className={`${HEADER_CELL} hidden md:table-cell`}>Duration</th>
                    <th scope="col" className={`${HEADER_CELL} hidden md:table-cell`}>BPM</th>
                    <th scope="col" className={`${HEADER_CELL} hidden md:table-cell`}>Key</th>
                    <th scope="col" className={HEADER_CELL}>Status</th>
                    <th scope="col" className={`${HEADER_CELL} hidden lg:table-cell`}>Uploaded</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((track) => {
                    const name = track.original_filename;
                    return (
                      <tr key={track.id} className="group border-b border-line transition-colors last:border-b-0 hover:bg-white/[0.02]">
                        <td className={`${BODY_CELL} px-4 sm:px-6`}>
                          <div className="flex items-center gap-4">
                            <Link
                              to={`/audio/${track.id}`}
                              aria-label={`Open ${name}`}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-ink transition-all hover:scale-105 hover:bg-accent hover:text-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                            >
                              <Play className="h-3.5 w-3.5 fill-current" />
                            </Link>
                            <div className="min-w-0">
                              <Link
                                to={`/audio/${track.id}`}
                                className="block truncate text-sm font-medium text-ink transition-colors hover:text-accent focus-visible:text-accent focus-visible:outline-none"
                              >
                                {name}
                              </Link>
                              <p className="mt-1 font-mono text-[11px] text-subtle">
                                {track.file_format.toUpperCase()}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className={`${BODY_CELL} hidden lg:table-cell`}>
                          <WaveformBars seed={track.id} />
                        </td>
                        <td className={`${BODY_CELL} hidden font-mono text-sm text-muted md:table-cell`}>
                          {track.duration === null ? "—" : formatDuration(track.duration)}
                        </td>
                        <td className={`${BODY_CELL} hidden font-mono text-sm text-muted md:table-cell`}>
                          {track.bpm === null ? "—" : Math.round(track.bpm)}
                        </td>
                        <td className={`${BODY_CELL} hidden font-mono text-sm text-muted md:table-cell`}>
                          {formatKey(track)}
                        </td>
                        <td className={BODY_CELL}>
                          <StatusBadge status={track.analysis_status} />
                        </td>
                        <td className={`${BODY_CELL} hidden whitespace-nowrap text-sm text-muted lg:table-cell`}>
                          {formatShortDate(track.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {visibleItems.length === 0 && (
              <p className="px-6 py-10 text-center text-sm text-muted">No audio matches your search.</p>
            )}

            <div className="flex flex-col gap-3 border-t border-line px-4 py-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p>
                Showing {items.length} of {total} audio files
              </p>
              {items.length < total && (
                <button
                  type="button"
                  onClick={onLoadMore}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-field-line px-4 py-2 text-ink transition-colors hover:border-field-hover hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  {loading ? "Loading..." : "Load more"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
