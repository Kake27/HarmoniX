import { LoaderCircle, Mail, CalendarDays, Fingerprint, User } from "lucide-react";

import { formatShortDate } from "../../lib/format";
import type { UserProfile } from "../../services/api";

interface ProfilePanelProps {
  profile: UserProfile | null;
  loading: boolean;
  error: string;
  initials: string;
  onRetry: () => void;
}

export function ProfilePanel({ profile, loading, error, initials, onRetry }: ProfilePanelProps) {
  if (loading && !profile) {
    return (
      <div role="status" className="flex items-center justify-center gap-3 rounded-2xl border border-line bg-panel px-6 py-20 text-sm text-muted">
        <LoaderCircle className="h-4 w-4 animate-spin text-accent" />
        Loading your profile...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div role="alert" className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-panel px-6 py-16 text-center">
        <p className="text-sm text-danger">{error || "Could not load your profile."}</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-field-line px-4 py-2 text-sm text-ink transition-colors hover:border-field-hover hover:bg-white/5"
        >
          Try again
        </button>
      </div>
    );
  }

  const details = [
    { icon: User, label: "Name", value: profile.name || "Not set" },
    { icon: Mail, label: "Email", value: profile.email },
    { icon: Fingerprint, label: "User ID", value: profile.id, mono: true },
    { icon: CalendarDays, label: "Member since", value: formatShortDate(profile.created_at) },
  ];

  return (
    <section aria-labelledby="profile-heading" className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-subtle">Your account</p>
        <h1 id="profile-heading" className="mt-2 text-4xl font-medium tracking-tight text-ink sm:text-5xl">
          Profile
        </h1>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-panel">
        <div className="flex items-center gap-5 border-b border-line px-6 py-6">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 font-mono text-lg uppercase text-accent">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-medium text-ink">{profile.name || "Not set"}</p>
            <p className="truncate text-sm text-muted">{profile.email}</p>
          </div>
        </div>

        <dl className="divide-y divide-line">
          {details.map(({ icon: Icon, label, value, mono }) => (
            <div key={label} className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:gap-6">
              <dt className="flex w-40 shrink-0 items-center gap-2 text-sm text-subtle">
                <Icon className="h-4 w-4" />
                {label}
              </dt>
              <dd className={`min-w-0 break-all text-sm text-ink ${mono ? "font-mono text-xs sm:text-sm" : ""}`}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
