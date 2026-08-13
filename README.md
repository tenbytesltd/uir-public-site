# UIR public site

The public product site and living implementation showcase for UIR, created and
stewarded by Tenbytes Ltd.

The page is itself a UIR implementation. Its visible content, semantic
structure, design decisions, provenance, and explicit gaps live in one checked
UIR package. The React code is a generic renderer and inspector, not a second
content authority.

## What is public here

This repository makes the complete site proof inspectable:

- deterministic UIR authoring in `uir/author_site.py`;
- the checked package consumed by the application;
- the generic package-to-page renderer and self-inspector;
- a self-contained public CI verifier and readable GitHub Job Summary;
- the maintainer-generated official semantic audit and its exact evidence
  binding;
- the Flow 2 findings in `UIR-FLOW-REVIEW.md`.

The UIR core compiler is still private alpha software. Public CI therefore does
not pretend to rerun it. It proves authoring-to-package reproduction and binds
that exact package to the latest official maintainer audit.

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
the checked UIR package is under `app/uir-package/`.

## Verification

```bash
python3 tool/public_site_ci.py
npm run lint
npm test
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

## Updating the UIR package

Change `uir/author_site.py`, then rebuild the restricted public package:

```bash
python3 tool/build_public_package.py
python3 tool/public_site_ci.py
```

A package change intentionally blocks at the official-evidence boundary. A
Tenbytes maintainer must run the pinned core audit and refresh
`uir/official-audit.json` plus `uir/evidence.json`. This makes the private
trust boundary visible in review instead of hiding it behind CI credentials.

Do not edit emitted files under `app/uir-package/` by hand.

## Repository map

- `uir/author_site.py` - deterministic, versioned authoring source
- `uir/ci-baseline.json` - reviewed unchecked gates and compiler deferrals
- `uir/official-audit.json` - machine-readable maintainer audit
- `uir/evidence.json` - digest binding between audit and exact package
- `tool/build_public_package.py` - restricted public package builder
- `tool/public_site_ci.py` - independent public verifier and review renderer
- `app/uir-package/` - checked application authority
- `app/uir.tsx` - generic package-to-page renderer
- `app/Inspector.tsx` - inspector derived from the same package
- `tests/rendered-html.test.mjs` - rendered contract tests
- `UIR-FLOW-REVIEW.md` - Flow 2 findings and improvement proposals

## Collaboration and release policy

Anyone can read, fork, and propose a pull request. Direct write access remains
limited to Tenbytes members. The protected `main` branch requires the public
UIR/site check and disallows force-pushes and deletion.

Repository visibility and hosted-site access are separate controls. Making this
source public does not make the managed site preview publicly accessible.

## License

Apache License 2.0. See `LICENSE`.
