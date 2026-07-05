import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Github } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const SITE_URL = "https://marksight.laramateo.com";
const GITHUB_URL = "https://github.com/Rinava/MarkSight";
const PORTFOLIO_URL = "https://laramateo.com";

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
    question: "Can I turn a document into a Claude Skill?",
    answer:
      "Yes. Press Create skill to turn any document into an Agent Skill: add a name and description, attach bundled files, and export a ready-to-use SKILL.md folder or .skill bundle for Claude and other AI agents.",
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

const ICON_BTN =
  "flex h-9 w-9 items-center justify-center rounded-[9px] border border-ms-border-2 bg-ms-surface text-ms-label transition-colors hover:border-ms-border-hover hover:bg-ms-hover hover:text-ms-primary-ink";
const LINK =
  "font-medium text-ms-primary-ink underline decoration-ms-primary-ink/40 underline-offset-4 transition-colors hover:decoration-ms-primary-ink";

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
      {children}
    </a>
  );
}

export default function AboutPage() {
  const year = new Date().getFullYear();

  return (
    <div className="ms-scroll flex min-h-dvh flex-col bg-ms-app font-sans text-ms-ink">
      {/* JSON-LD is non-executable data, so CSP script-src does not apply. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 flex h-[58px] flex-none items-center gap-3.5 border-b border-ms-border bg-ms-surface px-[18px]">
        <Link href="/" aria-label="MarkSight home">
          <Logo />
        </Link>
        <div className="flex-1" />
        <Link
          href="/"
          className="flex h-[34px] items-center gap-[7px] rounded-[9px] bg-ms-primary px-[15px] text-[13px] font-semibold text-white shadow-[var(--ms-shadow-primary)] transition-[filter] hover:brightness-[1.07]"
        >
          <span>Open editor</span>
          <ArrowRight className="h-[15px] w-[15px]" aria-hidden="true" />
        </Link>
        <div className="h-[22px] w-px bg-ms-border" />
        <ThemeToggle />
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View on GitHub"
          className={ICON_BTN}
        >
          <Github className="h-[17px] w-[17px]" aria-hidden="true" />
        </a>
      </header>

      {/* ── Content ── */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 sm:py-16">
        <article className="space-y-12">
          <header className="space-y-4">
            <h1 className="text-[2.2rem] font-bold tracking-[-0.02em] text-ms-ink-strong">
              About Mark<span className="text-ms-primary-ink">Sight</span>
            </h1>
            <p className="text-[15px] leading-[1.7] text-ms-ink-body">
              MarkSight is a free, open source markdown editor that runs entirely
              in your browser. It pairs a CodeMirror editor with an
              instantly-rendered preview, a smart formatting toolbar, keyboard
              shortcuts, a document outline, and Markdown, HTML, and PDF export —
              without accounts, subscriptions, or server-side storage.
            </p>
            <p className="text-[15px] leading-[1.7] text-ms-ink-body">
              Your documents are saved to your browser&apos;s localStorage and
              exports are generated client-side, so your writing never leaves
              your device. You can also turn any document into an{" "}
              <strong className="font-semibold text-ms-ink-strong">
                Agent Skill
              </strong>{" "}
              for Claude and other AI agents in one click.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-ms-primary-ink hover:underline"
            >
              Open the editor
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </header>

          <section className="space-y-3">
            <h2 className="text-[1.5rem] font-semibold text-ms-primary-strong">
              A place to talk
            </h2>
            <p className="text-[15px] leading-[1.7] text-ms-ink-body">
              MarkSight is developed in the open, and the conversation happens on
              GitHub:
            </p>
            <ul className="ml-1 space-y-2">
              <li className="flex gap-2 text-[15px] leading-[1.7] text-ms-ink-body">
                <span aria-hidden="true" className="text-ms-primary-ink">
                  •
                </span>
                <span>
                  <ExternalLink href={`${GITHUB_URL}/discussions`}>
                    GitHub Discussions
                  </ExternalLink>{" "}
                  — ask questions, share what you&apos;re building, or propose
                  ideas.
                </span>
              </li>
              <li className="flex gap-2 text-[15px] leading-[1.7] text-ms-ink-body">
                <span aria-hidden="true" className="text-ms-primary-ink">
                  •
                </span>
                <span>
                  <ExternalLink href={`${GITHUB_URL}/issues`}>
                    GitHub Issues
                  </ExternalLink>{" "}
                  — report bugs and request features.
                </span>
              </li>
              <li className="flex gap-2 text-[15px] leading-[1.7] text-ms-ink-body">
                <span aria-hidden="true" className="text-ms-primary-ink">
                  •
                </span>
                <span>
                  <ExternalLink href={`${GITHUB_URL}/blob/main/CONTRIBUTING.md`}>
                    Contributing guide
                  </ExternalLink>{" "}
                  — everything you need to land your first pull request.
                </span>
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-[1.5rem] font-semibold text-ms-primary-strong">
              Contributors
            </h2>
            <p className="text-[15px] leading-[1.7] text-ms-ink-body">
              MarkSight is better because of the people who report bugs, suggest
              features, and open pull requests. Thank you!
            </p>
            <a
              href={`${GITHUB_URL}/graphs/contributors`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-[13px] border border-ms-border-2 bg-ms-surface p-4 transition-colors hover:border-ms-border-hover"
            >
              {/* Third-party dynamic image (contrib.rocks); next/image adds no value. */}
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
            <p className="text-[15px] leading-[1.7] text-ms-ink-body">
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
            <h2 className="text-[1.5rem] font-semibold text-ms-primary-strong">
              Who&apos;s behind it
            </h2>
            <p className="text-[15px] leading-[1.7] text-ms-ink-body">
              MarkSight was created and is maintained by{" "}
              <ExternalLink href={PORTFOLIO_URL}>Lara Mateo</ExternalLink> (
              <ExternalLink href="https://github.com/Rinava">
                @Rinava
              </ExternalLink>{" "}
              on GitHub), and developed together with open source contributors
              from around the world.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-[1.5rem] font-semibold text-ms-primary-strong">
              Frequently asked questions
            </h2>
            <div className="space-y-3">
              {faqs.map((faq) => (
                <div
                  key={faq.question}
                  className="rounded-[13px] border border-ms-border-2 bg-ms-surface p-5"
                >
                  <h3 className="text-[16px] font-semibold text-ms-ink-strong">
                    {faq.question}
                  </h3>
                  <p className="mt-1.5 text-[14px] leading-[1.65] text-ms-ink-body">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </article>
      </main>

      {/* ── Footer ── */}
      <footer className="flex flex-none flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-ms-border bg-ms-surface px-4 py-4 text-[12px] text-ms-muted-3">
        <span>
          Made with <span aria-hidden="true">🫶</span> by{" "}
          <a
            href={PORTFOLIO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-ms-primary-ink hover:underline"
          >
            laramateo.com
          </a>
        </span>
        <span aria-hidden="true">·</span>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-ms-primary-ink"
        >
          GitHub
        </a>
        <span aria-hidden="true">·</span>
        <Link href="/" className="transition-colors hover:text-ms-primary-ink">
          Editor
        </Link>
        <span aria-hidden="true">·</span>
        <span title={`© ${year} laramateo.com. All rights reserved.`}>
          © {year}
        </span>
      </footer>
    </div>
  );
}
