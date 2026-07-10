# v1.1 Freeze

## Status

**v1.1 FROZEN**

This document records the final canonical documentation state for the v1.1
formal public release handoff.

## Canonical Source Order

When v1.1 documents conflict, treat this freeze document as authoritative over
earlier v1.1 planning documents.

Use this precedence order for v1.1:

1. `docs/releases/v1.1/FREEZE.md`
2. current focused topic docs changed by v1.1
3. current operational docs changed by v1.1
4. focused v1.1 plan documents

## Frozen Deliverables

1. Production hardening for the existing Cloudflare Workers frontend and
   Lightsail/Nginx/Express API topology.
2. Full source-backed spell corpus import through maintained rules/content DB
   tooling.
3. Rulebook-backed corpus patch flow with structured `insertRulebook` and
   `insertSpell` validation.
4. Focused frontend content acceptance pass for rulebook scope, Settings
   layout, About/Credits, and representative v1.1 content.
5. Remote backend and content DB activation on `https://api.d20spellcodex.com`.

## Final As-Built Summary

### 1. Production Hardening

Shipped behavior:

- Cloudflare keeps `www.d20spellcodex.com` and `api.d20spellcodex.com`
  proxied; the apex domain remains intentionally unassigned.
- Public HTTP requests redirect to HTTPS through Cloudflare.
- Cloudflare SSL/TLS mode is Full Strict, minimum TLS is 1.2, TLS 1.3 is on,
  and 0-RTT remains off.
- Cloudflare Managed Free Ruleset remains enabled through the Rulesets API.
- The backend process honors `HOST` and binds to `127.0.0.1`.
- Nginx SSL API-only mode redirects non-ACME HTTP to HTTPS while preserving the
  webroot ACME challenge path.
- SSH remains key-only and restricted by the Lightsail network rule.
- `unattended-upgrades` and `certbot.timer` are active on the origin.

Accepted evidence:

- PR #57 merged production hardening changes.
- `certbot renew --dry-run` succeeded after the Nginx redirect change.
- Backend deploy to `9cf77e4` completed on July 10, 2026 at 01:36:40 UTC.
- `GET https://api.d20spellcodex.com/api/status/app` reports backend
  `shortSha: 9cf77e4`, `ref: main`, and deployed time
  `2026-07-10T01:36:40Z`.
- CORS accepts `Origin: https://www.d20spellcodex.com` and does not emit a
  permissive allow-origin header for `Origin: https://evil.example`.
- Unauthenticated `GET https://api.d20spellcodex.com/api/status/db` returns
  `404`.

Frozen clarification:

- DNSSEC, HSTS preload, Bot Fight, aggressive cache rules, and fail2ban remain
  deferred pending operator acceptance.
- DB upload remains operator-owned, not CD-owned.

### 2. Full Spell Corpus And Content DB

Shipped behavior:

- Maintained full-corpus tooling imported the accepted source-backed spells.
- Structured rulebook patch tooling validates and applies rulebook rows before
  importing rulebook-backed spell rows.
- The current rules DB manifest verifies `189/189` spell operations and
  `41/41` rulebook operations with no missing or mismatched operations.
- The normalized content DB contains `5097` spell rows and `151`
  `RulebookContent` rows.
- Runtime spell reads remain content-backed by default.

Accepted evidence:

- PR #56 merged the full-corpus data-pipeline handoff.
- PR #58 recorded local full-corpus apply evidence.
- PR #59 merged rulebook-backed corpus patch flow.
- `npm run -w data-tools rules:manifest:verify`: passed.
- `npm run -w data-tools rules:content:audit`: passed with `5097` spells and
  `3636` review issues.
- `npm run -w data-tools rules:content:generate`: passed with `5097` spells.
- `npm run -w data-tools rules:content:import`: passed.
- `npm run -w data-tools rules:content:parity`: passed with `5097` spells.
- `npm run -w data-tools rules:content:meta`: passed with content DB checksum
  `f4c6478f9dbf66731330c6469e02a9d13c4edf91310734b5703400b3ae1197c9`.
- Local `RulesContentBuild` records parent repo commit
  `9cf77e4d6dda7b2700be5a63968e3de000691545` and nested data repo commit
  `be38b7355f6ca04ae2b9d7d8d800314632745727`.

Frozen clarification:

- The nested local `data/` repo is still the source for content-bearing local
  patch data and review decisions. It is not part of the public parent repo.
- Remaining ambiguous corpus/source-label rows are follow-up review work, not
  v1.1 release blockers.

### 3. Remote DB Activation

Shipped behavior:

- The local rules, content, and app-state SQLite files were uploaded to
  `awsTokyo:~/data/`.
- `~/update-db.sh` activated the incoming DB files, created backups for the
  existing rules and content DBs, restarted `spellbook-api`, and passed its
  `/api/rulebooks` smoke test.
- A remote operator token is configured for `GET /api/status/db`.

Accepted evidence:

- Remote update created:
  - `/opt/spellbook/data/spellbook.db.bak.20260710T012954Z`
  - `/opt/spellbook/data/content.sqlite.bak.20260710T012955Z`
- Operator `GET http://127.0.0.1:3000/api/status/db` reports:
  - `activeSpellReadSource: "content"`
  - `databases.content.fileName: "content.sqlite"`
  - `databases.content.exists: true`
  - `databases.contentAlias.matchesContent: true`
  - `spellCount: 5097`
  - `issueCount: 3636`
  - `parentRepoCommit: 9cf77e4d6dda7b2700be5a63968e3de000691545`
  - `dataRepoCommit: be38b7355f6ca04ae2b9d7d8d800314632745727`
  - `RulebookContent: 151`
  - `SpellContent: 5097`
  - `SpellTaxonomyFacet: 8971`
  - `SpellComponent: 46013`
  - `SpellMechanicFacet: 40776`
  - `RulesContentIssue: 3636`
- Public `GET https://api.d20spellcodex.com/api/status/app` reports content
  status `ok`, active read source `content`, `spellCount: 5097`, and
  `issueCount: 3636`.

Frozen clarification:

- Public `/api/status/app` is the user-facing status surface.
- Detailed `/api/status/db` remains operator-facing and token-protected.

### 4. Frontend Content Pass

Shipped behavior:

- Settings now separates General and Rulebooks into hash-addressable tabs.
- Rulebook scope summaries link directly to the Rulebooks tab.
- Rulebook selector grouping is clearer for the expanded v1.1 corpus.
- About/Credits acknowledge the Spells Full source.
- Frontend behavior remains focused content acceptance, not the v1.3 redesign.

Accepted evidence:

- PR #60 merged the frontend content pass.
- `npm run ci:portable`: passed.
- `npm run i18n:check`: passed.
- Production route smoke returned `200` for:
  - `https://www.d20spellcodex.com/`
  - `https://www.d20spellcodex.com/search`
  - `https://www.d20spellcodex.com/browse`
  - `https://www.d20spellcodex.com/settings#rulebooks`
  - `https://www.d20spellcodex.com/about`
- Production Settings chunk request returned `200`.
- Representative content API checks returned one result each:
  - `Fiery Assault` scoped to Tome of Battle rulebook id `88`
  - `Spider Poison` scoped to Spell Compendium rulebook id `86`
- Production rulebook API includes `SpC`, `ToB`, and Dragon Magazine rulebook
  entries.

Frozen clarification:

- Rulebook grouping in the frontend is still display logic. v1.2 should add
  formal publication/rulebook metadata so frontend grouping no longer relies on
  heuristics.

## Validation Evidence

| Check | Result | Notes |
| ----- | ------ | ----- |
| PR #55 | Pass | v1.1 release plan opened |
| PR #56 | Pass | Full-corpus data-pipeline handoff |
| PR #57 | Pass | Production hardening |
| PR #58 | Pass | Local full-corpus apply evidence |
| PR #59 | Pass | Rulebook-backed corpus patch flow |
| PR #60 | Pass | Frontend content pass |
| `npm run -w data-tools rules:manifest:verify` | Pass | 189 spell ops and 41 rulebook ops verified |
| `npm run -w data-tools rules:content:audit` | Pass | 5097 spells, 3636 issues |
| `npm run -w data-tools rules:content:generate` | Pass | Generated normalized content artifact |
| `npm run -w data-tools rules:content:import` | Pass | Local content DB refreshed |
| `npm run -w data-tools rules:content:parity` | Pass | 5097 spells |
| `npm run -w data-tools rules:content:meta` | Pass | Parent commit `9cf77e4`, data commit `be38b735` |
| `npm run -w data-tools rulebooks:labels:audit` | Pass | 151 rulebooks; 127 runtime-visible; 46 need review; 24 deferred |
| `npm run ci:portable` | Pass | Contracts, server, data-tools, web tests/typecheck/build |
| `npm run i18n:check` | Pass | 14 namespaces audited |
| Remote DB update | Pass | `~/update-db.sh` activated rules/content/app-state DB files |
| Remote backend deploy | Pass | `./deploy-backend.sh` deployed `9cf77e4` |
| Public API status | Pass | Backend `9cf77e4`, content `5097` spells |
| Operator DB status | Pass | Token-protected `/api/status/db` matches local meta |
| Public DB status privacy | Pass | Unauthenticated `/api/status/db` returns `404` |
| Production route smoke | Pass | `/`, `/search`, `/browse`, `/settings#rulebooks`, `/about` returned `200` |
| Production CORS allowed origin | Pass | `https://www.d20spellcodex.com` allowed |
| Production CORS unallowed origin | Pass | `https://evil.example` not allowed |
| Representative content smoke | Pass | `Fiery Assault` and `Spider Poison` found with scoped rulebooks |

## Known Deferred Work

- v1.2 should add formal publication/rulebook metadata to the DB/API contract
  so frontend grouping and filtering no longer rely on heuristic labels.
- v1.2 should add a Publications page to replace Settings as the primary
  user-facing rulebook/publication management surface.
- Large-scale Chinese/English translation and proofreading QA remains v1.2
  work after the full corpus is stable.
- Remaining ambiguous corpus/source-label rows remain follow-up review work.
- Official WotC web articles and web enhancements remain outside the v1.1
  published-corpus gate.
- Spell Compendium PDF-backed source/body variant sweep remains follow-up work.
- Static/offline search or HTML artifacts remain later stable-track work.
- HSTS preload, Bot Fight, fail2ban, aggressive cache rules, and deeper
  rollback automation remain deferred.

## Handoff Notes

- Use `docs/roadmap.md` for next-work ordering after this freeze.
- Do not treat older v1.1 plan documents as newer than this snapshot.
- Use `docs/operations/deployment.md` for the current deployment and manual DB
  activation workflow.
- Use `docs/stable-backlog.md` for deferred stable-version candidates.
