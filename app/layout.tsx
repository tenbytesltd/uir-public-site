import type { Metadata } from "next";
import "./globals.css";
import { uirMetadata } from "./uir";

export const metadata: Metadata = {
  ...uirMetadata(),
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
