import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { SoundShowcase } from "../components/SoundShowcase";
import { supabase } from "../lib/supabase";

import "./SignUpPage.css";

export default function SignupPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="signup-page">
      <header className="signup-header">
        <div className="signup-brand">
          <svg
            className="signup-brand-mark"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <rect x="1" y="9" width="2" height="6" rx="1" />
            <rect x="5" y="5" width="2" height="14" rx="1" />
            <rect x="9" y="2" width="2" height="20" rx="1" />
            <rect x="13" y="6" width="2" height="12" rx="1" />
            <rect x="17" y="4" width="2" height="16" rx="1" />
            <rect x="21" y="9" width="2" height="6" rx="1" />
          </svg>
          <span>Harmonix</span>
        </div>
        <span className="signup-help">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.6v.6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="12" cy="17" r="1" fill="currentColor" />
          </svg>
          Need a hand?
        </span>
      </header>

      <main className="signup-main">
        <section className="signup-intro">
          <p className="signup-eyebrow signup-eyebrow-accent">Your personal soundspace</p>
          <h2 className="signup-intro-title">
            Every sound
            <br />
            has a story.
          </h2>
          <p className="signup-intro-copy">
            Find what&rsquo;s inside yours. Explore tempo, key, and the details that
            make your audio.
          </p>

          <SoundShowcase />

          <p className="signup-privacy">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3 4.5 5.8v5.6c0 4.6 3.1 8.2 7.5 9.6 4.4-1.4 7.5-5 7.5-9.6V5.8L12 3Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="m9 12 2 2 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Your audio stays yours. Private by default. Always.
          </p>
        </section>

        <section className="signup-panel">
          <p className="signup-eyebrow">Get in Harmonix</p>
          <h1 className="signup-title">Create your account.</h1>
          <p className="signup-subtitle">A space for your sound. A new way to hear it.</p>

          <form onSubmit={handleSubmit} className="signup-form">
            <div className="signup-field">
              <label htmlFor="name">Name</label>
              <input
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

            <div className="signup-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="signup-field">
              <label htmlFor="password">Password</label>
              <div className="signup-password">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="signup-password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                    {showPassword && (
                      <path d="M4 4 20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    )}
                  </svg>
                </button>
              </div>
              <p className="signup-hint">Use at least 8 characters.</p>
            </div>

            <div className="signup-field">
              <label htmlFor="confirm-password">Confirm password</label>
              <input
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
              <p className="signup-message signup-message-error" role="alert">
                {error}
              </p>
            )}

            {message && (
              <p className="signup-message signup-message-success" role="status">
                {message}
              </p>
            )}

            <button type="submit" className="signup-submit" disabled={loading}>
              {loading ? "Creating account..." : "Sign up"}
            </button>
          </form>

          <p className="signup-legal">
            By signing up, you agree to our <span className="signup-legal-link">Terms of Service</span>{" "}
            and <span className="signup-legal-link">Privacy Policy</span>.
          </p>

          <p className="signup-login">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </section>
      </main>

      <footer className="signup-footer">
        <span className="signup-status">
          <span className="signup-status-dot" aria-hidden="true" />
          All systems in harmony
        </span>
        <span className="signup-footer-tagline">
          Your sound. Your space. Only you can access your audio.
        </span>
        <span className="signup-version">Harmonix / v.2.4</span>
      </footer>
    </div>
  );
}
