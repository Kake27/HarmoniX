import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import { api, ApiError, type AudioDetailResponse } from "../services/api";

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "Unavailable";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

const PITCH_CLASSES = [
  "C", "C#", "D", "D#", "E", "F",
  "F#", "G", "G#", "A", "A#", "B",
];
const KEY_TO_PITCH_CLASS: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

function getExpectedKey(
  key: string | null,
  mode: string | null,
  semitones: number,
): string | null {
  if (!key || !(key in KEY_TO_PITCH_CLASS)) return null;
  const shiftedIndex =
    (KEY_TO_PITCH_CLASS[key] + semitones + PITCH_CLASSES.length) %
    PITCH_CLASSES.length;
  return `${PITCH_CLASSES[shiftedIndex]}${mode ? ` ${mode}` : ""}`;
}

export default function AudioDetailPage() {
  const { audioId } = useParams<{ audioId: string }>();
  const { user, signOut } = useAuth();
  const currentUserId = user?.id ?? null;
  const navigate = useNavigate();
  const currentIdentityRef = useRef({ audioId, userId: currentUserId });
  const [audio, setAudio] = useState<AudioDetailResponse | null>(null);
  const [audioOwnerId, setAudioOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [playback, setPlayback] = useState<{
    audioId: string;
    url: string;
    error: string;
  }>({ audioId: "", url: "", error: "" });
  const [isDownloading, setIsDownloading] = useState(false);
  const [semitones, setSemitones] = useState(0);
  const [isTransposing, setIsTransposing] = useState(false);
  const [transposeError, setTransposeError] = useState("");
  const [transposedPreview, setTransposedPreview] = useState<{
    audioId: string;
    semitones: number;
    url: string;
  } | null>(null);
  const transposedUrlRef = useRef<string | null>(null);
  const isMountedRef = useRef(false);

  const revokeTransposedPreview = useCallback(() => {
    if (transposedUrlRef.current) {
      URL.revokeObjectURL(transposedUrlRef.current);
      transposedUrlRef.current = null;
    }
    setTransposedPreview(null);
  }, []);

  useEffect(() => {
    currentIdentityRef.current = { audioId, userId: currentUserId };
  }, [audioId, currentUserId]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (transposedUrlRef.current) {
        URL.revokeObjectURL(transposedUrlRef.current);
        transposedUrlRef.current = null;
      }
    };
  }, []);

  const loadAudio = useCallback(async (showLoading = true) => {
    if (!audioId) {
      setError("Audio file not found.");
      setLoading(false);
      return;
    }

    if (showLoading) {
      setLoading(true);
      setError("");
      setAudio(null);
      setSemitones(0);
      setTransposeError("");
      revokeTransposedPreview();
    }
    try {
      const result = await api.getAudio(audioId);
      setAudio(result);
      setAudioOwnerId(currentUserId);
    } catch (requestError: unknown) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        await signOut();
        navigate("/login", { replace: true });
        return;
      }
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not load this audio file.",
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [audioId, currentUserId, navigate, revokeTransposedPreview, signOut]);

  useEffect(() => {
    void loadAudio();
  }, [loadAudio]);

  const visibleAudioId =
    audio?.id === audioId && audioOwnerId === currentUserId ? audioId : null;
  const visibleAudio = visibleAudioId ? audio : null;
  const currentPlayback =
    playback.audioId === visibleAudioId ? playback : null;
  const playbackUrl = currentPlayback?.url ?? "";
  const playbackError = currentPlayback?.error ?? "";
  const isLoadingPlayback = Boolean(visibleAudio && !currentPlayback);
  const visibleTransposedPreview =
    transposedPreview?.audioId === visibleAudioId ? transposedPreview : null;

  const refreshPlaybackUrl = useCallback(async (targetAudioId: string) => {
    try {
      const access = await api.getAudioAccessUrl(targetAudioId, "inline");
      setPlayback({ audioId: targetAudioId, url: access.url, error: "" });
    } catch (requestError: unknown) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        await signOut();
        navigate("/login", { replace: true });
        return;
      }
      setPlayback({
        audioId: targetAudioId,
        url: "",
        error: requestError instanceof Error
          ? requestError.message
          : "Could not load audio playback.",
      });
    }
  }, [navigate, signOut]);

  useEffect(() => {
    if (visibleAudioId) void refreshPlaybackUrl(visibleAudioId);
  }, [refreshPlaybackUrl, visibleAudioId]);

  async function handleAnalyse() {
    if (!audioId || isAnalyzing) return;

    setIsAnalyzing(true);
    setAnalysisError("");
    try {
      await api.analyseStoredAudio(audioId);
      await loadAudio(false);
    } catch (requestError: unknown) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        await signOut();
        navigate("/login", { replace: true });
        return;
      }
      setAnalysisError(
        requestError instanceof Error
          ? requestError.message
          : "Could not analyse this audio file.",
      );
      await loadAudio(false);
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleTranspose() {
    if (!audioId || isTransposing) return;
    setIsTransposing(true);
    setTransposeError("");
    try {
      const blob = await api.transposeAudio(audioId, semitones);
      const url = URL.createObjectURL(blob);
      if (
        !isMountedRef.current ||
        currentIdentityRef.current.audioId !== audioId ||
        currentIdentityRef.current.userId !== currentUserId
      ) {
        URL.revokeObjectURL(url);
        return;
      }
      revokeTransposedPreview();
      transposedUrlRef.current = url;
      setTransposedPreview({ audioId, semitones, url });
    } catch (requestError: unknown) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        await signOut();
        navigate("/login", { replace: true });
        return;
      }
      setTransposeError(
        requestError instanceof Error
          ? requestError.message
          : "Could not transpose this audio.",
      );
    } finally {
      if (isMountedRef.current) setIsTransposing(false);
    }
  }

  function handleDownloadTransposed() {
    if (!visibleTransposedPreview || !visibleAudio) return;
    const link = document.createElement("a");
    const baseFilename = visibleAudio.original_filename.replace(/\.[^.]+$/, "");
    const shiftLabel = visibleTransposedPreview.semitones >= 0
      ? `plus-${visibleTransposedPreview.semitones}`
      : `minus-${Math.abs(visibleTransposedPreview.semitones)}`;
    link.href = visibleTransposedPreview.url;
    link.download = `${baseFilename}-transpose-${shiftLabel}.wav`;
    link.click();
  }

  async function handleDelete() {
    if (!audioId || isDeleting) return;
    const confirmed = window.confirm(
      "Delete this audio file and all tracks derived from it? This also permanently deletes their stored audio and analysis data.",
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setDeleteError("");
    try {
      await api.deleteAudio(audioId);
      navigate("/", { replace: true });
    } catch (requestError: unknown) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        await signOut();
        navigate("/login", { replace: true });
        return;
      }
      setDeleteError(
        requestError instanceof Error
          ? requestError.message
          : "Could not delete this audio file.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDownload() {
    if (!audioId || isDownloading) return;
    setIsDownloading(true);
    try {
      const access = await api.getAudioAccessUrl(audioId, "attachment");
      window.location.assign(access.url);
    } catch (requestError: unknown) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        await signOut();
        navigate("/login", { replace: true });
        return;
      }
      setPlayback((current) => ({
        audioId,
        url: current.audioId === audioId ? current.url : "",
        error: requestError instanceof Error
          ? requestError.message
          : "Could not prepare this audio for download.",
      }));
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <main className="home-container">
      <p><Link to="/">Back to library</Link></p>
      {loading && <p role="status">Loading audio details...</p>}
      {error && (
        <div role="alert">
          <p className="auth-error">{error}</p>
          {error !== "Audio file not found." && (
            <button type="button" onClick={() => void loadAudio()}>Retry</button>
          )}
        </div>
      )}

      {!loading && visibleAudio && (
        <>
          <header>
            <h1>{visibleAudio.original_filename}</h1>
            <p>Analysis status: {visibleAudio.analysis_status.toLowerCase()}</p>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={isDeleting || isAnalyzing}
            >
              {isDeleting ? "Deleting..." : "Delete audio"}
            </button>
          </header>
          {deleteError && (
            <div role="alert">
              <p className="auth-error">{deleteError}</p>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={isDeleting || isAnalyzing}
              >
                Retry delete
              </button>
            </div>
          )}

          <section aria-labelledby="audio-metadata-heading">
            <h2 id="audio-metadata-heading">Audio metadata</h2>
            <dl>
              <dt>Format</dt><dd>{visibleAudio.file_format.toUpperCase()}</dd>
              <dt>Duration</dt><dd>{formatDuration(visibleAudio.duration)}</dd>
              <dt>Sample rate</dt>
              <dd>{visibleAudio.sample_rate ? `${visibleAudio.sample_rate.toLocaleString()} Hz` : "Unavailable"}</dd>
              <dt>Channels</dt><dd>{visibleAudio.channels ?? "Unavailable"}</dd>
              <dt>File size</dt><dd>{visibleAudio.file_size_bytes.toLocaleString()} bytes</dd>
              <dt>Uploaded</dt><dd>{formatDate(visibleAudio.created_at)}</dd>
            </dl>
          </section>

          <section aria-labelledby="audio-playback-heading">
            <h2 id="audio-playback-heading">Audio</h2>
            {isLoadingPlayback && <p role="status">Preparing audio...</p>}
            {playbackUrl && (
              <audio
                controls
                preload="metadata"
                src={playbackUrl}
                onError={() => setPlayback({
                  audioId: visibleAudio.id,
                  url: playbackUrl,
                  error: "Could not play this audio. The access link may have expired.",
                })}
                aria-label={`Play ${visibleAudio.original_filename}`}
              >
                Your browser does not support audio playback.
              </audio>
            )}
            {playbackError && (
              <div role="alert">
                <p className="auth-error">{playbackError}</p>
                <button
                  type="button"
                  onClick={() => void refreshPlaybackUrl(visibleAudio.id)}
                  disabled={isLoadingPlayback}
                >
                  Refresh playback
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={isDownloading}
            >
              {isDownloading ? "Preparing download..." : "Download audio"}
            </button>
          </section>

          <section aria-labelledby="pitch-shift-heading">
            <h2 id="pitch-shift-heading">Pitch shift</h2>
            <p>
              Selected shift: {semitones > 0 ? `+${semitones}` : semitones}{" "}
              {Math.abs(semitones) === 1 ? "semitone" : "semitones"}
              {semitones === 0 ? " (original pitch)" : ""}
            </p>
            {visibleAudio.analysis?.musical_key && (
              <p>
                Expected key:{" "}
                {getExpectedKey(
                  visibleAudio.analysis.musical_key,
                  visibleAudio.analysis.mode,
                  semitones,
                ) ?? "Unavailable"}
              </p>
            )}
            <div>
              <button
                type="button"
                aria-label="Shift down one semitone"
                onClick={() => setSemitones((value) => Math.max(-6, value - 1))}
                disabled={semitones <= -6 || isTransposing}
              >
                −
              </button>
              <input
                type="range"
                min={-6}
                max={6}
                step={1}
                value={semitones}
                aria-label="Pitch shift in semitones"
                onChange={(event) => setSemitones(Number(event.currentTarget.value))}
                disabled={isTransposing}
              />
              <button
                type="button"
                aria-label="Shift up one semitone"
                onClick={() => setSemitones((value) => Math.min(6, value + 1))}
                disabled={semitones >= 6 || isTransposing}
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={() => void handleTranspose()}
              disabled={isTransposing || semitones === 0}
            >
              {isTransposing ? "Transposing..." : "Transpose"}
            </button>
            {transposeError && (
              <div role="alert">
                <p className="auth-error">{transposeError}</p>
                <button
                  type="button"
                  onClick={() => void handleTranspose()}
                  disabled={isTransposing}
                >
                  Retry transpose
                </button>
              </div>
            )}
            {visibleTransposedPreview && (
              <div>
                <h3>
                  Transposed preview (
                  {visibleTransposedPreview.semitones > 0
                    ? `+${visibleTransposedPreview.semitones}`
                    : visibleTransposedPreview.semitones} semitones)
                </h3>
                <audio
                  controls
                  preload="metadata"
                  src={visibleTransposedPreview.url}
                  aria-label="Play transposed preview"
                >
                  Your browser does not support audio playback.
                </audio>
                <button
                  type="button"
                  onClick={handleDownloadTransposed}
                >
                  Download transposed audio
                </button>
              </div>
            )}
          </section>

          <section aria-labelledby="saved-analysis-heading">
            <h2 id="saved-analysis-heading">Saved analysis</h2>
            {visibleAudio.analysis_status === "PENDING" && (
              <p role="status">This track has not been analysed yet.</p>
            )}
            {visibleAudio.analysis_status === "PROCESSING" && (
              <p role="status">Analysis is currently processing.</p>
            )}
            {isAnalyzing && (
              <p role="status">Analysing this audio file...</p>
            )}
            {visibleAudio.analysis_status === "FAILED" && (
              <p role="alert" className="auth-error">
                {visibleAudio.analysis?.error_message ?? "Analysis failed."}
              </p>
            )}
            {analysisError && (
              <div role="alert">
                <p className="auth-error">{analysisError}</p>
                <button type="button" onClick={() => void handleAnalyse()} disabled={isAnalyzing}>
                  Retry analysis
                </button>
              </div>
            )}
            {(visibleAudio.analysis_status === "PENDING" ||
              visibleAudio.analysis_status === "FAILED") && !analysisError && (
              <button
                type="button"
                onClick={() => void handleAnalyse()}
                disabled={isAnalyzing}
              >
                {isAnalyzing
                  ? "Analysing..."
                  : visibleAudio.analysis_status === "FAILED"
                    ? "Retry analysis"
                    : "Analyse this audio"}
              </button>
            )}
            {visibleAudio.analysis && (
              <>
                {(visibleAudio.analysis.bpm !== null || visibleAudio.analysis.musical_key) && (
                  <dl>
                    <dt>BPM</dt><dd>{visibleAudio.analysis.bpm ?? "Unavailable"}</dd>
                    <dt>Key</dt>
                    <dd>
                      {visibleAudio.analysis.musical_key
                        ? `${visibleAudio.analysis.musical_key}${visibleAudio.analysis.mode ? ` ${visibleAudio.analysis.mode}` : ""}`
                        : "Unavailable"}
                    </dd>
                  </dl>
                )}
                {visibleAudio.analysis.status === "PARTIAL" && (
                  <p role="status">Some analyzers did not complete successfully.</p>
                )}
                {visibleAudio.analysis.results && (
                  <>
                    <h3>Analyzer results</h3>
                    <ul>
                      {Object.entries(visibleAudio.analysis.results).map(([name, result]) => (
                        <li key={name}>
                          <strong>{name.replaceAll("_", " ")}:</strong>{" "}
                          {result.status === "success"
                            ? JSON.stringify(result.data)
                            : `Failed${result.error ? ` — ${result.error}` : ""}`}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <p>Analysis version: {visibleAudio.analysis.analysis_version}</p>
                <p>Analysed: {formatDate(visibleAudio.analysis.created_at)}</p>
              </>
            )}
          </section>
        </>
      )}
    </main>
  );
}
