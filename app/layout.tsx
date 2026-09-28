import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Regression Radar",
  description:
    "Know what breaks before you upgrade, from the memory of every bug report other people already filed.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
