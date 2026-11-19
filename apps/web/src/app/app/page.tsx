import type { Metadata } from "next";

import { AppShell } from "@/components/litlens/app-shell";

export const metadata: Metadata = {
  title: "Your workspace, LitLens",
  description: "A reading desk for your papers, shown here with sample data.",
};

export default function Page() {
  return <AppShell />;
}
