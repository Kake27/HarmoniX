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

export class ApiError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function apiRequest<T>(path: string): Promise<T> {
  // Get the current Supabase session, including its latest access token.
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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    let message = `API request failed (${response.status})`;

    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) {
        message = body.detail;
      }
    } catch {
      // Keep the default message if the response isn't JSON.
    }

    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}

export const api = {
  getMyProfile(): Promise<UserProfile> {
    return apiRequest<UserProfile>("/users/me");
  },
};