import { useEffect, type ReactNode, type RefObject } from "react";
import { LoaderCircle, Upload, X } from "lucide-react";

import { formatDuration, formatFileSize } from "../../lib/format";
import type {
  AnalysisResponse,
  BPMData,
  MusicalKeyData,
  UploadedAudio,
} from "../../services/api";

interface AudioUploadModalProps {
  fileInputRef: RefObject<HTMLInputElement>;
  selectedFile: File | null;
  uploadedAudio: UploadedAudio | null;
  analysis: AnalysisResponse | null;
  bpm: BPMData | null;
  musicalKey: MusicalKeyData | null;
  uploadError: string;
  analysisError: string;
  isUploading: boolean;
  isAnalyzing: boolean;
  onClose: () => void;
  onFileChange: (file?: File) => void;
  onUpload: () => void;
  onAnalyse: () => void;
}

export function AudioUploadModal({
  fileInputRef,
  selectedFile,
  uploadedAudio,
  analysis,
  bpm,
  musicalKey,
  uploadError,
  analysisError,
  isUploading,
  isAnalyzing,
  onClose,
  onFileChange,
  onUpload,
  onAnalyse,
}: AudioUploadModalProps) {
  const busy = isUploading || isAnalyzing;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center m-0 sm:p-6">
      <button
        type="button"
        aria-label="Close upload dialog"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-transparent focus:outline-none"
        tabIndex={-1}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-heading"
        className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-panel shadow-2xl sm:max-w-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-subtle">Add to library</p>
            <h2 id="upload-heading" className="mt-1 text-xl font-medium tracking-tight text-ink">
              Upload audio
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg bg-transparent p-2 text-muted transition-colors hover:bg-white/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto px-6 py-6">
          <div>
            <input
              ref={fileInputRef}
              id="audio-file"
              type="file"
              accept=".wav,.mp3,.flac,.ogg,.m4a,.aac,audio/*"
              disabled={busy}
              onChange={(event) => onFileChange(event.target.files?.[0])}
              className="peer sr-only"
            />
            <label
              htmlFor="audio-file"
              className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed border-field-hover bg-canvas/60 px-6 py-8 text-center transition-colors hover:border-accent/60 hover:bg-accent/5 peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 text-accent">
                <Upload className="h-5 w-5" />
              </span>
              <span className="text-sm font-medium text-ink">Choose an audio file</span>
              <span className="font-mono text-[11px] text-subtle">
                WAV, MP3, FLAC, OGG, M4A, AAC · UP TO 50 MB
              </span>
            </label>
            {selectedFile && (
              <p className="mt-3 truncate text-sm text-muted">
                <span className="text-ink">{selectedFile.name}</span>{" "}
                <span className="font-mono text-xs text-subtle">({formatFileSize(selectedFile.size)})</span>
              </p>
            )}
          </div>

          {uploadError && (
            <div role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {uploadError}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onUpload}
              disabled={!selectedFile || busy || !!uploadedAudio}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-field-line disabled:text-subtle"
            >
              {isUploading && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {isUploading ? "Uploading to storage..." : uploadedAudio ? "Uploaded" : "Upload track"}
            </button>
            <button
              type="button"
              onClick={onAnalyse}
              disabled={!uploadedAudio || busy}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-field-line px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-field-hover hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isAnalyzing && <LoaderCircle className="h-4 w-4 animate-spin text-accent" />}
              {isAnalyzing ? "Analysing stored track..." : "Analyse track"}
            </button>
          </div>

          {uploadedAudio && !isUploading && (
            <p role="status" className="text-sm text-accent">
              Upload complete. Your track is stored and ready for analysis.
            </p>
          )}

          {isAnalyzing && (
            <p role="status" className="text-sm text-muted">
              Your stored audio is being analysed. Longer tracks may take a little while.
            </p>
          )}

          {analysisError && (
            <div role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {analysisError}
            </div>
          )}

          {analysis && (
            <section aria-labelledby="results-heading" aria-live="polite" className="space-y-5 border-t border-line pt-6">
              <div>
                <h3 id="results-heading" className="text-base font-medium text-ink">Analysis results</h3>
                <p className="mt-1 truncate text-sm text-muted">{analysis.filename}</p>
              </div>

              <dl className="grid grid-cols-2 gap-3">
                <Stat label="Duration" value={formatDuration(analysis.duration_seconds)} />
                <Stat label="Sample rate" value={`${analysis.sample_rate.toLocaleString()} Hz`} />
              </dl>

              <div className="grid gap-3 sm:grid-cols-2">
                <ResultCard title="Tempo">
                  {bpm ? (
                    <>
                      <p className="font-mono text-2xl text-ink">{bpm.bpm.toFixed(1)} <span className="text-sm text-subtle">BPM</span></p>
                      <p className="mt-2 text-xs text-muted">Detected beats: {bpm.detected_beats}</p>
                      {bpm.note && <p className="mt-2 text-xs text-muted">{bpm.note}</p>}
                    </>
                  ) : (
                    <p role="status" className="text-sm text-danger">
                      {analysis.results.bpm?.error ?? "The BPM analyzer did not return a result."}
                    </p>
                  )}
                </ResultCard>

                <ResultCard title="Musical key">
                  {musicalKey ? (
                    <>
                      <p className="font-mono text-2xl text-ink">{musicalKey.label}</p>
                      <p className="mt-2 text-xs text-muted">
                        Alternative: {musicalKey.runner_up} · Correlation {musicalKey.correlation_score.toFixed(3)} · Margin {musicalKey.score_margin.toFixed(3)}
                      </p>
                      {musicalKey.note && <p className="mt-2 text-xs text-muted">{musicalKey.note}</p>}
                    </>
                  ) : (
                    <p role="status" className="text-sm text-danger">
                      {analysis.results.musical_key?.error ?? "The musical-key analyzer did not return a result."}
                    </p>
                  )}
                </ResultCard>
              </div>

              <div>
                <h4 className="font-mono text-[11px] uppercase tracking-widest text-subtle">Analyzers</h4>
                <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
                  {Object.entries(analysis.results).map(([name, result]) => (
                    <li key={name} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
                      <span className="capitalize text-muted">{name.replace(/_/g, " ")}</span>
                      <span className={result.status === "success" ? "text-accent" : "text-danger"}>
                        {result.status === "success"
                          ? "Completed"
                          : `Failed${result.error ? ` — ${result.error}` : ""}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-canvas/60 px-3 py-3">
      <dt className="font-mono text-[10px] uppercase tracking-wider text-subtle">{label}</dt>
      <dd className="mt-1 truncate font-mono text-sm text-ink">{value}</dd>
    </div>
  );
}

function ResultCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-xl border border-line bg-canvas/60 p-4">
      <h4 className="font-mono text-[11px] uppercase tracking-widest text-subtle">{title}</h4>
      <div className="mt-3">{children}</div>
    </article>
  );
}
