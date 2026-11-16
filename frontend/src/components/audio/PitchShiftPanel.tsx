import { Download, LoaderCircle, Music, Pause, Play } from "lucide-react";

import type { MediaPlayer } from "../../hooks/useMediaPlayer";
import { formatClock } from "../../lib/format";
import {
  formatSemitones,
  SEMITONE_MAX,
  SEMITONE_MIN,
  withMusicalSymbols,
} from "../../lib/music";
import { RangeSlider } from "../ui/RangeSlider";
import { PanelCard } from "./PanelCard";
import { ALERT_ACTION, ALERT_BOX, FOCUS_RING, PRIMARY_BUTTON, TEXT_BUTTON } from "./styles";

const STEP_BUTTON = `flex h-9 min-w-9 shrink-0 items-center justify-center rounded-md border border-line bg-raised px-2 text-[11px] font-semibold text-ink transition-colors hover:border-field-line-hover disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`;

interface PitchShiftPanelProps {
  semitones: number;
  onSemitonesChange: (value: number) => void;
  expectedKey: string | null;
  isTransposing: boolean;
  transposeError: string;
  onTranspose: () => void;
  preview: { semitones: number } | null;
  previewPlayer: MediaPlayer;
  onTogglePreview: () => void;
  onDownloadPreview: () => void;
}

export function PitchShiftPanel({
  semitones,
  onSemitonesChange,
  expectedKey,
  isTransposing,
  transposeError,
  onTranspose,
  preview,
  previewPlayer,
  onTogglePreview,
  onDownloadPreview,
}: PitchShiftPanelProps) {
  const unit = Math.abs(semitones) === 1 ? "semitone" : "semitones";
  const previewStatus = isTransposing
    ? "Generating"
    : preview
      ? `${formatSemitones(preview.semitones)} ${Math.abs(preview.semitones) === 1 ? "semitone" : "semitones"}`
      : "Not generated";

  return (
    <PanelCard
      title="Pitch shift"
      headingId="pitch-shift-heading"
      aside={<Music className="h-4 w-4 text-accent" aria-hidden="true" />}
    >
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1" aria-live="polite">
          <span className="font-mono text-[30px] leading-none text-ink">{formatSemitones(semitones)}</span>
          <span className="text-[11px] text-subtle">
            {unit}{" "}
            {expectedKey ? (
              <>
                (<span className="text-accent">{withMusicalSymbols(expectedKey)}</span>)
              </>
            ) : semitones === 0 ? (
              "(original pitch)"
            ) : null}
          </span>
        </div>
        <span className="shrink-0 font-mono text-[10px] text-subtle">
          {formatSemitones(SEMITONE_MIN)} to {formatSemitones(SEMITONE_MAX)}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Shift down one semitone"
          title="Down one semitone"
          onClick={() => onSemitonesChange(Math.max(SEMITONE_MIN, semitones - 1))}
          disabled={semitones <= SEMITONE_MIN || isTransposing}
          className={STEP_BUTTON}
        >
          −1
        </button>
        <div className="relative min-w-0 flex-1">
          <span
            className="pointer-events-none absolute left-1/2 top-1/2 h-2.5 w-px -translate-y-1/2 bg-subtle"
            aria-hidden="true"
          />
          <RangeSlider
            min={SEMITONE_MIN}
            max={SEMITONE_MAX}
            step={1}
            value={semitones}
            fillOrigin={0}
            aria-label="Pitch shift in semitones"
            aria-valuetext={`${formatSemitones(semitones)} ${unit}`}
            onValueChange={onSemitonesChange}
            disabled={isTransposing}
            className="relative"
          />
        </div>
        <button
          type="button"
          aria-label="Shift up one semitone"
          title="Up one semitone"
          onClick={() => onSemitonesChange(Math.min(SEMITONE_MAX, semitones + 1))}
          disabled={semitones >= SEMITONE_MAX || isTransposing}
          className={STEP_BUTTON}
        >
          +1
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onSemitonesChange(0)}
          disabled={semitones === 0 || isTransposing}
          className={TEXT_BUTTON}
        >
          Reset pitch
        </button>
        <button
          type="button"
          onClick={onTranspose}
          disabled={isTransposing || semitones === 0}
          className={`${PRIMARY_BUTTON} px-3.5 py-2 text-[11px]`}
        >
          {isTransposing && <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          {isTransposing ? "Transposing..." : "Transpose"}
        </button>
      </div>

      {transposeError && (
        <div role="alert" className={ALERT_BOX}>
          <p className="m-0">{transposeError}</p>
          <button type="button" onClick={onTranspose} disabled={isTransposing} className={ALERT_ACTION}>
            Retry transpose
          </button>
        </div>
      )}

      <div className="mt-auto rounded-lg border border-line bg-canvas p-4">
        <div className="flex items-center justify-between gap-3 font-mono uppercase tracking-[0.1em]">
          <h4 className="m-0 text-[9px] font-normal text-accent">Transposed audio</h4>
          <span className="text-[8px] text-subtle">{previewStatus}</span>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onTogglePreview}
            disabled={!preview}
            className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-raised px-3 text-[11px] text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:text-muted ${FOCUS_RING}`}
          >
            {previewPlayer.isPlaying ? (
              <Pause className="h-3 w-3" aria-hidden="true" />
            ) : (
              <Play className="h-3 w-3 fill-current" aria-hidden="true" />
            )}
            {previewPlayer.isPlaying ? "Pause" : "Play"}
          </button>

          {preview ? (
            <RangeSlider
              aria-label="Seek transposed audio"
              min={0}
              max={previewPlayer.duration || 0}
              step={0.1}
              value={Math.min(previewPlayer.currentTime, previewPlayer.duration || 0)}
              disabled={!previewPlayer.duration}
              onValueChange={previewPlayer.seek}
              className="min-w-0 flex-1"
            />
          ) : (
            <span className="h-1 min-w-0 flex-1 rounded-sm bg-line" aria-hidden="true" />
          )}

          <span className="shrink-0 whitespace-nowrap font-mono text-[9px] text-subtle">
            {formatClock(preview ? previewPlayer.currentTime : 0)} /{" "}
            {preview && previewPlayer.duration ? formatClock(previewPlayer.duration) : "--:--"}
          </span>
        </div>

        {preview && (
          <button
            type="button"
            onClick={onDownloadPreview}
            className={`mt-3 inline-flex items-center gap-1.5 ${TEXT_BUTTON} hover:text-accent`}
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Download transposed audio
          </button>
        )}
      </div>
    </PanelCard>
  );
}
