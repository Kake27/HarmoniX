import type { CSSProperties } from "react";

import "./SoundShowcase.css";

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
    <div className="sound-showcase">
      <div className="sound-showcase-top">
        <div>
          <h3 className="sound-showcase-title">{title}</h3>
          <p className="sound-showcase-meta">WAV / 48 kHz / 24-bit / STEREO</p>
        </div>
        <span className="sound-showcase-badge">
          <span className="sound-showcase-dot" aria-hidden="true" />
          Analyzed
        </span>
      </div>

      <div className="sound-showcase-wave">
        <div className="sound-showcase-bars" aria-hidden="true">
          {WAVEFORM_BARS.map((height, index) => (
            <span
              key={index}
              className={
                index < playedBars
                  ? "sound-showcase-bar is-played"
                  : "sound-showcase-bar"
              }
              style={
                {
                  height: `${height * 100}%`,
                  "--bar-index": index,
                } as CSSProperties
              }
            />
          ))}
        </div>
        <span
          className="sound-showcase-playhead"
          style={{ left: `${PLAYHEAD_POSITION * 100}%` }}
          aria-hidden="true"
        />
      </div>

      <div className="sound-showcase-times">
        <span>01:24</span>
        <span>03:42</span>
      </div>

      <dl className="sound-showcase-stats">
        <div>
          <dt>Tempo</dt>
          <dd>
            108 <small>BPM</small>
          </dd>
        </div>
        <div>
          <dt>Key</dt>
          <dd>
            F♯m <small>F♯ minor</small>
          </dd>
        </div>
        <div>
          <dt>Loudness</dt>
          <dd>
            −14.2 <small>LUFS</small>
          </dd>
        </div>
      </dl>
    </div>
  );
}
