import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const exportedIndex = new URL("../out/index.html", import.meta.url);

test("exports a self-contained GitHub Pages artifact", async () => {
  const html = await readFile(exportedIndex, "utf8");
  const chunks = await readdir(new URL("../out/_next/static/chunks/", import.meta.url));

  assert.match(html, /<title>UIR \u2014 User Interface Representation<\/title>/i);
  assert.match(html, /href="\/uir-public-site\/_next\/static\/css\//);
  assert.match(html, /src="\/uir-public-site\/_next\/static\/chunks\//);
  assert.match(
    html,
    /content="https:\/\/tenbytesltd\.github\.io\/uir-public-site\/og\.png"/,
  );
  assert.match(
    html,
    /href="https:\/\/github\.com\/tenbytesltd\/uir-public-site"/,
  );
  assert.match(html, /OPEN SOURCE \u00b7 LIVING PROOF/);
  assert.doesNotMatch(html, /http:\/\/localhost:3000/);
  assert.ok(chunks.some((name) => name.endsWith(".js")));

  await access(new URL("../out/.nojekyll", import.meta.url));
  await access(new URL("../out/og.png", import.meta.url));
  await access(new URL("../out/favicon.svg", import.meta.url));
  await assert.rejects(
    access(new URL("../out/uir-public-site/", import.meta.url)),
    { code: "ENOENT" },
  );
});
