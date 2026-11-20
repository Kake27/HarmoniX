import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, api } from "./api";
import { supabase } from "../lib/supabase";

vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

const mockedGetSession = vi.mocked(supabase.auth.getSession);
const mockedFetch = vi.fn();

function response(
  status: number,
  body?: unknown,
  overrides: Partial<Response> = {},
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
    blob: vi.fn().mockResolvedValue(new Blob(["shifted audio"])),
    ...overrides,
  } as unknown as Response;
}

function requestAt(index = 0): [RequestInfo | URL, RequestInit] {
  return mockedFetch.mock.calls[index] as [RequestInfo | URL, RequestInit];
}

describe("frontend API client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockedFetch);
    mockedGetSession.mockResolvedValue({
      data: { session: { access_token: "access-token" } },
      error: null,
    } as never);
  });

  it("sends authenticated JSON GET requests and parses the response", async () => {
    const profile = { id: "user-1", email: "listener@example.com", name: null };
    mockedFetch.mockResolvedValue(response(200, profile));

    await expect(api.getMyProfile()).resolves.toEqual(profile);

    const [url, init] = requestAt();
    expect(String(url)).toMatch(/\/users\/me$/);
    expect(init.method).toBe("GET");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer access-token");
    expect(new Headers(init.headers).get("Accept")).toBe("application/json");
    expect(init.body).toBeUndefined();
  });

  it("rejects requests without an access token before making a network call", async () => {
    mockedGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    } as never);

    await expect(api.getMyProfile()).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      message: "Please sign in to continue.",
    });
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("does not make requests when Supabase cannot restore the session", async () => {
    mockedGetSession.mockResolvedValue({
      data: { session: null },
      error: { message: "session unavailable" },
    } as never);

    await expect(api.getMyProfile()).rejects.toThrow(
      "Could not retrieve your authentication session.",
    );
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it.each([
    [{ detail: "Not allowed" }, "Not allowed"],
    [{ detail: { message: "Audio is too large", limit: 50 } }, "Audio is too large"],
    [{ detail: { code: "invalid" } }, '{"code":"invalid"}'],
    [{ message: "No detail field" }, "API request failed (422)."],
  ])("converts API error responses into useful ApiErrors", async (body, message) => {
    mockedFetch.mockResolvedValue(response(422, body));

    await expect(api.getMyProfile()).rejects.toMatchObject({
      name: "ApiError",
      status: 422,
      message,
    });
  });

  it("uses a safe fallback when an error body is not valid JSON", async () => {
    mockedFetch.mockResolvedValue(
      response(503, undefined, {
        json: vi.fn().mockRejectedValue(new SyntaxError("bad json")),
      }),
    );

    await expect(api.getMyProfile()).rejects.toMatchObject({
      status: 503,
      message: "API request failed (503).",
    });
  });

  it("encodes IDs and serializes list and access-url query parameters", async () => {
    mockedFetch
      .mockResolvedValueOnce(response(200, { items: [], total: 0, limit: 7, offset: 3 }))
      .mockResolvedValueOnce(response(200, { id: "a/b", original_filename: "track.wav" }))
      .mockResolvedValueOnce(response(200, { url: "https://signed.example/audio", expires_in: 900 }));

    await api.listAudio(7, 3);
    await api.getAudio("a/b");
    await api.getAudioAccessUrl("a/b", "attachment");

    expect(String(requestAt(0)[0])).toMatch(/\/audio\?limit=7&offset=3$/);
    expect(String(requestAt(1)[0])).toContain("/audio/a%2Fb");
    expect(String(requestAt(2)[0])).toContain(
      "/audio/a%2Fb/access-url?disposition=attachment",
    );
  });

  it("sends upload and stored-analysis data as multipart forms", async () => {
    const file = new File(["audio"], "track.wav", { type: "audio/wav" });
    mockedFetch
      .mockResolvedValueOnce(response(201, { id: "track-1" }))
      .mockResolvedValueOnce(response(200, { filename: "track.wav" }));

    await api.uploadAudio(file);
    await api.analyseStoredAudio("track-1");

    for (const index of [0, 1]) {
      const [, init] = requestAt(index);
      expect(init.method).toBe("POST");
      expect(new Headers(init.headers).get("Authorization")).toBe("Bearer access-token");
      expect(new Headers(init.headers).has("Content-Type")).toBe(false);
      expect(init.body).toBeInstanceOf(FormData);
    }

    expect((requestAt(0)[1].body as FormData).get("file")).toBe(file);
    expect((requestAt(1)[1].body as FormData).get("audio_id")).toBe("track-1");
  });

  it("uploads a direct analysis file without overriding the multipart boundary", async () => {
    const file = new File(["audio"], "track.mp3", { type: "audio/mpeg" });
    mockedFetch.mockResolvedValue(response(200, { filename: "track.mp3" }));

    await api.analyseAudio(file);

    const [, init] = requestAt();
    expect(String(requestAt()[0])).toMatch(/\/analyse$/);
    expect(new Headers(init.headers).get("Accept")).toBe("application/json");
    expect(new Headers(init.headers).has("Content-Type")).toBe(false);
    expect((init.body as FormData).get("file")).toBe(file);
  });

  it("deletes without trying to parse an empty success response", async () => {
    const emptyResponse = response(204, undefined);
    mockedFetch.mockResolvedValue(emptyResponse);

    await expect(api.deleteAudio("track-1")).resolves.toBeUndefined();

    expect(String(requestAt()[0])).toMatch(/\/audio\/track-1$/);
    expect(requestAt()[1].method).toBe("DELETE");
    expect(emptyResponse.json).not.toHaveBeenCalled();
  });

  it("requests a WAV Blob for pitch-shift previews", async () => {
    const preview = new Blob(["shifted"]);
    const blobResponse = response(200, undefined, {
      blob: vi.fn().mockResolvedValue(preview),
    });
    mockedFetch.mockResolvedValue(blobResponse);

    await expect(api.transposeAudio("track-1", -2)).resolves.toBe(preview);

    const [, init] = requestAt();
    expect(String(requestAt()[0])).toMatch(/\/audio\/track-1\/transpose$/);
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Accept")).toBe("audio/wav");
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ semitones: -2 }));
    expect(blobResponse.blob).toHaveBeenCalledOnce();
  });

  it("propagates network failures instead of returning success-shaped fallbacks", async () => {
    mockedFetch.mockRejectedValue(new TypeError("network disconnected"));

    await expect(api.getMyProfile()).rejects.toThrow("network disconnected");
  });

  it("exposes ApiError as the client's typed HTTP error", () => {
    const error = new ApiError("failed", 500);
    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(500);
  });
});
