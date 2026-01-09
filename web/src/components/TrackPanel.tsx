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
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
      {/* Track Info */}
      <div>
        <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          Current Track
        </h3>
        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
          {filename}
        </p>
      </div>

      {/* Audio Player */}
      <div className="w-1/2">
        <audio 
          ref={audioRef} 
          controls 
          src={audioSrc}
          className="w-full"
        />
      </div>

      {/* Controls Row */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <Metronome
          audioRef={audioRef}
          initialBpm={90}
          onBpmChange={() => {}}
        />

        <button
          onClick={onDetect}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors shadow-sm whitespace-nowrap  "
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