interface AppFooterProps {
  /** Width / gutter classes so the footer lines up with the page content. */
  containerClassName?: string;
}

export function AppFooter({ containerClassName = "max-w-[1200px] px-5 sm:px-8" }: AppFooterProps) {
  return (
    <footer className="border-t border-line bg-showcase-footer">
      <div
        className={`mx-auto flex w-full flex-col gap-3 py-5 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between ${containerClassName}`}
      >
        <span className="flex items-center gap-2 font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          All systems in harmony
        </span>
        <p className="m-0">Your sound. Your space. Only you can access your audio.</p>
        <span className="font-mono">HARMONIX / v.2.4</span>
      </div>
    </footer>
  );
}
