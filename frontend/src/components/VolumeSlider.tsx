import { Volume2, VolumeX } from 'lucide-react';

interface VolumeSliderProps {
  value: number;
  onChange: (value: number) => void;
  color: string;
}

export function VolumeSlider({ value, onChange, color }: VolumeSliderProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          {value === 0 ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
          Volume
        </label>
        <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
          {value}%
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, ${color} 0%, ${color} ${value}%, #e5e7eb ${value}%, #e5e7eb 100%)`,
          }}
        />
      </div>
    </div>
  );
}
