# UIR conformance loop

UIR is the complete machine-readable contract for a UI. The design system is part of that contract, not a separate input at verification time.

The intended loop is:

```text
approved design -----------\
                            > agent translation -> UIR package -> implementation -> conformance gate
approved design system ----/
```

The UIR package contains both sides of the approved definition:

- interface facts: structure, content, roles, relationships, states, behaviour and conditions;
- design-system facts: design values, Pieces, role-to-Piece resolutions, bindings and constraints.

An implementation may be produced by a developer, an agent, a framework compiler, or any combination. The implementation mechanism is not authoritative. The checked UIR package is.

## What is deterministic

Agent generation does not need to be byte-for-byte repeatable. The verdict does.

For this site, two frozen source contracts live under `uir/source/`:

- `design.json` — the approved interface facts before target implementation;
- `design-system.json` — the approved design-system facts before target implementation.

Normal CI never regenerates these files. The source-to-UIR gate derives the same canonical views from the checked UIR package and deep-compares them. If the agent omits, invents or changes a design or design-system decision, the gate fails with the exact path that differs.

The initial fixtures were bootstrapped once from the already approved package so this repository can dogfood the verifier. In a real adapter, these two contracts are produced from the actual design source and design-system source before the agent writes UIR.

## Frontend conformance

`tool/uir_conformance.mjs` independently derives the expected target contract from the checked package. It then inspects the rendered HTML and compares every UIR node, not a sample.

The web gate currently verifies:

- node count and depth-first structure;
- parent and sibling order;
- semantic role and salience;
- leaf content;
- control relationships and internal destinations;
- role-to-Piece resolution;
- Piece and node presentation bindings resolved through the UIR design system;
- concrete rendered CSS values for those bindings;
- package-level theme bindings.

The target keeps `data-node`, `data-role` and `data-salience` as stable conformance hooks. Other platforms can expose equivalent stable identities through their native test/accessibility mechanisms.

This is not screenshot comparison. A frontend conforms when every fact expressed by UIR, including its embedded design system, is realized by the target. If a design decision cannot be expressed in UIR, that is a model gap and must be made explicit rather than hidden behind a pixel-diff tolerance.

## Tests

`tests/uir-conformance.test.mjs` contains four gates:

1. approved design + approved design system exactly match the UIR translation;
2. the complete rendered frontend conforms to UIR;
3. an intentional semantic mutation is rejected;
4. an intentional design-system/style mutation is rejected.

Run them with the normal site test command:

```bash
npm test
```

To inspect only the source translation contract:

```bash
node tool/uir_conformance.mjs --verify-sources
```

`--snapshot-sources` is an explicit re-baselining/bootstrap operation and must not run in normal CI.


## Public target architecture

The public site is deliberately **not** the generic UIR renderer. The designer-facing
renderer is a visualization tool; the production target is a normal React component tree.

`app/Site.tsx` contains explicit product components and section composition. It reads
content and design facts from the checked UIR package through `app/uir-data.ts`, while
`app/design-system.tsx` owns the concrete React Piece implementations. Piece identity is
therefore reported by the component that actually rendered, not copied from the expected
contract. Using `Paragraph` where the UIR requires `Heading` produces the wrong role,
Piece and bindings and the conformance gate fails.

This is the target loop the public site demonstrates:

`design + design system → UIR → independently authored React target → deterministic verdict`
