import { useRef, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import { api, ApiError, type UserProfile } from "../services/api";
import type {
  AnalysisResponse,
  BPMData,
  MusicalKeyData,
  UploadedAudio,
} from "../services/api";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_EXTENSIONS = [".wav", ".mp3", ".flac", ".ogg", ".m4a", ".aac"];

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getBPMData(result: AnalysisResponse): BPMData | null {
  const analyzer = result.results.bpm;
  const data = analyzer?.data;
  if (analyzer?.status !== "success" || !data || typeof data.bpm !== "number") {
    return null;
  }
  return data as unknown as BPMData;
}

function getKeyData(result: AnalysisResponse): MusicalKeyData | null {
  const analyzer = result.results.musical_key;
  const data = analyzer?.data;
  if (analyzer?.status !== "success" || !data || typeof data.key !== "string") {
    return null;
  }
  return data as unknown as MusicalKeyData;
}

export default function HomePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedAudio, setUploadedAudio] = useState<UploadedAudio | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  const loadProfile = useCallback(async () => {
    setLoadingProfile(true);
    setProfileError("");

    try {
      const result = await api.getMyProfile();
      setProfile(result);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) {
        await signOut();
        navigate("/login", { replace: true });
        return;
      }
      setProfileError(
        error instanceof Error ? error.message : "Could not load your profile.",
      );
    } finally {
      setLoadingProfile(false);
    }
  }, [navigate, signOut]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch {
      setProfileError("Could not sign out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  function handleFileChange(file?: File) {
    setUploadError("");
    setAnalysisError("");
    setAnalysis(null);
    setUploadedAudio(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setSelectedFile(null);
      setAnalysisError("Unsupported format. Choose WAV, MP3, FLAC, OGG, M4A or AAC.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size === 0) {
      setSelectedFile(null);
      setAnalysisError("The selected file is empty.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setAnalysisError("The file exceeds the 50 MB upload limit.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile || isUploading || isAnalyzing) return;
    setUploadError("");
    setUploadedAudio(null);
    setIsUploading(true);

    try {
      const result = await api.uploadAudio(selectedFile);
      setUploadedAudio(result);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) {
        await signOut();
        navigate("/login", { replace: true });
        return;
      }
      setUploadError(
        error instanceof Error ? error.message : "Could not upload this file.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleAnalyse() {
    if (!uploadedAudio || isAnalyzing || isUploading) return;
    setAnalysisError("");
    setAnalysis(null);
    setIsAnalyzing(true);

    try {
      const result = await api.analyseStoredAudio(uploadedAudio.id);
      setAnalysis(result);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) {
        await signOut();
        navigate("/login", { replace: true });
        return;
      }
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while analysing the file.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  const bpm = analysis ? getBPMData(analysis) : null;
  const musicalKey = analysis ? getKeyData(analysis) : null;

  return (
    <main className="home-container">
      <header>
        <h1>Welcome to Harmonix</h1>
        <p>You're signed in through Supabase Auth.</p>
      </header>

      <section aria-labelledby="profile-heading">
        <h2 id="profile-heading">Backend profile</h2>
        {loadingProfile && <p>Loading your profile from the API...</p>}
        {profileError && (
          <div role="alert">
            <p className="auth-error">{profileError}</p>
            <button onClick={() => void loadProfile()}>Retry</button>
          </div>
        )}
        {!loadingProfile && profile && (
          <div>
            <p><strong>Name:</strong> {profile.name || "Not set"}</p>
            <p><strong>Email:</strong> {profile.email}</p>
            <p><strong>Application user ID:</strong> <code>{profile.id}</code></p>
            <p><strong>Profile created:</strong> {new Date(profile.created_at).toLocaleString()}</p>
          </div>
        )}
      </section>

      <hr />

      <section aria-labelledby="analysis-heading">
        <h2 id="analysis-heading">Analyse an audio track</h2>
        <p>
          Upload an audio file to estimate its BPM and musical key. Supported formats:
          WAV, MP3, FLAC, OGG, M4A and AAC (maximum 50 MB).
        </p>

        <div>
          <label htmlFor="audio-file">Choose an audio file</label>{" "}
          <input
            ref={fileInputRef}
            id="audio-file"
            type="file"
            accept=".wav,.mp3,.flac,.ogg,.m4a,.aac,audio/*"
            disabled={isUploading || isAnalyzing}
            onChange={(event) => handleFileChange(event.target.files?.[0])}
          />
        </div>

        {selectedFile && (
          <p><strong>Selected:</strong> {selectedFile.name} ({formatFileSize(selectedFile.size)})</p>
        )}

        {uploadError && (
          <div role="alert"><p className="auth-error">{uploadError}</p></div>
        )}

        <button
          type="button"
          onClick={() => void handleUpload()}
          disabled={!selectedFile || isUploading || isAnalyzing || !!uploadedAudio}
        >
          {isUploading ? "Uploading to storage..." : uploadedAudio ? "Uploaded" : "Upload track"}
        </button>

        {uploadedAudio && (
          <p role="status">
            Upload complete. Your track is stored and ready for analysis.
          </p>
        )}

        {analysisError && (
          <div role="alert"><p className="auth-error">{analysisError}</p></div>
        )}

        <button
          type="button"
          onClick={() => void handleAnalyse()}
          disabled={!uploadedAudio || isUploading || isAnalyzing}
        >
          {isAnalyzing ? "Analysing stored track..." : "Analyse track"}
        </button>

        {isAnalyzing && (
          <p role="status">Your stored audio is being analysed. Longer tracks may take a little while.</p>
        )}

        {analysis && (
          <section aria-labelledby="results-heading" aria-live="polite">
            <hr />
            <h2 id="results-heading">Analysis results</h2>
            <p><strong>File:</strong> {analysis.filename}</p>
            <p><strong>Duration:</strong> {formatDuration(analysis.duration_seconds)}</p>
            <p><strong>Sample rate:</strong> {analysis.sample_rate.toLocaleString()} Hz</p>

            <div className="analysis-results">
              <article>
                <h3>Tempo</h3>
                {bpm ? (
                  <>
                    <p><strong>{bpm.bpm.toFixed(1)} BPM</strong></p>
                    <p>Detected beats: {bpm.detected_beats}</p>
                    {bpm.note && <p>{bpm.note}</p>}
                  </>
                ) : (
                  <p role="status">
                    {analysis.results.bpm?.error ?? "The BPM analyzer did not return a result."}
                  </p>
                )}
              </article>

              <article>
                <h3>Musical key</h3>
                {musicalKey ? (
                  <>
                    <p><strong>{musicalKey.label}</strong></p>
                    <p>Mode: {musicalKey.mode}</p>
                    <p>Alternative candidate: {musicalKey.runner_up}</p>
                    <p>Profile correlation: {musicalKey.correlation_score.toFixed(3)}</p>
                    <p>Score margin: {musicalKey.score_margin.toFixed(3)}</p>
                    {musicalKey.note && <p>{musicalKey.note}</p>}
                  </>
                ) : (
                  <p role="status">
                    {analysis.results.musical_key?.error ?? "The musical-key analyzer did not return a result."}
                  </p>
                )}
              </article>
            </div>

            <h3>Analyzer status</h3>
            <ul>
              {Object.entries(analysis.results).map(([name, result]) => (
                <li key={name}>
                  <strong>{name.replaceAll("_", " ")}:</strong>{" "}
                  {result.status === "success"
                    ? "Completed"
                    : `Failed${result.error ? ` — ${result.error}` : ""}`}
                </li>
              ))}
            </ul>
          </section>
        )}
      </section>

      <hr />
      <p>
        <strong>Supabase Auth email:</strong> {user?.email ?? "No active session"}
      </p>
      <button onClick={() => void handleSignOut()} disabled={signingOut}>
        {signingOut ? "Signing out..." : "Sign out"}
      </button>
    </main>
  );
}
