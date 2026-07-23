# Vigilon — Feature Tiers & Deployment Editions

This is the **canonical source of truth** for what is available in each deployment edition and SaaS plan. The backend's `DEPLOYMENT_MODE` gating (see `ARCHITECTURE.md` §7) and the pricing page (see `WEBSITE_SPEC.md`) must both derive from this table — do not let them drift independently.

## 1. Two Deployment Editions

Vigilon ships as a single codebase with two deployment editions, selected by the `DEPLOYMENT_MODE` environment variable read at backend boot:

| | **Self-Hosted** (`DEPLOYMENT_MODE=self_hosted`) | **SaaS** (`DEPLOYMENT_MODE=saas`) |
|---|---|---|
| Who it's for | Teams that want to run Vigilon on their own infrastructure and own their data | Teams that want a managed, always-on dashboard without operating a backend themselves |
| Tenancy | Single tenant (one organization's servers; no MSP sub-account switching) | Multi-tenant, with optional MSP/agency parent-tenant management |
| Billing | None — self-hosted is free/open, you run and pay for your own infrastructure | Razorpay-billed subscriptions (Free/Pro/Business, see §3) |
| White-label | Not applicable | Business tier only |
| Support | Community (GitHub issues) | Vendor support per plan SLA |
| AI Assistant / Log Digest | Available if you supply your own `OPENAI_API_KEY` (bring-your-own-key; usage cost is yours) | Included on Pro/Business using a managed key |
| Server limit | Unlimited (bounded only by your own infrastructure) | Per plan (see §3) |

## 2. Feature Matrix — Self-Hosted vs. SaaS Core

These map to the `FR-xxx` functional requirement groups in `SRS.md` §3.

| Module | FR Range | Self-Hosted | SaaS Free | SaaS Pro | SaaS Business |
|---|---|:---:|:---:|:---:|:---:|
| Installation & Onboarding | FR-1xx | ✅ | ✅ | ✅ | ✅ |
| Server Overview | FR-2xx | ✅ | ✅ | ✅ | ✅ |
| Infrastructure Discovery | FR-3xx | ✅ | ✅ | ✅ | ✅ |
| Security Hardening Scanner | FR-4xx | ✅ | ✅ | ✅ | ✅ |
| Threat Detection | FR-5xx | ✅ | Basic | ✅ | ✅ |
| Application Monitoring | FR-6xx | ✅ | ✅ | ✅ | ✅ |
| Resource Monitoring | FR-7xx | ✅ | ✅ | ✅ | ✅ |
| Network Monitoring | FR-8xx | ✅ | ❌ | ✅ | ✅ |
| SSL Monitoring | FR-9xx | ✅ | ✅ | ✅ | ✅ |
| Domain Monitoring | FR-10xx | ✅ | ❌ | ✅ | ✅ |
| Backup Monitoring | FR-11xx | ✅ | ✅ | ✅ | ✅ |
| Log Intelligence (AI digest) | FR-12xx | BYO key | ❌ | ✅ | ✅ |
| Cost Optimization | FR-13xx | ❌ (Phase 2) | ❌ | ❌ | ✅ |
| Security Recommendations | FR-14xx | ✅ | ✅ | ✅ | ✅ |
| Compliance Scanner (CIS) | FR-15xx | ✅ | ❌ | ❌ | ✅ (+ full framework set) |
| Server Timeline | FR-16xx | ✅ | ✅ | ✅ | ✅ |
| Alerting (Email/Slack/Webhook) | FR-17xx | ✅ | ✅ (Email only) | ✅ (all MVP channels) | ✅ (all channels) |
| Multi-Server Dashboard grouping | FR-18xx | ✅ | ❌ | ✅ | ✅ |
| Multi-Tenant / MSP | FR-19xx | ❌ | ❌ | ❌ | ✅ |
| AI Assistant | FR-20xx | BYO key | ❌ | ✅ | ✅ |
| Auto-Remediation | FR-21xx | ✅ | Safe actions only | ✅ | ✅ |
| Risk Scoring | FR-22xx | ✅ | ✅ | ✅ | ✅ |

"Basic" / "Safe actions only" mean the feature runs but with a reduced default action set (see `SRS.md` §3.21 opt-in categories) — this is a plan-tier default, not a hard capability removal, and can be adjusted per `remediation_policies`.

## 3. SaaS Pricing Tiers (from `ROADMAP.md`, restated here as the canonical copy)

| Tier | Servers | Price positioning | Included beyond Free |
|---|---|---|---|
| Free | 1 | $0 | Basic Monitoring, Basic Alerts (Email only) |
| Pro | 10 | Paid, monthly/annual via Razorpay | + Threat Detection, AI Assistant, Advanced Monitoring, Reports, all MVP alert channels |
| Business | Unlimited | Paid, monthly/annual via Razorpay | + Multi-Tenant/MSP, Compliance, Cost Optimization, API access, SSO, White Label |

## 4. Implementation Notes

- **Backend**: a single `isSaas()` / `getDeploymentMode()` helper (see `ARCHITECTURE.md` §7) gates route mounting for billing (`/v1/billing/*`) and MSP (`/v1/tenants/*` beyond the caller's own tenant) — these routers are simply never mounted in `self_hosted` mode rather than being permission-checked per-request, so a self-hosted deployment has zero attack surface for billing/MSP code paths.
- **Frontend**: reads deployment mode from a `GET /v1/config` endpoint at load and hides Billing/MSP navigation entirely (not just disables it) when `self_hosted`.
- **Plan/tier enforcement** (server count limits, feature flags per SaaS plan) is a `tenants.plan` column check in the Core API — see `DATABASE_SCHEMA.md` §1. Self-hosted tenants are always treated as the equivalent of "Business" capability minus billing/MSP/white-label, per the matrix above.
- Anything marked ❌ above is out of scope for this week's build and tracked as Phase 2/3 in `ROADMAP.md` — it is not silently missing, it's deliberately deferred.
