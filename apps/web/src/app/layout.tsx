import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Literata } from "next/font/google";

import { CitationStyleProvider } from "@/components/citation/citation-style-provider";
import { THEME_INIT_SCRIPT, ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// Reading content (headings, answers, passages, paper titles).
const literata = Literata({
  variable: "--font-reading",
  subsets: ["latin"],
  display: "swap",
});

// Interface text (UI, buttons, labels, metadata).
const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-ui",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LitLens",
  description: "Research Q&A with a citation on every sentence.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${literata.variable} ${atkinson.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <CitationStyleProvider>
            <TooltipProvider delay={300}>{children}</TooltipProvider>
          </CitationStyleProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
