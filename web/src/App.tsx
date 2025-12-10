import { useState } from 'react'
import UploadForm from './components/UploadForm'
import { detectScale, transposeTrack, pollJobStatus } from './services/api'


type Candidate = {
  rank: number,
  tonic_ind: number,
  tonic_name_sharp: string;
  tonic_name_flat: string;
  mode: string;
  score: number;
  gap_to_next: number;
}

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function App() {
  const [uploaded, setUploaded] = useState<{ track_id: string; filename: string } | null>(null);
  const [loadingDetect, setLoadingDetect] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [detectedIndex, setDetectedIndex] = useState<number | null>(null);
  const [detectedMode, setDetectedMode] = useState<string | null>(null);
  const [offset, setOffset] = useState<number>(0); // semitone offset from detected tonic
  const [applyingTranspose, setApplyingTranspose] = useState(false);
  const [jobProgressText, setJobProgressText] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);

  async function onUploaded(info: { track_id: string; filename: string }) {
    setUploaded(info);
    setCandidates(null);
    setError(null);
    setDetectedIndex(null);
    setDetectedMode(null);
    setOffset(0);
    setProcessedUrl(null);
  }

  async function handleDetect() {
    // console.log(uploaded)
    if (!uploaded) return;
    setLoadingDetect(true);
    setError(null);
    setCandidates(null);
    setDetectedIndex(null);
    try {
      const res = await detectScale(uploaded.track_id, 3);
      // backend returns { track_id, candidates, meta }
      setCandidates(res.candidates ?? null);

      if (res.candidates && res.candidates.length > 0) {
        const best = res.candidates[0];
        setDetectedIndex(best.tonic_index);
        setDetectedMode(best.mode);
        setOffset(0); // reset offset
      }

    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Detection failed");
    } finally {
      setLoadingDetect(false);
    }
  }

  function displayedNote() {
    if (detectedIndex === null) return "--";
    const idx = mod12(detectedIndex + offset);
    return NOTES[idx];
  }

  function mod12(n: number) {
    const m = ((n % 12) + 12) % 12;
    return m;
  }

  function handleInc() {
    setOffset((o) => o + 1);
    setProcessedUrl(null);
  }
  function handleDec() {
    setOffset((o) => o - 1);
    setProcessedUrl(null);
  }

  async function handleApplyTranspose() {
    if (!uploaded || detectedIndex === null) return;
    setApplyingTranspose(true);
    setJobProgressText("queuing...");
    setError(null);
    setProcessedUrl(null);

    try {
      // semitone offset is the exact number to shift
      const semitones = offset;
      const resp = await transposeTrack(uploaded.track_id, semitones);
      setJobProgressText("started job: " + resp.job_id);

      // poll until done
      const final = await pollJobStatus(resp.job_id, 1200, 5 * 60 * 1000);
      if (final.status === "done" && final.processed_url) {
        // processed_url is like /media/processed/filename.wav
        // convert to absolute URL relative to API base
        const apiBase = (import.meta.env.VITE_API_BASE || "http://localhost:8000").replace(/\/$/, "");
        const url = final.processed_url.startsWith("http")
          ? final.processed_url
          : apiBase + final.processed_url;
        setProcessedUrl(url);
        setJobProgressText(null);
      } else {
        setError(final.error || "Transposition failed");
        setJobProgressText(null);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Transpose failed");
      setJobProgressText(null);
    } finally {
      setApplyingTranspose(false);
    }
  }

  return (
    <div className="app">
      <h1>HarmoniX — Upload, Detect & Transpose</h1>

      <section className="card">
        <UploadForm onUploaded={onUploaded} />
      </section>

      {uploaded && (
        <section className="card">
          <div>
            <strong>Uploaded:</strong> {uploaded.filename}
          </div>

          <div style={{ marginTop: 8 }}>
            <button onClick={handleDetect} disabled={loadingDetect}>
              {loadingDetect ? "Detecting..." : "Detect Scale"}
            </button>
          </div>

          {candidates && (
            <div style={{ marginTop: 10 }}>
              <h4>Top candidates</h4>
              <ol>
                {candidates.map((c) => (
                  <li key={c.rank}>
                    <strong>{c.tonic_name_sharp}</strong> {c.mode} — score: {c.score.toFixed(3)}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      )}

      {/* Transpose control */}
      {detectedIndex !== null && (
        <section className="card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div>
            <small>Detected key (best):</small>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
              <button onClick={handleDec} disabled={applyingTranspose}>
                ←
              </button>

              <div style={{ minWidth: 120, textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 600 }}>{displayedNote()}</div>
                <div style={{ fontSize: 13, opacity: 0.8 }}>{detectedMode}</div>
                <div style={{ marginTop: 6, fontSize: 12 }}>offset: {offset} semitone{Math.abs(offset) !== 1 ? "s" : ""}</div>
              </div>

              <button onClick={handleInc} disabled={applyingTranspose}>
                →
              </button>
            </div>
          </div>

          <div style={{ marginLeft: "auto" }}>
            <button onClick={handleApplyTranspose} disabled={applyingTranspose}>
              {applyingTranspose ? "Processing..." : "Apply Transpose"}
            </button>
            {jobProgressText && <div style={{ marginTop: 8, fontSize: 13 }}>{jobProgressText}</div>}
            {processedUrl && (
              <div style={{ marginTop: 8 }}>
                <audio controls src={processedUrl} />
                <div style={{ marginTop: 6 }}>
                  <a href={processedUrl} target="_blank" rel="noreferrer">
                    Open processed audio
                  </a>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {error && (
        <section className="card" style={{ color: "crimson" }}>
          <strong>Error:</strong> {error}
        </section>
      )}
    </div>
  )
}

export default App
