import type { CSSProperties } from "react";
import designSystemModel from "./uir-package/model/design-system.json";
import interfaceModel from "./uir-package/model/interface.json";
import packageModel from "./uir-package/model/package.json";
import provenanceModel from "./uir-package/model/provenance.json";
import manifest from "./uir-package/package.json";
import type { InspectionRecord } from "./Inspector";
import type { SurfaceFieldConfig } from "./SurfaceField";

type UIRRecord = {
  id: string;
  kind?: string;
  recordType: string;
  subject?: string;
  source?: string;
  target?: string;
  order?: number;
  outcome?: string;
  rationale?: string;
  plane?: string;
  provenance?: string;
  mode?: string;
  sources?: string[];
  locator?: string;
  value?: Record<string, unknown>;
};

type NodeView = {
  id: string;
  key: string;
  role: string;
  content: string;
  salience: string;
  children: string[];
  parent?: string;
  href?: string;
  gap?: string;
};

const records = [
  ...designSystemModel.records,
  ...interfaceModel.records,
  ...packageModel.records,
  ...provenanceModel.records,
] as UIRRecord[];

const byId = new Map(records.map((record) => [record.id, record]));
const facts = records.filter((record) => record.recordType === "Fact");
const relations = records.filter((record) => record.recordType === "Relation");

function fact(subject: string, kind: string) {
  return facts.find((record) => record.subject === subject && record.kind === kind);
}

function factsOf(subject: string, kind: string) {
  return facts.filter((record) => record.subject === subject && record.kind === kind);
}

function textValue(subject: string) {
  const value = fact(subject, "node.content")?.value;
  return value?.type === "text" && typeof value.value === "string"
    ? value.value
    : "";
}

function nodeRole(subject: string) {
  const value = fact(subject, "node.role")?.value;
  return typeof value?.role === "string" ? value.role : "group";
}

function nodeSalience(subject: string) {
  const value = fact(subject, "node.salience")?.value;
  return typeof value?.level === "string" ? value.level : "supporting";
}

function nodeKey(subject: string) {
  return subject.split(":").at(-1) ?? subject;
}

const contains = relations
  .filter((record) => record.kind === "contains")
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

const parentByNode = new Map(
  contains
    .filter((record) => record.source?.includes(":node:"))
    .map((record) => [record.target as string, record.source as string]),
);

const childrenByParent = new Map<string, string[]>();
for (const relation of contains) {
  if (!relation.source || !relation.target) continue;
  const current = childrenByParent.get(relation.source) ?? [];
  current.push(relation.target);
  childrenByParent.set(relation.source, current);
}

const controls = new Map(
  relations
    .filter((record) => record.kind === "controls" && record.source && record.target)
    .map((record) => [record.source as string, record.target as string]),
);

function sourceHref(subject: string) {
  const locators = [byId.get(subject), ...facts.filter((record) => record.subject === subject)]
    .flatMap((record) => {
      const provenance = record?.provenance ? byId.get(record.provenance) : undefined;
      return provenance?.sources ?? [];
    })
    .map((source) => byId.get(source)?.locator)
    .filter((locator): locator is string =>
      typeof locator === "string" && locator.startsWith("https://"),
    );
  const unique = [...new Set(locators)];
  return unique.length === 1 ? unique[0] : undefined;
}

const gaps = records.filter(
  (record) => record.recordType === "Entity" && record.kind === "Gap",
);

function view(subject: string): NodeView {
  const controlled = controls.get(subject);
  const gap = gaps.find((record) => record.target === subject);
  return {
    id: subject,
    key: nodeKey(subject),
    role: nodeRole(subject),
    content: textValue(subject),
    salience: nodeSalience(subject),
    children: childrenByParent.get(subject) ?? [],
    parent: parentByNode.get(subject),
    href: controlled ? `#${nodeKey(controlled)}` : sourceHref(subject),
    gap: gap?.rationale,
  };
}

function resolutionPiece(role: string) {
  for (const selector of facts.filter(
    (record) =>
      record.kind === "resolution.selector" &&
      record.value?.dimension === "role" &&
      record.value?.role === role,
  )) {
    if (!selector.subject) continue;
    const resolution = byId.get(selector.subject);
    if (resolution?.recordType === "Entity" && typeof resolution.outcome === "string") {
      return resolution.outcome;
    }
  }
  return undefined;
}

function bindingMap(subject: string | undefined) {
  const result = new Map<string, string>();
  if (!subject) return result;
  for (const binding of factsOf(subject, "presentation.binding")) {
    const value = binding.value;
    if (
      typeof value?.slot === "string" &&
      value.outcome === "role" &&
      typeof value.groundRole === "string"
    ) {
      result.set(value.slot, value.groundRole);
    }
  }
  return result;
}

function boundValue(groundRole: string) {
  const binding = facts.find(
    (record) =>
      record.kind === "design.binding" &&
      record.value?.groundRole === groundRole &&
      typeof record.subject === "string",
  );
  return binding?.subject;
}

function literal(valueId: string | undefined): Record<string, unknown> | undefined {
  if (!valueId) return undefined;
  const variant = fact(valueId, "design-value.variant")?.value;
  return variant?.form === "literal" &&
    variant.literal &&
    typeof variant.literal === "object"
    ? (variant.literal as Record<string, unknown>)
    : undefined;
}

function cssScalar(valueId: string | undefined): string | undefined {
  const value = literal(valueId);
  if (!value || typeof value.type !== "string") return undefined;
  if (value.type === "color" && Array.isArray(value.channels)) {
    const [r, g, b] = value.channels.map((channel) =>
      Math.round(Number(channel) * 255),
    );
    return `rgb(${r} ${g} ${b} / ${String(value.alpha ?? 1)})`;
  }
  if (value.type === "dimension") {
    return `${String(value.value)}${String(value.unit)}`;
  }
  if (value.type === "number" || value.type === "font-weight") {
    return String(value.value);
  }
  if (value.type === "duration") {
    return String(value.value) + String(value.unit);
  }
  if (value.type === "cubic-bezier") {
    return "cubic-bezier(" + [value.x1, value.y1, value.x2, value.y2].map(String).join(", ") + ")";
  }
  if (value.type === "stroke-style") {
    return typeof value.style === "string" ? value.style : undefined;
  }
  if (value.type === "font-family" && Array.isArray(value.families)) {
    return value.families
      .map((entry) => {
        const family = entry as { family?: string };
        return family.family;
      })
      .filter(Boolean)
      .join(", ");
  }
  if (value.type === "border") {
    return [
      cssScalar(typeof value.width === "string" ? value.width : undefined),
      cssScalar(typeof value.style === "string" ? value.style : undefined),
      cssScalar(typeof value.color === "string" ? value.color : undefined),
    ]
      .filter(Boolean)
      .join(" ");
  }
  return undefined;
}

function cssColor(valueId: string | undefined, alphaOverride?: number) {
  const value = literal(valueId);
  if (value?.type !== "color" || !Array.isArray(value.channels)) return undefined;
  const [r, g, b] = value.channels.map((channel) =>
    Math.round(Number(channel) * 255),
  );
  return {
    color: `rgb(${r} ${g} ${b})`,
    alpha:
      typeof alphaOverride === "number"
        ? alphaOverride
        : Number(value.alpha ?? 1),
  };
}

function normalizedPercent(valueId: string | undefined): string | undefined {
  const value = literal(valueId);
  if (value?.type !== "number" || typeof value.value !== "number") return undefined;
  return String(value.value * 100) + "%";
}

function cssGradient(valueId: string | undefined): string | undefined {
  const value = literal(valueId);
  if (value?.type !== "gradient" || value.kind !== "radial") return undefined;
  const centerInline = normalizedPercent(
    typeof value.centerInline === "string" ? value.centerInline : undefined,
  );
  const centerBlock = normalizedPercent(
    typeof value.centerBlock === "string" ? value.centerBlock : undefined,
  );
  if (!centerInline || !centerBlock || !Array.isArray(value.stops)) return undefined;
  const stops = value.stops.map((entry) => {
    const stop = entry as { color?: string; position?: string };
    const color = cssScalar(stop.color);
    const position = normalizedPercent(stop.position);
    return color && position ? color + " " + position : undefined;
  });
  if (stops.some((stop) => !stop)) return undefined;
  return "radial-gradient(circle at " + centerInline + " " + centerBlock + ", " + stops.join(", ") + ")";
}

function valueLabel(valueId: string | undefined) {
  if (!valueId) return "none";
  const definition = fact(valueId, "design-value.definition")?.value;
  const name = typeof definition?.name === "string" ? definition.name : nodeKey(valueId);
  const scalar = cssScalar(valueId);
  return scalar ? `${name} · ${scalar}` : name;
}

function typography(valueId: string | undefined): CSSProperties {
  const value = literal(valueId);
  if (value?.type !== "typography") return {};
  return {
    fontFamily: cssScalar(typeof value.family === "string" ? value.family : undefined),
    fontSize: cssScalar(typeof value.size === "string" ? value.size : undefined),
    fontWeight: cssScalar(typeof value.weight === "string" ? value.weight : undefined),
    lineHeight: cssScalar(
      typeof value.lineHeight === "string" ? value.lineHeight : undefined,
    ),
    letterSpacing: cssScalar(
      typeof value.tracking === "string" ? value.tracking : undefined,
    ),
  };
}

function resolvedBindings(node: NodeView, piece = resolutionPiece(node.role)) {
  const bindings = bindingMap(piece);
  for (const [slot, role] of bindingMap(node.id)) bindings.set(slot, role);
  return bindings;
}

function nodeStyle(node: NodeView, piece = resolutionPiece(node.role)): CSSProperties {
  const bindings = resolvedBindings(node, piece);
  const token = (slot: string) => cssScalar(boundValue(bindings.get(slot) ?? ""));
  const typeValue = boundValue(bindings.get("type") ?? "");
  const surfaceValue = boundValue(bindings.get("surface") ?? "");
  const motionValue = boundValue(bindings.get("motion") ?? "");
  const motion = literal(motionValue);
  return {
    ...typography(typeValue),
    backgroundColor: literal(surfaceValue)?.type === "color"
      ? cssScalar(surfaceValue)
      : undefined,
    backgroundImage: cssGradient(surfaceValue),
    color: token("ink"),
    paddingInline: token("inset-inline"),
    paddingBlock: token("inset-block"),
    gap: token("inter-item-block") ?? token("inter-item-inline"),
    borderRadius: token("corner"),
    opacity: token("opacity"),
    "--uir-rule": token("rule"),
    "--uir-outline": token("outline"),
    animationDuration:
      motion?.type === "transition" && typeof motion.duration === "string"
        ? cssScalar(motion.duration)
        : undefined,
    animationTimingFunction:
      motion?.type === "transition" && typeof motion.curve === "string"
        ? cssScalar(motion.curve)
        : undefined,
    animationDelay:
      motion?.type === "transition" && typeof motion.delay === "string"
        ? cssScalar(motion.delay)
        : undefined,
  } as CSSProperties;
}

function nodePresentationData(node: NodeView, piece = resolutionPiece(node.role)) {
  const bindings = resolvedBindings(node, piece);
  const surfaceValue = boundValue(bindings.get("surface") ?? "");
  const surface = literal(surfaceValue);
  const motionValue = boundValue(bindings.get("motion") ?? "");
  const event = facts.find(
    (record) =>
      record.kind === "design.constraint" &&
      Array.isArray(record.value?.allowedTransitions) &&
      record.value.allowedTransitions.includes(motionValue),
  )?.value?.event;
  return {
    "data-uir-surface":
      surface?.type === "gradient" && typeof surface.kind === "string"
        ? surface.kind + "-gradient"
        : undefined,
    "data-uir-motion": motionValue ? nodeKey(motionValue) : undefined,
    "data-uir-motion-event": typeof event === "string" ? event : undefined,
    "data-uir-surface-field": event === "pointer-dot-field" ? "points" : undefined,
  };
}

function durationMilliseconds(valueId: string | undefined) {
  const value = literal(valueId);
  if (value?.type !== "duration" || typeof value.value !== "number") return undefined;
  if (value.unit === "s") return value.value * 1000;
  if (value.unit === "ms") return value.value;
  return undefined;
}

function surfaceFieldConfig(node: NodeView, piece = resolutionPiece(node.role)): SurfaceFieldConfig | undefined {
  const bindings = resolvedBindings(node, piece);
  const surfaceValueId = boundValue(bindings.get("surface") ?? "");
  const motionValueId = boundValue(bindings.get("motion") ?? "");
  const surface = literal(surfaceValueId);
  const motion = literal(motionValueId);
  if (
    surface?.type !== "gradient" ||
    surface.kind !== "radial" ||
    !Array.isArray(surface.stops) ||
    motion?.type !== "transition"
  ) {
    return undefined;
  }
  const constraint = facts.find(
    (record) =>
      record.kind === "design.constraint" &&
      Array.isArray(record.value?.allowedTransitions) &&
      record.value.allowedTransitions.includes(motionValueId),
  );
  if (constraint?.value?.event !== "pointer-dot-field") return undefined;

  const first = surface.stops.at(0) as { color?: string } | undefined;
  const last = surface.stops.at(-1) as { color?: string } | undefined;
  const dot = cssColor(first?.color);
  const background = cssColor(last?.color, 1);
  const cycleMs = durationMilliseconds(
    typeof motion.duration === "string" ? motion.duration : undefined,
  );
  if (!dot || !background || !cycleMs) return undefined;
  return {
    backgroundColor: background.color,
    cycleMs,
    dotColor: dot.color,
    dotOpacity: dot.alpha,
    motionlessAllowed: constraint.value?.motionlessAllowed === true,
  };
}

function themeStyle(): CSSProperties {
  const token = (name: string) =>
    cssScalar(boundValue(`uir-site:role:${name}`));
  return {
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
  } as CSSProperties;
}

const discoveredRootId = contains.find(
  (relation) => relation.source === "uir-site:surface:home",
)?.target;

if (!discoveredRootId) {
  throw new Error("The checked UIR Surface has no contained document root.");
}

const rootId = discoveredRootId;

function walk(subject: string): string[] {
  return [subject, ...(childrenByParent.get(subject) ?? []).flatMap(walk)];
}

const sourceNames = new Map(
  records
    .filter((record) => record.recordType === "Entity" && record.kind === "Source")
    .map((source) => {
      const description = fact(source.id, "source.description")?.value;
      const name =
        typeof description?.name === "string" ? description.name : nodeKey(source.id);
      return [source.id, name];
    }),
);

function provenanceFor(recordsToInspect: UIRRecord[]) {
  const provenance = recordsToInspect
    .map((record) => (record.provenance ? byId.get(record.provenance) : undefined))
    .filter((record): record is UIRRecord => Boolean(record));
  const modes = [...new Set(provenance.map((record) => record.mode).filter(Boolean))] as string[];
  const sources = [
    ...new Set(
      provenance
        .flatMap((record) => record.sources ?? [])
        .map((source) => sourceNames.get(source) ?? nodeKey(source)),
    ),
  ].sort();
  return { modes: modes.sort(), sources };
}

function inspectionBindings(subject: string, piece: string | undefined) {
  const bindings = bindingMap(piece);
  for (const [slot, role] of bindingMap(subject)) bindings.set(slot, role);
  return [...bindings.entries()]
    .map(([slot, groundRole]) => {
      const definition = fact(groundRole, "design-value.definition")?.value;
      return {
        slot,
        role:
          typeof definition?.name === "string"
            ? definition.name
            : nodeKey(groundRole),
        value: valueLabel(boundValue(groundRole)),
      };
    })
    .sort((a, b) => a.slot.localeCompare(b.slot));
}

function inspectionManifest(): InspectionRecord[] {
  return walk(rootId).map((subject) => {
    const node = view(subject);
    const entity = byId.get(subject);
    const nodeFacts = facts.filter((record) => record.subject === subject);
    const piece = resolutionPiece(node.role);
    const pieceIdentity = piece ? fact(piece, "piece.identity")?.value : undefined;
    const controlled = controls.get(subject);
    const provenance = provenanceFor([entity, ...nodeFacts].filter(Boolean) as UIRRecord[]);
    return {
      key: node.key,
      id: node.id,
      label: node.content || node.key,
      role: node.role,
      salience: node.salience,
      content: node.content,
      parent: node.parent ? nodeKey(node.parent) : undefined,
      children: node.children.length,
      controls: controlled ? nodeKey(controlled) : undefined,
      piece: piece ?? "unresolved",
      pieceName:
        typeof pieceIdentity?.name === "string"
          ? pieceIdentity.name
          : piece
            ? nodeKey(piece)
            : "unresolved",
      facts: nodeFacts
        .map((record) => ({
          kind: record.kind ?? "Fact",
          plane: record.plane ?? "unclassified",
        }))
        .sort((a, b) => a.kind.localeCompare(b.kind)),
      bindings: inspectionBindings(subject, piece),
      sources: provenance.sources,
      modes: provenance.modes,
      gap: node.gap,
    };
  });
}

const inspectionNodes = inspectionManifest();


function subjectForKey(key: string) {
  const subject = key.startsWith("uir-site:node:") ? key : `uir-site:node:${key}`;
  if (!byId.has(subject)) throw new Error(`Unknown UIR node: ${key}`);
  return subject;
}

export function uirNode(key: string) {
  return view(subjectForKey(key));
}

export function uirText(key: string) {
  const node = uirNode(key);
  return node.gap ?? node.content;
}

export function uirHref(key: string) {
  return uirNode(key).href;
}

export function uirHasGap(key: string) {
  return Boolean(uirNode(key).gap);
}

export function uirNodeProps(key: string, actualRole: string, actualPiece: string) {
  const node = uirNode(key);
  const bindings = resolvedBindings(node, actualPiece);
  const conformanceBindings = [...bindings.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slot, groundRole]) => `${slot}=${groundRole}`)
    .join("|");
  return {
    id: node.key,
    "data-node": node.key,
    "data-role": actualRole,
    "data-salience": node.salience,
    "data-uir-piece": actualPiece,
    "data-uir-bindings": conformanceBindings,
    ...nodePresentationData(node, actualPiece),
    style: nodeStyle(node, actualPiece),
  };
}

export function uirSurfaceFieldConfig(key: string, actualPiece: string) {
  return surfaceFieldConfig(uirNode(key), actualPiece);
}

export function uirThemeStyle() {
  return themeStyle();
}

export const uirInspectionNodes = inspectionNodes;
export const uirManifest = manifest;

export function uirMetadata() {
  const metadata = fact("uir-site:package", "package.metadata")?.value;
  if (
    typeof metadata?.name !== "string" ||
    typeof metadata?.summary !== "string"
  ) {
    throw new Error("The checked UIR package has no complete package.metadata.");
  }
  return {
    title: metadata.name,
    description: metadata.summary,
  };
}
