import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LoginPage from "./LoginPage";
import SignupPage from "./SignUpPage";
import { supabase } from "../lib/supabase";

vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  },
}));

const mockedAuth = vi.mocked(supabase.auth);

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

function renderLogin(initialState?: { from?: string }) {
  return render(
    <MemoryRouter
      initialEntries={[
        initialState
          ? { pathname: "/login", state: initialState }
          : "/login",
      ]}
    >
      <Routes>
        <Route
          path="/login"
          element={
            <>
              <LoginPage />
              <LocationProbe />
            </>
          }
        />
        <Route path="/signup" element={<p>Sign-up page</p>} />
        <Route path="/" element={<p>Home page</p>} />
        <Route path="/audio/:audioId" element={<p>Audio detail page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderSignup() {
  return render(
    <MemoryRouter initialEntries={["/signup"]}>
      <Routes>
        <Route
          path="/signup"
          element={
            <>
              <SignupPage />
              <LocationProbe />
            </>
          }
        />
        <Route path="/login" element={<p>Login page</p>} />
        <Route path="/" element={<p>Home page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function fillLoginForm(email = " listener@example.com ", password = "password123") {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: password },
  });
}

function fillSignupForm({
  name = " Listener ",
  email = " listener@example.com ",
  password = "password123",
  confirmPassword = password,
}: {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
} = {}) {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: name } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: confirmPassword },
  });
}

describe("login and signup pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAuth.signInWithPassword.mockResolvedValue({ error: null } as never);
    mockedAuth.signUp.mockResolvedValue({
      data: { session: null },
      error: null,
    } as never);
  });

  it("trims login email and returns to the originally requested page", async () => {
    renderLogin({ from: "/audio/track-1" });
    fillLoginForm();

    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => {
      expect(mockedAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "listener@example.com",
        password: "password123",
      });
    });
    expect(await screen.findByText("Audio detail page")).toBeInTheDocument();
  });

  it("shows Supabase login errors and allows a later retry", async () => {
    mockedAuth.signInWithPassword
      .mockResolvedValueOnce({ error: { message: "Invalid credentials" } } as never)
      .mockResolvedValueOnce({ error: null } as never);
    renderLogin();
    fillLoginForm();

    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid credentials",
    );

    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(mockedAuth.signInWithPassword).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Home page")).toBeInTheDocument();
  });

  it("shows a generic login message when the auth call rejects", async () => {
    mockedAuth.signInWithPassword.mockRejectedValue(new Error("network details"));
    renderLogin();
    fillLoginForm();

    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent("network details");
  });

  it("disables login submission while the request is pending", async () => {
    let finishLogin!: (value: { error: null }) => void;
    mockedAuth.signInWithPassword.mockReturnValue(
      new Promise((resolve) => {
        finishLogin = resolve;
      }) as never,
    );
    renderLogin();
    fillLoginForm();

    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(screen.getByRole("button", { name: "Logging in..." })).toBeDisabled();
    finishLogin({ error: null });
    expect(await screen.findByText("Home page")).toBeInTheDocument();
  });

  it("toggles password visibility accessibly", () => {
    renderLogin();
    const password = screen.getByLabelText("Password") as HTMLInputElement;

    expect(password.type).toBe("password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(password.type).toBe("text");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("validates password length and confirmation before calling Supabase", async () => {
    renderSignup();
    fillSignupForm({ password: "short", confirmPassword: "different" });

    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Password must contain at least 8 characters.",
    );
    expect(mockedAuth.signUp).not.toHaveBeenCalled();

    fillSignupForm({
      password: "password123",
      confirmPassword: "password456",
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Passwords do not match.",
    );
    expect(mockedAuth.signUp).not.toHaveBeenCalled();
  });

  it("trims signup identity fields and displays email-confirmation guidance", async () => {
    renderSignup();
    fillSignupForm();

    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    await waitFor(() => {
      expect(mockedAuth.signUp).toHaveBeenCalledWith({
        email: "listener@example.com",
        password: "password123",
        options: {
          data: { full_name: "Listener" },
          emailRedirectTo: window.location.origin,
        },
      });
    });
    expect(await screen.findByText(/Check your email to confirm your account/)).toBeInTheDocument();
  });

  it("navigates immediately when signup returns an active session", async () => {
    mockedAuth.signUp.mockResolvedValue({
      data: { session: { access_token: "token" } },
      error: null,
    } as never);
    renderSignup();
    fillSignupForm();

    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByText("Home page")).toBeInTheDocument();
  });

  it("shows signup API errors and sanitizes unexpected exceptions", async () => {
    mockedAuth.signUp.mockResolvedValueOnce({
      data: { session: null },
      error: { message: "Email already registered" },
    } as never);
    renderSignup();
    fillSignupForm();
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email already registered",
    );

    mockedAuth.signUp.mockRejectedValue(new Error("internal network detail"));
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent(
      "internal network detail",
    );
  });
});
