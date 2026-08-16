import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";

const source = new URL("../dist/client/", import.meta.url);
const target = new URL("../out/", import.meta.url);
const repositoryName =
  (process.env.GITHUB_REPOSITORY ?? "tenbytesltd/uir-public-site")
    .split("/")
    .at(-1) ?? "uir-public-site";
const prefixedAssets = new URL(`./${repositoryName}/`, target);

await rm(target, { recursive: true, force: true });
await cp(source, target, { recursive: true });

for (const entry of await readdir(prefixedAssets)) {
  await cp(
    new URL("./" + entry, prefixedAssets),
    new URL("./" + entry, target),
    { recursive: true },
  );
}

async function collectHtmlFiles(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) {
      if (relative === "_next" || relative.startsWith("_next/")) continue;
      files.push(...await collectHtmlFiles(new URL(`./${entry.name}/`, directory), `${relative}/`));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(relative);
    }
  }
  return files;
}

// vinext 1.0.0-beta.2 cannot prerender a nested App Router route with
// trailingSlash enabled because its own canonical 308 is treated as an export
// failure. Export without redirects, then stage every nested HTML route into
// the directory-index form GitHub Pages serves at the pretty trailing-slash URL.
//
// The walk is recursive and strips the Pages asset-prefix directory, so this is
// a general route-packaging rule rather than a Playground-specific workaround.
const htmlFiles = await collectHtmlFiles(target);
for (const relative of htmlFiles) {
  const unprefixed = relative.startsWith(`${repositoryName}/`)
    ? relative.slice(repositoryName.length + 1)
    : relative;

  if (unprefixed === "index.html" || unprefixed === "404.html") continue;

  const destination = unprefixed.endsWith("/index.html")
    ? unprefixed
    : unprefixed.replace(/\.html$/, "/index.html");
  if (relative === destination) continue;

  const parent = destination.slice(0, destination.lastIndexOf("/") + 1);
  await mkdir(new URL(`./${parent}`, target), { recursive: true });
  await cp(new URL(`./${relative}`, target), new URL(`./${destination}`, target));
}

await rm(prefixedAssets, { recursive: true, force: true });
await rm(new URL("./.vite/", target), { recursive: true, force: true });
await rm(new URL("./.assetsignore", target), { force: true });
await rm(new URL("./_headers", target), { force: true });
await writeFile(new URL("./.nojekyll", target), "");

console.log("Staged GitHub Pages artifact at " + target.pathname);
