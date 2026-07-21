# SecuriMon - Handoff & Status Tracker

This document tracks the current state of the project. Update this file at the end of every work session or when significant milestones are reached. It provides the exact context needed to resume work.

## Current Status
**Phase:** Phase 1 - Foundation & Core Infrastructure
**Current Batch:** Ready to start **Batch A**

## What Has Been Completed
- [x] Initial requirement gathering and documentation analysis.
- [x] Architecture adaptation (Monolithic Node.js, Next.js Frontend, Go Agent, SQLite/Postgres DB, No Docker).
- [x] Detailed implementation plan created (`implementation_plan.md`).
- [x] Handoff document created.
- [x] Extended implementation plan with CI/CD, cross-platform agents (Windows/Linux), Razorpay, and Website spec (`WEBSITE_SPEC.md`).
- [x] Extended implementation plan with Phase 10: Security, Agent OTA Updates, Data Retention, and GDPR compliance.
- [x] Batch A: Project Initialization (Folders, Node.js `package.json`, Go module, GitHub actions folder).
- [x] Public GitHub Repository created.
- [x] Batch B: Database Schema & Prisma Setup (`schema.prisma` translated and SQLite configured).
- [x] Batch C: Backend Authentication & Tenancy (Express, JWT, bcrypt, tenancy middleware).
- [x] Batch D: Agent Skeleton & Installation Script (`main.go`, `config.go`, `install.sh`).
- [x] Batch CC: GitHub workflow `build-agent.yml` implemented for cross-platform agent build (Linux/Windows) with 1-day artifact retention and Windows signing stub.
- [x] Batch E & F: Agent Auto-Registration & Hardware Discovery (CPU, RAM, Network via gopsutil).
- [x] Batch H & I: Backend Ingestion API and Metrics Aggregation Cron Jobs (Raw -> 5m -> Hourly) and Data Pruning.

## What is Currently In Progress
- Ready to start Phase 3 (Security & Threat Detection).

## Next Work Startup (Action Items)
1. **Start Batch J & K (Security Hardening Scanner & Threat Detection - Agent):**
   - Implement local scans for SSH config, UFW/iptables status, and file permissions in Go.
   - Implement log tailing for `/var/log/auth.log` (SSH brute-force detection).
2. **Start Batch L & M (Findings & Risk Scoring - Backend):**
   - Create endpoints for `POST /v1/agent/:serverId/findings` and `/events`.
   - Implement scoring logic to calculate Health and Security scores.

## Important Project Constraints
- **Deployment:** Must be simple (PM2 + systemd/Windows Service). NO Docker or Kubernetes.
- **Database:** Must support SQLite (default/dev) and PostgreSQL (production). Achieved via Prisma ORM.
- **Agent:** Cross-platform (Windows & Linux). Must be lightweight (<40MB RAM, <1% CPU), written in Go, compiled to a single static binary. Windows binary must be signed with an open-source cert via GitHub Actions. Must support OTA auto-updates.
- **Backend:** Monolithic design to handle both Core API and Ingestion. Must include data pruning and automated DB backups.
- **Security:** High standard required (2FA, Dashboard Audit Logs, Code Scanning in CI/CD).
- **Billing:** Razorpay integration for subscriptions.
