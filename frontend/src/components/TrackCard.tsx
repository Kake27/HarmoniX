import { useState, useRef, useEffect } from 'react';
<<<<<<< HEAD
import { Play, Pause, Mic, Music, Drum, Waves, Download } from 'lucide-react';
=======
import { Play, Pause, Mic, Music, Drum, Waves } from 'lucide-react';
>>>>>>> f50ab126ed4bb583d3f4c925eca2793b85e86c8c
import { VolumeSlider } from './VolumeSlider';
import { TranspositionSlider } from './TranspositionSlider';
import { Spectrograph } from './Spectrograph';

interface TrackCardProps {
  name: string;
  type: 'vocals' | 'bass' | 'drums' | 'other';
  color: string;
<<<<<<< HEAD
  audioUrl?: string;
=======
>>>>>>> f50ab126ed4bb583d3f4c925eca2793b85e86c8c
}

const iconMap = {
  vocals: Mic,
  bass: Waves,
  drums: Drum,
  other: Music,
};

const colorMap = {
  vocals: 'from-blue-400 to-blue-600',
  bass: 'from-teal-400 to-teal-600',
  drums: 'from-orange-400 to-orange-600',
  other: 'from-green-400 to-green-600',
};

<<<<<<< HEAD
export function TrackCard({ name, type, color, audioUrl }: TrackCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(75);
  const [transposition, setTransposition] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const Icon = iconMap[type];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume / 100;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    audio.load();
  }, [audioUrl]);

  const togglePlayback = async () => {
    if (!audioUrl) return;

    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audio.play();
      setIsPlaying(true);
    } catch (error) {
      // Swallow play errors (e.g., autoplay restrictions)
      setIsPlaying(false);
      console.error('Unable to play audio stem', error);
    }
  };

=======
export function TrackCard({ name, type, color }: TrackCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(75);
  const [transposition, setTransposition] = useState(0);
  const Icon = iconMap[type];

>>>>>>> f50ab126ed4bb583d3f4c925eca2793b85e86c8c
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[type]} flex items-center justify-center shadow-lg`}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">
              {name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
              {type}
            </p>
<<<<<<< HEAD
            {!audioUrl && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Track not available yet
              </p>
            )}
          </div>
        </div>
        <button
          onClick={togglePlayback}
          disabled={!audioUrl}
          className={`w-12 h-12 rounded-full bg-gradient-to-br ${colorMap[type]} flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed`}
=======
          </div>
        </div>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`w-12 h-12 rounded-full bg-gradient-to-br ${colorMap[type]} flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl`}
>>>>>>> f50ab126ed4bb583d3f4c925eca2793b85e86c8c
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-white fill-white" />
          ) : (
            <Play className="w-6 h-6 text-white fill-white ml-1" />
          )}
        </button>
      </div>

      <Spectrograph isPlaying={isPlaying} color={color} />

      <div className="mt-6 space-y-4">
        <VolumeSlider value={volume} onChange={setVolume} color={color} />
        <TranspositionSlider
          value={transposition}
          onChange={setTransposition}
          color={color}
        />
<<<<<<< HEAD
        {audioUrl && (
          <a
            href={audioUrl}
            download
            className="inline-flex items-center gap-2 text-sm text-teal-600 dark:text-teal-300 font-medium hover:underline"
          >
            <Download className="w-4 h-4" />
            Download stem
          </a>
        )}
      </div>

      <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />
=======
      </div>
>>>>>>> f50ab126ed4bb583d3f4c925eca2793b85e86c8c
    </div>
  );
}
