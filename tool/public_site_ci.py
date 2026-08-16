#!/usr/bin/env python3
"""Verify and explain the public boundary of the UIR showcase site."""

from __future__ import annotations

import argparse
import collections
import hashlib
import json
import os
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

#: **A denylist of literal words cannot live in this repository, and the first
#: version of this block put two of them here.**  The words in question are a
#: private subject's, the repository is public, merging deploys — so a check
#: written to keep an identifier out of a generated artifact wrote it into
#: hand-authored source, under a docstring saying what it was.  Before that
#: commit the working tree held zero occurrences; after it, exactly one, and it
#: was the guard.
#:
#: So the tokens are stored as `sha256(token)`.  The check ships and the word
#: does not, and a reader of this file learns nothing they did not bring.
BANNED_TOKENS = frozenset({
    "d6bd4331946ce8fac2f0df73692714005873ab45cc9e4bf2c60b8c42b29531eb",
    "b91e031bb81b33d55d202906c9766dc1b058e75694ec56e21e4fca0e47b16674",
})

#: What the audit may say a package is.  An ALLOWLIST, because the instance this
#: exists for was the `package` field carrying an absolute path on the machine
#: the private tooling ran on rather than this relative one, and a list of the
#: two words that leaked would never have caught it.
PACKAGE_PATH = "app/uir-package"

#: A path outside this repository, in any string a published file carries. This
#: is the half that catches a subject nobody has thought of yet, which a fixed
#: set of hashed words by definition cannot.
#:
#: **Assembled from the directory names rather than written out**, for the same
#: reason the tokens above are digests: this file is one of the files the scan
#: reads, and a pattern spelled out IS an absolute path from outside this
#: repository. The first version failed on itself the moment the scan was
#: widened to cover hand-authored source — the third time in three commits that
#: a guard could not survive its own rule, and the reason the widening was worth
#: doing rather than an argument against it.
#:
#: **A LOOKBEHIND and not a prefix class**, which is what caught one of the five
#: paths this check was written after and left four.  The class was
#: `[\s"'(=]` — good for JSON, where a quote precedes the value, and blind to
#: how Markdown writes a path.  Four of those five were list items whose path
#: sat inside a CODE SPAN, so the character before it was a backtick and the
#: class did not match; they were found by reading and removed by hand while the
#: guard reported green over them.  (Naming that shape with an example here is
#: what the fourth attempt at this constant did, and this file is scanned: the
#: example was itself an absolute path from outside this repository.)
#:
#: What the class was reaching for is "not a path continuation", so that is what
#: is asked.  `https://example.com/opt/x` and `app/uir-package/var/y` still
#: decline, because a LETTER precedes the segment in both — which is why `/` is
#: NOT in the excluded set.  Putting it there buys neither of those two and
#: costs the URL spelling that carries a doubled slash before the root segment:
#: the character before it is then a slash, and a URL scheme is a delimiter
#: rather than a path continuation.  Not hypothetical here —
#: `tool/uir_conformance.mjs` already builds such a URL from a local path, so
#: the resolved spelling is one README line away from a scanned file.
#:
#: **No example in this file spells one out, and that is a rule rather than a
#: style.**  Five commits in a row put an illustrative path into a comment here
#: and the check failed on itself each time, because this file is one of the
#: files it reads and the illustration IS the thing being detected.  The
#: examples that stay are the ones that must NOT match.
#:
#: The trailing `?` on the backslash because both spellings reach a published
#: file: a Markdown document carries a Windows path as written, JSON carries it
#: escaped, and requiring two backslashes saw only the JSON half.
OUTSIDE_ROOTS = ("home", "Users", "root", "var", "mnt", "srv", "opt")
OUTSIDE_ROOT = re.compile(
    r"(?<![A-Za-z0-9_.\-])(?:"
    + "|".join("/" + name + "/" for name in OUTSIDE_ROOTS)
    + r"|[A-Za-z]:\\\\?)")

#: **What the scan skips.**  The third shape this decision has had, and the
#: first that is not a list somebody has to keep complete.
#:
#: It was an include list — `README.md`, `docs`, `app`, `tool`, `tests` — under a
#: docstring reading *"everything this repository publishes, which is every
#: tracked file"*.  It was not.  `.github` was never on it, and on 2026-08-16 at
#: 07:38 UTC a client's repository name was merged into
#: `.github/workflows/claude-review.yml` and published, ten times, with two of
#: that client's pull request numbers and a `file:line` from it.  This tool ran
#: on that commit and printed `passed`.  It was never pointed at the directory.
#:
#: An include list is the shape the focus file calls *a hand-written list of
#: places that must be complete*, and this is its fifth instance in the project.
#: The two shapes fail in opposite directions and only one of them is survivable:
#: a forgotten include is a file published unaudited and nothing says so, while a
#: forgotten exclude is a build directory read for nothing and the run is slower.
#:
#: So the scan is now the repository, and what it skips is READ OUT OF
#: `.gitignore` rather than restated here.  A second hand-written list would have
#: been the same defect wearing the opposite sign: this repository already states
#: what it does not carry, in a file it maintains for other reasons, and a copy
#: of that statement is a copy that goes stale.  The tool's OWN output directory
#: is the proof — `/.uir-ci/` is written by this very run, into the scan root,
#: and the first exclude list written by hand did not have it.
#:
#: `.git` is the floor, because `.gitignore` never lists it.
ALWAYS_SKIPPED = frozenset({".git"})

#: Files whose ABSENCE means the scan root is wrong, not that the repository is
#: clean.  `--audit /tmp/a.json` over a byte-identical copy once made the scan
#: root `/`, where nothing resolved: the loop body never ran, every token and
#: path check was skipped, and the tool printed `passed`.  Finding nothing and
#: finding nothing wrong were the same outcome.
#:
#: Deliberately SHORT, and shorter than the list it replaces.  The old list did
#: two jobs — it bounded the scan and it caught a wrong root — so every rename
#: under it silently narrowed coverage and the existence check was the only thing
#: standing between that and a green run.  A walk cannot be narrowed by a rename,
#: so this half only has to answer *am I looking at the right tree*, and four
#: files answer that as well as nine.
ANCHORS = ("uir/official-audit.json", "uir/evidence.json", "README.md",
           "tool/public_site_ci.py")


def word_tokens(text: str) -> set[str]:
    """The lowercased words of a text, split on anything that is not one.

    Split rather than matched, so a token is found wherever it is embedded: as a
    scoped package name, as a hyphenated file name, and inside an absolute path.
    A word-boundary regex that excludes the hyphen misses every hyphenated
    continuation, which is the mistake the private tooling made in its own copy
    of this audit and corrected by putting one matcher beside the words.
    """
    return {token for token in re.split(r"[^a-z0-9]+", text.lower()) if token}


def banned_tokens_in(text: str) -> int:
    """How many denied tokens this text carries.  The count, never the token."""
    return sum(1 for token in word_tokens(text)
               if hashlib.sha256(token.encode("utf-8")).hexdigest() in BANNED_TOKENS)


def redacted(text: str) -> str:
    """`text` with every denied token replaced, so a refusal can name WHERE
    without republishing WHAT.

    The refusal for a file's CONTENT can print a count and stop, because the
    path already says where to look.  The refusal for a file's NAME cannot: the
    name IS the finding, and printing it writes the denied word into a CI log
    that is public on a public repository — the guard leaking the thing it
    guards, which is how the literal denylist this check replaced went wrong.
    """
    return re.sub(
        r"[A-Za-z0-9]+",
        lambda match: ("<denied>" if hashlib.sha256(
            match.group(0).lower().encode("utf-8")).hexdigest() in BANNED_TOKENS
            else match.group(0)),
        text)


def not_published(root: pathlib.Path) -> tuple[frozenset[str], frozenset[str]]:
    """The names this repository declares it does not carry, read out of its own
    `.gitignore`, split by the DEPTH git gives them.

    Returns `(anywhere, at_root_only)`.

    Only the unambiguous half of that file is used: an entry naming ONE
    component, with no `/` inside it and no glob character, is a name this walk
    can prune.  `.yarn/*`, `*.pem` and `!.yarn/patches` are left to git, because
    a half-understood pattern that prunes too much is a directory silently
    dropped from the audit — the failure this whole change is undoing.

    **A LEADING SLASH IS AN ANCHOR, not punctuation to strip.**  The first
    version wrote `entry.strip("/")` and put every survivor in one set, so the
    twelve root-anchored entries in this repository's `.gitignore` — `/dist/`,
    `/out/`, `/work/`, `/coverage`, `/outputs/` and the rest — pruned at EVERY
    depth.  A tracked `examples/d1/dist/bundle.js` is listed by `git ls-files`,
    because `/dist/` matches the root and nothing else; the walk skipped it, its
    bytes were never read and its path was never tokenised, and the tool printed
    `passed` over a published file it had not opened.

    That is this commit's own failure with the sign flipped, and it is what the
    paragraph above claims to have avoided — the reasoning there covers globs and
    embedded slashes, and the anchor is a third ambiguity that was stripped
    rather than declined.  Declining it wholesale would have been safe; widening
    it was not.

    A `.gitignore` that is missing or says nothing leaves the floor, and the walk
    reads more than it needs to.  That is the correct direction to fail in: slow
    and complete, never fast and partial.
    """
    anywhere = set(ALWAYS_SKIPPED)
    at_root_only: set[str] = set()
    try:
        declared = (root / ".gitignore").read_text(encoding="utf-8")
    except OSError:
        return frozenset(anywhere), frozenset(at_root_only)
    for line in declared.splitlines():
        entry = line.strip()
        if not entry or entry.startswith("#") or entry.startswith("!"):
            continue
        anchored = entry.startswith("/")
        entry = entry.strip("/")
        if not entry or "/" in entry or any(c in entry for c in "*?[]"):
            continue
        (at_root_only if anchored else anywhere).add(entry)
    return frozenset(anywhere), frozenset(at_root_only)


def published_files(root: pathlib.Path) -> list[pathlib.Path]:
    """Every file under `root` that is not part of a checkout rather than a
    publication.

    `os.walk` with the subdirectory list pruned IN PLACE, not `rglob` with a
    filter after it: `rglob("*")` descends into `.git` and `node_modules` in full
    before anything gets to reject them, which on this repository is the
    difference between reading a few hundred files and reading a few hundred
    thousand.

    The root-anchored half of `.gitignore` is applied ONLY at the root, which is
    what the anchor means.  Applying it everywhere skipped a tracked
    `examples/…/dist/` and reported `passed` over a file it had not opened.
    """
    anywhere, at_root_only = not_published(root)
    found: list[pathlib.Path] = []
    for directory, subdirectories, names in os.walk(root):
        here = pathlib.Path(directory)
        skipped = anywhere | at_root_only if here == root else anywhere
        subdirectories[:] = sorted(name for name in subdirectories
                                   if name not in skipped)
        found.extend(pathlib.Path(directory) / name
                     for name in sorted(names) if name not in skipped)
    return found


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
    root: pathlib.Path,
) -> dict[str, Any]:
    # FIRST, before anything reads a file. The anchors answer *am I rooted on
    # the right tree*, and every check below assumes that answer. Asked after
    # the loads, a wrong root is reported as a missing JSON file — true, and the
    # wrong diagnosis: the operator goes looking for a deleted artifact instead
    # of a mis-set `--site-root`. It also matters more than it did under the
    # include list, where a wrong root scanned nothing; the walk below a wrong
    # root reads whatever is there.
    missing = [entry for entry in ANCHORS if not (root / entry).exists()]
    if missing:
        raise VerificationError(
            f"artifacts this check is written to read are not under {root}: "
            f"{', '.join(missing)} — a scan that covers nothing and a scan that "
            f"covers everything and finds nothing are not the same answer")
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
    # The ALLOWLIST first, because it is the half that catches a subject nobody
    # has listed: the instance was the `package` field carrying an absolute path
    # rooted on the machine the private tooling ran on.
    for field, value in (("package", audit.get("package")),
                         ("report.root", audit.get("report", {}).get("root"))):
        if value != PACKAGE_PATH:
            raise VerificationError(
                f"the published audit states {field} as {value!r} and not "
                f"{PACKAGE_PATH!r}: an audit that names where it was produced "
                f"names the machine that produced it")
    # `root`, and NOT `audit_path.parent.parent`. The two coincide only because
    # `--audit` defaults to a path exactly two components deep, and nothing
    # enforces that: `--audit /tmp/a.json` over a byte-identical copy made the
    # scan root `/`. On the include list that emptied the scan; on a walk it does
    # something worse and quieter — it reads the whole filesystem. The anchors at
    # the top of this function are what refuse it, before any of that happens.
    scanned = published_files(root)
    if not scanned:
        raise VerificationError(
            f"the walk of {root} found no file to read, which is not a clean "
            f"repository and is not a result")
    undecodable = 0
    for path in scanned:
        # The NAME first, and for EVERY file including the ones no decoder will
        # open. A file is published under its path as much as under its bytes,
        # so a file named `<subject>-report.png` states the subject whether or
        # not anything can read the image — and under the include list nothing
        # looked at a file name at all.
        #
        # The illustration is a PLACEHOLDER, and that is the rule this file
        # already carries: it is scanned by the check it defines, so spelling an
        # example out makes the example the finding. Written the other way here
        # first, and caught on the first run by the very check being added.
        relative = path.relative_to(root).as_posix()
        named = banned_tokens_in(relative)
        if named:
            raise VerificationError(
                f"a published file's own PATH carries {named} token(s) this "
                f"repository does not publish: {redacted(relative)}")
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            undecodable += 1
            continue
        outside = OUTSIDE_ROOT.search(text)
        # Scoped to the file meant, not to every `README.md` anywhere below the
        # root: a basename carve-out is inherited by any file added under
        # `docs/` or `app/uir-package/` with that name.
        if outside and path != root / "README.md":
            raise VerificationError(
                f"{path} carries an absolute path from outside this repository "
                f"({outside.group(0)!r}): a published artifact states "
                f"where it was produced")
        count = banned_tokens_in(text)
        if count:
            raise VerificationError(
                f"{path} carries {count} token(s) this repository does not "
                f"publish; the check holds their digests and not the words, so "
                f"compare against the private tooling's own audit list")

    # Stated, not implied. A file no decoder opens is read by its PATH and by
    # nothing else, and that is a narrower answer than the one the loop gives
    # for everything above it — so the count goes on stdout rather than letting
    # `passed` cover it. It is also the tell for a scan that walked the wrong
    # tree: a repository of a few hundred text files does not produce hundreds
    # of undecodable ones.
    print(f"Published boundary: {len(scanned)} file(s) walked from {root}, "
          f"of which {undecodable} were not decodable as UTF-8 and were read "
          f"by path alone")

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
        semantic = semantic_snapshot(resolve(args.audit), resolve(args.evidence),
                                     resolve(args.baseline), public, root)
        review.write_text(render_review(public, semantic), encoding="utf-8")
    except VerificationError as exc:
        review.write_text(f"# UIR public showcase review\n\n> [!CAUTION]\n> **Blocked.** {exc}\n", encoding="utf-8")
        print(f"UIR public site CI failed: {exc}", file=sys.stderr)
        return 1
    print("UIR public site CI passed: " + json.dumps(public, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
