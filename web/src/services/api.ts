type UploadResponse = { track_id: string; filename: string; stored_path: string };
type DetectResponse = { track_id: string; candidates: any[]; meta?: any };
export type TransposeResponse = { job_id: string; status?: string}

export type JobStatus = {
  job_id: string;
  status: "queued" | "processing" | "done" | "error";
  progress?: number;
  out_name?: string;
  processed_url?: string;
  error?: string;
}

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export function uploadFile(file: File, onProgress?: (percent: number) => void): Promise<UploadResponse> {
    return new Promise((resolve, reject) => {
    const url = `${API_BASE}/api/v1/upload`;
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append("file", file);

    xhr.open("POST", url, true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const pct = (e.loaded / e.total) * 100;
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } catch (err) {
          reject(new Error("Invalid JSON response"));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(fd);
  });
}

export async function detectScale(track_id: string, topk=3): Promise<DetectResponse>{
    const url = `${API_BASE}/api/v1/detect`;
    // const body = new URLSearchParams();
    // body.append("track_id", track_id);
    // body.append("topk", String(topk));

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          track_id,
          topk,
          window: 0.0
        }),
    });

    console.log(res);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Scale detection failed: ${res.status} ${text}`);
    }
    const data = await res.json();
    return data as DetectResponse;
}

export async function transposeTrack(track_id: string, semitones: number): Promise<TransposeResponse> {
  const url = `${API_BASE}/api/v1/transpose`

  const res = await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      track_id, semitones
    })
  })

  if(!res.ok) {
    const text = await res.text();
    throw new Error(`Transpose request failed: ${res.status} ${text}`);
  }

  return (await res.json()) as TransposeResponse
}

export async function pollJobStatus(job_id: string, intervalMs = 1500, timeoutMs = 5 * 60 * 1000): Promise<JobStatus> {
  const start = Date.now();

  while (true) {
    const res = await fetch(`${API_BASE}/api/v1/jobs/${encodeURIComponent(job_id)}`);
    
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Job status check failed: ${res.status} ${txt}`);
    }

    const data = (await res.json()) as JobStatus;
    if (data.status === "done" || data.status === "error") {
      return data;
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error("Job polling timed out");
    }
    // wait
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}