import { useState } from 'react'
import UploadForm from './components/UploadForm'
import { detectScale } from './services/api'


type Candidate = {
  rank: number,
  tonic_ind: number,
  tonic_name_sharp: string;
  tonic_name_flat: string;
  mode: string;
  score: number;
  gap_to_next: number;
}


function App() {
  const [uploaded, setUploaded] = useState<{ track_id: string; filename: string } | null>(null);
  const [loadingDetect, setLoadingDetect] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onUploaded(info: { track_id: string; filename: string }) {
    setUploaded(info);
    setCandidates(null);
    setError(null);
  }

  async function handleDetect() {
    if (!uploaded) return;
    setLoadingDetect(true);
    setError(null);
    try {
      const res = await detectScale(uploaded.track_id, 3);
      // backend returns { track_id, candidates, meta }
      setCandidates(res.candidates ?? null);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Detection failed");
    } finally {
      setLoadingDetect(false);
    }
  }

  return (
    <div className="app">
      <h1>HarmoniX — Upload & Detect Scale</h1>

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
        </section>
      )}

      {error && (
        <section className="card error">
          <strong>Error:</strong> {error}
        </section>
      )}

      {candidates && (
        <section className="card">
          <h3>Top candidates</h3>
          <ol>
            {candidates.map((c) => (
              <li key={c.rank}>
                <strong>{c.tonic_name_sharp}</strong> {c.mode} — score: {c.score.toFixed(3)} gap:{" "}
                {c.gap_to_next.toFixed(3)}
              </li>
            ))}
          </ol>
        </section>
      )}

      <footer style={{ marginTop: 24, fontSize: 13, opacity: 0.8 }}>
        Backend expected at <code>http://localhost:8000</code> and endpoints:
        <code>/api/v1/upload</code> and <code>/api/v1/detect?track_id=&lt;id&gt;</code>
      </footer>
    </div>
  )
}

export default App
