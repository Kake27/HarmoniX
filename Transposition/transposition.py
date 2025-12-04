import argparse
import librosa
import soundfile as sf
import os
import sys

def transpose_audio(input_file, output_file, semitones):
    """
    Loads audio, shifts the pitch by n_steps (semitones), and saves it.
    """
    if not os.path.exists(input_file):
        print(f"Error: The file '{input_file}' was not found.")
        return

    if not (-12 <= semitones <= 12):
        print("Warning: Transposition outside -12 to +12 range may cause significant artifacts.")

    print(f"--> Loading: {input_file}")
    
    try:
        y, sr = librosa.load(input_file, sr=None) 
    except Exception as e:
        print(f"Error loading audio: {e}")
        return

    print(f"--> Transposing by {semitones} semitones...")

    y_shifted = librosa.effects.pitch_shift(y, sr=sr, n_steps=semitones)

    print(f"--> Saving to: {output_file}")
    sf.write(output_file, y_shifted, sr)
    print("--> Done!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Audio Transposer Tool")
    
    parser.add_argument("input", help="Path to the input audio file")
    parser.add_argument("output", help="Path to save the output audio file")
    parser.add_argument("semitones", type=float, help="Semitones to shift (-12 to +12)")

    args = parser.parse_args()

    transpose_audio(args.input, args.output, args.semitones)