import type { ReactNode } from "react";

import { SoundShowcase } from "../SoundShowcase";

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
  const introClass = [
    "flex min-w-0 flex-col",
    mirrored ? "lg:border-l lg:border-line lg:pl-20" : "lg:pr-20",
  ].join(" ");

  const panelClass = [
    "flex w-full max-w-[420px] flex-col justify-self-center lg:max-w-none lg:justify-self-stretch",
    mirrored ? "" : "lg:border-l lg:border-line lg:pl-20",
  ].join(" ");

  return (
    <div className="flex min-h-screen flex-col bg-canvas font-sans leading-normal text-ink">
      <header className="flex h-16 items-center justify-between gap-4 border-b border-line px-5 sm:px-10 md:h-[72px] lg:px-16">
        <div className="flex items-center gap-3 text-xl font-normal tracking-[-0.01em] md:text-[22px]">
          <svg className="fill-accent" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="1" y="9" width="2" height="6" rx="1" />
            <rect x="5" y="5" width="2" height="14" rx="1" />
            <rect x="9" y="2" width="2" height="20" rx="1" />
            <rect x="13" y="6" width="2" height="12" rx="1" />
            <rect x="17" y="4" width="2" height="16" rx="1" />
            <rect x="21" y="9" width="2" height="6" rx="1" />
          </svg>
          <span>Harmonix</span>
        </div>
        <span className="inline-flex items-center gap-2 text-[13px] text-muted md:text-sm">
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

      <main className="mx-auto grid w-full max-w-[1200px] flex-1 grid-cols-1 items-start gap-12 px-5 py-10 sm:px-10 lg:grid-cols-2 lg:items-center lg:gap-0 lg:px-16 lg:py-24">
        <section className={introClass}>
          <p className="m-0 inline-flex items-center gap-4 font-mono text-xs tracking-[0.14em] text-accent uppercase before:h-px before:w-6 before:bg-accent before:content-['']">
            Your personal soundspace
          </p>
          <h2 className="m-0 mt-6 text-[clamp(40px,4.6vw,56px)] leading-[1.12] font-normal tracking-[-0.02em] text-ink">
            {introTitle}
          </h2>
          <p className="m-0 mt-6 mb-8 max-w-[440px] text-[17px] text-muted lg:mb-10">{introCopy}</p>

          <SoundShowcase title={showcaseTitle} />

          <p className="m-0 mt-8 inline-flex items-center gap-2.5 text-sm text-muted">
            <svg className="shrink-0 text-accent" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

        <section className={panelClass}>{children}</section>
      </main>

      <footer className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border-t border-line px-5 py-4 font-mono text-xs tracking-[0.04em] text-muted sm:justify-between sm:px-10 lg:px-16">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
          All systems in harmony
        </span>
        <span className="text-center font-sans text-[13px] tracking-normal text-muted">
          Your sound. Your space. Only you can access your audio.
        </span>
        <span className="w-full text-center text-subtle uppercase sm:w-auto">Harmonix / v.2.4</span>
      </footer>
    </div>
  );
}
