# Stable Backlog

This document tracks valuable stable-track follow-up candidates that are not yet
official roadmap commitments.

It is not the roadmap. `docs/roadmap.md` owns the official order after a pause.

## Candidate Lifecycle

- Add a candidate here when it is worth preserving but does not yet have clear
  priority, scope, owner, or acceptance criteria.
- Promote a candidate to `docs/roadmap.md` only when the direction is accepted,
  the scope can be bounded, and acceptance can be described.
- Once promoted, keep the canonical next-work wording in `docs/roadmap.md` and
  remove or shorten the duplicate backlog entry.
- Delete or archive candidates that are completed, duplicated, invalidated, or
  no longer match the product or engineering direction.
- Future version or release plans should keep local discoveries in a
  `Follow-Up Candidates` section. Freeze or docs-governance sweeps decide
  whether those items stay local, move here, or promote to the official
  roadmap.

## Promoted After v1.0 Freeze

These areas have been promoted into `docs/roadmap.md` and should not be treated
as loose backlog items unless their scope changes again:

- post-release agent workflow review
- follow-up candidate and roadmap promotion sweep
- CF/AWS security acceptance pass
- v1.1 production hardening and full spell corpus
- v1.2 mechanics localization and Publications page
- v1.3 sitewide UX / style redesign

## Current Deferred Areas

### Operations

- rollback playbook
- less manual deployment automation
- better remote script lifecycle management than manual `scp`

### Security

- deeper security tooling beyond the promoted CF/AWS security pass
- intrusion controls such as fail2ban if the security pass does not accept them
- longer-term security update automation beyond the first explicit policy

### Delivery

- content artifact pipeline for versioned content releases beyond the v1.1
  full-corpus acceptance path
- static HTML/offline artifact generation to replace old loose HTML
  distribution
- release automation beyond the v3.5 script-backed CI/CD pass
- stronger deployment validation and rollback drills

### Maintenance

- dependency upgrades not accepted into focused version slices remain deferred
- revisit full server ESM or contracts dual-package output only when the current
  v3.8 package-import boundary stops being sufficient

### Content

- content coverage, provenance, and review-status reporting
- search/index artifact generation for offline or static deployments
- full spell-body/name/short-description translation and proofreading QA after
  the v1.2 mechanics translation workflow proves the review model
- expansion work after the v1.1 full-corpus import and v1.2 mechanics
  localization tracks are accepted

### Documentation

- deeper architecture docs beyond the v3.5 high-level module-doc automation
  pass

## Scope Note

These are intentionally deferred beyond the promoted post-v1.0 release sequence.

They should be considered early candidates for the future stable-version track rather than gaps accidentally left undocumented.
