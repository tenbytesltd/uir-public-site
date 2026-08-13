#!/usr/bin/env python3
from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new)


author = Path("uir/author_site.py")
text = author.read_text(encoding="utf-8")

replacements = [
    (
        "The user confirmed installation and adoption as the job, extraction as the primary path, and build-from-zero as the secondary path.",
        "The user asked the public page to explain UIR accurately, lead with the representation itself, and keep implementation and tooling claims secondary.",
        "session provenance summary",
    ),
    (
        "UIR by Tenbytes Ltd makes extraction the shortest path to seeing interface decisions, drift, and silence.",
        "UIR is a framework-independent representation of what an interface means, with the design system as the realization backend.",
        "package summary",
    ),
    (
        "Explain UIR, prove the extraction-first value path, expose this page as a public UIR implementation, and invite adoption without overstating alpha maturity.",
        "Explain UIR as the framework-independent representation of interface meaning, show how it meets the design system, prove this page is authored from UIR, and separate the alpha tooling from the standard itself.",
        "surface purpose",
    ),
    ('NAV_EXTRACT = node("nav-extract", "link", "Extract", parent=NAV, salience="secondary")', 'NAV_EXTRACT = node("nav-extract", "link", "Existing UI", parent=NAV, salience="secondary")', "nav existing"),
    ('NAV_BUILD = node("nav-build", "link", "Build from zero", parent=NAV, salience="secondary")', 'NAV_BUILD = node("nav-build", "link", "New UI", parent=NAV, salience="secondary")', "nav new"),
    ('NAV_STANDARD = node("nav-standard", "link", "Why a standard", parent=NAV, salience="secondary")', 'NAV_STANDARD = node("nav-standard", "link", "Why UIR", parent=NAV, salience="secondary")', "nav why"),
    ('NAV_SOURCE = node("nav-source", "link", "View source", parent=NAV, salience="secondary")', 'NAV_SOURCE = node("nav-source", "link", "This site", parent=NAV, salience="secondary")', "nav site"),
    (
        '"hero-title", "heading", "Make the interface explicit before code gets the final word."',
        '"hero-title", "heading", "Write down what the interface means."',
        "hero title",
    ),
    (
        '"UIR is one self-contained source for what an interface looks like, what it means, which design decisions realize it, and what remains unresolved."',
        '"UIR is a framework-independent representation of a screen: its structure, roles, behaviour, states, relationships, and unresolved gaps. A design system supplies the realization. Code is a target."',
        "hero lead",
    ),
    ('HERO_PRIMARY = node("hero-primary", "link", "Extract your interface", parent=HERO_ACTIONS, salience="primary")', 'HERO_PRIMARY = node("hero-primary", "link", "Try it on existing UI", parent=HERO_ACTIONS, salience="primary")', "hero primary"),
    ('HERO_SECONDARY = node("hero-secondary", "link", "See the representation", parent=HERO_ACTIONS, salience="secondary")', 'HERO_SECONDARY = node("hero-secondary", "link", "How UIR fits", parent=HERO_ACTIONS, salience="secondary")', "hero secondary"),
    (
        'node("problem-title", "heading", "Your UI has several clues. It still has no source.", parent=PROBLEM, salience="primary")',
        'node("problem-title", "heading", "Code can show how a screen was built. It cannot tell you what the screen means.", parent=PROBLEM, salience="primary")',
        "problem title",
    ),
    (
        'node("problem-lead", "paragraph", "Design files show appearance. Code shows one implementation. Design systems show reusable decisions. None carries the complete visible and semantic interface as one authority.", parent=PROBLEM, salience="secondary", overrides={"type": "type-lead"})',
        'node("problem-lead", "paragraph", "Design captures appearance. Code captures one implementation. A design system captures reusable realization. The interface itself — its semantic structure and obligations — still has no canonical form.", parent=PROBLEM, salience="secondary", overrides={"type": "type-lead"})',
        "problem lead",
    ),
    ('("problem-design", "The design", "Fast to see, but semantics and implementation drift arrive later.")', '("problem-design", "The design", "Appearance is explicit. Meaning is mostly inferred.")', "problem design"),
    ('("problem-code", "The code", "Executable, but the intent it lowered is usually absent.")', '("problem-code", "The code", "Behaviour is executable, but intent is distributed through implementation details.")', "problem code"),
    ('("problem-system", "The system", "Reusable values and Pieces, but not the whole interface or its unresolved meaning.")', '("problem-system", "The system", "Components and tokens define how roles are realized, not what this particular screen means.")', "problem system"),
    ('node("mechanism-kicker", "paragraph", "ONE PACKAGE · TWO READABLE SIDES", parent=MECHANISM, salience="quiet", overrides={"type": "type-label", "ink": "ink-muted"})', 'node("mechanism-kicker", "paragraph", "THE MISSING LAYER", parent=MECHANISM, salience="quiet", overrides={"type": "type-label", "ink": "ink-muted"})', "mechanism kicker"),
    ('node("mechanism-title", "heading", "See the drawing. Inspect the meaning. Approve both.", parent=MECHANISM, salience="primary")', 'node("mechanism-title", "heading", "UIR describes the screen. The design system decides how to draw it.", parent=MECHANISM, salience="primary")', "mechanism title"),
    (
        'node("mechanism-copy", "paragraph", "An agent compiles intent and named evidence into UIR. The live prototype derives a visual board and semantic inspector from the same package. Corrections go back to that one addressable fact.", parent=MECHANISM, salience="secondary", overrides={"type": "type-lead"})',
        'node("mechanism-copy", "paragraph", "UIR owns the facts that should survive a framework change. The design system owns the pieces and values that realize those facts. Put them together and the implementation becomes replaceable.", parent=MECHANISM, salience="secondary", overrides={"type": "type-lead"})',
        "mechanism copy",
    ),
    ('("flow-input", "01 · Named evidence", "User words, product sources, and assets explicitly supplied for this run.")', '("flow-input", "01 · The screen", "Structure, reading order, roles, behaviour, conditions, navigation, and data relationships.")', "flow input"),
    ('("flow-package", "02 · One UIR package", "Visible facts, semantic facts, design system, provenance, and explicit gaps.")', '("flow-package", "02 · The design system", "Pieces and design values that realize roles without leaking implementation details into UIR.")', "flow package"),
    ('("flow-prototype", "03 · Live projection", "A board and inspector that can be reproduced from the package alone.")', '("flow-prototype", "03 · The result", "A board, a web app, a native app, or another target derived from the same meaning.")', "flow result"),
    ('node("showcase-kicker", "paragraph", "OPEN SOURCE · LIVING PROOF", parent=SHOWCASE, salience="quiet", overrides={"ink": "ink-accent", "type": "type-label"}, sources=(SRC_USER, SRC_SITE_REPO))', 'node("showcase-kicker", "paragraph", "THIS SITE IS UIR", parent=SHOWCASE, salience="quiet", overrides={"ink": "ink-accent", "type": "type-label"}, sources=(SRC_USER, SRC_SITE_REPO))', "showcase kicker"),
    ('node("showcase-title", "heading", "Do not take the standard on trust. Inspect the site that runs on it.", parent=SHOWCASE, salience="primary", overrides={"ink": "ink-inverse"}, sources=(SRC_USER, SRC_SITE_REPO))', 'node("showcase-title", "heading", "The page you are reading is generated from its own representation.", parent=SHOWCASE, salience="primary", overrides={"ink": "ink-inverse"}, sources=(SRC_USER, SRC_SITE_REPO))', "showcase title"),
    (
        'node("showcase-copy", "paragraph", "This page is not a hand-built illustration of UIR. Its content, structure, design bindings, provenance, and gaps are authored as one versioned UIR package. The generic renderer and inspector consume that package; CI checks that the public source still reproduces it.", parent=SHOWCASE, salience="secondary", overrides={"ink": "ink-inverse", "type": "type-lead"}, sources=(SRC_USER, SRC_REPO, SRC_SITE_REPO))',
        'node("showcase-copy", "paragraph", "Its content, structure, semantics, design bindings, provenance, and gaps live in the checked UIR package. React is only the renderer. The inspector reads the same package.", parent=SHOWCASE, salience="secondary", overrides={"ink": "ink-inverse", "type": "type-lead"}, sources=(SRC_USER, SRC_REPO, SRC_SITE_REPO))',
        "showcase copy",
    ),
    ('("showcase-source", "01 · Read the source", "Follow the authoring program into the checked package, then into the generic renderer. Marketing copy never becomes a second authority.")', '("showcase-source", "01 · Read the UIR", "The authoring source compiles to the checked package consumed by the page.")', "showcase source"),
    ('("showcase-review", "02 · Review the evidence", "Every pull request publishes a readable UIR review: reproducibility, exact gate verdicts, declared deferrals, gaps, contexts, and board limits.")', '("showcase-review", "02 · Check the proof", "CI verifies that the package is reproducible and binds it to the reviewed UIR evidence.")', "showcase proof"),
    ('("showcase-inspect", "03 · Trace this page", "Use “Inspect this page” to select any visible Node and read its role, Piece, bindings, provenance, controls, and explicit gap.")', '("showcase-inspect", "03 · Inspect any node", "Select visible content to see the role, Piece, bindings, provenance, controls, and gaps behind it.")', "showcase inspect"),
    ('node("showcase-repository", "link", "Explore the public site repository", parent=SHOWCASE_ACTIONS, salience="primary", sources=(SRC_SITE_REPO,))', 'node("showcase-repository", "link", "View the site source", parent=SHOWCASE_ACTIONS, salience="primary", sources=(SRC_SITE_REPO,))', "showcase action"),
    ('node("quickstart-kicker", "paragraph", "THE SHORTEST PATH TO VALUE", parent=QUICKSTART, salience="quiet", overrides={"ink": "ink-muted", "type": "type-label"})', 'node("quickstart-kicker", "paragraph", "EXISTING INTERFACE", parent=QUICKSTART, salience="quiet", overrides={"ink": "ink-muted", "type": "type-label"})', "quickstart kicker"),
    ('node("quickstart-title", "heading", "Start with the interface you already ship.", parent=QUICKSTART, salience="primary")', 'node("quickstart-title", "heading", "Use extraction to see what your current UI actually says.", parent=QUICKSTART, salience="primary")', "quickstart title"),
    (
        'node("quickstart-copy", "paragraph", "The reader uses your own compiler and styling framework. It records what it could observe, refuses silent fallbacks, and separates decided work from unchecked silence.", parent=QUICKSTART, salience="secondary", overrides={"type": "type-lead"})',
        'node("quickstart-copy", "paragraph", "The alpha extractor reads supported implementation evidence and emits UIR facts it can justify. What it cannot justify remains explicit instead of becoming a guess.", parent=QUICKSTART, salience="secondary", overrides={"type": "type-lead"})',
        "quickstart copy",
    ),
    ('("quickstart-read", "1 · Read", "Point UIR at the app and the design-system sources you authorize for this run.",', '("quickstart-read", "1 · Read", "Point the extractor at the app and the design-system sources you want it to inspect.",', "quickstart read"),
    ('("quickstart-see", "2 · See", "Render the checklist, findings, and explicit remainder without turning silence into a pass.",', '("quickstart-see", "2 · Inspect", "Review the representation, the evidence behind each fact, and the gaps it could not resolve.",', "quickstart inspect"),
    ('("quickstart-adopt", "3 · Adopt", "Put the same measurement at the pull request, where design conformance is already being judged.",', '("quickstart-adopt", "3 · Use", "Put the representation beside the implementation and make drift a reviewable change.",', "quickstart use"),
    ('node("build-kicker", "paragraph", "THE SECOND PATH", parent=BUILD, salience="quiet", overrides={"type": "type-label", "ink": "ink-muted"})', 'node("build-kicker", "paragraph", "NEW INTERFACE", parent=BUILD, salience="quiet", overrides={"type": "type-label", "ink": "ink-muted"})', "build kicker"),
    ('node("build-title", "heading", "Start from words, not a blank canvas.", parent=BUILD, salience="primary")', 'node("build-title", "heading", "For a new screen, author meaning before implementation.", parent=BUILD, salience="primary")', "build title"),
    (
        'node("build-copy", "paragraph", "For a new interface, the user speaks in product language. The agent compiles one confirmed decision at a time, the prototype makes visible and invisible meaning inspectable, and production code waits until the package is accepted and frozen.", parent=BUILD, salience="secondary", overrides={"type": "type-lead"})',
        'node("build-copy", "paragraph", "Describe the product intent in ordinary language. An agent can compile confirmed decisions into UIR, while the board makes those decisions reviewable before any framework becomes the source of truth.", parent=BUILD, salience="secondary", overrides={"type": "type-lead"})',
        "build copy",
    ),
    ('"Describe the job, audience, real content, and named evidence."', '"Describe the job, user, real content, and constraints."', "build step 1"),
    ('"Compile each confirmed decision into the one UIR package."', '"Compile confirmed interface decisions into UIR."', "build step 2"),
    ('"Correct the visual board and semantic inspector conversationally."', '"Review the board and semantic inspector; correct the representation, not a second artifact."', "build step 3"),
    ('"Freeze only after every required gap is explicit and both sides are accepted."', '"Choose a target only after the representation is accepted."', "build step 4"),
    ('node("standard-kicker", "paragraph", "BUILT TO EARN THE WORD STANDARD", parent=STANDARD, salience="quiet", overrides={"type": "type-label", "ink": "ink-muted"})', 'node("standard-kicker", "paragraph", "WHY A REPRESENTATION", parent=STANDARD, salience="quiet", overrides={"type": "type-label", "ink": "ink-muted"})', "standard kicker"),
    ('node("standard-title", "heading", "Open where trust depends on it. Strict where comparability depends on it.", parent=STANDARD, salience="primary")', 'node("standard-title", "heading", "Not a framework. Not a design tool. Not another markup language.", parent=STANDARD, salience="primary")', "standard title"),
    (
        'node("standard-copy", "paragraph", "The contracts, checker, extractors, preview, and intake are designed to be open under Apache 2.0. The language stays vendor-neutral and framework-independent. Missing meaning is counted; it is never repaired with a convenient guess.", parent=STANDARD, salience="secondary", overrides={"type": "type-lead"})',
        'node("standard-copy", "paragraph", "UIR is the layer between design and code where interface meaning can live independently of either. The format is strict about meaning and deliberately silent about implementation.", parent=STANDARD, salience="secondary", overrides={"type": "type-lead"})',
        "standard copy",
    ),
    ('("standard-source", "One source", "The interface and its compiled design system travel together.")', '("standard-source", "Framework-independent", "A UIR fact should remain true if React is replaced by Flutter, UIKit, or something else.")', "standard framework"),
    ('("standard-evidence", "Every claim has provenance", "Declared, derived, and inferred decisions never collapse into one confidence-free answer.")', '("standard-evidence", "Design-system backed", "UIR names roles; the design system maps those roles to Pieces and values.")', "standard ds"),
    ('("standard-gaps", "Silence is forbidden", "Missing, external, and waived work stays addressable and visible.")', '("standard-gaps", "Explicit gaps", "Unknown meaning stays unknown. Silence is not converted into a convenient default.")', "standard gaps"),
    ('("standard-targets", "Targets come later", "Frameworks lower a frozen UIR; they do not redefine it.")', '("standard-targets", "One authority", "Boards and target implementations are projections of the representation, not parallel sources to keep in sync.")', "standard authority"),
    ('node("status-title", "heading", "Alpha, with the unfinished parts in view.", parent=STATUS, salience="primary")', 'node("status-title", "heading", "A definition under test.", parent=STATUS, salience="primary")', "status title"),
    (
        'node("status-copy", "paragraph", "The Step 1 toolchain, checker, renderer, inspector, conformance measurement, and CI gates exist. This site\'s source and review evidence are public. UIR v0.1 is not frozen, the general install distribution seam is not open, and production lowering remains later work.", parent=STATUS, salience="secondary", overrides={"type": "type-lead"}, sources=(SRC_USER, SRC_REPO, SRC_SITE_REPO))',
        'node("status-copy", "paragraph", "UIR v0.1 is still being discovered through implementation. The current tools exist to test the model: can real interfaces be expressed without smuggling framework or layout decisions into the representation?", parent=STATUS, salience="secondary", overrides={"type": "type-lead"}, sources=(SRC_USER, SRC_REPO, SRC_SITE_REPO))',
        "status copy",
    ),
    ('"Working now — deterministic package checking, extraction, live boards, semantic inspection, and measured findings."', '"Working now — deterministic authoring, package checking, extraction experiments, live boards, semantic inspection, and CI evidence."', "status working"),
    ('"Open now — contract gaps and deferred checks that still block the v0.1 freeze."', '"Still open — vocabulary and contract gaps that must be resolved before v0.1 can freeze."', "status open"),
    ('"Not claimed — a finished public install, production target compiler, or broad adopter ecosystem."', '"Not claimed — a stable public install, production target compilers, or a mature adopter ecosystem."', "status not claimed"),
    ('node("footer-copy", "paragraph", "Created and stewarded by Tenbytes Ltd. The interface is the source. Code is a derived artifact.", parent=FOOTER, salience="quiet", overrides={"ink": "ink-inverse"}, sources=(SRC_USER, SRC_TENBYTES, SRC_REPO))', 'node("footer-copy", "paragraph", "Created and stewarded by Tenbytes Ltd. Describe the interface. Let the design system realize it. Treat code as a target.", parent=FOOTER, salience="quiet", overrides={"ink": "ink-inverse"}, sources=(SRC_USER, SRC_TENBYTES, SRC_REPO))', "footer copy"),
    ('FOOTER_ACTION = node("footer-action", "link", "Return to extraction", parent=FOOTER, salience="secondary")', 'FOOTER_ACTION = node("footer-action", "link", "Try extraction", parent=FOOTER, salience="secondary")', "footer action"),
]

for old, new, label in replacements:
    text = replace_once(text, old, new, label)

author.write_text(text, encoding="utf-8")

# Keep rendered-output assertions pointed at the UIR-authored copy. The test still
# verifies that none of these phrases leak into the generic renderer.
test_path = Path("tests/rendered-html.test.mjs")
test = test_path.read_text(encoding="utf-8")
test_replacements = [
    ("Make the interface explicit before code gets the final word\\.", "Write down what the interface means\\."),
    ("Do not take the standard on trust\\. Inspect the site that runs on it\\.", "The page you are reading is generated from its own representation\\."),
    ("Explore the public site repository", "View the site source"),
    ('"Make the interface explicit before code gets the final word."', '"Write down what the interface means."'),
    ('"Start with the interface you already ship."', '"Use extraction to see what your current UI actually says."'),
    ('"Alpha, with the unfinished parts in view."', '"A definition under test."'),
    ('"Do not take the standard on trust. Inspect the site that runs on it."', '"The page you are reading is generated from its own representation."'),
    ('"Explore the public site repository"', '"View the site source"'),
]
for old, new in test_replacements:
    test = replace_once(test, old, new, f"test: {old}")
test_path.write_text(test, encoding="utf-8")
