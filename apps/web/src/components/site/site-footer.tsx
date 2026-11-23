import Link from "next/link";

/** The footer: who built it, where the code is, and a way back to "How it works". */
export function SiteFooter() {
  return (
    <footer className="border-rule mt-24 border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-baseline gap-x-10 gap-y-3 px-4 py-8 text-sm sm:px-8">
        <p>Built by Likith Jayaram Gowda</p>
        <a
          href="https://github.com/likithjayaramgowda/Research_Tool"
          className="rounded-md underline underline-offset-4"
        >
          Source code on GitHub
        </a>
        <Link href="/#how-it-works" className="rounded-md underline underline-offset-4">
          How it works
        </Link>
      </div>
    </footer>
  );
}
