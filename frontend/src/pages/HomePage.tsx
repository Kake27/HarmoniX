import { useRef, useState, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api, ApiError, type AudioLibraryItem, type UserProfile, type AnalysisResponse, type UploadedAudio } from "../services/api";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".wav", ".mp3", ".flac", ".ogg", ".m4a", ".aac"];

function formatDuration(seconds: number | null) { if (seconds === null) return "—"; return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`; }
function formatFileSize(bytes: number) { return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(2)} MB`; }
const WAVEFORMS = ["3,9,5,13,7,17,10,22,8,15,6,19,11,25,9,18,6,14,8,20,12,16,7,12,5,15,8,11", "6,14,8,19,10,23,7,16,12,21,8,25,11,18,7,15,10,22,8,14,6,19,11,17,8,13,5,10", "5,11,7,16,9,20,6,14,8,18,12,23,8,15,6,12,10,19,7,16,5,13,8,18,6,12,4,9", "8,17,6,13,10,22,7,18,12,25,8,16,10,20,6,14,9,18,5,12,8,22,7,15,10,17,6,11", "4,9,6,14,8,18,11,21,7,15,10,24,8,19,6,13,9,17,5,11,8,16,6,12,4,10,7,13", "7,13,5,18,9,24,6,15,11,20,8,17,6,22,10,14,7,19,5,12,9,18,6,15,8,11,5,9"];
function Waveform({ index, active = false }: { index: number; active?: boolean }) { return <div className={`waveform ${active ? "waveform-active" : ""}`} aria-label="Decorative waveform">{WAVEFORMS[index % WAVEFORMS.length].split(",").map((height, i) => <span key={i} style={{ height: `${height}px` }} />)}</div>; }
function Icon({ children }: { children: React.ReactNode }) { return <span className="icon" aria-hidden="true">{children}</span>; }

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
  const [activeTab, setActiveTab] = useState<"library" | "profile">("library");
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState("all");
  const [sortNewest, setSortNewest] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileOwnerId, setSelectedFileOwnerId] = useState<string | null>(null);
  const [uploadedAudio, setUploadedAudio] = useState<UploadedAudio | null>(null);
  const [uploadedAudioOwnerId, setUploadedAudioOwnerId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  const loadProfile = useCallback(async () => { if (!user?.id) { setProfile(null); setLoadingProfile(false); return; } setLoadingProfile(true); setProfileError(""); try { setProfile(await api.getMyProfile()); } catch (error: unknown) { if (error instanceof ApiError && error.status === 401) { await signOut(); navigate("/login", { replace: true }); return; } setProfileError(error instanceof Error ? error.message : "Could not load your profile."); } finally { setLoadingProfile(false); } }, [navigate, signOut, user?.id]);
  const loadLibrary = useCallback(async (offset = 0, append = false) => { const ownerId = user?.id; if (!ownerId) { setLibrary([]); setLibraryOwnerId(null); setLibraryTotal(0); setLoadingLibrary(false); return; } setLoadingLibrary(true); setLibraryError(""); try { const result = await api.listAudio(20, offset); setLibrary(current => append ? [...current, ...result.items] : result.items); setLibraryOwnerId(ownerId); setLibraryTotal(result.total); } catch (error: unknown) { if (error instanceof ApiError && error.status === 401) { await signOut(); navigate("/login", { replace: true }); return; } setLibraryError(error instanceof Error ? error.message : "Could not load your library."); } finally { setLoadingLibrary(false); } }, [navigate, signOut, user?.id]);
  useEffect(() => { void loadProfile(); }, [loadProfile]);
  useEffect(() => { void loadLibrary(); }, [loadLibrary]);

  async function handleSignOut() { setSigningOut(true); try { await signOut(); navigate("/login", { replace: true }); } catch { setProfileError("Could not sign out. Please try again."); } finally { setSigningOut(false); } }
  function handleFileChange(file?: File) { setUploadError(""); setAnalysisError(""); setAnalysis(null); setUploadedAudio(null); if (!file) { setSelectedFile(null); setSelectedFileOwnerId(null); return; } const extension = `.${file.name.split(".").pop()?.toLowerCase()}`; if (!ALLOWED_EXTENSIONS.includes(extension) || file.size === 0 || file.size > MAX_FILE_SIZE) { setSelectedFile(null); setSelectedFileOwnerId(null); setAnalysisError(file.size > MAX_FILE_SIZE ? "The file exceeds the 50 MB upload limit." : "Unsupported or empty audio file."); if (fileInputRef.current) fileInputRef.current.value = ""; return; } setSelectedFile(file); setSelectedFileOwnerId(user?.id ?? null); }
  async function handleUpload() { if (!selectedFile || selectedFileOwnerId !== user?.id || isUploading || isAnalyzing) return; setIsUploading(true); setUploadError(""); try { const result = await api.uploadAudio(selectedFile); setUploadedAudio(result); setUploadedAudioOwnerId(user?.id ?? null); await loadLibrary(); } catch (error: unknown) { setUploadError(error instanceof Error ? error.message : "Could not upload this file."); } finally { setIsUploading(false); } }
  async function handleAnalyse() { if (!uploadedAudio || uploadedAudioOwnerId !== user?.id || isAnalyzing || isUploading) return; setIsAnalyzing(true); setAnalysisError(""); try { const result = await api.analyseStoredAudio(uploadedAudio.id); setAnalysis(result); void loadLibrary(); } catch (error: unknown) { setAnalysisError(error instanceof Error ? error.message : "Could not analyse this file."); } finally { setIsAnalyzing(false); } }

  const visibleLibrary = libraryOwnerId === user?.id ? library : [];
  const filteredLibrary = visibleLibrary.filter(track => track.original_filename.toLowerCase().includes(query.toLowerCase()) && (formatFilter === "all" || track.file_format.toLowerCase() === formatFilter)).sort((a, b) => sortNewest ? +new Date(b.created_at) - +new Date(a.created_at) : +new Date(a.created_at) - +new Date(b.created_at));
  const displayName = profile?.name || user?.email?.split("@")[0] || "there";
  const initials = displayName.slice(0, 2).toUpperCase();

  return <main className="app-shell">
    <header className="topbar">
      <Link to="/" className="brand"><span className="brand-mark"><i /><i /><i /><i /></span><span>Harmonix</span></Link>
      <nav className="main-nav" aria-label="Main navigation"><button className={activeTab === "library" ? "nav-link active" : "nav-link"} onClick={() => setActiveTab("library")}><Icon>∥</Icon>Library</button><button className={activeTab === "profile" ? "nav-link active" : "nav-link"} onClick={() => setActiveTab("profile")}><Icon>♙</Icon>Profile</button></nav>
      <div className="top-actions"><button className="help-button" aria-label="Help">?</button><span className="top-divider" /><div className="account-wrap"><button className="account-button" onClick={() => setMenuOpen(value => !value)} aria-expanded={menuOpen}><span className="avatar">{initials}</span><span className="account-name">{displayName}</span><span className="chevron">⌄</span></button>{menuOpen && <div className="account-menu"><button onClick={() => void handleSignOut()} disabled={signingOut}>{signingOut ? "Signing out..." : "Log out"}</button></div>}</div></div>
    </header>

    {activeTab === "profile" ? <section className="profile-page"><p className="eyebrow">ACCOUNT</p><h1>Your profile</h1><p className="lede">Your Harmonix account details.</p><div className="profile-card">{loadingProfile ? <p>Loading profile...</p> : profileError ? <p className="error-text">{profileError}</p> : profile && <><div className="profile-hero"><span className="profile-avatar">{initials}</span><div><h2>{profile.name || "Name not set"}</h2><p>{profile.email}</p></div></div><dl className="profile-details"><div><dt>User ID</dt><dd>{profile.id}</dd></div><div><dt>Name</dt><dd>{profile.name || "Not set"}</dd></div><div><dt>Email</dt><dd>{profile.email}</dd></div><div><dt>Member since</dt><dd>{new Date(profile.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</dd></div></dl></>}</div></section> : <>
      <section className="library-hero"><div><p className="eyebrow">YOUR PERSONAL SOUNDSPACE</p><h1>Good evening, {displayName}.</h1><p className="lede">Every sound has a story. Find what&apos;s inside yours.</p></div><div className="upload-actions"><button className="primary-button" onClick={() => fileInputRef.current?.click()}><Icon>↥</Icon>Upload audio</button><button className="secondary-button" onClick={() => fileInputRef.current?.click()}><Icon>♩</Icon>Record</button><small>WAV, MP3, FLAC, AIFF · UP TO 50 MB</small><input ref={fileInputRef} hidden type="file" accept=".wav,.mp3,.flac,.ogg,.m4a,.aac,audio/*" onChange={event => handleFileChange(event.target.files?.[0])} /></div></section>
      {selectedFile && <section className="upload-strip"><strong>{selectedFile.name}</strong><span>{formatFileSize(selectedFile.size)}</span><button onClick={() => void handleUpload()} disabled={isUploading}>{isUploading ? "Uploading..." : "Upload"}</button>{uploadedAudio && <button onClick={() => void handleAnalyse()} disabled={isAnalyzing}>{isAnalyzing ? "Analyzing..." : "Analyze"}</button>}<span>{analysis ? "Analysis complete." : uploadError || analysisError}</span></section>}
      {analysis && <section className="analysis-panel" aria-live="polite"><strong>Analysis results</strong><span>{analysis.filename}</span><span>{formatDuration(analysis.duration_seconds)}</span><span>{analysis.sample_rate.toLocaleString()} Hz</span></section>}
      <section className="library-section"><div className="section-heading"><div><h2>Your library <span>{libraryTotal}</span></h2><p>{loadingLibrary ? "Loading your audio..." : `${visibleLibrary.length} audio files`}</p></div><div className="filters"><label className="search"><Icon>⌕</Icon><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search your audio..." aria-label="Search your audio" /></label><select value={formatFilter} onChange={event => setFormatFilter(event.target.value)} aria-label="Filter formats"><option value="all">All formats</option>{[...new Set(visibleLibrary.map(track => track.file_format.toLowerCase()))].map(format => <option key={format} value={format}>{format.toUpperCase()}</option>)}</select><button className="sort-button" onClick={() => setSortNewest(value => !value)}>☷ {sortNewest ? "Newest first" : "Oldest first"}</button></div></div>
        {libraryError && <div className="notice error-text">{libraryError} <button onClick={() => void loadLibrary()}>Retry</button></div>}
        {!loadingLibrary && !libraryError && filteredLibrary.length === 0 && <div className="empty-state">Your library is empty. Upload a track to get started.</div>}
        {filteredLibrary.length > 0 && <div className="table-wrap"><div className="audio-table table-header"><span>FILE NAME</span><span>WAVEFORM</span><span>DURATION</span><span>BPM</span><span>KEY</span><span>STATUS</span><span>UPLOADED</span><span /></div>{filteredLibrary.map((track, index) => <div className={`audio-table audio-row ${index === 0 ? "featured" : ""}`} key={track.id}><span className="file-cell"><span className="play-button">▷</span><Link to={`/audio/${track.id}`}>{track.original_filename}</Link><small>{track.file_format.toUpperCase()} · {formatFileSize(track.file_size_bytes)}</small></span><Waveform index={index} active={index === 0} /><span>{formatDuration(track.duration)}</span><span>{track.bpm?.toFixed(0) ?? "—"}</span><span>{track.musical_key ? `${track.musical_key}${track.mode ? ` ${track.mode}` : ""}` : "—"}</span><span className={`status status-${track.analysis_status.toLowerCase()}`}><i />{track.analysis_status === "PROCESSING" ? "Analyzing" : track.analysis_status === "PENDING" ? "Queued" : "Analyzed"}</span><span>{new Date(track.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span><button className="more-button" aria-label={`More options for ${track.original_filename}`}>•••</button></div>)}</div>}
        {visibleLibrary.length < libraryTotal && <button className="load-more" onClick={() => void loadLibrary(visibleLibrary.length, true)} disabled={loadingLibrary}>{loadingLibrary ? "Loading..." : "Load more"}</button>}
      </section>
    </>}
    <footer><span><b>●</b> All systems in harmony</span><span>Your sound. Your space. Only you can access your audio.</span><span>HARMONIX / v.2.4</span></footer>
  </main>;
}
