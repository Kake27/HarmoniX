import { useEffect, useState } from 'react';
import { Loader2, Music, Waves, Sparkles } from 'lucide-react';

export function ProcessingPage() {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    'Analyzing audio file...',
    'Extracting vocal frequencies...',
    'Isolating bass lines...',
    'Separating drum patterns...',
    'Processing remaining tracks...',
    'Finalizing separation...',
  ];

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 1;
      });
    }, 60);

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 2000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-900 transition-colors duration-500 flex items-center justify-center">
      <div className="text-center px-4">
        <div className="relative mb-12">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 bg-gradient-to-r from-teal-400 to-blue-400 rounded-full opacity-20 animate-ping"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40 bg-gradient-to-r from-blue-400 to-green-400 rounded-full opacity-30 animate-pulse"></div>
          </div>
          <div className="relative flex items-center justify-center">
            <Loader2 className="w-32 h-32 text-teal-500 dark:text-teal-400 animate-spin" />
            <Waves className="w-16 h-16 text-blue-500 dark:text-blue-400 absolute animate-pulse" />
          </div>
        </div>

        <h2 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 dark:from-teal-400 dark:to-blue-400 bg-clip-text text-transparent mb-4">
          Processing Your Music
        </h2>

        <div className="mb-8 h-8">
          <p className="text-lg text-gray-600 dark:text-gray-300 animate-fade-in flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-500 animate-pulse" />
            {steps[currentStep]}
          </p>
        </div>

        <div className="max-w-md mx-auto mb-4">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-teal-500 via-blue-500 to-green-500 rounded-full transition-all duration-300 ease-out shadow-lg"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
          {progress}%
        </p>

        <div className="mt-12 grid grid-cols-4 gap-4 max-w-lg mx-auto">
          {[
            { icon: Music, label: 'Vocals', color: 'from-blue-400 to-blue-600' },
            { icon: Waves, label: 'Bass', color: 'from-teal-400 to-teal-600' },
            { icon: Music, label: 'Drums', color: 'from-orange-400 to-orange-600' },
            { icon: Waves, label: 'Other', color: 'from-green-400 to-green-600' },
          ].map((item, i) => (
            <div
              key={item.label}
              className={`p-4 bg-gradient-to-br ${item.color} rounded-xl shadow-lg transform transition-all duration-500 ${
                currentStep >= i ? 'scale-100 opacity-100' : 'scale-95 opacity-50'
              }`}
              style={{ animationDelay: `${i * 150}ms` }}
            >
              <item.icon className="w-8 h-8 text-white mx-auto mb-2" />
              <p className="text-xs font-medium text-white">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
