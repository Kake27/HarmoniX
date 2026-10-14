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

  const loadAudio = useCallback(async () => {
    if (!audioId) {
      setError("Audio file not found.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setAudio(null);
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
      setLoading(false);
    }
  }, [audioId, navigate, signOut, user]);

  useEffect(() => {
    void loadAudio();
  }, [loadAudio]);

  const visibleAudio =
    audio?.id === audioId && audioOwnerId === user?.id ? audio : null;

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
          </header>

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
            {visibleAudio.analysis_status === "FAILED" && (
              <p role="alert" className="auth-error">
                {visibleAudio.analysis?.error_message ?? "Analysis failed."}
              </p>
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
