# UIR public site

The public product site, living implementation showcase, and browser playground
for UIR, created and stewarded by Tenbytes Ltd.

The home page is itself a UIR implementation. Its visible content, semantic
structure, design decisions, provenance, and explicit gaps live in one checked
UIR package. The React code is a renderer and inspector, not a second content
authority.

## What is public here

This repository makes the complete site proof inspectable:

- deterministic UIR authoring in `uir/author_site.py`;
- the checked package consumed by the application;
- a shared UIR runtime used by the public renderer and Playground;
- the package-to-page renderer and self-inspector;
- the browser-based UIR Playground under `/playground/`;
- local folder and `.uir.zip` package testing;
- public URL/GitHub package loading and shareable remote deep links;
- semantic graph and semantic diff views;
- a self-contained public CI verifier and readable GitHub Job Summary;
- the maintainer-generated official semantic audit and its exact evidence
  binding;
- the Flow 2 findings in `UIR-FLOW-REVIEW.md`.

The UIR core compiler is still private alpha software. Public CI therefore does
not pretend to rerun it. It proves authoring-to-package reproduction and binds
that exact package to the latest official maintainer audit.

## UIR Playground

The Playground is a browser inspection and comparison tool for UIR packages.
Open the public site and choose **Playground**, or navigate to `/playground/`
while running the project locally.

The public Playground provides:

- a semantic structure tree with search and filters;
- synchronized tree, canvas, and inspector selection;
- Render, Semantics, Resolution, Provenance, and Gaps canvas modes;
- desktop and phone canvas widths;
- semantic, resolution, presentation, provenance, and raw-record inspection;
- package diagnostics for manifest discovery, referenced model collections, and
  SHA-256 ledger verification;
- local package-directory open and drag/drop;
- local `.uir.zip` open and drag/drop;
- public `package.json`, ZIP, and GitHub repository/tree/blob loading;
- shareable deep links for public remote packages;
- a deterministic semantic graph preview;
- semantic package diff with added, removed, changed, and unchanged nodes.

Local package files are read in browser memory and are never uploaded by the
Playground. Remote loading is intentionally separate: the browser fetches only
a URL the user explicitly enters (or a URL present in a shared deep link), and
the remote host must allow CORS. No account, backend, storage service, or upload
endpoint is required.

For comparing two custom versions, load version A, choose **Set baseline**, then
load version B and open **diff**. The bundled example can also remain the
baseline while a custom package is loaded.

`.uir.zip` parsing is dependency-free in the browser. The loader supports normal
stored/deflated ZIP entries, rejects encrypted/ZIP64 archives, blocks unsafe
parent-directory paths, and caps archive entry count and expanded size before
passing files to the same manifest/SHA-256 package loader used for directories.

The bundled example is the same checked UIR package that renders the public
site. Playground diagnostics are inspection diagnostics; they are not presented
as the official UIR core audit.

## Requirements

- Node.js 22
- Python 3.12

No private repository access or Tenbytes credential is required to build,
inspect, or verify the public boundary.

## Local development

```bash
npm ci
npm run dev
```

The development server prints its local URL. The application is under `app/`;
the checked UIR package is under `app/uir-package/`; the Playground is under
`app/playground/`.

## Verification

```bash
python3 tool/public_site_ci.py
npm run lint
npm test
npm run test:pages
```

The public verifier:

1. runs the versioned authoring program;
2. reproduces and compares every UIR model shard;
3. verifies the package manifest file set and SHA-256 ledger;
4. proves the package is unchanged from the reviewed official audit;
5. checks the declared unchecked-gate and deferral boundary;
6. publishes a readable review in the GitHub Job Summary.

CI retains the Markdown review, official audit, and evidence binding together.
It uses exact ledgers and does not invent a quality percentage.

The browser Playground performs package diagnostics for packages opened by the
user. Those diagnostics are not presented as the official UIR core audit.

## Updating the UIR package

Change `uir/author_site.py`, then rebuild the restricted public package:

```bash
python3 tool/build_public_package.py
python3 tool/public_site_ci.py
```

A package change intentionally blocks at the official-evidence boundary. A
Tenbytes maintainer must run the pinned core audit and refresh
`uir/official-audit.json` plus `uir/evidence.json`. This makes the private trust
boundary visible in review instead of hiding it behind CI credentials.

Do not edit emitted files under `app/uir-package/` by hand.

## Repository map

- `uir/author_site.py` - deterministic, versioned authoring source
- `uir/ci-baseline.json` - reviewed unchecked gates and compiler deferrals
- `uir/official-audit.json` - machine-readable maintainer audit
- `uir/evidence.json` - digest binding between audit and exact package
- `tool/build_public_package.py` - restricted public package builder
- `tool/public_site_ci.py` - independent public verifier and review renderer
- `app/uir-package/` - checked application authority
- `app/playground/runtime.ts` - generic UIR record/query/resolution runtime
- `app/playground/package-loader.ts` - local browser package loading and hashes
- `app/playground/source-layer.ts` - ZIP and explicit public remote/GitHub sources
- `app/playground/semantic-diff.ts` - package-to-package semantic node diff
- `app/playground/Playground.tsx` - core Playground workspace and inspector
- `app/playground/PlaygroundLab.tsx` - custom source, graph, diff, and deep-link shell
- `app/uir.tsx` - public-site view built on the shared runtime
- `app/Inspector.tsx` - lightweight live inspector for the public page
- `tests/rendered-html.test.mjs` - rendered contract tests
- `tests/playground-custom.test.mjs` - custom package source boundary tests
- `tests/pages-export.test.mjs` - static deployment contract tests
- `UIR-FLOW-REVIEW.md` - Flow 2 findings and improvement proposals

## Deployment

The verified static export is published from protected `main` to GitHub Pages.
The public site and Playground are deployed together from the same verified
artifact.

Pull requests run the same UIR evidence review, rendered-output tests, custom
Playground contract tests, and Pages export tests without deploying. A
production deployment starts only after the required check succeeds on `main`.

## Collaboration and release policy

Anyone can read, fork, and propose a pull request. Direct write access remains
limited to Tenbytes members. The protected `main` branch requires the public
UIR/site check and disallows force-pushes and deletion.

The repository and GitHub Pages production site are public. The site contains
no application authentication layer; publishing authority remains limited to
the protected `main` branch and its required check.

## License

Apache License 2.0. See `LICENSE`.
