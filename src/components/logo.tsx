interface LogoProps {
  className?: string;
  /** Hide the wordmark + tagline, showing only the mark (e.g. tight layouts). */
  markOnly?: boolean;
}

/** The MarkSight brand mark: the original notepad/calendar icon. */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`text-ms-primary-ink ${className}`}
    >
      <path d="M8 2v3" />
      <path d="M16 2v3" />
      <path d="M3 10h18" />
      <path d="M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
      <path d="M16 18h.01" />
    </svg>
  );
}

export function Logo({ className = "", markOnly = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-[11px] ${className}`}>
      <LogoMark />
      {!markOnly && (
        <div className="flex flex-col gap-0.5 leading-[1.05]">
          <span className="text-[17px] font-bold tracking-[-0.03em] text-ms-ink-strong">
            Mark<span className="text-ms-primary-ink">Sight</span>
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.09em] text-ms-muted">
            markdown, clearly
          </span>
        </div>
      )}
    </div>
  );
}
