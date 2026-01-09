import { useState } from "react";
import { detectScale } from "../services/api";

type Candidate = {
  rank: number;
  tonic_ind: number;
  tonic_name_sharp: string;
  tonic_name_flat: string;
  mode: string;
  score: number;
  gap_to_next: number;
}

export function useScaleDetection() {
    const [loading, setLoading] = useState(false)
    const [candidates, setCandidates] = useState<Candidate[] | null>(null)
    const [scaleError, setError] = useState<string | null>(null)

    async function detect(trackId: string) {
    setLoading(true)
    setError(null)

    try {
      const res = await detectScale(trackId, 3)
      setCandidates(res.candidates ?? null)
      return res.candidates?.[0] ?? null
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Detection failed")
      return null
    } finally {
      setLoading(false)
    }
  }

  return { detect, loading, candidates, scaleError }
}