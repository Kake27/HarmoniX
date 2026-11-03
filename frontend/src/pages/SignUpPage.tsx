import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

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

export default function SignupPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (data.session) {
        // Email confirmation is disabled, or Supabase returned
        // an active session immediately.
        navigate("/", { replace: true });
      } else {
        // Common when email confirmation is enabled.
        setMessage(
          "Account created! Check your email to confirm your account, then sign in.",
        );
      }
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
          Every sound
          <br />
          has a story.
        </>
      }
      introCopy="Find what’s inside yours. Explore tempo, key, and the details that make your audio."
      showcaseTitle="Shantabai"
    >
      <AuthPanelHeading
        eyebrow="Get in Harmonix"
        title="Create your account."
        subtitle="A space for your sound. A new way to hear it."
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <AuthField label="Name" htmlFor="name">
          <AuthInput
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Your name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
            required
          />
        </AuthField>

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

        <AuthField label="Password" htmlFor="password" hint="Use at least 8 characters.">
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="Create a password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
        </AuthField>

        <AuthField label="Confirm password" htmlFor="confirm-password">
          <AuthInput
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="Enter your password again"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={8}
            required
          />
        </AuthField>

        {error && (
          <AuthMessage tone="error" role="alert">
            {error}
          </AuthMessage>
        )}

        {message && (
          <AuthMessage tone="success" role="status">
            {message}
          </AuthMessage>
        )}

        <AuthSubmit disabled={loading}>
          {loading ? "Creating account..." : "Sign up"}
        </AuthSubmit>
      </form>

      <p className="m-0 mt-6 text-center text-[13px] leading-[1.6] text-muted">
        By signing up, you agree to our{" "}
        <span className="text-ink underline underline-offset-[3px]">Terms of Service</span> and{" "}
        <span className="text-ink underline underline-offset-[3px]">Privacy Policy</span>.
      </p>

      <AuthSwitch prompt="Already have an account?" to="/login" label="Log in" />
    </AuthLayout>
  );
}
