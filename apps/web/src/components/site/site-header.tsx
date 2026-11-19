import Link from "next/link";

import { ThemeToggle } from "@/components/theme/theme-toggle";

/** The top bar for marketing pages: wordmark, one link, theme toggle. */
export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-8">
      <Link href="/" className="font-heading rounded-md text-lg font-semibold">
        LitLens
      </Link>
      <nav aria-label="Main" className="flex items-center gap-2 sm:gap-4">
        <Link
          href="/#how-it-works"
          className="rounded-md px-2 py-1 text-sm underline-offset-4 hover:underline"
        >
          How it works
        </Link>
        <ThemeToggle />
      </nav>
    </header>
  );
}
