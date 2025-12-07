import argparse
import librosa
import soundfile as sf
import os
from pathlib import Path

def transpose_audio(input_file: str, output_file: str, semitones: float) -> str:
    input_path = Path(input_file)
    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_file}")

    if not (-24 <= semitones <= 24):
        print("Warning: Transposition outside -24 to +24 range may cause significant artifacts.")

    print(f"--> Loading: {input_file}")
    
    try:
        y, sr = librosa.load(str(input_path), sr=None, mono=True) 
    except Exception as e:
        raise RuntimeError(f"Error loading audio file: {e}")

    print(f"--> Transposing by {semitones} semitones...")

    try: 
        y_shifted = librosa.effects.pitch_shift(y, sr=sr, n_steps=semitones)
    except Exception as e:
        raise RuntimeError(f"Error during pitch shifting: {e}")
    
    out_path = Path(output_file)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"--> Saving to: {output_file}")
    try:
        sf.write(str(out_path), y_shifted, sr)
    except Exception as e:
        raise RuntimeError(f"Error saving output: {e}")
    
    print("--> Done!")
    return str(out_path)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="HarmoniX Audio Transposer Tool")
    
    parser.add_argument("input", help="Path to the input audio file")
    parser.add_argument("output", help="Path to save the output audio file")
    parser.add_argument("semitones", type=float, help="Semitones to shift (-12 to +12)")

    args = parser.parse_args()

    try:
        out = transpose_audio(args.input, args.output, args.semitones)
        print(f"Saved to {out}")
    except Exception as e:
        print("Error:", e)
        raise SystemExit(1)