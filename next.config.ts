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
      images: { unoptimized: true },
    }
  : {};

export default nextConfig;
