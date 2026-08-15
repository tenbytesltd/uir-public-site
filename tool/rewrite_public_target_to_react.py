from pathlib import Path

root = Path('.')
source = (root / 'app/uir.tsx').read_text(encoding='utf-8')
cut = source.index('function renderHeading')
prefix = source[:cut]
prefix = prefix.replace('import type { CSSProperties, ReactNode } from "react";\n', 'import type { CSSProperties } from "react";\n')
prefix = prefix.replace('import { Inspector, type InspectionRecord } from "./Inspector";\n', 'import type { InspectionRecord } from "./Inspector";\n')
prefix = prefix.replace('import { SurfaceField, type SurfaceFieldConfig } from "./SurfaceField";\n', 'import type { SurfaceFieldConfig } from "./SurfaceField";\n')
prefix = prefix.replace(
    'function resolvedBindings(node: NodeView) {\n  const bindings = bindingMap(resolutionPiece(node.role));',
    'function resolvedBindings(node: NodeView, piece = resolutionPiece(node.role)) {\n  const bindings = bindingMap(piece);',
)
prefix = prefix.replace(
    'function nodeStyle(node: NodeView): CSSProperties {\n  const bindings = resolvedBindings(node);',
    'function nodeStyle(node: NodeView, piece = resolutionPiece(node.role)): CSSProperties {\n  const bindings = resolvedBindings(node, piece);',
)
prefix = prefix.replace(
    'function nodePresentationData(node: NodeView) {\n  const bindings = resolvedBindings(node);',
    'function nodePresentationData(node: NodeView, piece = resolutionPiece(node.role)) {\n  const bindings = resolvedBindings(node, piece);',
)
prefix = prefix.replace(
    'function surfaceFieldConfig(node: NodeView): SurfaceFieldConfig | undefined {\n  const bindings = resolvedBindings(node);',
    'function surfaceFieldConfig(node: NodeView, piece = resolutionPiece(node.role)): SurfaceFieldConfig | undefined {\n  const bindings = resolvedBindings(node, piece);',
)

append = r'''
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
'''
(root / 'app/uir-data.ts').write_text(prefix + append, encoding='utf-8')

(root / 'app/design-system.tsx').write_text(r'''import type { ReactNode } from "react";
import { SurfaceField } from "./SurfaceField";
import {
  uirHasGap,
  uirHref,
  uirNodeProps,
  uirSurfaceFieldConfig,
  uirText,
} from "./uir-data";

const PIECES = {
  document: "uir-site:piece:document",
  navigation: "uir-site:piece:navigation",
  region: "uir-site:piece:region",
  group: "uir-site:piece:group",
  heading: "uir-site:piece:heading",
  paragraph: "uir-site:piece:paragraph",
  link: "uir-site:piece:link",
  code: "uir-site:piece:code",
  list: "uir-site:piece:list",
  listitem: "uir-site:piece:listitem",
} as const;

type ContainerProps = {
  uirKey: string;
  children: ReactNode;
  className?: string;
};

type LeafProps = {
  uirKey: string;
  children?: ReactNode;
  className?: string;
};

function Decoration({ uirKey, piece }: { uirKey: string; piece: string }) {
  const config = uirSurfaceFieldConfig(uirKey, piece);
  return config ? <SurfaceField config={config} /> : null;
}

export function Document({ uirKey, children, className }: ContainerProps) {
  const piece = PIECES.document;
  return (
    <main {...uirNodeProps(uirKey, "document", piece)} className={className}>
      <Decoration uirKey={uirKey} piece={piece} />
      {children}
    </main>
  );
}

export function Navigation({ uirKey, children, className }: ContainerProps) {
  const piece = PIECES.navigation;
  return (
    <nav {...uirNodeProps(uirKey, "navigation", piece)} className={className}>
      <Decoration uirKey={uirKey} piece={piece} />
      {children}
    </nav>
  );
}

export function Region({ uirKey, children, className }: ContainerProps) {
  const piece = PIECES.region;
  return (
    <section {...uirNodeProps(uirKey, "region", piece)} className={className}>
      <Decoration uirKey={uirKey} piece={piece} />
      {children}
    </section>
  );
}

export function Group({ uirKey, children, className }: ContainerProps) {
  const piece = PIECES.group;
  return (
    <div {...uirNodeProps(uirKey, "group", piece)} className={className}>
      <Decoration uirKey={uirKey} piece={piece} />
      {children}
    </div>
  );
}

export function Brand({ uirKey, className = "brand" }: LeafProps) {
  return (
    <div {...uirNodeProps(uirKey, "heading", PIECES.heading)} className={className}>
      {uirText(uirKey)}
    </div>
  );
}

export function Heading({
  uirKey,
  level,
  children,
  className,
}: LeafProps & { level: 1 | 2 | 3 }) {
  const Tag = `h${level}` as const;
  return (
    <div {...uirNodeProps(uirKey, "heading", PIECES.heading)} className={className}>
      <Tag>{children ?? uirText(uirKey)}</Tag>
    </div>
  );
}

export function Paragraph({ uirKey, children, className }: LeafProps) {
  return (
    <p
      {...uirNodeProps(uirKey, "paragraph", PIECES.paragraph)}
      className={className}
      data-gap={uirHasGap(uirKey) ? "true" : undefined}
    >
      {children ?? uirText(uirKey)}
    </p>
  );
}

export function Link({ uirKey, children, className }: LeafProps) {
  const href = uirHref(uirKey);
  const external = href?.startsWith("https://");
  return (
    <a
      {...uirNodeProps(uirKey, "link", PIECES.link)}
      className={className}
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
    >
      {children ?? uirText(uirKey)}
    </a>
  );
}

export function Code({ uirKey, children, className }: LeafProps) {
  return (
    <pre {...uirNodeProps(uirKey, "code", PIECES.code)} className={className}>
      <code>{children ?? uirText(uirKey)}</code>
    </pre>
  );
}

export function List({ uirKey, children, className }: ContainerProps) {
  const piece = PIECES.list;
  return (
    <ul {...uirNodeProps(uirKey, "list", piece)} className={className}>
      <Decoration uirKey={uirKey} piece={piece} />
      {children}
    </ul>
  );
}

export function ListItem({ uirKey, children, className }: LeafProps) {
  return (
    <li {...uirNodeProps(uirKey, "listitem", PIECES.listitem)} className={className}>
      {children ?? uirText(uirKey)}
    </li>
  );
}

export const designSystemPieces = PIECES;
''', encoding='utf-8')

(root / 'app/Site.tsx').write_text(r'''import { Inspector } from "./Inspector";
import {
  Brand,
  Code,
  Document,
  Group,
  Heading,
  Link,
  List,
  ListItem,
  Navigation,
  Paragraph,
  Region,
} from "./design-system";
import {
  uirInspectionNodes,
  uirManifest,
  uirThemeStyle,
} from "./uir-data";

function Header() {
  return (
    <Navigation uirKey="navigation">
      <Brand uirKey="brand" />
      <Link uirKey="nav-extract" />
      <Link uirKey="nav-build" />
      <Link uirKey="nav-standard" />
      <Link uirKey="nav-source" />
    </Navigation>
  );
}

function Hero() {
  return (
    <Region uirKey="hero">
      <Paragraph uirKey="hero-kicker" />
      <Heading uirKey="hero-title" level={1} />
      <Paragraph uirKey="hero-lead" />
      <Group uirKey="hero-actions">
        <Link uirKey="hero-primary" />
        <Link uirKey="hero-secondary" />
      </Group>
      <Code uirKey="hero-command" />
      <Paragraph uirKey="install-gap" />
    </Region>
  );
}

function ProblemCard({ card, title, copy }: { card: string; title: string; copy: string }) {
  return (
    <Region uirKey={card}>
      <Heading uirKey={title} level={3} />
      <Paragraph uirKey={copy} />
    </Region>
  );
}

function Problem() {
  return (
    <Region uirKey="problem">
      <Paragraph uirKey="problem-kicker" />
      <Heading uirKey="problem-title" level={2} />
      <Paragraph uirKey="problem-lead" />
      <Group uirKey="problem-grid">
        <ProblemCard card="problem-design" title="problem-design-title" copy="problem-design-copy" />
        <ProblemCard card="problem-code" title="problem-code-title" copy="problem-code-copy" />
        <ProblemCard card="problem-system" title="problem-system-title" copy="problem-system-copy" />
      </Group>
    </Region>
  );
}

function FlowCard({ card, title, copy }: { card: string; title: string; copy: string }) {
  return (
    <Region uirKey={card}>
      <Heading uirKey={title} level={3} />
      <Paragraph uirKey={copy} />
    </Region>
  );
}

function Mechanism() {
  return (
    <Region uirKey="mechanism">
      <Paragraph uirKey="mechanism-kicker" />
      <Heading uirKey="mechanism-title" level={2} />
      <Paragraph uirKey="mechanism-copy" />
      <Group uirKey="mechanism-flow">
        <FlowCard card="flow-input" title="flow-input-title" copy="flow-input-copy" />
        <FlowCard card="flow-package" title="flow-package-title" copy="flow-package-copy" />
        <FlowCard card="flow-prototype" title="flow-prototype-title" copy="flow-prototype-copy" />
      </Group>
    </Region>
  );
}

function Playground() {
  return (
    <Region uirKey="showcase">
      <Paragraph uirKey="showcase-kicker" />
      <Heading uirKey="showcase-title" level={2} />
      <Paragraph uirKey="showcase-copy" />
      <Group uirKey="showcase-grid">
        <FlowCard card="showcase-source" title="showcase-source-title" copy="showcase-source-copy" />
        <FlowCard card="showcase-review" title="showcase-review-title" copy="showcase-review-copy" />
        <FlowCard card="showcase-inspect" title="showcase-inspect-title" copy="showcase-inspect-copy" />
      </Group>
      <Group uirKey="showcase-actions">
        <Link uirKey="showcase-repository" />
        <Code uirKey="showcase-path" />
      </Group>
    </Region>
  );
}

function CaptureCard({ card, title, copy, command }: { card: string; title: string; copy: string; command: string }) {
  return (
    <Region uirKey={card}>
      <Heading uirKey={title} level={3} />
      <Paragraph uirKey={copy} />
      <Code uirKey={command} />
    </Region>
  );
}

function WhatItCaptures() {
  return (
    <Region uirKey="quickstart">
      <Paragraph uirKey="quickstart-kicker" />
      <Heading uirKey="quickstart-title" level={2} />
      <Paragraph uirKey="quickstart-copy" />
      <Group uirKey="quickstart-steps">
        <CaptureCard card="quickstart-read" title="quickstart-read-title" copy="quickstart-read-copy" command="quickstart-read-command" />
        <CaptureCard card="quickstart-see" title="quickstart-see-title" copy="quickstart-see-copy" command="quickstart-see-command" />
        <CaptureCard card="quickstart-adopt" title="quickstart-adopt-title" copy="quickstart-adopt-copy" command="quickstart-adopt-command" />
      </Group>
    </Region>
  );
}

function HowItFits() {
  return (
    <Region uirKey="build">
      <Paragraph uirKey="build-kicker" />
      <Heading uirKey="build-title" level={2} />
      <Paragraph uirKey="build-copy" />
      <List uirKey="build-steps">
        <ListItem uirKey="build-step-1" />
        <ListItem uirKey="build-step-2" />
        <ListItem uirKey="build-step-3" />
        <ListItem uirKey="build-step-4" />
      </List>
    </Region>
  );
}

function PrincipleCard({ card, title, copy }: { card: string; title: string; copy: string }) {
  return (
    <Region uirKey={card}>
      <Heading uirKey={title} level={3} />
      <Paragraph uirKey={copy} />
    </Region>
  );
}

function WhyItWorks() {
  return (
    <Region uirKey="standard">
      <Paragraph uirKey="standard-kicker" />
      <Heading uirKey="standard-title" level={2} />
      <Paragraph uirKey="standard-copy" />
      <Group uirKey="standard-grid">
        <PrincipleCard card="standard-source" title="standard-source-title" copy="standard-source-copy" />
        <PrincipleCard card="standard-evidence" title="standard-evidence-title" copy="standard-evidence-copy" />
        <PrincipleCard card="standard-gaps" title="standard-gaps-title" copy="standard-gaps-copy" />
        <PrincipleCard card="standard-targets" title="standard-targets-title" copy="standard-targets-copy" />
      </Group>
    </Region>
  );
}

function Status() {
  return (
    <Region uirKey="status">
      <Paragraph uirKey="status-kicker" />
      <Heading uirKey="status-title" level={2} />
      <Paragraph uirKey="status-copy" />
      <List uirKey="status-list">
        <ListItem uirKey="status-item-1" />
        <ListItem uirKey="status-item-2" />
        <ListItem uirKey="status-item-3" />
      </List>
    </Region>
  );
}

function Footer() {
  return (
    <Region uirKey="footer">
      <Heading uirKey="footer-title" level={2} />
      <Paragraph uirKey="footer-copy" />
      <Link uirKey="footer-action" />
    </Region>
  );
}

export function PublicSite() {
  return (
    <>
      <div
        className="uir-target"
        data-uir-package={uirManifest.packageId}
        data-uir-version={uirManifest.packageVersion}
        style={uirThemeStyle()}
      >
        <Document uirKey="root">
          <Header />
          <Hero />
          <Problem />
          <Mechanism />
          <Playground />
          <WhatItCaptures />
          <HowItFits />
          <WhyItWorks />
          <Status />
          <Footer />
        </Document>
      </div>
      <Inspector
        nodes={uirInspectionNodes}
        packageId={uirManifest.packageId}
        packageVersion={uirManifest.packageVersion}
        recordCount={uirInspectionNodes.length}
      />
    </>
  );
}
''', encoding='utf-8')

(root / 'app/page.tsx').write_text(r'''import type { Metadata } from "next";
import { PublicSite } from "./Site";
import { uirMetadata } from "./uir-data";

export const dynamic = "force-static";

const publicMetadata = uirMetadata();

export const metadata: Metadata = {
  ...publicMetadata,
  openGraph: {
    ...publicMetadata,
    type: "website",
    images: [{ url: "./og.png", width: 1200, height: 630 }],
  },
  twitter: {
    ...publicMetadata,
    card: "summary_large_image",
    images: ["./og.png"],
  },
};

export default function Home() {
  return <PublicSite />;
}
''', encoding='utf-8')

rendered = (root / 'tests/rendered-html.test.mjs').read_text(encoding='utf-8')
rendered = rendered.replace('server-renders the checked UIR package as the marketing page', 'server-renders the real React site from the checked UIR package')
rendered = rendered.replace(
    'const [renderer, page, layout] = await Promise.all([\n    readFile(new URL("../app/uir.tsx", import.meta.url), "utf8"),\n    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),\n    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),\n  ]);',
    'const [site, designSystem, data, page, layout] = await Promise.all([\n    readFile(new URL("../app/Site.tsx", import.meta.url), "utf8"),\n    readFile(new URL("../app/design-system.tsx", import.meta.url), "utf8"),\n    readFile(new URL("../app/uir-data.ts", import.meta.url), "utf8"),\n    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),\n    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),\n  ]);'
)
rendered = rendered.replace(
    '    assert.doesNotMatch(renderer, new RegExp(phrase.replace(/[.*+?^$()|[\\]{}\\\\]/g, "\\\\$&")));\n    assert.doesNotMatch(page, new RegExp(phrase.replace(/[.*+?^$()|[\\]{}\\\\]/g, "\\\\$&")));\n    assert.doesNotMatch(layout, new RegExp(phrase.replace(/[.*+?^$()|[\\]{}\\\\]/g, "\\\\$&")));',
    '    const pattern = new RegExp(phrase.replace(/[.*+?^$()|[\\]{}\\\\]/g, "\\\\$&"));\n    assert.doesNotMatch(site, pattern);\n    assert.doesNotMatch(designSystem, pattern);\n    assert.doesNotMatch(data, pattern);\n    assert.doesNotMatch(page, pattern);\n    assert.doesNotMatch(layout, pattern);'
)
old_inspector = '''test("builds the inspector from UIR facts instead of a parallel demo model", async () => {
  const [inspector, renderer] = await Promise.all([
    readFile(new URL("../app/Inspector.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/uir.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(renderer, /provenanceModel/);
  assert.match(renderer, /resolutionPiece\\(node\\.role\\)/);
  assert.match(renderer, /inspectionBindings\\(subject, piece\\)/);
  assert.match(renderer, /fact\\(source\\.id, "source\\.description"\\)/);
  assert.match(renderer, /sourceHref\\(subject\\)/);
  assert.doesNotMatch(renderer, /github\\.com\\/tenbytesltd\\/uir-public-site/);
  assert.match(inspector, /\\.uir-target \\[data-node\\]/);
  assert.match(inspector, /Viewer chrome — outside the inspected Surface/);
  assert.doesNotMatch(inspector, /mock|fixture|sampleNode|demoData/i);
});'''
new_inspector = '''test("builds the inspector from UIR facts instead of a parallel demo model", async () => {
  const [inspector, data] = await Promise.all([
    readFile(new URL("../app/Inspector.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/uir-data.ts", import.meta.url), "utf8"),
  ]);

  assert.match(data, /provenanceModel/);
  assert.match(data, /resolutionPiece\\(node\\.role\\)/);
  assert.match(data, /inspectionBindings\\(subject, piece\\)/);
  assert.match(data, /fact\\(source\\.id, "source\\.description"\\)/);
  assert.match(data, /sourceHref\\(subject\\)/);
  assert.doesNotMatch(data, /github\\.com\\/tenbytesltd\\/uir-public-site/);
  assert.match(inspector, /\\.uir-target \\[data-node\\]/);
  assert.match(inspector, /Viewer chrome — outside the inspected Surface/);
  assert.doesNotMatch(inspector, /mock|fixture|sampleNode|demoData/i);
});

test("the public target is a hand-authored React component tree, not a generic UIR renderer", async () => {
  const [site, designSystem, page] = await Promise.all([
    readFile(new URL("../app/Site.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/design-system.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(site, /function Hero\\(\\)/);
  assert.match(site, /function Problem\\(\\)/);
  assert.match(site, /function Playground\\(\\)/);
  assert.match(site, /<Heading uirKey="hero-title" level=\\{1\\} \\/>/);
  assert.doesNotMatch(site, /RenderNode|walk\\(|switch \\(.*role/);
  assert.doesNotMatch(designSystem, /resolutionPiece/);
  assert.match(designSystem, /heading: "uir-site:piece:heading"/);
  assert.match(designSystem, /uirNodeProps\\(uirKey, "heading", PIECES\\.heading\\)/);
  assert.match(page, /<PublicSite \\/>/);
});'''
if old_inspector not in rendered:
    raise SystemExit('inspector test block not found')
rendered = rendered.replace(old_inspector, new_inspector)
(root / 'tests/rendered-html.test.mjs').write_text(rendered, encoding='utf-8')

conformance = (root / 'tests/uir-conformance.test.mjs').read_text(encoding='utf-8')
conformance = conformance.replace('import test from "node:test";\n', 'import test from "node:test";\nimport { readFile } from "node:fs/promises";\n')
conformance += r'''

test("Piece identity is owned by React design-system components, not copied from expected UIR", async () => {
  const designSystem = await readFile(new URL("../app/design-system.tsx", import.meta.url), "utf8");
  const data = await readFile(new URL("../app/uir-data.ts", import.meta.url), "utf8");
  assert.match(designSystem, /heading: "uir-site:piece:heading"/);
  assert.match(designSystem, /paragraph: "uir-site:piece:paragraph"/);
  assert.doesNotMatch(designSystem, /resolutionPiece|expectedPiece/);
  assert.match(data, /uirNodeProps\\(key: string, actualRole: string, actualPiece: string\\)/);
});
'''
(root / 'tests/uir-conformance.test.mjs').write_text(conformance, encoding='utf-8')

conformance_doc = (root / 'docs/CONFORMANCE.md').read_text(encoding='utf-8')
conformance_doc += r'''

## Public target architecture

The public site is deliberately **not** the generic UIR renderer. The designer-facing
renderer is a visualization tool; the production target is a normal React component tree.

`app/Site.tsx` contains explicit product components and section composition. It reads
content and design facts from the checked UIR package through `app/uir-data.ts`, while
`app/design-system.tsx` owns the concrete React Piece implementations. Piece identity is
therefore reported by the component that actually rendered, not copied from the expected
contract. Using `Paragraph` where the UIR requires `Heading` produces the wrong role,
Piece and bindings and the conformance gate fails.

This is the target loop the public site demonstrates:

`design + design system → UIR → independently authored React target → deterministic verdict`
'''
(root / 'docs/CONFORMANCE.md').write_text(conformance_doc, encoding='utf-8')

(root / 'app/uir.tsx').unlink()
