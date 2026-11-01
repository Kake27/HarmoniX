import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AuthLayout } from "../components/auth/AuthLayout";
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
      <section className="auth-panel">
        <p className="auth-eyebrow">Get in Harmonix</p>
        <h1 className="auth-title">Create your account.</h1>
        <p className="auth-subtitle">A space for your sound. A new way to hear it.</p>

        <form onSubmit={handleSubmit} className="auth-fields">
          <div className="auth-field">
            <label className="auth-label" htmlFor="name">Name</label>
            <input
              className="auth-input"
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="email">Email</label>
            <input
              className="auth-input"
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="password">Password</label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="Create a password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
            <p className="auth-hint">Use at least 8 characters.</p>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="confirm-password">Confirm password</label>
            <input
              className="auth-input"
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder="Enter your password again"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
            />
          </div>

          {error && (
            <p className="auth-message auth-message--error" role="alert">
              {error}
            </p>
          )}

          {message && (
            <p className="auth-message auth-message--success" role="status">
              {message}
            </p>
          )}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="auth-legal">
          By signing up, you agree to our <span className="auth-legal-link">Terms of Service</span>{" "}
          and <span className="auth-legal-link">Privacy Policy</span>.
        </p>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </section>
    </AuthLayout>
  );
}
