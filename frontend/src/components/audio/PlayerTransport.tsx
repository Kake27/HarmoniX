import { Pause, Play, Repeat, SkipBack, SkipForward, Square, Volume2, VolumeX } from "lucide-react";

import { formatClock } from "../../lib/format";
import { RangeSlider } from "../ui/RangeSlider";
import { FOCUS_RING, ICON_BUTTON } from "./styles";

const SKIP_SECONDS = 10;

interface PlayerTransportProps {
  trackName: string;
  disabled: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLooping: boolean;
  volume: number;
  isMuted: boolean;
  onTogglePlay: () => void;
  onStop: () => void;
  onSkip: (deltaSeconds: number) => void;
  onToggleLoop: () => void;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
}

export function PlayerTransport({
  trackName,
  disabled,
  isPlaying,
  currentTime,
  duration,
  isLooping,
  volume,
  isMuted,
  onTogglePlay,
  onStop,
  onSkip,
  onToggleLoop,
  onToggleMute,
  onVolumeChange,
}: PlayerTransportProps) {
  const effectiveVolume = isMuted ? 0 : volume;
  const VolumeIcon = effectiveVolume === 0 ? VolumeX : Volume2;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
      <div className="flex items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={() => onSkip(-SKIP_SECONDS)}
          disabled={disabled}
          aria-label={`Back ${SKIP_SECONDS} seconds`}
          title={`Back ${SKIP_SECONDS} seconds`}
          className={ICON_BUTTON}
        >
          <SkipBack className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={onTogglePlay}
          disabled={disabled}
          aria-label={`${isPlaying ? "Pause" : "Play"} ${trackName} player`}
          title={isPlaying ? "Pause" : "Play"}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink shadow-lg shadow-accent/15 transition-all hover:scale-[1.04] hover:bg-accent-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 sm:h-14 sm:w-14 ${FOCUS_RING}`}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" strokeWidth={1.75} />
          ) : (
            <Play className="ml-0.5 h-5 w-5 fill-current" strokeWidth={1.75} />
          )}
        </button>

        <button
          type="button"
          onClick={onStop}
          disabled={disabled}
          aria-label="Stop"
          title="Stop"
          className={ICON_BUTTON}
        >
          <Square className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onSkip(SKIP_SECONDS)}
          disabled={disabled}
          aria-label={`Forward ${SKIP_SECONDS} seconds`}
          title={`Forward ${SKIP_SECONDS} seconds`}
          className={ICON_BUTTON}
        >
          <SkipForward className="h-3.5 w-3.5" />
        </button>

        <p className="m-0 ml-1 whitespace-nowrap font-mono text-[13px]">
          <span className="text-accent">{formatClock(currentTime)}</span>
          <span className="text-subtle"> / {formatClock(duration)}</span>
        </p>
      </div>

      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={onToggleLoop}
          disabled={disabled}
          aria-pressed={isLooping}
          aria-label="Loop track"
          title={isLooping ? "Loop on" : "Loop off"}
          className={`rounded-md p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            isLooping ? "text-accent" : "text-muted hover:text-ink"
          } ${FOCUS_RING}`}
        >
          <Repeat className="h-4 w-4" />
        </button>

        <span className="h-5 w-px bg-line" aria-hidden="true" />

        <button
          type="button"
          onClick={onToggleMute}
          disabled={disabled}
          aria-pressed={isMuted}
          aria-label={isMuted ? "Unmute" : "Mute"}
          title={isMuted ? "Unmute" : "Mute"}
          className={`rounded-md p-1 text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
        >
          <VolumeIcon className="h-4 w-4" />
        </button>

        <RangeSlider
          aria-label="Volume"
          min={0}
          max={1}
          step={0.01}
          value={effectiveVolume}
          disabled={disabled}
          onValueChange={onVolumeChange}
          className="w-[90px]"
        />

        <span className="w-8 text-right font-mono text-[10px] text-muted">
          {Math.round(effectiveVolume * 100)}%
        </span>
      </div>
    </div>
  );
}
