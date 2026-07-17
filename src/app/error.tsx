"use client";

import { Button } from "@/components/ui/button";

type ErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center p-6 text-center antialiased">
      <div className="border-border bg-card max-w-md space-y-6 rounded-lg border p-8 shadow-sm">
        {/* Visual Alert Icon */}
        <div className="bg-destructive/10 text-destructive mx-auto flex h-12 w-12 items-center justify-center rounded-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
        </div>

        {/* Text Stack - Surfacing only a generic message and the safe identifier */}
        <div className="space-y-2">
          <h2 className="text-foreground text-xl font-semibold tracking-tight">
            Something went wrong
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            We couldn&apos;t load this page because an unexpected error occurred. Please try again
            below
          </p>
          {error.digest && (
            <p className="text-muted-foreground/60 pt-1 font-mono text-xs select-all">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        {/* Action Callbacks */}
        <div className="pt-2">
          <Button
            onClick={() => reset()}
            variant="default"
            className="w-full font-medium transition-colors"
          >
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
