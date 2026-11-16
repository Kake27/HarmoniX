const PITCH_CLASSES = [
  "C", "C#", "D", "D#", "E", "F",
  "F#", "G", "G#", "A", "A#", "B",
];

const KEY_TO_PITCH_CLASS: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

export const SEMITONE_MIN = -6;
export const SEMITONE_MAX = 6;

export function getExpectedKey(
  key: string | null,
  mode: string | null,
  semitones: number,
): string | null {
  if (!key || !(key in KEY_TO_PITCH_CLASS)) return null;
  const shiftedIndex =
    (KEY_TO_PITCH_CLASS[key] + semitones + PITCH_CLASSES.length) %
    PITCH_CLASSES.length;
  return `${PITCH_CLASSES[shiftedIndex]}${mode ? ` ${mode}` : ""}`;
}

/** Replaces ASCII accidentals with musical symbols: "F# minor" → "F♯ minor". */
export function withMusicalSymbols(value: string): string {
  return value.replace(/([A-G])#/g, "$1♯").replace(/([A-G])b\b/g, "$1♭");
}

/** Compact key label used for large displays: "F#" + "minor" → "F♯m". */
export function formatKeyShort(key: string, mode: string | null): string {
  const isMinor = mode?.toLowerCase().startsWith("min") ?? false;
  return `${withMusicalSymbols(key)}${isMinor ? "m" : ""}`;
}

export function formatKeyFull(key: string, mode: string | null): string {
  return withMusicalSymbols(`${key}${mode ? ` ${mode}` : ""}`);
}

/** Signed semitone label using a true minus sign: 2 → "+2", -3 → "−3". */
export function formatSemitones(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${Math.abs(value)}`;
  return "0";
}
