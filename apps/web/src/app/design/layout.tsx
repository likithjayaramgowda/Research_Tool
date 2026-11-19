import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Design system, LitLens",
  description: "Every token and component in LitLens.",
  robots: { index: false },
};

export default function DesignLayout({ children }: { children: React.ReactNode }) {
  return children;
}
