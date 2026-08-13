import type { Metadata } from "next";
import { UIRPage, uirMetadata } from "./uir";

export const metadata: Metadata = {
  ...uirMetadata(),
  openGraph: {
    ...uirMetadata(),
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
};

export default function Home() {
  return <UIRPage />;
}
