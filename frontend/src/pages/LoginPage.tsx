import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { AuthLayout } from "../components/auth/AuthLayout";
import {
  AuthField,
  AuthInput,
  AuthMessage,
  AuthPanelHeading,
  AuthSubmit,
  AuthSwitch,
} from "../components/auth/AuthFormControls";
import { PasswordInput } from "../components/auth/PasswordInput";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectTo =
    (location.state as { from?: string } | null)?.from ?? "/";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      navigate(redirectTo, { replace: true });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      introTitle={
        <>
          Pick up where
          <br />
          your sound left off.
        </>
      }
      introCopy="Your library, your discoveries, your next idea. All right where you left them."
      showcaseTitle="Midnight drive"
    >
      <AuthPanelHeading
        eyebrow="Back in harmony"
        title="Welcome back."
        subtitle="Log in to explore your sound again."
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <AuthField label="Email" htmlFor="email">
          <AuthInput
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </AuthField>

        <AuthField label="Password" htmlFor="password">
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </AuthField>

        {error && (
          <AuthMessage tone="error" role="alert">
            {error}
          </AuthMessage>
        )}

        <AuthSubmit disabled={loading}>
          {loading ? "Logging in..." : "Log in"}
        </AuthSubmit>
      </form>

      <AuthSwitch prompt="New to Harmonix?" to="/signup" label="Sign up" />
    </AuthLayout>
  );
}
