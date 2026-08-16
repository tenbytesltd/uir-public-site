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
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, renameSync,
  writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

// What a copy needs for the verifier to reach the checks under test: the
// authoring program and the package it reproduces, the evidence pair, and every
// entry of `PUBLISHED`. Derived from that constant rather than listed, so an
// entry added there without a copy here fails loudly on the FIRST case instead
// of silently narrowing every one of them.
function publishedEntries() {
  const source = readFileSync(join(root, "tool/public_site_ci.py"), "utf8");
  const block = source.match(/PUBLISHED = \(([^)]*)\)/s);
  assert.ok(block, "PUBLISHED is not a literal tuple any more; this fixture reads it");
  return [...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

const NEEDED = ["uir", "app", "tool", "tests", "docs", "package.json",
                "README.md", "UIR-FLOW-REVIEW.md"];

function checkout() {
  const where = mkdtempSync(join(tmpdir(), "uir-public-site-ci-"));
  for (const entry of new Set([...NEEDED, ...publishedEntries().map((e) => e.split("/")[0])])) {
    try {
      cpSync(join(root, entry), join(where, entry), { recursive: true });
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
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

test("an entry this check names and cannot find is refused, one by one", () => {
  // Not in aggregate: a single stale entry contributes no files and says
  // nothing while the others keep the scan non-empty, so the tool would print
  // `passed` over a narrower scan than `PUBLISHED` claims.
  withCheckout((where) => {
    renameSync(join(where, "docs"), join(where, "docs-moved"));
    const { code, said } = verify(where);
    assert.equal(code, 1, said);
    assert.match(said, /are not under .*: docs\b/);
  });
});

test("every entry of PUBLISHED is actually scanned, one seeded path each", () => {
  // **Derived from the constant, not one case per directory somebody
  // remembered.** Dropping `tool` from `PUBLISHED` failed nothing before this
  // test existed — and `tool/public_site_ci.py` is where the identifier sat
  // when this whole guard was written, so that entry is the one with the
  // history. A case per entry means an entry added tomorrow is covered without
  // an edit here, and an entry removed is a red test rather than a silent gap.
  // BOTH a path and a denied token, because the two checks have different
  // scopes: the top-level README is deliberately exempt from the path rule and
  // is not exempt from the token rule, so seeding only a path would report that
  // entry as covering nothing when it covers half.
  const seeded = `${["", "home", "somebody", "seeded"].join("/")} @${["ex", "ams"].join("")}/ui`;
  for (const entry of publishedEntries()) {
    withCheckout((where) => {
      const target = existsSync(join(where, entry)) && !entry.includes(".")
        ? join(where, entry, "seeded-by-the-suite.md")
        : join(where, entry);
      const before = existsSync(target) ? readFileSync(target, "utf8") : "";
      // Appended so a Python module stays parseable and a JSON artifact does
      // not: for the two files that must stay valid, the marker goes in a
      // sibling of the directory they live in instead.
      if (entry.endsWith(".json")) {
        writeFileSync(join(where, "docs", "seeded-by-the-suite.md"), seeded);
        const { code } = verify(where);
        assert.equal(code, 1, `${entry}: a JSON entry cannot carry a comment; `
          + `the sibling case stands in and must still fail`);
        return;
      }
      writeFileSync(target, `${before}\n<!-- ${seeded} -->\n`);
      const { code, said } = verify(where);
      assert.equal(code, 1,
        `PUBLISHED names ${entry} and a path seeded there was not found: `
        + `that entry covers nothing\n${said}`);
    });
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
];

test("the places this repository requires to be scanned are all covered", () => {
  const seeded = `${["", "home", "somebody", "required"].join("/")} `
    + `@${["ex", "ams"].join("")}/ui`;
  for (const [entry, why] of MUST_BE_SCANNED) {
    withCheckout((where) => {
      const target = entry.includes(".")
        ? join(where, entry)
        : join(where, entry, "seeded-by-the-suite.md");
      const before = existsSync(target) ? readFileSync(target, "utf8") : "";
      writeFileSync(target, `${before}\n<!-- ${seeded} -->\n`);
      const { code, said } = verify(where);
      assert.equal(code, 1,
        `${entry} is not scanned, and it must be — ${why}\n${said}`);
    });
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

test("every entry of PUBLISHED is present in the tree it is written for", () => {
  // The constant is a hand-written list of places that must be complete, and
  // this is the cheapest half of keeping it honest: an entry that names
  // nothing here is one that covers nothing in CI either.
  withCheckout((where) => {
    for (const entry of publishedEntries()) {
      assert.ok(existsSync(join(where, entry)),
        `PUBLISHED names ${entry}, which is not in this tree`);
    }
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
