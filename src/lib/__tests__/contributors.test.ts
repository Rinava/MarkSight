import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchContributors, sizedAvatar } from "../contributors";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sizedAvatar", () => {
  it("adds the size as the first query parameter", () => {
    expect(sizedAvatar("https://avatars.githubusercontent.com/u/1", 64)).toBe(
      "https://avatars.githubusercontent.com/u/1?s=64"
    );
  });

  it("appends to an existing query string", () => {
    expect(sizedAvatar("https://avatars.githubusercontent.com/u/1?v=4", 32)).toBe(
      "https://avatars.githubusercontent.com/u/1?v=4&s=32"
    );
  });
});

describe("fetchContributors", () => {
  it("drops bots and maps the GitHub fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json([
          {
            login: "octocat",
            avatar_url: "https://a/1",
            html_url: "https://github.com/octocat",
            contributions: 12,
            type: "User",
          },
          {
            login: "dependabot[bot]",
            avatar_url: "https://a/2",
            html_url: "https://github.com/apps/dependabot",
            contributions: 99,
            type: "Bot",
          },
        ])
      )
    );

    expect(await fetchContributors()).toEqual([
      {
        login: "octocat",
        avatarUrl: "https://a/1",
        profileUrl: "https://github.com/octocat",
        contributions: 12,
      },
    ]);
  });

  it("throws with the status when GitHub says no", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("rate limited", { status: 403 }))
    );
    await expect(fetchContributors()).rejects.toThrow("403");
  });
});
