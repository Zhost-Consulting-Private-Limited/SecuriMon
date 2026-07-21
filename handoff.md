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

## What is Currently In Progress
- Not yet started code implementation.

## Next Work Startup (Action Items)
1. **Start Batch A (Project Initialization):**
   - Create `/backend`, `/frontend` (or `/website`), and `/agent` folders.
   - Initialize `package.json` in `/backend` (Express or NestJS setup).
   - Initialize `go.mod` in `/agent`.
   - Setup GitHub Actions folder `.github/workflows`.
2. **Start Batch B (Database):**
   - Install Prisma in the backend.
   - Translate the `DATABASE_SCHEMA.md` into `schema.prisma`.

## Important Project Constraints
- **Deployment:** Must be simple (PM2 + systemd/Windows Service). NO Docker or Kubernetes.
- **Database:** Must support SQLite (default/dev) and PostgreSQL (production). Achieved via Prisma ORM.
- **Agent:** Cross-platform (Windows & Linux). Must be lightweight (<40MB RAM, <1% CPU), written in Go, compiled to a single static binary. Windows binary must be signed with an open-source cert via GitHub Actions. Must support OTA auto-updates.
- **Backend:** Monolithic design to handle both Core API and Ingestion. Must include data pruning and automated DB backups.
- **Security:** High standard required (2FA, Dashboard Audit Logs, Code Scanning in CI/CD).
- **Billing:** Razorpay integration for subscriptions.
