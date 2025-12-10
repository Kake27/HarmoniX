import { Volume2, Music2, Download, RotateCcw } from 'lucide-react';
import { useState } from 'react';

export function MasterControls() {
  const [masterVolume, setMasterVolume] = useState(80);
  const [masterTranspose, setMasterTranspose] = useState(0);

  const handleReset = () => {
    setMasterVolume(80);
    setMasterTranspose(0);
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-xl p-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
        <Music2 className="w-7 h-7 text-teal-500" />
        Master Controls
      </h2>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-blue-500" />
              Master Volume
            </label>
            <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
              {masterVolume}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={masterVolume}
            onChange={(e) => setMasterVolume(Number(e.target.value))}
            className="w-full h-3 rounded-full appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${masterVolume}%, #e5e7eb ${masterVolume}%, #e5e7eb 100%)`,
            }}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Music2 className="w-5 h-5 text-teal-500" />
              Master Transpose
            </label>
            <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
              {masterTranspose > 0 ? '+' : ''}
              {masterTranspose}
            </span>
          </div>
          <input
            type="range"
            min="-12"
            max="12"
            value={masterTranspose}
            onChange={(e) => setMasterTranspose(Number(e.target.value))}
            className="w-full h-3 rounded-full appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #e5e7eb 0%, #e5e7eb ${
                ((masterTranspose + 12) / 24) * 100
              }%, #14b8a6 ${((masterTranspose + 12) / 24) * 100}%, #14b8a6 50%, #e5e7eb 50%, #e5e7eb 100%)`,
            }}
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>-12</span>
            <span>0</span>
            <span>+12</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleReset}
          className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-5 h-5" />
          Reset
        </button>
        <button className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white font-medium rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center justify-center gap-2">
          <Download className="w-5 h-5" />
          Export All Tracks
        </button>
      </div>
    </div>
  );
}
