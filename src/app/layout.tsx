import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Thai } from "next/font/google";
import { getTheme } from "@/lib/theme";
import "./globals.css";

// Matched pair, not a single "does everything" font: IBM Plex Sans has no
// Thai glyphs, and the EN/TH toggle means Thai script renders for real.
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexSansThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-sans-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "M Sign Workflow",
  description: "Internal job workflow tracker for M Sign",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await getTheme();

  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexSansThai.variable} h-full antialiased ${theme === "dark" ? "dark" : ""}`}
    >
      {/* suppressHydrationWarning: Grammarly (and similar extensions) inject
          data-gr-* attributes onto <body> before React hydrates, which is a
          real client/server mismatch but not an app bug - this only silences
          that specific expected diff, not other hydration errors. */}
      <body
        className="min-h-full flex flex-col bg-white dark:bg-slate-950"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
