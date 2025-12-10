import { Music2 } from 'lucide-react';

interface TranspositionSliderProps {
  value: number;
  onChange: (value: number) => void;
  color: string;
}

export function TranspositionSlider({
  value,
  onChange,
  color,
}: TranspositionSliderProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Music2 className="w-4 h-4" />
          Transpose
        </label>
        <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
          {value > 0 ? '+' : ''}
          {value}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min="-12"
          max="12"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, #e5e7eb 0%, #e5e7eb ${
              ((value + 12) / 24) * 100
            }%, ${color} ${((value + 12) / 24) * 100}%, ${color} 50%, #e5e7eb 50%, #e5e7eb 100%)`,
          }}
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>-12</span>
          <span>0</span>
          <span>+12</span>
        </div>
      </div>
    </div>
  );
}
