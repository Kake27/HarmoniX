import { useMemo } from "react";

import { formatClock } from "../../lib/format";
import { generateWaveform } from "../../lib/waveform";

const BAR_COUNT = 150;
const LABEL_COUNT = 7;

interface WaveformTimelineProps {
  seed: string;
  trackName: string;
  currentTime: number;
  duration: number;
  disabled: boolean;
  onSeek: (time: number) => void;
}

export function WaveformTimeline({
  seed,
  trackName,
  currentTime,
  duration,
  disabled,
  onSeek,
}: WaveformTimelineProps) {
  const bars = useMemo(() => generateWaveform(seed, BAR_COUNT), [seed]);
  const labels = useMemo(
    () => Array.from({ length: LABEL_COUNT }, (_, index) => formatClock((duration * index) / (LABEL_COUNT - 1))),
    [duration],
  );

  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;
  const playedBars = Math.round(progress * BAR_COUNT);
  const canSeek = !disabled && duration > 0;

  return (
    <div>
      <div className="relative h-20 rounded-md ring-offset-4 ring-offset-panel has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/60 sm:h-[94px]">
        <div className="flex h-full items-center gap-[2px] sm:gap-[3px]" aria-hidden="true">
          {bars.map((height, index) => (
            <span
              key={index}
              className={`min-w-0 flex-1 origin-center animate-bar-in rounded-full transition-colors duration-300 motion-reduce:animate-none max-md:even:hidden ${
                index < playedBars ? "bg-accent" : "bg-wave-idle"
              }`}
              style={{ height: `${height * 100}%`, animationDelay: `${index * 4}ms` }}
            />
          ))}
        </div>

        <div
          aria-hidden="true"
          className={`pointer-events-none absolute -inset-y-1 w-px bg-accent transition-[left,opacity] duration-200 ease-linear ${
            duration > 0 ? "opacity-100" : "opacity-0"
          }`}
          style={{ left: `${progress * 100}%` }}
        >
          <span className="absolute -left-[3.5px] -top-1 h-2 w-2 rounded-full bg-accent" />
        </div>

        <input
          type="range"
          aria-label={`Seek ${trackName}`}
          aria-valuetext={`${formatClock(currentTime)} of ${formatClock(duration)}`}
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(currentTime, duration || 0)}
          disabled={!canSeek}
          onChange={(event) => onSeek(Number(event.currentTarget.value))}
          className="absolute inset-0 m-0 h-full w-full cursor-pointer appearance-none opacity-0 disabled:cursor-default"
        />
      </div>

      <div className="mt-3 flex justify-between font-mono text-[9px] text-subtle" aria-hidden="true">
        {labels.map((label, index) => (
          <span key={index} className="max-sm:even:hidden">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
