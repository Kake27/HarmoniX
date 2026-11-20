import { describe, expect, it } from "vitest";

import {
  formatClock,
  formatDuration,
  formatFileSize,
  formatPlaybackRate,
  getInitials,
} from "./format";
import {
  formatKeyFull,
  formatKeyShort,
  formatSemitones,
  getExpectedKey,
} from "./music";
import { generateWaveform } from "./waveform";

describe("format helpers", () => {
  it.each([
    [0, "00:00"],
    [84.9, "01:24"],
    [3725, "1:02:05"],
    [null, "--:--"],
    [undefined, "--:--"],
    [-1, "--:--"],
    [Number.NaN, "--:--"],
    [Number.POSITIVE_INFINITY, "--:--"],
  ])("formats playback clock value %s", (value, expected) => {
    expect(formatClock(value)).toBe(expected);
  });

  it("formats durations, sizes, and playback rates", () => {
    expect(formatDuration(125.9)).toBe("2:05");
    expect(formatFileSize(512)).toBe("0.5 KB");
    expect(formatFileSize(1024 * 1024)).toBe("1.00 MB");
    expect(formatPlaybackRate(1.5)).toBe("1.5×");
    expect(formatPlaybackRate(1.1)).toBe("1.1×");
  });

  it.each([
    ["Ada Lovelace", "AL"],
    [" listener@example.com ", "le"],
    ["", "?"],
    ["..", "?"],
  ])("derives initials from %s", (source, expected) => {
    expect(getInitials(source)).toBe(expected);
  });
});

describe("music helpers", () => {
  it("transposes natural and enharmonic keys across the octave boundary", () => {
    expect(getExpectedKey("B", "major", 1)).toBe("C major");
    expect(getExpectedKey("C", "minor", -1)).toBe("B minor");
    expect(getExpectedKey("Db", "major", 1)).toBe("D major");
    expect(getExpectedKey("Gb", null, -1)).toBe("F");
  });

  it("returns no expected key for unknown keys and preserves an omitted mode", () => {
    expect(getExpectedKey(null, "major", 2)).toBeNull();
    expect(getExpectedKey("H", "major", 2)).toBeNull();
    expect(getExpectedKey("A", null, 0)).toBe("A");
  });

  it("formats musical symbols and signed semitone labels", () => {
    expect(formatKeyFull("F#", "minor")).toBe("F♯ minor");
    expect(formatKeyShort("Bb", "minor")).toBe("B♭m");
    expect(formatKeyShort("C", "major")).toBe("C");
    expect(formatSemitones(2)).toBe("+2");
    expect(formatSemitones(-3)).toBe("−3");
    expect(formatSemitones(0)).toBe("0");
  });
});

describe("decorative waveform generation", () => {
  it("is deterministic for a seed and returns bounded bar heights", () => {
    const first = generateWaveform("track-1", 150);
    const second = generateWaveform("track-1", 150);

    expect(first).toHaveLength(150);
    expect(second).toEqual(first);
    expect(first.every((height) => height >= 0.12 && height <= 1)).toBe(true);
    expect(generateWaveform("track-2", 150)).not.toEqual(first);
  });

  it("supports an empty waveform", () => {
    expect(generateWaveform("track-1", 0)).toEqual([]);
  });
});
