import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AudioDetailPage from "./AudioDetailPage";
import { api, ApiError } from "../services/api";
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

afterEach(() => {
  vi.restoreAllMocks();
});

function audioResponse(
  overrides: Partial<Awaited<ReturnType<typeof api.getAudio>>> = {},
) {
  return {
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
    analysis_status: "COMPLETED" as const,
    bpm: 120,
    musical_key: "C",
    mode: "major",
    analysis: {
      status: "COMPLETED" as const,
      analysis_version: "v1",
      created_at: "2025-01-01T00:00:00Z",
      bpm: 120,
      musical_key: "C",
      mode: "major",
      error_message: null,
      results: null,
    },
    ...overrides,
  };
}

function renderAudioDetail() {
  return render(
    <MemoryRouter initialEntries={["/audio/track-123"]}>
      <Routes>
        <Route path="/audio/:audioId" element={<AudioDetailPage />} />
        <Route path="/" element={<p>Library destination</p>} />
        <Route path="/login" element={<p>Login destination</p>} />
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

    mockedApi.getAudio.mockResolvedValue(audioResponse());

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

  it("disables transposition at zero semitones and shows the expected key when shifted", async () => {
    renderAudioDetail();
    await screen.findByText("track.wav");

    expect(screen.getByRole("button", { name: "Transpose" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Shift up one semitone" }));

    expect(screen.getByLabelText(/pitch shift in semitones/i)).toHaveAttribute(
      "aria-valuetext",
      "+1 semitone",
    );
    expect(screen.getByText("C♯ major")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Transpose" })).toBeEnabled();
    expect(mockedApi.transposeAudio).not.toHaveBeenCalled();
  });

  it("shows a transpose error and allows retrying the same selected shift", async () => {
    mockedApi.transposeAudio
      .mockRejectedValueOnce(new Error("worker unavailable"))
      .mockResolvedValueOnce(new Blob(["preview"], { type: "audio/wav" }));
    renderAudioDetail();
    await screen.findByText("track.wav");

    fireEvent.change(screen.getByLabelText(/pitch shift in semitones/i), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Transpose" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("worker unavailable");

    fireEvent.click(screen.getByRole("button", { name: "Retry transpose" }));

    expect(await screen.findByLabelText("Play transposed preview")).toBeInTheDocument();
    expect(mockedApi.transposeAudio).toHaveBeenNthCalledWith(2, "track-123", 2);
  });

  it("revokes replaced preview URLs and revokes the active URL on unmount", async () => {
    vi.mocked(URL.createObjectURL)
      .mockReturnValueOnce("blob:first-preview")
      .mockReturnValueOnce("blob:second-preview");
    const { unmount } = renderAudioDetail();
    await screen.findByText("track.wav");
    fireEvent.change(screen.getByLabelText(/pitch shift in semitones/i), {
      target: { value: "-2" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Transpose" }));
    await screen.findByLabelText("Play transposed preview");
    expect(screen.getByLabelText("Play transposed preview")).toHaveAttribute(
      "src",
      "blob:first-preview",
    );

    fireEvent.click(screen.getByRole("button", { name: "Transpose" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Play transposed preview")).toHaveAttribute(
        "src",
        "blob:second-preview",
      );
    });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:first-preview");

    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:second-preview");
  });

  it("revokes a generated preview if its request resolves after the page unmounts", async () => {
    let finishTranspose!: (blob: Blob) => void;
    mockedApi.transposeAudio.mockReturnValue(
      new Promise((resolve) => {
        finishTranspose = resolve;
      }),
    );
    const { unmount } = renderAudioDetail();
    await screen.findByText("track.wav");
    fireEvent.change(screen.getByLabelText(/pitch shift in semitones/i), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Transpose" }));
    await waitFor(() => expect(mockedApi.transposeAudio).toHaveBeenCalledOnce());

    unmount();
    await act(async () => {
      finishTranspose(new Blob(["late preview"]));
    });

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-audio-preview");
  });

  it("downloads a transposed preview with a shift-specific filename", async () => {
    const clicks: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicks.push(this);
    });
    renderAudioDetail();
    await screen.findByText("track.wav");
    fireEvent.change(screen.getByLabelText(/pitch shift in semitones/i), {
      target: { value: "-3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Transpose" }));
    await screen.findByLabelText("Play transposed preview");

    fireEvent.click(screen.getByRole("button", { name: "Download transposed audio" }));

    expect(clicks).toHaveLength(1);
    expect(clicks[0].download).toBe("track-transpose-minus-3.wav");
    expect(clicks[0].href).toBe("blob:mock-audio-preview");
  });

  it("does not delete audio when confirmation is cancelled and navigates after success", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderAudioDetail();
    await screen.findByText("track.wav");

    fireEvent.click(screen.getByRole("button", { name: "Delete audio" }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(mockedApi.deleteAudio).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    mockedApi.deleteAudio.mockResolvedValue(undefined);
    fireEvent.click(screen.getByRole("button", { name: "Delete audio" }));

    expect(await screen.findByText("Library destination")).toBeInTheDocument();
    expect(mockedApi.deleteAudio).toHaveBeenCalledWith("track-123");
  });

  it("shows a delete error and retries the delete action", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockedApi.deleteAudio
      .mockRejectedValueOnce(new Error("storage cleanup failed"))
      .mockResolvedValueOnce(undefined);
    renderAudioDetail();
    await screen.findByText("track.wav");

    fireEvent.click(screen.getByRole("button", { name: "Delete audio" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "storage cleanup failed",
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry delete" }));

    expect(await screen.findByText("Library destination")).toBeInTheDocument();
    expect(mockedApi.deleteAudio).toHaveBeenCalledTimes(2);
  });

  it("retries playback URL failures and handles expired media sources", async () => {
    mockedApi.getAudioAccessUrl
      .mockRejectedValueOnce(new Error("signed URL unavailable"))
      .mockResolvedValueOnce({ url: "https://example.com/audio.wav", expires_in: 900 });
    renderAudioDetail();
    await screen.findByText("signed URL unavailable");

    fireEvent.click(screen.getByRole("button", { name: "Refresh playback" }));
    const originalAudio = await screen.findByLabelText("Play track.wav");
    expect(originalAudio).toHaveAttribute("src", "https://example.com/audio.wav");

    fireEvent.error(originalAudio);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The access link may have expired",
    );
  });

  it("redirects to login after the audio API reports an expired session", async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({
      session: null,
      user: { id: "user-123", email: "listener@example.com" } as never,
      loading: false,
      signOut,
    });
    mockedApi.getAudio.mockRejectedValue(new ApiError("expired", 401));

    renderAudioDetail();

    expect(await screen.findByText("Login destination")).toBeInTheDocument();
    expect(signOut).toHaveBeenCalledOnce();
  });

  it("refreshes persisted analysis and exposes a retry after analysis fails", async () => {
    mockedApi.getAudio.mockResolvedValue(
      audioResponse({
        analysis_status: "PENDING",
        analysis: null,
      }),
    );
    mockedApi.analyseStoredAudio
      .mockRejectedValueOnce(new Error("analysis service unavailable"))
      .mockResolvedValueOnce({
        filename: "track.wav",
        duration_seconds: 180,
        sample_rate: 22050,
        results: {},
      });
    renderAudioDetail();
    await screen.findByText("track.wav");

    fireEvent.click(screen.getByRole("button", { name: "Analyse this audio" }));
    expect(await screen.findByText("analysis service unavailable")).toBeInTheDocument();
    expect(mockedApi.getAudio).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: "Retry analysis" }));
    await waitFor(() => expect(mockedApi.analyseStoredAudio).toHaveBeenCalledTimes(2));
    expect(mockedApi.getAudio).toHaveBeenCalledTimes(3);
  });
});
