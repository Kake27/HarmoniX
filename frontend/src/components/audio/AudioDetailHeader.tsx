import { Link } from "react-router-dom";
import { AudioLines } from "lucide-react";

import { UserMenu } from "../home/UserMenu";
import { FOCUS_RING, PAGE_CONTAINER } from "./styles";

interface AudioDetailHeaderProps {
  name: string;
  email: string;
  initials: string;
  signingOut: boolean;
  onSignOut: () => void;
}

export function AudioDetailHeader({ name, email, initials, signingOut, onSignOut }: AudioDetailHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-md">
      <div className={`${PAGE_CONTAINER} flex h-16 items-center justify-between gap-4 sm:h-20`}>
        <Link
          to="/"
          aria-label="Harmonix, go to your library"
          className={`flex items-center gap-2.5 rounded-md text-ink no-underline ${FOCUS_RING}`}
        >
          <AudioLines className="h-7 w-7 text-accent" strokeWidth={2.25} />
          <span className="text-xl font-normal tracking-tight sm:text-[22px]">Harmonix</span>
        </Link>

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
