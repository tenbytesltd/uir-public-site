# UIR Flow 2 Review — Public product page clean start

Status: live review ledger  
Started: 2026-08-13  
Scope: author a public UIR marketing page from current-session intent and explicitly allowed sources, then derive and publish the page without introducing a second product authority.

This document records the authoring experience, not the product. Product meaning belongs only in the active UIR package. Research notes, workflow friction, missing seams, proposed improvements, and test evidence belong here.

## Session allowlist

- The user's words in this conversation.
- `/home/kvelikov/uir` as the authoritative source of UIR product facts and the current compiler, checker, prototype, and gates.
- `/home/kvelikov/playbooks-uir/idea-to-uir/SKILL.md` as the current clean-start authoring procedure.
- `/home/kvelikov/playbooks-uir/design-system/` as explicitly selected generic design-system method, never as a source of product-specific values.
- The official public pages of Storybook, Design Tokens Community Group, OpenTelemetry, Open UI, OpenFeature, OpenAPI, GraphQL, and Backstage as named market and UX evidence for this run.
- The generated site workspace `/home/kvelikov/uir-public-site` as a target and test subject, never as an upstream source of product meaning.

Everything else in the workspace remains out of scope.

## Confirmed product decisions

### D1 — adoption begins with extraction

Confirmed by the user. The primary job of the public page is to help a team install and adopt the tooling. The shortest path to value begins from an existing interface:

`existing code → extract UIR → reveal decisions, drift and silence → adopt the check`

Building a new interface from ordinary-language intent is a secondary path:

`product intent → build UIR from zero → inspect → later lower to code`

The primary conversion is therefore an extraction quickstart, not a community signup or an abstract invitation to read a specification.

## Research synthesis

### What successful OSS standards make visible

- Storybook leads with a working mental model and product-shaped demonstration, then converts capability into development, testing, documentation, sharing, and automation use cases. It supports each transition with adoption evidence.
- DTCG leads with the outcome of interoperability, offers specification and community as parallel paths, names adopters, and explains who stewards the work.
- OpenTelemetry and OpenFeature make vendor neutrality concrete through a reversible workflow: instrument or integrate once, then use multiple back ends and vendors.
- Open UI makes the problem, scope, proposal status, test suites, charter, and contribution path visible rather than presenting unfinished work as a finished standard.
- OpenAPI separates the authoritative specification from learning material and community tooling, so normative truth and adoption help do not blur.
- Backstage combines an origin story, independent governance, concrete capabilities, adopters, and an extension ecosystem.

### Consequences for UIR

- The hero must demonstrate the transaction, not merely name the category.
- The first proof should be a real extraction/readout artifact or an explicitly labelled witness, not a decorative product mockup.
- “One representation” needs one concrete reversal of today’s workflow: the implementation is measured against the interface source, rather than code being mined later for missing intent.
- Specification, implementation status, gaps, and adoption path must be separate and visibly labelled.
- Early-stage honesty is an advantage: open gaps and deferred checks can act as trust evidence when their consequence is stated.
- Adoption proof must eventually replace generic claims. Until real adopters exist, the page should show verified mechanisms, tests, and measured limitations instead of invented logos or testimonials.

## Flow observations

### F01 — the first discovery question aimed at the wrong conversion layer

The first prompt offered pilot, community, or specification reading. The user’s actual goal was installation and adoption, with extraction as the first value moment. The flow prematurely mapped the goal onto common marketing CTAs instead of first asking what successful use looks like.

Proposed improvement: the first conversion question for a developer tool should be outcome-shaped: “What should a visitor be able to do in the first ten minutes?” Only after that answer should the flow choose install, demo, docs, community, or sales as the CTA mechanism.

### F02 — the clean-start contract correctly forced an explicit product decision

The single-question confirmation prevented the page from drifting into a community-first standard site. It exposed the actual adoption wedge: extraction of an existing codebase.

Keep: one confirmed, highest-leverage decision before emitting package meaning.

Improve: show a compact accumulating session state after each answer—confirmed, sourced, inferred, conflicted, and gaps—so the user can see progress without needing a second brief.

### F03 — “install the tooling” has no current public distribution seam

The authoritative repository documents running from a checkout and says the public repository is a later step. It has no public package-manager install command. A public page whose primary conversion is installation cannot currently complete its own promise without inventing a package name, exposing a private repository, or changing the conversion to access/request.

This is a product/distribution gap, not a copy problem.

Proposed improvement: define one real public bootstrap before launch—versioned archive, `pipx`, `uv tool`, Homebrew, or a documented source checkout—and make the exact command a release-gated product fact. The page compiler should refuse an install CTA whose destination or command is not backed by a supplied Source.

### F04 — the authoring transport has no blank-package compiler interface

`compile_uir.py` accepts a fully typed changeset and deliberately has no natural-language mode. Creation requires every record needed by the strict checker in one transaction. The generic `idea-to-uir` flow says not to copy schemas or use a product template, but there is no authoritative builder seam that turns one confirmed answer plus explicit gaps into a minimal candidate.

Consequence: a conversational agent must either hand-author the whole closed record graph, reuse the synthetic test package as a hidden product template, or stop. The first is high-friction and schema-coupled; the second violates clean start.

Proposed improvement: add a product-free `begin` transaction owned by the compiler. It should emit only package identity, session-supplied Sources, the confirmed scope, and explicit demanded gaps under the current vocabulary. It must not supply colors, type, roles, layout, Pieces, or content defaults.

### F05 — extraction cannot yet satisfy the extraction-first adoption promise

The React reader can emit a measurement package, but source alone cannot produce a checked candidate. Current tooling gaps name the missing design-system declarations: Ground, Dress, mandatory axes, Role vocabulary, and at least one Surface. This is honest and valuable, but it means “extract UIR” and “create an active UIR package” are different outcomes today.

Proposed improvement: make the first-run UX explicitly two-stage:

1. `uir extract` produces a non-activatable measured reading with an attested input digest.
2. `uir adopt` opens the smallest ordered decision queue needed to turn that reading into a checked authoring package.

The CLI, page, and docs should use distinct nouns and exit states for these artifacts.

### F06 — authoritative package versus published website needs an explicit seam

The UIR project correctly forbids hand-authored prototype truth and freezes UIR before production lowering. The website workflow expects conventional page source and deployment output. There is no current Step 2 backend that lowers UIR into this site target.

Consequence: hand-writing the page after authoring UIR would make the clean-start test pass visually while bypassing the claim being tested.

Proposed improvement: for this test, define a narrow experimental lowering whose input is only the checked package and whose output can be thrown away and re-derived. Mark it as test tooling, not production-ready Step 2. Add a byte-level assertion that no marketing copy, hierarchy, design value, or link exists only in the target.

### F07 — the project’s old handoff checkpoint is not safe authoring context

`PLANS.md` contains an obsolete handoff section hundreds of commits behind current implementation. Reading it as present truth would re-open answered questions and misstate available seams.

Proposed improvement: make the handoff checkpoint generated or version-bound. A clean-start session should read a machine-addressable capability manifest from the current tool, not infer readiness from narrative plan prose.

### F08 — first-pass checker diagnostics are exact but not corrective

The official candidate check precisely identified invalid `NameSource`, canonical set ordering, a missing required Gap member, and unfilled Piece slots. This made the failing contract locations easy to find. The output did not explain the smallest valid repair, such as the allowed `NameSource` variants or the relationship between a slot's `accepted.roles` and direct child Nodes.

Impact: a clean-start author has to search tests or vocabulary implementation details to translate a good location-level diagnostic into a valid model change.

Proposed improvement: add one concise `expected` or `hint` line to shape and semantic diagnostics, preferably with the exact accepted enum values or a minimal payload fragment.

### F09 — a checked draft cannot produce a complete official visual board

The candidate passes structural and implemented semantic checks, but the checker correctly reports four global deferred semantic closures. The official board consequently blocks attestation with `UIR-EVAL-SEMANTICS-NOT-READY`, reaches 20 parts for a 98-Node page, and reports that zero catalogue Pieces are reached from the Surface. Both desktop and mobile board runs are reproducible, but neither is a usable marketing-page target.

Impact: Flow 2 can author a valid draft but cannot visually review the authored Surface through the claimed package → board seam while repository-level deferred contracts remain open.

Proposed improvement: distinguish “semantic closure is globally incomplete” from “this draft cannot be projected at all.” Provide a clearly watermarked draft projection mode that draws every decidable Node/Piece while preserving a blocking status and its exact undecided set.

### F10 — the web target needs semantics the current package does not state

The target must emit HTML heading levels, full-width section framing, responsive grid columns, sticky navigation behavior, and anchor affordances. The package states Role, salience, containment, frames, layout modes, and design bindings, but it does not carry enough web-target semantics to decide all of those details without target-side inference.

Impact: the experimental lowering can remain honest about copy, hierarchy, colors, typography, spacing, and links being derived, but it cannot yet prove that every responsive/layout/accessibility choice came from UIR.

Proposed improvement: define a target-neutral semantic heading-order contract and a narrow target capability mapping. The checker should report which target decisions are derived, inferred, or absent before a generated target can be called authoritative.

### F11 — the generic site starter brings a noisy dependency baseline

After removing the disposable skeleton dependency, `npm audit` still reports 20 transitive vulnerabilities: 1 low, 4 moderate, and 15 high. No production exploitability assessment was performed in this design/Flow 2 run, and no broad dependency upgrades were authorized.

Impact: the public target can build and test successfully while its starter supply-chain baseline remains unresolved. That is separate from UIR correctness but material to shipping.

Proposed improvement: the website starter should publish a current audit baseline, distinguish build-tool-only findings from runtime exposure, and provide a supported upgrade lane rather than asking each clean-start run to interpret raw audit counts.

### F12 — bundled Sites shell helpers are not executable as shipped here

Both the site initializer encountered earlier in the run and the final packaging helper contain CRLF line endings. Bash reads `pipefail\r` as an invalid option; the root packaging wrapper also relies on its original relative location, so moving only that wrapper to a temporary path breaks delegation.

Impact: the documented clean-start and publish paths fail before product work begins or ends, despite the underlying scripts being otherwise usable.

Proposed improvement: ship the helpers with LF line endings and add a release check that invokes every shell entrypoint from its installed path. Keep the root wrapper executable and cover its relative delegation in that check.

### F13 — self-inspection turns the representation claim into visible evidence

Adding an inspector over the generated page made the core model legible without a separate explanatory demo. A visitor can select any of the 98 rendered Nodes and see its semantic Role, salience, containment, resolved Piece, Ground bindings, DesignValues, provenance modes and named sources. The existing install Gap is visible through the same mechanism rather than as special-case marketing copy.

Impact: the system's own site can now demonstrate that UIR is not a static export format. The representation remains addressable and inspectable inside the running target, which is much stronger adoption evidence than a “built with UIR” badge.

Proposed improvement: make self-inspection a first-class adoption pattern and include it in the public proof strategy. The inspector should always identify its own viewer chrome as outside the inspected Surface so the proof does not recursively overclaim.

### F14 — there is no official compact inspection DTO or embed contract

The checked package contains everything needed for the readout, but the target had to create a custom compact manifest, map DOM `data-node` keys back to full Node identities, resolve Pieces, merge Piece and Node presentation bindings, and join Provenance records to Source descriptions.

Impact: every target that wants embedded inspection must recreate a subtle read path, may disagree about resolution, and risks shipping the entire authoring package to the client.

Proposed improvement: publish an official `inspection_dto(snapshot, surface, context)` projection containing stable target handles, resolved Piece identity, visible/invisible Facts, effective bindings, provenance summary, explicit gaps, and attestation state. Define a small DOM/embed convention such as `data-uir-node-id` so viewers can select target elements without target-specific key translation.

## Open review questions

- What exact artifact counts as “value” immediately after extraction: a conformance degree, a checklist, a findings view, a live board, or a prioritized adoption queue?
- What public install source will back the primary CTA?
- Is the first public page allowed to describe an alpha workflow, or must it wait until the install and adoption loop are independently reproducible?
- Which claims may be supported by synthetic witness boards, and which require a real external codebase or adopter?
- What is the smallest honest experimental lowering that lets this test publish a page without quietly becoming hand-authored frontend work?

## Evidence log

- The UIR repository was clean and synchronized at the start of the run.
- The current local suite passed 1,331 tests with 66 skips caused by the absent styling framework in that checkout.
- Fourteen contract checkers passed locally.
- The browser paint checker measured 141 boxes over 8 witness boards successfully.
- The public page project was created in a separate clean workspace and its development surface started successfully.
- The checked page candidate contains 98 Nodes and has package fingerprint `a42600e063a9f26e05cc9d25412682910976bdfbefcbe3630934a95e880e1a53`.
- The official checker accepted the candidate structurally and named four global semantic closures as deferred.
- Official desktop and mobile board runs completed but were blocked from attestation and reached only 20 parts.
- The experimental web target passed lint, production build, and two rendered-HTML contract tests. The tests assert that all 98 Nodes render and that representative marketing copy exists only in UIR, not in the React target source.
- One bespoke 1200×630 social preview was generated and stored as a project asset.
- The self-inspection iteration derives a compact manifest for all 98 Nodes from the same checked package. No mock or parallel demo model is used.

## Review outcome

Open. Update this section only when the authoring, checking, projection, and published target have each produced evidence. Do not call the flow successful because the final page looks good.
