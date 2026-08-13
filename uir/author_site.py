#!/usr/bin/env python3
"""Compile the confirmed and sourced UIR site decisions into one changeset.

The checked package produced through UIR's official transport remains the only
application authority. Keeping this authoring source versioned lets CI prove
that the committed package is a reproducible product of those decisions.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


PACKAGE = "uir-site:package"
DESIGN_SYSTEM = "uir-site:design-system"
GROUND = "uir-site:ground"
DRESS = "uir-site:dress"
SURFACE = "uir-site:surface:home"
CONTEXT_DESKTOP = "uir-site:fact:context:desktop"
CONTEXT_MOBILE = "uir-site:fact:context:mobile"
CONTEXTS = [CONTEXT_DESKTOP, CONTEXT_MOBILE]
PARENT_ROLE_AXIS = "uir-site:fact:axis:parent-role"
SEMANTIC_ROLES = (
    "code", "document", "group", "heading", "link", "list", "listitem",
    "navigation", "paragraph", "region",
)

SLOTS = (
    "canvas", "surface", "ink", "rule", "type", "inset-inline",
    "inset-block", "inter-item-inline", "inter-item-block", "corner",
    "outline", "elevation", "icon-size", "opacity", "motion",
)
REQUIRED_STATES = (
    "at rest", "hovered", "focused", "pressed", "disabled", "selected",
    "loading", "error", "read-only", "empty",
)

SHARDS = {
    "assets": "model/assets.json",
    "design-system": "model/design-system.json",
    "interface": "model/interface.json",
    "package": "model/package.json",
    "provenance": "model/provenance.json",
}

SRC_USER = "uir-site:source:user-session"
SRC_TENBYTES = "uir-site:source:tenbytes"
SRC_REPO = "uir-site:source:uir-repository"
SRC_SITE_REPO = "uir-site:source:site-repository"
SRC_STORYBOOK = "uir-site:source:storybook"
SRC_DTCG = "uir-site:source:dtcg"
SRC_OTEL = "uir-site:source:opentelemetry"
SRC_OPEN_UI = "uir-site:source:open-ui"
SRC_OPEN_FEATURE = "uir-site:source:openfeature"
SRC_OPENAPI = "uir-site:source:openapi"
SRC_BACKSTAGE = "uir-site:source:backstage"
SRC_RESEARCH = tuple(sorted((
    SRC_STORYBOOK, SRC_DTCG, SRC_OTEL, SRC_OPEN_UI, SRC_OPEN_FEATURE,
    SRC_OPENAPI, SRC_BACKSTAGE,
)))


def sha(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def slug(value: str) -> str:
    return "".join(ch if ch.isalnum() else "-" for ch in value).strip("-")


class Model:
    def __init__(self) -> None:
        self.records: dict[str, list[dict]] = {name: [] for name in SHARDS}
        self.by_id: dict[str, dict] = {}

    def put(self, collection: str, record: dict) -> str:
        identity = record["id"]
        if identity in self.by_id:
            raise ValueError(f"duplicate record {identity}")
        self.records[collection].append(record)
        self.by_id[identity] = record
        return identity

    def provenance(
        self,
        owner_id: str,
        sources: tuple[str, ...] | list[str],
        *,
        mode: str = "inferred",
        rationale: str = "Chosen for the confirmed adoption goal using the named current-session evidence.",
        derivation: str | None = None,
        confidence: float = 0.88,
    ) -> str:
        identity = f"{owner_id}:provenance"
        record = {
            "id": identity,
            "mode": mode,
            "recordType": "Provenance",
            "sources": sorted(set(sources)),
        }
        if mode == "declared":
            record["rationale"] = rationale
        elif mode == "derived":
            record["derivation"] = derivation or "direct transcription from the named source"
            record["rationale"] = rationale
        else:
            record["rationale"] = rationale
            record["confidence"] = confidence
        return self.put("provenance", record)

    def entity(
        self,
        collection: str,
        identity: str,
        kind: str,
        *,
        owner: str | None = None,
        sources: tuple[str, ...] | list[str] = (SRC_USER,),
        mode: str = "inferred",
        rationale: str = "Required by the confirmed page structure.",
        **extra,
    ) -> str:
        record = {"id": identity, "kind": kind, "recordType": "Entity"}
        if owner is not None:
            record["owner"] = owner
        if kind not in {"Package", "Source"}:
            record["provenance"] = self.provenance(
                identity, sources, mode=mode, rationale=rationale
            )
        record.update(extra)
        return self.put(collection, record)

    def fact(
        self,
        collection: str,
        identity: str,
        kind: str,
        subject: str,
        plane: str,
        value: dict,
        *,
        sources: tuple[str, ...] | list[str] = (SRC_USER,),
        mode: str = "inferred",
        rationale: str = "Required by the confirmed page meaning and sourced design direction.",
        when: str | None = None,
    ) -> str:
        record = {
            "id": identity,
            "kind": kind,
            "plane": plane,
            "provenance": self.provenance(
                identity, sources, mode=mode, rationale=rationale
            ),
            "recordType": "Fact",
            "subject": subject,
            "value": value,
        }
        if when is not None:
            record["when"] = when
        return self.put(collection, record)

    def relation(
        self,
        identity: str,
        kind: str,
        source: str,
        target: str,
        *,
        order: int | None = None,
        meaning: str,
        sources: tuple[str, ...] | list[str] = (SRC_USER,),
    ) -> str:
        record = {
            "id": identity,
            "kind": kind,
            "provenance": self.provenance(identity, sources),
            "recordType": "Relation",
            "source": source,
            "target": target,
        }
        if order is not None:
            record["order"] = order
        self.put("interface", record)
        self.fact(
            "interface",
            f"{identity}:meaning",
            "relation.meaning",
            identity,
            "invisible",
            {"meaning": meaning},
            sources=sources,
        )
        return identity

    def changeset(self) -> dict:
        upserts = []
        for collection in sorted(self.records):
            for record in sorted(self.records[collection], key=lambda item: item["id"]):
                upserts.append({
                    "collection": collection,
                    "path": SHARDS[collection],
                    "record": record,
                })
        return {
            "assets": {"deletes": [], "upserts": []},
            "changeSetVersion": "0.1",
            "deletes": [],
            "packageId": PACKAGE,
            "packageVersion": "0.1.0-draft.1",
            "readingProfile": "authoring",
            "shards": [
                {"collection": name, "path": path}
                for name, path in sorted(SHARDS.items())
            ],
            "upserts": upserts,
        }


m = Model()
m.entity("package", PACKAGE, "Package")


def add_source(identity: str, kind: str, origin: str, name: str, summary: str, locator: str | None = None) -> None:
    extra = {"sourceKind": kind, "originId": origin}
    if locator:
        extra["locator"] = locator
    m.entity("provenance", identity, "Source", owner=PACKAGE, **extra)
    m.fact(
        "provenance", f"{identity}:description", "source.description", identity,
        "invisible", {"name": name, "summary": summary, "revision": "2026-08-13"},
        sources=(identity,), mode="derived", rationale="Describes the explicitly named source.",
    )
    m.fact(
        "provenance", f"{identity}:integrity", "source.integrity", identity,
        "invisible", {"algorithm": "sha256", "digest": sha(origin)},
        sources=(identity,), mode="derived", rationale="Digest of the stable source identity used in this session.",
    )


add_source(
    SRC_USER, "conversation", "session:2026-08-13:uir-public-page",
    "Confirmed UIR public-page session",
    "The user asked the public page to explain UIR accurately, lead with the representation itself, and keep implementation and tooling claims secondary.",
)
add_source(
    SRC_TENBYTES, "organization", "https://github.com/tenbytesltd",
    "Tenbytes Ltd",
    "Creator and steward of UIR.",
    "https://github.com/tenbytesltd",
)
add_source(
    SRC_REPO, "repository", "https://github.com/tenbytesltd/uir@2370d95291acfc56773cea97e029e6256c01cb19",
    "UIR repository at the site release",
    "Authoritative product definition, vocabulary, compiler, checker, prototype, gaps, and status for this run.",
    "https://github.com/tenbytesltd/uir",
)
add_source(
    SRC_SITE_REPO, "repository", "https://github.com/tenbytesltd/uir-public-site",
    "Public UIR site repository",
    "Public source for this page: its UIR authoring program, checked package, generic renderer, inspector, CI evidence, and Flow 2 review log.",
    "https://github.com/tenbytesltd/uir-public-site",
)
add_source(SRC_STORYBOOK, "web", "https://storybook.js.org/", "Storybook", "OSS developer-tool adoption and live-product demonstration reference.", "https://storybook.js.org/")
add_source(SRC_DTCG, "web", "https://www.designtokens.org/", "Design Tokens Community Group", "Open standard positioning, specification, adopter, and community reference.", "https://www.designtokens.org/")
add_source(SRC_OTEL, "web", "https://opentelemetry.io/", "OpenTelemetry", "Vendor-neutral standard and ecosystem adoption reference.", "https://opentelemetry.io/")
add_source(SRC_OPEN_UI, "web", "https://open-ui.org/", "Open UI", "Transparent scope, proposal status, testing, and contribution reference.", "https://open-ui.org/")
add_source(SRC_OPEN_FEATURE, "web", "https://openfeature.dev/", "OpenFeature", "Problem education and vendor-neutral API adoption reference.", "https://openfeature.dev/")
add_source(SRC_OPENAPI, "web", "https://spec.openapis.org/", "OpenAPI Initiative Publications", "Authoritative specification versus learning/tooling separation reference.", "https://spec.openapis.org/")
add_source(SRC_BACKSTAGE, "web", "https://backstage.io/", "Backstage", "Origin, governance, ecosystem, and adopter proof reference.", "https://backstage.io/")

m.fact(
    "package", "uir-site:fact:package-metadata", "package.metadata", PACKAGE,
    "invisible",
    {
        "name": "UIR — User Interface Representation",
        "summary": "UIR is a framework-independent representation of what an interface means, with the design system as the realization backend.",
    },
    sources=(SRC_USER, SRC_TENBYTES, SRC_REPO), mode="declared",
    rationale="The user declared Tenbytes Ltd as UIR's creator; the repository supplies the authoritative product name.",
)

m.entity(
    "design-system", DESIGN_SYSTEM, "DesignSystem", owner=PACKAGE,
    sources=(SRC_USER, *SRC_RESEARCH),
    rationale="A page-specific design system compiled from the confirmed job and named OSS standard references.",
)
m.entity("design-system", GROUND, "Ground", owner=DESIGN_SYSTEM, sources=(SRC_USER, *SRC_RESEARCH))
m.entity("design-system", DRESS, "Dress", owner=DESIGN_SYSTEM, sources=(SRC_USER, *SRC_RESEARCH))
m.fact(
    "design-system", "uir-site:fact:design-system-identity", "design-system.identity",
    DESIGN_SYSTEM, "invisible", {"origin": SRC_USER},
    sources=(SRC_USER,), mode="declared",
    rationale="The page design system belongs to this explicitly confirmed authoring session.",
)
m.fact(
    "design-system", "uir-site:fact:dress-definition", "dress.definition", DRESS,
    "invisible",
    {
        "name": "Executable editorial",
        "purpose": "Make the representation feel inspectable, rigorous, and immediately useful without imitating a generic dark developer tool.",
        "motionEvents": [
            {
                "symbol": "pointer-dot-field",
                "meaning": "A decorative field of points moves by a small amount around pointer or touch proximity while preserving reading comfort.",
            },
        ],
    },
    sources=(SRC_USER, *SRC_RESEARCH),
)


def value(identity: str, name: str, purpose: str, typ: str, literal: dict, *, sources: tuple[str, ...] = SRC_RESEARCH) -> str:
    full = f"uir-site:value:{identity}"
    m.entity("design-system", full, "DesignValue", namespace=DRESS, sources=sources)
    m.fact(
        "design-system", f"uir-site:fact:value-definition:{identity}",
        "design-value.definition", full, "invisible",
        {"name": name, "purpose": purpose, "type": typ}, sources=sources,
    )
    m.fact(
        "design-system", f"uir-site:fact:value-variant:{identity}",
        "design-value.variant", full, "visible",
        {"form": "literal", "literal": literal}, sources=sources,
    )
    return full


def role(identity: str, name: str, family: str, typ: str, meaning: str, bound: str, *, sources: tuple[str, ...] = SRC_RESEARCH) -> str:
    full = f"uir-site:role:{identity}"
    m.entity("design-system", full, "DesignValue", namespace=GROUND, sources=sources)
    m.fact(
        "design-system", f"uir-site:fact:role-definition:{identity}",
        "design-value.definition", full, "invisible",
        {"name": name, "purpose": meaning, "type": typ}, sources=sources,
    )
    m.fact(
        "design-system", f"uir-site:fact:ground-role:{identity}",
        "ground.role", full, "invisible",
        {"family": family, "meaning": meaning, "acceptedTypes": [typ], "scopes": []},
        sources=sources,
    )
    m.fact(
        "design-system", f"uir-site:fact:design-binding:{identity}",
        "design.binding", bound, "invisible", {"groundRole": full}, sources=sources,
    )
    return full


def rgb(hex_value: str) -> dict:
    clean = hex_value.lstrip("#")
    return {
        "type": "color",
        "space": "srgb",
        "channels": [int(clean[i:i + 2], 16) / 255 for i in (0, 2, 4)],
        "alpha": 1,
    }


def rgba(hex_value: str, alpha: float) -> dict:
    result = rgb(hex_value)
    result["alpha"] = alpha
    return result


def dim(px: float) -> dict:
    return {"type": "dimension", "value": px, "unit": "px"}


# Primitive values.
primitive: dict[str, str] = {}
for key, label, color in (
    ("canvas", "Warm paper canvas", "#F3F1E8"),
    ("surface", "Paper surface", "#FFFEF8"),
    ("surface-muted", "Muted evidence surface", "#E8E5DA"),
    ("surface-ink", "Inverted ink surface", "#151713"),
    ("surface-code", "Code surface", "#20231E"),
    ("ink", "Primary ink", "#171915"),
    ("ink-muted", "Secondary ink", "#62665D"),
    ("ink-inverse", "Inverse ink", "#F7F6EE"),
    ("ink-code", "Code ink", "#E5FF9A"),
    ("accent", "Action signal", "#C8FF3D"),
    ("accent-ink", "Action ink", "#151713"),
    ("rule", "Evidence rule", "#B8B7AE"),
):
    primitive[key] = value(key, label, f"Sourced page colour for {label.lower()}.", "color", rgb(color))

primitive["accent-dot"] = value(
    "accent-dot", "Ambient dot", "Low-contrast accent used by the hero's decorative field.",
    "color", rgba("#C8FF3D", 0.10), sources=(SRC_USER, SRC_REPO),
)

for key, label, px in (
    ("zero", "Zero extent", 0),
    ("one", "One pixel", 1),
    ("two", "Two pixel focus", 2),
    ("space-8", "Control block inset", 8),
    ("space-12", "Control inline inset", 12),
    ("space-16", "Compact rhythm", 16),
    ("space-24", "Page rhythm", 24),
    ("space-32", "Mobile page inset", 32),
    ("space-48", "Section rhythm", 48),
    ("space-64", "Hero rhythm", 64),
    ("radius-2", "Technical corner", 2),
    ("font-14", "Label text size", 14),
    ("font-16", "Body text size", 16),
    ("font-18", "Lead text size", 18),
    ("font-64", "Display text size", 64),
    ("tracking-0", "Neutral tracking", 0),
    ("tracking-tight", "Display tracking", -2),
    ("frame-desktop-inline", "Desktop frame inline size", 1440),
    ("frame-desktop-block", "Desktop frame block size", 900),
    ("frame-desktop-content", "Desktop content inline size", 1180),
    ("frame-mobile-inline", "Mobile frame inline size", 390),
    ("frame-mobile-block", "Mobile frame block size", 844),
    ("frame-mobile-content", "Mobile content inline size", 358),
    ("measure-container-inline-min", "Container inline minimum", 320),
    ("measure-container-inline-pref", "Container inline preference", 1180),
    ("measure-container-inline-max", "Container inline maximum", 1200),
    ("measure-container-block-min", "Container block minimum", 160),
    ("measure-container-block-pref", "Container block preference", 720),
    ("measure-container-block-max", "Container block maximum", 4000),
    ("measure-collection-inline-min", "Collection inline minimum", 280),
    ("measure-collection-inline-pref", "Collection inline preference", 960),
    ("measure-collection-inline-max", "Collection inline maximum", 1180),
    ("measure-collection-block-min", "Collection block minimum", 48),
    ("measure-collection-block-pref", "Collection block preference", 320),
    ("measure-collection-block-max", "Collection block maximum", 2000),
    ("measure-content-inline-min", "Content inline minimum", 40),
    ("measure-content-inline-pref", "Content inline preference", 760),
    ("measure-content-inline-max", "Content inline maximum", 920),
    ("measure-content-block-min", "Content block minimum", 24),
    ("measure-content-block-pref", "Content block preference", 96),
    ("measure-content-block-max", "Content block maximum", 800),
    ("measure-control-inline-min", "Control inline minimum", 80),
    ("measure-control-inline-pref", "Control inline preference", 240),
    ("measure-control-inline-max", "Control inline maximum", 480),
    ("measure-control-block-min", "Control block minimum", 40),
    ("measure-control-block-pref", "Control block preference", 48),
    ("measure-control-block-max", "Control block maximum", 160),
):
    primitive[key] = value(key, label, f"Sourced dimensional decision for {label.lower()}.", "dimension", dim(px))

primitive["opacity-full"] = value("opacity-full", "Full opacity", "All base content is fully opaque.", "number", {"type": "number", "value": 1})
primitive["text-scale-200"] = value("text-scale-200", "Two-times text scale", "Text remains usable when enlarged to twice its authored size.", "number", {"type": "number", "value": 2})
primitive["line-display"] = value("line-display", "Display line height", "Compact editorial display rhythm.", "number", {"type": "number", "value": 1.02})
primitive["line-body"] = value("line-body", "Body line height", "Readable technical prose rhythm.", "number", {"type": "number", "value": 1.55})
primitive["weight-400"] = value("weight-400", "Regular weight", "Body reading weight.", "font-weight", {"type": "font-weight", "value": 400})
primitive["weight-600"] = value("weight-600", "Semibold weight", "Label and action weight.", "font-weight", {"type": "font-weight", "value": 600})
primitive["weight-700"] = value("weight-700", "Bold weight", "Display hierarchy weight.", "font-weight", {"type": "font-weight", "value": 700})
primitive["family-sans"] = value(
    "family-sans", "System sans family", "Portable interface and editorial family.", "font-family",
    {"type": "font-family", "families": [{"kind": "generic", "family": "system-ui"}]},
)
primitive["family-mono"] = value(
    "family-mono", "System mono family", "Portable code and record family.", "font-family",
    {"type": "font-family", "families": [{"kind": "generic", "family": "monospace"}]},
)
primitive["stroke-solid"] = value(
    "stroke-solid", "Solid technical stroke", "Rules and focus remain explicit and unornamented.", "stroke-style",
    {"type": "stroke-style", "style": "solid", "lineCap": "butt"},
)

for key, label, number in (
    ("fraction-zero", "Gradient origin", 0),
    ("fraction-dot", "Dot edge", 0.06),
    ("fraction-clear", "Dot fade edge", 0.11),
    ("fraction-center", "Gradient centre", 0.5),
):
    primitive[key] = value(
        key, label, f"Unitless radial-gradient coordinate for {label.lower()}.",
        "number", {"type": "number", "value": number}, sources=(SRC_USER, SRC_REPO),
    )

primitive["surface-hero-dots"] = value(
    "surface-hero-dots", "Hero dot field",
    "A low-contrast radial accent field over the inverted hero surface.",
    "gradient",
    {
        "type": "gradient",
        "kind": "radial",
        "centerInline": primitive["fraction-center"],
        "centerBlock": primitive["fraction-center"],
        "stops": [
            {"color": primitive["accent-dot"], "position": primitive["fraction-zero"]},
            {"color": primitive["accent-dot"], "position": primitive["fraction-dot"]},
            {"color": primitive["surface-ink"], "position": primitive["fraction-clear"]},
        ],
    },
    sources=(SRC_USER, SRC_REPO),
)


def typography(identity: str, name: str, family: str, size: str, weight: str, line: str, tracking: str) -> str:
    return value(
        identity, name, f"Complete typography decision for {name.lower()}.", "typography",
        {
            "type": "typography",
            "family": primitive[family],
            "size": primitive[size],
            "weight": primitive[weight],
            "lineHeight": primitive[line],
            "tracking": primitive[tracking],
            "features": [],
        },
    )


primitive["type-body"] = typography("type-body", "Body register", "family-sans", "font-16", "weight-400", "line-body", "tracking-0")
primitive["type-lead"] = typography("type-lead", "Lead register", "family-sans", "font-18", "weight-400", "line-body", "tracking-0")
primitive["type-label"] = typography("type-label", "Label register", "family-sans", "font-14", "weight-600", "line-body", "tracking-0")
primitive["type-display"] = typography("type-display", "Display register", "family-sans", "font-64", "weight-700", "line-display", "tracking-tight")
primitive["type-mono"] = typography("type-mono", "Code register", "family-mono", "font-14", "weight-400", "line-body", "tracking-0")

primitive["border-rule"] = value(
    "border-rule", "Technical rule", "One-pixel evidence boundary.", "border",
    {"type": "border", "width": primitive["one"], "style": primitive["stroke-solid"], "color": primitive["rule"]},
)
primitive["border-focus"] = value(
    "border-focus", "Focus outline", "Visible two-pixel action focus boundary.", "border",
    {"type": "border", "width": primitive["two"], "style": primitive["stroke-solid"], "color": primitive["accent"]},
)

# Ground roles and bindings.
roles: dict[str, str] = {}
for args in (
    ("canvas", "Page canvas", "colour", "color", "The page's furthest background.", primitive["canvas"]),
    ("surface", "Primary surface", "colour", "color", "The normal content plane.", primitive["surface"]),
    ("surface-muted", "Muted surface", "colour", "color", "A secondary evidence plane.", primitive["surface-muted"]),
    ("surface-ink", "Inverted surface", "colour", "color", "A high-contrast explanatory plane.", primitive["surface-ink"]),
    ("surface-hero-dots", "Hero dot field", "colour", "gradient", "The opening surface carries the product's low-contrast dot field.", primitive["surface-hero-dots"]),
    ("surface-code", "Code surface", "colour", "color", "The executable example plane.", primitive["surface-code"]),
    ("ink", "Primary ink", "colour", "color", "Primary readable content.", primitive["ink"]),
    ("ink-muted", "Muted ink", "colour", "color", "Supporting explanation.", primitive["ink-muted"]),
    ("ink-inverse", "Inverse ink", "colour", "color", "Readable content on the inverted surface.", primitive["ink-inverse"]),
    ("ink-code", "Code ink", "colour", "color", "Executable examples on the code plane.", primitive["ink-code"]),
    ("ink-accent", "Accent ink", "colour", "color", "Small adoption and status signals.", primitive["accent"]),
    ("surface-action", "Action surface", "colour", "color", "The primary adoption action.", primitive["accent"]),
    ("ink-action", "Action ink", "colour", "color", "Readable content on the action signal.", primitive["accent-ink"]),
    ("type-body", "Body type", "typography", "typography", "Long-form technical explanation.", primitive["type-body"]),
    ("type-lead", "Lead type", "typography", "typography", "Introductory product explanation.", primitive["type-lead"]),
    ("type-label", "Label type", "typography", "typography", "Compact navigation, status, and actions.", primitive["type-label"]),
    ("type-display", "Display type", "typography", "typography", "The primary category-defining statement.", primitive["type-display"]),
    ("type-mono", "Code type", "typography", "typography", "Commands, records, and measured evidence.", primitive["type-mono"]),
    ("inset-page-inline", "Page inline inset", "spacing", "dimension", "The page's stable horizontal breathing room.", primitive["space-24"]),
    ("inset-page-block", "Page block inset", "spacing", "dimension", "The page's standard vertical breathing room.", primitive["space-48"]),
    ("inset-hero-block", "Hero block inset", "spacing", "dimension", "The opening argument receives extra vertical space.", primitive["space-64"]),
    ("inset-control-inline", "Control inline inset", "spacing", "dimension", "Text-to-edge distance inside an action.", primitive["space-12"]),
    ("inset-control-block", "Control block inset", "spacing", "dimension", "Vertical text-to-edge distance inside an action.", primitive["space-8"]),
    ("space-inline", "Inline rhythm", "spacing", "dimension", "Separation between adjacent controls and facts.", primitive["space-16"]),
    ("space-stack", "Stack rhythm", "spacing", "dimension", "Separation between sequential statements.", primitive["space-24"]),
    ("corner-control", "Technical corner", "radius", "dimension", "Small radius that keeps the page precise rather than soft.", primitive["radius-2"]),
    ("rule", "Evidence rule", "stroke", "border", "Separates claims without creating card chrome.", primitive["border-rule"]),
    ("outline-focus", "Action focus", "accessibility", "border", "Visible keyboard focus on interactive content.", primitive["border-focus"]),
    ("opacity-full", "Full opacity", "accessibility", "number", "Base content remains fully visible.", primitive["opacity-full"]),
    ("frame-desktop-inline", "Desktop inline frame", "frame", "dimension", "Desktop preview width.", primitive["frame-desktop-inline"]),
    ("frame-desktop-block", "Desktop block frame", "frame", "dimension", "Desktop preview height.", primitive["frame-desktop-block"]),
    ("frame-desktop-content", "Desktop content frame", "frame", "dimension", "Desktop readable content width.", primitive["frame-desktop-content"]),
    ("frame-mobile-inline", "Mobile inline frame", "frame", "dimension", "Mobile preview width.", primitive["frame-mobile-inline"]),
    ("frame-mobile-block", "Mobile block frame", "frame", "dimension", "Mobile preview height.", primitive["frame-mobile-block"]),
    ("frame-mobile-content", "Mobile content frame", "frame", "dimension", "Mobile readable content width.", primitive["frame-mobile-content"]),
):
    roles[args[0]] = role(*args)

primitive["duration-ambient"] = value(
    "duration-ambient", "Dot field phase duration", "A calm decorative phase cycle behind the hero content.",
    "duration", {"type": "duration", "value": 4, "unit": "s"}, sources=(SRC_USER, SRC_REPO),
)
primitive["duration-zero"] = value(
    "duration-zero", "No motion delay", "The ambient drift begins without an artificial wait.",
    "duration", {"type": "duration", "value": 0, "unit": "ms"}, sources=(SRC_USER, SRC_REPO),
)
primitive["curve-linear"] = value(
    "curve-linear", "Continuous drift curve", "A constant-speed curve avoids a visible loop seam.",
    "cubic-bezier", {"type": "cubic-bezier", "x1": 0, "y1": 0, "x2": 1, "y2": 1},
    sources=(SRC_USER, SRC_REPO),
)
primitive["motion-ambient-surface"] = value(
    "motion-ambient-surface", "Responsive dot field",
    "Small pointer- and touch-led displacement for the hero points; motionless presentation remains allowed.",
    "transition",
    {
        "type": "transition",
        "duration": primitive["duration-ambient"],
        "curve": primitive["curve-linear"],
        "delay": primitive["duration-zero"],
        "propertyRoles": [roles["surface-hero-dots"]],
    },
    sources=(SRC_USER, SRC_REPO),
)
roles["motion-ambient-surface"] = role(
    "motion-ambient-surface", "Responsive dot field motion", "motion", "transition",
    "The decorative hero points may respond gently to pointer or touch proximity without changing content or meaning.",
    primitive["motion-ambient-surface"], sources=(SRC_USER, SRC_REPO),
)
m.fact(
    "design-system", "uir-site:fact:constraint:pointer-dot-field",
    "design.constraint", GROUND, "invisible",
    {
        "kind": "motion-event",
        "event": "pointer-dot-field",
        "allowedTransitions": [primitive["motion-ambient-surface"]],
        "motionlessAllowed": True,
    },
    sources=(SRC_USER, SRC_REPO),
)

for profile in ("container", "collection", "content", "control"):
    for axis in ("inline", "block"):
        for bound in ("min", "pref", "max"):
            identity = f"measure-{profile}-{axis}-{bound}"
            roles[identity] = role(
                identity,
                f"{profile.title()} {axis} {bound}",
                "frame",
                "dimension",
                f"The {bound} {axis} extent for {profile} realizations.",
                primitive[identity],
            )

FRAME_DESKTOP = m.fact(
    "design-system", "uir-site:fact:frame:desktop", "ground.frame", GROUND,
    "invisible",
    {
        "meaning": "A desktop browser preview for the public UIR page.",
        "inlineSize": roles["frame-desktop-inline"],
        "blockSize": roles["frame-desktop-block"],
        "contentInlineSize": roles["frame-desktop-content"],
        "insetInline": roles["inset-page-inline"],
        "insetBlock": roles["inset-page-block"],
    },
)
FRAME_MOBILE = m.fact(
    "design-system", "uir-site:fact:frame:mobile", "ground.frame", GROUND,
    "invisible",
    {
        "meaning": "A mobile browser preview for the public UIR page.",
        "inlineSize": roles["frame-mobile-inline"],
        "blockSize": roles["frame-mobile-block"],
        "contentInlineSize": roles["frame-mobile-content"],
        "insetInline": roles["inset-page-inline"],
        "insetBlock": roles["inset-page-block"],
    },
)

# Product vocabulary, context, scope, and the one Surface.
ROLE_VOCAB = m.fact(
    "package", "uir-site:fact:role-vocabulary", "role.vocabulary", PACKAGE,
    "invisible",
    {"vocabularyId": "uir-site:roles", "version": "0.1.0", "kind": "root"},
    sources=(SRC_USER, SRC_REPO),
)
ROLE_SYMBOLS = (
    "code", "document", "group", "heading", "link", "list", "listitem",
    "navigation", "paragraph", "region",
)
for symbol in ROLE_SYMBOLS:
    m.fact(
        "package", f"uir-site:fact:role:{symbol}", "role.symbol", PACKAGE,
        "invisible",
        {
            "vocabulary": ROLE_VOCAB,
            "symbol": symbol,
            "meaning": f"The {symbol} semantic obligation used by the UIR public page.",
        },
        sources=(SRC_USER, SRC_REPO),
    )

AXES: dict[str, str] = {}
axis_rows = (
    ("surface-kind", "surface-kind", "symbol", ["marketing-page"]),
    ("surface-frame", "surface-frame", "symbol", ["responsive-web"]),
    ("surface-body", "surface-body", "symbol", ["adoption-landing"]),
    ("surface-part", "surface-part", "symbol", ["$no-part", "build", "footer", "hero", "mechanism", "navigation", "problem", "quickstart", "showcase", "standard", "status"]),
    ("parent-role", "parent-role", "role", ["$surface-root", *ROLE_SYMBOLS]),
)
for suffix, kind, typ, values_ in axis_rows:
    identity = f"uir-site:fact:axis:{suffix}"
    AXES[suffix] = m.fact(
        "package", identity, "context.axis", PACKAGE, "invisible",
        {
            "axisId": f"uir-site:axis:{suffix}",
            "axisKind": kind,
            "valueType": typ,
            "values": sorted(set(values_)),
        },
        sources=(SRC_USER, SRC_REPO),
    )
AXES["preview-frame"] = m.fact(
    "package", "uir-site:fact:axis:preview-frame", "context.axis", PACKAGE,
    "invisible",
    {
        "axisId": "uir-site:axis:preview-frame",
        "axisKind": "preview-frame",
        "valueType": "record-id",
        "target": {"recordType": "Fact", "kind": "ground.frame"},
        "values": sorted([FRAME_DESKTOP, FRAME_MOBILE]),
    },
    sources=(SRC_USER, SRC_REPO),
)

for identity, label, frame in (
    (CONTEXT_DESKTOP, "desktop", FRAME_DESKTOP),
    (CONTEXT_MOBILE, "mobile", FRAME_MOBILE),
):
    m.fact(
        "package", identity, "package.context", PACKAGE, "invisible",
        {
            "contextId": f"uir-site:context:{label}",
            "designContext": {
                "frame": frame,
                "modes": [],
                "interfaceStates": [],
                "pieceStates": [],
                "variants": [],
            },
        },
        sources=(SRC_USER, SRC_REPO),
    )

m.entity("interface", SURFACE, "Surface", owner=PACKAGE, sources=(SRC_USER, SRC_REPO))
m.fact(
    "interface", "uir-site:fact:surface-definition", "surface.definition", SURFACE,
    "invisible",
    {
        "purpose": "Explain UIR as the framework-independent representation of interface meaning, show how it meets the design system, prove this page is authored from UIR, and separate the alpha tooling from the standard itself.",
        "kind": "marketing-page",
        "frame": "responsive-web",
        "body": "adoption-landing",
        "parts": sorted(("navigation", "hero", "problem", "mechanism", "showcase", "quickstart", "build", "standard", "status", "footer")),
        "contexts": sorted(CONTEXTS),
    },
    sources=(SRC_USER, SRC_REPO, *SRC_RESEARCH),
)
m.fact(
    "package", "uir-site:fact:scope", "package.scope", PACKAGE, "invisible",
    {"designSystem": DESIGN_SYSTEM, "surfaces": [SURFACE], "contexts": sorted(CONTEXTS)},
    sources=(SRC_USER, SRC_REPO),
)


def projection(subject: str, suffix: str, bindings: dict[str, str], layout: dict, *, collection: str = "design-system") -> None:
    for slot_name in SLOTS:
        decision = {"target": {"kind": "self"}, "slot": slot_name}
        if slot_name in bindings:
            decision.update({"outcome": "role", "groundRole": roles[bindings[slot_name]]})
        else:
            decision.update({"outcome": "none", "rationale": f"{suffix} contributes no {slot_name} presentation."})
        m.fact(
            collection, f"uir-site:fact:projection:{suffix}:{slot_name}",
            "presentation.binding", subject, "visible", decision,
            sources=(SRC_USER, *SRC_RESEARCH),
        )
    m.fact(
        collection, f"uir-site:fact:layout:{suffix}", "composition.layout",
        subject, "visible",
        {"target": {"kind": "self"}, "outcome": "layout", "layout": layout},
        sources=(SRC_USER, *SRC_RESEARCH),
    )


projection(
    SURFACE, "surface-home",
    {
        "canvas": "canvas", "surface": "surface", "ink": "ink",
        "type": "type-body", "inset-inline": "inset-page-inline",
        "inset-block": "inset-page-block", "inter-item-block": "space-stack",
        "opacity": "opacity-full",
    },
    {"mode": "flow", "axis": "block", "wrap": "forbid", "alignInline": "stretch", "alignBlock": "start", "distribution": "start"},
    collection="interface",
)


MEASURE_PROFILES = {
    "document": "container", "region": "container",
    "navigation": "collection", "group": "collection", "list": "collection",
    "heading": "content", "paragraph": "content", "code": "content",
    "listitem": "content", "link": "control",
}


def measure(target: dict, role_name: str) -> dict:
    profile = MEASURE_PROFILES[role_name]
    return {
        "target": target,
        "inline": {
            "minimum": roles[f"measure-{profile}-inline-min"],
            "preferred": roles[f"measure-{profile}-inline-pref"],
            "maximum": roles[f"measure-{profile}-inline-max"],
            "growth": "bounded",
        },
        "block": {
            "minimum": roles[f"measure-{profile}-block-min"],
            "preferred": roles[f"measure-{profile}-block-pref"],
            "maximum": roles[f"measure-{profile}-block-max"],
            "growth": "content",
        },
        "wrap": "allow",
        "truncation": {"kind": "never"},
        "distribution": "start",
        "overflow": "reflow",
    }


PIECES: dict[str, str] = {}


def piece(role_name: str, *, container: bool, layout: dict, bindings: dict[str, str], focus: str = "none", operations: list[str] | None = None, named_from_content: bool = False) -> str:
    operations = operations or []
    identity = f"uir-site:piece:{role_name}"
    PIECES[role_name] = identity
    rank = "molecule" if container else "atom"
    m.entity("design-system", identity, "Piece", owner=DESIGN_SYSTEM, sources=(SRC_USER, *SRC_RESEARCH))
    m.fact(
        "design-system", f"uir-site:fact:piece-identity:{role_name}", "piece.identity",
        identity, "invisible",
        {"name": f"{role_name} realization", "revision": "0.1.0", "kind": f"marketing-{role_name}", "compatibility": "compatible"},
        sources=(SRC_USER, *SRC_RESEARCH),
    )
    m.fact(
        "design-system", f"uir-site:fact:piece-purpose:{role_name}", "piece.purpose",
        identity, "invisible",
        {"job": f"Realize the {role_name} role in the public page.", "semanticContribution": f"Preserve the {role_name} semantic object while drawing it from UIR."},
        sources=(SRC_USER, SRC_REPO),
    )
    m.fact(
        "design-system", f"uir-site:fact:piece-case:{role_name}", "piece.case",
        identity, "invisible",
        {"need": f"The public page contains reachable {role_name} nodes.", "evidence": [SRC_USER], "replaces": []},
        sources=(SRC_USER,),
    )
    m.fact("design-system", f"uir-site:fact:piece-rank:{role_name}", "piece.rank", identity, "invisible", {"rank": rank})
    m.fact(
        "design-system", f"uir-site:fact:piece-applicability:{role_name}",
        "piece.applicability", identity, "invisible",
        {"roles": [role_name], "surfaceKinds": ["marketing-page"], "contexts": sorted(CONTEXTS)},
    )
    slot_id = f"uir-site:fact:piece-anatomy:{role_name}:slot"
    fill_kind = "nodes" if container else "content"
    m.fact(
        "design-system", slot_id, "piece.anatomy", identity, "visible",
        {
            "kind": "slot",
            "member": f"{role_name}-content",
            "purpose": f"Hold the {fill_kind} carried by the resolved {role_name} node.",
            "order": 0,
            "fillKinds": [fill_kind],
            "minimum": 1 if container else 0,
            "maximum": None,
            "ordered": True,
            "accepted": {
                "pieces": [],
                "ranks": [],
                "roles": list(SEMANTIC_ROLES) if container else [],
            },
            "empty": "omit",
            "semanticTarget": "children" if container else "whole",
        },
    )
    m.fact(
        "design-system", f"uir-site:fact:piece-variant:{role_name}",
        "piece.variant-dimension", identity, "invisible",
        {"kind": "none", "rationale": "The role is differentiated by authoritative node and projection facts, not hidden variants."},
    )

    supported = ["at rest"]
    if role_name == "link":
        supported += ["hovered", "focused", "pressed"]
    state_ids: dict[str, str] = {}
    for state_name in supported:
        state_slug = slug(state_name)
        state_id = f"uir-site:piece-state:{role_name}:{state_slug}"
        state_ids[state_name] = state_id
        m.entity("design-system", state_id, "PieceState", piece=identity, sources=(SRC_USER, *SRC_RESEARCH))
        m.fact(
            "design-system", f"uir-site:fact:axis:piece-state:{role_name}:{state_slug}",
            "context.axis", state_id, "invisible",
            {
                "axisId": f"uir-site:axis:piece-state:{role_name}:{state_slug}",
                "axisKind": "piece-state", "valueType": "boolean", "values": [False, True],
            },
        )
        m.fact(
            "design-system", f"uir-site:fact:piece-state-definition:{role_name}:{state_slug}",
            "piece-state.definition", state_id, "invisible",
            {
                "requiredState": state_name,
                "meaning": f"The {role_name} realization is {state_name}.",
                "coexists": [], "excludes": [], "transitionMeaning": "",
            },
        )
        m.fact(
            "design-system", f"uir-site:fact:piece-state-presentation:{role_name}:{state_slug}",
            "piece-state.presentation", state_id, "visible",
            {"anatomy": [], "assetUses": [], "designValues": [], "motion": [], "measures": []},
        )
    for required in REQUIRED_STATES:
        if required in state_ids:
            state_value = {"requiredState": required, "outcome": "supported", "states": [state_ids[required]]}
        else:
            state_value = {"requiredState": required, "outcome": "not-applicable", "rationale": f"The {role_name} realization has no {required} product meaning."}
        m.fact(
            "design-system", f"uir-site:fact:piece-state-decision:{role_name}:{slug(required)}",
            "piece.state-decision", identity, "visible", state_value,
        )
    m.fact(
        "design-system", f"uir-site:fact:piece-asset-use:{role_name}", "piece.asset-use",
        identity, "visible", {"outcome": "not-applicable", "rationale": "This page uses no render-critical image asset for the role."},
    )
    m.fact(
        "design-system", f"uir-site:fact:piece-accessibility:{role_name}",
        "piece.accessibility", identity, "invisible",
        {
            "mode": "independent", "role": role_name,
            "name": {"type": "literal", "value": f"{role_name} content"} if named_from_content else {"type": "none"},
            "description": {"type": "none"}, "focus": focus,
            "activation": sorted(operations), "stateExposure": [],
            "readingOrder": [slot_id],
            "largestTextScale": primitive["text-scale-200"],
            "localizedRange": "English-language product and technical prose.",
        },
    )
    m.fact("design-system", f"uir-site:fact:piece-measure:{role_name}:self", "piece.measure", identity, "visible", measure({"kind": "piece"}, role_name))
    m.fact("design-system", f"uir-site:fact:piece-measure:{role_name}:slot", "piece.measure", identity, "visible", measure({"kind": "slot", "anatomy": slot_id}, role_name))
    m.fact(
        "design-system", f"uir-site:fact:piece-design:{role_name}", "piece.design",
        identity, "visible", {"groundRoles": [], "values": [], "registers": [], "motion": []},
    )
    projection(identity, f"piece-{role_name}", bindings, layout)
    return identity


base_bindings = {
    "ink": "ink", "type": "type-body", "opacity": "opacity-full",
}
content_layout = {
    "mode": "flow", "axis": "inline", "wrap": "allow",
    "alignInline": "start", "alignBlock": "center", "distribution": "start",
}
piece(
    "document", container=True,
    layout={"mode": "flow", "axis": "block", "wrap": "forbid", "alignInline": "stretch", "alignBlock": "start", "distribution": "start"},
    bindings={**base_bindings, "inter-item-block": "space-stack"},
)
piece(
    "navigation", container=True,
    layout={"mode": "flow", "axis": "inline", "wrap": "allow", "alignInline": "center", "alignBlock": "center", "distribution": "space-between"},
    bindings={**base_bindings, "surface": "surface", "type": "type-label", "inter-item-inline": "space-inline", "rule": "rule"},
)
piece(
    "region", container=True,
    layout={"mode": "flow", "axis": "block", "wrap": "forbid", "alignInline": "stretch", "alignBlock": "start", "distribution": "start"},
    bindings={**base_bindings, "surface": "surface", "inset-inline": "inset-page-inline", "inset-block": "inset-page-block", "inter-item-block": "space-stack", "rule": "rule"},
)
piece(
    "group", container=True,
    layout={"mode": "flow", "axis": "inline", "wrap": "allow", "alignInline": "start", "alignBlock": "stretch", "distribution": "start"},
    bindings={**base_bindings, "inter-item-inline": "space-inline", "inter-item-block": "space-inline"},
)
piece("heading", container=False, layout=content_layout, bindings={**base_bindings, "type": "type-display"}, named_from_content=True)
piece("paragraph", container=False, layout=content_layout, bindings=base_bindings)
piece(
    "link", container=False, layout=content_layout,
    bindings={"surface": "surface-action", "ink": "ink-action", "type": "type-label", "inset-inline": "inset-control-inline", "inset-block": "inset-control-block", "corner": "corner-control", "outline": "outline-focus", "opacity": "opacity-full"},
    focus="single", operations=["navigate"], named_from_content=True,
)
piece(
    "code", container=False, layout=content_layout,
    bindings={"surface": "surface-code", "ink": "ink-code", "type": "type-mono", "inset-inline": "inset-control-inline", "inset-block": "inset-control-block", "corner": "corner-control", "rule": "rule", "opacity": "opacity-full"},
)
piece(
    "list", container=True,
    layout={"mode": "flow", "axis": "block", "wrap": "forbid", "alignInline": "stretch", "alignBlock": "start", "distribution": "start"},
    bindings={**base_bindings, "inter-item-block": "space-inline"},
)
piece("listitem", container=False, layout=content_layout, bindings=base_bindings)


nodes: dict[str, dict] = {}
children: dict[str, list[str]] = {}
controls: list[tuple[str, str]] = []


def node(
    key: str, role_name: str, content: str | None, *, parent: str | None,
    salience: str = "supporting", overrides: dict[str, str] | None = None,
    external_content_gap: bool = False,
    sources: tuple[str, ...] = (SRC_USER, SRC_REPO),
) -> str:
    identity = f"uir-site:node:{key}"
    m.entity("interface", identity, "Node", owner=PACKAGE, sources=sources)
    nodes[identity] = {"key": key, "role": role_name, "content": content, "parent": parent}
    if parent is not None:
        children.setdefault(parent, []).append(identity)
    m.fact(
        "interface", f"uir-site:fact:node-role:{key}", "node.role", identity,
        "invisible", {"role": role_name, "primary": True}, sources=sources,
    )
    if not external_content_gap:
        content_value = {"type": "empty"} if content is None else {"type": "text", "value": content, "direction": "ltr", "language": "en"}
        m.fact(
            "interface", f"uir-site:fact:node-content:{key}", "node.content", identity,
            "visible", content_value,
            sources=sources,
        )
    else:
        gap_id = f"uir-site:gap:node-content:{key}"
        m.entity(
            "interface", gap_id, "Gap", owner=PACKAGE, target=identity,
            gapKind="external",
            sources=(SRC_USER, SRC_REPO),
        )
        m.by_id[gap_id]["rationale"] = (
            "The public install artifact is not published yet; current tooling "
            "runs from an authorized source checkout."
        )
        m.fact(
            "interface", f"uir-site:fact:gap-site:{key}", "gap.site", gap_id,
            "invisible",
            {
                "status": "identified", "targetClass": "node",
                "expected": {"kind": "fact", "factKind": "node.content"},
                "externalLocator": "https://github.com/tenbytesltd/uir",
                "impactPath": [{"id": identity, "kind": "Node", "recordType": "Entity"}],
            },
            sources=(SRC_USER, SRC_REPO),
        )
    semantics = {
        "name": {"type": "literal", "value": content or key} if role_name in {"heading", "link"} else {"type": "none"},
        "description": {"type": "none"},
        "focus": "single" if role_name == "link" else "none",
        "operations": ["navigate"] if role_name == "link" else [],
    }
    m.fact("interface", f"uir-site:fact:node-semantics:{key}", "node.semantics", identity, "invisible", semantics, sources=sources)
    m.fact("interface", f"uir-site:fact:node-salience:{key}", "node.salience", identity, "visible", {"level": salience}, sources=sources)
    m.fact(
        "interface", f"uir-site:fact:node-composition:{key}", "node.composition",
        identity, "invisible",
        {"kind": "ordered-group" if role_name in {"document", "navigation", "region", "group", "list"} else "leaf", "ownsChildren": role_name in {"document", "navigation", "region", "group", "list"}},
        sources=sources,
    )
    if overrides:
        for slot_name, role_name_override in sorted(overrides.items()):
            m.fact(
                "interface", f"uir-site:fact:node-projection:{key}:{slot_name}",
                "presentation.binding", identity, "visible",
                {"target": {"kind": "self"}, "slot": slot_name, "outcome": "role", "groundRole": roles[role_name_override]},
                sources=sources,
            )
    return identity


ROOT_NODE = node("root", "document", None, parent=None, salience="primary")

NAV = node("navigation", "navigation", None, parent=ROOT_NODE, salience="secondary")
node("brand", "heading", "UIR", parent=NAV, salience="primary", overrides={"type": "type-label"})
NAV_EXTRACT = node("nav-extract", "link", "Existing UI", parent=NAV, salience="secondary")
NAV_BUILD = node("nav-build", "link", "New UI", parent=NAV, salience="secondary")
NAV_STANDARD = node("nav-standard", "link", "Why UIR", parent=NAV, salience="secondary")
NAV_SOURCE = node("nav-source", "link", "This site", parent=NAV, salience="secondary")

HERO = node(
    "hero", "region", None, parent=ROOT_NODE, salience="primary",
    overrides={
        "surface": "surface-hero-dots", "ink": "ink-inverse",
        "inset-block": "inset-hero-block", "motion": "motion-ambient-surface",
    },
)
node("hero-kicker", "paragraph", "USER INTERFACE REPRESENTATION · ALPHA", parent=HERO, salience="quiet", overrides={"ink": "ink-accent", "type": "type-label"}, sources=(SRC_USER, SRC_TENBYTES, SRC_REPO, SRC_SITE_REPO))
node(
    "hero-title", "heading", "Write down what the interface means.",
    parent=HERO, salience="primary",
    overrides={"ink": "ink-inverse", "type": "type-display"},
)
node(
    "hero-lead", "paragraph",
    "UIR is a framework-independent representation of a screen: its structure, roles, behaviour, states, relationships, and unresolved gaps. A design system supplies the realization. Code is a target.",
    parent=HERO, salience="secondary",
    overrides={"ink": "ink-inverse", "type": "type-lead"},
)
HERO_ACTIONS = node("hero-actions", "group", None, parent=HERO, salience="secondary")
HERO_PRIMARY = node("hero-primary", "link", "Try it on existing UI", parent=HERO_ACTIONS, salience="primary")
HERO_SECONDARY = node("hero-secondary", "link", "How UIR fits", parent=HERO_ACTIONS, salience="secondary")
node("hero-command", "code", "python3 tool/extract_react.py --root <repo> --app <app/src> --change-set .uir/reading.json", parent=HERO, salience="supporting")
node(
    "install-gap", "paragraph", None, parent=HERO, salience="quiet",
    overrides={"ink": "ink-inverse"}, external_content_gap=True,
)

PROBLEM = node("problem", "region", None, parent=ROOT_NODE, salience="primary", overrides={"surface": "surface-muted"})
node("problem-kicker", "paragraph", "THE PROBLEM", parent=PROBLEM, salience="quiet", overrides={"type": "type-label", "ink": "ink-muted"})
node("problem-title", "heading", "Code can show how a screen was built. It cannot tell you what the screen means.", parent=PROBLEM, salience="primary")
node("problem-lead", "paragraph", "Design captures appearance. Code captures one implementation. A design system captures reusable realization. The interface itself — its semantic structure and obligations — still has no canonical form.", parent=PROBLEM, salience="secondary", overrides={"type": "type-lead"})
PROBLEM_GRID = node("problem-grid", "group", None, parent=PROBLEM)
for key, title, copy in (
    ("problem-design", "The design", "Appearance is explicit. Meaning is mostly inferred."),
    ("problem-code", "The code", "Behaviour is executable, but intent is distributed through implementation details."),
    ("problem-system", "The system", "Components and tokens define how roles are realized, not what this particular screen means."),
):
    card = node(key, "region", None, parent=PROBLEM_GRID, salience="secondary")
    node(f"{key}-title", "heading", title, parent=card, salience="secondary", overrides={"type": "type-lead"})
    node(f"{key}-copy", "paragraph", copy, parent=card, salience="supporting")

MECHANISM = node("mechanism", "region", None, parent=ROOT_NODE, salience="primary")
node("mechanism-kicker", "paragraph", "THE MISSING LAYER", parent=MECHANISM, salience="quiet", overrides={"type": "type-label", "ink": "ink-muted"})
node("mechanism-title", "heading", "UIR describes the screen. The design system decides how to draw it.", parent=MECHANISM, salience="primary")
node("mechanism-copy", "paragraph", "UIR owns the facts that should survive a framework change. The design system owns the pieces and values that realize those facts. Put them together and the implementation becomes replaceable.", parent=MECHANISM, salience="secondary", overrides={"type": "type-lead"})
FLOW = node("mechanism-flow", "group", None, parent=MECHANISM)
for key, title, copy in (
    ("flow-input", "01 · The screen", "Structure, reading order, roles, behaviour, conditions, navigation, and data relationships."),
    ("flow-package", "02 · The design system", "Pieces and design values that realize roles without leaking implementation details into UIR."),
    ("flow-prototype", "03 · The result", "A board, a web app, a native app, or another target derived from the same meaning."),
):
    card = node(key, "region", None, parent=FLOW)
    node(f"{key}-title", "heading", title, parent=card, salience="secondary", overrides={"type": "type-lead"})
    node(f"{key}-copy", "paragraph", copy, parent=card)

SHOWCASE = node(
    "showcase", "region", None, parent=ROOT_NODE, salience="primary",
    overrides={"surface": "surface-ink", "ink": "ink-inverse"},
    sources=(SRC_USER, SRC_REPO, SRC_SITE_REPO),
)
node("showcase-kicker", "paragraph", "THIS SITE IS UIR", parent=SHOWCASE, salience="quiet", overrides={"ink": "ink-accent", "type": "type-label"}, sources=(SRC_USER, SRC_SITE_REPO))
node("showcase-title", "heading", "The page you are reading is generated from its own representation.", parent=SHOWCASE, salience="primary", overrides={"ink": "ink-inverse"}, sources=(SRC_USER, SRC_SITE_REPO))
node("showcase-copy", "paragraph", "Its content, structure, semantics, design bindings, provenance, and gaps live in the checked UIR package. React is only the renderer. The inspector reads the same package.", parent=SHOWCASE, salience="secondary", overrides={"ink": "ink-inverse", "type": "type-lead"}, sources=(SRC_USER, SRC_REPO, SRC_SITE_REPO))
SHOWCASE_GRID = node("showcase-grid", "group", None, parent=SHOWCASE, sources=(SRC_USER, SRC_SITE_REPO))
for key, title, copy in (
    ("showcase-source", "01 · Read the UIR", "The authoring source compiles to the checked package consumed by the page."),
    ("showcase-review", "02 · Check the proof", "CI verifies that the package is reproducible and binds it to the reviewed UIR evidence."),
    ("showcase-inspect", "03 · Inspect any node", "Select visible content to see the role, Piece, bindings, provenance, controls, and gaps behind it."),
):
    card = node(key, "region", None, parent=SHOWCASE_GRID, salience="secondary", sources=(SRC_USER, SRC_REPO, SRC_SITE_REPO))
    node(f"{key}-title", "heading", title, parent=card, salience="secondary", overrides={"type": "type-lead", "ink": "ink-inverse"}, sources=(SRC_USER, SRC_REPO, SRC_SITE_REPO))
    node(f"{key}-copy", "paragraph", copy, parent=card, overrides={"ink": "ink-inverse"}, sources=(SRC_USER, SRC_REPO, SRC_SITE_REPO))
SHOWCASE_ACTIONS = node("showcase-actions", "group", None, parent=SHOWCASE, salience="secondary", sources=(SRC_USER, SRC_SITE_REPO))
node("showcase-repository", "link", "View the site source", parent=SHOWCASE_ACTIONS, salience="primary", sources=(SRC_SITE_REPO,))
node("showcase-path", "code", "github.com/tenbytesltd/uir-public-site", parent=SHOWCASE_ACTIONS, salience="supporting", sources=(SRC_SITE_REPO,))

QUICKSTART = node("quickstart", "region", None, parent=ROOT_NODE, salience="primary")
node("quickstart-kicker", "paragraph", "EXISTING INTERFACE", parent=QUICKSTART, salience="quiet", overrides={"ink": "ink-muted", "type": "type-label"})
node("quickstart-title", "heading", "Use extraction to see what your current UI actually says.", parent=QUICKSTART, salience="primary")
node("quickstart-copy", "paragraph", "The alpha extractor reads supported implementation evidence and emits UIR facts it can justify. What it cannot justify remains explicit instead of becoming a guess.", parent=QUICKSTART, salience="secondary", overrides={"type": "type-lead"})
STEPS = node("quickstart-steps", "group", None, parent=QUICKSTART)
for key, title, copy, command in (
    ("quickstart-read", "1 · Read", "Point the extractor at the app and the design-system sources you want it to inspect.", "python3 tool/extract_react.py --root <repo> --app <app/src> --design-system-source <system/src> --change-set .uir/reading.json"),
    ("quickstart-see", "2 · Inspect", "Review the representation, the evidence behind each fact, and the gaps it could not resolve.", "python3 tool/uir_report.py --change-set .uir/reading.json"),
    ("quickstart-adopt", "3 · Use", "Put the representation beside the implementation and make drift a reviewable change.", "# CI integration is alpha and remains an explicit adoption task"),
):
    card = node(key, "region", None, parent=STEPS, salience="secondary")
    node(f"{key}-title", "heading", title, parent=card, salience="secondary", overrides={"type": "type-lead"})
    node(f"{key}-copy", "paragraph", copy, parent=card)
    node(f"{key}-command", "code", command, parent=card)

BUILD = node("build", "region", None, parent=ROOT_NODE, salience="primary", overrides={"surface": "surface-muted"})
node("build-kicker", "paragraph", "NEW INTERFACE", parent=BUILD, salience="quiet", overrides={"type": "type-label", "ink": "ink-muted"})
node("build-title", "heading", "For a new screen, author meaning before implementation.", parent=BUILD, salience="primary")
node("build-copy", "paragraph", "Describe the product intent in ordinary language. An agent can compile confirmed decisions into UIR, while the board makes those decisions reviewable before any framework becomes the source of truth.", parent=BUILD, salience="secondary", overrides={"type": "type-lead"})
BUILD_STEPS = node("build-steps", "list", None, parent=BUILD)
for index, copy in enumerate((
    "Describe the job, user, real content, and constraints.",
    "Compile confirmed interface decisions into UIR.",
    "Review the board and semantic inspector; correct the representation, not a second artifact.",
    "Choose a target only after the representation is accepted.",
), start=1):
    node(f"build-step-{index}", "listitem", f"{index:02d} — {copy}", parent=BUILD_STEPS)

STANDARD = node("standard", "region", None, parent=ROOT_NODE, salience="primary")
node("standard-kicker", "paragraph", "WHY A REPRESENTATION", parent=STANDARD, salience="quiet", overrides={"type": "type-label", "ink": "ink-muted"})
node("standard-title", "heading", "Not a framework. Not a design tool. Not another markup language.", parent=STANDARD, salience="primary")
node("standard-copy", "paragraph", "UIR is the layer between design and code where interface meaning can live independently of either. The format is strict about meaning and deliberately silent about implementation.", parent=STANDARD, salience="secondary", overrides={"type": "type-lead"})
STANDARD_GRID = node("standard-grid", "group", None, parent=STANDARD)
for key, title, copy in (
    ("standard-source", "Framework-independent", "A UIR fact should remain true if React is replaced by Flutter, UIKit, or something else."),
    ("standard-evidence", "Design-system backed", "UIR names roles; the design system maps those roles to Pieces and values."),
    ("standard-gaps", "Explicit gaps", "Unknown meaning stays unknown. Silence is not converted into a convenient default."),
    ("standard-targets", "One authority", "Boards and target implementations are projections of the representation, not parallel sources to keep in sync."),
):
    card = node(key, "region", None, parent=STANDARD_GRID)
    node(f"{key}-title", "heading", title, parent=card, salience="secondary", overrides={"type": "type-lead"})
    node(f"{key}-copy", "paragraph", copy, parent=card)

STATUS = node("status", "region", None, parent=ROOT_NODE, salience="primary", overrides={"surface": "surface-muted"})
node("status-kicker", "paragraph", "CURRENT STATUS", parent=STATUS, salience="quiet", overrides={"type": "type-label", "ink": "ink-muted"})
node("status-title", "heading", "A definition under test.", parent=STATUS, salience="primary")
node("status-copy", "paragraph", "UIR v0.1 is still being discovered through implementation. The current tools exist to test the model: can real interfaces be expressed without smuggling framework or layout decisions into the representation?", parent=STATUS, salience="secondary", overrides={"type": "type-lead"}, sources=(SRC_USER, SRC_REPO, SRC_SITE_REPO))
STATUS_LIST = node("status-list", "list", None, parent=STATUS)
for index, copy in enumerate((
    "Working now — deterministic authoring, package checking, extraction experiments, live boards, semantic inspection, and CI evidence.",
    "Still open — vocabulary and contract gaps that must be resolved before v0.1 can freeze.",
    "Not claimed — a stable public install, production target compilers, or a mature adopter ecosystem.",
), start=1):
    node(f"status-item-{index}", "listitem", copy, parent=STATUS_LIST)

FOOTER = node("footer", "region", None, parent=ROOT_NODE, salience="quiet", overrides={"surface": "surface-ink", "ink": "ink-inverse"})
node("footer-title", "heading", "UIR by Tenbytes Ltd", parent=FOOTER, salience="secondary", overrides={"type": "type-lead", "ink": "ink-inverse"}, sources=(SRC_USER, SRC_TENBYTES, SRC_REPO))
node("footer-copy", "paragraph", "Created and stewarded by Tenbytes Ltd. Describe the interface. Let the design system realize it. Treat code as a target.", parent=FOOTER, salience="quiet", overrides={"ink": "ink-inverse"}, sources=(SRC_USER, SRC_TENBYTES, SRC_REPO))
FOOTER_ACTION = node("footer-action", "link", "Try extraction", parent=FOOTER, salience="secondary")

controls.extend((
    (NAV_EXTRACT, QUICKSTART), (NAV_BUILD, BUILD), (NAV_STANDARD, STANDARD), (NAV_SOURCE, SHOWCASE),
    (HERO_PRIMARY, QUICKSTART), (HERO_SECONDARY, MECHANISM),
    (FOOTER_ACTION, QUICKSTART),
))

# Emit ordered containment and explicit internal navigation relationships.
m.relation(
    "uir-site:relation:surface-root", "contains", SURFACE, ROOT_NODE, order=0,
    meaning="The public page Surface presents this document as its one semantic root.",
)
for parent, ordered_children in children.items():
    for order_index, child in enumerate(ordered_children):
        m.relation(
            f"uir-site:relation:contains:{nodes[child]['key']}", "contains", parent,
            child, order=order_index,
            meaning=f"{nodes[parent]['key']} contains {nodes[child]['key']} at this semantic reading position.",
        )
for source, target in controls:
    m.relation(
        f"uir-site:relation:controls:{nodes[source]['key']}:{nodes[target]['key']}",
        "controls", source, target,
        meaning=f"The {nodes[source]['content']} action navigates to the {nodes[target]['key']} section inside this Surface.",
    )

# Total Role → Piece resolutions over every reachable parent-role pair.
pairs: set[tuple[str, str]] = set()
for identity, item in nodes.items():
    parent = item["parent"]
    parent_role = "$surface-root" if parent is None else nodes[parent]["role"]
    pairs.add((item["role"], parent_role))

for role_name, parent_role in sorted(pairs):
    suffix = f"{slug(role_name)}:{slug(parent_role)}"
    condition = f"uir-site:condition:resolution:{suffix}"
    m.entity("package", condition, "Condition", owner=PACKAGE, sources=(SRC_USER, SRC_REPO))
    m.fact(
        "package", f"uir-site:fact:condition:resolution:{suffix}",
        "condition.expression", condition, "invisible",
        {"op": "eq", "axis": PARENT_ROLE_AXIS, "value": parent_role},
        sources=(SRC_USER, SRC_REPO),
    )
    resolution = f"uir-site:resolution:{suffix}"
    m.entity(
        "design-system", resolution, "Resolution", owner=DESIGN_SYSTEM,
        outcome=PIECES[role_name], when=condition,
        sources=(SRC_USER, SRC_REPO, *SRC_RESEARCH),
    )
    m.fact(
        "design-system", f"uir-site:fact:selector:role:{suffix}",
        "resolution.selector", resolution, "visible",
        {"dimension": "role", "role": role_name},
        sources=(SRC_USER, SRC_REPO),
    )
    m.fact(
        "design-system", f"uir-site:fact:selector:parent:{suffix}",
        "resolution.selector", resolution, "visible",
        {"dimension": "parent-role", "axis": PARENT_ROLE_AXIS, "values": [parent_role]},
        sources=(SRC_USER, SRC_REPO),
    )

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path,
                        help="path for the generated UIR changeset")
    args = parser.parse_args()

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(m.changeset(), ensure_ascii=False, sort_keys=True, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {args.output}")
    print(f"records: {sum(len(rows) for rows in m.records.values())}")
    print(f"nodes: {len(nodes)}")
    print(f"resolutions: {len(pairs)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
