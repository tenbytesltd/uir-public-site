import assert from "node:assert/strict";
import test from "node:test";

import {
  verifyRenderedTarget,
  verifySourceTranslation,
} from "../tool/uir_conformance.mjs";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("conformance", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

function explain(result) {
  return result.mismatches.slice(0, 30).join("\n");
}

test("the approved design and design system translate exactly into the checked UIR package", async () => {
  const result = await verifySourceTranslation();
  assert.equal(result.ok, true, explain(result));
});

test("the rendered frontend conforms to the complete checked UIR contract", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  const result = await verifyRenderedTarget(html);
  assert.equal(result.ok, true, explain(result));
  assert.ok(result.expectedNodes > 100, "the conformance gate must cover the whole page, not a sample");
});

test("the conformance gate catches semantic drift", async () => {
  const response = await render();
  const html = await response.text();
  const mutated = html.replace('data-node="hero-title" data-role="heading"', 'data-node="hero-title" data-role="paragraph"');
  assert.notEqual(mutated, html, "semantic mutation fixture did not match rendered HTML");
  const result = await verifyRenderedTarget(mutated);
  assert.equal(result.ok, false);
  assert.match(explain(result), /hero-title: role expected heading, got paragraph/);
});

test("the conformance gate catches design-system realization drift", async () => {
  const response = await render();
  const html = await response.text();
  const mutated = html.replace(
    /(<div id="hero-title"[^>]*style="[^"]*color:)[^;"]+/,
    "$1rgb(1 2 3 / 1)",
  );
  assert.notEqual(mutated, html, "design-system mutation fixture did not match rendered HTML");
  const result = await verifyRenderedTarget(mutated);
  assert.equal(result.ok, false);
  assert.match(explain(result), /hero-title: style color expected .*got rgb\(1 2 3 \/ 1\)/);
});
