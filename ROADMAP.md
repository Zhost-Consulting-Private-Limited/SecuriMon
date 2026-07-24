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
- Threat Detection (FR-5xx) — brute-force ✅, crypto-miner ✅ (Phase 3 Batch A), suspicious cron/binary changes ✅ (Phase 3 Batch A), port scan ❌ (still not implemented — see Phase 3 Batch A note below)
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

This is the planned stopping point for tonight's standing autonomous-work plan — all four queued batches (A-D) are done. See `handoff.md` "Current Status" for the exact PR/merge state of each.

## Phase 3 (remaining)
- AI Auto-Remediation (AI proposes and, with approval or configured trust level, executes fixes)
- Self-Healing Infrastructure (broader automated recovery playbooks)
- Scheduled/tested auto-patching (applying the updates Batch D only detects) — needs its own careful design: opt-in policy, maintenance windows, rollback story, same reasoning that kept Batch D detection-only
- Vulnerability Scanner (deeper CVE correlation, not just version-check)
- Malware Detection (signature + behavioral) — crypto-miner detection (Batch A) is a first slice of this
- Cloud Security Posture Management (CSPM)
- Dashboard UI for configuring per-server FIM watch paths (Batch C added the agent-side mechanism only)
- Port scan detection (Phase 1 MVP's original Threat Detection promise, still outstanding after Batch A — see Phase 3 Batch A above)

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
