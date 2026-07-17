import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="bg-background flex min-h-dvh items-center justify-center px-6">
      <div className="mx-auto flex max-w-lg flex-col items-center text-center">
        <p className="text-muted-foreground text-sm font-medium">404</p>

        <h1 className="text-foreground mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
          Page not found
        </h1>

        <p className="text-muted-foreground mt-4 text-base">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It may have been moved,
          deleted, or the URL might be incorrect.
        </p>

        <Button asChild className="mt-8">
          <Link href="/">Back to MarkSight</Link>
        </Button>
      </div>
    </main>
  );
}
