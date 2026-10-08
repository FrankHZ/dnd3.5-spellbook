# Readonly Action QA

`npm run -w data-tools action:qa -- --content-db <content.sqlite> --out <new-directory> --sample 100`
reads canonical `SpellContent` English/mechanics and selected Chinese text from
`I18nSpellText`. Relative arguments resolve from the current checkout root, even
when invoked in `data-tools/`. The caller supplies the DB path; no DB is copied.
Output must be a fresh child of configured `DATA_REPO_PATH/term-qa/issue-622/`.
Existing evidence is never overwritten. `--ids 1,2` selects explicit stable IDs;
`--variant chm` selects the legacy row explicitly. Sample/ID limits are 1–1,000.

Default selection mirrors API row-presence semantics: prefer `effective`, then
`chm` only if no effective row exists. An empty effective body stays empty.
Evidence retains the actual selected variant, book, source key, raw name/body
provenance and complete English/Chinese text, with optional separate CHM contrast.
Identity-bound raw metadata is not authenticated acceptance. English fallback,
missing Chinese, unavailable Chinese casting headers and book mismatch remain
unknown. An explicit CHM selection does not grant source authority.

The fixed seeds cover standard, move/move-equivalent, swift, immediate, free,
full-round/fullround and no-action phrases, plural forms and coordinated lists.
Accepted lexical aliases include immediate 直觉/即时/瞬间 and swift 迅捷/快捷/快速;
these are distinct families. Chinese mechanism/header lines use the existing
parser classification and are excluded from body matching. English casting time
is inspected separately from body occurrences. Every occurrence retains its
line, offset, complete line context, count and heuristic activation/end/sustain
role. Roles are retrieval hints, not validated semantic alignment. No-action
phrases can denote cost, incapacity or an exception; context must settle this.

A missing action kind or lower occurrence count in the same field produces a
**candidate**, never a confirmed error. A lexical match produces **unknown**,
never a pass: unrelated paragraphs, conditions, negation and counts can still
differ. Evidence preserves full bodies for that review. Paragraphs are not paired
by ordinal position; translated paragraphs often merge or split. This tool does
not estimate recall, accept content, normalize terminology or apply corrections.

Run `npm run -w data-tools action:qa:test` for synthetic omission, wrong-action,
header/body scope, repeated/unrelated paragraph, coordinated-list, synonym,
fallback, provenance and readonly SQLite regressions. It is included in the
portable data-tools gate. The real bounded evaluation is recorded in the
[source-free pilot report](../reports/action-qa-pilot.md). Review decisions and
source excerpts belong in the private output directory; the public repo contains
only tool code, synthetic fixtures and aggregate reports.
