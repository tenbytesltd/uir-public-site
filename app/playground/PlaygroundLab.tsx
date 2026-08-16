"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Playground } from "./Playground";
import {
  filesFromDrop,
  filesFromInput,
  loadPackageFromSelection,
  loadPackageFromUrl,
  type PackageSource,
} from "./source-layer";
import { diffPackages } from "./semantic-diff";
import { UIRRuntime, type UIRPackageData } from "./runtime";

type LabView = "playground" | "graph" | "diff";

function sourceLabel(source: PackageSource) {
  if (source.kind === "example") return "BUILT-IN EXAMPLE";
  if (source.kind === "local") return "LOCAL · PRIVATE";
  return "REMOTE · PUBLIC";
}

function packageKey(pkg: UIRPackageData, revision: number) {
  return `${pkg.manifest.packageId}:${pkg.manifest.packageVersion}:${revision}`;
}

function GraphView({ pkg }: { pkg: UIRPackageData }) {
  const runtime = useMemo(() => new UIRRuntime(pkg), [pkg]);
  const nodes = runtime.allNodes().slice(0, 120);
  const included = new Set(nodes.map((node) => node.id));
  const depthCache = new Map<string, number>();
  const depthOf = (id: string): number => {
    const cached = depthCache.get(id);
    if (cached !== undefined) return cached;
    const parent = runtime.parentByNode.get(id);
    const depth = parent && included.has(parent) ? depthOf(parent) + 1 : 0;
    depthCache.set(id, depth);
    return depth;
  };
  const columns = new Map<number, typeof nodes>();
  for (const node of nodes) {
    const depth = depthOf(node.id);
    const column = columns.get(depth) ?? [];
    column.push(node);
    columns.set(depth, column);
  }
  const positions = new Map<string, { x: number; y: number }>();
  for (const [depth, column] of columns) {
    column.forEach((node, index) => positions.set(node.id, { x: 30 + depth * 220, y: 30 + index * 68 }));
  }
  const maxDepth = Math.max(0, ...columns.keys());
  const maxRows = Math.max(1, ...[...columns.values()].map((column) => column.length));
  const width = 260 + maxDepth * 220;
  const height = 80 + maxRows * 68;

  return (
    <section className="uir-lab-view uir-lab-graph-view">
      <header className="uir-lab-view-header">
        <div><span>SEMANTIC GRAPH</span><strong>{pkg.manifest.packageId}</strong></div>
        <p>{nodes.length} nodes · contains relations · deterministic layout</p>
      </header>
      <div className="uir-lab-graph-scroll">
        <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label="UIR semantic graph">
          <g className="uir-lab-graph-edges">
            {nodes.flatMap((node) => node.children.filter((child) => included.has(child)).map((child) => {
              const from = positions.get(node.id);
              const to = positions.get(child);
              if (!from || !to) return null;
              return <line key={`${node.id}-${child}`} x1={from.x + 176} y1={from.y + 22} x2={to.x} y2={to.y + 22} />;
            }))}
          </g>
          <g className="uir-lab-graph-nodes">
            {nodes.map((node) => {
              const position = positions.get(node.id)!;
              const label = (node.content || node.key).replace(/\s+/g, " ").trim();
              return (
                <g key={node.id} transform={`translate(${position.x} ${position.y})`}>
                  <title>{node.id}</title>
                  <rect width="176" height="44" rx="8" />
                  <text className="uir-lab-graph-role" x="10" y="15">{node.role}</text>
                  <text className="uir-lab-graph-label" x="10" y="32">{label.length > 25 ? `${label.slice(0, 24)}…` : label}</text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      {runtime.nodeIds.length > nodes.length ? <div className="uir-lab-limit-note">Graph preview is capped at 120 nodes; tree/inspector still reads the complete package.</div> : null}
    </section>
  );
}

function DiffView({ before, after }: { before: UIRPackageData; after: UIRPackageData }) {
  const diff = useMemo(() => diffPackages(before, after), [before, after]);
  const visible = diff.items.filter((item) => item.status !== "same").slice(0, 200);
  return (
    <section className="uir-lab-view uir-lab-diff-view">
      <header className="uir-lab-view-header">
        <div><span>SEMANTIC DIFF</span><strong>{before.manifest.packageVersion} → {after.manifest.packageVersion}</strong></div>
        <p>Matched by stable semantic node key, then compared by meaning, resolution and bindings.</p>
      </header>
      <div className="uir-lab-diff-stats">
        <div data-kind="added"><strong>+{diff.added}</strong><span>added</span></div>
        <div data-kind="removed"><strong>−{diff.removed}</strong><span>removed</span></div>
        <div data-kind="changed"><strong>{diff.changed}</strong><span>changed</span></div>
        <div data-kind="same"><strong>{diff.same}</strong><span>unchanged</span></div>
      </div>
      <div className="uir-lab-diff-list">
        {visible.length ? visible.map((item) => (
          <article key={item.key} data-status={item.status}>
            <span className="uir-lab-diff-status">{item.status}</span>
            <div>
              <strong>{item.after?.content || item.before?.content || item.key}</strong>
              <code>{item.key}</code>
            </div>
            <p>{item.fields.join(" · ")}</p>
          </article>
        )) : <div className="uir-lab-empty"><strong>No semantic changes.</strong><span>The compared package snapshots resolve to the same semantic nodes.</span></div>}
      </div>
      {diff.items.filter((item) => item.status !== "same").length > visible.length ? <div className="uir-lab-limit-note">Showing the first 200 changed nodes.</div> : null}
    </section>
  );
}

export function PlaygroundLab({ initialPackage }: { initialPackage: UIRPackageData }) {
  const [pkg, setPackage] = useState(initialPackage);
  const [revision, setRevision] = useState(0);
  const [source, setSource] = useState<PackageSource>({ kind: "example", label: "UIR public site" });
  const [baseline, setBaseline] = useState(initialPackage);
  const [baselineSource, setBaselineSource] = useState<PackageSource>({ kind: "example", label: "UIR public site" });
  const [view, setView] = useState<LabView>("playground");
  const [remoteInput, setRemoteInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>();
  const [dragging, setDragging] = useState(false);
  const directoryInput = useRef<HTMLInputElement>(null);
  const zipInput = useRef<HTMLInputElement>(null);
  const hydratedDeepLink = useRef(false);

  useEffect(() => {
    directoryInput.current?.setAttribute("webkitdirectory", "");
    directoryInput.current?.setAttribute("directory", "");
  }, []);

  const updateAddress = (nextSource: PackageSource, compareSource = baselineSource) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (nextSource.kind === "remote" && nextSource.url) url.searchParams.set("source", nextSource.url);
    else url.searchParams.delete("source");
    if (compareSource.kind === "remote" && compareSource.url) url.searchParams.set("compare", compareSource.url);
    else url.searchParams.delete("compare");
    window.history.replaceState({}, "", url);
  };

  const applyPackage = (nextPackage: UIRPackageData, nextSource: PackageSource) => {
    setPackage(nextPackage);
    setSource(nextSource);
    setRevision((value) => value + 1);
    setMessage(undefined);
    updateAddress(nextSource);
  };

  const loadRemote = async (input: string, asBaseline = false) => {
    setLoading(true);
    setMessage(undefined);
    try {
      const { pkg: nextPackage, resolvedUrl } = await loadPackageFromUrl(input);
      const nextSource: PackageSource = { kind: "remote", label: new URL(resolvedUrl).hostname, url: resolvedUrl };
      if (asBaseline) {
        setBaseline(nextPackage);
        setBaselineSource(nextSource);
        updateAddress(source, nextSource);
      } else {
        applyPackage(nextPackage, nextSource);
        setRemoteInput(resolvedUrl);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load the remote UIR package.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hydratedDeepLink.current || typeof window === "undefined") return;
    hydratedDeepLink.current = true;
    const params = new URLSearchParams(window.location.search);
    const sharedSource = params.get("source");
    const sharedCompare = params.get("compare");
    if (sharedSource) void loadRemote(sharedSource);
    if (sharedCompare) void loadRemote(sharedCompare, true);
  // loadRemote intentionally resolves only the initial deep-link once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openLocalFiles = async (files: ReturnType<typeof filesFromInput>) => {
    setLoading(true);
    setMessage(undefined);
    try {
      const nextPackage = await loadPackageFromSelection(files);
      applyPackage(nextPackage, { kind: "local", label: nextPackage.sourceName });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not read this UIR package.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    setLoading(true);
    setMessage(undefined);
    try {
      const files = await filesFromDrop(event.dataTransfer);
      const nextPackage = await loadPackageFromSelection(files);
      applyPackage(nextPackage, { kind: "local", label: nextPackage.sourceName });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not read the dropped UIR package.");
    } finally {
      setLoading(false);
    }
  };

  const setCurrentAsBaseline = () => {
    setBaseline(pkg);
    setBaselineSource(source);
    updateAddress(source, source);
    setView("diff");
  };

  const useExample = () => {
    setBaseline(initialPackage);
    setBaselineSource({ kind: "example", label: "UIR public site" });
    applyPackage(initialPackage, { kind: "example", label: "UIR public site" });
  };

  const copyDeepLink = async () => {
    if (source.kind !== "remote" || !source.url) {
      setMessage("Local packages stay local and cannot be encoded into a share link. Load a public URL/GitHub package to create a deep link.");
      return;
    }
    updateAddress(source);
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMessage("Deep link copied. It reopens the same public package; no package data is stored by the Playground.");
    } catch {
      setMessage("The deep link is in the address bar. Copy the current URL to share it.");
    }
  };

  return (
    <div
      className={`uir-pg-lab ${dragging ? "is-dragging" : ""}`}
      onDragEnterCapture={(event) => { event.preventDefault(); setDragging(true); }}
      onDragOverCapture={(event) => event.preventDefault()}
      onDragLeaveCapture={(event) => { if (event.currentTarget === event.target) setDragging(false); }}
      onDropCapture={(event) => void handleDrop(event)}
    >
      <input ref={directoryInput} className="uir-lab-hidden" type="file" multiple onChange={(event) => {
        if (event.currentTarget.files) void openLocalFiles(filesFromInput(event.currentTarget.files));
        event.currentTarget.value = "";
      }} />
      <input ref={zipInput} className="uir-lab-hidden" type="file" accept=".zip,.uir.zip,application/zip" onChange={(event) => {
        if (event.currentTarget.files) void openLocalFiles(filesFromInput(event.currentTarget.files));
        event.currentTarget.value = "";
      }} />

      <section className="uir-lab-sourcebar" aria-label="Custom package loader">
        <div className="uir-lab-source-identity">
          <span>TEST CUSTOM UIR</span>
          <strong>{source.label}</strong>
          <small>{sourceLabel(source)}</small>
        </div>
        <div className="uir-lab-local-actions">
          <button type="button" onClick={() => directoryInput.current?.click()}>Open folder</button>
          <button type="button" onClick={() => zipInput.current?.click()}>Open .uir.zip</button>
        </div>
        <form className="uir-lab-remote" onSubmit={(event) => { event.preventDefault(); void loadRemote(remoteInput); }}>
          <input value={remoteInput} onChange={(event) => setRemoteInput(event.target.value)} placeholder="package URL or github.com/owner/repo" aria-label="Remote UIR package URL" />
          <button type="submit" disabled={loading}>{loading ? "Loading…" : "Load URL"}</button>
        </form>
        <div className="uir-lab-view-tabs" role="tablist" aria-label="Playground tools">
          {(["playground", "graph", "diff"] as LabView[]).map((item) => (
            <button key={item} type="button" role="tab" aria-selected={view === item} className={view === item ? "is-active" : ""} onClick={() => setView(item)}>{item}</button>
          ))}
        </div>
        <div className="uir-lab-more-actions">
          <button type="button" onClick={setCurrentAsBaseline}>Set baseline</button>
          <button type="button" onClick={() => void copyDeepLink()} disabled={source.kind !== "remote"}>Copy deep link</button>
          {source.kind !== "example" ? <button type="button" onClick={useExample}>Example</button> : null}
        </div>
      </section>

      {message ? <div className="uir-lab-message"><span>{message}</span><button type="button" aria-label="Dismiss message" onClick={() => setMessage(undefined)}>×</button></div> : null}
      {dragging ? <div className="uir-lab-drop"><strong>Drop folder or .uir.zip</strong><span>Local package data stays in this browser tab.</span></div> : null}

      <div className="uir-lab-contextline">
        <span>current <strong>{pkg.manifest.packageId}@{pkg.manifest.packageVersion}</strong></span>
        <span>baseline <strong>{baseline.manifest.packageId}@{baseline.manifest.packageVersion}</strong></span>
        <span>{source.kind === "local" ? "No network path" : source.kind === "remote" ? "CORS public fetch" : "Checked built-in package"}</span>
      </div>

      <div className="uir-lab-content">
        {view === "playground" ? <Playground key={packageKey(pkg, revision)} initialPackage={pkg} /> : null}
        {view === "graph" ? <GraphView pkg={pkg} /> : null}
        {view === "diff" ? <DiffView before={baseline} after={pkg} /> : null}
      </div>
    </div>
  );
}
