# Stable-Version Backlog

This document tracks the main non-MVP follow-up areas that are intentionally deferred beyond the current MVP documentation baseline.

It is not a full roadmap. It exists to record what is known to be intentionally out of scope right now.

## Current Deferred Areas

### Operations

- rollback playbook
- less manual deployment automation
- better remote script lifecycle management than manual `scp`

### Security

- HTTPS / TLS
- firewall hardening
- SSH hardening
- fail2ban or equivalent intrusion controls
- explicit security update policy

### Delivery

- content artifact pipeline for versioned content releases
- static HTML/offline artifact generation to replace old loose HTML
  distribution
- release automation beyond the v3.5 script-backed CI/CD pass
- stronger deployment validation and rollback drills

### Content

- large-scale Chinese/English translation and QA workflow
- `data/spells-full` completion workflow for adding remaining source-backed
  English spells into the content/rules DB path
- content coverage, provenance, and review-status reporting
- search/index artifact generation for offline or static deployments

### Documentation

- deeper architecture docs beyond the v3.5 high-level module-doc automation
  pass

## Scope Note

These are intentionally deferred beyond the currently planned MVP line.

They should be considered early candidates for the future stable-version track rather than gaps accidentally left undocumented.
