import { formatClock, formatDateTime, formatFileSize } from "../../lib/format";
import type { AudioDetailResponse } from "../../services/api";

function formatChannels(channels: number | null): string {
  if (channels === null) return "Unavailable";
  if (channels === 1) return "Mono";
  if (channels === 2) return "Stereo";
  return `${channels} channels`;
}

function formatFormat(fileFormat: string, sampleRate: number | null): string {
  const parts = [fileFormat.toUpperCase()];
  if (sampleRate) {
    parts.push(`${(sampleRate / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })} kHz`);
  }
  return parts.join(" · ");
}

interface FileInfoStripProps {
  audio: AudioDetailResponse;
}

export function FileInfoStrip({ audio }: FileInfoStripProps) {
  const items = [
    { label: "File size", value: formatFileSize(audio.file_size_bytes), title: `${audio.file_size_bytes.toLocaleString()} bytes` },
    { label: "Format", value: formatFormat(audio.file_format, audio.sample_rate) },
    { label: "Duration", value: audio.duration === null ? "Unavailable" : formatClock(audio.duration) },
    { label: "Channels", value: formatChannels(audio.channels) },
    { label: "Uploaded", value: formatDateTime(audio.created_at) },
  ];

  return (
    <div className="border-t border-line px-5 py-5 sm:px-7">
      <h2 className="sr-only">Audio metadata</h2>
      <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-5 lg:gap-7">
        {items.map(({ label, value, title }) => (
          <div key={label} className="min-w-0">
            <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{label}</dt>
            <dd className="m-0 mt-2.5 truncate font-mono text-xs text-ink" title={title ?? value}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
