import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";

interface UserMenuProps {
  name: string;
  email: string;
  initials: string;
  signingOut: boolean;
  onSignOut: () => void;
}

export function UserMenu({ name, email, initials, signingOut, onSignOut }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="group flex items-center gap-3 rounded-full border-0 bg-transparent py-1 pl-1 pr-2 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 font-mono text-xs uppercase text-accent">
          {initials}
        </span>
        <span className="hidden max-w-[160px] truncate text-sm text-ink sm:block">{name}</span>
        <ChevronDown
          className={`h-4 w-4 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-64 origin-top-right animate-menu-in rounded-xl border border-line bg-panel p-2 shadow-2xl shadow-black/50"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-ink">{name}</p>
            <p className="truncate text-xs text-subtle">{email}</p>
          </div>
          <div className="my-1 h-px bg-line" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            disabled={signingOut}
            className="flex w-full items-center gap-3 rounded-lg border-0 bg-transparent px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-white/5 hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            {signingOut ? "Logging out..." : "Log out"}
          </button>
        </div>
      )}
    </div>
  );
}
