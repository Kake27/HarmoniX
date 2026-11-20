import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProtectedRoute } from "./ProtectedRoute";
import { PublicRoute } from "./PublicRoute";
import { useAuth } from "../contexts/AuthContext";

vi.mock("../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function LocationProbe() {
  const location = useLocation();
  const state = location.state as { from?: string } | null;
  return <output data-testid="location">{`${location.pathname}|${state?.from ?? ""}`}</output>;
}

describe("route guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading state instead of rendering protected content", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: true,
      signOut: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/private"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/private" element={<p>Private content</p>} />
          </Route>
          <Route path="/login" element={<p>Login page</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Checking your session...")).toBeInTheDocument();
    expect(screen.queryByText("Private content")).not.toBeInTheDocument();
  });

  it("redirects signed-out visitors to login and remembers the requested path", async () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signOut: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/private/audio-1"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/private/:audioId" element={<p>Private content</p>} />
          </Route>
          <Route
            path="/login"
            element={
              <>
                <p>Login page</p>
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/login|/private/audio-1",
    );
  });

  it("renders protected content for an authenticated user", () => {
    mockedUseAuth.mockReturnValue({
      user: { id: "user-1" } as never,
      session: null,
      loading: false,
      signOut: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/private"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/private" element={<p>Private content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Private content")).toBeInTheDocument();
  });

  it("allows signed-out visitors through public routes", () => {
    mockedUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signOut: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/signup"]}>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/signup" element={<p>Sign-up page</p>} />
          </Route>
          <Route path="/" element={<p>Home page</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Sign-up page")).toBeInTheDocument();
  });

  it("redirects authenticated users away from login and signup", async () => {
    mockedUseAuth.mockReturnValue({
      user: { id: "user-1" } as never,
      session: null,
      loading: false,
      signOut: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<p>Login page</p>} />
          </Route>
          <Route path="/" element={<p>Home page</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Home page")).toBeInTheDocument();
    });
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
  });
});
