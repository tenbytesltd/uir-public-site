#!/usr/bin/env python3
"""Verify and explain the public boundary of the UIR showcase site."""

from __future__ import annotations

import argparse
import collections
import hashlib
import json
import pathlib
import re
import subprocess
import sys
import tempfile
from typing import Any

EVIDENCE_SCHEMA = "uir.public-site-evidence/v1"

#: `owner/repo@<full 40-hex sha>`. A short sha is ambiguous across a repository's
#: lifetime and a branch name is not a revision at all, so neither is accepted
#: here: the field names ONE commit or it names nothing checkable.
AUDIT_SOURCE = re.compile(r"^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+@[0-9a-f]{40}$")

#: Words that make a measurement ATTRIBUTABLE to a private subject. The audit is
#: produced by tooling that measures a client's codebase, and one of its
#: constants carried that client's package name and four figures measured against
#: it into every report it wrote — including this repository's, twice, the second
#: time after a clean regeneration. It was fixed at its source in the private
#: tree; this is the check that says so here, where the file is published.
#:
#: It exists because the field that WOULD have said the audit came from a fixed
#: revision was not validated by anything and was stale: `officialAuditSource`
#: named a revision three days older than the fix while the audit content was
#: the fixed tooling's. A provenance string nothing checks is not provenance.
PRIVATE_SUBJECTS = ("exams", "testvai")


class VerificationError(RuntimeError):
    pass


def load_json(path: pathlib.Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise VerificationError(f"cannot read JSON {path}: {exc}") from exc


def digest(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def safe_child(root: pathlib.Path, relative: str) -> pathlib.Path:
    candidate = (root / relative).resolve()
    try:
        candidate.relative_to(root.resolve())
    except ValueError as exc:
        raise VerificationError(f"path escapes package root: {relative}") from exc
    if candidate.is_symlink():
        raise VerificationError(f"package path is a symlink: {relative}")
    return candidate


def package_fingerprint(package: pathlib.Path) -> str:
    manifest_path = package / "package.json"
    manifest = load_json(manifest_path)
    entries = [("package.json", digest(manifest_path))]
    for item in manifest.get("model", []):
        relative = item.get("path")
        if not isinstance(relative, str):
            raise VerificationError("manifest model entry has no string path")
        entries.append((relative, digest(safe_child(package, relative))))
    payload = json.dumps(sorted(entries), separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def reproduce(root: pathlib.Path, author: pathlib.Path, package: pathlib.Path) -> dict[str, Any]:
    with tempfile.TemporaryDirectory(prefix="uir-public-site-") as temporary:
        output = pathlib.Path(temporary) / "site.changeset.json"
        run = subprocess.run(
            [sys.executable, str(author), "--output", str(output)],
            cwd=root,
            check=False,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        if run.stdout:
            print(run.stdout, end="")
        if run.returncode:
            raise VerificationError(f"authoring program exited {run.returncode}")
        changeset = load_json(output)

    if changeset.get("changeSetVersion") != "0.1":
        raise VerificationError("unsupported changeSetVersion")
    if changeset.get("deletes") or changeset.get("assets") != {"deletes": [], "upserts": []}:
        raise VerificationError("showcase transport must remain additive and JSON-only")
    shards = changeset.get("shards")
    upserts = changeset.get("upserts")
    if not isinstance(shards, list) or not isinstance(upserts, list):
        raise VerificationError("changeset shards and upserts must be lists")

    grouped: dict[tuple[str, str], list[dict[str, Any]]] = collections.defaultdict(list)
    for item in upserts:
        if not isinstance(item, dict) or not isinstance(item.get("record"), dict):
            raise VerificationError("changeset upsert must contain a record")
        key = (item.get("collection"), item.get("path"))
        if not all(isinstance(value, str) for value in key):
            raise VerificationError("changeset upsert has an invalid collection or path")
        grouped[key].append(item["record"])

    manifest = load_json(package / "package.json")
    expected_model: list[dict[str, str]] = []
    record_count = 0
    for shard in shards:
        if not isinstance(shard, dict):
            raise VerificationError("changeset shard must be an object")
        collection, relative = shard.get("collection"), shard.get("path")
        if not isinstance(collection, str) or not isinstance(relative, str):
            raise VerificationError("changeset shard has invalid identity")
        records = grouped.pop((collection, relative), [])
        record_count += len(records)
        path = safe_child(package, relative)
        if load_json(path) != {"collection": collection, "records": records}:
            raise VerificationError(f"shard does not reproduce from authoring: {relative}")
        expected_model.append(
            {"collection": collection, "path": relative, "sha256": digest(path)}
        )
    if grouped:
        raise VerificationError("upserts exist outside declared shards")

    for key in ("packageId", "packageVersion", "readingProfile"):
        if manifest.get(key) != changeset.get(key):
            raise VerificationError(f"manifest {key} differs from authoring")
    if manifest.get("model") != expected_model:
        raise VerificationError("manifest shard ledger or hashes do not reproduce")
    if manifest.get("formatVersion") != "1.0":
        raise VerificationError("unsupported package formatVersion")

    expected_files = {"package.json", *(item["path"] for item in expected_model)}
    actual_files: set[str] = set()
    for path in package.rglob("*"):
        if path.is_symlink():
            raise VerificationError(f"package contains a symlink: {path.relative_to(package)}")
        if path.is_file():
            actual_files.add(path.relative_to(package).as_posix())
    if actual_files != expected_files:
        raise VerificationError("package file set differs from its manifest")

    return {
        "fingerprint": package_fingerprint(package),
        "packageId": manifest["packageId"],
        "packageVersion": manifest["packageVersion"],
        "recordCount": record_count,
        "shardCount": len(expected_model),
    }


def semantic_snapshot(
    audit_path: pathlib.Path,
    evidence_path: pathlib.Path,
    baseline_path: pathlib.Path,
    public: dict[str, Any],
) -> dict[str, Any]:
    audit = load_json(audit_path)
    evidence = load_json(evidence_path)
    baseline = load_json(baseline_path)
    if evidence.get("schemaVersion") != EVIDENCE_SCHEMA:
        raise VerificationError(f"evidence must use {EVIDENCE_SCHEMA}")
    if evidence.get("officialAuditSha256") != digest(audit_path):
        raise VerificationError("official audit digest differs from reviewed evidence")
    if evidence.get("packageFingerprint") != public["fingerprint"]:
        raise VerificationError("package changed without refreshed official evidence")

    # `officialAuditSource` is printed verbatim into the published review and was
    # validated by nothing at all, so it went stale without a single check going
    # red: it attributed an audit produced by the FIXED tooling to the revision
    # that emitted a client's package name into every report it wrote.
    #
    # What this CI can check and what it cannot are different things, and the
    # difference is stated rather than papered over. It cannot resolve the
    # revision — the tooling repository is private and this workflow holds no
    # credential for it, which is the whole point of the evidence boundary. It
    # CAN refuse a value that is not one commit, and it can check the thing the
    # stale attribution was concealing: whether the published artifact carries a
    # private subject's name. That second half is the class of defect, not the
    # instance.
    source = evidence.get("officialAuditSource")
    if not isinstance(source, str) or not AUDIT_SOURCE.match(source):
        raise VerificationError(
            f"officialAuditSource must be owner/repo@<40-hex sha> naming one "
            f"commit, and is {source!r}")
    audit_text = audit_path.read_text(encoding="utf-8").lower()
    named = sorted(word for word in PRIVATE_SUBJECTS if word in audit_text)
    if named:
        raise VerificationError(
            f"the published audit names {', '.join(named)}: a private subject's "
            f"name reached a file this repository serves, and the revision this "
            f"evidence attributes it to cannot be checked from here")

    report, status = audit.get("report", {}), audit.get("status", {})
    if report.get("packageId") != public["packageId"]:
        raise VerificationError("official audit packageId differs")
    if report.get("packageVersion") != public["packageVersion"]:
        raise VerificationError("official audit packageVersion differs")
    if status.get("recordCount") != public["recordCount"]:
        raise VerificationError("official audit record count differs")

    score = report.get("score", {})
    gates = report.get("gates", [])
    unchecked = sorted(score.get("uncheckedGates", []))
    deferred = sorted(
        item["code"] for item in status.get("diagnostics", [])
        if item.get("severity") == "deferred" and isinstance(item.get("code"), str)
    )
    if baseline.get("uncheckedGates") != unchecked:
        raise VerificationError("unchecked gates differ from reviewed baseline")
    if baseline.get("deferredCodes") != deferred:
        raise VerificationError("deferrals differ from reviewed baseline")
    if score.get("failingGates") or report.get("ungatedErrors"):
        raise VerificationError("official snapshot contains a blocking result")
    return {"audit": audit, "deferred": deferred, "evidence": evidence, "gates": gates, "unchecked": unchecked}


def code_list(values: list[str]) -> str:
    return "<br>".join(f"`{value}`" for value in values) or "-"


def render_review(public: dict[str, Any], semantic: dict[str, Any]) -> str:
    audit = semantic["audit"]
    report, status = audit["report"], audit["status"]
    counts = collections.Counter(str(gate.get("verdict", "unknown")) for gate in semantic["gates"])
    evidence = semantic["evidence"]
    lines = [
        "# UIR public showcase review", "",
        "> [!NOTE]",
        "> **Accepted.** Public authoring reproduces every UIR shard exactly; "
        "manifest hashes match; and the package is bound to reviewed official evidence.",
        "", "| Public proof | Result |", "| --- | --- |",
        "| Authoring -> package | \u2705 Exact JSON reproduction |",
        f"| Manifest integrity | \u2705 {public['shardCount']} declared shards |",
        f"| Public package fingerprint | `{public['fingerprint']}` |",
        f"| Package | `{public['packageId']}` / `{public['packageVersion']}` |",
        f"| Records | {public['recordCount']} |", "",
        "## Official semantic evidence", "",
        "> [!IMPORTANT]",
        "> This action verifies that the package is still bound to a maintainer-generated "
        "official UIR audit. It does **not** claim to rerun the private alpha compiler. "
        "A package change must refresh this evidence through the Tenbytes maintainer workflow.",
        "",
        f"- Audit source: `{evidence['officialAuditSource']}` "
        f"(a maintainer assertion: the tooling repository is private, so this "
        f"workflow checks the shape of this revision and never resolves it)",
        f"- Reviewed at: `{evidence['reviewedAt']}`",
        f"- Runtime revision: `{status.get('revision', 'unknown')}`",
        "", "| Verdict | Gates |", "| --- | ---: |",
        f"| \u2705 Pass | {counts.get('pass', 0)} |",
        f"| Vacuous | {counts.get('vacuous', 0)} |",
        f"| \u26a0\ufe0f Unchecked | {counts.get('unchecked', 0)} |",
        f"| \u274c Fail | {counts.get('fail', 0)} |",
        f"| Ungated errors | {report.get('ungatedErrors', 0)} |",
        "", "### Declared limits", "",
        f"- Unchecked gates: {code_list(semantic['unchecked'])}",
        f"- Compiler deferrals: {code_list(semantic['deferred'])}",
        "", "## Context and board evidence", "",
        "| Context | Parts | Undecided | Layouts | Measures | Limitations | Conflicts |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for board in audit.get("boards", []):
        summary = board.get("summary", {})
        board_counts, targets = summary.get("counts", {}), summary.get("targetCounts", {})
        lines.append(
            f"| `{summary.get('contextId', 'unknown')}` | {board_counts.get('parts', 0)} "
            f"| {board_counts.get('partsUndecided', 0)} | {board_counts.get('layoutsDrawn', 0)} "
            f"| {board_counts.get('measuresDrawn', 0)} | {len(board.get('limitations', []))} "
            f"| {targets.get('decisionsThatConflictHere', 0)} |"
        )
    lines += ["", "<details>", "<summary>Full gate ledger</summary>", "",
              "| Gate | Verdict | Contract |", "| --- | --- | --- |"]
    icons = {"pass": "\u2705 Pass", "vacuous": "Vacuous", "unchecked": "\u26a0\ufe0f Unchecked", "fail": "\u274c Fail"}
    for gate in semantic["gates"]:
        verdict = str(gate.get("verdict", "unknown"))
        statement = " ".join(str(gate.get("statement", "")).split()).replace("|", "\\|")
        lines.append(f"| `{gate.get('gateId', 'unknown')}` | {icons.get(verdict, verdict)} | {statement} |")
    lines += ["", "</details>", "", "---", "",
              "_The attached official audit is the complete machine-readable evidence. "
              "Rendered-site checks run separately in this workflow._", ""]
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site-root", type=pathlib.Path, default=pathlib.Path("."))
    parser.add_argument("--author", type=pathlib.Path, default=pathlib.Path("uir/author_site.py"))
    parser.add_argument("--package", type=pathlib.Path, default=pathlib.Path("app/uir-package"))
    parser.add_argument("--baseline", type=pathlib.Path, default=pathlib.Path("uir/ci-baseline.json"))
    parser.add_argument("--evidence", type=pathlib.Path, default=pathlib.Path("uir/evidence.json"))
    parser.add_argument("--audit", type=pathlib.Path, default=pathlib.Path("uir/official-audit.json"))
    parser.add_argument("--review-output", type=pathlib.Path, default=pathlib.Path(".uir-ci/review.md"))
    args = parser.parse_args(argv)
    root = args.site_root.resolve()
    resolve = lambda path: path if path.is_absolute() else root / path
    review = resolve(args.review_output)
    review.parent.mkdir(parents=True, exist_ok=True)
    try:
        public = reproduce(root, resolve(args.author), resolve(args.package))
        semantic = semantic_snapshot(resolve(args.audit), resolve(args.evidence), resolve(args.baseline), public)
        review.write_text(render_review(public, semantic), encoding="utf-8")
    except VerificationError as exc:
        review.write_text(f"# UIR public showcase review\n\n> [!CAUTION]\n> **Blocked.** {exc}\n", encoding="utf-8")
        print(f"UIR public site CI failed: {exc}", file=sys.stderr)
        return 1
    print("UIR public site CI passed: " + json.dumps(public, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
