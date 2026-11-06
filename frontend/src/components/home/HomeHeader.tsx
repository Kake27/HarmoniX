import { AudioLines, Library, User, type LucideIcon } from "lucide-react";

import { UserMenu } from "./UserMenu";

export type HomeTab = "library" | "profile";

interface HomeHeaderProps {
  activeTab: HomeTab;
  onTabChange: (tab: HomeTab) => void;
  name: string;
  email: string;
  initials: string;
  signingOut: boolean;
  onSignOut: () => void;
}

const TABS: { id: HomeTab; label: string; icon: LucideIcon }[] = [
  { id: "library", label: "Library", icon: Library },
  { id: "profile", label: "Profile", icon: User },
];

export function HomeHeader({
  activeTab,
  onTabChange,
  name,
  email,
  initials,
  signingOut,
  onSignOut,
}: HomeHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-5 sm:px-8">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2.5">
            <AudioLines className="h-6 w-6 text-accent" strokeWidth={2.25} />
            <span className="text-lg font-medium tracking-tight text-ink">Harmonix</span>
          </div>

          <nav className="flex h-16 items-stretch gap-1" aria-label="Main">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onTabChange(id)}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center gap-2 border-0 bg-transparent px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    active ? "text-accent" : "text-muted hover:text-ink"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  <span
                    className={`absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent transition-transform duration-300 ${
                      active ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </button>
              );
            })}
          </nav>
        </div>

        <UserMenu
          name={name}
          email={email}
          initials={initials}
          signingOut={signingOut}
          onSignOut={onSignOut}
        />
      </div>
    </header>
  );
}
