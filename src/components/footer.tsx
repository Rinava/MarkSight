import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex flex-col items-center gap-2 text-center md:flex-row md:text-left">
            <p className="text-sm text-muted-foreground">
              Made with 🫶 by{" "}
              <Link
                href="https://laramateo.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:text-primary transition-colors"
              >
                laramateo.com
              </Link>
            </p>
            <span className="hidden md:inline text-muted-foreground">•</span>
            <p className="text-sm text-muted-foreground">
              MarkSight - Advanced Markdown Editor
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="https://github.com/rinava/MarkSight"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Collaborate on GitHub
            </Link>
            <Link
              href="https://laramateo.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Portfolio
            </Link>
          </div>
        </div>
        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} laramateo.com. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
