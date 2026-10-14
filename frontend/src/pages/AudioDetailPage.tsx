import { useCallback, useEffect, useState } from "react";
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

export default function AudioDetailPage() {
  const { audioId } = useParams<{ audioId: string }>();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [audio, setAudio] = useState<AudioDetailResponse | null>(null);
  const [audioOwnerId, setAudioOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

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
    }
    try {
      const result = await api.getAudio(audioId);
      setAudio(result);
      setAudioOwnerId(user?.id ?? null);
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
  }, [audioId, navigate, signOut, user]);

  useEffect(() => {
    void loadAudio();
  }, [loadAudio]);

  const visibleAudio =
    audio?.id === audioId && audioOwnerId === user?.id ? audio : null;

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
