import type { CSSProperties, InputHTMLAttributes } from "react";

interface RangeSliderProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "min" | "max" | "onChange"> {
  value: number;
  min: number;
  max: number;
  onValueChange?: (value: number) => void;
  /** Value the accent fill starts from. Defaults to `min`; use a midpoint for bipolar sliders. */
  fillOrigin?: number;
}

export function RangeSlider({
  value,
  min,
  max,
  onValueChange,
  fillOrigin,
  className = "",
  style,
  ...rest
}: RangeSliderProps) {
  const span = max - min || 1;
  const toPercent = (input: number) => ((Math.min(Math.max(input, min), max) - min) / span) * 100;
  const valuePercent = toPercent(value);
  const originPercent = toPercent(fillOrigin ?? min);

  const fillStyle = {
    "--fill-start": `${Math.min(originPercent, valuePercent)}%`,
    "--fill-end": `${Math.max(originPercent, valuePercent)}%`,
    ...style,
  } as CSSProperties;

  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      readOnly={!onValueChange}
      onChange={(event) => onValueChange?.(Number(event.currentTarget.value))}
      className={`range-slider ${className}`}
      style={fillStyle}
      {...rest}
    />
  );
}
