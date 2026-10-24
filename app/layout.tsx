import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Asana Analyzer",
  description: "Am I doing this pose correctly? A small AI product demo that checks a yoga pose from video.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="top">
          <Link href="/" className="brand">Asana Analyzer</Link>
          <nav>
            <Link href="/">Try it</Link>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/results">Results &amp; decisions</Link>
          </nav>
        </header>
        <main>{children}</main>
        <footer>
          Not a substitute for a yoga teacher. Stop if it hurts.
          <br />
          <span className="small">Background image and sample videos are AI-generated (Google Gemini).</span>
        </footer>
      </body>
    </html>
  );
}
