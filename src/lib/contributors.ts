/**
 * Unauthenticated GitHub API (60 req/hour per visitor IP); avatars load from
 * avatars.githubusercontent.com, covered by the `img-src https:` CSP.
 */

export const CONTRIBUTORS_REPO = "Rinava/MarkSight";
export const CONTRIBUTORS_GRAPH_URL = `https://github.com/${CONTRIBUTORS_REPO}/graphs/contributors`;

const ENDPOINT = `https://api.github.com/repos/${CONTRIBUTORS_REPO}/contributors?per_page=100`;

export interface Contributor {
  login: string;
  avatarUrl: string;
  profileUrl: string;
  contributions: number;
}

interface GitHubContributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
  type: string;
}

export function sizedAvatar(url: string, size: number): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}s=${size}`;
}

export async function fetchContributors(): Promise<Contributor[]> {
  const res = await fetch(ENDPOINT, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub API responded ${res.status}`);

  const data: GitHubContributor[] = await res.json();
  return data
    .filter((c) => c.type !== "Bot")
    .map((c) => ({
      login: c.login,
      avatarUrl: c.avatar_url,
      profileUrl: c.html_url,
      contributions: c.contributions,
    }));
}
