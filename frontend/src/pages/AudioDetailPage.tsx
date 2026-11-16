import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, AudioLines, Download, LoaderCircle, Trash2 } from "lucide-react";

import { AppFooter } from "../components/AppFooter";
import { AnalysisRail } from "../components/audio/AnalysisRail";
import { AnalysisStatusIndicator } from "../components/audio/AnalysisStatusIndicator";
import { AudioDetailHeader } from "../components/audio/AudioDetailHeader";
import { FileInfoStrip } from "../components/audio/FileInfoStrip";
import { PitchShiftPanel } from "../components/audio/PitchShiftPanel";
import { PlaybackSpeedPanel } from "../components/audio/PlaybackSpeedPanel";
import { PlayerTransport } from "../components/audio/PlayerTransport";
import { StemMixerPlaceholder } from "../components/audio/StemMixerPlaceholder";
import { WaveformTimeline } from "../components/audio/WaveformTimeline";
import {
  ALERT_ACTION,
  ALERT_BOX,
  EYEBROW,
  FOCUS_RING,
  PAGE_CONTAINER,
  SECONDARY_BUTTON,
} from "../components/audio/styles";
import { useAuth } from "../contexts/AuthContext";
import { useMediaPlayer } from "../hooks/useMediaPlayer";
import { getInitials } from "../lib/format";
import { getExpectedKey } from "../lib/music";
import { api, ApiError, type AudioDetailResponse } from "../services/api";

type AudioWithPitchPreservation = HTMLAudioElement & {
  preservesPitch?: boolean;
  mozPreservesPitch?: boolean;
  webkitPreservesPitch?: boolean;
};

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
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const [semitones, setSemitones] = useState(0);
  const [isTransposing, setIsTransposing] = useState(false);
  const [transposeError, setTransposeError] = useState("");
  const [transposedPreview, setTransposedPreview] = useState<{
    audioId: string;
    semitones: number;
    url: string;
  } | null>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const transposedUrlRef = useRef<string | null>(null);
  const originalAudioRef = useRef<HTMLAudioElement | null>(null);
  const transposedAudioRef = useRef<HTMLAudioElement | null>(null);
  const isMountedRef = useRef(false);
  const originalPlayer = useMediaPlayer(originalAudioRef);
  const transposedPlayer = useMediaPlayer(transposedAudioRef);

  const applyPlaybackRate = useCallback((audioElement: HTMLAudioElement | null) => {
    if (!audioElement) return;

    audioElement.playbackRate = playbackRate;
    audioElement.defaultPlaybackRate = playbackRate;

    const audioWithPitchPreservation = audioElement as AudioWithPitchPreservation;
    if (typeof audioWithPitchPreservation.preservesPitch === "boolean") {
      audioWithPitchPreservation.preservesPitch = true;
    }
    if (typeof audioWithPitchPreservation.mozPreservesPitch === "boolean") {
      audioWithPitchPreservation.mozPreservesPitch = true;
    }
    if (typeof audioWithPitchPreservation.webkitPreservesPitch === "boolean") {
      audioWithPitchPreservation.webkitPreservesPitch = true;
    }
  }, [playbackRate]);

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

  useEffect(() => {
    applyPlaybackRate(originalAudioRef.current);
    applyPlaybackRate(transposedAudioRef.current);
  }, [applyPlaybackRate, playbackUrl, visibleTransposedPreview?.url]);

  useEffect(() => {
    const audioElement = originalAudioRef.current;
    if (!audioElement) return;
    audioElement.volume = volume;
    audioElement.muted = isMuted;
    audioElement.loop = isLooping;
  }, [volume, isMuted, isLooping, playbackUrl]);

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

  function handleToggleOriginal() {
    transposedPlayer.pause();
    originalPlayer.toggle();
  }

  function handleTogglePreview() {
    originalPlayer.pause();
    transposedPlayer.toggle();
  }

  function handleVolumeChange(nextVolume: number) {
    setVolume(nextVolume);
    setIsMuted(nextVolume === 0);
  }

  const metadata = (user?.user_metadata ?? {}) as { name?: string; full_name?: string };
  const displayName = metadata.name || metadata.full_name || user?.email || "Account";
  const displayEmail = user?.email ?? "";

  const playerDuration = originalPlayer.duration || visibleAudio?.duration || 0;
  const isPlayerDisabled = !playbackUrl;
  const playbackState = isLoadingPlayback
    ? "Preparing"
    : originalPlayer.isPlaying
      ? "Playing"
      : originalPlayer.currentTime > 0
        ? "Paused"
        : "Ready";

  const expectedKey = visibleAudio?.analysis?.musical_key
    ? getExpectedKey(visibleAudio.analysis.musical_key, visibleAudio.analysis.mode, semitones) ?? "Unavailable"
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-canvas font-sans leading-[1.5] text-ink">
      <AudioDetailHeader
        name={displayName}
        email={displayEmail}
        initials={getInitials(displayName)}
        signingOut={signingOut}
        onSignOut={() => void handleSignOut()}
      />

      <main className={`${PAGE_CONTAINER} flex-1 pb-14 pt-6 sm:pb-16 sm:pt-8`}>
        <nav aria-label="Breadcrumb">
          <ol className="m-0 flex list-none items-center gap-2 p-0 text-xs">
            <li>
              <Link
                to="/"
                className={`inline-flex items-center gap-2 rounded-sm text-muted no-underline transition-colors hover:text-accent ${FOCUS_RING}`}
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Library
              </Link>
            </li>
            <li className="text-wave-idle" aria-hidden="true">/</li>
            <li aria-current="page" className="text-ink">Audio detail</li>
          </ol>
        </nav>

        {signOutError && (
          <p role="alert" className={`${ALERT_BOX} mt-6`}>{signOutError}</p>
        )}

        {loading && (
          <div
            role="status"
            className="mt-8 flex items-center justify-center gap-3 rounded-xl border border-line bg-panel px-6 py-20 text-sm text-muted"
          >
            <LoaderCircle className="h-4 w-4 animate-spin text-accent" aria-hidden="true" />
            Loading audio details...
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-8 flex flex-col items-center gap-4 rounded-xl border border-line bg-panel px-6 py-16 text-center"
          >
            <p className="m-0 text-sm text-danger">{error}</p>
            {error !== "Audio file not found." ? (
              <button
                type="button"
                onClick={() => void loadAudio()}
                className={`${SECONDARY_BUTTON} px-4 py-2 text-sm`}
              >
                Retry
              </button>
            ) : (
              <Link to="/" className={`${SECONDARY_BUTTON} px-4 py-2 text-sm no-underline`}>
                Back to library
              </Link>
            )}
          </div>
        )}

        {!loading && visibleAudio && (
          <div className="mt-6 flex flex-col gap-6 sm:mt-7">
            <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <h1
                className="m-0 min-w-0 break-words text-[28px] font-normal leading-[1.15] tracking-[-0.035em] text-ink sm:text-[38px]"
                title={visibleAudio.original_filename}
              >
                {visibleAudio.original_filename}
              </h1>

              <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-3">
                <AnalysisStatusIndicator status={visibleAudio.analysis_status} isAnalyzing={isAnalyzing} />
                <div className="flex flex-1 flex-wrap items-center gap-3 sm:flex-none sm:gap-5">
                  <button
                    type="button"
                    onClick={() => void handleDownload()}
                    disabled={isDownloading}
                    className={`${SECONDARY_BUTTON} h-11 flex-1 px-5 text-[13px] font-semibold sm:flex-none`}
                  >
                    {isDownloading ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Download className="h-4 w-4 text-muted" aria-hidden="true" />
                    )}
                    {isDownloading ? "Preparing..." : "Download original"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    disabled={isDeleting || isAnalyzing}
                    className={`inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-5 text-[13px] font-semibold text-danger transition-colors hover:border-danger/50 hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none ${FOCUS_RING}`}
                  >
                    {isDeleting ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    )}
                    {isDeleting ? "Deleting..." : "Delete audio"}
                  </button>
                </div>
              </div>
            </header>

            {deleteError && (
              <div role="alert" className={ALERT_BOX}>
                <p className="m-0">{deleteError}</p>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={isDeleting || isAnalyzing}
                  className={ALERT_ACTION}
                >
                  Retry delete
                </button>
              </div>
            )}

            <section
              aria-labelledby="original-track-heading"
              className="overflow-hidden rounded-xl border border-line bg-panel"
            >
              <div className="grid lg:grid-cols-[minmax(0,1fr)_322px]">
                <div className="flex min-w-0 flex-col gap-5 p-5 sm:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <h2 id="original-track-heading" className={EYEBROW}>
                      Original track
                    </h2>
                    <span
                      className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] ${
                        originalPlayer.isPlaying ? "text-accent" : "text-subtle"
                      }`}
                    >
                      <AudioLines
                        className={`h-3.5 w-3.5 ${originalPlayer.isPlaying ? "animate-pulse" : ""}`}
                        aria-hidden="true"
                      />
                      {playbackState}
                    </span>
                  </div>

                  {isLoadingPlayback && <p role="status" className="sr-only">Preparing audio...</p>}

                  <WaveformTimeline
                    seed={visibleAudio.id}
                    trackName={visibleAudio.original_filename}
                    currentTime={originalPlayer.currentTime}
                    duration={playerDuration}
                    disabled={isPlayerDisabled}
                    onSeek={originalPlayer.seek}
                  />

                  <PlayerTransport
                    trackName={visibleAudio.original_filename}
                    disabled={isPlayerDisabled}
                    isPlaying={originalPlayer.isPlaying}
                    currentTime={originalPlayer.currentTime}
                    duration={playerDuration}
                    isLooping={isLooping}
                    volume={volume}
                    isMuted={isMuted}
                    onTogglePlay={handleToggleOriginal}
                    onStop={originalPlayer.stop}
                    onSkip={originalPlayer.skip}
                    onToggleLoop={() => setIsLooping((value) => !value)}
                    onToggleMute={() => setIsMuted((value) => !value)}
                    onVolumeChange={handleVolumeChange}
                  />

                  {playbackError && (
                    <div role="alert" className={ALERT_BOX}>
                      <p className="m-0">{playbackError}</p>
                      <button
                        type="button"
                        onClick={() => void refreshPlaybackUrl(visibleAudio.id)}
                        disabled={isLoadingPlayback}
                        className={ALERT_ACTION}
                      >
                        Refresh playback
                      </button>
                    </div>
                  )}

                  {playbackUrl && (
                    <audio
                      ref={originalAudioRef}
                      className="hidden"
                      preload="metadata"
                      src={playbackUrl}
                      {...originalPlayer.mediaEvents}
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
                </div>

                <AnalysisRail
                  audio={visibleAudio}
                  isAnalyzing={isAnalyzing}
                  analysisError={analysisError}
                  onAnalyse={() => void handleAnalyse()}
                />
              </div>

              <FileInfoStrip audio={visibleAudio} />
            </section>

            <section aria-labelledby="sound-shaping-heading" className="flex flex-col gap-4 pt-2">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                <h2
                  id="sound-shaping-heading"
                  className="m-0 text-[21px] font-normal tracking-[-0.02em] text-ink"
                >
                  Make it your own
                </h2>
                <p className="m-0 text-[11px] text-subtle">
                  Explore freely. Your original audio stays untouched.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-[minmax(0,400fr)_minmax(0,400fr)_minmax(0,504fr)]">
                <PitchShiftPanel
                  semitones={semitones}
                  onSemitonesChange={setSemitones}
                  expectedKey={expectedKey}
                  isTransposing={isTransposing}
                  transposeError={transposeError}
                  onTranspose={() => void handleTranspose()}
                  preview={visibleTransposedPreview}
                  previewPlayer={transposedPlayer}
                  onTogglePreview={handleTogglePreview}
                  onDownloadPreview={handleDownloadTransposed}
                />
                <PlaybackSpeedPanel
                  playbackRate={playbackRate}
                  onPlaybackRateChange={setPlaybackRate}
                />
                <StemMixerPlaceholder className="md:col-span-2 xl:col-span-1" />
              </div>

              {visibleTransposedPreview && (
                <audio
                  ref={transposedAudioRef}
                  className="hidden"
                  preload="metadata"
                  src={visibleTransposedPreview.url}
                  {...transposedPlayer.mediaEvents}
                  aria-label="Play transposed preview"
                >
                  Your browser does not support audio playback.
                </audio>
              )}
            </section>
          </div>
        )}
      </main>

      <AppFooter containerClassName="max-w-[1440px] px-5 sm:px-8 xl:px-12" />
    </div>
  );
}
