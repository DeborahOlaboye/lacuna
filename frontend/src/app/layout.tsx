import type { Metadata } from "next";
import { Archivo, Instrument_Serif, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-archivo",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-serif",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Lacuna | ZK Dark Pool on Stellar",
  description:
    "Privacy-preserving institutional order matching on Stellar using zero-knowledge proofs. Price and size never touch the chain.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${instrumentSerif.variable} ${ibmPlexMono.variable}`}
    >
      <body className="min-h-screen bg-void text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
