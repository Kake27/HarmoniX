import argparse
import math
import json
from pathlib import Path
import numpy as np
import librosa

MAJOR_PROFILE = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR_PROFILE = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

def _norm(v):
    v = np.array(v, dtype=float)
    return v / (np.linalg.norm(v) + 1e-12)

MAJ = _norm(MAJOR_PROFILE)
MIN = _norm(MINOR_PROFILE)

NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
NOTE_NAMES_FLAT  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

def aggregate_chroma(chroma):

    energy = np.sum(chroma, axis=0)
    if np.sum(energy) < 1e-12:
        vec = np.mean(chroma, axis=1)
        return vec / (np.linalg.norm(vec) + 1e-12)
    weighted = chroma * (energy + 1e-8)
    vec = np.sum(weighted, axis=1)
    return vec / (np.linalg.norm(vec) + 1e-12)


def correlate_with_templates(chroma_vec):
    v = chroma_vec / (np.linalg.norm(chroma_vec) + 1e-12)
    scores = []
    for shift in range(12):
        maj_t = np.roll(MAJ, shift)
        min_t = np.roll(MIN, shift)
        maj_score = float(np.dot(v, maj_t))
        min_score = float(np.dot(v, min_t))
        scores.append((maj_score, min_score))
    return scores

def topk_from_scores(scores, k=3):
    flat = []
    for i, (maj, min_) in enumerate(scores):
        flat.append((maj, 'major', i))
        flat.append((min_, 'minor', i))
    flat.sort(key=lambda x: x[0], reverse=True)

    results = []
    for idx in range(min(k, len(flat))):
        score, mode, tonic = flat[idx]
        next_score = flat[idx+1][0] if idx+1 < len(flat) else 0.0
        gap = float(score - next_score)
        results.append({
            'rank': idx+1,
            'tonic_index': int(tonic),
            'tonic_name_sharp': NOTE_NAMES_SHARP[tonic],
            'tonic_name_flat': NOTE_NAMES_FLAT[tonic],
            'mode': mode,
            'score': float(score),
            'gap_to_next': gap
        })
    return results


def choose_best(scores):
    flattened = []
    for i, (maj, min_) in enumerate(scores):
        flattened.append((maj, 'major', i))
        flattened.append((min_, 'minor', i))
    flattened.sort(key=lambda x: x[0], reverse=True)
    best_score, best_mode, best_tonic = flattened[0]
    second_score = flattened[1][0] if len(flattened) > 1 else 0.0
    confidence = float(best_score - second_score)  # gap as simple confidence
    return {
        'tonic_index': int(best_tonic),
        'mode': best_mode,
        'score': float(best_score),
        'second_score': float(second_score),
        'confidence_gap': confidence
    }


def detect_key_global(y, sr, use_hpss=True, apply_tuning=True):

    if use_hpss:
        y_harm, y_perc = librosa.effects.hpss(y)
        y_for_chroma = y_harm
    else:
        y_for_chroma = y

    tuning = None
    if apply_tuning:
        try:
            tuning = librosa.estimate_tuning(y=y_for_chroma, sr=sr)
        except Exception:
            tuning = None

    try:
        chroma = librosa.feature.chroma_cqt(y=y_for_chroma, sr=sr, tuning=tuning)
    except Exception:
        chroma = librosa.feature.chroma_stft(y=y_for_chroma, sr=sr)


    pcv = aggregate_chroma(chroma)
    scores = correlate_with_templates(pcv)
    topk = topk_from_scores(scores=scores, k=3)
    # result = choose_best(scores)
    return topk, pcv, {"tuning": tuning}


def detect_key_windowed(y, sr, window_sec=10.0, hop_sec=5.0, use_hpss=True, apply_tuning=True, topk=3):
    duration = librosa.get_duration(y=y, sr=sr)
    if window_sec <= 0 or window_sec >= duration:
        t, pcv, meta = detect_key_global(y, sr, use_hpss=use_hpss, apply_tuning=apply_tuning)
        return [{'start': 0.0, 'end': duration, 'candidates': t, 'pcv': pcv}], meta

    segments = []
    start = 0.0
    while start < duration:
        end = min(duration, start + window_sec)
        start_frame = int(start * sr)
        end_frame = int(end * sr)
        y_seg = y[start_frame:end_frame]
        if len(y_seg) < 2048:
            break
        t, pcv, _meta = detect_key_global(y_seg, sr, use_hpss=use_hpss, apply_tuning=apply_tuning)
        segments.append({'start': start, 'end': end, 'candidates': t, 'pcv': pcv})
        start += hop_sec
    return segments, _meta

def print_candidates(candidates, use_flats=False):
    lines = []
    for c in candidates:
        name = c['tonic_name_flat'] if use_flats else c['tonic_name_sharp']
        lines.append(f"  {c['rank']}. {name} {c['mode']} — score={c['score']:.4f} (gap={c['gap_to_next']:.4f})")

    return "\n".join(lines)


def format_result(result):
    tonic_idx = result['tonic_index']
    name = NOTE_NAMES_SHARP[tonic_idx]
    return f"{name} {result['mode']} (score={result['score']:.4f}, gap={result['confidence_gap']:.4f})"


def main():
    p = argparse.ArgumentParser(description="Improved key/scale detector (HPSS, tuning, top-k results)")
    p.add_argument('audio', type=str)
    p.add_argument('--sr', type=int, default=22050)
    p.add_argument('--window', type=float, default=0.0, help='window size in seconds (0 => global)')
    p.add_argument('--hop', type=float, default=5.0, help='hop size in seconds for windowed detection')
    p.add_argument('--no-hpss', dest='hpss', action='store_false', help='disable HPSS (use full mix)')
    p.add_argument('--no-tuning', dest='tuning', action='store_false', help='disable tuning estimation')
    p.add_argument('--topk', type=int, default=3, help='return top K candidate scales')
    p.add_argument('--use-flats', action='store_true', help='display flats for note names')
    p.add_argument('--json', action='store_true', help='emit machine-readable JSON output')
    p.add_argument('--use-spleeter', action='store_true', help='attempt to run spleeter for stems (optional; slow)')
    args = p.parse_args()

    audio_path = Path(args.audio)
    if not audio_path.exists():
        print(f"File not found: {audio_path}")
        return

    if args.use_spleeter:
        try:
            from spleeter.separator import Separator
            print("Spleeter detected. Running 2stems separation (this may be slow)...")
            sep = Separator('spleeter:2stems')  # vocals + accompaniment
            out_dir = str(audio_path.with_suffix('')) + '_spleeter_out'
            sep.separate_to_file(str(audio_path), out_dir)
            # load accompaniment for analysis if available
            import os
            acc_path = None
            for root, dirs, files in os.walk(out_dir):
                for f in files:
                    if f.endswith('accompaniment.wav'):
                        acc_path = Path(root) / f
                        break
                if acc_path:
                    break
            if acc_path and acc_path.exists():
                print(f"Using accompaniment stem for analysis: {acc_path}")
                y, sr = librosa.load(str(acc_path), sr=args.sr, mono=True)
            else:
                print("Accompaniment not found; falling back to full mix.")
                y, sr = librosa.load(str(audio_path), sr=args.sr, mono=True)
        except Exception as e:
            print("Spleeter not available or failed. Falling back to full mix. (install spleeter if you need stems)")
            # fallback
            y, sr = librosa.load(str(audio_path), sr=args.sr, mono=True)
    else:
        y, sr = librosa.load(str(audio_path), sr=args.sr, mono=True)

    
    if args.window and args.window > 0:
        segments, meta = detect_key_windowed(y, sr, window_sec=args.window, hop_sec=args.hop, use_hpss=args.hpss, apply_tuning=args.tuning, topk=args.topk)
        if args.json:
            out = {'file': str(audio_path), 'sr': sr, 'segments': []}
            out['meta'] = meta
            for seg in segments:
                out['segments'].append({
                    'start': seg['start'],
                    'end': seg['end'],
                    'candidates': seg['candidates'][:args.topk]
                })
            print(json.dumps(out, indent=2))
            return
        print(f"Windowed detection: {len(segments)} segments (window={args.window}s, hop={args.hop}s)")
        for seg in segments:
            print(f"\nSegment {seg['start']:.1f}s - {seg['end']:.1f}s:")
            print(print_candidates(seg['candidates'], use_flats=args.use_flats))
    else:
        topk, pcv, meta = detect_key_global(y, sr, use_hpss=args.hpss, apply_tuning=args.tuning)
        topk = topk[:args.topk]
        if args.json:
            out = {'file': str(audio_path), 'sr': sr, 'meta': meta, 'candidates': topk}
            print(json.dumps(out, indent=2))
            return
        print(f"Global detection (sr={sr})")
        if meta.get('tuning') is not None:
            print(f"  estimated tuning offset (semitone fraction): {meta['tuning']:.4f} (positive => sharp)")
        print(print_candidates(topk, use_flats=args.use_flats))
        # also print normalized pitch-class vector for debugging
        pcv_print = np.round(pcv / (np.max(pcv) + 1e-12), 3)
        print("  normalized pitch-class vector (C..B):", pcv_print.tolist())

if __name__ == '__main__':
    main()