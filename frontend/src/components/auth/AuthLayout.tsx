import type { ReactNode } from "react";
import { SoundShowcase } from "../SoundShowcase";

import "./AuthLayout.css";
import "./AuthForm.css";

type AuthLayoutProps = {
  introTitle: ReactNode;
  introCopy: string;
  showcaseTitle: string;
  mirrored?: boolean;
  children: ReactNode;
};

export function AuthLayout({
  introTitle,
  introCopy,
  showcaseTitle,
  mirrored = false,
  children,
}: AuthLayoutProps) {
  return (
    <div className="auth-shell">
      <header className="auth-shell-header">
        <div className="auth-shell-brand">
          <svg className="auth-shell-brand-mark" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="1" y="9" width="2" height="6" rx="1" />
            <rect x="5" y="5" width="2" height="14" rx="1" />
            <rect x="9" y="2" width="2" height="20" rx="1" />
            <rect x="13" y="6" width="2" height="12" rx="1" />
            <rect x="17" y="4" width="2" height="16" rx="1" />
            <rect x="21" y="9" width="2" height="6" rx="1" />
          </svg>
          <span>Harmonix</span>
        </div>
        <span className="auth-shell-help">
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

      <main className={mirrored ? "auth-shell-main auth-shell-main--mirrored" : "auth-shell-main"}>
        <section className="auth-intro">
          <p className="auth-eyebrow auth-eyebrow--accent">Your personal soundspace</p>
          <h2 className="auth-intro-title">{introTitle}</h2>
          <p className="auth-intro-copy">{introCopy}</p>

          <SoundShowcase title={showcaseTitle} />

          <p className="auth-privacy">
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

        {children}
      </main>

      <footer className="auth-shell-footer">
        <span className="auth-status">
          <span className="auth-status-dot" aria-hidden="true" />
          All systems in harmony
        </span>
        <span className="auth-footer-tagline">
          Your sound. Your space. Only you can access your audio.
        </span>
        <span className="auth-version">Harmonix / v.2.4</span>
      </footer>
    </div>
  );
}
