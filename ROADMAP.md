# Vigilon — Build Roadmap

## Restructure Sprint (complete, merged PR #1)

- Fixed, compiling agent (Go) and backend (TypeScript) builds.
- `DEPLOYMENT_MODE` (self-hosted/SaaS) gating wired end-to-end (backend route mounting + frontend nav).
- Dashboard fully wired to real backend data — no mocked auth, no hardcoded mock arrays.
- A real Alerts engine (rules + evaluator + Email/Slack/Webhook delivery) — previously schema-only.
- Razorpay billing scaffold (checkout, webhook, plan/usage), SaaS-mode only.
- Restructured documentation set (`SRS.md`, `ARCHITECTURE.md`, new `FEATURE_TIERS.md`/`DEPLOYMENT.md`) reflecting the two-edition model.
- Redesigned, light/glossy marketing website with a Use Cases section.

## Phase 0: Foundations (Pre-MVP)
- Backend scaffolding: API Gateway, Core API, Ingestion Service skeletons
- PostgreSQL schema deployed (see `DATABASE_SCHEMA.md`)
- Agent skeleton: install script, systemd service, registration handshake
- Basic auth (tenant/user signup, login, JWT)
- CI/CD pipeline + agent resource-budget test gate (<40MB / <1% CPU)

## Phase 1: MVP
Goal: a founder can install the agent and get real value within minutes, for Ubuntu/Debian first.

- Installation & Onboarding (FR-1xx)
- Server Overview (FR-2xx)
- Infrastructure Discovery (FR-3xx) — Ubuntu, Debian
- Security Hardening Scanner (FR-4xx) — SSH, Firewall, Kernel, Users, Filesystem, Packages
- Threat Detection (FR-5xx) — brute-force ✅, crypto-miner ✅ (Phase 3 Batch A), suspicious cron/binary changes ✅ (Phase 3 Batch A), port scan ✅ (Phase 3 Batch F) — **all four original Phase 1 promises now real**
- Application Monitoring (FR-6xx) — PM2, systemd, Docker
- Resource Monitoring (FR-7xx)
- SSL Monitoring (FR-9xx)
- Backup Monitoring (FR-11xx) — basic existence/last-run check
- Security Recommendations with one-click fix (FR-14xx) — top 10 highest-impact fixes
- Server Timeline (FR-16xx)
- Alerts (FR-17xx) — Email, Slack, Webhook
- Risk Scoring (FR-22xx) — Overall + Security + Health scores
- Single-tenant dashboard (multi-server, single customer)

**MVP Exit Criteria:** matches Acceptance Criteria in `SRS.md` §7.

## Phase 1.5: Expansion of MVP Distro & Channel Support (complete except where noted — see `handoff.md` for exact verification level per item)
- ✅ CentOS, RHEL, AlmaLinux, Rocky Linux, Amazon Linux support — `firewalld` fallback added to the security scanner when `ufw` isn't present; **not run on an actual RHEL-family host this session**, verified by `go build`/`go vet` + code review only.
- ✅ Additional alert channels: Teams, Discord (already existed), Telegram, SMS (Twilio). ❌ **WhatsApp still not implemented** — needs Meta Business verification + pre-approved message templates, materially bigger than an API key; deferred.
- ✅ Log Intelligence (FR-12xx) — AI daily digest UI, on top of the digest engine that already existed.
- ✅ AI Assistant v1 (FR-20xx) — read-only Q&A UI, on top of the engine that already existed.
- ✅ Multi-Server Dashboard grouping (FR-18xx) — `?group_by=environment|project|region|customer|tag` + health rollup, end-to-end verified in browser.
- ❌ Network Monitoring (FR-8xx) with geo map — **deferred**, needs a new agent connection-tracking module + GeoIP database + map UI; large enough to be its own phase.
- ❌ Domain Monitoring (FR-10xx) — **deferred**, DNS/WHOIS/SPF/DKIM/DMARC tracking is an entirely new backend-side module.
- ✅ Compliance Scanner v1 (FR-15xx) — CIS-mapped PDF report generation via `pdfkit`, end-to-end verified (real PDF generated and downloaded through the UI). Covers only the 6 existing Vigilon scanner checks mapped to their nearest CIS control — not a full CIS Linux Benchmark assessment.

## Phase 2 Batch 1 (complete — see `handoff.md` for exact verification level per item)
- ✅ Multi-Tenant Support for MSPs (FR-19xx) — sub-tenant create/list, tenant switching (reusing the existing `POST /v1/auth/switch-tenant`), SaaS-only. **End-to-end verified**: real cross-tenant data isolation confirmed (a server registered under a managed sub-tenant is invisible from the parent's own server list, only visible via the dedicated `/v1/tenants/:id/servers` endpoint), and switching into a non-managed tenant correctly 403s.
- ✅ White-label branding (part of FR-19xx, Business-tier) — company name/color/logo config, applied to the dashboard sidebar. **End-to-end verified**: saved via Settings, confirmed the sidebar picks it up.
- ✅ Auto-Remediation policy expansion (FR-21xx) — per-action opt-in (`RemediationPolicy`, previously schema-only with zero code), safe actions default on / destructive default off. A new `rotate_logs` action added to the agent's whitelist. **End-to-end verified with a real connected agent**: a synthetic `ssh_bruteforce` event does *not* auto-remediate with the policy off, and *does* — with a real `block_ip` command dispatched over a live WebSocket to the actual compiled agent — once the policy is enabled.

Deferred within this same FR-21xx/19xx scope, tracked honestly:
- The `block_ip` agent action still only supports `ufw`, not `firewalld` — so auto-remediation won't work on RHEL-family hosts yet even though the security scanner already detects `firewalld` there (Phase 1.5). Small, known inconsistency, not fixed this batch.
- Full compliance framework support (ISO27001/SOC2/HIPAA/PCI-DSS/OWASP/NIST) was considered for this batch and explicitly **not** attempted — the only honest way to build it is dozens of additional real scanner checks per framework, not relabeling the 6 CIS-mapped checks that already exist. Left for a dedicated future phase sized to that real scope.

## Phase 2 (remaining — deferred, reasons noted)
- **Windows Agent / macOS Agent** — no macOS host available this session; Windows has a partial skeleton (telemetry/WS loop works, security scanning/remediation are real no-ops) but full parity (registry-based checks, Windows Firewall via netsh, Windows service enumeration) needs its own pass.
- **Kubernetes Monitoring (deep) / Docker Deep Monitoring** — needs a real cluster/Docker host to build and verify against meaningfully.
- **Cloud provider integrations: AWS, Azure, GCP** (billing API, deeper metadata) + **Cost Optimization module (FR-13xx)** — needs real cloud billing credentials; building this without them would produce untestable, likely-wrong code.
- **Full Compliance framework support: ISO 27001, SOC2, HIPAA, PCI DSS, OWASP, NIST** — see note above; needs real per-framework scanner checks, not relabeling.

## Phase 3 Batch A (complete — see `handoff.md` for exact verification level)

Working overnight (2026-07-24) through Phase 3 items that don't need cloud/cluster access the way the rest of Phase 2 does, per an owner-approved standing autonomous-work plan. Batch A closes Phase 1 MVP's own original Threat Detection promise (only SSH brute-force had ever actually been built, despite "crypto-miner, suspicious cron/binary changes" being listed since Phase 1):

- ✅ Crypto-miner detection (part of FR-5xx) — new `agent/anomaly.go`, cross-platform via `gopsutil/v3/process`: known-miner-binary-name match, or sustained high CPU from an unrecognized process. **Verified with a real, unstaged detection**: the actual compiled agent, run for a live 60s cycle on the dev machine, genuinely flagged a real high-CPU process on that machine and it round-tripped correctly to the backend — not just a synthetic test.
- ✅ Suspicious cron/binary changes (part of FR-5xx) / Configuration Drift Detection — new `agent/drift.go`, Linux-only: baseline-hash diffing of cron files/entries and 5 high-value system binaries, stored locally, first-run establishes baseline (no alert flood on install). **Not run on an actual Linux host this session** — verified by `go build`/`go vet` + code review only.
- ❌ Port scan detection (also part of FR-5xx's original Phase 1 promise) — still not implemented. Needs connection-tracking, not just process listing; a heavier lift, not attempted in Batch A.

## Phase 3 Batch B (complete — see `handoff.md` for exact verification level)

- ✅ Secrets Scanner (detect exposed credentials/keys in configs) — new `agent/secrets.go`: bounded regex scan for AWS access keys, PEM private-key blocks, and hardcoded password/secret assignments across `.env`/`.yml`/`.yaml`/`.conf`/`.json` files under `/etc`, `/opt`, `/var/www`. Reports via the existing findings pipeline; never transmits the matched secret value itself. **Verified with the repo's first automated test suite** (`agent/secrets_test.go`, 6 passing tests exercising the detection logic directly against planted fixtures) plus a real API round-trip through the findings/risk-scoring pipeline.

## Phase 3 Batch C (complete — see `handoff.md` for exact verification level)

- ✅ File Integrity Monitoring (FIM) — generalized Batch A's drift-detection mechanism: `Config.FIMWatchPaths` lets an operator specify a custom watch list (no dashboard UI for this yet, hand-edit the agent config for now), defaulting to common web-server config paths otherwise. Changes now report as a distinct `file_integrity_change` event type. **Verified with 7 new automated tests** covering the pure diff/classification logic (13 agent tests total now), plus a real event round-trip through the ingestion pipeline.

## Phase 3 Batch D (complete — see `handoff.md` for exact verification level)

- ✅ Patch Management, **detection-only** (scheduled/tested auto-patching remains future work — see below) — new `agent/patches.go`: detects whichever package manager exists (`apt`/`dnf`/`yum`), counts upgradable packages, flags security updates (heuristic for apt via `-security` repo suffix; native `--security` filter for dnf/yum). Reports via the existing findings pipeline. **Verified with 6 new automated tests** (19 agent tests total now) covering the output-parsing logic against realistic fixtures, plus a real finding round-trip through the ingestion/risk-scoring pipeline. The `apt`/`yum`/`dnf` command-invocation branches themselves have not run against a real package manager (no Linux/RHEL-family host this session) — only their parsing logic is tested.

## Phase 3 Batch E (complete — see `handoff.md` for exact verification level)

Closes two gaps explicitly flagged in Batches A-D rather than left silently inconsistent:

- ✅ Firewalld-aware `block_ip` — the security scanner detected `firewalld` since Phase 1.5, but the `block_ip` remediation action stayed `ufw`-only until now. `agent/remediation.go` detects the right tool and uses `firewall-cmd`'s rich-rule syntax on RHEL-family hosts, with the IP validated via `net.ParseIP` first (a malformed "IP" could otherwise break out of the rich-rule string, since `firewall-cmd` parses its own grammar). **4 new tests**, can't exercise a real `firewall-cmd` without a RHEL-family host this session.
- ✅ Dashboard-configurable FIM watch paths — implements the "config channel" `AGENT_SPEC.md` has always described (dashboard → backend → agent) for the first time, using it to carry FIM watch paths. New `Server.desiredConfig` column, `PUT`/`GET /v1/servers/:id/config`, agent-facing `GET /v1/agent/:serverId/config`, a new Configuration tab on the server detail page, and `agent/remoteconfig.go` polling it on startup and every hourly scan tick. **Verified with the strongest technique used all night**: a real agent process, restarted after the dashboard set new paths, logged picking them up and persisted them to its own local config file — the full loop, not a backend-only round-trip.

## Phase 3 Batch F (complete — see `handoff.md` for exact verification level)

- ✅ Port scan detection — the last of Phase 1 MVP's four original Threat Detection promises (brute-force, crypto-miner, cron/binary drift, port scan) to get built. New `agent/portscan.go`: polls `gopsutil/v3/net.Connections("tcp")` (cross-platform), flags a remote IP hitting 5+ of this host's actual listening services within a 5-minute window, 15-min per-IP cooldown. **10 new tests, 38 agent tests total.**
- **A real false-positive bug was caught by the verification process itself**: the first version counted any distinct local port an IP touched, which meant this host's own *outbound* connections (each getting a random ephemeral local port) looked identical to a scan. Running the real compiled agent surfaced this immediately (false positives against loopback and a real outbound peer); fixed by only counting hits against ports this host is confirmed to be listening on and excluding loopback, then re-verified clean with both new unit tests and another real agent run.
- Honest scope: catches completed-handshake "connect scans" against real running services; misses stealth SYN scans and probes against closed/non-listening ports, which never produce a visible connection at all.

This was the planned stopping point after tonight's original four batches (A-D); Batches E and F closed the gaps and the outstanding item they left behind. See `handoff.md` "Current Status" for the exact PR/merge state.

## Phase 3 Batch G (complete — see `handoff.md` for exact verification level)

- ✅ AI Suggested Fix — the **propose** half of "AI Auto-Remediation" (see below), scoped deliberately smaller than the full execute-capable version. New `generateFindingRemediation()` in `backend/src/services/ai/engine.ts` (same graceful-degradation pattern as the existing server-analysis/log-digest AI functions) and `POST /v1/servers/:serverId/findings/:findingId/suggest-fix`, called from a new "AI Suggested Fix" button on the server detail page's Security Findings tab for findings with no one-click fix (`autoFixable: false`). Strictly read-only: no `sendCommandToAgent` call, no finding-status change, no interaction with Phase 2 Batch 1's `RemediationPolicy` trust model.
- Verified end-to-end against a real registered test tenant/server with a synthetic non-auto-fixable `ssh.root_login` finding (direct curl to the new endpoint) and via a real browser click-through on the server detail page; both correctly produced the honest "not configured" degraded response (this dev environment's `OPENAI_API_KEY` is a placeholder), consistent with every other AI-touching verification this session.
- Known limitation, stated rather than silently accepted: no caching — every click re-calls the AI.

## Phase 3 Batch H (complete — see `handoff.md` for exact verification level)

Prompted directly by the user asking for production-readiness and "best security standards" instead of a new feature — a backend security audit found and fixed concrete, exploitable gaps rather than theoretical ones:

- ✅ **Critical**: removed a hardcoded JWT secret fallback (`'vigilon-super-secret-key-change-in-prod'`, publicly visible in source) that any deployment forgetting to set `JWT_SECRET` would have silently run with. New `backend/src/utils/jwt.ts` now fails fast at process startup instead.
- ✅ Rate limiting (`express-rate-limit`) on the auth endpoints against brute-force/credential-stuffing, plus a generous global safety-net limiter elsewhere that won't throttle real agent fleets.
- ✅ `helmet` for standard secure headers, with `crossOriginResourcePolicy` deliberately relaxed since this API is meant to be called cross-origin by its own frontend.
- ✅ CORS restricted to an explicit `CORS_ORIGIN`-driven allowlist instead of reflecting any origin.
- ✅ Minimum 8-character password policy on registration.
- Reviewed and accepted, not changed: agent API-key auth (already hash+DB-lookup based, no timing-attack surface); frontend `npm audit`'s `postcss`/`sharp` findings (transitive to Next's bundled build tooling; the suggested fix downgrades `next` 16→9, a nonsensical breaking change for build-time-only advisories).
- Explicitly deferred: JWT-in-`localStorage` (vs. an `httpOnly` cookie) is a known further hardening step, not attempted this batch to avoid risking the working login flow.

## Phase 3 Batch I (complete — see `handoff.md` for exact verification level)

Follows directly from Batch H: hardening auth/tenant-isolation by hand-verification is real, but leaves nothing behind to catch a future regression. Adds the backend's first automated test suite, deliberately scoped to the highest-value security surface rather than backfilling everything at once:

- ✅ New `vitest`+`supertest` test harness (`backend/vitest.config.ts`, `backend/tests/`, a committed `.env.test` fixture with no real secrets, an isolated `test.db`) — `backend/src/index.ts` was split into `src/app.ts` (the Express app, exported, importable without a real `.listen()`) and a thin entrypoint, so tests can exercise the real app via `supertest`.
- ✅ 16 tests across 4 files: `utils/jwt.ts` (sign/verify round-trip, tampered/expired-token rejection, fail-fast-on-missing-secret - now automated instead of only manually checked in Batch H), `middlewares/auth.ts`, `routes/auth.ts` (register/login flows, password policy, duplicate email), and cross-tenant server isolation (`loadOwnedServer()`).
- **Proven, not just written**: the tenant-isolation test was confirmed to actually fail when the tenant filter was temporarily removed from `loadOwnedServer()`, then pass again once restored - a real red/green check.
- ✅ CI: added a test step to the existing `build-backend` job in `.github/workflows/agent-builder.yml` (there was no separate backend test workflow to begin with).
- Explicitly not covered by this batch: alerts, billing, remediation, AI routes, WebSocket agent comms, MSP tenant management, compliance reports (backend), and the entire frontend all remain untested by automation - stated as a deliberately narrow start, not general coverage.

## Phase 3 Batch J (complete — see `handoff.md` for exact verification level)

Closes the last item in the Batch H/I production-readiness thread: this project used `prisma db push` since day one with zero migration history across 20 schema models and 9 merged PRs.

- ✅ Baselined the schema via Prisma's official workflow: generated `prisma/migrations/20260724130948_init/migration.sql` from an empty→schema diff (21 `CREATE TABLE` statements, matching all 21 models), then marked it applied against the real `dev.db` via `migrate resolve --applied` - without executing the SQL or touching existing data (verified via before/after row-count snapshots).
- **Proved the migration SQL is complete, not just plausible**: applied it to a brand-new empty SQLite file via `migrate deploy`, then diffed that database against `schema.prisma` directly - result was `-- This is an empty migration.` (zero drift), the strongest available proof it correctly bootstraps a fresh environment.
- ✅ New `migrate:dev`/`migrate:deploy` npm scripts; `DEPLOYMENT.md` updated to run `prisma migrate deploy` instead of `db push` for both install and upgrade, with the forward workflow for adding new migrations documented.
- Deliberately unchanged: the test suite's disposable database still uses `db push --force-reset` - the right tool for a throwaway DB with no data to protect, not an inconsistency.
- Honest caveat: a fresh single-migration baseline, not deep history; the generated SQL is SQLite-specific, so a SaaS operator moving to PostgreSQL (per `schema.prisma`'s existing "change provider for production" comment) will need to regenerate migration history for that provider - a pre-existing fact about this schema, not a new gap from this batch.

## Phase 3 Batch K (complete — see `handoff.md` for exact verification level)

Returns to the main feature roadmap after the H/I/J production-readiness detour. Closes the `log_sources` part of "expanding the Batch E config channel" - and along the way discovered that `services/ai/logdigest.ts`'s digest generator has branched on ERROR/WARNING-category `TimelineEvent`s since Phase 1.5 with nothing ever producing one in that shape, so this also completes a real gap in the existing Log Intelligence feature, not just a new standalone capability.

- ✅ New `agent/logwatch.go`: cross-platform generic log tailing (glob-expanding configured sources, classifying lines as ERROR/WARNING/skip via a keyword heuristic), reusing the existing config-channel merge logic from Batch E (`agent/remoteconfig.go`, generalized and renamed `mergeRemoteStringList`). New `POST /v1/agent/:serverId/log-events` creates only a `TimelineEvent` - deliberately kept separate from the threat-events endpoint so generic log noise can never trigger auto-remediation. Configuration tab gained a second "Log sources to tail" textarea. **7 new agent tests, 4 new backend tests.**
- **Verified with a real compiled agent against a real tailed file**: appended a routine line and an `ERROR: disk full` line to a temp log file the agent was configured (via the dashboard) to tail; confirmed only the ERROR line produced a `TimelineEvent`, confirmed the daily digest then reported a non-zero error count sourced from that real event (the first time ever, since nothing previously fed that code path), and confirmed no `ThreatEvent` was created by the log line.
- Explicitly deferred: `metrics_interval_seconds`/`scan_schedule` (needs live `time.Ticker` reconfiguration in `main.go`, separate work); `auto_remediation` flags are intentionally never added here at all - duplicating Phase 2 Batch 1's real `RemediationPolicy` system would create two competing sources of truth. Removing a log source from the dashboard doesn't stop an already-running tailer until the agent restarts.

## Phase 3 (remaining)
- AI Auto-Remediation — the **propose** half now exists (Batch G, above); the **execute** half (AI proposes and, with approval or configured trust level, executes fixes automatically) still needs its own approval workflow and trust-level infrastructure and is deliberately deferred
- Self-Healing Infrastructure (broader automated recovery playbooks)
- Scheduled/tested auto-patching (applying the updates Batch D only detects) — needs its own careful design: opt-in policy, maintenance windows, rollback story, same reasoning that kept Batch D detection-only
- Vulnerability Scanner (deeper CVE correlation, not just version-check)
- Malware Detection (signature + behavioral) — crypto-miner detection (Batch A) is a first slice of this
- Cloud Security Posture Management (CSPM)
- Expanding the config channel to cover `metrics_interval_seconds`/`scan_schedule` (FIM watch paths and log sources are wired through as of Batches E and K; `auto_remediation` flags are intentionally excluded — already handled by Phase 2 Batch 1's `RemediationPolicy` system) — needs live Go `time.Ticker` reconfiguration in `agent/main.go`'s hot loop

## Phase 4
- Endpoint Detection & Response (EDR)
- Zero Trust Agent capabilities
- SIEM Integration (export to Splunk, Elastic, etc.)
- SOAR Playbooks (complex multi-step automated response workflows)
- Threat Intelligence feed integration
- Asset Management (broader inventory beyond individual servers)
- Identity Monitoring (cross-system identity/access anomalies)
- Cloud Workload Protection (CWPP)

## Suggested Sprint Breakdown (Illustrative, 2-week sprints)

| Sprint | Focus |
|---|---|
| 1–2 | Backend scaffolding, DB schema, agent install/registration handshake |
| 3–4 | Metrics pipeline (collection → ingestion → storage → dashboard display) |
| 5–6 | Security Hardening Scanner + Risk Scoring engine |
| 7–8 | Threat Detection engine + real-time alerting (Email/Slack/Webhook) |
| 9–10 | Application Monitoring + Server Timeline + SSL/Backup monitoring |
| 11–12 | Security Recommendations UI + one-click fix + remediation audit log |
| 13–14 | Multi-distro support, hardening, usability testing against 4 guiding questions |
| 15+ | Phase 1.5 features (AI digest, AI Assistant v1, additional distros/channels) |

## Pricing Tier Alignment

See `FEATURE_TIERS.md` for the canonical, full feature-by-feature matrix (this table is a summary and must not drift from it).

| Edition / Tier | Servers | Included Modules |
|---|---|---|
| Self-Hosted | Unlimited (your infra) | Full core module set (monitoring, security, threat detection, alerts, compliance-CIS, risk scoring); no billing/MSP/white-label; AI features are bring-your-own-key |
| SaaS Free | 1 | Basic Monitoring, Basic Alerts (Email only) |
| SaaS Pro | 10 | + Advanced Monitoring, Threat Detection, AI Assistant, Reports, all MVP alert channels |
| SaaS Business | Unlimited | + Multi-Tenant, full Compliance, Cost Optimization, API access, SSO, White Label |

Feature flags in the backend map cleanly to these tiers via the `DEPLOYMENT_MODE` gate plus `tenants.plan`, as described in `ARCHITECTURE.md` §7, to avoid costly re-architecture later.
