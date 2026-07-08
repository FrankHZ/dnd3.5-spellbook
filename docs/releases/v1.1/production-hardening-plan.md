# v1.1 Production Hardening Plan

> Plan maintenance rule: integrated plans are for early sequencing and
> cross-plan conflict review, not implementation ledgers. Implementation
> branches should update this owning topic plan, affected operational docs, and
> `docs/roadmap.md` only when active ordering changes. Do not update
> `integrated-plan.md` unless version scope, delivery sequence, ownership
> boundaries, or cross-plan conflicts change.

Status: in progress.

## Purpose

- Tighten the production security posture for the v1.0 topology without
  changing the product surface or server architecture.
- Give operators a concise checklist of enabled settings, intentionally
  deferred settings, and smoke evidence after changes.

## Ownership

- Owning version: v1.1.
- Owning domain: production hardening, Cloudflare, AWS, deploy/security ops.
- Primary implementation branch or specialist: security/deployment specialist.
- Related feature/module docs: `docs/operations/deployment.md`,
  `docs/modules/delivery.md`, `docs/harness.md`.
- Upstream dependency plans: `docs/releases/v1.1/README.md`.
- Downstream consumer plans: v1.1 release acceptance and freeze.

## Agent Context

- Main gate outcome: apply accepted CF/AWS hardening and produce evidence
  without widening production exposure.
- Required reading: `AGENTS.md`, this plan, `docs/releases/v1.1/README.md`,
  `docs/operations/deployment.md`, `docs/modules/delivery.md`,
  `docs/releases/v1.0/FREEZE.md`.
- Expected edit surface: operations/module docs, deployment helpers or workflow
  config only when an accepted hardening change requires it.
- Nearby code/tests: backend status/CORS/security-header tests and deployment
  smoke commands.
- Validation or acceptance evidence: checklist plus production smoke for
  frontend, API, CORS, deploy, and private status/admin paths.
- Non-goals and follow-up parking: put architecture changes, aggressive cache
  strategy, and optional security tooling in `docs/stable-backlog.md` unless
  accepted for v1.1.
- Handoff owner: main gate review, then librarian freeze sweep.

## Problem

v1.0 established the public topology, but the first production release should
be followed by a focused security pass. The pass needs to distinguish confirmed
configuration changes from speculative hardening so production access and
debuggability do not become brittle.

## Goals

- Review Cloudflare and AWS production settings against the current topology.
- Apply accepted low-risk hardening changes with explicit operator notes.
- Keep a short checklist of enabled items, deferred items, and reasons.
- Smoke the public frontend, API, CORS behavior, deploy path, and private
  status/admin-only paths after changes.

## Non-Goals

- Do not re-architect the backend or replace the current server.
- Do not make HSTS preload, Bot Fight, or aggressive cache settings automatic
  without a specific acceptance decision.
- Do not expose private DB provenance or admin-only status by default.
- Do not bundle the full spell corpus import into this branch.

## Current Facts

- Frontend production origin is `https://www.d20spellcodex.com`.
- API production origin is `https://api.d20spellcodex.com`.
- The apex domain is intentionally not the canonical frontend origin in v1.0.
- The backend server owns Express/API, SQLite/content DBs, DB update scripts,
  and Nginx API reverse proxying.
- DB upload/activation is operator-owned and not part of automatic CD.

## Security Checklist Inventory

Snapshot date: 2026-07-08.

### Cloudflare

| Item | Current evidence | v1.1 decision |
| ---- | ---------------- | ------------- |
| DNS proxying | `www.d20spellcodex.com` is proxied; `api.d20spellcodex.com` is proxied; apex has no record. | Keep. Apex remains intentionally unassigned. |
| DNSSEC | Cloudflare DNS API reports DNSSEC `disabled`. | Defer enabling until registrar-side DS record access is ready; enabling Cloudflare-side DNSSEC alone is not the whole acceptance step. |
| HTTP to HTTPS | Public `http://www...` and `http://api...` return Cloudflare `301` redirects to HTTPS. | Keep public edge redirect; also tighten origin Nginx HTTP behavior so SSL API-only mode redirects non-ACME HTTP to HTTPS. |
| SSL/TLS mode | Read-all Cloudflare API reports SSL mode `full`, Always Use HTTPS `on`, Automatic HTTPS Rewrites `on`, minimum TLS `1.0`, TLS 1.3 `zrt`, and 0-RTT `on`. | Move SSL mode to Full Strict after origin certificate/renewal is confirmed. Raise minimum TLS to 1.2 unless an explicit legacy-client need appears. Evaluate disabling 0-RTT for API safety; current app is mostly read-only but has POST helper endpoints. |
| HSTS | Cloudflare security header setting has HSTS disabled; public frontend/API responses currently do not expose `Strict-Transport-Security`. | Defer HSTS preload. Consider non-preload HSTS only after Full Strict, origin cert renewal, and rollback impact are confirmed. |
| WAF and API rate limiting | Zone rulesets include managed DDoS L7, Cloudflare Managed Free Ruleset, and Normalization Ruleset definitions, but no managed/custom firewall phase entrypoint is active. Legacy firewall/rate/page/access rules are empty. The only active zone ruleset entrypoint is `http_ratelimit` with a leaked-credential check block rule. Zone setting `waf` is `off`. | Enable the low-risk managed WAF/free ruleset only after dashboard/API write access is available and smoke checks are ready. Add a conservative `/api/*` rate-limit rule if Cloudflare plan support allows it; avoid aggressive bot/challenge behavior until API and deploy smoke pass. |
| Worker token scope | Worker token is valid and can see the account and one Workers service. Read-all token can inspect zone settings and rulesets. | Good enough for inspection. Separate write-capable change path is still required for accepted Cloudflare setting changes. |

### Lightsail Origin

| Item | Current evidence | v1.1 decision |
| ---- | ---------------- | ------------- |
| Host platform | Debian 12 on AWS Lightsail; Nginx and `spellbook-api` are active. | Keep current single-instance topology. |
| API process binding | `spellbook-api` listens on `*:3000` even though `/etc/default/spellbook-api` has `HOST=127.0.0.1`; an external TCP probe did not reach port 3000. | Accepted defense-in-depth code fix: server startup must honor `HOST`, defaulting to `127.0.0.1`; deploy backend after merge and verify `ss` shows `127.0.0.1:3000`. |
| Nginx origin routing | HTTPS API proxy works; HTTP origin API also proxies today. | Accepted script fix: SSL API-only mode redirects non-ACME HTTP to HTTPS. Sync `apply-nginx-site.sh`, reapply with SSL env, and verify. |
| SSH exposure | SSH listens on 22 and is externally reachable; root login and password auth are disabled; recent auth logs show public scanning. | Keep key-only SSH. Restrict port 22 to the operator's current IP/range in the Lightsail firewall if operationally acceptable. |
| OS updates | `unattended-upgrades` is installed and enabled. | Keep. Document as accepted baseline. |
| Intrusion throttling | `fail2ban` is not installed. | Candidate for v1.1 if SSH cannot be IP-restricted; otherwise follow-up. |
| Cert renewal | `certbot.timer` is active. | Keep; verify after Nginx redirect change that ACME HTTP challenge still works. |
| Backups | Existing DB backup files are present under `/opt/spellbook/data`. | Keep current manual retention policy; prune intentionally after release acceptance. |

## Plan

### Slice 1: Security Checklist Inventory

- Deliverable: concise checklist of Cloudflare and AWS settings with current
  state, accepted change, deferred reason, or follow-up owner.
- Expected files: this plan or a focused operations/security note if the list
  becomes too large for this plan.
- Validation: no production changes required for the inventory slice.

### Slice 2: Cloudflare Hardening

- Deliverable: accepted Cloudflare changes for DNSSEC, Full Strict HTTPS,
  HTTP-to-HTTPS, WAF/managed rules, API rate limiting, security response
  headers, and Pages/Workers environment-variable/token permissions.
- Expected files: operations docs and deployment notes when operator workflow
  changes.
- Validation: frontend route smoke, API HTTPS smoke, CORS allow/reject checks,
  and confirmation that debug/operator access remains available.

### Slice 3: AWS And Origin Hardening

- Deliverable: accepted AWS/server changes for security groups, SSH exposure,
  deploy user/IAM permissions, key rotation notes, update strategy, Nginx
  reverse-proxy exposure, logs, backups, and rollback path.
- Expected files: operations docs and helper scripts only when necessary.
- Validation: backend deploy smoke, API status smoke, private db-status/admin
  path checks, and no unexpected public exposure.

### Slice 4: Acceptance Evidence

- Deliverable: final checklist with enabled/deferred items and smoke evidence.
- Expected files: this plan during implementation, then v1.1 `FREEZE.md` during
  release closeout.
- Validation: production smoke evidence is linked or summarized without pasting
  bulky logs.

## Acceptance Criteria

- Checklist covers Cloudflare and AWS items named in the v1.1 release plan.
- Enabled and deferred items both include reasons.
- Frontend production routes still load through Cloudflare Workers.
- API status is reachable over the production API domain.
- CORS allows the production frontend origin and rejects an unallowed origin.
- Backend deploy path still works.
- Private db-status/admin-only paths remain private by default.
- Operator docs reflect any accepted workflow/configuration changes.

## Doc Updates

- Update this plan when accepted hardening scope or validation changes.
- Update `docs/roadmap.md` only when v1.1 ordering or release state changes.
- Update operational/topic docs when deploy, CORS, TLS, Cloudflare, AWS, or
  status-path behavior changes.
- Do not update `integrated-plan.md` unless v1.1 adds one due to sequencing or
  ownership conflict.

## Open Questions

- Which Cloudflare settings are already enabled and only need evidence?
- Which AWS update, backup, and key-rotation policies are operator-owned
  outside the repo versus documented in repo operations notes?

## Follow-Up Candidates

- HSTS preload, Bot Fight, and aggressive cache rules may become future work
  after evaluating access/debug impact.
- More automated rollback drills may belong in a later delivery/operations
  release if v1.1 keeps rollback manual.

## Completion Notes

Use this section only after implementation review.
