"use client";

import { useContributors } from "@/hooks/use-contributors";
import { CONTRIBUTORS_GRAPH_URL, sizedAvatar } from "@/lib/contributors";

/* External per-visitor avatars; plain <img> avoids next/image remote-pattern config. */

export function Contributors() {
  const { contributors, loading, error } = useContributors();

  if (loading) {
    return (
      <div className="flex flex-wrap gap-2" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-11 w-11 animate-pulse rounded-full bg-ms-hover"
          />
        ))}
      </div>
    );
  }

  if (error || contributors.length === 0) {
    return (
      <a
        href={CONTRIBUTORS_GRAPH_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block rounded-[13px] border border-ms-border-2 bg-ms-surface p-4 transition-colors hover:border-ms-border-hover"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://contrib.rocks/image?repo=Rinava/MarkSight"
          alt="Avatars of MarkSight contributors on GitHub"
          width={300}
          height={60}
          loading="lazy"
          className="max-w-full"
        />
      </a>
    );
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {contributors.map((c) => (
        <li key={c.login}>
          <a
            href={c.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`@${c.login} — ${c.contributions} commit${
              c.contributions === 1 ? "" : "s"
            }`}
            className="block rounded-full ring-1 ring-ms-border transition-transform hover:-translate-y-0.5 hover:ring-ms-primary-ink"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sizedAvatar(c.avatarUrl, 88)}
              alt={`${c.login}, MarkSight contributor`}
              width={44}
              height={44}
              loading="lazy"
              className="h-11 w-11 rounded-full"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}

export function FooterContributors({
  max = 5,
  separator,
}: {
  max?: number;
  /** Rendered only when the cluster has content, so a parent's divider never orphans. */
  separator?: React.ReactNode;
}) {
  const { contributors, loading, error } = useContributors();

  if (loading || error || contributors.length === 0) return null;

  const shown = contributors.slice(0, max);
  const extra = contributors.length - shown.length;

  return (
    <>
      {separator}
      <a
        href={CONTRIBUTORS_GRAPH_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${contributors.length} MarkSight contributors`}
        title={`${contributors.length} contributors`}
        className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
      >
        <span className="flex -space-x-1.5">
          {shown.map((c) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={c.login}
              src={sizedAvatar(c.avatarUrl, 40)}
              alt=""
              width={20}
              height={20}
              loading="lazy"
              className="h-5 w-5 rounded-full ring-1 ring-ms-surface"
            />
          ))}
        </span>
        {extra > 0 && <span>+{extra}</span>}
      </a>
    </>
  );
}
