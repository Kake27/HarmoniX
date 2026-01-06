import React, {useEffect, useState, useRef} from "react";

type Props = {
    audioRef?: React.RefObject<HTMLAudioElement> | null; // optional: to sync with track
    initialBpm?: number;
    onBpmChange?: (bpm: number) => void;
}


export default function Metronome({audioRef, initialBpm = 90, onBpmChange}: Props){
    const [bpm, setBpm] = useState<number>(initialBpm);
    const [running, setRunning] = useState(false);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const nextNoteTimeRef = useRef<number>(0); // when the next tick should play (audioContext time)
    const lookaheadRef = useRef<number>(25); // ms between scheduler calls
    const scheduleAheadTime = 0.1; // seconds - how far ahead to schedule
    const timerIdRef = useRef<number | null>(null);
    const current16thRef = useRef<number>(0);

    useEffect(() => {
        return () => {
            if(timerIdRef.current) {
                window.clearInterval(timerIdRef.current)
            }

            if(audioCtxRef.current) {
                try {audioCtxRef.current.close()} catch {
                    // ignore
                }
            }
        }
    }, [])

    function ensureAudioContext() {
        if (!audioCtxRef.current) {
            const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            audioCtxRef.current = new AudioContextClass();
        }
        return audioCtxRef.current;
    }

    function scheduleClick(time: number, accented = false) {
        const audioCtx = ensureAudioContext();
        // simple click using oscillator + short envelope
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = "sine";
        o.frequency.value = accented ? 1000 : 800; // accent higher frequency
        g.gain.setValueAtTime(0.0001, time);
        g.gain.exponentialRampToValueAtTime(0.5, time + 0.001);
        g.gain.exponentialRampToValueAtTime(0.0001, time + 0.02);

        o.connect(g);
        g.connect(audioCtx.destination);
        o.start(time);
        o.stop(time + 0.03);
    }

    function secsPerBeat(bpmValue: number) {
        return 60.0 / bpmValue;
    }

    function scheduler() {
        const audioCtx = ensureAudioContext();
        while (nextNoteTimeRef.current < audioCtx.currentTime + scheduleAheadTime) {
            // schedule click for the current beat
            const beatIndex = current16thRef.current; // count in quarter beats
            // accent the downbeat (or whatever rule you want)
            const isAccent = (beatIndex % 4) === 0;
            scheduleClick(nextNoteTimeRef.current, isAccent);

            // advance to next beat (we schedule quarter-note resolution)
            const spb = secsPerBeat(bpm);
            nextNoteTimeRef.current += spb; // schedule next quarter note
            current16thRef.current += 1;
        }
    }

    function start() {
        const audioCtx = ensureAudioContext();

        // let offsetSeconds = 0;
        if (audioRef?.current && !audioRef.current.paused) {
            // get audio element time and audioContext time; compute small offset so clicks match
            const audioCurrent = audioRef.current.currentTime; // seconds in audio element timeline
            const now = audioCtx.currentTime; // audio context time (seconds)
            // approach: set nextNoteTimeRef to now + smallDelay so clicks play relative to audioCurrent
            // compute beat position (where should the metronome be) from audioCurrent
            const spb = secsPerBeat(bpm);
            // compute time until next beat in audio timeline
            const beatProgress = audioCurrent % spb;
            const timeUntilNextBeatAudio = spb - beatProgress;
            // schedule first click slightly in the future relative to audioCtx
            nextNoteTimeRef.current = now + Math.max(0.05, timeUntilNextBeatAudio);
        } else {
            // audio not playing or not provided — start immediately
            nextNoteTimeRef.current = audioCtx.currentTime + 0.05;
        }

        // reset beat index
        current16thRef.current = 0;

        // create interval timer to call scheduler regularly
        if (timerIdRef.current) {
        window.clearInterval(timerIdRef.current);
        }
        timerIdRef.current = window.setInterval(scheduler, lookaheadRef.current);
        setRunning(true);
    }

    function stop() {
        if (timerIdRef.current) {
            window.clearInterval(timerIdRef.current);
            timerIdRef.current = null;
        }
        setRunning(false);
    }

        // change BPM live — we only adjust nextNote scheduling; no need to restart AudioContext.
    function changeBpm(newBpm: number) {
        setBpm(newBpm);
        if (onBpmChange) onBpmChange(newBpm);
        // no more actions required: scheduler will pick up the new bpm when computing secsPerBeat
    }

    return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <div>
        <button onClick={() => changeBpm(Math.max(20, bpm - 1))}>-</button>
        <span style={{ margin: "0 10px", minWidth: 72, display: "inline-block", textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{bpm} BPM</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{running ? "playing" : "stopped"}</div>
        </span>
        <button onClick={() => changeBpm(Math.min(300, bpm + 1))}>+</button>
      </div>

      <div>
        <input
          type="range"
          min={30}
          max={240}
          value={bpm}
          onChange={(e) => changeBpm(Number(e.target.value))}
        />
      </div>

      <div>
        {!running ? (
          <button onClick={start}>Play Metronome</button>
        ) : (
          <button onClick={stop}>Stop Metronome</button>
        )}
      </div>
    </div>
  );

}