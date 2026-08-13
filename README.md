# UIR public site

The product and adoption site for [UIR](https://github.com/tenbytesltd/uir),
created and stewarded by Tenbytes Ltd.

The page is itself a UIR implementation. Its visible content, semantic
structure, design decisions, provenance, and explicit gaps live in one checked
UIR package. The React code renders that package and adds an inspector; it is
not a second content authority.

## Requirements

- Node.js 22
- Python 3.12 for UIR authoring and verification
- Access to the private Tenbytes UIR repository when running the full package
  workflow

## Local development

```bash
npm ci
npm run dev
```

The development server prints its local URL. The main implementation is under
`app/`; the checked package is under `app/uir-package/`.

## Verification

Run the implementation checks:

```bash
npm run lint
npm test
```

`npm test` creates a production build and verifies the rendered HTML,
including the package identity, all rendered Nodes, creator provenance, and the
self-inspector boundary.

The repository CI additionally invokes the commit-pinned UIR action in
`.github/workflows/uir-site-ci.yml`. That action:

1. regenerates a candidate from `uir/author_site.py`;
2. checks it with the official UIR compiler;
3. byte-compares it with `app/uir-package/`;
4. runs the official UIR site audit;
5. rejects failing gates, ungated errors, or an unreviewed change to the
   unchecked/deferred boundary in `uir/ci-baseline.json`.

The resulting audit is retained as a CI artifact.

## Updating the UIR package

Do not edit emitted files under `app/uir-package/` by hand. Change the
versioned authoring source, build a checked candidate with the UIR tooling, and
activate that candidate through the official transport.

Assuming the UIR repository is checked out next to this one:

```bash
mkdir -p .uir-session

python3 uir/author_site.py \
  --output .uir-session/site.changeset.json

python3 ../uir/tool/compile_uir.py candidate \
  --changes .uir-session/site.changeset.json \
  --candidate app/.uir-package-candidate \
  --inputs-root .

python3 ../uir/tool/compile_uir.py activate \
  --candidate app/.uir-package-candidate \
  --target app/uir-package \
  --backup app/.uir-package-backup
```

Move the backup out of `app/` after verification. Before committing, run the
same site CI command locally or rely on the pull-request check.

## Repository map

- `uir/author_site.py` — deterministic, versioned authoring source
- `uir/ci-baseline.json` — reviewed unchecked gates and compiler deferrals
- `app/uir-package/` — checked application authority consumed at runtime
- `app/uir.tsx` — generic package-to-page renderer
- `app/Inspector.tsx` — inspector derived from the same package
- `tests/rendered-html.test.mjs` — rendered contract tests
- `UIR-FLOW-REVIEW.md` — Flow 2 findings and improvement proposals

## Release policy

The GitHub repository is private, organization forking is disabled, and write
access is limited to Tenbytes members. Releases are published only from a
committed package that passes the pinned UIR action and the implementation
checks.
