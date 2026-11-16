import {
  useCallback,
  useMemo,
  useState,
  type RefObject,
  type SyntheticEvent,
} from "react";

interface MediaPlayerState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
}

const INITIAL_STATE: MediaPlayerState = { currentTime: 0, duration: 0, isPlaying: false };

type MediaEvent = SyntheticEvent<HTMLMediaElement>;

/**
 * Tracks playback state of a media element and exposes transport controls.
 * Spread `mediaEvents` onto the <audio>/<video> element that `mediaRef` points to.
 */
export function useMediaPlayer(mediaRef: RefObject<HTMLMediaElement | null>) {
  const [state, setState] = useState<MediaPlayerState>(INITIAL_STATE);

  const mediaEvents = useMemo(() => {
    const syncTime = (event: MediaEvent) => {
      const time = event.currentTarget.currentTime;
      setState((current) => (current.currentTime === time ? current : { ...current, currentTime: time }));
    };
    const syncDuration = (event: MediaEvent) => {
      const value = event.currentTarget.duration;
      setState((current) => ({ ...current, duration: Number.isFinite(value) ? value : 0 }));
    };
    const setPlaying = (isPlaying: boolean) => () =>
      setState((current) => (current.isPlaying === isPlaying ? current : { ...current, isPlaying }));

    return {
      onLoadStart: () => setState(INITIAL_STATE),
      onLoadedMetadata: syncDuration,
      onDurationChange: syncDuration,
      onTimeUpdate: syncTime,
      onSeeked: syncTime,
      onPlay: setPlaying(true),
      onPause: setPlaying(false),
      onEnded: setPlaying(false),
    };
  }, []);

  const toggle = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    if (media.paused) {
      const result = media.play() as Promise<void> | undefined;
      result?.catch(() => setState((current) => ({ ...current, isPlaying: false })));
    } else {
      media.pause();
    }
  }, [mediaRef]);

  const pause = useCallback(() => {
    mediaRef.current?.pause();
  }, [mediaRef]);

  const seek = useCallback((time: number) => {
    const media = mediaRef.current;
    if (!media) return;
    const limit = Number.isFinite(media.duration) ? media.duration : time;
    const next = Math.min(Math.max(time, 0), limit);
    media.currentTime = next;
    setState((current) => ({ ...current, currentTime: next }));
  }, [mediaRef]);

  const skip = useCallback((delta: number) => {
    const media = mediaRef.current;
    if (media) seek(media.currentTime + delta);
  }, [mediaRef, seek]);

  const stop = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    media.pause();
    seek(0);
  }, [mediaRef, seek]);

  return { ...state, mediaEvents, toggle, pause, seek, skip, stop };
}

export type MediaPlayer = ReturnType<typeof useMediaPlayer>;
