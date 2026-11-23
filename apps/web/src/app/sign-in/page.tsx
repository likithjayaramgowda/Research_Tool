import type { Metadata } from "next";
import Link from "next/link";

import { DemoLoop } from "@/components/litlens/demo-loop";
import { EmptyState } from "@/components/litlens/empty-state";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Sign in, LitLens" };

/** Placeholder until Google sign-in is built. */
export default function SignInPage() {
  return (
    <>
      <SiteHeader />
      <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-16 sm:px-8">
        <h1 className="text-2xl">Sign in</h1>
        <EmptyState
          className="mt-6 lg:max-w-md"
          title="TODO(copy): Sign-in is not built yet."
          description="TODO(copy): Google sign-in arrives in a later slice. You can try the demo meanwhile."
          action={
            <Link href="/demo" className={buttonVariants({ variant: "outline" })}>
              Try the demo
            </Link>
          }
        />
        {/* Quiet: slower, fainter, plays once. It must not compete with the sign-in action. */}
        <DemoLoop variant="quiet" className="mt-12 lg:absolute lg:top-16 lg:right-8 lg:mt-0" />
      </main>
      <SiteFooter />
    </>
  );
}
