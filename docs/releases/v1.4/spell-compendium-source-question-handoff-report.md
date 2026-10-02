# Spell Compendium current source-question handoff

[#416](https://github.com/FrankHZ/dnd3.5-spellbook/issues/416) supplies a private
Chinese review checklist for the current accepted reader notes. It binds the
selected [final fields](../../operations/sc-final-source-binding.md) at
`0688739d92a2aa9fb3eceeb444daa7260e711058` and the accepted #407 addendum at
`c61b9dea676cfd89bdfcaa6dcbcccbc99280d7c4`. This report contains no spell text.

Private delivery: `dac21d3e4070e5c1c6c6bc3a01e5e2a095b917b2`, under
`dice-qa/books/86/issue-416/` in the configured private data repository.
The private repository was not pushed. Public checkout base:
`66b0a9a7197c5458ffec2b4ef9a9fa290482f636`.

| Current inventory, derived from actual accepted records | Count |
| --- | ---: |
| Question occurrences keyed by target and original question ID | 40 |
| Bodies with current reader notes | 38 |
| Distinct raw question-ID strings | 37 |
| Frozen English statement citations checked | 88 |
| Relevant PDF pages checked, including context, printing and complete errata | 76 |

The repeated short IDs bind separately to targets 3828/3870 and
4237/4469/4785. Two bodies each carry two independently answerable questions.
No occurrence is merged by its short label. The checklist excludes the resolved
4709 case, historical source/version absence, and #354's pending external
relationships. All included questions remain source-unresolved.

The private checklist provides current Chinese and original English titles,
original printing and actual printed/PDF locators, the frozen English statements,
expandable complete context, applicable errata findings, exact current Chinese
notes and separate answer/evidence/source-type fields. `question-bindings.jsonl`
binds each pair to exact accepted rows, names, complete body text/HTML and
source page/span records. It is static delivery evidence, not a source authority.
The old #270/#288/#313 files remain unchanged and are not used as a final-state
inventory. The reused #270 printing evidence is bound through the surviving
fixed #365 Git tree rather than an unavailable historical ref in old navigation.

`verification-root.json` and `verification-package.json` record passing checks
from public root and `data-tools/`, with actual argv/CWD, public execution base,
private execution revision `e25a1b73ad3ffb3915c1e51dee53f6042e886e24` and committed
helper byte equality. Both independently rederive the same fixed delivery:

- Exact pair coverage, target/name/language mapping and full current note fidelity.
- Current note presence in parsed HTML, with text and HTML prefixes checked
  independently for the addendum's three bodies.
- Every frozen quote agrees with actual PDF spans in order, ignoring only
  whitespace serialization; context page/span references resolve.
- Complete SC/PHB errata and printing records agree with accepted evidence;
  SC and scanned PHB printing pages additionally received visual review.
- Thirteen missing, duplicate, cross-target, stale text/HTML/note/name/language,
  unbound revision/span, quote substitution and wrong-page controls reject.

Public links, navigation, source boundaries and diff whitespace were checked.
Full remote `ci:portable` is the PR gate; its final-head result is recorded in
the PR checks. Reused PDF parsing emits existing color-profile diagnostics on
stderr; exact text/span and complete-page checks pass. This is bounded citation
and fidelity verification, not another full-book semantic QA or a rules ruling.

Only this private issue directory and the public source-free documents were
written. Unrelated private staging and main-gate evidence were preserved.
No source, canonical field, operator/app-state/stable375 database, runtime,
fallback/import order, deployment or external delivery changed. Main-gate owns
review and acceptance; the user decides whether and how to forward the private
checklist. See [current navigation](../../operations/sc-source-questions.md).
