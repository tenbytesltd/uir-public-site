import type { Metadata } from "next";
import { PlaygroundShortcut } from "./PlaygroundShortcut";
import { UIRPage, uirMetadata } from "./uir";

export const dynamic = "force-static";

const publicMetadata = uirMetadata();

export const metadata: Metadata = {
  ...publicMetadata,
  openGraph: {
    ...publicMetadata,
    type: "website",
    images: [{ url: "./og.png", width: 1200, height: 630 }],
  },
  twitter: {
    ...publicMetadata,
    card: "summary_large_image",
    images: ["./og.png"],
  },
};

export default function Home() {
  return (
    <>
      <UIRPage />
      <PlaygroundShortcut />
    </>
  );
}
