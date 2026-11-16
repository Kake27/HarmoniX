/** Shared Tailwind class recipes for the audio detail workspace. */

export const PAGE_CONTAINER = "mx-auto w-full max-w-[1440px] px-5 sm:px-8 xl:px-12";

export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

export const EYEBROW = "m-0 font-mono text-[10px] font-normal uppercase tracking-[0.1em] text-muted";

export const ICON_BUTTON = `flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line text-muted transition-colors hover:border-field-line-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`;

export const SECONDARY_BUTTON = `inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-raised text-ink transition-colors hover:border-field-line-hover hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`;

export const PRIMARY_BUTTON = `inline-flex items-center justify-center gap-2 rounded-lg bg-accent font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`;

export const TEXT_BUTTON = `rounded-sm text-[11px] text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-muted ${FOCUS_RING}`;

export const ALERT_BOX =
  "flex flex-col gap-3 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger sm:flex-row sm:items-center sm:justify-between";

export const ALERT_ACTION = `shrink-0 rounded-md border border-danger/40 px-3 py-1.5 text-xs text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`;
