# Vigilon - Handoff & Status Tracker

This document tracks the current, *verified* state of the project. Update it at the end of every work session. Unlike the previous version of this file, every line below has been checked against the actual code (build output, grep, file reads) as of 2026-07-23 — not against what was intended to be built.

## Current Status
**Phase:** Restructure Sprint (see `ROADMAP.md` → "This Week's Build") — repositioning as a two-edition (Self-Hosted / SaaS) enterprise security & audit platform, on top of a codebase that was previously in a non-building state despite prior status tracking claiming otherwise.

## Baseline Audit Findings (why this file was rewritten)
A full audit on 2026-07-23 found the codebase materially behind the previous version of this document:
- **Agent (Go)** did not compile: `crossplatform.go` had a broken string literal, unused imports, and referenced a non-existent `Config.ServiceID` field; `api.go`/`discovery.go` had duplicate type/function declarations.
- **Backend (TypeScript)** failed `tsc`: the `applications` route wrote to a Prisma model (`applicationService`) that doesn't exist in the schema (the real model is `Application`); `server.ts` had unsound query/param type handling.
- **Frontend**: login/register were 100% mocked (register was a byte-for-byte copy of login), all dashboard/threats/scan pages used hardcoded mock arrays with no API calls, `inventory` and `applications` pages were empty files, the sidebar linked to 4 non-existent routes, and the root layout wrapped the public marketing pages in the dashboard sidebar shell.
- **`automation/deployer.go`** was syntactically invalid Go with no `go.mod`, unreferenced anywhere.
- **CI** workflows had inconsistent Go version pins and would have failed given the above; no tests exist anywhere in the repo; no CodeQL despite requesting the permission.
- Previously claimed-complete batches (Application Service Monitoring, Alerting Engine, Notifications System, cross-platform agent, automated deployment scripts) did not correspond to working code — see the audit detail above per item.

## What Is Actually Working (verified)
- Prisma schema (`backend/prisma/schema.prisma`) is comprehensive and matches `DATABASE_SCHEMA.md` closely — the best-built part of the backend.
- Agent core loop (once build-fixed): discovery via gopsutil, metrics collection, SSH/UFW security scan, `auth.log` brute-force threat detection, a 3-action remediation whitelist, reconnecting WebSocket client.
- Backend JWT + bcrypt auth, per-server API-key auth for agents, WebSocket server for agent comms.
- AI engine (`backend/src/services/ai/engine.ts`, `logdigest.ts`) — real OpenAI SDK integration with DB-scoped prompt context, graceful degradation when no key is configured.
- Metrics aggregation cron (raw → 5min → hourly rollups + pruning).
- Marketing website pages exist (home/features/pricing) with real layout and copy, ahead of the app pages in polish (being redesigned this sprint for the light/glossy direction).

## This Sprint's Work (see `ROADMAP.md` "This Week's Build" for the authoritative list)
Tracked live via the session's task list, not restated here batch-by-batch to avoid this file drifting from reality again. At the end of each work session, update **only** the two sections above (status, and what's verified working) with what has actually been confirmed by running the build/tests — not what was attempted.

## Ground Rule Going Forward
**Do not mark anything "complete" in this file without having actually run it** (`go build`, `tsc --noEmit`, a manual browser click-through, or an automated test). This file's previous drift from reality is the reason the restructure sprint had to start with a full re-audit instead of building on top of assumed-working code.
