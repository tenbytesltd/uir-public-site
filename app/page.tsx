import type { Metadata } from "next";
import { PublicSite } from "./Site";
import { uirMetadata } from "./uir-data";

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
  return <PublicSite />;
}
