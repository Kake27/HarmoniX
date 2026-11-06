import { useMemo } from "react";

const BAR_COUNT = 56;

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateWaveform(seed: string): number[] {
  const random = createRandom(hashSeed(seed));
  return Array.from({ length: BAR_COUNT }, () => {
    const peak = Math.pow(random(), 1.4);
    return Math.round((0.12 + peak * 0.88) * 100) / 100;
  });
}

interface WaveformBarsProps {
  seed: string;
}

export function WaveformBars({ seed }: WaveformBarsProps) {
  const heights = useMemo(() => generateWaveform(seed), [seed]);

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
