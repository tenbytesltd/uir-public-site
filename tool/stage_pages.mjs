import { cp, mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";

const source = new URL("../dist/client/", import.meta.url);
const target = new URL("../out/", import.meta.url);
const prefixedAssets = new URL("./uir-public-site/", target);

await rm(target, { recursive: true, force: true });
await cp(source, target, { recursive: true });

for (const entry of await readdir(prefixedAssets)) {
  await cp(
    new URL("./" + entry, prefixedAssets),
    new URL("./" + entry, target),
    { recursive: true },
  );
}

// vinext 1.0.0-beta.2 cannot prerender a nested App Router route with
// trailingSlash enabled because its internal canonical 308 is treated as an
// export failure. Keep the exporter redirect-free, then preserve the public
// pretty URL by staging flat nested routes as directory indexes for Pages.
for (const entry of await readdir(target, { withFileTypes: true })) {
  if (!entry.isFile() || entry.name === "index.html" || !entry.name.endsWith(".html")) {
    continue;
  }
  const route = entry.name.slice(0, -".html".length);
  if (!route || route === "404") continue;
  const routeDirectory = new URL(`./${route}/`, target);
  await mkdir(routeDirectory, { recursive: true });
  await rename(new URL(`./${entry.name}`, target), new URL("./index.html", routeDirectory));
}

await rm(prefixedAssets, { recursive: true, force: true });
await rm(new URL("./.vite/", target), { recursive: true, force: true });
await rm(new URL("./.assetsignore", target), { force: true });
await rm(new URL("./_headers", target), { force: true });
await writeFile(new URL("./.nojekyll", target), "");

console.log("Staged GitHub Pages artifact at " + target.pathname);
