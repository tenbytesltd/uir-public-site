import { cp, readdir, rm, writeFile } from "node:fs/promises";

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

await rm(prefixedAssets, { recursive: true, force: true });
await rm(new URL("./.vite/", target), { recursive: true, force: true });
await rm(new URL("./.assetsignore", target), { force: true });
await rm(new URL("./_headers", target), { force: true });
await writeFile(new URL("./.nojekyll", target), "");

console.log("Staged GitHub Pages artifact at " + target.pathname);
