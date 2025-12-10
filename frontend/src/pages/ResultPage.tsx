<<<<<<< HEAD
import { ArrowLeft, Sparkles, AlertCircle } from 'lucide-react';
import { TrackCard } from '../components/TrackCard';
import { MasterControls } from '../components/MasterControls';
import { StemName } from '../api';

interface ResultPageProps {
  fileName: string;
  stems: Partial<Record<StemName, string>> | null;
  onBack: () => void;
}

export function ResultPage({ fileName, stems, onBack }: ResultPageProps) {
=======
import { ArrowLeft, Sparkles } from 'lucide-react';
import { TrackCard } from '../components/TrackCard';
import { MasterControls } from '../components/MasterControls';

interface ResultPageProps {
  fileName: string;
  onBack: () => void;
}

export function ResultPage({ fileName, onBack }: ResultPageProps) {
>>>>>>> f50ab126ed4bb583d3f4c925eca2793b85e86c8c
  const tracks = [
    { name: 'Vocals', type: 'vocals' as const, color: '#3b82f6' },
    { name: 'Bass', type: 'bass' as const, color: '#14b8a6' },
    { name: 'Drums', type: 'drums' as const, color: '#f97316' },
    { name: 'Other', type: 'other' as const, color: '#22c55e' },
  ];

<<<<<<< HEAD
  const hasStems = stems && Object.keys(stems).length > 0;

=======
>>>>>>> f50ab126ed4bb583d3f4c925eca2793b85e86c8c
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-900 transition-colors duration-500">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between animate-fade-in">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all duration-300 hover:scale-105 shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Upload
          </button>

          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 dark:from-teal-400 dark:to-blue-400 bg-clip-text text-transparent mb-2 flex items-center justify-center gap-2">
              <Sparkles className="w-8 h-8 text-teal-500 animate-pulse" />
              HarmoniX
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {fileName}
            </p>
          </div>

          <div className="w-32"></div>
        </div>

        <div className="mb-8">
          <MasterControls />
        </div>

<<<<<<< HEAD
        {!hasStems && (
          <div className="mb-6 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4" />
            <span>Tracks are not available yet. Try uploading again.</span>
          </div>
        )}

=======
>>>>>>> f50ab126ed4bb583d3f4c925eca2793b85e86c8c
        <div className="grid md:grid-cols-2 gap-6">
          {tracks.map((track, index) => (
            <div
              key={track.name}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <TrackCard
                name={track.name}
                type={track.type}
                color={track.color}
<<<<<<< HEAD
                audioUrl={stems?.[track.type]}
=======
>>>>>>> f50ab126ed4bb583d3f4c925eca2793b85e86c8c
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
