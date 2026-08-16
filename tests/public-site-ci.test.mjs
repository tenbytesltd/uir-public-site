// `tool/public_site_ci.py` is the release-blocking guard of this repository —
// it is what stands between a private subject's name and a public deploy — and
// it was the one file here with no automated coverage at all. `npm test`,
// `npm run lint` and `npm run test:pages` executed none of it; the only thing
// that ran it was the CI step that runs it on real inputs, which by
// construction only ever exercises the passing path.
//
// So every guard in it had been verified the same way: by hand, once, and
// reported in a comment on the pull request. Eleven checked behaviours across
// four commits whose only record was prose — and the empirical record is that
// this file regresses in exactly the ways those comments describe. Nothing
// failed if the lookbehind went back to a prefix class, if `PUBLISHED` lost
// `tool`, if the README carve-out went back to a basename compare, or if the
// per-entry check reverted to an aggregate.
//
// Each case below is one mutation already performed by hand, run against a
// throwaway copy of the tree so the working copy is never touched. The green
// case is here too, because a suite of failures proves only that the tool can
// fail.
import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync,
  renameSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

// The copy used to be assembled from an INCLUDE list read out of the tool, and
// it inherited that list's defect exactly: `.github` was on neither side, so the
// directory that carried a client's repository name onto the open internet was
// neither scanned by the tool nor present in the tree these cases run against.
// A suite built from the same incomplete list as the thing it tests cannot find
// what the list left out.
//
// So the copy is now the REPOSITORY — and it is built from `git ls-files`, not
// from the tool's own exclude list. Reading that list here would make the oracle
// call the thing it tests: the fixture and the tool would agree about coverage
// by construction, including where both are wrong. What a repository publishes
// is what it TRACKS, git is the authority on that, and the two derivations are
// then independent. Where they disagree, the seeded case for that path fails
// and says so.
function trackedFiles() {
  const listed = spawnSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" });
  assert.equal(listed.status, 0,
    `this fixture builds its tree from git; \`git ls-files\` exited ${listed.status}`);
  const files = listed.stdout.split("\0").filter(Boolean);
  assert.ok(files.length > 20, `only ${files.length} tracked files — wrong tree?`);
  return files;
}

function checkout() {
  const where = mkdtempSync(join(tmpdir(), "uir-public-site-ci-"));
  for (const entry of trackedFiles()) {
    const target = join(where, entry);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(join(root, entry), target);
  }
  return where;
}

function verify(where) {
  const run = spawnSync("python3", ["tool/public_site_ci.py", "--site-root", where],
                        { cwd: root, encoding: "utf8" });
  return { code: run.status, said: `${run.stdout}${run.stderr}` };
}

function withCheckout(body) {
  const where = checkout();
  try {
    return body(where);
  } finally {
    rmSync(where, { recursive: true, force: true });
  }
}

// The digest binding fires before every check below it, so a mutation to the
// audit that does not refresh the digest is caught by the wrong guard and
// proves nothing about the right one. This is the maintainer's own path:
// regenerate, re-bind, and let the content checks speak.
function rebind(where) {
  const audit = join(where, "uir/official-audit.json");
  const evidence = join(where, "uir/evidence.json");
  const digest = spawnSync("python3",
    ["-c", "import hashlib,sys;print(hashlib.sha256(open(sys.argv[1],'rb').read()).hexdigest())",
     audit], { encoding: "utf8" }).stdout.trim();
  const parsed = JSON.parse(readFileSync(evidence, "utf8"));
  parsed.officialAuditSha256 = digest;
  writeFileSync(evidence, `${JSON.stringify(parsed, null, 2)}\n`);
}

// **A marker each file's own language accepts, and an assertion on the REASON.**
//
// `assert.equal(code, 1)` is satisfied by any non-zero exit, and `reproduce()`
// runs before the scan — so a marker that BREAKS a file counts as proof that
// the file is scanned. That was live: appending an HTML comment to
// `uir/author_site.py`, which opens with `from __future__` and is executed as a
// script, is a `SyntaxError`, the verifier exits 1 with `authoring program
// exited 1`, and the scan is never reached. Delete that entry from `PUBLISHED`
// and the derived loop loses its case with it while the requirements loop stays
// green on a broken tree.
//
// So the marker is chosen per language and the failure must name the scan.
function seedAndExpectRefusal(where, entry, why = "") {
  const seeded = `${["", "home", "somebody", "seeded"].join("/")} `
    + `@${["ex", "ams"].join("")}/ui`;
  // JSON carries no comments, and the sibling trick the first version used
  // meant the entry under test was never seeded at all — what failed was
  // whichever entry the sibling belonged to. `uir/evidence.json` is validated
  // for `officialAuditSource`'s shape and nothing else, so an extra member is a
  // real case for it.
  if (entry.endsWith(".json")) {
    const target = join(where, entry);
    const parsed = JSON.parse(readFileSync(target, "utf8"));
    writeFileSync(target, `${JSON.stringify({ ...parsed, note: seeded }, null, 2)}\n`);
    if (entry.endsWith("official-audit.json")) rebind(where);
  } else {
    // What is on DISK decides, not whether the name has a dot in it. The dot
    // rule read `.github` as a file and tried to open a directory — and the
    // directory it got wrong is the one this whole change exists for.
    const target = statSync(join(where, entry)).isDirectory()
      ? join(where, entry, "seeded-by-the-suite.md")
      : join(where, entry);
    const before = existsSync(target) ? readFileSync(target, "utf8") : "";
    const marker = target.endsWith(".py") ? `# ${seeded}`
      : target.endsWith(".mjs") || target.endsWith(".ts") || target.endsWith(".tsx")
        ? `// ${seeded}`
        : `<!-- ${seeded} -->`;
    writeFileSync(target, `${before}\n${marker}\n`);
  }
  const { code, said } = verify(where);
  const because = why ? ` — ${why}` : "";
  assert.equal(code, 1,
    `${entry} is not scanned${because}\n${said}`);
  assert.match(said,
    /carries an absolute path|token\(s\) this repository does not publish/,
    `${entry}: the run failed, but on something other than the scan${because}`
    + `\n${said}`);
}

test("the verifier passes over the tree as it stands", () => {
  withCheckout((where) => {
    const { code, said } = verify(where);
    assert.equal(code, 0, said);
    assert.match(said, /UIR public site CI passed/);
  });
});

test("a private subject's name in the published audit is refused", () => {
  withCheckout((where) => {
    const audit = join(where, "uir/official-audit.json");
    // Assembled rather than written, for the reason the constant it tests
    // holds digests rather than words: this file is scanned too.
    const token = ["ex", "ams"].join("");
    writeFileSync(audit, readFileSync(audit, "utf8").replace(
      '"package": "app/uir-package"', `"package": "app/uir-package", "note": "@${token}/ui"`));
    rebind(where);
    const { code, said } = verify(where);
    assert.equal(code, 1, said);
    assert.match(said, /token\(s\) this repository does not publish/);
    assert.doesNotMatch(said, new RegExp(token),
      "the failure message names the token it was written to keep unpublished");
  });
});

test("an absolute path in the audit's own package field is refused", () => {
  withCheckout((where) => {
    const audit = join(where, "uir/official-audit.json");
    writeFileSync(audit, readFileSync(audit, "utf8").replace(
      '"root": "app/uir-package"', `"root": "${["", "home", "somebody", "app"].join("/")}"`));
    rebind(where);
    const { code, said } = verify(where);
    assert.equal(code, 1, said);
    assert.match(said, /and not 'app\/uir-package'/);
  });
});

test("an absolute path in hand-authored source is refused", () => {
  // The category the leak actually landed in, and the one the first widening
  // of `PUBLISHED` left out: this is what `tool` and `uir/author_site.py` in
  // that tuple are for.
  withCheckout((where) => {
    const authored = join(where, "uir/author_site.py");
    // Appended, not prepended: this module opens with `from __future__`, which
    // must be the first statement, and a syntax error is caught by the
    // reproduction step rather than by the scan under test.
    writeFileSync(authored, `${readFileSync(authored, "utf8")}
WHERE = "${["", "home", "somebody", "tree"].join("/")}"
`);
    const { code, said } = verify(where);
    assert.equal(code, 1, said);
    assert.match(said, /author_site\.py carries an absolute path/);
  });
});

test("a path inside a code span is refused, which a prefix class did not catch", () => {
  // Four of the five paths this guard was written after sat in code spans, so
  // the character before them was a backtick and the prefix class declined.
  // They were found by reading and removed by hand while CI reported green.
  withCheckout((where) => {
    const document = join(where, "docs/CONFORMANCE.md");
    writeFileSync(document, `${readFileSync(document, "utf8")}
Checked out at \`${["", "home", "alice", "private-repo"].join("/")}\`.
`);
    const { code, said } = verify(where);
    assert.equal(code, 1, said);
    assert.match(said, /CONFORMANCE\.md carries an absolute path/);
  });
});

test("a path behind a URL scheme's doubled slash is refused", () => {
  // The one case a `/` in the exclusion class would have cost: the character
  // before the root segment is then a slash, and a scheme is a delimiter
  // rather than a path continuation.
  withCheckout((where) => {
    const document = join(where, "docs/CONFORMANCE.md");
    const url = `file://${["", "home", "alice", "out", "index.html"].join("/")}`;
    writeFileSync(document, `${readFileSync(document, "utf8")}\nOpen ${url}\n`);
    const { code, said } = verify(where);
    assert.equal(code, 1, said);
    assert.match(said, /CONFORMANCE\.md carries an absolute path/);
  });
});

test("a URL and a relative path that merely contain a root name are accepted", () => {
  // The other direction, and the reason the rule is a lookbehind rather than a
  // substring test: a guard that refuses everything is not a guard about paths.
  withCheckout((where) => {
    const document = join(where, "docs/CONFORMANCE.md");
    writeFileSync(document, `${readFileSync(document, "utf8")}
See https://example.com/opt/x and app/uir-package/var/y.
`);
    const { code, said } = verify(where);
    assert.equal(code, 0, said);
  });
});

test("a Windows path written plainly in Markdown is refused", () => {
  // The first version of the pattern required two literal backslashes, so it
  // saw the JSON-escaped spelling and not the one a document carries.
  withCheckout((where) => {
    const document = join(where, "docs/CONFORMANCE.md");
    // Assembled, like every other path in this file: `tests/` is one of the
    // directories the check reads, so a literal here fails the check on the
    // file that tests it. That has now happened five times in five commits to
    // `public_site_ci.py` and once here, which is the rule rather than the
    // accident: the only paths spelled out in either file are the ones that
    // must NOT match.
    const windows = `${"C"}:${"\\"}Users${"\\"}someone${"\\"}tree`;
    writeFileSync(document,
      `${readFileSync(document, "utf8")}\nBuilt at ${windows}\n`);
    const { code, said } = verify(where);
    assert.equal(code, 1, said);
    assert.match(said, /carries an absolute path/);
  });
});

test("the README carve-out belongs to the README and is not inherited by name", () => {
  withCheckout((where) => {
    writeFileSync(join(where, "docs/README.md"),
      `see ${["", "home", "somebody", "notes"].join("/")}\n`);
    const { code, said } = verify(where);
    assert.equal(code, 1, said);
    assert.match(said, /docs\/README\.md carries an absolute path/);
  });
});

test("an anchor this check names and cannot find is refused, one by one", () => {
  // Not in aggregate. The anchors answer one question — *am I rooted on the
  // right tree* — and a walk on the wrong root does something worse than the
  // include list did there: an include list that resolves nothing scans nothing
  // and prints `passed`, while a walk from `/` reads the filesystem. So the
  // anchors are checked BEFORE the walk, and a single missing one is enough.
  withCheckout((where) => {
    renameSync(join(where, "uir/evidence.json"), join(where, "uir/evidence-moved.json"));
    const { code, said } = verify(where);
    assert.equal(code, 1, said);
    assert.match(said, /are not under .*uir\/evidence\.json/);
  });
});

test("every top-level entry of the tree is actually scanned, one seeded path each", () => {
  // **Derived from the TREE, and that is the whole correction.** This case used
  // to iterate `PUBLISHED`, so a place missing from the constant was a place
  // missing from its own coverage test — the tautology this project has now
  // corrected three times. `.github` was never on the list, so nothing here ever
  // seeded it, and the directory that published a client's repository name was
  // reported as covered by a suite that had never looked at it.
  //
  // Iterating what is actually on disk cannot have that failure mode: a
  // directory added tomorrow is covered with no edit here, and a directory the
  // tool stops walking is a red test rather than a silent gap.
  //
  // BOTH a path and a denied token are seeded, because the two checks have
  // different scopes: the top-level README is deliberately exempt from the path
  // rule and is not exempt from the token rule, so seeding only a path would
  // report that entry as covering nothing when it covers half.
  const entries = [...new Set(trackedFiles().map((path) => path.split("/")[0]))];
  assert.ok(entries.length > 5, "the tree has too few entries for this to mean anything");
  for (const entry of entries) {
    withCheckout((where) => seedAndExpectRefusal(where, entry));
  }
});

// **What this repository REQUIRES to be scanned, stated here and not read out of
// the constant.** The test above iterates `publishedEntries()`, so dropping an
// entry from `PUBLISHED` drops the case that would have caught it — the same
// tautology this project has now corrected twice in its other repository, where
// an oracle called the function it was testing. This list is a requirement, and
// each line says why that place must be covered rather than that it happens to
// be listed today.
const MUST_BE_SCANNED = [
  ["tool", "where the identifier sat when this guard was written: "
         + "hand-authored source, the category the first widening left out"],
  ["uir/author_site.py", "where every word of the published page is authored"],
  ["app", "the target's own source, and the package it renders"],
  ["tests", "this file among them, and it seeds paths on purpose"],
  ["docs", "what the repository publishes about itself"],
  ["README.md", "the first page a reader of the repository sees"],
  ["UIR-FLOW-REVIEW.md", "the ledger, which carried five machine paths"],
  ["uir/official-audit.json", "the artifact the private tooling produces, and "
                            + "the one that carried a client's name twice"],
  ["uir/evidence.json", "the binding, which is published beside it and which "
                      + "nothing else in this suite reads for content"],
  [".github", "the directory the include list never named, and where a client's "
            + "repository name was published for seven hours on 2026-08-16 while "
            + "this tool ran on the commit and printed `passed`"],
  ["package.json", "the manifest, which sits at the root and belonged to no "
                 + "entry of the include list"],
];

test("the places this repository requires to be scanned are all covered", () => {
  for (const [entry, why] of MUST_BE_SCANNED) {
    withCheckout((where) => seedAndExpectRefusal(where, entry, why));
  }
});

test("the scan root is the site root and never wherever --audit happens to point", () => {
  // `--audit` two components deep is a default, not a rule. Rooting the scan on
  // it made a copied audit turn every content check into a no-op that reported
  // `passed`; measured both ways at the time, and this is that measurement kept.
  withCheckout((where) => {
    const elsewhere = mkdtempSync(join(tmpdir(), "uir-audit-"));
    try {
      const copy = join(elsewhere, "official-audit.json");
      cpSync(join(where, "uir/official-audit.json"), copy);
      const document = join(where, "docs/CONFORMANCE.md");
      writeFileSync(document, `${readFileSync(document, "utf8")}
Produced at ${["", "home", "somebody", "tree"].join("/")}
`);
      const run = spawnSync("python3",
        ["tool/public_site_ci.py", "--site-root", where, "--audit", copy],
        { cwd: root, encoding: "utf8" });
      const said = `${run.stdout}${run.stderr}`;
      assert.equal(run.status, 1, `the audit moved out of the tree and the scan `
        + `stopped covering it\n${said}`);
      assert.match(said, /CONFORMANCE\.md carries an absolute path/);
    } finally {
      rmSync(elsewhere, { recursive: true, force: true });
    }
  });
});

test("every ANCHOR is present in the tree the scan is rooted on", () => {
  // What is left of the old "every entry of PUBLISHED is present" case. That
  // list did two jobs — it bounded the scan and it caught a wrong root — and
  // this half is the one a walk still needs: an anchor that names nothing is a
  // wrong-root guard that has stopped guarding.
  const source = readFileSync(join(root, "tool/public_site_ci.py"), "utf8");
  const block = source.match(/ANCHORS = \(([^)]*)\)/s);
  assert.ok(block, "ANCHORS is not a literal tuple any more; this fixture reads it");
  const anchors = [...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  assert.ok(anchors.length, "an empty anchor set refuses nothing");
  withCheckout((where) => {
    for (const entry of anchors) {
      assert.ok(existsSync(join(where, entry)),
        `ANCHORS names ${entry}, which is not in this tree`);
    }
  });
});

test("a denied token in a file's NAME is refused, and the refusal does not repeat it", () => {
  // The include list never looked at a file name, only at bytes it could
  // decode — so `<denied>-report.png` was published under a name that states
  // the subject, past a guard that opened it, failed to decode it, and moved
  // on. A name is as published as a body.
  withCheckout((where) => {
    const token = ["ex", "ams"].join("");
    writeFileSync(join(where, "docs", `${token}-notes.md`), "nothing in the body\n");
    const { code, said } = verify(where);
    assert.equal(code, 1, `a denied token in a path is not refused\n${said}`);
    assert.match(said, /a published file's own PATH carries 1 token/, said);
    // The guard must not become the leak. This is the defect the literal
    // denylist had, one level out: a CI log on a public repository is published
    // too, and printing the offending path to explain the refusal writes the
    // denied word into it.
    assert.ok(!said.includes(token),
      "the refusal printed the denied token back into a public CI log");
    assert.match(said, /<denied>-notes\.md/, said);
  });
});

test("officialAuditSource must name one commit and is never resolved here", () => {
  withCheckout((where) => {
    const evidence = join(where, "uir/evidence.json");
    const parsed = JSON.parse(readFileSync(evidence, "utf8"));
    const [owner, sha] = parsed.officialAuditSource.split("@");
    assert.equal(sha.length, 40, "a short sha is ambiguous over a repository's lifetime");
    writeFileSync(evidence, JSON.stringify(
      { ...parsed, officialAuditSource: `${owner}@${sha.slice(0, 7)}` }, null, 2) + "\n");
    const { code, said } = verify(where);
    assert.equal(code, 1, said);
    assert.match(said, /must be owner\/repo@<40-hex sha>/);
  });
});
