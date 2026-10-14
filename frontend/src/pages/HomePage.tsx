import { useRef, useState, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";
import {
  api,
  ApiError,
  type AudioLibraryItem,
  type UserProfile,
} from "../services/api";
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

  const [library, setLibrary] = useState<AudioLibraryItem[]>([]);
  const [libraryOwnerId, setLibraryOwnerId] = useState<string | null>(null);
  const [libraryTotal, setLibraryTotal] = useState(0);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [libraryError, setLibraryError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileOwnerId, setSelectedFileOwnerId] = useState<string | null>(null);
  const [uploadedAudio, setUploadedAudio] = useState<UploadedAudio | null>(null);
  const [uploadedAudioOwnerId, setUploadedAudioOwnerId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [analysisOwnerId, setAnalysisOwnerId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  const loadProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);
    setProfileError("");
    setProfile(null);

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
  }, [navigate, signOut, user?.id]);

  const loadLibrary = useCallback(async (offset = 0, append = false) => {
    const ownerId = user?.id;
    if (!ownerId) {
      setLibrary([]);
      setLibraryOwnerId(null);
      setLibraryTotal(0);
      setLoadingLibrary(false);
      return;
    }

    setLibraryError("");
    setLoadingLibrary(true);

    try {
      const result = await api.listAudio(20, offset);
      setLibrary((current) =>
        append ? [...current, ...result.items] : result.items,
      );
      setLibraryOwnerId(ownerId);
      setLibraryTotal(result.total);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 401) {
        await signOut();
        navigate("/login", { replace: true });
        return;
      }
      setLibraryError(
        error instanceof Error ? error.message : "Could not load your library.",
      );
    } finally {
      setLoadingLibrary(false);
    }
  }, [navigate, signOut, user?.id]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

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
    setAnalysisOwnerId(null);
    setUploadedAudio(null);
    setUploadedAudioOwnerId(null);

    if (!file) {
      setSelectedFile(null);
      setSelectedFileOwnerId(null);
      return;
    }

    const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setSelectedFile(null);
      setSelectedFileOwnerId(null);
      setAnalysisError("Unsupported format. Choose WAV, MP3, FLAC, OGG, M4A or AAC.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size === 0) {
      setSelectedFile(null);
      setSelectedFileOwnerId(null);
      setAnalysisError("The selected file is empty.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setSelectedFileOwnerId(null);
      setAnalysisError("The file exceeds the 50 MB upload limit.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
    setSelectedFileOwnerId(user?.id ?? null);
  }

  async function handleUpload() {
    if (
      !selectedFile ||
      selectedFileOwnerId !== user?.id ||
      isUploading ||
      isAnalyzing
    ) return;
    setUploadError("");
    setUploadedAudio(null);
    setIsUploading(true);

    try {
      const result = await api.uploadAudio(selectedFile);
      setUploadedAudio(result);
      setUploadedAudioOwnerId(user?.id ?? null);
      await loadLibrary();
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
    if (
      !uploadedAudio ||
      uploadedAudioOwnerId !== user?.id ||
      isAnalyzing ||
      isUploading
    ) return;
    setAnalysisError("");
    setAnalysis(null);
    setIsAnalyzing(true);

    try {
      const result = await api.analyseStoredAudio(uploadedAudio.id);
      setAnalysis(result);
      setAnalysisOwnerId(user?.id ?? null);
      void loadLibrary();
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

  const visibleSelectedFile =
    selectedFileOwnerId === user?.id ? selectedFile : null;
  const visibleUploadedAudio =
    uploadedAudioOwnerId === user?.id ? uploadedAudio : null;
  const visibleAnalysis = analysisOwnerId === user?.id ? analysis : null;
  const bpm = visibleAnalysis ? getBPMData(visibleAnalysis) : null;
  const musicalKey = visibleAnalysis ? getKeyData(visibleAnalysis) : null;
  const visibleLibrary = libraryOwnerId === user?.id ? library : [];

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

      <section aria-labelledby="library-heading">
        <h2 id="library-heading">Your audio library</h2>
        {loadingLibrary && (
          <p role="status">Loading your uploaded audio files...</p>
        )}
        {libraryError && (
          <div role="alert">
            <p className="auth-error">{libraryError}</p>
            <button type="button" onClick={() => void loadLibrary()}>
              Retry
            </button>
          </div>
        )}
        {!loadingLibrary && !libraryError && visibleLibrary.length === 0 && (
          <p>Your library is empty. Upload a track to get started.</p>
        )}
        {visibleLibrary.length > 0 && (
          <>
            <ul>
              {visibleLibrary.map((track) => (
                <li key={track.id}>
                  <Link to={`/audio/${track.id}`}>
                    <strong>{track.original_filename}</strong>
                  </Link>
                  {" — "}
                  {track.duration === null
                    ? "Duration unavailable"
                    : formatDuration(track.duration)}
                  {" · "}
                  {track.file_format.toUpperCase()}
                  {" · Uploaded "}
                  {new Date(track.created_at).toLocaleDateString()}
                  {" · Analysis "}
                  {track.analysis_status.toLowerCase()}
                  {track.bpm !== null && <> · {track.bpm.toFixed(1)} BPM</>}
                  {track.musical_key && (
                    <> · {track.musical_key}{track.mode ? ` ${track.mode}` : ""}</>
                  )}
                </li>
              ))}
            </ul>
            {visibleLibrary.length < libraryTotal && (
              <button
                type="button"
                disabled={loadingLibrary}
                onClick={() => void loadLibrary(visibleLibrary.length, true)}
              >
                {loadingLibrary ? "Loading..." : "Load more"}
              </button>
            )}
          </>
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

        {visibleSelectedFile && (
          <p><strong>Selected:</strong> {visibleSelectedFile.name} ({formatFileSize(visibleSelectedFile.size)})</p>
        )}

        {uploadError && (
          <div role="alert"><p className="auth-error">{uploadError}</p></div>
        )}

        <button
          type="button"
          onClick={() => void handleUpload()}
          disabled={!visibleSelectedFile || isUploading || isAnalyzing || !!visibleUploadedAudio}
        >
          {isUploading ? "Uploading to storage..." : visibleUploadedAudio ? "Uploaded" : "Upload track"}
        </button>

        {visibleUploadedAudio && (
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
          disabled={!visibleUploadedAudio || isUploading || isAnalyzing}
        >
          {isAnalyzing ? "Analysing stored track..." : "Analyse track"}
        </button>

        {isAnalyzing && (
          <p role="status">Your stored audio is being analysed. Longer tracks may take a little while.</p>
        )}

        {visibleAnalysis && (
          <section aria-labelledby="results-heading" aria-live="polite">
            <hr />
            <h2 id="results-heading">Analysis results</h2>
            <p><strong>File:</strong> {visibleAnalysis.filename}</p>
            <p><strong>Duration:</strong> {formatDuration(visibleAnalysis.duration_seconds)}</p>
            <p><strong>Sample rate:</strong> {visibleAnalysis.sample_rate.toLocaleString()} Hz</p>

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
                    {visibleAnalysis.results.bpm?.error ?? "The BPM analyzer did not return a result."}
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
                    {visibleAnalysis.results.musical_key?.error ?? "The musical-key analyzer did not return a result."}
                  </p>
                )}
              </article>
            </div>

            <h3>Analyzer status</h3>
            <ul>
              {Object.entries(visibleAnalysis.results).map(([name, result]) => (
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
