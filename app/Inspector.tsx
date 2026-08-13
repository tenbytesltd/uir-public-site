"use client";

import { useEffect, useMemo, useState } from "react";

export type InspectionBinding = {
  slot: string;
  role: string;
  value: string;
};

export type InspectionRecord = {
  key: string;
  id: string;
  label: string;
  role: string;
  salience: string;
  content: string;
  parent?: string;
  children: number;
  controls?: string;
  piece: string;
  pieceName: string;
  facts: { kind: string; plane: string }[];
  bindings: InspectionBinding[];
  sources: string[];
  modes: string[];
  gap?: string;
};

type InspectorProps = {
  nodes: InspectionRecord[];
  packageId: string;
  packageVersion: string;
  recordCount: number;
};

export function Inspector({
  nodes,
  packageId,
  packageVersion,
  recordCount,
}: InspectorProps) {
  const [open, setOpen] = useState(false);
  const initial = nodes.find((node) => node.key === "hero-title")?.key ?? nodes[0]?.key;
  const [selectedKey, setSelectedKey] = useState(initial);
  const byKey = useMemo(
    () => new Map(nodes.map((node) => [node.key, node])),
    [nodes],
  );
  const selected = selectedKey ? byKey.get(selectedKey) : undefined;

  useEffect(() => {
    const target = document.querySelector<HTMLElement>(".uir-target");
    if (!target) return;
    target.toggleAttribute("data-uir-inspecting", open);
    return () => target.removeAttribute("data-uir-inspecting");
  }, [open]);

  useEffect(() => {
    document
      .querySelectorAll<HTMLElement>("[data-uir-selected]")
      .forEach((element) => element.removeAttribute("data-uir-selected"));
    if (!open || !selectedKey) return;
    document
      .querySelector<HTMLElement>(`[data-node="${CSS.escape(selectedKey)}"]`)
      ?.setAttribute("data-uir-selected", "true");
  }, [open, selectedKey]);

  useEffect(() => {
    if (!open) return;
    const chooseNode = (event: MouseEvent) => {
      const element = (event.target as Element | null)?.closest<HTMLElement>(
        ".uir-target [data-node]",
      );
      if (!element?.dataset.node) return;
      event.preventDefault();
      event.stopPropagation();
      setSelectedKey(element.dataset.node);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", chooseNode, true);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("click", chooseNode, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div
      className="uir-inspector-chrome"
      data-inspection-count={nodes.length}
      data-inspection-package={packageId}
    >
      <button
        className="uir-inspector-trigger"
        type="button"
        aria-expanded={open}
        aria-controls="uir-inspector"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="uir-inspector-trigger__signal" aria-hidden="true" />
        <span>
          <strong>Inspect this page</strong>
          <small>Live UIR · {nodes.length} nodes</small>
        </span>
        <span aria-hidden="true">{open ? "×" : "↗"}</span>
      </button>

      {open ? (
        <aside
          className="uir-inspector"
          id="uir-inspector"
          aria-label="UIR page inspector"
        >
          <header className="uir-inspector__header">
            <div>
              <p className="uir-inspector__eyebrow">UIR INSPECTOR / LIVE</p>
              <h2>This page is reading itself.</h2>
            </div>
            <button
              className="uir-inspector__close"
              type="button"
              aria-label="Close UIR inspector"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </header>

          <p className="uir-inspector__note">
            Viewer chrome — outside the inspected Surface. Pick any outlined
            element; the facts below come from the same checked package that
            rendered it.
          </p>

          <dl className="uir-inspector__stats">
            <div><dt>Nodes</dt><dd>{nodes.length}</dd></div>
            <div><dt>Records</dt><dd>{recordCount.toLocaleString("en-US")}</dd></div>
            <div><dt>Version</dt><dd>{packageVersion}</dd></div>
          </dl>

          <label className="uir-inspector__picker">
            <span>Selected Node</span>
            <select
              value={selectedKey}
              onChange={(event) => setSelectedKey(event.target.value)}
            >
              {nodes.map((node) => (
                <option key={node.key} value={node.key}>
                  {node.label} · {node.role}
                </option>
              ))}
            </select>
          </label>

          {selected ? (
            <div className="uir-inspector__readout" aria-live="polite">
              <section>
                <p className="uir-inspector__section-label">Interface</p>
                <code>{selected.id}</code>
                <dl className="uir-inspector__rows">
                  <div><dt>Role</dt><dd>{selected.role}</dd></div>
                  <div><dt>Salience</dt><dd>{selected.salience}</dd></div>
                  <div><dt>Children</dt><dd>{selected.children}</dd></div>
                  {selected.parent ? <div><dt>Parent</dt><dd>{selected.parent}</dd></div> : null}
                  {selected.controls ? <div><dt>Controls</dt><dd>{selected.controls}</dd></div> : null}
                </dl>
                {selected.content ? (
                  <blockquote>{selected.content}</blockquote>
                ) : null}
                {selected.gap ? (
                  <p className="uir-inspector__gap"><strong>Explicit gap</strong>{selected.gap}</p>
                ) : null}
              </section>

              <section>
                <p className="uir-inspector__section-label">Resolution</p>
                <dl className="uir-inspector__rows">
                  <div><dt>Piece</dt><dd>{selected.pieceName}</dd></div>
                  <div><dt>Identity</dt><dd>{selected.piece}</dd></div>
                </dl>
              </section>

              <section>
                <p className="uir-inspector__section-label">Presentation bindings</p>
                <ul className="uir-inspector__bindings">
                  {selected.bindings.map((binding) => (
                    <li key={binding.slot}>
                      <span>{binding.slot}</span>
                      <strong>{binding.role}</strong>
                      <code>{binding.value}</code>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <p className="uir-inspector__section-label">Facts & provenance</p>
                <div className="uir-inspector__chips">
                  {selected.facts.map((item, index) => (
                    <span key={`${item.kind}-${item.plane}-${index}`}>
                      {item.kind} · {item.plane}
                    </span>
                  ))}
                </div>
                <p className="uir-inspector__modes">{selected.modes.join(" · ")}</p>
                <ul className="uir-inspector__sources">
                  {selected.sources.map((source) => <li key={source}>{source}</li>)}
                </ul>
              </section>
            </div>
          ) : null}

          <footer className="uir-inspector__footer">
            <span>{packageId}</span>
            <span>ESC to close</span>
          </footer>
        </aside>
      ) : null}
    </div>
  );
}
