# UIR conformance loop

UIR is the complete machine-readable contract for a UI. The design system is part of that contract, not a separate input at verification time.

```text
approved design -----------\
                            > agent translation -> UIR package -> React implementation -> conformance gate
approved design system ----/
```

The UIR package contains both sides of the approved definition:

- interface facts: structure, content, roles, relationships, states, behaviour and conditions;
- design-system facts: design values, Pieces, role-to-Piece resolutions, bindings and constraints.

An implementation may be produced by a developer, an agent, a framework compiler, or any combination. The implementation mechanism is not authoritative. The checked UIR package is.

## Design and design-system translation

Two frozen source contracts live under `uir/source/`:

- `design.json` — the approved interface facts before target implementation;
- `design-system.json` — the approved design-system facts before target implementation.

Normal CI never regenerates these files. The source-to-UIR gate derives canonical views from the checked package and compares them exactly with the frozen sources. If translation omits, invents or changes an approved design or design-system decision, the gate fails at the differing path.

The current fixtures were bootstrapped once from the already approved package so this repository can dogfood the mechanism. A source adapter can replace that bootstrap with Figma, design-system code, Storybook or another authoritative source without changing the conformance model.

Determinism here does not mean an agent must produce byte-identical serialization on repeated runs. It means each approved source fact has one checkable interpretation in UIR and each implementation receives an exact pass/fail verdict against that package.

## Public React target

The public site is deliberately **not** the generic UIR renderer. The renderer is a designer-facing visualization surface; the production target is an explicit React application.

- `app/Site.tsx` owns the real product component tree: Header, Hero, Problem, Playground, status, footer and the rest of the page composition.
- `app/design-system.tsx` owns the concrete React Piece implementations.
- `app/uir-data.ts` is a read-only adapter over the checked UIR package for content, links, design values, bindings, motion and conformance metadata.
- `app/page.tsx` renders the React `PublicSite` entry point.

There is no recursive `RenderNode` and no role switch that manufactures the public page from UIR. React explicitly chooses the components and structure; those components read the facts they need from UIR.

Piece identity comes from the React design-system component that actually rendered, not from the Piece the verifier expects. Using `Paragraph` where UIR requires `Heading` therefore reports the paragraph role, Piece and bindings and fails conformance even if the two are made visually identical.

## Frontend conformance

`tool/uir_conformance.mjs` independently derives the expected target contract from the checked UIR package, inspects the rendered frontend and compares the complete target rather than a sample.

The web gate verifies:

- complete node set and depth-first structure;
- parent and sibling order;
- semantic roles and salience;
- leaf content;
- controls and internal destinations;
- exact Piece identity;
- exact Piece and node presentation bindings;
- resolved design-system presentation values;
- package-level theme bindings.

The target exposes stable conformance identities through `data-node`, role, Piece and binding metadata. Other platforms can expose equivalent identities through native testing or accessibility mechanisms.

This is not screenshot comparison. A target conforms when every fact expressed by UIR, including its embedded design system, is realized by the implementation. If an approved design decision cannot be expressed in UIR, that is a model gap and must be made explicit rather than hidden behind pixel-diff tolerance.

### What the gate does not cover, named rather than implied

**The document outline is the target's decision and UIR states none of it.** The Piece table pins `heading` to the outer `div`; the `<h1>`, `<h2>` and `<h3>` live inside it, and the observer strips inner tags before comparing text — so the level a heading renders at is chosen in `app/Site.tsx`, is absent from the package, and is invisible to every assertion above. Setting every `level={2}` to `level={1}` conforms.

Two things are done about it, and neither of them closes it:

- the half that IS derivable from the package is checked — every node the package gives role `heading` must render some heading element. That is what catches a component swap that keeps the role and drops the element, and it found one on this page the first time it ran: `brand` was a `heading` in UIR and rendered no heading element at all. The wordmark is a navigation label, so the Fact was corrected;
- the levels themselves are recorded in `tests/heading-outline.json` and compared exactly. That pins the target's own choice so it cannot change in silence. It is not a conformance check and is not counted as one — it holds the page against itself.

Closing it needs the outline expressed in UIR, which is a decision about the model and not about this page.

## Tests

The suite proves both the green path and that the gate actually rejects drift:

1. approved design + approved design system exactly match their UIR translation;
2. the complete React frontend conforms to UIR;
3. an intentional semantic mutation is rejected;
4. a wrong Piece is rejected even when appearance could match;
5. an intentional design-system realization mutation is rejected;
6. source-level tests prove Piece identity belongs to React design-system components rather than being copied from the expected UIR contract;
7. every node UIR calls a heading renders a heading element, at a recorded level.

**The Piece dimension of the gate cannot currently fail on its own.** Every Resolution in this package resolves to `uir-site:piece:<role>`, so the Piece table is the identity map and the Piece comparison can only fire where the role comparison already has. The mutation test edits the attribute string rather than swapping a component, which proves the attribute is compared and not that Piece selection is independently checked. The check starts earning its name the first time a role resolves to two Pieces; until then, role is the load-bearing half and this line says so.

Run the full site and conformance suite with:

```bash
npm test
```

To verify only the source translation contracts:

```bash
node tool/uir_conformance.mjs --verify-sources
```

`--snapshot-sources` is an explicit bootstrap/re-baselining operation and must not run in normal CI.

The loop this site now demonstrates is:

```text
design + design system -> UIR -> independently authored React target -> deterministic verdict
```
