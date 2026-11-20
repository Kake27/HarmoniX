import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { useMediaPlayer } from "./useMediaPlayer";

function MediaPlayerProbe() {
  const mediaRef = useRef<HTMLMediaElement>(null);
  const player = useMediaPlayer(mediaRef);

  return (
    <div>
      <audio ref={mediaRef} aria-label="test audio" {...player.mediaEvents} />
      <output data-testid="state">
        {`${player.currentTime}|${player.duration}|${player.isPlaying}`}
      </output>
      <button type="button" onClick={player.toggle}>Toggle</button>
      <button type="button" onClick={() => player.seek(200)}>Seek past end</button>
      <button type="button" onClick={() => player.seek(-5)}>Seek before start</button>
      <button type="button" onClick={() => player.skip(10)}>Skip forward</button>
      <button type="button" onClick={player.stop}>Stop</button>
    </div>
  );
}

function audioElement(): HTMLMediaElement {
  return screen.getByLabelText("test audio") as HTMLMediaElement;
}

describe("useMediaPlayer", () => {
  it("tracks metadata, time updates, and play/pause/end events", () => {
    render(<MediaPlayerProbe />);
    const audio = audioElement();
    Object.defineProperty(audio, "duration", { configurable: true, value: 120 });
    Object.defineProperty(audio, "currentTime", {
      configurable: true,
      writable: true,
      value: 35,
    });

    fireEvent.loadedMetadata(audio);
    expect(screen.getByTestId("state")).toHaveTextContent("0|120|false");

    fireEvent.timeUpdate(audio);
    expect(screen.getByTestId("state")).toHaveTextContent("35|120|false");

    fireEvent.play(audio);
    expect(screen.getByTestId("state")).toHaveTextContent("35|120|true");
    fireEvent.pause(audio);
    expect(screen.getByTestId("state")).toHaveTextContent("35|120|false");
    fireEvent.play(audio);
    fireEvent.ended(audio);
    expect(screen.getByTestId("state")).toHaveTextContent("35|120|false");
  });

  it("clamps seeks and skips to the known duration", () => {
    render(<MediaPlayerProbe />);
    const audio = audioElement();
    Object.defineProperty(audio, "duration", { configurable: true, value: 120 });
    Object.defineProperty(audio, "currentTime", {
      configurable: true,
      writable: true,
      value: 35,
    });

    fireEvent.click(screen.getByRole("button", { name: "Seek past end" }));
    expect(audio.currentTime).toBe(120);
    fireEvent.click(screen.getByRole("button", { name: "Seek before start" }));
    expect(audio.currentTime).toBe(0);

    audio.currentTime = 115;
    fireEvent.click(screen.getByRole("button", { name: "Skip forward" }));
    expect(audio.currentTime).toBe(120);
  });

  it("uses the requested seek position when duration is unknown", () => {
    render(<MediaPlayerProbe />);
    const audio = audioElement();
    Object.defineProperty(audio, "duration", {
      configurable: true,
      value: Number.POSITIVE_INFINITY,
    });
    Object.defineProperty(audio, "currentTime", {
      configurable: true,
      writable: true,
      value: 0,
    });

    fireEvent.click(screen.getByRole("button", { name: "Seek past end" }));

    expect(audio.currentTime).toBe(200);
  });

  it("plays and pauses the current media element from its paused state", () => {
    render(<MediaPlayerProbe />);
    const audio = audioElement();
    Object.defineProperty(audio, "paused", {
      configurable: true,
      writable: true,
      value: true,
    });
    audio.play = vi.fn().mockResolvedValue(undefined);
    audio.pause = vi.fn();

    fireEvent.click(screen.getByRole("button", { name: "Toggle" }));
    expect(audio.play).toHaveBeenCalledOnce();

    Object.defineProperty(audio, "paused", {
      configurable: true,
      writable: true,
      value: false,
    });
    fireEvent.click(screen.getByRole("button", { name: "Toggle" }));
    expect(audio.pause).toHaveBeenCalledOnce();
  });

  it("does not leave the UI playing when the browser rejects play()", async () => {
    render(<MediaPlayerProbe />);
    const audio = audioElement();
    Object.defineProperty(audio, "paused", {
      configurable: true,
      value: true,
    });
    audio.play = vi.fn().mockRejectedValue(new Error("autoplay blocked"));

    fireEvent.play(audio);
    expect(screen.getByTestId("state")).toHaveTextContent("true");
    fireEvent.click(screen.getByRole("button", { name: "Toggle" }));

    await waitFor(() => {
      expect(screen.getByTestId("state")).toHaveTextContent("false");
    });
  });

  it("resets playback state on a new media load and stops at time zero", () => {
    render(<MediaPlayerProbe />);
    const audio = audioElement();
    Object.defineProperty(audio, "duration", { configurable: true, value: 120 });
    Object.defineProperty(audio, "currentTime", {
      configurable: true,
      writable: true,
      value: 30,
    });
    audio.pause = vi.fn();

    fireEvent.loadedMetadata(audio);
    fireEvent.timeUpdate(audio);
    fireEvent.play(audio);
    fireEvent.loadStart(audio);
    expect(screen.getByTestId("state")).toHaveTextContent("0|0|false");

    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(audio.pause).toHaveBeenCalledOnce();
    expect(audio.currentTime).toBe(0);
    expect(screen.getByTestId("state")).toHaveTextContent("0|0|false");
  });

  it("reports invalid or unavailable media durations as zero", () => {
    render(<MediaPlayerProbe />);
    const audio = audioElement();
    Object.defineProperty(audio, "duration", {
      configurable: true,
      value: Number.NaN,
    });

    fireEvent.durationChange(audio);

    expect(screen.getByTestId("state")).toHaveTextContent("0|0|false");
  });
});
