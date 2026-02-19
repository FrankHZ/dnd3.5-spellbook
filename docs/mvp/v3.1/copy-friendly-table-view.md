# v3.1 Implementation Notes: Copy-Friendly Table View (3.2)

## Scope

This document records the implementation decision for v3.1 plan section `3.2`.

It defines `3.2` as two subfeatures so users can copy quickly for common workflows and still have structured export controls when needed.

## Decision Summary

`3.2` is split into:

1. **Simple copy button**
2. **Advanced copy dialog**

Both paths output TSV and target spreadsheet paste workflows (Google Sheets / Excel).

## 1. Simple Copy Button

Purpose:

- provide one-click copy for the currently visible prepared board

Behavior:

- action label: `Copy Table`
- output format: TSV
- output shape mirrors the current prepared layout:
  - columns = `Level 0` .. `Level 9`
  - each cell contains only the effective display name (base name or override)
- ordering follows current UI column/row ordering so copy output matches what the user sees

## 2. Advanced Copy Dialog

Purpose:

- provide configurable TSV export without introducing CSV parsing/import complexity

Behavior:

- action label: `Advanced Copy`
- user can choose copy mode:
  - `simple`: same semantics as the simple copy button
  - `detailed`: exports fixed columns for spreadsheet workflows
- when `detailed` is selected, user can choose whether rows are aggregated

Detailed columns:

- `SpellId`
- `Name (EN)`
- `Name (ZH)`
- `Level`
- `PreparedCount`
- `UsedCount`
- `DisplayName`
- `Metamagic`
- `LevelAdj`
- `Notes`

Aggregation behavior (`detailed` mode):

- `aggregate = false`: one TSV row per prepared entry
- `aggregate = true`: merge rows with the same detailed identity fields and sum:
  - `PreparedCount`
  - `UsedCount`

## Determinism Rules

- fixed column order for all outputs
- stable traversal based on prepared entry order
- normalized TSV cells (tabs/newlines sanitized to spaces) for predictable spreadsheet paste

## Non-Goals

- no CSV import/export pipeline
- no slot legality enforcement
- no backend/cloud sync

