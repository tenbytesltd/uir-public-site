import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
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

test("server-renders the checked UIR package as the marketing page", async () => {
  const [response, interfaceText, manifestText] = await Promise.all([
    render(),
    readFile(new URL("../app/uir-package/model/interface.json", import.meta.url), "utf8"),
    readFile(new URL("../app/uir-package/package.json", import.meta.url), "utf8"),
  ]);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  const interfaceModel = JSON.parse(interfaceText);
  const manifest = JSON.parse(manifestText);
  const nodeCount = interfaceModel.records.filter(
    (record) => record.recordType === "Entity" && record.kind === "Node",
  ).length;

  assert.match(html, /<title>UIR — User Interface Representation<\/title>/i);
  assert.match(html, new RegExp(`data-uir-package="${manifest.packageId}"`));
  assert.match(html, new RegExp(`data-uir-version="${manifest.packageVersion}"`));
  assert.equal((html.match(/data-node=/g) ?? []).length, nodeCount);
  assert.match(html, /Make the interface explicit before code gets the final word\./);
  assert.match(html, /id="hero-kicker"[^>]*>USER INTERFACE REPRESENTATION · ALPHA<\/p>/);
  const heroTag = html.match(/<section id="hero"[^>]*>/)?.[0] ?? "";
  assert.match(heroTag, /data-uir-surface="radial-gradient"/);
  assert.match(heroTag, /data-uir-motion="motion-ambient-surface"/);
  assert.match(heroTag, /background-image:radial-gradient\(/);
  assert.match(heroTag, /animation-duration:4s/);
  const heroTitleTag = html.match(/<div id="hero-title"[^>]*>/)?.[0] ?? "";
  const heroLeadTag = html.match(/<p id="hero-lead"[^>]*>/)?.[0] ?? "";
  assert.match(heroTitleTag, /background-color:rgb\(21 23 19 \/ 1\)/);
  assert.match(heroLeadTag, /background-color:rgb\(21 23 19 \/ 1\)/);
  const showcaseTag = html.match(/<section id="showcase"[^>]*>/)?.[0] ?? "";
  assert.doesNotMatch(showcaseTag, /data-uir-surface=/);
  assert.doesNotMatch(showcaseTag, /data-uir-motion=/);
  assert.match(html, /<nav id="navigation"[^>]*background-color:rgb\(255 254 248 \/ 1\)/);
  assert.match(html, /<section id="showcase"[^>]*background-color:rgb\(21 23 19 \/ 1\)/);
  assert.match(html, /<section id="quickstart"[^>]*background-color:rgb\(255 254 248 \/ 1\)/);
  assert.match(html, /Do not take the standard on trust\. Inspect the site that runs on it\./);
  assert.match(html, /href="https:\/\/github\.com\/tenbytesltd\/uir-public-site"/);
  assert.match(html, /Explore the public site repository/);
  assert.match(html, /Created and stewarded by Tenbytes Ltd\./);
  assert.match(html, /id="install-gap"[^>]*color:rgb\(247 246 238 \/ 1\)/);
  assert.match(html, /The public install artifact is not published yet/);
  assert.match(html, /Inspect this page/);
  assert.match(html, new RegExp(`data-inspection-count="${nodeCount}"`));
  assert.match(html, new RegExp(`data-inspection-package="${manifest.packageId}"`));
  assert.doesNotMatch(html, /Your site is taking shape|codex-preview|react-loading-skeleton/);
});

test("keeps marketing copy in UIR rather than in the target renderer", async () => {
  const [renderer, page, layout] = await Promise.all([
    readFile(new URL("../app/uir.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  for (const phrase of [
    "Make the interface explicit before code gets the final word.",
    "Start with the interface you already ship.",
    "Alpha, with the unfinished parts in view.",
    "USER INTERFACE REPRESENTATION · ALPHA",
    "Do not take the standard on trust. Inspect the site that runs on it.",
    "Explore the public site repository",
    "Created and stewarded by Tenbytes Ltd.",
  ]) {
    assert.doesNotMatch(renderer, new RegExp(phrase.replace(/[.*+?^$()|[\]{}\\]/g, "\\$&")));
    assert.doesNotMatch(page, new RegExp(phrase.replace(/[.*+?^$()|[\]{}\\]/g, "\\$&")));
    assert.doesNotMatch(layout, new RegExp(phrase.replace(/[.*+?^$()|[\]{}\\]/g, "\\$&")));
  }

  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  await access(new URL("../public/og.png", import.meta.url));
  await access(new URL("../app/uir-package/package.json", import.meta.url));
  await access(projectRoot);
});

test("authors the hero pattern and motion in UIR", async () => {
  const [designSystemText, interfaceText, stylesheet] = await Promise.all([
    readFile(new URL("../app/uir-package/model/design-system.json", import.meta.url), "utf8"),
    readFile(new URL("../app/uir-package/model/interface.json", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  const designSystem = JSON.parse(designSystemText);
  const interfaceModel = JSON.parse(interfaceText);
  const facts = [...designSystem.records, ...interfaceModel.records].filter(
    (record) => record.recordType === "Fact",
  );
  const heroBindings = facts.filter(
    (record) =>
      record.subject === "uir-site:node:hero" &&
      record.kind === "presentation.binding" &&
      record.value?.outcome === "role",
  );
  assert.equal(
    heroBindings.find((record) => record.value.slot === "surface")?.value.groundRole,
    "uir-site:role:surface-hero-dots",
  );
  assert.equal(
    heroBindings.find((record) => record.value.slot === "motion")?.value.groundRole,
    "uir-site:role:motion-ambient-surface",
  );
  const dress = facts.find((record) => record.kind === "dress.definition");
  assert.deepEqual(dress?.value?.motionEvents, [
    {
      symbol: "ambient-surface-drift",
      meaning:
        "A decorative surface field drifts slowly enough to preserve reading while making authored motion visible.",
    },
  ]);
  assert.doesNotMatch(stylesheet, /#showcase\s*\{[^}]*background-image/s);
  assert.match(stylesheet, /\[data-uir-surface="radial-gradient"\]\[data-uir-motion\]/);
  assert.match(
    stylesheet,
    /prefers-reduced-motion:[^}]+reduce[\s\S]*\[data-uir-surface="radial-gradient"\]\[data-uir-motion\][\s\S]*animation: none/,
  );
});

test("records Tenbytes as the creator source in UIR provenance", async () => {
  const provenanceModel = JSON.parse(
    await readFile(new URL("../app/uir-package/model/provenance.json", import.meta.url), "utf8"),
  );
  const source = provenanceModel.records.find(
    (record) => record.id === "uir-site:source:tenbytes",
  );
  const description = provenanceModel.records.find(
    (record) => record.id === "uir-site:source:tenbytes:description",
  );

  assert.deepEqual(
    {
      kind: source?.kind,
      originId: source?.originId,
      sourceKind: source?.sourceKind,
    },
    {
      kind: "Source",
      originId: "https://github.com/tenbytesltd",
      sourceKind: "organization",
    },
  );
  assert.equal(description?.value?.name, "Tenbytes Ltd");
  assert.equal(description?.value?.summary, "Creator and steward of UIR.");
});

test("builds the inspector from UIR facts instead of a parallel demo model", async () => {
  const [inspector, renderer] = await Promise.all([
    readFile(new URL("../app/Inspector.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/uir.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(renderer, /provenanceModel/);
  assert.match(renderer, /resolutionPiece\(node\.role\)/);
  assert.match(renderer, /inspectionBindings\(subject, piece\)/);
  assert.match(renderer, /fact\(source\.id, "source\.description"\)/);
  assert.match(renderer, /sourceHref\(subject\)/);
  assert.doesNotMatch(renderer, /github\.com\/tenbytesltd\/uir-public-site/);
  assert.match(inspector, /\.uir-target \[data-node\]/);
  assert.match(inspector, /Viewer chrome — outside the inspected Surface/);
  assert.doesNotMatch(inspector, /mock|fixture|sampleNode|demoData/i);
});
