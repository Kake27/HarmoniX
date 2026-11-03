import type { CSSProperties } from "react";

const BAR_COUNT = 64;
const PLAYHEAD_POSITION = 0.38;

const WAVEFORM_BARS = Array.from({ length: BAR_COUNT }, (_, index) => {
  const wave = Math.abs(Math.sin(index * 0.55) * 0.6 + Math.sin(index * 1.7) * 0.4);
  return 0.18 + wave * 0.82;
});

type SoundShowcaseProps = {
  title: string;
};

export function SoundShowcase({ title }: SoundShowcaseProps) {
  const playedBars = Math.round(PLAYHEAD_POSITION * BAR_COUNT);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-[0_24px_48px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-4 px-4 pt-5 pb-5 sm:px-6 sm:pt-6">
        <div>
          <h3 className="m-0 text-xl font-medium text-ink">{title}</h3>
          <p className="mt-2 mb-0 font-mono text-[11px] tracking-[0.04em] text-muted">
            WAV / 48 kHz / 24-bit / STEREO
          </p>
        </div>
        <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] whitespace-nowrap text-accent uppercase">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(142,243,205,0.7)]"
          />
          Analyzed
        </span>
      </div>

      <div className="relative h-32 px-4 sm:px-6">
        <div aria-hidden="true" className="flex h-full items-center gap-[3px]">
          {WAVEFORM_BARS.map((height, index) => (
            <span
              key={index}
              className={`min-w-0 flex-1 origin-center rounded-sm motion-safe:animate-bar-in ${
                index < playedBars ? "bg-accent" : "bg-bar-idle"
              }`}
              style={{
                height: `${height * 100}%`,
                animationDelay: `${index * 12}ms`,
              } as CSSProperties}
            />
          ))}
        </div>
        <span
          aria-hidden="true"
          className="absolute inset-y-0 w-0.5 -ml-px bg-accent"
          style={{ left: `${PLAYHEAD_POSITION * 100}%` }}
        >
          <span className="absolute -top-1.5 -left-[3px] size-2 rounded-full bg-accent" />
        </span>
      </div>

      <div className="flex justify-between px-4 pt-3 pb-5 font-mono text-[11px] text-accent sm:px-6">
        <span>01:24</span>
        <span className="text-muted">03:42</span>
      </div>

      <dl className="m-0 grid grid-cols-3 gap-4 border-t border-line bg-showcase-footer px-4 pt-5 pb-6 sm:px-6">
        <div>
          <dt className="font-mono text-[11px] tracking-[0.08em] text-muted uppercase">Tempo</dt>
          <dd className="m-0 mt-2 font-mono text-xl whitespace-nowrap text-ink sm:text-2xl">
            108 <small className="text-[11px] text-muted">BPM</small>
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] tracking-[0.08em] text-muted uppercase">Key</dt>
          <dd className="m-0 mt-2 font-mono text-xl whitespace-nowrap text-ink sm:text-2xl">
            F♯m <small className="text-[11px] text-muted">F♯ minor</small>
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] tracking-[0.08em] text-muted uppercase">Loudness</dt>
          <dd className="m-0 mt-2 font-mono text-xl whitespace-nowrap text-ink sm:text-2xl">
            −14.2 <small className="text-[11px] text-muted">LUFS</small>
          </dd>
        </div>
      </dl>
    </div>
  );
}
