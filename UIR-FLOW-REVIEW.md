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

### F15 — a clean gate summary can hide weak authored decisions

The page report has no failing gate, 4,007 decided member positions and no undecided member position, but several statements are intentionally generic: all 98 Node descriptions state none, 70 Node names state none, all 10 Piece descriptions state none, and the authored measures reuse broad placeholder-like bounds. The report correctly refuses to turn those statements into a quality percentage.

Impact: optimizing the page by adding more records would improve no honest measure. The valuable work is to improve the meaning of the existing decisions, make measures role-specific, add real reading order and state exposure, and establish an independent implementation-versus-system conformance run.

Proposed improvement: make the review UI place `statesNothing`, repeated-claim uniformity, vacuous gates and blocked coverage beside the clean gate summary. Present them as review signals, never as deductions from a score.

### F16 — site review was a convention, not a tooling-owned workflow

- Status: fixed
- Flow step: baseline, measurement, board, and review
- Evidence: the first score-improvement pass required manually composing `uir_report.py`, two `uir_board.py` readings, ad hoc JSON inspection, and review-note conventions.
- User impact: a clean-start agent could repeat the package checks but omit the board target's own counts, overwrite the baseline, calculate an authored-package ratio, or forget to record Flow 2 friction.
- Root cause: UIR shipped the individual official readers but no product-owned orchestration and no reusable clean-start procedure for a UIR-backed site.
- Change made: added `tool/uir_site_workflow.py`, `skills/improve-uir-site/`, a review-entry template, three unit tests, skill metadata, validation, and a README entry in the UIR tooling repository.
- Verification: `python3 -m unittest discover -s tests -t tests -p test_uir_site_workflow.py` passes three tests; the skill validator reports `Skill is valid!`; the new command produced both site audit artifacts.
- Remaining risk: the workflow captures evidence but deliberately does not judge semantic quality or compare artifacts automatically.

### F17 — a named container Node cannot honestly inherit its name through a reusable Piece

- Status: deferred
- Flow step: authoring and candidate build
- Candidate revision: rejected staging candidate before `c58d6cad091acbc734095b23d1436c01025b1d587d6549b9532371fafe9bdad0`
- Contexts: desktop and mobile
- Evidence: adding truthful names to navigation and region Nodes made the checker reject all three reachable region/navigation Resolution families because their independent Pieces declared `name: none`. `NameSource` can name one literal or one concrete Node, but cannot state “take the name from the Node resolved at this occurrence.”
- User impact: the author must either leave container names as explicit `none`, hard-code a reusable placeholder literal, point every occurrence at one unrelated Node, or lie about contribution mode.
- Root cause: the vocabulary has no occurrence-relative or content-derived `NameSource` for a reusable Piece.
- Change made: rolled back only the unsupported names; no placeholder was used and the checker returned to accepted-draft state.
- Proposed tooling or workflow improvement: add a generic resolved-Node/content name source and check that an independent Piece carrying a named Node preserves that source.
- Verification: the rejected candidate named `UIR-SEM-RESOLUTION` at navigation→document, region→document, and region→group; the rebuilt candidate has no failing or ungated error.
- Remaining risk: 70 Node names and 8 Piece names still honestly state nothing.

### F18 — better authored decisions can reveal more target limitations

- Status: fixed
- Flow step: authoring, measurement, and board
- Candidate revision: `c58d6cad091acbc734095b23d1436c01025b1d587d6549b9532371fafe9bdad0`
- Contexts: desktop and mobile
- Evidence: baseline and after artifacts are `.uir-session/uir-audit-baseline.json` and `.uir-session/uir-audit-after.json`.
- Change made: replaced generic Piece bounds with container, collection, content, and control measure profiles; replaced five false atomic `leaf` layouts with explicit content flows; declared the one-slot reading order; changed the claimed largest text scale from 1× to 2×; narrowed Node-related provenance instead of crediting every research source.

| Signal | Baseline | After | Interpretation |
|---|---|---|---|
| Gate verdicts | 11 pass, 2 vacuous, 6 unchecked | unchanged | No green gate was manufactured. |
| `piece.accessibility.readingOrder` | 10 state nothing; 1 distinct value | 0 state nothing; 10 distinct slot references | Each Piece now states its own one-slot order; the global reading-order predicate remains deferred. |
| Board arrangements not expressible | 9 | 4 | Five content-carrying atomic Pieces no longer claim to be leaves. |
| Board parts not placed | 10 | 7 | The board can place three more parts after the layout and measure changes. |
| Total board limitations | 36 | 33 | Fewer limitations, but not a completeness claim. |
| Board conflicts / measure fields not expressible / slots reaching no pixel | 2 / 25 / 38 | 3 / 26 / 47 | More content is drawn and exposes additional responsive-measure conflicts; these are retained, not hidden. |
| Provenance records citing all 9 sources | 210 | 15 | Node claims now default to the user session and UIR repository instead of every market source. |
| External install Gap | 1 | 1 | Public distribution remains honestly external. |

- Remaining risk: bounded/content growth remains intentionally responsive but this board cannot compute it; four compiler deferrals keep six gates unchecked; `largestTextScale` and reading order are still load-bearing claims with no implemented semantic predicate.


### F19 — reproducibility and semantic debt were local knowledge, not CI contracts

- Status: fixed
- Flow step: authoring, checking, and release
- Candidate revision: `3e219ffb2b8ed0518a654512c93bc016ff1c83dbf03ea585483d4aacf31924a7`
- Evidence: before this change the newest authoring source lived under ignored `.uir-session/`, the website had no GitHub workflow, and a hand-edited package could pass site lint/build without being regenerated.
- User impact: a clean-start contributor could change emitted shards directly, omit the official UIR audit, or introduce a seventh unchecked gate while the implementation CI stayed green.
- Root cause: the workflow shipped an audit command but no reusable CI action, no committed authoring source, and no explicit unchecked/deferred boundary.
- Change made: versioned `uir/author_site.py`; added `tool/uir_site_ci.py` and `.github/actions/check-site` in the UIR repository; pinned the website workflow to exact UIR commit `2370d95291acfc56773cea97e029e6256c01cb19`; added `uir/ci-baseline.json` and an uploaded audit artifact.
- Verification: CI regenerates a candidate with the official compiler, byte-compares every package file, runs the official site audit, refuses failing gates and ungated errors, and refuses any change to the named six unchecked gates or four deferral codes until the baseline is explicitly reviewed.
- Remaining risk: the four deferrals are language/tooling work, not waived product quality. GitHub branch protection for this private repository requires a paid organization plan; current access control is private organization membership with forking disabled.


### F20 — dependency caching kept a finished CI job pending

- Status: fixed
- Flow step: continuous integration and release
- Evidence: two pull-request runs completed UIR reproduction, audit upload, dependency install, lint, build, and rendered tests, then remained `in_progress` in `Post Run actions/setup-node@v4`. The measured uncached `npm ci` step on the same self-hosted runner completed in about four seconds.
- User impact: a valid website change could not merge or publish because the runner was occupied after every meaningful assertion had already passed.
- Root cause: the generic starter enabled the setup-node npm cache without evidence that this small repository benefited on the organization runner.
- Change made: removed the cache input while retaining Node 22 setup and deterministic `npm ci`.
- Verification: the superseding PR run completed every step successfully in 36 seconds, including all action cleanup steps.
- Remaining risk: the self-hosted runner remains shared infrastructure; queue time is still external to UIR.


### F21 — the generated workflow started with deprecated action runtimes

- Status: fixed
- Flow step: continuous integration
- Evidence: the first complete PR run was green but GitHub annotated checkout v4, setup-python v5, setup-node v4, and upload-artifact v4 because their Node 20 action runtime was deprecated and forcibly upgraded by the runner.
- User impact: every green run carried avoidable warning noise, making material annotations harder to see and leaving future runner compatibility implicit.
- Root cause: the workflow began from older starter-era action major pins.
- Change made: verified the current official releases through the GitHub API and moved all four actions to their current v7 major.
- Verification: the superseding PR run completed successfully in 32 seconds with v7 actions and no deprecated-runtime annotation.
- Remaining risk: major tags are maintained upstream references rather than immutable SHAs; the UIR action itself remains pinned to an immutable commit because it defines the product contract.


### F22 — a green check hid the actual UIR review

- Status: fixed
- Flow step: continuous integration and review
- Candidate revision: `62c27e1ed0769685f9438a3433c0b5dedcec716f08637c8f6a7b1d5df58dfcbf`
- Evidence: the first action printed one compact success line and uploaded only the full JSON audit. Reviewers had to download and interpret the machine artifact to discover 11 passing gates, 2 vacuous gates, 6 unchecked gates, 4 compiler deferrals, 1 external Gap, and the board limitations for both contexts.
- User impact: the pull request looked simply green even though semantic readiness was false and material target limitations remained.
- Root cause: the CI entry point enforced the boundary but had no human review projection.
- Change made: added an official Markdown review renderer to `tool/uir_site_ci.py`; the composite action always appends `review.md` to the GitHub Job Summary; the website retains `review.md` and `audit.json` together as one evidence artifact.
- Verification: local integration generates an accepted-with-declared-limits review from the real site package and still fails closed on reproducibility drift, failing gates, ungated errors, or baseline changes; the UIR suite passes 1,339 tests with no skipped-tool residue.
- Remaining risk: the review is a workflow summary rather than an automated pull-request comment. This avoids granting write permission to the action and keeps the PR conversation free of bot comment churn.



### F23 — a public showcase cannot depend on a private UIR action

- Status: fixed with an explicit alpha trust boundary
- Flow step: public distribution, continuous integration, and adoption proof
- Candidate revision: 983c84e62ab8887a87a2e1da25f5c80dcd9bfcd340168dffccc188a21b520da2
- Evidence: GitHub permits private actions to be shared only with private repositories. Making the site repository public would therefore break the previously pinned "tenbytesltd/uir" action. A self-hosted runner would also be the wrong default execution boundary for untrusted public pull requests.
- User impact: the supposed open showcase would either fail for every fork, require hidden Tenbytes credentials, or expose a misleading green check that outsiders could not reproduce.
- Root cause: the first CI integration assumed the website and tooling repository would share one private organization boundary.
- Change made: replaced the cross-repository action with a local public composite action and an independently authored verifier; moved CI to a GitHub-hosted runner; added a restricted public package builder; committed the machine-readable official audit and a digest binding to the exact package; made the Job Summary distinguish public reproduction from maintainer-generated semantic evidence.
- Verification: a credential-free local run reproduces all 5 shards and 4,148 records exactly, verifies the package fingerprint 8f59110bdab6ec1f3a2d0ce1365c4aa3b9a72bb8344a43b6454b3f514bc835af, and publishes the same 11 pass / 2 vacuous / 6 unchecked / 0 fail ledger plus four deferrals and both board contexts.
- Proposed tooling improvement: publish a stable, public UIR verifier/action distribution. That would let public adopters refresh official semantic evidence themselves instead of stopping at the maintainer-review seam.
- Remaining risk: until that distribution exists, package-changing public contributions require a Tenbytes maintainer to refresh the official audit; CI states this explicitly and blocks stale evidence.

### F24 — the Surface parts axis silently lagged the authored page

- Status: fixed
- Flow step: authoring and candidate checking
- Evidence: the Surface definition originally omitted the already-rendered "build" part. Adding the public "showcase" part exposed both omissions because the official compiler rejected them as undeclared "surface-part" symbols.
- User impact: authoring could produce a visually complete section while the closed context vocabulary did not admit that section as part of the Surface.
- Root cause: the part list and the axis symbol declaration were maintained separately.
- Change made: declared both "build" and "showcase" in the "surface-part" axis and kept the Surface definition complete.
- Proposed tooling improvement: derive declared surface-part symbols from the Surface definitions, or add an authoring helper that updates both ledgers atomically.
- Verification: the official compiler accepts the 116-Node candidate with no failing gate or ungated error.
- Remaining risk: other authoring helpers can still duplicate closed-vocabulary declarations unless the model API owns this synchronization.

### F25 — the OSS showcase needed a static public lowering

- Status: fixed
- Flow step: public distribution and adoption proof
- Evidence: the first production host exposed the page correctly but used a platform-specific hostname and server runtime. Anonymous verification also showed Open Graph image URLs resolving to localhost instead of a public canonical origin.
- User impact: an OSS visitor could inspect the repository but the primary hosted proof looked vendor-bound, and social unfurls could not fetch the published card.
- Root cause: the target was packaged for a Worker-style server even though this Surface has no server state, and host/base-path metadata lived outside the UIR target review.
- Change made: added a Vinext static export with the GitHub project asset prefix, a deterministic Pages staging step, absolute public metadata, export contract tests, and a Pages deployment that runs only after the readable UIR/site check passes on protected main.
- Proposed tooling improvement: UIR target lowering should declare hosting capabilities and canonical-origin/base-path requirements, then report whether a Surface can be emitted as static files or requires a runtime.
- Verification: the Pages artifact must contain the checked UIR page, inspector client, prefixed assets, public repository CTA, canonical social image, and no localhost reference.
- Remaining risk: future server actions, APIs, or persistent adoption demos will require a separately declared runtime instead of silently expanding the static site.

### F26 — a successful static build did not mean a deployable Pages artifact

- Status: fixed
- Flow step: target lowering, verification, and public deployment
- Evidence: the first export completed with exit code 0 while marking the homepage as dynamic and emitting only a 404 page. Forcing the route static then exposed a Vinext project-base-path failure, and using only the asset prefix placed the generated assets in a nested physical directory that did not match GitHub Pages URL mapping.
- User impact: CI could publish a green artifact with no homepage or with every stylesheet and client chunk returning 404.
- Root cause: build success, route prerendering, public URL prefixing, and artifact filesystem layout were treated as one implicit framework behavior even though they are separate hosting contracts.
- Change made: declared the homepage force-static, kept the public project asset prefix without applying it to route discovery, staged the prefixed assets at artifact root, added .nojekyll, and made the contract test require the HTML, social metadata, client chunks, public assets, and absence of the incorrect nested directory.
- Proposed tooling improvement: a UIR static target should verify both URL space and artifact space, including at least one fetched CSS and JavaScript asset, rather than accepting a compiler or bundler exit code as publication evidence.
- Verification: npm run test:pages now prerenders the homepage with zero skipped routes and validates the complete staged out directory.
- Remaining risk: the project currently uses a beta Vinext release, so the export contract remains an explicit CI gate instead of an assumed framework guarantee.

### F27 — shell interpolation corrupted the public pull-request narrative

- Status: fixed
- Flow step: review publication
- Evidence: pull request 4 displayed literal backslash-n sequences and embedded complete command output inside the verification list.
- User impact: the review looked broken and made the concise deployment evidence difficult to scan, despite the underlying checks being green.
- Root cause: Markdown containing command delimiters was passed through a shell-escaped CLI argument; the shell executed those fragments and injected their output into the pull-request body.
- Change made: replaced the body with native multiline Markdown through the GitHub API and verified the stored body contains real line breaks, compact verdicts, the live URL, and a link to the successful run.
- Proposed tooling improvement: review publishers should pass structured API fields or a body file directly, never interpolate Markdown through a command shell.
- Verification: GitHub now returns the corrected structured body for pull request 4 with no literal newline escapes or embedded logs.
- Remaining risk: this safeguard belongs to the publishing workflow rather than the UIR model; other automation can reproduce the defect unless it follows the same transport rule.

### F28 — the default scaffold favicon contradicted the UIR identity

- Status: fixed
- Flow step: public presentation and brand recognition
- Evidence: the published tab used a generic blue four-tile scaffold mark that appeared nowhere in the UIR page and carried none of its lime, ink, container, or inspectable-fact language.
- User impact: the browser chrome made the OSS showcase look templated at the smallest but most persistent brand touchpoint.
- Root cause: the initial target retained its starter favicon after the page developed a distinct visual system.
- Change made: replaced it with a compact SVG mark: an ink interface field, a lime U-shaped frame, and one light addressable node.
- Proposed tooling improvement: UIR target review should include browser-chrome assets such as favicon, title, theme color, and social card in the visible identity evidence.
- Verification: the SVG has an opaque high-contrast background and remains legible when rasterized to 16 by 16 pixels.
- Remaining risk: the mark is now consistent and functional but has not yet been tested as a broader product identity beyond the website favicon.

### F29 — the sticky navigation inherited the background behind it

- Status: fixed
- Flow step: UIR authoring and target projection
- Evidence: the navigation Piece declared ink, type, spacing, and rule but no surface. Its sticky target therefore remained transparent and black navigation text became unreadable while crossing the dark hero and showcase sections.
- User impact: primary navigation disappeared precisely while the user scrolled through the highest-salience sections.
- Root cause: transparency was an unstated omission in the design-system Piece, not an intentional target effect.
- Change made: bound the navigation Piece to the opaque surface ground role in UIR and regenerated the package; no CSS color override was added.
- Proposed tooling improvement: contrast checking for sticky or overlaying Pieces must evaluate every surface they can traverse, not only their initial document position.
- Verification: the generated design-system shard now carries the navigation surface binding and the renderer consumes it through the existing generic binding path.
- Remaining risk: the current checker does not simulate sticky overlap across scroll positions.

### F30 — two adjacent dark sections collapsed the page rhythm

- Status: fixed
- Flow step: UIR authoring and visual hierarchy
- Evidence: the dark showcase region was immediately followed by a second full-width dark quickstart region, making two different product arguments read as one uninterrupted block.
- User impact: section boundaries and narrative pacing weakened at the transition from proof to adoption.
- Root cause: both region Nodes independently overrode the same dark surface without a sequence-level contrast review.
- Change made: returned quickstart and its step text to the default light surface and ink roles while preserving only the three command blocks as dark local anchors.
- Proposed tooling improvement: add a surface-sequence reading that reports adjacent primary regions with indistinguishable ground roles unless continuity is explicitly authored.
- Verification: the regenerated interface shard contains no dark surface or inverse ink override on quickstart or its step cards; only the code Pieces retain their dark bindings.
- Remaining risk: sequence rhythm is still reviewed visually rather than enforced by a formal gate.

### F31 — the hero provenance line competed with the product state

- Status: fixed
- Flow step: marketing hierarchy and content authoring
- Evidence: the highest section opened with four labels: the expanded product name, creator credit, public-source status, and alpha state.
- User impact: creator and repository context diluted the shortest recognition signal at the primary entry point even though both are explained elsewhere on the page.
- Root cause: provenance and distribution facts were promoted into hero copy instead of remaining available in the showcase and inspector.
- Change made: authored the hero kicker as USER INTERFACE REPRESENTATION · ALPHA and regenerated the package.
- Proposed tooling improvement: distinguish visible marketing copy from inspectable provenance so evidence can remain available without occupying the primary content hierarchy.
- Verification: the emitted node.content value is exactly USER INTERFACE REPRESENTATION · ALPHA; the removed phrases do not appear in the hero kicker.
- Remaining risk: alpha remains a product-state claim and should be updated from one release authority when the public distribution changes.

### F32 — the Vite security update exposed future config-loader incompatibilities

- Status: fixed
- Flow step: dependency maintenance and target build
- Evidence: after merging the Vite 8.2.1 Dependabot update, both runtime and Pages builds warned that the fallback hosting config imported JSON without an attribute and imported a TypeScript module without its extension.
- User impact: green builds gained avoidable warning noise and were not ready for Vite native config loading to become the default.
- Root cause: the legacy fallback config relied on transform-loader resolution rules that native module loading does not provide.
- Change made: added the JSON import attribute and explicit TypeScript extension while preserving the existing fallback host behavior.
- Proposed tooling improvement: dependency-update CI should treat newly introduced build warnings as review evidence, even when the required command exits successfully.
- Verification: both build modes complete on Vite 8.2.1 without the native config-loader warning.
- Remaining risk: the fallback Worker and D1 scaffold remains intentionally preserved until its host is retired explicitly.

### F33 — automated dependency PRs did not close the full advisory boundary

- Status: partially fixed with explicit residual risk
- Flow step: dependency maintenance and public release
- Evidence: all open Dependabot pull requests passed the UIR/site gate and were merged, but a clean npm audit still reported a directly fixable high-severity React Server Components advisory plus advisories whose only proposed fixes are breaking dependency downgrades.
- User impact: treating an empty Dependabot queue as a clean security state would overstate the release evidence.
- Root cause: pull-request state and resolved advisory state are different ledgers; the bot had not yet proposed every safe transitive or direct update.
- Change made: synchronized React, React DOM, and react-server-dom-webpack at 19.2.8, applied the non-forcing npm audit fix, and refused the breaking force path.
- Proposed tooling improvement: the readable CI review should publish runtime and development advisory counts separately and distinguish safe fixes, breaking-only fixes, and no-fix-yet dependencies.
- Verification: the direct React Server Components advisory and the low advisory are gone; lint, both build modes, render contracts, Pages export contracts, and the UIR verifier are rerun after the lockfile update.
- Remaining risk: six development/build-time advisories remain: two high findings through image-size in the Vinext beta line and four moderate findings through the preserved Drizzle fallback. npm proposes only breaking downgrades for them, so they remain visible rather than being force-fixed.

### F34 — decorative surface and motion lived outside UIR authority

- Status: fixed with one explicit projection limit
- Flow step: UIR authoring, motion, and target projection
- Evidence: the approved dot field existed only in a `#showcase` CSS rule, the Dress declared no motion events, and no Node exposed either decision in the inspector.
- User impact: moving or animating the pattern required editing the target directly, contradicting the site's claim that its own visual decisions are inspectable UIR.
- Root cause: the first target lowerer handled scalar colour and spacing bindings but did not lower gradient surfaces or transition values.
- Change made: authored a radial dot-field DesignValue, a hero surface Ground role, a twelve-second ambient transition, a named motion event, a reduced-motion allowance, and hero surface/motion bindings; the generic renderer now lowers those typed values and the old showcase selector is gone.
- Proposed tooling improvement: close the v0.1 gradient coordinate domain and add a first-class repeated-pattern or decorative-surface contract. The web projection currently documents its normalized-number and 18-pixel tiling policy because UIR does not yet carry those units or repeat geometry.
- Verification: the official audit has no failing gates or ungated errors; rendered HTML exposes both UIR bindings, browser tests measure moving background position, and reduced-motion disables the animation.
- Remaining risk: the animation is UIR-selected and timed, but repeat size and keyframe travel remain projection policy until the language can represent them without inference.

### F35 — reduced-motion intent lost to projection specificity

- Status: fixed
- Flow step: runtime accessibility verification
- Evidence: the first browser run with `prefers-reduced-motion: reduce` still computed `uir-surface-drift` because the two-attribute animation selector outranked the one-attribute motionless selector.
- User impact: people requesting reduced motion would still receive the decorative animation even though the UIR motion-event constraint explicitly allowed a motionless result.
- Root cause: source order was treated as sufficient without comparing selector specificity in the generated web projection.
- Change made: the reduced-motion rule now matches the exact UIR surface-plus-motion specificity and suppresses the animation.
- Proposed tooling improvement: browser verification for every reachable UIR motion should assert computed animation state in both normal and reduced-motion media, not merely search source CSS for a media query.
- Verification: Playwright reports a changing background position in normal mode and `animation-name: none` under reduced motion.
- Remaining risk: the current regression is runtime QA rather than a committed browser-test suite because the repository intentionally keeps its required public CI lightweight.

### F36 — the hero gap kept its base Piece ink on the new dark surface

- Status: fixed
- Flow step: UIR composition and visual verification
- Evidence: the browser screenshot showed the explicit install-artifact Gap with near-black Paragraph ink over a dark translucent accent plane.
- User impact: the honest alpha limitation became difficult to read after the dot field moved into the hero.
- Root cause: each Node resolves its Piece bindings independently, so the child Paragraph's base ink won over the hero region's inverse ink instead of inheriting it.
- Change made: authored an inverse-ink presentation override on the install-gap Node and regenerated the UIR package.
- Proposed tooling improvement: contrast evaluation should resolve nested Node bindings against the painted ancestor surface, including translucent target treatments, rather than assume parent colour cascades.
- Verification: browser computed style now reports inverse ink for the gap on the radial dark hero surface.
- Remaining risk: the official contrast gate remains one of the six known unchecked areas, so this still depends on browser evidence.

### F37 — desktop QA overstated hero motion and text clarity on mobile

- Status: fixed
- Flow step: mobile visual validation
- Evidence: the published 390-pixel view made the 22-percent dot field compete with body copy while a twelve-second one-cell drift was too slow to perceive.
- User impact: the animation showcase looked static and the primary explanation required unnecessary visual effort.
- Root cause: the UIR values were judged from desktop computed state and one still frame rather than from perceived motion and reading comfort on the target mobile viewport.
- Change made: reduced the UIR dot colour alpha from 0.22 to 0.10, shortened the authored ambient transition from twelve to four seconds, and bound the headline and lead Nodes to the solid inverse surface so the pattern cannot pass through their reading area; the target renderer and selectors remain unchanged.
- Proposed tooling improvement: motion review should include a minimum perceptible-displacement check over one second, while decorative-surface review should compare local contrast around every text line at mobile scale.
- Verification: the 390-pixel browser run measures a clear position change over one second, retains the pattern, preserves inverse text colour, and disables motion under the reduced-motion preference.
- Remaining risk: perception depends on display density and OS motion settings, so the live mobile screenshot remains part of the acceptance evidence.

### F38 — concurrent target builds race on the shared output directory

- Status: workflow limitation documented; sequential required path passes
- Flow step: target verification
- Evidence: running the runtime build and GitHub Pages export in parallel let one Vinext process replace the other's `dist` directory and the Pages prerender then reported no build output.
- User impact: parallelizing two individually valid checks can create a false release failure unrelated to the UIR package or page.
- Root cause: both scripts own the same mutable build directory and Vinext does not isolate their intermediate output.
- Change made: kept the required verification order sequential and reran the Pages export after the runtime test completed.
- Proposed tooling improvement: give each target build an isolated output root or make the workflow declare the build-output lock explicitly.
- Verification: the same Pages command passes when run after the runtime build rather than concurrently with it.
- Remaining risk: local ad-hoc parallel invocations can reproduce the race; GitHub Actions already executes these steps sequentially.

### F39 — pointer-responsive decorative motion has no complete UIR effect contract

- Status: fixed with an explicit projection limit
- Flow step: authoring, implementation, inspection, and board
- Candidate revision: `3af4e504da43b924b119145d2b19f922dbd7dc70044a3c15cc27b277db62c0b1`
- Contexts: `uir-site:context:desktop`, `uir-site:context:mobile`
- Evidence: the accepted preview required one field of points to follow pointer and touch proximity with smaller displacement, no visible core, and no glow. UIR v0.1 can name a `motion-event` and bind a `transition`, but that transition carries only duration, curve, delay, and property roles; it cannot state the trigger geometry, displacement extent, influence radius, or particle topology. The official board already refuses to draw transition effects because it has no Ground-role-to-property table.
- User impact: implementing the approved behavior only in CSS or JavaScript would make the site's most visible self-showcase decision absent from its inspector and contradict the claim that the page is based on UIR.
- Root cause: UIR deliberately carries framework-independent transition meaning and excludes handlers/effects, while the current web lowerer has no declared target profile for interactive decorative fields.
- Change made: authored `pointer-dot-field` in the Dress, bound the existing typed radial surface and transition to the hero Node, and made the generic renderer activate a canvas lowering only when that exact UIR event and surface are present. The lowering draws only points, derives both colours, opacity, cycle duration, and motionless permission from UIR, caps the target-policy displacement at 8 px plus two 2 px waves, follows pointer/touch without blocking page scroll, and becomes static for reduced motion.
- Proposed tooling or workflow improvement: add a target-profile extension for decorative fields with a closed effect kind, interaction trigger, influence measure, displacement measure, density, and reduced-motion result. Until that exists, surface repeat geometry and particle displacement must be disclosed as target policy rather than implied to be fully represented.
- Verification command and result: `python3 tool/uir_site_ci.py --site-root /home/kvelikov/uir-public-site ...` passed with 11 passing, 2 vacuous, 6 unchanged unchecked, 0 failing gates, 0 ungated errors, and the same four compiler deferrals; mobile and desktop browser runs found one canvas exactly covering the hero, changing pixels over time, distinct results after touch/pointer moves, no runtime errors, and solid inverse title/lead surfaces.
- Remaining risk: the event identity, colours, opacity, duration, binding, and motionless allowance are inspectable UIR; point spacing, influence radius, displacement coefficients, and canvas realization are still web-target policy and do not appear in the inspector or official board.

| Signal | Baseline | After | Interpretation |
|---|---|---|---|
| Gate verdicts | 11 pass / 2 vacuous / 6 unchecked / 0 fail | unchanged | The change did not manufacture a semantic score improvement. |
| Unchecked reasons | slot bounds, measures, applicability, contrast, state exposure, reading order | unchanged | Existing language/checker debt remains visible. |
| Package records | 4,202 | 4,202 | Existing Facts were corrected instead of adding records to game a denominator. |
| Desktop board | 20 parts, 7 undecided, 33 limitations | unchanged | The board can reach the motion binding but cannot depict the interactive effect. |
| Mobile board | 20 parts, 7 undecided, 33 limitations | unchanged | The target behavior needs runtime evidence in addition to the still board. |

Publish decision: eligible after the sequential public verifier, runtime build, rendered contracts, Pages export, and final browser check pass. Known deferrals remain `UIR-SEM-CONTRAST-DEFERRED`, `UIR-SEM-PARENT-ROLE-DEFERRED`, `UIR-SEM-RESOLUTION-DEFERRED`, and `UIR-SEM-SLOT-CARDINALITY-DEFERRED`.


### F40 — element screenshots were the wrong reduced-motion observable for canvas

- Status: fixed
- Flow step: implementation verification
- Candidate revision: `3af4e504da43b924b119145d2b19f922dbd7dc70044a3c15cc27b277db62c0b1`
- Contexts: `uir-site:context:mobile`
- Evidence: two Playwright element screenshots of the reduced-motion canvas produced different file hashes, while three direct `canvas.toDataURL()` samples taken 700 ms apart produced the identical SHA-256 value `77db74eb049683bdd3fa8be69ab80e28e6780a0f37c3409150250a40e4a0c4d4`; normal-motion samples produced three distinct hashes.
- User impact: a capture artifact could falsely report an accessibility regression and send the implementation back through an unnecessary correction loop.
- Root cause: the verification compared encoded element screenshots rather than the canvas bitmap that represents the motion state.
- Change made: verified reduced motion against repeated direct bitmap hashes and kept screenshot comparison only for broader layout review.
- Proposed tooling or workflow improvement: provide a reusable UIR browser assertion that samples the realized motion property or canvas bitmap under both `no-preference` and `reduce`, and reports the chosen observable in the evidence.
- Verification command and result: Playwright reported `matchMedia('(prefers-reduced-motion: reduce)').matches === true`; the reduced canvas had one unique bitmap across three samples and normal motion had three.
- Remaining risk: this runtime assertion is session evidence, not yet a committed cross-browser test; non-canvas lowerings need different property-level observables.


### F41 — the dev watcher reacts to the Pages artifact it does not own

- Status: deferred
- Flow step: implementation verification
- Candidate revision: `3af4e504da43b924b119145d2b19f922dbd7dc70044a3c15cc27b277db62c0b1`
- Contexts: `uir-site:context:desktop`, `uir-site:context:mobile`
- Evidence: running the required sequential runtime and Pages checks while the local Vinext development preview remained open caused Vite to reload `out/index.html` and print `Detected multiple renderers concurrently rendering the same context provider` repeatedly. The production builds, rendered contracts, Pages contracts, and fresh Playwright pages still completed with no browser console error or overlay.
- User impact: the clean-start workflow presents a framework warning after otherwise valid checks, making it unclear whether the candidate, dev preview, or exported artifact is broken.
- Root cause: the development watcher observes the generated Pages `out/` directory while a second Vinext process writes that target; build commands are sequential with each other but still concurrent with the retained dev server.
- Change made: stopped the dev server after browser acceptance and kept the production artifact verdict tied to the isolated build/test processes rather than the watcher output.
- Proposed tooling or workflow improvement: exclude generated Pages output from the development watcher or give preview and export isolated roots; document whether this repository permits keeping dev alive during Pages verification.
- Verification command and result: `npm test`, `python3 tool/public_site_ci.py`, and `npm run test:pages` all passed; the final 390 px, 1,440 px, and reduced-motion browser sessions reported zero console errors and zero framework overlays.
- Remaining risk: repeating Pages export while `npm run dev` is active can reproduce the warning even though the artifact is valid.


## Open review questions

- What exact artifact counts as “value” immediately after extraction: a conformance degree, a checklist, a findings view, a live board, or a prioritized adoption queue?
- What public install source will back the primary CTA?
- Is the first public page allowed to describe an alpha workflow, or must it wait until the install and adoption loop are independently reproducible?
- Which claims may be supported by synthetic witness boards, and which require a real external codebase or adopter?
- What is the smallest honest experimental lowering that lets this test publish a page without quietly becoming hand-authored frontend work?

## Evidence log

- The UIR repository was clean and synchronized at the start of the run.
- The current local suite passed 1,334 tests with 66 skips caused by the absent styling framework in that checkout.
- Fourteen contract checkers passed locally.
- The browser paint checker measured 141 boxes over 8 witness boards successfully.
- The public page project was created in a separate clean workspace and its development surface started successfully.
- The baseline checked page candidate contains 98 Nodes and has package fingerprint `a42600e063a9f26e05cc9d25412682910976bdfbefcbe3630934a95e880e1a53`.
- The revised checked draft keeps 98 Nodes and has compiler fingerprint `c58d6cad091acbc734095b23d1436c01025b1d587d6549b9532371fafe9bdad0`.
- The reproducible workflow artifacts identify runtime revisions `28e099a819ea6eeedbd03d8270ee4e2d8a9b538f64736a3bb1a0988d3c04dca3` and `adc657da06a2e98214c0750315076f70bd369a8e56f18761e8d0cf5e30c8f1ed`.
- The repository-owned site workflow is unit-tested, skill-validated, and documented in the UIR tooling repository.
- The official checker accepted the candidate structurally and named four global semantic closures as deferred.
- Official desktop and mobile board runs completed but were blocked from attestation and reached only 20 parts.
- The experimental web target passed lint, production build, and three rendered-HTML contract tests. The tests assert that all 98 Nodes render and that representative marketing copy exists only in UIR, not in the React target source.
- One bespoke 1200×630 social preview was generated and stored as a project asset.
- The self-inspection iteration derives a compact manifest for all 98 Nodes from the same checked package. No mock or parallel demo model is used.

## Review outcome

Open. Update this section only when the authoring, checking, projection, and published target have each produced evidence. Do not call the flow successful because the final page looks good.
