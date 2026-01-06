import React, { useRef, useState } from "react";
import { Music, ChevronLeft, ChevronRight, Moon, Sun, Loader2, Play, ExternalLink, Upload} from "lucide-react";
import UploadForm from "./components/UploadForm";
import { transposeTrack, pollJobStatus } from "./services/api";
import { useTheme } from "./contexts/ThemeContext";
import { useScaleDetection } from "./hooks/scaleDetection";
import TrackPanel from "./components/TrackPanel";
import CandidatesList from "./components/CandidatesList";
import ErrorMessage from "./components/Errors";


const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function App() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const {detect, candidates, scaleError} = useScaleDetection()

  const { theme, toggleTheme } = useTheme();
  const [uploaded, setUploaded] = useState<{ track_id: string; filename: string, stored_path: string } | null>(null);
  const [loadingDetect, setLoadingDetect] = useState(false);
  // const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [detectedIndex, setDetectedIndex] = useState<number | null>(null);
  const [detectedMode, setDetectedMode] = useState<string | null>(null);
  const [offset, setOffset] = useState<number>(0);
  const [applyingTranspose, setApplyingTranspose] = useState(false);
  const [jobProgressText, setJobProgressText] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);

  async function onUploaded(info: { track_id: string; filename: string, stored_path: string }) {
    setUploaded(info);
    // setCandidates(null);
    setError(null);
    setDetectedIndex(null);
    setDetectedMode(null);
    setOffset(0);
    setProcessedUrl(null);
  }

  async function handleDetect() {
    if (!uploaded) return;
    setLoadingDetect(true);
    const best = await detect(uploaded.track_id)
    if(best) {
      // console.log(best)
      setDetectedIndex(best.tonic_index)
      setDetectedMode(best.mode)
      setOffset(0)
      setLoadingDetect(false)
    }
    
    // setError(null);
    // setCandidates(null);
    // setDetectedIndex(null);
    // try {
    //   const res = await detectScale(uploaded.track_id, 3);
    //   // setCandidates(res.candidates ?? null);

    //   if (res.candidates && res.candidates.length > 0) {
    //     const best = res.candidates[0];
    //     setDetectedIndex(best.tonic_index);
    //     setDetectedMode(best.mode);
    //     setOffset(0);
    //   }
    // } catch (err: any) {
    //   console.error(err);
    //   setError(err?.message || "Detection failed");
    // } finally {
    //   setLoadingDetect(false);
    // }
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
          const apiBase = (import.meta.env.VITE_API_BASE || "http://localhost:8000").replace(/\/$/,"");
          const url = final.processed_url.startsWith("http") ? final.processed_url : apiBase + final.processed_url;
          setProcessedUrl(url);
          setJobProgressText(null);
      } else {
          setError(final.error || "Transposition failed");
          setJobProgressText(null);
      }
    } catch (err: Error | unknown) {
        const errorMessage = err instanceof Error ? err.message : "Transpose failed";
        console.error(err);
        setError(errorMessage);
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
              <div className="p-2.5 bg-linear-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
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
              <TrackPanel
                filename={uploaded.filename}
                audioSrc={`${import.meta.env.VITE_API_BASE || "http://localhost:8000"}${uploaded.stored_path}`}
                audioRef={audioRef as React.RefObject<HTMLAudioElement>}
                onDetect={handleDetect}
                loading={loadingDetect} />

              {candidates && candidates.length > 0 && (
                <CandidatesList candidates={candidates} />
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
                    className="w-full lg:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-linear-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all shadow-sm"
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
            <ErrorMessage title="Error" message={error} onClose={() => setError(null)} />
          )}
          {scaleError && (
            <ErrorMessage title="Detection Error" message={scaleError} variant="warning" onClose={() => {}} />
          )}
          
        </div>
      </div>
    </div>
  );
}

export default App;
