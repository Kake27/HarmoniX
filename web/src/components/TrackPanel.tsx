import { Sparkles, Loader2 } from "lucide-react";
import Metronome from "./Metronome";
import React from "react";

type Props = {
  filename: string
  audioSrc: string
  audioRef: React.RefObject<HTMLAudioElement>
  onDetect: () => void
  loading: boolean
}

export default function TrackPanel({filename, audioSrc, audioRef, onDetect, loading}: Props) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
      <div className="flex flex-wrap gap-4 items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm text-gray-500 dark:text-gray-400">
            Current Track
          </h3>
          <p className="text-lg font-semibold truncate">{filename}</p>
        </div>

        <audio ref={audioRef} controls src={audioSrc} />

        <Metronome
          audioRef={audioRef}
          initialBpm={90}
          onBpmChange={() => {}}
        />

        <button
          onClick={onDetect}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Detecting…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Detect Scale
            </>
          )}
        </button>
      </div>
    </div>
  )
}