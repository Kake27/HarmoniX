import React, { useRef, useState } from "react";
import { uploadFile } from "../services/api";


type Props = {
  onUploaded: (info: { track_id: string; filename: string }) => void;
};

export default function UploadForm({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!inputRef.current?.files?.length) {
      setError("Pick a file first");
      return;
    }
    const file = inputRef.current.files[0];
    setFilename(file.name);
    setUploading(true);
    setProgress(0);

    try {
      // uploadFile handles progress via XHR
      const res = await uploadFile(file, (p) => setProgress(p));
      // res expected: { track_id, filename, stored_path }
      onUploaded({ track_id: res.track_id, filename: file.name });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Upload failed");
    } finally {
      setUploading(false);
      setProgress(null);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Select audio file:
        <input ref={inputRef} type="file" accept="audio/*" style={{ display: "block", marginTop: 8 }} />
      </label>

      <div style={{ marginTop: 10 }}>
        <button type="submit" disabled={uploading}>
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      {uploading && progress !== null && (
        <div style={{ marginTop: 8 }}>
          Upload progress: {Math.round(progress)}%
          <div className="progress">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {filename && !uploading && <div style={{ marginTop: 8 }}>Selected: {filename}</div>}
      {error && (
        <div style={{ marginTop: 8, color: "crimson" }}>
          <small>{error}</small>
        </div>
      )}
    </form>
  );
}
