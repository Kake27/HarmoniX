import { AudioWaveform, Drum, Guitar, Mic, type LucideIcon } from "lucide-react";

import { RangeSlider } from "../ui/RangeSlider";
import { PanelCard } from "./PanelCard";
import { TEXT_BUTTON } from "./styles";

/**
 * Visual placeholder for the stem mixer. Controls are intentionally disabled
 * until stem separation is available from the backend.
 */
const PLACEHOLDER_STEMS: { id: string; label: string; icon: LucideIcon; level: number }[] = [
  { id: "vocals", label: "Vocals", icon: Mic, level: 100 },
  { id: "bass", label: "Bass", icon: Guitar, level: 80 },
  { id: "drums", label: "Drums", icon: Drum, level: 90 },
  { id: "other", label: "Other", icon: AudioWaveform, level: 65 },
];

interface StemMixerPlaceholderProps {
  className?: string;
}

export function StemMixerPlaceholder({ className = "" }: StemMixerPlaceholderProps) {
  return (
    <PanelCard
      title="Stem mixer"
      headingId="stem-mixer-heading"
      describedBy="stem-mixer-note"
      className={className}
      aside={
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-subtle">
            Coming soon
          </span>
          <button type="button" disabled className={TEXT_BUTTON}>
            Reset mix
          </button>
        </div>
      }
    >
      <ul className="m-0 flex list-none flex-col gap-[19px] p-0">
        {PLACEHOLDER_STEMS.map(({ id, label, icon: Icon, level }) => (
          <li
            key={id}
            className="grid grid-cols-[minmax(72px,88px)_minmax(0,1fr)_40px_24px] items-center gap-3"
          >
            <span className="flex min-w-0 items-center gap-2 text-xs text-ink">
              <Icon className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </span>
            <RangeSlider
              aria-label={`${label} level`}
              min={0}
              max={100}
              value={level}
              disabled
            />
            <span className="text-right font-mono text-[10px] text-accent/60">{level}%</span>
            <button
              type="button"
              disabled
              aria-label={`Mute ${label.toLowerCase()}`}
              className="flex h-6 w-6 items-center justify-center rounded border border-line font-mono text-[9px] text-subtle disabled:cursor-not-allowed disabled:opacity-60"
            >
              M
            </button>
          </li>
        ))}
      </ul>

      <p id="stem-mixer-note" className="m-0 mt-auto text-[11px] text-subtle">
        Stem separation is coming soon. Once stems are generated, balance them here and mute any stem with M.
      </p>
    </PanelCard>
  );
}
