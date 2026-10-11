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

export interface AnalyserResult {
  status: "success" | "failed";
  data: Record<string, unknown> | null;
  error: string | null;
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

export const api = {
  getMyProfile(): Promise<UserProfile> {
    return apiRequest<UserProfile>("/users/me");
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
