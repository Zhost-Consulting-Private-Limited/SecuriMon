# Vigilon — Product Documentation Set

**Tagline:** Secure. Monitor. Optimize. Without Hiring a DevOps Team.

This repository contains the full requirements and design documentation for **Vigilon**, an enterprise-grade server security, monitoring, and audit platform that combines observability, security hardening, threat detection, automatic remediation, compliance/audit reporting, cost optimization, and AI-powered operational guidance into a single lightweight agent + dashboard product — deployable either **Self-Hosted** on your own infrastructure or as a managed **SaaS** (billed via Razorpay). See `FEATURE_TIERS.md` for the edition split and `DEPLOYMENT.md` for how to run either one.

These documents are written to be handed directly to an AI development tool (e.g. Claude Code, Cursor, Devin) or a human engineering team as the source of truth for building the product.

## Document Index

| # | Document | Purpose |
|---|----------|---------|
| 1 | [`SRS.md`](./SRS.md) | Software Requirements Specification — the authoritative functional & system requirements document |
| 2 | [`ARCHITECTURE.md`](./ARCHITECTURE.md) | System architecture, component diagram, data flow, deployment topology, deployment-mode gating |
| 3 | [`AGENT_SPEC.md`](./AGENT_SPEC.md) | Technical specification for the host agent (Rust/Go), module-by-module |
| 4 | [`API_SPEC.md`](./API_SPEC.md) | REST/WebSocket API contract between Agent ↔ Backend ↔ Dashboard |
| 5 | [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md) | Core data model (PostgreSQL) for servers, metrics, alerts, users, tenants |
| 6 | [`USER_STORIES.md`](./USER_STORIES.md) | Feature backlog expressed as user stories with acceptance criteria |
| 7 | [`NON_FUNCTIONAL_REQUIREMENTS.md`](./NON_FUNCTIONAL_REQUIREMENTS.md) | Performance, security, scalability, compliance, reliability targets |
| 8 | [`ROADMAP.md`](./ROADMAP.md) | Phased build plan (MVP → Phase 4) with suggested sprint breakdown, plus current sprint status |
| 9 | [`FEATURE_TIERS.md`](./FEATURE_TIERS.md) | Canonical Self-Hosted vs. SaaS (Free/Pro/Business) feature matrix |
| 10 | [`DEPLOYMENT.md`](./DEPLOYMENT.md) | Self-Host and SaaS deployment runbooks |
| 11 | [`WEBSITE_SPEC.md`](./WEBSITE_SPEC.md) | Marketing website specification (light/glossy theme, use cases, edition-aware pricing) |
| 12 | [`handoff.md`](./handoff.md) | Live, verified project status tracker |

## Suggested Build Order for an AI Coding Agent

1. Read `SRS.md` and `ARCHITECTURE.md` first to establish scope and system boundaries.
2. Scaffold the backend using `DATABASE_SCHEMA.md` and `API_SPEC.md`.
3. Build the Agent using `AGENT_SPEC.md`.
4. Implement dashboard screens against `USER_STORIES.md` acceptance criteria.
5. Validate against `NON_FUNCTIONAL_REQUIREMENTS.md` before each release.
6. Use `ROADMAP.md` to sequence delivery (MVP first, then Phase 2/3/4 modules).

## Source

Derived from the original Vigilon Product Requirements Document (PRD), expanded into implementation-ready specifications.
