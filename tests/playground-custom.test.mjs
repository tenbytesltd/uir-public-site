import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps custom package inputs on the shared UIR runtime boundary", async () => {
  const [sourceLayer, localLoader, lab, diff, page] = await Promise.all([
    readFile(new URL("../app/playground/source-layer.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/playground/package-loader.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/playground/PlaygroundLab.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/playground/semantic-diff.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/playground/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(sourceLayer, /loadPackageFromZip/);
  assert.match(sourceLayer, /DecompressionStream\("deflate-raw"\)/);
  assert.match(sourceLayer, /MAX_ZIP_ENTRIES/);
  assert.match(sourceLayer, /MAX_ZIP_UNCOMPRESSED_BYTES/);
  assert.match(sourceLayer, /raw\.githubusercontent\.com/);
  assert.match(sourceLayer, /loadPackageFromFiles/);
  assert.match(sourceLayer, /fetch\(/);

  assert.doesNotMatch(localLoader, /fetch\(|XMLHttpRequest|FormData/);
  assert.match(localLoader, /crypto\.subtle\.digest\("SHA-256"/);

  assert.match(lab, /Open \.uir\.zip/);
  assert.match(lab, /Copy deep link/);
  assert.match(lab, /Set baseline/);
  assert.match(lab, /SEMANTIC GRAPH/);
  assert.match(lab, /SEMANTIC DIFF/);
  assert.match(lab, /new UIRRuntime\(pkg\)/);
  assert.match(diff, /new UIRRuntime\(beforePackage\)/);
  assert.match(diff, /stableNodeKey/);
  assert.match(page, /PlaygroundLab/);
});
