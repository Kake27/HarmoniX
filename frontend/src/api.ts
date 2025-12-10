export type StemName = 'vocals' | 'bass' | 'drums' | 'other';

export interface SeparationResponse {
  jobId: string;
  fileName: string;
  stems: Partial<Record<StemName, string>>;
}

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';

const buildUrl = (path: string) =>
  path.startsWith('http') ? path : `${API_BASE}${path}`;

export async function uploadAndSeparate(
  file: File
): Promise<SeparationResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/api/separate`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to separate audio');
  }

  const data = (await response.json()) as SeparationResponse;
  const stems: Partial<Record<StemName, string>> = {};
  Object.entries(data.stems || {}).forEach(([key, value]) => {
    stems[key as StemName] = buildUrl(value as string);
  });

  return {
    ...data,
    stems,
  };
}

