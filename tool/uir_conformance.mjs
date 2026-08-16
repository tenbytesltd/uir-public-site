import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";

const MODEL_FILES = [
  "model/design-system.json",
  "model/interface.json",
  "model/package.json",
  "model/provenance.json",
];

const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
  "meta", "param", "source", "track", "wbr",
]);

function nodeKey(id) {
  return id?.split(":").at(-1) ?? id;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, stable(item)]),
    );
  }
  return value;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function loadPackage(packageRoot = "app/uir-package") {
  const root = resolve(packageRoot);
  const models = await Promise.all(
    MODEL_FILES.map(async (relative) => [relative, await readJson(resolve(root, relative))]),
  );
  const byFile = Object.fromEntries(models);
  const records = models.flatMap(([, model]) => model.records ?? []);
  const byId = new Map(records.map((record) => [record.id, record]));
  const facts = records.filter((record) => record.recordType === "Fact");
  const relations = records.filter((record) => record.recordType === "Relation");
  const entities = records.filter((record) => record.recordType === "Entity");

  const fact = (subject, kind) =>
    facts.find((record) => record.subject === subject && record.kind === kind);
  const factsOf = (subject, kind) =>
    facts.filter((record) => record.subject === subject && record.kind === kind);

  const contains = relations
    .filter((record) => record.kind === "contains" && record.source && record.target)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const childrenByParent = new Map();
  const parentByNode = new Map();
  const orderByNode = new Map();
  for (const relation of contains) {
    const list = childrenByParent.get(relation.source) ?? [];
    list.push(relation.target);
    childrenByParent.set(relation.source, list);
    if (String(relation.source).includes(":node:")) {
      parentByNode.set(relation.target, relation.source);
      orderByNode.set(relation.target, relation.order ?? list.length - 1);
    }
  }

  const controls = new Map(
    relations
      .filter((record) => record.kind === "controls" && record.source && record.target)
      .map((record) => [record.source, record.target]),
  );

  const surfaceContains = contains.find(
    (relation) => relation.source === "uir-site:surface:home",
  );
  if (!surfaceContains?.target) {
    throw new Error("UIR package has no root node for uir-site:surface:home");
  }
  const rootId = surfaceContains.target;

  const walk = (subject) => [
    subject,
    ...(childrenByParent.get(subject) ?? []).flatMap(walk),
  ];

  function textValue(subject) {
    const value = fact(subject, "node.content")?.value;
    return value?.type === "text" && typeof value.value === "string"
      ? value.value
      : "";
  }

  function gapText(subject) {
    const gap = entities.find(
      (record) => record.kind === "Gap" && record.target === subject,
    );
    return typeof gap?.rationale === "string" ? gap.rationale : undefined;
  }

  function role(subject) {
    const value = fact(subject, "node.role")?.value;
    return typeof value?.role === "string" ? value.role : "group";
  }

  function salience(subject) {
    const value = fact(subject, "node.salience")?.value;
    return typeof value?.level === "string" ? value.level : "supporting";
  }

  function parentRole(subject) {
    const parent = parentByNode.get(subject);
    return parent ? role(parent) : "$surface-root";
  }

  function resolutionPiece(subject) {
    const roleName = role(subject);
    const parentRoleName = parentRole(subject);
    const candidates = entities.filter(
      (record) => record.kind === "Resolution" && typeof record.outcome === "string",
    );
    for (const candidate of candidates) {
      const selectors = factsOf(candidate.id, "resolution.selector");
      const roleSelector = selectors.find(
        (record) =>
          record.value?.dimension === "role" && record.value?.role === roleName,
      );
      if (!roleSelector) continue;
      const parentSelector = selectors.find(
        (record) => record.value?.dimension === "parent-role",
      );
      if (
        !parentSelector ||
        !Array.isArray(parentSelector.value?.values) ||
        parentSelector.value.values.includes(parentRoleName)
      ) {
        return candidate.outcome;
      }
    }
    return undefined;
  }

  function bindingMap(subject) {
    const map = new Map();
    if (!subject) return map;
    for (const binding of factsOf(subject, "presentation.binding")) {
      const value = binding.value;
      if (
        typeof value?.slot === "string" &&
        value.outcome === "role" &&
        typeof value.groundRole === "string"
      ) {
        map.set(value.slot, value.groundRole);
      }
    }
    return map;
  }

  function resolvedBindings(subject) {
    const piece = resolutionPiece(subject);
    const map = bindingMap(piece);
    for (const [slot, groundRole] of bindingMap(subject)) {
      map.set(slot, groundRole);
    }
    return map;
  }

  function boundValue(groundRole) {
    return facts.find(
      (record) =>
        record.kind === "design.binding" &&
        record.value?.groundRole === groundRole &&
        typeof record.subject === "string",
    )?.subject;
  }

  function literal(valueId) {
    if (!valueId) return undefined;
    const value = fact(valueId, "design-value.variant")?.value;
    return value?.form === "literal" && value.literal && typeof value.literal === "object"
      ? value.literal
      : undefined;
  }

  function cssScalar(valueId) {
    const value = literal(valueId);
    if (!value || typeof value.type !== "string") return undefined;
    if (value.type === "color" && Array.isArray(value.channels)) {
      const [r, g, b] = value.channels.map((channel) => Math.round(Number(channel) * 255));
      return `rgb(${r} ${g} ${b} / ${String(value.alpha ?? 1)})`;
    }
    if (value.type === "dimension") return `${String(value.value)}${String(value.unit)}`;
    if (value.type === "number" || value.type === "font-weight") return String(value.value);
    if (value.type === "duration") return `${String(value.value)}${String(value.unit)}`;
    if (value.type === "cubic-bezier") {
      return `cubic-bezier(${[value.x1, value.y1, value.x2, value.y2].map(String).join(", ")})`;
    }
    if (value.type === "stroke-style") {
      return typeof value.style === "string" ? value.style : undefined;
    }
    if (value.type === "font-family" && Array.isArray(value.families)) {
      return value.families
        .map((entry) => entry?.family)
        .filter(Boolean)
        .join(", ");
    }
    if (value.type === "border") {
      return [cssScalar(value.width), cssScalar(value.style), cssScalar(value.color)]
        .filter(Boolean)
        .join(" ");
    }
    return undefined;
  }

  function normalizedPercent(valueId) {
    const value = literal(valueId);
    return value?.type === "number" && typeof value.value === "number"
      ? `${String(value.value * 100)}%`
      : undefined;
  }

  function cssGradient(valueId) {
    const value = literal(valueId);
    if (value?.type !== "gradient" || value.kind !== "radial") return undefined;
    const centerInline = normalizedPercent(value.centerInline);
    const centerBlock = normalizedPercent(value.centerBlock);
    if (!centerInline || !centerBlock || !Array.isArray(value.stops)) return undefined;
    const stops = value.stops.map((entry) => {
      const color = cssScalar(entry?.color);
      const position = normalizedPercent(entry?.position);
      return color && position ? `${color} ${position}` : undefined;
    });
    if (stops.some((item) => !item)) return undefined;
    return `radial-gradient(circle at ${centerInline} ${centerBlock}, ${stops.join(", ")})`;
  }

  function typography(valueId) {
    const value = literal(valueId);
    if (value?.type !== "typography") return {};
    return Object.fromEntries(
      [
        ["font-family", cssScalar(value.family)],
        ["font-size", cssScalar(value.size)],
        ["font-weight", cssScalar(value.weight)],
        ["line-height", cssScalar(value.lineHeight)],
        ["letter-spacing", cssScalar(value.tracking)],
      ].filter(([, item]) => item !== undefined),
    );
  }

  function expectedStyle(subject) {
    const bindings = resolvedBindings(subject);
    const token = (slot) => cssScalar(boundValue(bindings.get(slot)));
    const typeValue = boundValue(bindings.get("type"));
    const surfaceValue = boundValue(bindings.get("surface"));
    const motionValue = boundValue(bindings.get("motion"));
    const motion = literal(motionValue);
    const entries = {
      ...typography(typeValue),
      "background-color": literal(surfaceValue)?.type === "color" ? cssScalar(surfaceValue) : undefined,
      "background-image": cssGradient(surfaceValue),
      color: token("ink"),
      "padding-inline": token("inset-inline"),
      "padding-block": token("inset-block"),
      gap: token("inter-item-block") ?? token("inter-item-inline"),
      "border-radius": token("corner"),
      opacity: token("opacity"),
      "--uir-rule": token("rule"),
      "--uir-outline": token("outline"),
      "animation-duration": motion?.type === "transition" ? cssScalar(motion.duration) : undefined,
      "animation-timing-function": motion?.type === "transition" ? cssScalar(motion.curve) : undefined,
      "animation-delay": motion?.type === "transition" ? cssScalar(motion.delay) : undefined,
    };
    return Object.fromEntries(Object.entries(entries).filter(([, value]) => value !== undefined));
  }

  function themeStyle() {
    const token = (name) => cssScalar(boundValue(`uir-site:role:${name}`));
    const entries = {
      "--uir-canvas": token("canvas"),
      "--uir-surface": token("surface"),
      "--uir-surface-muted": token("surface-muted"),
      "--uir-surface-ink": token("surface-ink"),
      "--uir-ink": token("ink"),
      "--uir-ink-muted": token("ink-muted"),
      "--uir-accent": token("surface-action"),
      "--uir-rule-color": cssScalar(boundValue("uir-site:role:rule")),
      "--uir-content": token("frame-desktop-content"),
      "--uir-mobile-content": token("frame-mobile-content"),
      "--uir-page-inline": token("inset-page-inline"),
    };
    return Object.fromEntries(Object.entries(entries).filter(([, value]) => value !== undefined));
  }

  return {
    root,
    byFile,
    records,
    byId,
    facts,
    relations,
    entities,
    fact,
    factsOf,
    contains,
    childrenByParent,
    parentByNode,
    orderByNode,
    controls,
    rootId,
    walk,
    textValue,
    gapText,
    role,
    salience,
    resolutionPiece,
    resolvedBindings,
    boundValue,
    literal,
    cssScalar,
    expectedStyle,
    themeStyle,
  };
}

export async function deriveDesignSource(packageRoot = "app/uir-package") {
  const pkg = await loadPackage(packageRoot);
  return stable({
    schemaVersion: "uir.design-source/v1",
    surface: "uir-site:surface:home",
    root: nodeKey(pkg.rootId),
    nodes: pkg.walk(pkg.rootId).map((subject) => {
      const parent = pkg.parentByNode.get(subject);
      const controlled = pkg.controls.get(subject);
      return {
        id: subject,
        key: nodeKey(subject),
        role: pkg.role(subject),
        salience: pkg.salience(subject),
        content: pkg.gapText(subject) ?? pkg.textValue(subject),
        parent: parent ? nodeKey(parent) : null,
        order: pkg.orderByNode.get(subject) ?? 0,
        controls: controlled ? nodeKey(controlled) : null,
      };
    }),
  });
}

export async function deriveDesignSystemSource(packageRoot = "app/uir-package") {
  const pkg = await loadPackage(packageRoot);
  const designRecords = pkg.byFile["model/design-system.json"].records ?? [];
  const values = designRecords
    .filter((record) => record.recordType === "Fact" && record.kind === "design-value.definition")
    .map((definition) => ({
      id: definition.subject,
      definition: definition.value,
      literal: pkg.fact(definition.subject, "design-value.variant")?.value?.literal ?? null,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const bindings = designRecords
    .filter((record) => record.recordType === "Fact" && record.kind === "design.binding")
    .map((record) => ({ value: record.subject, groundRole: record.value?.groundRole }))
    .sort((a, b) => `${a.groundRole}:${a.value}`.localeCompare(`${b.groundRole}:${b.value}`));

  const pieces = designRecords
    .filter((record) => record.recordType === "Entity" && record.kind === "Piece")
    .map((piece) => ({
      id: piece.id,
      identity: pkg.fact(piece.id, "piece.identity")?.value ?? null,
      bindings: pkg.factsOf(piece.id, "presentation.binding")
        .map((binding) => ({
          slot: binding.value?.slot,
          outcome: binding.value?.outcome,
          groundRole: binding.value?.groundRole ?? null,
        }))
        .sort((a, b) => String(a.slot).localeCompare(String(b.slot))),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const resolutions = designRecords
    .filter((record) => record.recordType === "Entity" && record.kind === "Resolution")
    .map((resolution) => ({
      id: resolution.id,
      outcome: resolution.outcome,
      selectors: pkg.factsOf(resolution.id, "resolution.selector")
        .map((selector) => selector.value)
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const constraints = designRecords
    .filter((record) => record.recordType === "Fact" && record.kind === "design.constraint")
    .map((record) => ({ subject: record.subject, value: record.value }))
    .sort((a, b) => String(a.subject).localeCompare(String(b.subject)));

  return stable({
    schemaVersion: "uir.design-system-source/v1",
    values,
    bindings,
    pieces,
    resolutions,
    constraints,
  });
}

function jsonDiff(expected, actual, path = "$", out = []) {
  if (out.length >= 100 || isDeepStrictEqual(expected, actual)) return out;
  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) {
      out.push(`${path}: expected length ${expected.length}, got ${actual.length}`);
    }
    const length = Math.min(expected.length, actual.length);
    for (let index = 0; index < length && out.length < 100; index += 1) {
      jsonDiff(expected[index], actual[index], `${path}[${index}]`, out);
    }
    return out;
  }
  if (expected && actual && typeof expected === "object" && typeof actual === "object") {
    const keys = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort();
    for (const key of keys) {
      if (!(key in expected)) out.push(`${path}.${key}: unexpected value`);
      else if (!(key in actual)) out.push(`${path}.${key}: missing value`);
      else jsonDiff(expected[key], actual[key], `${path}.${key}`, out);
      if (out.length >= 100) break;
    }
    return out;
  }
  out.push(`${path}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  return out;
}

export async function verifySourceTranslation({
  packageRoot = "app/uir-package",
  designSource = "uir/source/design.json",
  designSystemSource = "uir/source/design-system.json",
} = {}) {
  const [expectedDesign, expectedDesignSystem, actualDesign, actualDesignSystem] = await Promise.all([
    readJson(resolve(designSource)),
    readJson(resolve(designSystemSource)),
    deriveDesignSource(packageRoot),
    deriveDesignSystemSource(packageRoot),
  ]);
  const mismatches = [
    ...jsonDiff(expectedDesign, actualDesign, "design"),
    ...jsonDiff(expectedDesignSystem, actualDesignSystem, "designSystem"),
  ];
  return { ok: mismatches.length === 0, mismatches };
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function parseAttributes(raw) {
  const attrs = {};
  const regex = /([A-Za-z_:][A-Za-z0-9_:.-]*)(?:="([^"]*)")?/g;
  for (const match of raw.matchAll(regex)) attrs[match[1]] = decodeHtml(match[2] ?? "");
  return attrs;
}

function parseStyle(raw) {
  const map = {};
  for (const chunk of decodeHtml(raw).split(";")) {
    const colon = chunk.indexOf(":");
    if (colon < 0) continue;
    const key = chunk.slice(0, colon).trim();
    const value = chunk.slice(colon + 1).trim();
    if (key) map[key] = value;
  }
  return map;
}

function normalizeCss(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")");
}

function tagForRole(role) {
  return ({
    document: "main",
    navigation: "nav",
    region: "section",
    group: "div",
    heading: "div",
    paragraph: "p",
    link: "a",
    code: "pre",
    list: "ul",
    listitem: "li",
  })[role] ?? "div";
}

function parseObserved(html) {
  const token = /<\/?([A-Za-z][A-Za-z0-9:-]*)([^>]*)>/g;
  const stack = [];
  const nodes = [];
  const byKey = new Map();
  const orderCounts = new Map();
  let match;
  while ((match = token.exec(html))) {
    const full = match[0];
    const tag = match[1].toLowerCase();
    const closing = full.startsWith("</");
    if (closing) {
      for (let index = stack.length - 1; index >= 0; index -= 1) {
        const frame = stack[index];
        stack.splice(index);
        if (frame.node) frame.node.closeStart = match.index;
        if (frame.tag === tag) break;
      }
      continue;
    }
    const attrs = parseAttributes(match[2]);
    const key = attrs["data-node"];
    const parentNode = [...stack].reverse().find((frame) => frame.node)?.node;
    let observed;
    if (key) {
      const parentKey = parentNode?.key ?? null;
      const counterKey = parentKey ?? "$root";
      const order = orderCounts.get(counterKey) ?? 0;
      orderCounts.set(counterKey, order + 1);
      observed = {
        key,
        tag,
        attrs,
        style: parseStyle(attrs.style ?? ""),
        parent: parentKey,
        order,
        openEnd: token.lastIndex,
        closeStart: token.lastIndex,
      };
      nodes.push(observed);
      byKey.set(key, observed);
    }
    const selfClosing = full.endsWith("/>") || VOID_TAGS.has(tag);
    if (!selfClosing) stack.push({ tag, node: observed });
  }

  for (const node of nodes) {
    const inner = html.slice(node.openEnd, node.closeStart);
    node.text = decodeHtml(inner.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
  }

  const targetMatch = html.match(/<div\b([^>]*class="[^"]*uir-target[^"]*"[^>]*)>/i);
  const targetAttrs = targetMatch ? parseAttributes(targetMatch[1]) : {};
  return { nodes, byKey, targetAttrs, targetStyle: parseStyle(targetAttrs.style ?? "") };
}

export async function verifyRenderedTarget(html, packageRoot = "app/uir-package") {
  const pkg = await loadPackage(packageRoot);
  const observed = parseObserved(html);
  const expectedSubjects = pkg.walk(pkg.rootId);
  const mismatches = [];

  if (observed.nodes.length !== expectedSubjects.length) {
    mismatches.push(`node count: expected ${expectedSubjects.length}, got ${observed.nodes.length}`);
  }

  for (const subject of expectedSubjects) {
    const key = nodeKey(subject);
    const actual = observed.byKey.get(key);
    if (!actual) {
      mismatches.push(`${key}: missing rendered node`);
      continue;
    }
    const role = pkg.role(subject);
    const salience = pkg.salience(subject);
    const parent = pkg.parentByNode.get(subject);
    const expectedParent = parent ? nodeKey(parent) : null;
    const expectedOrder = pkg.orderByNode.get(subject) ?? 0;
    const expectedTag = tagForRole(role);
    if (actual.tag !== expectedTag) mismatches.push(`${key}: tag expected ${expectedTag}, got ${actual.tag}`);
    if (actual.attrs["data-role"] !== role) mismatches.push(`${key}: role expected ${role}, got ${actual.attrs["data-role"]}`);
    if (actual.attrs["data-salience"] !== salience) mismatches.push(`${key}: salience expected ${salience}, got ${actual.attrs["data-salience"]}`);
    const expectedPiece = pkg.resolutionPiece(subject);
    if (actual.attrs["data-uir-piece"] !== expectedPiece) {
      mismatches.push(`${key}: Piece expected ${expectedPiece}, got ${actual.attrs["data-uir-piece"]}`);
    }
    const expectedBindings = [...pkg.resolvedBindings(subject).entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([slot, groundRole]) => `${slot}=${groundRole}`)
      .join("|");
    if (actual.attrs["data-uir-bindings"] !== expectedBindings) {
      mismatches.push(`${key}: bindings expected ${expectedBindings}, got ${actual.attrs["data-uir-bindings"]}`);
    }
    if (actual.parent !== expectedParent) mismatches.push(`${key}: parent expected ${expectedParent}, got ${actual.parent}`);
    if (actual.order !== expectedOrder) mismatches.push(`${key}: order expected ${expectedOrder}, got ${actual.order}`);

    const children = pkg.childrenByParent.get(subject) ?? [];
    const expectedText = pkg.gapText(subject) ?? pkg.textValue(subject);
    if (children.length === 0 && expectedText && actual.text !== expectedText) {
      mismatches.push(`${key}: content expected ${JSON.stringify(expectedText)}, got ${JSON.stringify(actual.text)}`);
    }

    const controlled = pkg.controls.get(subject);
    if (controlled) {
      const href = `#${nodeKey(controlled)}`;
      if (actual.attrs.href !== href) mismatches.push(`${key}: href expected ${href}, got ${actual.attrs.href}`);
    }

    const expectedStyle = pkg.expectedStyle(subject);
    for (const [property, expectedValue] of Object.entries(expectedStyle)) {
      const actualValue = actual.style[property];
      if (normalizeCss(actualValue) !== normalizeCss(expectedValue)) {
        mismatches.push(`${key}: style ${property} expected ${expectedValue}, got ${actualValue}`);
      }
    }
  }

  for (const [property, expectedValue] of Object.entries(pkg.themeStyle())) {
    const actualValue = observed.targetStyle[property];
    if (normalizeCss(actualValue) !== normalizeCss(expectedValue)) {
      mismatches.push(`theme: ${property} expected ${expectedValue}, got ${actualValue}`);
    }
  }

  return { ok: mismatches.length === 0, mismatches, expectedNodes: expectedSubjects.length };
}

export async function snapshotSources({
  packageRoot = "app/uir-package",
  designSource = "uir/source/design.json",
  designSystemSource = "uir/source/design-system.json",
} = {}) {
  const [design, designSystem] = await Promise.all([
    deriveDesignSource(packageRoot),
    deriveDesignSystemSource(packageRoot),
  ]);
  for (const [path, value] of [[designSource, design], [designSystemSource, designSystem]]) {
    await mkdir(dirname(resolve(path)), { recursive: true });
    await writeFile(resolve(path), `${JSON.stringify(value, null, 2)}\n`, "utf8");
  }
}

async function cli() {
  const args = new Set(process.argv.slice(2));
  if (args.has("--snapshot-sources")) {
    await snapshotSources();
    console.log("wrote frozen design and design-system source contracts");
    return;
  }
  if (args.has("--verify-sources")) {
    const result = await verifySourceTranslation();
    if (!result.ok) {
      console.error(result.mismatches.join("\n"));
      process.exitCode = 1;
    } else {
      console.log("design + design-system → UIR translation conforms");
    }
    return;
  }
  console.log("Usage: node tool/uir_conformance.mjs --snapshot-sources | --verify-sources");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await cli();
}
