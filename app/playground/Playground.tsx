"use client";

import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { filesFromDrop, filesFromInput, loadPackageFromFiles } from "./package-loader";
import {
  UIRRuntime,
  type PackageDiagnostic,
  type UIRNode,
  type UIRPackageData,
} from "./runtime";

type CanvasMode = "render" | "semantics" | "resolution" | "provenance" | "gaps";
type TreeFilter = "all" | "gaps" | "unresolved" | "inferred";
type InspectorTab = "semantic" | "resolution" | "presentation" | "provenance" | "raw";
type Viewport = "desktop" | "phone";

const modeLabels: Record<CanvasMode, string> = {
  render: "Render",
  semantics: "Semantics",
  resolution: "Resolution",
  provenance: "Provenance",
  gaps: "Gaps",
};

function concise(value: string, max = 44) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
}

function modeBadge(node: UIRNode, mode: CanvasMode) {
  if (mode === "semantics") return node.role;
  if (mode === "resolution") return `${node.role} → ${node.pieceName}`;
  if (mode === "provenance") return node.modes.length ? node.modes.join(" · ") : "no provenance";
  if (mode === "gaps") return node.gap ? "explicit gap" : undefined;
  return undefined;
}

function CanvasNode({
  runtime,
  id,
  selectedId,
  mode,
  onSelect,
}: {
  runtime: UIRRuntime;
  id: string;
  selectedId?: string;
  mode: CanvasMode;
  onSelect: (id: string) => void;
}) {
  const node = runtime.node(id);
  const children = node.children.map((child) => (
    <CanvasNode
      key={child}
      runtime={runtime}
      id={child}
      selectedId={selectedId}
      mode={mode}
      onSelect={onSelect}
    />
  ));
  const label = modeBadge(node, mode);
  const body = node.gap ?? node.content;
  const className = [
    "uir-pg-node",
    `uir-pg-role-${node.role.replace(/[^a-z0-9-]/gi, "-")}`,
    selectedId === id ? "is-selected" : "",
    mode !== "render" ? "is-inspecting" : "",
    mode === "gaps" && node.gap ? "has-gap" : "",
    mode === "gaps" && !node.gap ? "is-dimmed" : "",
  ].filter(Boolean).join(" ");
  const inspect = (event: ReactMouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect(id);
  };
  const common = {
    className,
    "data-node-id": id,
    "data-role": node.role,
    onClick: inspect,
    style: runtime.styleForNode(id) as CSSProperties,
  };
  const badge = label ? <span className="uir-pg-node-badge">{label}</span> : null;

  switch (node.role) {
    case "document":
      return <main {...common}>{badge}{children}</main>;
    case "navigation":
      return <nav {...common}>{badge}{children}</nav>;
    case "region":
      return <section {...common}>{badge}{children}</section>;
    case "group":
      return <div {...common}>{badge}{children}</div>;
    case "heading":
      return <div {...common}>{badge}<h2>{body || node.key}</h2></div>;
    case "paragraph":
      return <p {...common}>{badge}{body || node.key}</p>;
    case "link":
      return (
        <a {...common} href={node.href ?? "./"} aria-label={body || node.key}>
          {badge}{body || node.key}
        </a>
      );
    case "button":
      return <button {...common} type="button">{badge}{body || node.key}</button>;
    case "code":
      return <pre {...common}>{badge}<code>{body || node.key}</code></pre>;
    case "list":
      return <ul {...common}>{badge}{children}</ul>;
    case "listitem":
      return <li {...common}>{badge}{body}{children}</li>;
    default:
      return <div {...common}>{badge}{body ? <span>{body}</span> : null}{children}</div>;
  }
}

function treeMatches(runtime: UIRRuntime, id: string, query: string, filter: TreeFilter): boolean {
  const node = runtime.node(id);
  const search = !query || [node.id, node.key, node.role, node.content, node.pieceName]
    .some((value) => value.toLowerCase().includes(query));
  const filtered =
    filter === "all" ||
    (filter === "gaps" && Boolean(node.gap)) ||
    (filter === "unresolved" && !node.piece) ||
    (filter === "inferred" && node.modes.includes("inferred"));
  return (search && filtered) || node.children.some((child) => treeMatches(runtime, child, query, filter));
}

function TreeNode({
  runtime,
  id,
  selectedId,
  expanded,
  query,
  filter,
  onToggle,
  onSelect,
}: {
  runtime: UIRRuntime;
  id: string;
  selectedId?: string;
  expanded: Set<string>;
  query: string;
  filter: TreeFilter;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const node = runtime.node(id);
  const normalizedQuery = query.trim().toLowerCase();
  const ownMatchesSearch = !normalizedQuery || [node.id, node.key, node.role, node.content, node.pieceName]
    .some((value) => value.toLowerCase().includes(normalizedQuery));
  const ownMatchesFilter =
    filter === "all" ||
    (filter === "gaps" && Boolean(node.gap)) ||
    (filter === "unresolved" && !node.piece) ||
    (filter === "inferred" && node.modes.includes("inferred"));
  const childMatches = node.children.some((child) => treeMatches(runtime, child, normalizedQuery, filter));
  if (!(ownMatchesSearch && ownMatchesFilter) && !childMatches) return null;

  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(id) || Boolean(normalizedQuery) || filter !== "all";
  return (
    <li className="uir-pg-tree-item">
      <div className={`uir-pg-tree-row ${selectedId === id ? "is-selected" : ""}`}>
        <button
          className="uir-pg-tree-toggle"
          type="button"
          aria-label={isOpen ? "Collapse node" : "Expand node"}
          disabled={!hasChildren}
          onClick={() => hasChildren && onToggle(id)}
        >
          {hasChildren ? (isOpen ? "−" : "+") : "·"}
        </button>
        <button className="uir-pg-tree-select" type="button" onClick={() => onSelect(id)}>
          <span className="uir-pg-tree-role">{node.role}</span>
          <strong>{concise(node.content || node.key)}</strong>
          <span className="uir-pg-tree-flags" aria-hidden="true">
            {node.gap ? "△" : ""}{!node.piece ? " ◇" : ""}
          </span>
        </button>
      </div>
      {hasChildren && isOpen ? (
        <ul className="uir-pg-tree-children">
          {node.children.map((child) => (
            <TreeNode
              key={child}
              runtime={runtime}
              id={child}
              selectedId={selectedId}
              expanded={expanded}
              query={query}
              filter={filter}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function DefinitionRows({ rows }: { rows: [string, string | number | undefined][] }) {
  return (
    <dl className="uir-pg-definition-list">
      {rows.filter(([, value]) => value !== undefined && value !== "").map(([label, value]) => (
        <div key={label}><dt>{label}</dt><dd>{String(value)}</dd></div>
      ))}
    </dl>
  );
}

function Inspector({
  runtime,
  node,
  tab,
  onTab,
}: {
  runtime: UIRRuntime;
  node?: UIRNode;
  tab: InspectorTab;
  onTab: (tab: InspectorTab) => void;
}) {
  const tabs: { id: InspectorTab; label: string }[] = [
    { id: "semantic", label: "Semantic" },
    { id: "resolution", label: "Resolution" },
    { id: "presentation", label: "Presentation" },
    { id: "provenance", label: "Provenance" },
    { id: "raw", label: "Raw" },
  ];
  if (!node) {
    return <aside className="uir-pg-inspector"><div className="uir-pg-empty-panel">Select a node to inspect it.</div></aside>;
  }

  return (
    <aside className="uir-pg-inspector">
      <header className="uir-pg-panel-header">
        <div><span>INSPECTOR</span><strong>{concise(node.content || node.key, 30)}</strong></div>
        <code>{node.role}</code>
      </header>
      <div className="uir-pg-inspector-tabs" role="tablist" aria-label="Inspector views">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? "is-active" : ""}
            onClick={() => onTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="uir-pg-inspector-body">
        {tab === "semantic" ? (
          <>
            <p className="uir-pg-section-label">Interface meaning</p>
            <code className="uir-pg-id-block">{node.id}</code>
            <DefinitionRows rows={[
              ["Role", node.role],
              ["Salience", node.salience],
              ["Parent", node.parent?.split(":").at(-1)],
              ["Children", node.children.length],
              ["Controls", node.controls?.split(":").at(-1)],
            ]} />
            {node.content ? <blockquote className="uir-pg-content-quote">{node.content}</blockquote> : null}
            {node.gap ? <div className="uir-pg-gap-card"><strong>Explicit gap</strong><p>{node.gap}</p></div> : null}
            <p className="uir-pg-section-label">Facts</p>
            <div className="uir-pg-chip-grid">
              {node.facts.map((fact, index) => (
                <span key={`${fact.kind}-${fact.plane}-${index}`}>{fact.kind}<small>{fact.plane}</small></span>
              ))}
            </div>
          </>
        ) : null}

        {tab === "resolution" ? (
          <>
            <p className="uir-pg-section-label">Role → design system</p>
            <div className="uir-pg-resolution-flow">
              <div><small>Role</small><strong>{node.role}</strong></div>
              <span>→</span>
              <div><small>Piece</small><strong>{node.pieceName}</strong></div>
            </div>
            <DefinitionRows rows={[
              ["Identity", node.piece],
              ["Status", node.piece ? "resolved" : "unresolved"],
            ]} />
            {!node.piece ? (
              <div className="uir-pg-note">No role → piece resolution is present for this node. The semantic node is still inspectable.</div>
            ) : null}
          </>
        ) : null}

        {tab === "presentation" ? (
          <>
            <p className="uir-pg-section-label">Presentation bindings</p>
            {node.bindings.length ? (
              <ul className="uir-pg-binding-list">
                {node.bindings.map((binding) => (
                  <li key={binding.slot}>
                    <span>{binding.slot}</span>
                    <strong>{binding.role}</strong>
                    <code>{binding.value}</code>
                  </li>
                ))}
              </ul>
            ) : <div className="uir-pg-note">No presentation bindings on this node or resolved piece.</div>}
          </>
        ) : null}

        {tab === "provenance" ? (
          <>
            <p className="uir-pg-section-label">Provenance modes</p>
            <div className="uir-pg-chip-row">
              {node.modes.length ? node.modes.map((item) => <span key={item}>{item}</span>) : <em>none declared</em>}
            </div>
            <p className="uir-pg-section-label">Sources</p>
            {node.sources.length ? (
              <ul className="uir-pg-source-list">{node.sources.map((source) => <li key={source}>{source}</li>)}</ul>
            ) : <div className="uir-pg-note">No source labels resolved for this node.</div>}
          </>
        ) : null}

        {tab === "raw" ? (
          <>
            <p className="uir-pg-section-label">Underlying records</p>
            <pre className="uir-pg-raw"><code>{JSON.stringify(runtime.rawForNode(node.id), null, 2)}</code></pre>
          </>
        ) : null}
      </div>
    </aside>
  );
}

function Diagnostics({
  diagnostics,
  open,
  onToggle,
}: {
  diagnostics: PackageDiagnostic[];
  open: boolean;
  onToggle: () => void;
}) {
  const errors = diagnostics.filter((item) => item.severity === "error").length;
  const warnings = diagnostics.filter((item) => item.severity === "warning").length;
  const successes = diagnostics.filter((item) => item.severity === "success").length;
  return (
    <div className={`uir-pg-diagnostics ${open ? "is-open" : ""}`}>
      {open ? (
        <div className="uir-pg-diagnostics-drawer">
          <header><strong>Package diagnostics</strong><button type="button" onClick={onToggle}>Close</button></header>
          <ul>
            {diagnostics.map((item, index) => (
              <li key={`${item.code}-${item.path ?? ""}-${index}`} data-severity={item.severity}>
                <span>{item.severity === "success" ? "✓" : item.severity === "warning" ? "△" : "×"}</span>
                <div><strong>{item.message}</strong>{item.path ? <code>{item.path}</code> : null}</div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <button className="uir-pg-diagnostics-bar" type="button" onClick={onToggle}>
        <span className={errors ? "is-error" : "is-ok"}>{errors ? `× ${errors} errors` : "✓ package readable"}</span>
        <span>{warnings ? `△ ${warnings} warnings` : "0 warnings"}</span>
        <span>{successes} checks</span>
        <span className="uir-pg-diagnostics-open">Diagnostics {open ? "↓" : "↑"}</span>
      </button>
    </div>
  );
}

export function Playground({ initialPackage }: { initialPackage: UIRPackageData }) {
  const initialRuntime = useMemo(() => new UIRRuntime(initialPackage), [initialPackage]);
  const [pkg, setPackage] = useState(initialPackage);
  const runtime = useMemo(() => new UIRRuntime(pkg), [pkg]);
  const [selectedId, setSelectedId] = useState<string | undefined>(
    initialRuntime.rootIds[0] ?? initialRuntime.nodeIds[0],
  );
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(initialRuntime.rootIds));
  const [mode, setMode] = useState<CanvasMode>("semantics");
  const [filter, setFilter] = useState<TreeFilter>("all");
  const [query, setQuery] = useState("");
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("semantic");
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [loadError, setLoadError] = useState<string | undefined>();
  const directoryInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    directoryInput.current?.setAttribute("webkitdirectory", "");
    directoryInput.current?.setAttribute("directory", "");
  }, []);

  const applyPackage = (nextPackage: UIRPackageData) => {
    const nextRuntime = new UIRRuntime(nextPackage);
    setPackage(nextPackage);
    setSelectedId(nextRuntime.rootIds[0] ?? nextRuntime.nodeIds[0]);
    setExpanded(new Set(nextRuntime.rootIds));
    setQuery("");
    setFilter("all");
    setInspectorTab("semantic");
  };

  const stats = runtime.stats();
  const metadata = runtime.packageMetadata();
  const selected = selectedId && runtime.nodeIds.includes(selectedId)
    ? runtime.node(selectedId)
    : undefined;
  const semanticDiagnostics: PackageDiagnostic[] = [
    {
      severity: runtime.rootIds.length ? "success" : "error",
      code: "semantic.root",
      message: runtime.rootIds.length
        ? `${runtime.rootIds.length} render root${runtime.rootIds.length === 1 ? "" : "s"} discovered`
        : "No render root could be discovered",
    },
    ...(stats.gaps ? [{
      severity: "warning" as const,
      code: "semantic.gaps",
      message: `${stats.gaps} explicit gap${stats.gaps === 1 ? "" : "s"} declared`,
    }] : []),
    ...(stats.unresolved ? [{
      severity: "warning" as const,
      code: "resolution.unresolved",
      message: `${stats.unresolved} node${stats.unresolved === 1 ? "" : "s"} without role → piece resolution`,
    }] : []),
  ];
  const diagnostics = [...pkg.diagnostics, ...semanticDiagnostics];

  const toggleExpanded = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectNode = (id: string) => {
    setSelectedId(id);
    setExpanded((current) => {
      const next = new Set(current);
      let parent = runtime.parentByNode.get(id);
      while (parent) {
        next.add(parent);
        parent = runtime.parentByNode.get(parent);
      }
      return next;
    });
  };

  const openFiles = async (files: ReturnType<typeof filesFromInput>) => {
    setLoadError(undefined);
    try {
      applyPackage(await loadPackageFromFiles(files));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not read this UIR package.");
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    setLoadError(undefined);
    try {
      applyPackage(await loadPackageFromFiles(await filesFromDrop(event.dataTransfer)));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not read this UIR package.");
    }
  };

  return (
    <div
      className={`uir-pg-shell ${dragging ? "is-dragging" : ""}`}
      onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDragging(false);
      }}
      onDrop={handleDrop}
    >
      <input
        ref={directoryInput}
        className="uir-pg-hidden-input"
        type="file"
        multiple
        onChange={(event) => {
          if (event.currentTarget.files) void openFiles(filesFromInput(event.currentTarget.files));
          event.currentTarget.value = "";
        }}
      />

      {dragging ? <div className="uir-pg-drop-overlay"><strong>Drop UIR package</strong><span>Read locally · nothing is uploaded</span></div> : null}

      <header className="uir-pg-topbar">
        <a className="uir-pg-brand" href="../"><span>UIR</span><strong>PLAYGROUND</strong></a>
        <div className="uir-pg-package-title">
          <strong>{metadata.name}</strong>
          <span>{pkg.manifest.packageVersion} · {stats.nodes} nodes · {stats.records.toLocaleString("en-US")} records</span>
        </div>
        <div className="uir-pg-top-actions">
          <span className="uir-pg-local-badge">● LOCAL ONLY</span>
          <button type="button" onClick={() => directoryInput.current?.click()}>Open package</button>
          {pkg !== initialPackage ? (
            <button type="button" className="is-secondary" onClick={() => applyPackage(initialPackage)}>Use example</button>
          ) : null}
        </div>
      </header>

      {loadError ? (
        <div className="uir-pg-error-banner">
          <strong>Could not open package.</strong>
          <span>{loadError}</span>
          <button type="button" aria-label="Dismiss error" onClick={() => setLoadError(undefined)}>×</button>
        </div>
      ) : null}

      <div className="uir-pg-workspace">
        <aside className="uir-pg-structure">
          <header className="uir-pg-panel-header">
            <div><span>STRUCTURE</span><strong>Semantic tree</strong></div>
            <code>{stats.nodes}</code>
          </header>
          <div className="uir-pg-tree-tools">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search nodes, roles, ids…"
              aria-label="Search UIR nodes"
            />
            <div className="uir-pg-filter-row">
              {(["all", "gaps", "unresolved", "inferred"] as TreeFilter[]).map((item) => (
                <button key={item} type="button" className={filter === item ? "is-active" : ""} onClick={() => setFilter(item)}>{item}</button>
              ))}
            </div>
          </div>
          <div className="uir-pg-tree-scroll">
            {runtime.rootIds.length ? (
              <ul className="uir-pg-tree-root">
                {runtime.rootIds.map((root) => (
                  <TreeNode
                    key={root}
                    runtime={runtime}
                    id={root}
                    selectedId={selectedId}
                    expanded={expanded}
                    query={query}
                    filter={filter}
                    onToggle={toggleExpanded}
                    onSelect={selectNode}
                  />
                ))}
              </ul>
            ) : <div className="uir-pg-empty-panel">No semantic root found in this package.</div>}
          </div>
        </aside>

        <main className="uir-pg-stage">
          <div className="uir-pg-stage-toolbar">
            <div className="uir-pg-mode-switcher">
              {(Object.keys(modeLabels) as CanvasMode[]).map((item) => (
                <button key={item} type="button" className={mode === item ? "is-active" : ""} onClick={() => setMode(item)}>{modeLabels[item]}</button>
              ))}
            </div>
            <div className="uir-pg-viewport-switcher">
              <button type="button" className={viewport === "desktop" ? "is-active" : ""} onClick={() => setViewport("desktop")}>Desktop</button>
              <button type="button" className={viewport === "phone" ? "is-active" : ""} onClick={() => setViewport("phone")}>Phone</button>
            </div>
          </div>
          <div className="uir-pg-canvas-scroll">
            <div className={`uir-pg-canvas ${viewport === "phone" ? "is-phone" : "is-desktop"}`} data-mode={mode}>
              <div className="uir-pg-canvas-meta">
                <span>{pkg.manifest.packageId}</span>
                <span>{viewport === "phone" ? "390 px" : "responsive desktop"}</span>
              </div>
              {runtime.rootIds.map((root) => (
                <CanvasNode key={root} runtime={runtime} id={root} selectedId={selectedId} mode={mode} onSelect={selectNode} />
              ))}
              {!runtime.rootIds.length ? (
                <div className="uir-pg-canvas-empty"><strong>No renderable tree</strong><span>Open Diagnostics to inspect the package errors.</span></div>
              ) : null}
            </div>
          </div>
        </main>

        <Inspector runtime={runtime} node={selected} tab={inspectorTab} onTab={setInspectorTab} />
      </div>

      <Diagnostics diagnostics={diagnostics} open={diagnosticsOpen} onToggle={() => setDiagnosticsOpen((value) => !value)} />
    </div>
  );
}
