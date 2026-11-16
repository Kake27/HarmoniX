import { useMemo } from "react";

import { generateWaveform } from "../../lib/waveform";

const BAR_COUNT = 56;

interface WaveformBarsProps {
  seed: string;
}

export function WaveformBars({ seed }: WaveformBarsProps) {
  const heights = useMemo(() => generateWaveform(seed, BAR_COUNT), [seed]);

  return (
    <div className="flex h-9 w-full max-w-[220px] items-center gap-[2px]" aria-hidden="true">
      {heights.map((height, index) => (
        <span
          key={index}
          className="w-[2px] flex-1 origin-center animate-bar-in rounded-full bg-accent/40 motion-reduce:animate-none"
          style={{
            height: `${height * 100}%`,
            animationDelay: `${index * 12}ms`,
          }}
        />
      ))}
    </div>
  );
}
