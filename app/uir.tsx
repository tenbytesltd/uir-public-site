import type { CSSProperties, ReactNode } from "react";
import assetsModel from "./uir-package/model/assets.json";
import designSystemModel from "./uir-package/model/design-system.json";
import interfaceModel from "./uir-package/model/interface.json";
import packageModel from "./uir-package/model/package.json";
import provenanceModel from "./uir-package/model/provenance.json";
import manifest from "./uir-package/package.json";
import { Inspector, type InspectionRecord } from "./Inspector";
import { SurfaceField, type SurfaceFieldConfig } from "./SurfaceField";
import {
  UIRRuntime,
  type UIRManifest,
  type UIRNode,
  type UIRPackageData,
  type UIRShard,
} from "./playground/runtime";

const sitePackage: UIRPackageData = {
  manifest: manifest as UIRManifest,
  shards: {
    assets: assetsModel as UIRShard,
    "design-system": designSystemModel as UIRShard,
    interface: interfaceModel as UIRShard,
    package: packageModel as UIRShard,
    provenance: provenanceModel as UIRShard,
  },
  sourceName: "UIR public site",
  diagnostics: [],
};

const runtime = new UIRRuntime(sitePackage);
const rootId = runtime.contains.find(
  (relation) => relation.source === "uir-site:surface:home",
)?.target ?? runtime.rootIds[0];

if (!rootId) {
  throw new Error("The checked UIR Surface has no contained document root.");
}

function ancestorRoles(subject: string) {
  const roles: string[] = [];
  let current = runtime.parentByNode.get(subject);
  while (current) {
    roles.push(runtime.role(current));
    current = runtime.parentByNode.get(current);
  }
  return roles;
}

const firstPrimaryHeading = runtime.walk(rootId).find((subject) => {
  const node = runtime.node(subject);
  return (
    node.role === "heading" &&
    node.salience === "primary" &&
    !ancestorRoles(subject).includes("navigation")
  );
});

function siteNodeStyle(subject: string): CSSProperties {
  const bindings = runtime.resolvedBindings(subject);
  const token = (slot: string) => runtime.cssScalar(runtime.boundValue(bindings.get(slot)));
  const motionValue = runtime.boundValue(bindings.get("motion"));
  const motion = runtime.literal(motionValue);
  return {
    ...(runtime.styleForNode(subject) as CSSProperties),
    "--uir-rule": token("rule"),
    "--uir-outline": token("outline"),
    animationDuration:
      motion?.type === "transition" && typeof motion.duration === "string"
        ? runtime.cssScalar(motion.duration)
        : undefined,
    animationTimingFunction:
      motion?.type === "transition" && typeof motion.curve === "string"
        ? runtime.cssScalar(motion.curve)
        : undefined,
    animationDelay:
      motion?.type === "transition" && typeof motion.delay === "string"
        ? runtime.cssScalar(motion.delay)
        : undefined,
  } as CSSProperties;
}

function nodePresentationData(subject: string) {
  const bindings = runtime.resolvedBindings(subject);
  const surfaceValue = runtime.boundValue(bindings.get("surface"));
  const surface = runtime.literal(surfaceValue);
  const motionValue = runtime.boundValue(bindings.get("motion"));
  const event = runtime.facts.find(
    (record) =>
      record.kind === "design.constraint" &&
      Array.isArray(record.value?.allowedTransitions) &&
      record.value.allowedTransitions.includes(motionValue),
  )?.value?.event;
  return {
    "data-uir-surface":
      surface?.type === "gradient" && typeof surface.kind === "string"
        ? `${surface.kind}-gradient`
        : undefined,
    "data-uir-motion": motionValue ? motionValue.split(":").at(-1) : undefined,
    "data-uir-motion-event": typeof event === "string" ? event : undefined,
    "data-uir-surface-field": event === "pointer-dot-field" ? "points" : undefined,
  };
}

function cssColor(valueId: string | undefined, alphaOverride?: number) {
  const value = runtime.literal(valueId);
  if (value?.type !== "color" || !Array.isArray(value.channels)) return undefined;
  const [r, g, b] = value.channels.map((channel) => Math.round(Number(channel) * 255));
  return {
    color: `rgb(${r} ${g} ${b})`,
    alpha: typeof alphaOverride === "number" ? alphaOverride : Number(value.alpha ?? 1),
  };
}

function durationMilliseconds(valueId: string | undefined) {
  const value = runtime.literal(valueId);
  if (value?.type !== "duration" || typeof value.value !== "number") return undefined;
  if (value.unit === "s") return value.value * 1000;
  if (value.unit === "ms") return value.value;
  return undefined;
}

function surfaceFieldConfig(subject: string): SurfaceFieldConfig | undefined {
  const bindings = runtime.resolvedBindings(subject);
  const surfaceValueId = runtime.boundValue(bindings.get("surface"));
  const motionValueId = runtime.boundValue(bindings.get("motion"));
  const surface = runtime.literal(surfaceValueId);
  const motion = runtime.literal(motionValueId);
  if (
    surface?.type !== "gradient" ||
    surface.kind !== "radial" ||
    !Array.isArray(surface.stops) ||
    motion?.type !== "transition"
  ) {
    return undefined;
  }
  const constraint = runtime.facts.find(
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
  const token = (name: string) => runtime.cssScalar(runtime.boundValue(`uir-site:role:${name}`));
  return {
    "--uir-canvas": token("canvas"),
    "--uir-surface": token("surface"),
    "--uir-surface-muted": token("surface-muted"),
    "--uir-surface-ink": token("surface-ink"),
    "--uir-ink": token("ink"),
    "--uir-ink-muted": token("ink-muted"),
    "--uir-accent": token("surface-action"),
    "--uir-rule-color": runtime.cssScalar(runtime.boundValue("uir-site:role:rule")),
    "--uir-content": token("frame-desktop-content"),
    "--uir-mobile-content": token("frame-mobile-content"),
    "--uir-page-inline": token("inset-page-inline"),
  } as CSSProperties;
}

const inspectionNodes: InspectionRecord[] = runtime.walk(rootId).map((subject) => {
  const node = runtime.node(subject);
  return {
    key: node.key,
    id: node.id,
    label: node.content || node.key,
    role: node.role,
    salience: node.salience,
    content: node.content,
    parent: node.parent?.split(":").at(-1),
    children: node.children.length,
    controls: node.controls?.split(":").at(-1),
    piece: node.piece ?? "unresolved",
    pieceName: node.pieceName,
    facts: node.facts,
    bindings: node.bindings,
    sources: node.sources,
    modes: node.modes,
    gap: node.gap,
  };
});

function renderHeading(node: UIRNode, body: ReactNode) {
  const ancestors = ancestorRoles(node.id);
  if (ancestors.includes("navigation")) return <div className="brand">{body}</div>;
  if (node.id === firstPrimaryHeading) return <h1>{body}</h1>;
  if (ancestors.filter((role) => role === "region").length > 1) return <h3>{body}</h3>;
  return <h2>{body}</h2>;
}

function RenderNode({ subject }: { subject: string }) {
  const node = runtime.node(subject);
  const field = surfaceFieldConfig(subject);
  const childNodes = node.children.map((child) => <RenderNode key={child} subject={child} />);
  const children = <>{field ? <SurfaceField config={field} /> : null}{childNodes}</>;
  const body = node.gap ?? node.content;
  const common = {
    id: node.key,
    "data-node": node.key,
    "data-role": node.role,
    "data-salience": node.salience,
    ...nodePresentationData(subject),
    style: siteNodeStyle(subject),
  };

  switch (node.role) {
    case "document":
      return <main {...common}>{children}</main>;
    case "navigation":
      return <nav {...common}>{children}</nav>;
    case "region":
      return <section {...common}>{children}</section>;
    case "group":
      return <div {...common}>{children}</div>;
    case "heading":
      return <div {...common}>{renderHeading(node, body)}</div>;
    case "paragraph":
      return <p {...common} data-gap={node.gap ? "true" : undefined}>{body}</p>;
    case "link": {
      const external = node.href?.startsWith("https://");
      return (
        <a
          {...common}
          href={node.href}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer" : undefined}
        >
          {body}
        </a>
      );
    }
    case "code":
      return <pre {...common}><code>{body}</code></pre>;
    case "list":
      return <ul {...common}>{children}</ul>;
    case "listitem":
      return <li {...common}>{body}</li>;
    default:
      return <div {...common}>{body}{childNodes}</div>;
  }
}

export function UIRPage() {
  return (
    <>
      <div
        className="uir-target"
        data-uir-package={manifest.packageId}
        data-uir-version={manifest.packageVersion}
        style={themeStyle()}
      >
        <RenderNode subject={rootId} />
      </div>
      <Inspector
        nodes={inspectionNodes}
        packageId={manifest.packageId}
        packageVersion={manifest.packageVersion}
        recordCount={runtime.records.length}
      />
    </>
  );
}

export function uirMetadata() {
  const metadata = runtime.fact(manifest.packageId, "package.metadata")?.value;
  if (typeof metadata?.name !== "string" || typeof metadata?.summary !== "string") {
    throw new Error("The checked UIR package has no complete package.metadata.");
  }
  return { title: metadata.name, description: metadata.summary };
}
