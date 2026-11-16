import type { ReactNode } from "react";

interface PanelCardProps {
  title: string;
  headingId: string;
  /** Right side of the heading row: an icon or a small action. */
  aside?: ReactNode;
  describedBy?: string;
  className?: string;
  children: ReactNode;
}

export function PanelCard({ title, headingId, aside, describedBy, className = "", children }: PanelCardProps) {
  return (
    <section
      aria-labelledby={headingId}
      aria-describedby={describedBy}
      className={`flex min-w-0 flex-col gap-5 rounded-xl border border-line bg-panel p-5 transition-colors hover:border-field-line sm:p-6 ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 id={headingId} className="m-0 text-lg font-normal text-ink">
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}
