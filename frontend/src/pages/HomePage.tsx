import { useRef, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload } from "lucide-react";

import { AudioUploadModal } from "../components/home/AudioUploadModal";
import { HomeHeader, type HomeTab } from "../components/home/HomeHeader";
import { LibrarySection } from "../components/home/LibrarySection";
import { ProfilePanel } from "../components/home/ProfilePanel";
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

function getGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getInitials(source: string): string {
  const initials = source
    .trim()
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  return initials || "?";
}

export default function HomePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<HomeTab>("library");
  const [librarySearch, setLibrarySearch] = useState("");

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  const [library, setLibrary] = useState<AudioLibraryItem[]>([]);
  const [libraryOwnerId, setLibraryOwnerId] = useState<string | null>(null);
  const [libraryTotal, setLibraryTotal] = useState(0);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [libraryError, setLibraryError] = useState("");

  const [uploadOpen, setUploadOpen] = useState(false);
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
    setSignOutError("");
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch {
      setSignOutError("Could not sign out. Please try again.");
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

  const displayName = profile?.name || profile?.email || user?.email || "Account";
  const displayEmail = profile?.email ?? user?.email ?? "";
  const initials = getInitials(displayName);
  const firstName = profile?.name?.split(" ")[0];
  const greeting = getGreeting(new Date());

  return (
    <div className="flex min-h-screen flex-col bg-canvas font-sans leading-[1.5] text-ink">
      <HomeHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        name={displayName}
        email={displayEmail}
        initials={initials}
        signingOut={signingOut}
        onSignOut={() => void handleSignOut()}
      />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-10 sm:px-8 sm:py-14 my-0">
        {signOutError && (
          <p role="alert" className="mb-6 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {signOutError}
          </p>
        )}

        {activeTab === "library" ? (
          <div className="space-y-12">
            <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-widest text-subtle">
                  Your personal soundspace
                </p>
                <h1 className="mt-3 text-4xl font-medium leading-[1.2] tracking-tight text-ink sm:text-5xl">
                  {greeting}
                  {firstName ? `, ${firstName}` : ""}.
                </h1>
                <p className="mt-3 text-base text-muted">
                  Every sound has a story. Find what's inside yours.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:items-end">
                <button
                  type="button"
                  onClick={() => setUploadOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-medium text-accent-ink shadow-lg shadow-accent/10 transition-all hover:-translate-y-0.5 hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                >
                  <Upload className="h-4 w-4" />
                  Upload audio
                </button>
                <p className="font-mono text-[11px] text-subtle">
                  WAV, MP3, FLAC, OGG, M4A, AAC · UP TO 50 MB
                </p>
              </div>
            </div>

            <LibrarySection
              items={visibleLibrary}
              total={libraryTotal}
              loading={loadingLibrary}
              error={libraryError}
              query={librarySearch}
              onQueryChange={setLibrarySearch}
              onRetry={() => void loadLibrary()}
              onLoadMore={() => void loadLibrary(visibleLibrary.length, true)}
              onUpload={() => setUploadOpen(true)}
            />
          </div>
        ) : (
          <ProfilePanel
            profile={profile}
            loading={loadingProfile}
            error={profileError}
            initials={initials}
            onRetry={() => void loadProfile()}
          />
        )}
      </main>

      <footer className="border-t border-line bg-showcase-footer">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 px-5 py-5 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span className="flex items-center gap-2 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            All systems in harmony
          </span>
          <p>Your sound. Your space. Only you can access your audio.</p>
          <span className="font-mono">HARMONIX / v.2.4</span>
        </div>
      </footer>

      {uploadOpen && (
        <AudioUploadModal
          fileInputRef={fileInputRef}
          selectedFile={visibleSelectedFile}
          uploadedAudio={visibleUploadedAudio}
          analysis={visibleAnalysis}
          bpm={bpm}
          musicalKey={musicalKey}
          uploadError={uploadError}
          analysisError={analysisError}
          isUploading={isUploading}
          isAnalyzing={isAnalyzing}
          onClose={() => setUploadOpen(false)}
          onFileChange={handleFileChange}
          onUpload={() => void handleUpload()}
          onAnalyse={() => void handleAnalyse()}
        />
      )}
    </div>
  );
}
