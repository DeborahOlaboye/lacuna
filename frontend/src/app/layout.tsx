import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lacuna | ZK Dark Pool on Stellar",
  description: "Lacuna — Privacy-preserving institutional order matching on Stellar using zero-knowledge proofs",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#07070f] text-slate-200 antialiased">
        {children}
      </body>
    </html>
  );
}
