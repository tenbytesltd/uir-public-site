import type { Metadata } from "next";
import "./globals.css";
import { uirMetadata } from "./uir";

const publicSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://tenbytesltd.github.io/uir-public-site";

export const metadata: Metadata = {
  ...uirMetadata(),
  metadataBase: new URL(`${publicSiteUrl}/`),
  icons: {
    icon: "./favicon.svg",
    shortcut: "./favicon.svg",
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
