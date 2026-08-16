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
      trailingSlash: true,
      // vinext's exporter requests the canonical route without a trailing slash.
      // Keep subfolder output while preventing that internal request from turning
      // into a 308 before it can be prerendered.
      skipTrailingSlashRedirect: true,
      images: { unoptimized: true },
    }
  : {};

export default nextConfig;
