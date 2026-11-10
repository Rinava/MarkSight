import { MetadataRoute } from "next";

// Bump these by hand when a page's content meaningfully changes. Don't swap
// them back to `new Date()`: that moves <lastmod> on every deploy and tells
// crawlers the pages changed when they didn't.
const HOME_LAST_MODIFIED = new Date("2026-11-10");
const ABOUT_LAST_MODIFIED = new Date("2026-07-14");

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://marksight.laramateo.com";

  return [
    {
      url: baseUrl,
      lastModified: HOME_LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: ABOUT_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
