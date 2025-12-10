import { useEffect, useRef } from 'react';

interface SpectrographProps {
  isPlaying: boolean;
  color: string;
}

export function Spectrograph({ isPlaying, color }: SpectrographProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const bars = 64;
    const barWidth = width / bars;

    let animationId: number;
    let dataArray = new Array(bars).fill(0).map(() => Math.random() * 0.3);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < bars; i++) {
        if (isPlaying) {
          dataArray[i] = Math.random() * 0.7 + 0.3;
        } else {
          dataArray[i] *= 0.95;
        }

        const barHeight = dataArray[i] * height;
        const x = i * barWidth;
        const y = height - barHeight;

        const gradient = ctx.createLinearGradient(x, y, x, height);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, color + '40');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth - 2, barHeight);
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isPlaying, color]);

  return (
    <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 h-32">
      <canvas
        ref={canvasRef}
        width={800}
        height={120}
        className="w-full h-full"
      />
    </div>
  );
}
