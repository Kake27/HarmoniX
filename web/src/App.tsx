import { useState } from "react";
import {
  Music,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Moon,
  Sun,
  AlertCircle,
  Loader2,
  Play,
  ExternalLink,
  Upload,
} from "lucide-react";
import UploadForm from "./components/UploadForm";
import { detectScale, transposeTrack, pollJobStatus } from "./services/api";
import { useTheme } from "./contexts/ThemeContext";

type Candidate = {
  rank: number;
  tonic_ind: number;
  tonic_name_sharp: string;
  tonic_name_flat: string;
  mode: string;
  score: number;
  gap_to_next: number;
};

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function App() {
  const { theme, toggleTheme } = useTheme();
  const [uploaded, setUploaded] = useState<{ track_id: string; filename: string } | null>(null);
  const [loadingDetect, setLoadingDetect] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [detectedIndex, setDetectedIndex] = useState<number | null>(null);
  const [detectedMode, setDetectedMode] = useState<string | null>(null);
  const [offset, setOffset] = useState<number>(0);
  const [applyingTranspose, setApplyingTranspose] = useState(false);
  const [jobProgressText, setJobProgressText] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);

  async function onUploaded(info: { track_id: string; filename: string }) {
    setUploaded(info);
    setCandidates(null);
    setError(null);
    setDetectedIndex(null);
    setDetectedMode(null);
    setOffset(0);
    setProcessedUrl(null);
  }

  async function handleDetect() {
    if (!uploaded) return;
    setLoadingDetect(true);
    setError(null);
    setCandidates(null);
    setDetectedIndex(null);
    try {
      const res = await detectScale(uploaded.track_id, 3);
      setCandidates(res.candidates ?? null);

      if (res.candidates && res.candidates.length > 0) {
        const best = res.candidates[0];
        setDetectedIndex(best.tonic_index);
        setDetectedMode(best.mode);
        setOffset(0);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Detection failed");
    } finally {
      setLoadingDetect(false);
    }
  }

  function displayedNote() {
    if (detectedIndex === null) return "--";
    const idx = mod12(detectedIndex + offset);
    return NOTES[idx];
  }

  function mod12(n: number) {
    const m = ((n % 12) + 12) % 12;
    return m;
  }

  function handleInc() {
    setOffset((o) => o + 1);
    setProcessedUrl(null);
  }

  function handleDec() {
    setOffset((o) => o - 1);
    setProcessedUrl(null);
  }

  async function handleApplyTranspose() {
    if (!uploaded || detectedIndex === null) return;
    setApplyingTranspose(true);
    setJobProgressText("Queuing job...");
    setError(null);
    setProcessedUrl(null);

    try {
      const semitones = offset;
      const resp = await transposeTrack(uploaded.track_id, semitones);
      setJobProgressText(`Processing job: ${resp.job_id}`);

      const final = await pollJobStatus(resp.job_id, 1200, 5 * 60 * 1000);
      if (final.status === "done" && final.processed_url) {
        const apiBase = (import.meta.env.VITE_API_BASE || "http://localhost:8000").replace(
          /\/$/,
          ""
        );
        const url = final.processed_url.startsWith("http")
          ? final.processed_url
          : apiBase + final.processed_url;
        setProcessedUrl(url);
        setJobProgressText(null);
      } else {
        setError(final.error || "Transposition failed");
        setJobProgressText(null);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Transpose failed");
      setJobProgressText(null);
    } finally {
      setApplyingTranspose(false);
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        <header className="mb-8 md:mb-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <Music className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                  HarmoniX
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  Analyze, detect & transpose music tracks
                </p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
              aria-label="Toggle theme"
            >
              {theme === "light" ? (
                <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              ) : (
                <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              )}
            </button>
          </div>
        </header>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Upload Audio
            </h2>
            <UploadForm onUploaded={onUploaded} />
          </div>

          {uploaded && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Current Track
                  </h3>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {uploaded.filename}
                  </p>
                </div>
                <button
                  onClick={handleDetect}
                  disabled={loadingDetect}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all shadow-sm"
                >
                  {loadingDetect ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Detecting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Detect Scale
                    </>
                  )}
                </button>
              </div>

              {candidates && candidates.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Top Candidates
                  </h4>
                  <div className="space-y-2">
                    {candidates.map((c, idx) => (
                      <div
                        key={c.rank}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          idx === 0
                            ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                            : "bg-gray-50 dark:bg-gray-700/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xs font-bold ${
                              idx === 0
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            #{c.rank}
                          </span>
                          <div>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {c.tonic_name_sharp}
                            </span>
                            <span className="ml-2 text-gray-600 dark:text-gray-400">
                              {c.mode}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Score: {c.score.toFixed(3)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {detectedIndex !== null && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Transpose Controls
              </h3>

              <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
                <div className="flex-1">
                  <div className="flex items-center justify-center gap-4 bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-700/50 rounded-xl p-6">
                    <button
                      onClick={handleDec}
                      disabled={applyingTranspose}
                      className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                      aria-label="Decrease semitone"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </button>

                    <div className="text-center min-w-35">
                      <div className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-1">
                        {displayedNote()}
                      </div>
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        {detectedMode}
                      </div>
                      <div className="inline-block px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
                        {offset > 0 ? "+" : ""}
                        {offset} semitone{Math.abs(offset) !== 1 ? "s" : ""}
                      </div>
                    </div>

                    <button
                      onClick={handleInc}
                      disabled={applyingTranspose}
                      className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                      aria-label="Increase semitone"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </button>
                  </div>
                </div>

                <div className="w-full lg:w-auto">
                  <button
                    onClick={handleApplyTranspose}
                    disabled={applyingTranspose}
                    className="w-full lg:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all shadow-sm"
                  >
                    {applyingTranspose ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        Apply Transpose
                      </>
                    )}
                  </button>

                  {jobProgressText && (
                    <p className="mt-3 text-sm text-center text-gray-600 dark:text-gray-400 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {jobProgressText}
                    </p>
                  )}

                  {processedUrl && (
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-sm font-medium text-green-800 dark:text-green-400 mb-3">
                        Processing complete!
                      </p>
                      <audio
                        controls
                        src={processedUrl}
                        className="w-full mb-3"
                        style={{ height: "40px" }}
                      />
                      <a
                        href={processedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 text-sm text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open in new tab
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 transition-colors duration-300">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-800 dark:text-red-400 mb-1">Error</h4>
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
