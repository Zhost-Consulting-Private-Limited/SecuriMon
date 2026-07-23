# Vigilon — Build Roadmap

## This Week's Build (Restructure Sprint)

This is the current, accurate status replacing the stale batch-tracking in the old `handoff.md`. Shipping this week:
- Fixed, compiling agent (Go) and backend (TypeScript) builds.
- `DEPLOYMENT_MODE` (self-hosted/SaaS) gating wired end-to-end (backend route mounting + frontend nav).
- Dashboard fully wired to real backend data — no mocked auth, no hardcoded mock arrays.
- A real Alerts engine (rules + evaluator + Email/Slack/Webhook delivery) — previously schema-only.
- Razorpay billing scaffold (checkout, webhook, plan/usage), SaaS-mode only.
- Restructured documentation set (`SRS.md`, `ARCHITECTURE.md`, new `FEATURE_TIERS.md`/`DEPLOYMENT.md`) reflecting the two-edition model.
- Redesigned, light/glossy marketing website with a Use Cases section.

Explicitly **not** in this week's build — deferred to Phase 1.5/2 below and tracked honestly rather than claimed as done: full Compliance framework support beyond CIS, Cost Optimization, MSP white-labeling, additional alert channels beyond Email/Slack/Webhook, Windows agent parity, PDF compliance report generation, AI Assistant polish beyond the existing OpenAI-backed engine.

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
- Threat Detection (FR-5xx) — brute-force, port scan, crypto-miner, suspicious cron/binary changes
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

## Phase 1.5: Expansion of MVP Distro & Channel Support
- CentOS, RHEL, AlmaLinux, Rocky Linux, Amazon Linux support
- Additional alert channels: Teams, Discord, Telegram, WhatsApp, SMS
- Log Intelligence (FR-12xx) — AI daily digest
- AI Assistant v1 (FR-20xx) — read-only Q&A, no actions
- Multi-Server Dashboard grouping (FR-18xx)
- Network Monitoring (FR-8xx) with geo map
- Domain Monitoring (FR-10xx)
- Compliance Scanner v1 (FR-15xx) — CIS Linux Benchmark only, PDF export

## Phase 2
- Windows Agent
- macOS Agent
- Kubernetes Monitoring (deep)
- Docker Deep Monitoring
- Cloud provider integrations: AWS, Azure, GCP (billing API, deeper metadata)
- Cost Optimization module (FR-13xx), dependent on cloud billing integration
- Multi-Tenant Support for MSPs (FR-19xx), white-label branding
- Auto Protection / Auto-Remediation expansion (FR-21xx) — full action set with per-category opt-in
- Full Compliance framework support: ISO 27001, SOC2, HIPAA, PCI DSS, OWASP, NIST

## Phase 3
- AI Auto-Remediation (AI proposes and, with approval or configured trust level, executes fixes)
- Self-Healing Infrastructure (broader automated recovery playbooks)
- Patch Management (scheduled, tested OS/package patching)
- Configuration Drift Detection
- Secrets Scanner (detect exposed credentials/keys in configs, repos, env files)
- File Integrity Monitoring (FIM)
- Vulnerability Scanner (deeper CVE correlation, not just version-check)
- Malware Detection (signature + behavioral)
- Cloud Security Posture Management (CSPM)

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
