# Spell Compendium Two Name Proposals

Issue [#290](https://github.com/FrankHZ/dnd3.5-spellbook/issues/290), parent
[#263](https://github.com/FrankHZ/dnd3.5-spellbook/issues/263).
Two independent name proposals for targets 4022 and 4240 remove unsupported
meaning from the current Chinese names. Existing accepted bodies remain intact.
The proposals are project translations, without a claim of official terminology.
This report contains no source text, translations, or PDF spans.

The local-only private delivery is
`ed94784a5a5d21ee4dea0bf0693edbbb2fb5de13`, under
`data/dice-qa/books/86/issue-290/`. Public dispatch base is
`1bd5614f307adb82e4dcf17cd2cf948e31bb380b`; private dispatch base is
`63889c8e4fa0dcc180bd2e912d017de9e4558de7`.
No private data was pushed. CLI acceptance below means a validated proposal;
main-gate acceptance and production activation remain separate.

## Evidence And Delivery

`source-bound-reviews.jsonl` contains exactly two name increments.
`name-accepted.jsonl` filters those exact records from the actual formal QA
export. `current-inputs.json` binds complete current CHM text/HTML, canonical
English/HTML and mechanics. `prior-bindings.json` preserves precise previous
joint records at lines 158 and 191 and their Git revision. Neither previous
semantic review labels nor whole-target membership substitutes for field acceptance.

The actual SC pages 47 and 53, complete relevant entries, printing/credits page
and complete local official errata were reread. The checked printing is December
2005, v3.5; no target-specific amendment occurs in that errata. This does not
certify other printings. Private evidence binds original title quotes, complete
entry spans and page geometry to the two names. Current Chinese naming usage
supports the lexical proposal but supplies no new source authority.

The maintained source-bound validator and formal QA CLI validate the complete
candidate union. There is no new contract, overlap exception, candidate entity,
ID remapping or production consumer. All old independent records remain byte
identical as the prefix; all native accepted records and formal native fallback
remain byte identical. Frozen directories 259/264/265/268/270/272/274/276/278/
280/282/284/286/288 remain unchanged. The #288 handoff remains static.

| Measured candidate set | Fields |
| --- | ---: |
| Existing native accepted | 658 |
| Existing independent accepted | 142 |
| New independent names | 2 |
| Complete independent union | 144: 111 body, 33 name |
| Complete native + independent union | 802 |
| Formal native fallback | 1346 |
| Projected remaining fallback | 1202 |
| Formal field universe | 2004 |

The projection filters fields for review and does not become writer input.
33 unanswered source questions and one official resolution, all five body-gap
fields, target 4204's name and other residuals remain unchanged.

## Validation

The private `reproduce.py` records exact argv, cwd, public/private execution
heads, stdout/stderr and exits in append-only `reproduction-run-NN.json`.
The final recorded run is 04: all ten commands exit 0.

- Existing all-table checker verifies the designated temporary 315-operation
  rules patch copy and 56 unchanged tables. Content generation provenance and
  existing original rules/manifest fingerprints match before reading inputs.
- Formal QA revalidates all 144 independent fields with actual readonly inputs;
  native accepted/fallback bytes match. Six duplicate, native-name overlap,
  missing-target and stale Chinese/English/mechanics/HTML mutations are rejected.
- Aggregate checks reject four missing/duplicate field cases and prove the
  old union, complete complement and frozen question/gap evidence remain intact.
- The maintained actual-PDF verifier rereads four pages and 656 spans for two
  name bindings. Six stale/missing/duplicate PDF evidence cases are rejected;
  title quotes match actual spans. Poppler renders were visually inspected.
- `npm run -w data-tools dice:qa:test` passes. Scoped Git diff checks pass.
  Full remote `ci:portable` remains the merge gate.

Operator DBs, app-state, shared manifests, English, mechanics, descriptions,
summaries, existing relationships and import order are unchanged. There are no
production writes, deployment, activation or source uploads. Suspended PHB/
MinerU/SRD work and other books remain outside scope. Main-gate independently
reviews this delivery; the implementing task does not accept or merge it.
