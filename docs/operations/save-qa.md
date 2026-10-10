# Readonly Saving Throw QA

Use `npm run -w data-tools save:qa -- --content-db <content.sqlite> --out <fresh-private-directory> --inventory`
for a compact canonical saving-field inventory, or replace `--inventory` with
`--ids 1,2` for complete bounded English/current-Chinese contexts. Inventory and
explicit IDs are mutually exclusive. IDs must be unique positive integers, at
most 1,000. Relative paths resolve from the current checkout root, including
invocation from `data-tools/`. The caller supplies the readonly database; it is
never copied. Output must be a fresh child of configured `DATA_REPO_PATH/term-qa/`.
Existing output is refused. Serialized evidence is capped at 50 MiB, and input
size/mtime are checked before output. Reports measure retrieval time, peak RSS
and bytes, separately from any later semantic review.

Inventory has one record per canonical identity with raw saving field, named
families, selected variant/book, language status, header presence and SC flag.
It omits complete bodies and provenance. Freeze a deterministic selection and
its reasons before reviewing full contexts; metadata coverage is not corpus
semantic review or a precision/recall estimate.

Context mode reuses existing readonly selection/provenance helpers. Effective
row presence wins; CHM is used only when that row is absent, never to fill an
empty effective body. Output retains canonical mechanics/facets, complete DB
English/current Chinese and raw selected name/body provenance. Identity-bound
metadata is not acceptance. Language status is recorded even when no save seed
exists. Missing Chinese, English fallback and mismatched book remain unknown.
SC controls retain source-bound authority and cannot authorize DB-English
replacement. Component/full effective predecessor enrichment for proposals
belongs in private bounded evidence, not a corpus-wide public export.

Fortitude, Reflex and Will are retrieved separately from canonical saving field
and sentence/line body contexts mentioning saves or saving throws. Chinese
header/body scopes are indexed independently, without paragraph pairing.
Chinese aliases include strong/traditional forms and existing Reflex labels.
The existing mechanism-line parser also recognizes an embedded save header on
a combined mechanism line. A narrative mention of a header label is not itself
a mechanism header. Ordinary lowercase modal `will` is excluded; unusual
capitalization, abbreviations, punctuation and merged lines may still miss seeds.

Role labels (canonical, conditional, repeated, body) and English qualifiers
harmless/object/negates/half/partial/none are retrieval hints, not alignment or
mechanical validation. Unnamed later saves are `unspecified`/unknown; they may
refer to another spell or retry, so never inherit the canonical family.
`None` is retained as raw mechanics, not invented as a typed body occurrence.
Body role hints use local words and can confuse unrelated repetition language.

A supported family is **unverified**, never a pass. Absent family support in
an available scope is a **candidate**, never a confirmed error. Missing Chinese
save header is **unknown**, with the canonical field retained: the detail UI
renders saving mechanics independently of translated prose. Complete facets
use the existing localized display helper; partial/review facets retain raw
canonical context. Read complete paired context to establish scope, conditions,
repeated saves, qualifiers and distinct check types before proposing any edit.

Proposals remain private and unaccepted: retain full selected/effective
predecessor, canonical/rules/mechanic context, raw ownership, exact separate
text/HTML clauses and composed after-bodies. Preserve actions and unrelated
content. This command has no writer, acceptance, global replacement, source
book verification or production application. The [pilot](../reports/save-qa-pilot.md)
records the bounded evaluation and unresolved scope.

Run `npm run -w data-tools save:qa:test` for synthetic scope/role, multiple-save,
conditional/repeated/anonymous, inline-header, missing-language, row-presence,
provenance and readonly SQLite checks. It is part of the portable data-tools gate.
