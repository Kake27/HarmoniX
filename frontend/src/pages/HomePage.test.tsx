import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HomePage from "./HomePage";
import { useAuth } from "../contexts/AuthContext";
import { api, ApiError } from "../services/api";

vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../services/api", () => ({
  api: {
    getMyProfile: vi.fn(),
    listAudio: vi.fn(),
    uploadAudio: vi.fn(),
    analyseStoredAudio: vi.fn(),
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
const profile = {
  id: "user-1",
  email: "listener@example.com",
  name: "Ada Listener",
  created_at: "2025-01-01T00:00:00Z",
};

function libraryItem(id: string, filename: string) {
  return {
    id,
    original_filename: filename,
    file_format: "wav",
    file_size_bytes: 4096,
    duration: 12.5,
    sample_rate: 44100,
    channels: 2,
    status: "UPLOADED",
    created_at: "2025-01-01T00:00:00Z",
    analysis_status: "COMPLETED" as const,
    bpm: 120.5,
    musical_key: "C",
    mode: "major",
  };
}

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<p>Login destination</p>} />
        <Route path="/audio/:audioId" element={<p>Audio detail destination</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function openUploadDialog() {
  fireEvent.click(screen.getByRole("button", { name: "Upload audio" }));
  return screen.getByRole("dialog", { name: "Upload audio" });
}

function selectFile(file: File) {
  fireEvent.change(screen.getByLabelText(/choose an audio file/i), {
    target: { files: [file] },
  });
}

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      session: null,
      user: {
        id: "user-1",
        email: "listener@example.com",
        user_metadata: { full_name: "Ada Listener" },
      } as never,
      loading: false,
      signOut: vi.fn().mockResolvedValue(undefined),
    });
    mockedApi.getMyProfile.mockResolvedValue(profile);
    mockedApi.listAudio.mockResolvedValue({
      items: [libraryItem("track-1", "first.wav")],
      total: 2,
      limit: 20,
      offset: 0,
    });
    mockedApi.uploadAudio.mockResolvedValue({
      id: "uploaded-1",
      original_filename: "new-track.wav",
      file_format: "wav",
      file_size_bytes: 5,
      status: "UPLOADED",
    });
    mockedApi.analyseStoredAudio.mockResolvedValue({
      filename: "new-track.wav",
      duration_seconds: 12,
      sample_rate: 44100,
      results: {
        bpm: {
          status: "success",
          data: { bpm: 123.4, detected_beats: 24, duration_seconds: 12, method: "test" },
          error: null,
        },
        musical_key: {
          status: "success",
          data: {
            key: "D",
            mode: "minor",
            label: "D minor",
            correlation_score: 0.9,
            runner_up: "F major",
            score_margin: 0.2,
            method: "test",
          },
          error: null,
        },
      },
    });
  });

  it("loads the current profile and library and shows track metadata", async () => {
    renderHome();

    expect(await screen.findByText("first.wav")).toBeInTheDocument();
    expect(screen.getByText("Ada Listener")).toBeInTheDocument();
    expect(screen.getByText("121")).toBeInTheDocument();
    expect(mockedApi.getMyProfile).toHaveBeenCalledOnce();
    expect(mockedApi.listAudio).toHaveBeenCalledWith(20, 0);
  });

  it("filters library items case-insensitively and reports no matches", async () => {
    mockedApi.listAudio.mockResolvedValue({
      items: [
        libraryItem("track-1", "First Mix.wav"),
        libraryItem("track-2", "Second Mix.wav"),
      ],
      total: 2,
      limit: 20,
      offset: 0,
    });
    renderHome();
    await screen.findByText("First Mix.wav");

    fireEvent.change(screen.getByRole("searchbox", { name: "Search your audio" }), {
      target: { value: "SECOND" },
    });
    expect(screen.getByText("Second Mix.wav")).toBeInTheDocument();
    expect(screen.queryByText("First Mix.wav")).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search your audio" }), {
      target: { value: "missing" },
    });
    expect(screen.getByText("No audio matches your search.")).toBeInTheDocument();
  });

  it("loads additional library pages without replacing existing tracks", async () => {
    mockedApi.listAudio
      .mockResolvedValueOnce({
        items: [libraryItem("track-1", "first.wav")],
        total: 2,
        limit: 20,
        offset: 0,
      })
      .mockResolvedValueOnce({
        items: [libraryItem("track-2", "second.wav")],
        total: 2,
        limit: 20,
        offset: 1,
      });
    renderHome();
    await screen.findByText("first.wav");

    fireEvent.click(screen.getByRole("button", { name: "Load more" }));

    expect(await screen.findByText("second.wav")).toBeInTheDocument();
    expect(screen.getByText("first.wav")).toBeInTheDocument();
    expect(mockedApi.listAudio).toHaveBeenNthCalledWith(2, 20, 1);
  });

  it("shows a recoverable library error and retries the request", async () => {
    mockedApi.listAudio
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce({
        items: [libraryItem("track-1", "first.wav")],
        total: 1,
        limit: 20,
        offset: 0,
      });
    renderHome();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("network unavailable");
    fireEvent.click(within(alert).getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("first.wav")).toBeInTheDocument();
  });

  it("shows profile loading errors only in the profile tab and supports retry", async () => {
    mockedApi.getMyProfile
      .mockRejectedValueOnce(new Error("profile service unavailable"))
      .mockResolvedValueOnce(profile);
    renderHome();
    await screen.findByText("first.wav");

    fireEvent.click(screen.getByRole("button", { name: "Profile" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("profile service unavailable");
    fireEvent.click(within(alert).getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(mockedApi.getMyProfile).toHaveBeenCalledTimes(2);
  });

  it("rejects unsupported, empty, and oversized files before upload", async () => {
    renderHome();
    await screen.findByText("first.wav");
    const dialog = openUploadDialog();
    const uploadButton = within(dialog).getByRole("button", { name: "Upload track" });

    selectFile(new File(["x"], "voice.exe"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unsupported format");
    expect(uploadButton).toBeDisabled();
    expect(mockedApi.uploadAudio).not.toHaveBeenCalled();

    selectFile(new File([], "empty.wav"));
    expect(await screen.findByRole("alert")).toHaveTextContent("selected file is empty");

    const oversized = new File(["x"], "large.wav");
    Object.defineProperty(oversized, "size", { value: 50 * 1024 * 1024 + 1 });
    selectFile(oversized);
    expect(await screen.findByRole("alert")).toHaveTextContent("50 MB upload limit");
    expect(mockedApi.uploadAudio).not.toHaveBeenCalled();
  });

  it("uploads first, enables analysis only after storage succeeds, and renders results", async () => {
    renderHome();
    await screen.findByText("first.wav");
    const dialog = openUploadDialog();
    selectFile(new File(["audio"], "new-track.wav", { type: "audio/wav" }));

    expect(within(dialog).getByRole("button", { name: "Analyse track" })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Upload track" }));
    await waitFor(() => {
      expect(mockedApi.uploadAudio).toHaveBeenCalledOnce();
    });
    expect(await screen.findByText(/Upload complete/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Analyse track" })).toBeEnabled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Analyse track" }));
    expect(await screen.findByText("123.4")).toBeInTheDocument();
    expect(screen.getByText("D minor")).toBeInTheDocument();
    expect(mockedApi.analyseStoredAudio).toHaveBeenCalledWith("uploaded-1");
    expect(mockedApi.listAudio).toHaveBeenCalledTimes(3);
  });

  it("shows upload failures and permits retrying the selected file", async () => {
    mockedApi.uploadAudio
      .mockRejectedValueOnce(new Error("storage offline"))
      .mockResolvedValueOnce({
        id: "uploaded-1",
        original_filename: "new-track.wav",
        file_format: "wav",
        file_size_bytes: 5,
        status: "UPLOADED",
      });
    renderHome();
    await screen.findByText("first.wav");
    const dialog = openUploadDialog();
    selectFile(new File(["audio"], "new-track.wav"));

    fireEvent.click(within(dialog).getByRole("button", { name: "Upload track" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("storage offline");
    fireEvent.click(within(dialog).getByRole("button", { name: "Upload track" }));

    expect(await screen.findByText(/Upload complete/)).toBeInTheDocument();
    expect(mockedApi.uploadAudio).toHaveBeenCalledTimes(2);
  });

  it("displays analysis errors without losing the uploaded track", async () => {
    mockedApi.analyseStoredAudio.mockRejectedValue(new Error("analysis timed out"));
    renderHome();
    await screen.findByText("first.wav");
    const dialog = openUploadDialog();
    selectFile(new File(["audio"], "new-track.wav"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Upload track" }));
    await screen.findByText(/Upload complete/);

    fireEvent.click(within(dialog).getByRole("button", { name: "Analyse track" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("analysis timed out");
    expect(screen.getByText(/Upload complete/)).toBeInTheDocument();
  });

  it("signs out and redirects when a protected API request returns 401", async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({
      session: null,
      user: { id: "user-1", email: "listener@example.com" } as never,
      loading: false,
      signOut,
    });
    mockedApi.getMyProfile.mockRejectedValue(new ApiError("expired", 401));
    renderHome();

    expect(await screen.findByText("Login destination")).toBeInTheDocument();
    expect(signOut).toHaveBeenCalledOnce();
  });
});
