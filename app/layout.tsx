import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Milano Partecipa | La nostra città, il nostro futuro",
  description: "Proposte, idee e segnalazioni per migliorare Milano. La piattaforma civica di Insieme per Milano.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className="antialiased">{children}</body>
    </html>
  );
}
