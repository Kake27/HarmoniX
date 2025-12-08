type UploadResponse = { track_id: string; filename: string; stored_path: string };
type DetectResponse = { track_id: string; candidates: any[]; meta?: any };

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
    const body = new URLSearchParams();
    body.append("track_id", track_id);
    body.append("topk", String(topk));

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Scale detection failed: ${res.status} ${text}`);
    }
    const data = await res.json();
    return data as DetectResponse;
}