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

test("server-renders the real React site from the checked UIR package", async () => {
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
  assert.match(html, /Ship the UI you designed/);
  assert.match(html, /UIR turns your design into a machine-readable specification/);
  assert.match(html, /A green build can still ship the wrong UI\./);
  assert.match(html, /The wrong UI becomes the new baseline/);
  assert.match(html, /From approved design to verified frontend\./);
  assert.match(html, /03 · Verify every change/);
  assert.match(html, /id="hero-kicker"[^>]*>USER INTERFACE REPRESENTATION · ALPHA<\/p>/);
  const heroTag = html.match(/<section id="hero"[^>]*>/)?.[0] ?? "";
  assert.match(heroTag, /data-uir-surface="radial-gradient"/);
  assert.match(heroTag, /data-uir-motion="motion-ambient-surface"/);
  assert.match(heroTag, /data-uir-motion-event="pointer-dot-field"/);
  assert.match(heroTag, /data-uir-surface-field="points"/);
  assert.match(heroTag, /background-image:radial-gradient\(/);
  assert.match(heroTag, /animation-duration:4s/);
  assert.match(html, /<canvas[^>]*class="uir-surface-field"[^>]*><\/canvas>/);
  const heroTitleTag = html.match(/<div id="hero-title"[^>]*>/)?.[0] ?? "";
  const heroLeadTag = html.match(/<p id="hero-lead"[^>]*>/)?.[0] ?? "";
  assert.doesNotMatch(heroTitleTag, /background-color:/);
  assert.doesNotMatch(heroLeadTag, /background-color:/);
  const showcaseTag = html.match(/<section id="showcase"[^>]*>/)?.[0] ?? "";
  assert.doesNotMatch(showcaseTag, /data-uir-surface=/);
  assert.doesNotMatch(showcaseTag, /data-uir-motion=/);
  assert.match(html, /<nav id="navigation"[^>]*background-color:rgb\(255 254 248 \/ 1\)/);
  assert.match(html, /<section id="showcase"[^>]*background-color:rgb\(21 23 19 \/ 1\)/);
  assert.match(html, /<section id="quickstart"[^>]*background-color:rgb\(255 254 248 \/ 1\)/);
  assert.match(html, /<section id="build"[^>]*background-color:rgb\(232 229 218 \/ 1\)/);
  assert.match(html, /<section id="standard"[^>]*background-color:rgb\(255 254 248 \/ 1\)/);
  assert.match(html, /<section id="status"[^>]*background-color:rgb\(232 229 218 \/ 1\)/);
  assert.match(html, /From instructions to a verified page\./);
  assert.match(html, /href="https:\/\/github\.com\/tenbytesltd\/uir-public-site"/);
  assert.match(html, /Explore the repository/);
  assert.match(html, /UIR by Tenbytes Ltd\./);
  assert.match(html, /id="install-gap"[^>]*color:rgb\(247 246 238 \/ 1\)/);
  assert.match(html, /The public install artifact is not published yet/);
  assert.match(html, /Inspect this page/);
  assert.match(html, new RegExp(`data-inspection-count="${nodeCount}"`));
  assert.match(html, new RegExp(`data-inspection-package="${manifest.packageId}"`));
  assert.doesNotMatch(html, /Your site is taking shape|codex-preview|react-loading-skeleton/);
});

test("keeps marketing copy in UIR rather than in the target renderer", async () => {
  const [site, designSystem, data, page, layout] = await Promise.all([
    readFile(new URL("../app/Site.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/design-system.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/uir-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  for (const phrase of [
    "Ship the UI you designed",
    "A green build can still ship the wrong UI.",
    "From approved design to verified frontend.",
    "Everything that makes the design the design.",
    "Useful now. Still alpha.",
    "USER INTERFACE REPRESENTATION · ALPHA",
    "From instructions to a verified page.",
    "Explore the repository",
    "UIR by Tenbytes Ltd.",
  ]) {
    const pattern = new RegExp(phrase.replace(/[.*+?^$()|[\]{}\\]/g, "\\$&"));
    assert.doesNotMatch(site, pattern);
    assert.doesNotMatch(designSystem, pattern);
    assert.doesNotMatch(data, pattern);
    assert.doesNotMatch(page, pattern);
    assert.doesNotMatch(layout, pattern);
  }

  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  await access(new URL("../public/og.png", import.meta.url));
  await access(new URL("../app/uir-package/package.json", import.meta.url));
  await access(projectRoot);
});

test("authors the hero pattern and motion in UIR", async () => {
  const [designSystemText, interfaceText, stylesheet, surfaceField] = await Promise.all([
    readFile(new URL("../app/uir-package/model/design-system.json", import.meta.url), "utf8"),
    readFile(new URL("../app/uir-package/model/interface.json", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/SurfaceField.tsx", import.meta.url), "utf8"),
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
      symbol: "pointer-dot-field",
      meaning:
        "A decorative field of points moves by a small amount around pointer or touch proximity while preserving reading comfort.",
    },
  ]);
  assert.doesNotMatch(stylesheet, /#showcase\s*\{[^}]*background-image/s);
  assert.match(stylesheet, /\[data-uir-surface-field="points"\]/);
  assert.doesNotMatch(stylesheet, /@keyframes uir-surface-drift/);
  assert.match(surfaceField, /POINTER_TWIST_PX = 8/);
  assert.match(surfaceField, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(surfaceField, /createRadialGradient|shadowBlur|drawCore|drawOrbital/);
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
  const [inspector, data] = await Promise.all([
    readFile(new URL("../app/Inspector.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/uir-data.ts", import.meta.url), "utf8"),
  ]);

  assert.match(data, /provenanceModel/);
  // The NODE and not its role: Resolution is selected from `(role,
  // parent-role)`, and this adapter matched on the role alone while the
  // conformance gate consulted both — two implementations of one rule
  // feeding one page, agreeing today only because every Resolution pair in
  // this package happens to share an outcome.
  assert.match(data, /resolutionPiece\(node\)/);
  assert.match(data, /dimension === "parent-role"/);
  assert.match(data, /inspectionBindings\(subject, piece\)/);
  assert.match(data, /fact\(source\.id, "source\.description"\)/);
  assert.match(data, /sourceHref\(subject\)/);
  assert.doesNotMatch(data, /github\.com\/tenbytesltd\/uir-public-site/);
  assert.match(inspector, /\.uir-target \[data-node\]/);
  assert.match(inspector, /Viewer chrome — outside the inspected Surface/);
  assert.doesNotMatch(inspector, /mock|fixture|sampleNode|demoData/i);
});

test("the public target is a hand-authored React component tree, not a generic UIR renderer", async () => {
  const [site, designSystem, page] = await Promise.all([
    readFile(new URL("../app/Site.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/design-system.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(site, /function Hero\(\)/);
  assert.match(site, /function Problem\(\)/);
  assert.match(site, /function Playground\(\)/);
  assert.match(site, /<Heading uirKey="hero-title" level=\{1\} \/>/);
  assert.doesNotMatch(site, /RenderNode|walk\(|switch \(.*role/);
  assert.doesNotMatch(designSystem, /resolutionPiece/);
  assert.match(designSystem, /heading: "uir-site:piece:heading"/);
  assert.match(designSystem, /uirNodeProps\(uirKey, "heading", PIECES\.heading\)/);
  assert.match(page, /<PublicSite \/>/);
});

test("every node UIR calls a heading renders a heading element, at a recorded level", async () => {
  // **The document outline is chosen in React and UIR states none of it.**
  // `heading → "div"` in the Piece table pins the OUTER element; the `<h1>`,
  // `<h2>` and `<h3>` live inside it, and `parseObserved` strips inner tags
  // before comparing text, so the conformance gate sees nothing of this.
  //
  // The demonstrated cost: a `Brand` component emitted the same role, salience,
  // Piece, bindings and outer tag as `Heading` with no inner heading element at
  // all, so replacing one `<Heading uirKey="problem-title" level={2} />` with
  // `<Brand uirKey="problem-title" />` dropped an `<h2>` from the page and
  // every other check stayed green. Changing every `level={2}` to `level={1}`
  // is invisible the same way.
  //
  // The first thing this check found was not a hypothetical: `brand` was a
  // `heading` in UIR and rendered no heading element on the live page. The
  // wordmark is a navigation label, so the Fact was corrected and the component
  // that could impersonate a heading is gone — a `Paragraph` with a class is a
  // `Paragraph`.
  //
  // **This test pins the TARGET's choice and never claims the package made
  // it.** The half that IS derived from the package is the first assertion —
  // every node the package gives role `heading` must render some heading
  // element — and it is the half that catches the component swap. The levels
  // below are a recorded outline: they are the React tree's decision, they are
  // pinned so a silent change fails, and `docs/CONFORMANCE.md` names the gap
  // rather than letting this test stand in for closing it.
  const [response, interfaceText] = await Promise.all([
    render(),
    readFile(new URL("../app/uir-package/model/interface.json", import.meta.url), "utf8"),
  ]);
  const html = await response.text();
  const interfaceModel = JSON.parse(interfaceText);

  // `node.role` is a Fact ABOUT a Node and never a field on it, which is what
  // the conformance gate reads too — a filter on `record.role` matches nothing
  // and would have made this test pass over an empty set.
  const headings = interfaceModel.records
    .filter((record) => record.recordType === "Fact" && record.kind === "node.role"
      && record.value?.role === "heading")
    .map((record) => String(record.subject).replace(/^uir-site:node:/, ""));
  assert.ok(headings.length > 5, "the package states fewer heading nodes than this page has");

  const levels = {};
  const missing = [];
  for (const key of headings) {
    const opening = html.indexOf(`data-node="${key}"`);
    assert.notEqual(opening, -1, `the rendered page carries no node ${key}`);
    // The node's own element, up to the next node boundary: a heading Node has
    // no Node children on this page, so its inner heading element is inside it.
    const next = html.indexOf("data-node=", opening + 1);
    const region = html.slice(opening, next === -1 ? undefined : next);
    const found = region.match(/<h([1-6])\b/);
    if (!found) {
      missing.push(key);
      continue;
    }
    levels[key] = Number(found[1]);
  }
  assert.deepEqual(missing, [],
    "these nodes are headings in UIR and render no heading element, so the "
    + "page's outline lost them while every other check stayed green");

  const recorded = JSON.parse(
    await readFile(new URL("./heading-outline.json", import.meta.url), "utf8"));
  assert.deepEqual(levels, recorded,
    "the document outline changed; it is the target's decision and not UIR's, "
    + "so it is recorded here — update this file deliberately or fix the tree");
});
