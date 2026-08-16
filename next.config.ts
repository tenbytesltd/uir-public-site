import type { NextConfig } from "next";

const isGitHubPages = process.env.UIR_GITHUB_PAGES === "true";
const repositoryName =
  (process.env.GITHUB_REPOSITORY ?? "tenbytesltd/uir-public-site")
    .split("/")
    .at(-1) ?? "uir-public-site";
const assetPrefix = isGitHubPages ? `/${repositoryName}` : "";

const nextConfig: NextConfig = isGitHubPages
  ? {
      output: "export",
      assetPrefix,
      // vinext 1.0.0-beta.2 treats its own /playground -> /playground/
      // canonical redirect as a failed prerender. Export flat first; the Pages
      // staging step converts nested HTML routes to directory indexes.
      trailingSlash: false,
      images: { unoptimized: true },
    }
  : {};

export default nextConfig;
