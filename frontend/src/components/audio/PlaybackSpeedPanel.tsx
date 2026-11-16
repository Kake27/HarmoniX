import { Gauge } from "lucide-react";

import { formatPlaybackRate } from "../../lib/format";
import { RangeSlider } from "../ui/RangeSlider";
import { PanelCard } from "./PanelCard";
import { FOCUS_RING, TEXT_BUTTON } from "./styles";

const PLAYBACK_RATE_MIN = 0.25;
const PLAYBACK_RATE_MAX = 2;
const PLAYBACK_RATE_STEP = 0.05;
const PLAYBACK_RATE_DEFAULT = 1;
const PLAYBACK_RATE_OPTIONS = [0.75, 0.9, 1, 1.1, 1.25, 1.5, 2];

const DEFAULT_MARK_POSITION =
  ((PLAYBACK_RATE_DEFAULT - PLAYBACK_RATE_MIN) / (PLAYBACK_RATE_MAX - PLAYBACK_RATE_MIN)) * 100;

interface PlaybackSpeedPanelProps {
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
}

export function PlaybackSpeedPanel({ playbackRate, onPlaybackRateChange }: PlaybackSpeedPanelProps) {
  const isDefault = Math.abs(playbackRate - PLAYBACK_RATE_DEFAULT) < 0.001;

  return (
    <PanelCard
      title="Playback speed"
      headingId="playback-speed-heading"
      aside={<Gauge className="h-4 w-4 text-accent" aria-hidden="true" />}
    >
      <div className="flex items-end justify-between gap-3">
        <span aria-live="polite" className="font-mono text-[30px] leading-none text-ink">
          {formatPlaybackRate(playbackRate)}
        </span>
        {isDefault ? (
          <span className="text-[11px] text-subtle">Original tempo</span>
        ) : (
          <button
            type="button"
            onClick={() => onPlaybackRateChange(PLAYBACK_RATE_DEFAULT)}
            aria-label="Reset playback speed to default"
            className={TEXT_BUTTON}
          >
            Reset to 1×
          </button>
        )}
      </div>

      <div>
        <RangeSlider
          id="playback-rate-slider"
          min={PLAYBACK_RATE_MIN}
          max={PLAYBACK_RATE_MAX}
          step={PLAYBACK_RATE_STEP}
          value={playbackRate}
          aria-label="Playback speed in multiples of normal speed"
          onValueChange={onPlaybackRateChange}
        />
        <div className="relative mt-2 h-3 font-mono text-[9px] text-subtle" aria-hidden="true">
          <span className="absolute left-0">{formatPlaybackRate(PLAYBACK_RATE_MIN)}</span>
          <span className="absolute -translate-x-1/2" style={{ left: `${DEFAULT_MARK_POSITION}%` }}>
            {formatPlaybackRate(PLAYBACK_RATE_DEFAULT)}
          </span>
          <span className="absolute right-0">{formatPlaybackRate(PLAYBACK_RATE_MAX)}</span>
        </div>
      </div>

      <div role="group" aria-label="Quick playback speed options" className="grid grid-cols-4 gap-2">
        {PLAYBACK_RATE_OPTIONS.map((option) => {
          const active = Math.abs(playbackRate - option) < 0.001;
          return (
            <button
              key={option}
              type="button"
              aria-label={`Set playback speed to ${formatPlaybackRate(option)}`}
              aria-pressed={active}
              onClick={() => onPlaybackRateChange(option)}
              className={`h-8 rounded-md border font-mono text-[11px] transition-colors ${
                active
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line text-muted hover:border-field-line-hover hover:text-ink"
              } ${FOCUS_RING}`}
            >
              {formatPlaybackRate(option)}
            </button>
          );
        })}
      </div>
    </PanelCard>
  );
}
