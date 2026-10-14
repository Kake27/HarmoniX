import { supabase } from "../lib/supabase";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "");

if (!API_BASE_URL) {
  throw new Error("Missing VITE_API_BASE_URL in frontend/.env");
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export interface UploadedAudio {
  id: string;
  original_filename: string;
  file_format: string;
  file_size_bytes: number;
  status: string;
}

export type AnalysisStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "PARTIAL"
  | "FAILED";

export interface AudioLibraryItem {
  id: string;
  original_filename: string;
  file_format: string;
  file_size_bytes: number;
  duration: number | null;
  sample_rate: number | null;
  channels: number | null;
  status: string;
  created_at: string;
  analysis_status: AnalysisStatus;
  bpm: number | null;
  musical_key: string | null;
  mode: string | null;
}

export interface AudioLibraryResponse {
  items: AudioLibraryItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface AnalyserResult {
  status: "success" | "failed";
  data: Record<string, unknown> | null;
  error: string | null;
}

export interface PersistedAnalysis {
  status: AnalysisStatus;
  analysis_version: string;
  created_at: string;
  bpm: number | null;
  musical_key: string | null;
  mode: string | null;
  error_message: string | null;
  results: Record<string, AnalyserResult> | null;
}

export interface AudioDetailResponse extends AudioLibraryItem {
  user_id: string;
  parent_audio_id: string | null;
  analysis: PersistedAnalysis | null;
}

export interface AnalysisResponse {
  filename: string;
  duration_seconds: number;
  sample_rate: number;
  results: Record<string, AnalyserResult>;
}

export interface BPMData {
  bpm: number;
  detected_beats: number;
  duration_seconds: number;
  method: string;
  note?: string;
}

export interface MusicalKeyData {
  key: string;
  mode: string;
  scale: string;
  label: string;
  correlation_score: number;
  runner_up: string;
  score_margin: number;
  method: string;
  note?: string;
}

export class ApiError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error("Could not retrieve your authentication session.");
  }

  if (!session?.access_token) {
    throw new ApiError("Please sign in to continue.", 401);
  }

  return session.access_token;
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();

    if (typeof body === "object" && body !== null && "detail" in body) {
      const detail = (body as { detail?: unknown }).detail;
      if (typeof detail === "string") return detail;

      if (
        typeof detail === "object" &&
        detail !== null &&
        "message" in detail &&
        typeof (detail as { message?: unknown }).message === "string"
      ) {
        return (detail as { message: string }).message;
      }

      if (detail !== undefined) return JSON.stringify(detail);
    }

    return `API request failed (${response.status}).`;
  } catch {
    return `API request failed (${response.status}).`;
  }
}

async function apiRequest<T>(path: string): Promise<T> {
  const token = await getAccessToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new ApiError(await getErrorMessage(response), response.status);
  }

  return (await response.json()) as T;
}

async function apiDeleteRequest(path: string): Promise<void> {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new ApiError(await getErrorMessage(response), response.status);
  }
}

async function apiFormRequest<T>(path: string, formData: FormData): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: formData,
  });

  if (!response.ok) {
    throw new ApiError(await getErrorMessage(response), response.status);
  }

  return (await response.json()) as T;
}

export const api = {
  getMyProfile(): Promise<UserProfile> {
    return apiRequest<UserProfile>("/users/me");
  },

  uploadAudio(file: File): Promise<UploadedAudio> {
    const formData = new FormData();
    formData.append("file", file);
    return apiFormRequest<UploadedAudio>("/audio", formData);
  },

  listAudio(limit = 50, offset = 0): Promise<AudioLibraryResponse> {
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    return apiRequest<AudioLibraryResponse>(`/audio?${params.toString()}`);
  },

  getAudio(audioId: string): Promise<AudioDetailResponse> {
    return apiRequest<AudioDetailResponse>(`/audio/${encodeURIComponent(audioId)}`);
  },

  deleteAudio(audioId: string): Promise<void> {
    return apiDeleteRequest(`/audio/${encodeURIComponent(audioId)}`);
  },

  analyseStoredAudio(audioId: string): Promise<AnalysisResponse> {
    const formData = new FormData();
    formData.append("audio_id", audioId);
    return apiFormRequest<AnalysisResponse>("/analyse", formData);
  },

  async analyseAudio(file: File): Promise<AnalysisResponse> {
    const token = await getAccessToken();
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_BASE_URL}/analyse`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      // Do not set Content-Type manually; the browser supplies the multipart boundary.
      body: formData,
    });

    if (!response.ok) {
      throw new ApiError(await getErrorMessage(response), response.status);
    }

    return (await response.json()) as AnalysisResponse;
  },
};
