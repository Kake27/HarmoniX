import { useRef, useState } from "react";
import { Upload, File, AlertCircle } from "lucide-react";
import { uploadFile } from "../services/api";

type Props = {
  onUploaded: (info: { track_id: string; filename: string, stored_path: string }) => void;
};

export default function UploadForm({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // const [uploadedSrc, setUploadedSrc] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!inputRef.current?.files?.length) {
      setError("Please select a file first");
      return;
    }
    const file = inputRef.current.files[0];
    setFilename(file.name);
    setUploading(true);
    setProgress(0);

    try {
      const res = await uploadFile(file, (p) => setProgress(p));
      onUploaded({ track_id: res.track_id, filename: file.name, stored_path: res.stored_path });
    } catch (err: unknown) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
        setUploading(false);
        setProgress(null);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Audio File
        </label>
        <div className="flex items-center gap-3">
          <label className="flex-1 cursor-pointer">
            <div className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors bg-gray-50 dark:bg-gray-800/50">
              <Upload className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-2" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {filename || "Choose an audio file..."}
              </span>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  setFilename(e.target.files[0].name);
                  setError(null);
                }
              }}
            />
          </label>
          <button
            type="submit"
            disabled={uploading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>

      {uploading && progress !== null && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Upload progress</span>
            <span className="font-medium text-blue-600 dark:text-blue-400">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {filename && !uploading && !error && (
        <div className="flex w-fit items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
          <File className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span>{filename}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </form>
  );
}
