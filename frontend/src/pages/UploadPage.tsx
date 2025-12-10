import { useState } from 'react';
<<<<<<< HEAD
import { Upload, Music, Sparkles, AlertCircle } from 'lucide-react';

interface UploadPageProps {
  onUpload: (file: File) => Promise<void> | void;
  error?: string | null;
}

export function UploadPage({ onUpload, error }: UploadPageProps) {
=======
import { Upload, Music, Sparkles } from 'lucide-react';

interface UploadPageProps {
  onUpload: (file: File) => void;
}

export function UploadPage({ onUpload }: UploadPageProps) {
>>>>>>> f50ab126ed4bb583d3f4c925eca2793b85e86c8c
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('audio/')) {
      setFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleSubmit = () => {
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-900 transition-colors duration-500">
      <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-screen">
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <Music className="w-20 h-20 text-teal-500 dark:text-teal-400 animate-pulse" />
              <Sparkles className="w-8 h-8 text-orange-500 dark:text-orange-400 absolute -top-2 -right-2 animate-bounce" />
            </div>
          </div>
          <h1 className="text-6xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 dark:from-teal-400 dark:to-blue-400 bg-clip-text text-transparent mb-4">
            HarmoniX
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Separate your music into individual tracks with AI
          </p>
        </div>

        <div
          className={`w-full max-w-2xl bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 transition-all duration-300 ${
            isDragging ? 'scale-105 ring-4 ring-teal-400 dark:ring-teal-500' : ''
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div
            className={`border-3 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
              isDragging
                ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'
            }`}
          >
            <Upload
              className={`w-16 h-16 mx-auto mb-4 transition-all duration-300 ${
                isDragging
                  ? 'text-teal-500 scale-110'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            />
            {file ? (
              <div className="animate-fade-in">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white px-6 py-3 rounded-full mb-4">
                  <Music className="w-5 h-5" />
                  <span className="font-medium">{file.name}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Drop your audio file here
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  or click to browse
                </p>
              </>
            )}
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-block cursor-pointer px-6 py-3 bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white font-medium rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              {file ? 'Choose Different File' : 'Browse Files'}
            </label>
          </div>

<<<<<<< HEAD
          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

=======
>>>>>>> f50ab126ed4bb583d3f4c925eca2793b85e86c8c
          {file && (
            <button
              onClick={handleSubmit}
              className="w-full mt-8 px-8 py-4 bg-gradient-to-r from-teal-500 via-blue-500 to-green-500 hover:from-teal-600 hover:via-blue-600 hover:to-green-600 text-white text-lg font-bold rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-2xl animate-fade-in flex items-center justify-center gap-2"
            >
              <Sparkles className="w-6 h-6 animate-pulse" />
              Start Processing
            </button>
          )}
        </div>

        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: Music, label: 'Vocals', color: 'text-blue-500' },
            { icon: Music, label: 'Bass', color: 'text-teal-500' },
            { icon: Music, label: 'Drums', color: 'text-orange-500' },
            { icon: Music, label: 'Other', color: 'text-green-500' },
          ].map((item, i) => (
            <div
              key={item.label}
              className="animate-fade-in"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <item.icon className={`w-8 h-8 mx-auto mb-2 ${item.color}`} />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
