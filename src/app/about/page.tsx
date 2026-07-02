import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = "https://marksight.laramateo.com";
const GITHUB_URL = "https://github.com/Rinava/MarkSight";

export const metadata: Metadata = {
  title: "About",
  description:
    "MarkSight is a free, open source markdown editor created by Lara Mateo. Learn how it keeps your documents private, meet the contributors, and join the community on GitHub.",
  alternates: {
    canonical: `${SITE_URL}/about`,
  },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/about`,
    siteName: "MarkSight",
    title: "About MarkSight - Free, Open Source Markdown Editor",
    description:
      "The story behind MarkSight: a privacy-friendly, open source markdown editor built by Lara Mateo and community contributors.",
  },
};

const faqs = [
  {
    question: "Is MarkSight free to use?",
    answer:
      "Yes. MarkSight is completely free and open source under the MIT license. There are no accounts, subscriptions, or paid tiers — you can also fork the code on GitHub and adapt it to your needs.",
  },
  {
    question: "Where are my documents stored?",
    answer:
      "Your documents never leave your device. MarkSight runs entirely in your browser and saves your work to localStorage automatically. There is no server-side storage and no sign-up.",
  },
  {
    question: "What export formats does MarkSight support?",
    answer:
      "You can download your document as raw Markdown (.md), export it as a styled HTML file, print it to PDF, or preview the generated HTML in a new tab. Exports are generated client-side in your browser.",
  },
  {
    question: "Does MarkSight support GitHub-flavored markdown and diagrams?",
    answer:
      "Yes. MarkSight supports GitHub-flavored markdown — tables, task lists, and strikethrough — plus syntax-highlighted code blocks and Mermaid diagrams that render live in the preview and in exports.",
  },
  {
    question: "How do I report a bug or suggest a feature?",
    answer:
      "Open an issue on the MarkSight GitHub repository for bugs and feature requests, or start a thread in GitHub Discussions for questions and ideas. Pull requests are welcome too.",
  },
  {
    question: "Who makes MarkSight?",
    answer:
      "MarkSight was created and is maintained by Lara Mateo, together with open source contributors from the community. Anyone can contribute on GitHub.",
  },
];

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      name: "About MarkSight",
      url: `${SITE_URL}/about`,
      description:
        "About MarkSight, a free and open source markdown editor with real-time preview, created by Lara Mateo and community contributors.",
      about: {
        "@type": "WebApplication",
        name: "MarkSight",
        url: SITE_URL,
      },
      author: {
        "@type": "Person",
        name: "Lara Mateo",
        url: "https://laramateo.com",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "MarkSight", item: SITE_URL },
        {
          "@type": "ListItem",
          position: 2,
          name: "About",
          item: `${SITE_URL}/about`,
        },
      ],
    },
  ],
};

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-foreground underline underline-offset-4 hover:text-primary transition-colors"
    >
      {children}
    </Link>
  );
}

export default function AboutPage() {
  return (
    <div className="h-full overflow-y-auto">
      {/* JSON-LD is non-executable data, so CSP script-src does not apply. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <article className="container mx-auto max-w-3xl px-4 py-8 sm:py-12 space-y-10">
        <header className="space-y-4">
          <h1 className="text-3xl font-bold">About MarkSight</h1>
          <p className="text-muted-foreground">
            MarkSight is a free, open source markdown editor that runs entirely
            in your browser. It pairs a CodeMirror editor with an
            instantly-rendered preview, a smart formatting toolbar, keyboard
            shortcuts, a document outline, and Markdown, HTML, and PDF export —
            without accounts, subscriptions, or server-side storage.
          </p>
          <p className="text-muted-foreground">
            Your documents are saved to your browser&apos;s localStorage and
            exports are generated client-side, so your writing never leaves
            your device.
          </p>
          <Link
            href="/"
            className="inline-block font-medium text-primary underline underline-offset-4 hover:no-underline"
          >
            Open the editor →
          </Link>
        </header>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">A place to talk</h2>
          <p className="text-muted-foreground">
            MarkSight is developed in the open, and the conversation happens on
            GitHub:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>
              <ExternalLink href={`${GITHUB_URL}/discussions`}>
                GitHub Discussions
              </ExternalLink>{" "}
              — ask questions, share what you&apos;re building, or propose
              ideas.
            </li>
            <li>
              <ExternalLink href={`${GITHUB_URL}/issues`}>
                GitHub Issues
              </ExternalLink>{" "}
              — report bugs and request features.
            </li>
            <li>
              <ExternalLink
                href={`${GITHUB_URL}/blob/main/CONTRIBUTING.md`}
              >
                Contributing guide
              </ExternalLink>{" "}
              — everything you need to land your first pull request.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Contributors</h2>
          <p className="text-muted-foreground">
            MarkSight is better because of the people who report bugs, suggest
            features, and open pull requests. Thank you!
          </p>
          <Link
            href={`${GITHUB_URL}/graphs/contributors`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
          >
            {/* Third-party dynamic image; next/image adds no value here. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://contrib.rocks/image?repo=Rinava/MarkSight"
              alt="Avatars of MarkSight contributors on GitHub"
              width={200}
              height={50}
              loading="lazy"
            />
          </Link>
          <p className="text-muted-foreground">
            Want to join them? Look for issues labelled{" "}
            <ExternalLink
              href={`${GITHUB_URL}/issues?q=is%3Aopen+label%3A%22good+first+issue%22`}
            >
              good first issue
            </ExternalLink>
            .
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Who&apos;s behind it</h2>
          <p className="text-muted-foreground">
            MarkSight was created and is maintained by{" "}
            <ExternalLink href="https://laramateo.com">Lara Mateo</ExternalLink>{" "}
            (<ExternalLink href="https://github.com/Rinava">@Rinava</ExternalLink>{" "}
            on GitHub), and developed together with open source contributors
            from around the world.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Frequently asked questions</h2>
          {faqs.map((faq) => (
            <div key={faq.question} className="space-y-1">
              <h3 className="text-lg font-medium">{faq.question}</h3>
              <p className="text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </section>
      </article>
    </div>
  );
}
