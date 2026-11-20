import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";

vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

const mockedAuth = vi.mocked(supabase.auth);
const userSession = {
  access_token: "token",
  user: { id: "user-1", email: "listener@example.com" },
} as Session;
let authChange:
  | ((event: string, session: Session | null) => void)
  | undefined;
const unsubscribe = vi.fn();

function AuthProbe() {
  const { user, loading, signOut } = useAuth();
  const [signOutError, setSignOutError] = useState("");
  return (
    <div>
      <p role="status">{loading ? "loading" : user?.email ?? "signed out"}</p>
      <button
        type="button"
        onClick={() => {
          void signOut().catch((error: unknown) => {
            setSignOutError(error instanceof Error ? error.message : "Sign-out failed");
          });
        }}
      >
        Sign out
      </button>
      {signOutError && <p role="alert">{signOutError}</p>}
    </div>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>,
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authChange = undefined;
    mockedAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    } as never);
    mockedAuth.onAuthStateChange.mockImplementation((callback) => {
      authChange = callback as typeof authChange;
      return {
        data: {
          subscription: { unsubscribe },
        },
      } as never;
    });
  });

  it("restores a persisted session and exposes the current user", async () => {
    mockedAuth.getSession.mockResolvedValue({
      data: { session: userSession },
      error: null,
    } as never);

    renderProvider();

    expect(screen.getByRole("status")).toHaveTextContent("loading");
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("listener@example.com");
    });
  });

  it("updates session state when Supabase emits an auth change", async () => {
    let resolveSession!: (value: { data: { session: null }; error: null }) => void;
    mockedAuth.getSession.mockReturnValue(
      new Promise((resolve) => {
        resolveSession = resolve;
      }) as never,
    );
    renderProvider();

    await act(async () => {
      authChange?.("SIGNED_IN", userSession);
    });
    expect(screen.getByRole("status")).toHaveTextContent("listener@example.com");

    await act(async () => {
      resolveSession({ data: { session: null }, error: null });
    });
  });

  it("returns to signed-out state and logs a session restoration error", async () => {
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockedAuth.getSession.mockResolvedValue({
      data: { session: userSession },
      error: { message: "session expired" },
    } as never);

    renderProvider();

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("signed out");
    });
    expect(logError).toHaveBeenCalledWith(
      "Could not restore Supabase session:",
      "session expired",
    );
  });

  it("handles rejected session initialization without leaving loading active", async () => {
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockedAuth.getSession.mockRejectedValue(new Error("storage unavailable"));

    renderProvider();

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("signed out");
    });
    expect(logError).toHaveBeenCalledWith(
      "Session initialization failed:",
      expect.any(Error),
    );
  });

  it("unsubscribes from auth changes when the provider unmounts", () => {
    const { unmount } = renderProvider();

    unmount();

    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("does not update state when session restoration resolves after unmount", async () => {
    let resolveSession!: (value: { data: { session: Session }; error: null }) => void;
    mockedAuth.getSession.mockReturnValue(
      new Promise((resolve) => {
        resolveSession = resolve;
      }) as never,
    );
    const { unmount } = renderProvider();
    unmount();

    await act(async () => {
      resolveSession({ data: { session: userSession }, error: null });
    });

    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("calls Supabase sign-out and propagates errors to its caller", async () => {
    mockedAuth.signOut.mockResolvedValue({ error: null } as never);
    renderProvider();

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("signed out"));
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(mockedAuth.signOut).toHaveBeenCalledOnce());

    mockedAuth.signOut.mockResolvedValue({
      error: new Error("sign out failed"),
    } as never);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("sign out failed");
    });
    expect(mockedAuth.signOut).toHaveBeenCalledTimes(2);
  });
});
