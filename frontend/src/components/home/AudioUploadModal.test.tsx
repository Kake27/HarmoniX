import { fireEvent, render, screen } from "@testing-library/react";
import { createRef, type ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { AudioUploadModal } from "./AudioUploadModal";
import type { AnalysisResponse, UploadedAudio } from "../../services/api";

function renderModal(
  overrides: Partial<ComponentProps<typeof AudioUploadModal>> = {},
) {
  const props: ComponentProps<typeof AudioUploadModal> = {
    fileInputRef: createRef<HTMLInputElement>(),
    selectedFile: null,
    uploadedAudio: null,
    analysis: null,
    bpm: null,
    musicalKey: null,
    uploadError: "",
    analysisError: "",
    isUploading: false,
    isAnalyzing: false,
    onClose: vi.fn(),
    onFileChange: vi.fn(),
    onUpload: vi.fn(),
    onAnalyse: vi.fn(),
    ...overrides,
  };
  return { ...render(<AudioUploadModal {...props} />), props };
}

describe("AudioUploadModal", () => {
  it("exposes a labelled modal and closes from its button, backdrop, or Escape", () => {
    const onClose = vi.fn();
    const { props, rerender } = renderModal({ onClose });
    expect(screen.getByRole("dialog", { name: "Upload audio" })).toHaveAttribute(
      "aria-modal",
      "true",
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();

    rerender(<AudioUploadModal {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("passes the selected file to its owner and displays its size", () => {
    const file = new File(["audio"], "track.wav", { type: "audio/wav" });
    const { props } = renderModal({ selectedFile: file });
    const input = screen.getByLabelText(/choose an audio file/i);

    expect(screen.getByText("track.wav")).toBeInTheDocument();
    expect(screen.getByText("(0.0 KB)")).toBeInTheDocument();
    fireEvent.change(input, { target: { files: [file] } });

    expect(props.onFileChange).toHaveBeenCalledWith(file);
    expect(screen.getByRole("button", { name: "Upload track" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Analyse track" })).toBeDisabled();
  });

  it("blocks file and action controls while upload or analysis is in progress", () => {
    const { rerender, props } = renderModal({
      isUploading: true,
      selectedFile: new File(["audio"], "track.wav"),
    });

    expect(screen.getByLabelText(/choose an audio file/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: "Uploading to storage..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Analyse track" })).toBeDisabled();
    expect(screen.getByText("Uploading to storage...")).toBeInTheDocument();

    rerender(
      <AudioUploadModal
        {...props}
        isUploading={false}
        isAnalyzing
        uploadedAudio={{
          id: "track-1",
          original_filename: "track.wav",
          file_format: "wav",
          file_size_bytes: 5,
          status: "UPLOADED",
        }}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Analysing stored track..." }),
    ).toBeDisabled();
    expect(screen.getByText(/being analysed/i)).toBeInTheDocument();
  });

  it("keeps analysis disabled until upload succeeds and reports uploaded state", () => {
    const uploadedAudio: UploadedAudio = {
      id: "track-1",
      original_filename: "track.wav",
      file_format: "wav",
      file_size_bytes: 5,
      status: "UPLOADED",
    };
    const { props, rerender } = renderModal({
      selectedFile: new File(["audio"], "track.wav"),
    });

    expect(screen.getByRole("button", { name: "Analyse track" })).toBeDisabled();
    rerender(<AudioUploadModal {...props} uploadedAudio={uploadedAudio} />);

    expect(screen.getByRole("button", { name: "Uploaded" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Analyse track" })).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "stored and ready for analysis",
    );
  });

  it("shows upload and analysis errors accessibly", () => {
    renderModal({
      uploadError: "Storage unavailable",
      analysisError: "Analysis timed out",
    });

    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(2);
    expect(alerts[0]).toHaveTextContent("Storage unavailable");
    expect(alerts[1]).toHaveTextContent("Analysis timed out");
  });

  it("renders analyzer failures when optional BPM and key results are absent", () => {
    const analysis: AnalysisResponse = {
      filename: "silent.wav",
      duration_seconds: 2,
      sample_rate: 22050,
      results: {
        bpm: { status: "failed", data: null, error: "No rhythm detected" },
        musical_key: {
          status: "failed",
          data: null,
          error: "No tonal information",
        },
      },
    };
    renderModal({
      uploadedAudio: {
        id: "track-1",
        original_filename: "silent.wav",
        file_format: "wav",
        file_size_bytes: 5,
        status: "UPLOADED",
      },
      analysis,
    });

    expect(screen.getByText("No rhythm detected")).toBeInTheDocument();
    expect(screen.getByText("No tonal information")).toBeInTheDocument();
    expect(screen.getByText("0:02")).toBeInTheDocument();
    expect(screen.getByText("22,050 Hz")).toBeInTheDocument();
  });
});
