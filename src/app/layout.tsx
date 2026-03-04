import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Chronically Online Wars",
  description: "An RTS game about internet factions battling for digital supremacy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
