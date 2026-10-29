import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AudioDetailPage from "./AudioDetailPage";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../services/api", () => ({
  api: {
    getAudio: vi.fn(),
    getAudioAccessUrl: vi.fn(),
    analyseStoredAudio: vi.fn(),
    deleteAudio: vi.fn(),
    transposeAudio: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.name = "ApiError";
      this.status = status;
    }
  },
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedApi = vi.mocked(api);

function renderAudioDetail() {
  render(
    <MemoryRouter initialEntries={["/audio/track-123"]}>
      <Routes>
        <Route path="/audio/:audioId" element={<AudioDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AudioDetailPage playback rate", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedUseAuth.mockReturnValue({
      session: null,
      user: { id: "user-123", email: "listener@example.com" } as never,
      loading: false,
      signOut: vi.fn().mockResolvedValue(undefined),
    });

    mockedApi.getAudio.mockResolvedValue({
      id: "track-123",
      user_id: "user-123",
      parent_audio_id: null,
      original_filename: "track.wav",
      file_format: "wav",
      file_size_bytes: 1024,
      duration: 180,
      sample_rate: 44100,
      channels: 2,
      status: "UPLOADED",
      created_at: "2025-01-01T00:00:00Z",
      analysis_status: "COMPLETED",
      bpm: 120,
      musical_key: "C",
      mode: "major",
      analysis: {
        status: "COMPLETED",
        analysis_version: "v1",
        created_at: "2025-01-01T00:00:00Z",
        bpm: 120,
        musical_key: "C",
        mode: "major",
        error_message: null,
        results: null,
      },
    });

    mockedApi.getAudioAccessUrl.mockResolvedValue({
      url: "https://example.com/audio.wav",
      expires_in: 900,
    });

    mockedApi.transposeAudio.mockResolvedValue(new Blob(["audio"], { type: "audio/wav" }));
  });

  it("defaults to 1× and keeps the current rate in sync with the audio element", async () => {
    renderAudioDetail();

    await waitFor(() => expect(mockedApi.getAudio).toHaveBeenCalledWith("track-123"));
    await waitFor(() => expect(mockedApi.getAudioAccessUrl).toHaveBeenCalledWith("track-123", "inline"));

    const slider = screen.getByRole("slider", { name: /playback speed in multiples of normal speed/i }) as HTMLInputElement;
    const originalAudio = screen.getByLabelText("Play track.wav") as HTMLMediaElement;

    expect(slider.value).toBe("1");
    expect(originalAudio.playbackRate).toBe(1);
    expect(document.querySelector('span[aria-live="polite"]')?.textContent).toBe("1×");
  });

  it("updates the current playback rate when a quick-select option is chosen", async () => {
    renderAudioDetail();

    await waitFor(() => expect(mockedApi.getAudio).toHaveBeenCalledWith("track-123"));
    await waitFor(() => expect(mockedApi.getAudioAccessUrl).toHaveBeenCalledWith("track-123", "inline"));

    const slider = screen.getByRole("slider", { name: /playback speed in multiples of normal speed/i }) as HTMLInputElement;
    const originalAudio = screen.getByLabelText("Play track.wav") as HTMLMediaElement;

    fireEvent.click(screen.getByRole("button", { name: /set playback speed to 1.5×/i }));

    await waitFor(() => expect(slider.value).toBe("1.5"));
    expect(originalAudio.playbackRate).toBe(1.5);
  });

  it("applies the slider-selected rate immediately and respects min/max limits", async () => {
    renderAudioDetail();

    await waitFor(() => expect(mockedApi.getAudio).toHaveBeenCalledWith("track-123"));
    await waitFor(() => expect(mockedApi.getAudioAccessUrl).toHaveBeenCalledWith("track-123", "inline"));

    const slider = screen.getByRole("slider", { name: /playback speed in multiples of normal speed/i }) as HTMLInputElement;
    const originalAudio = screen.getByLabelText("Play track.wav") as HTMLMediaElement;

    fireEvent.change(slider, { target: { value: "0.25" } });
    expect(originalAudio.playbackRate).toBe(0.25);

    fireEvent.change(slider, { target: { value: "2" } });
    expect(originalAudio.playbackRate).toBe(2);
    expect(slider.max).toBe("2");
    expect(slider.min).toBe("0.25");
  });

  it("resets to the default speed without restarting playback", async () => {
    renderAudioDetail();

    await waitFor(() => expect(mockedApi.getAudio).toHaveBeenCalledWith("track-123"));
    await waitFor(() => expect(mockedApi.getAudioAccessUrl).toHaveBeenCalledWith("track-123", "inline"));

    const slider = screen.getByRole("slider", { name: /playback speed in multiples of normal speed/i }) as HTMLInputElement;
    const originalAudio = screen.getByLabelText("Play track.wav") as HTMLMediaElement;

    originalAudio.currentTime = 42;
    fireEvent.change(slider, { target: { value: "1.5" } });
    expect(originalAudio.currentTime).toBe(42);

    fireEvent.click(screen.getByRole("button", { name: /reset playback speed to default/i }));
    expect(slider.value).toBe("1");
    expect(originalAudio.playbackRate).toBe(1);
    expect(originalAudio.currentTime).toBe(42);
  });

  it("keeps the selected rate on the transposed preview when a new audio source is used", async () => {
    renderAudioDetail();

    await waitFor(() => expect(mockedApi.getAudio).toHaveBeenCalledWith("track-123"));
    await waitFor(() => expect(mockedApi.getAudioAccessUrl).toHaveBeenCalledWith("track-123", "inline"));

    const slider = screen.getByRole("slider", { name: /playback speed in multiples of normal speed/i }) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "1.5" } });

    fireEvent.change(screen.getByLabelText(/pitch shift in semitones/i), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /transpose/i }));

    await waitFor(() => expect(mockedApi.transposeAudio).toHaveBeenCalledWith("track-123", 2));

    const transposedAudio = await screen.findByLabelText("Play transposed preview");
    expect((transposedAudio as HTMLMediaElement).playbackRate).toBe(1.5);
  });

  it("does not crash when browser pitch-preservation properties are unsupported", async () => {
    renderAudioDetail();

    await waitFor(() => expect(mockedApi.getAudio).toHaveBeenCalledWith("track-123"));
    await waitFor(() => expect(mockedApi.getAudioAccessUrl).toHaveBeenCalledWith("track-123", "inline"));

    const originalAudio = screen.getByLabelText("Play track.wav") as HTMLMediaElement;
    const slider = screen.getByRole("slider", { name: /playback speed in multiples of normal speed/i }) as HTMLInputElement;

    delete (originalAudio as Partial<{ preservesPitch: boolean }>).preservesPitch;
    delete (originalAudio as Partial<{ mozPreservesPitch: boolean }>).mozPreservesPitch;
    delete (originalAudio as Partial<{ webkitPreservesPitch: boolean }>).webkitPreservesPitch;

    expect(() => fireEvent.change(slider, { target: { value: "1.25" } })).not.toThrow();
    expect(originalAudio.playbackRate).toBe(1.25);
  });
});
