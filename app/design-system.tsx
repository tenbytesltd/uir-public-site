import type { ReactNode } from "react";
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
