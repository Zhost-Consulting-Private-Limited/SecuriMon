# Vigilon - Implementation Plan

This document breaks down the development of the Vigilon platform into sequential, manageable batches. It adheres to the constraints of a monolithic Node.js backend (with Prisma supporting both SQLite and PostgreSQL), a Next.js frontend, a Go-based agent, and a bare-metal/VM deployment strategy (no Docker/K8s).

> **Status note (2026-07-23):** a full code audit found several batches below marked complete in the old `handoff.md` did not correspond to working code (see `handoff.md`'s "Baseline Audit Findings"). This file is kept as historical reference for the intended long-term batch sequence; for the current, accurate build status see `ROADMAP.md` → "This Week's Build" and `handoff.md`. Treat any checkbox-like claim in the batch descriptions below as a target, not a verified fact.

## Phase 1: Foundation & Core Infrastructure
*   **Batch A: Project Initialization & Monorepo Scaffold**
    *   Set up folder structure (`/backend`, `/frontend`, `/agent`).
    *   Initialize Node.js backend and Go module.
*   **Batch B: Database Modeling (Prisma)**
    *   Create `schema.prisma`.
    *   Define models for Tenants, Users, Servers, Metrics, Findings, Threats.
    *   Configure SQLite as the default provider with easy toggle to PostgreSQL.
*   **Batch C: Backend Authentication & Tenancy**
    *   Setup Express/NestJS server.
    *   Implement JWT-based authentication routes (`/auth/login`, `/auth/refresh`).
    *   Implement tenancy middleware.
*   **Batch D: Agent Skeleton & Installation Script**
    *   Write the bash install script (`install.sh`) for 1-click deployment.
    *   Create basic `main.go` for the agent.
    *   Implement systemd service creation inside the install script.
*   **Batch E: Agent Registration & API Handshake**
    *   Backend: `/v1/agent/register` API.
    *   Agent: Initial check-in, API key generation, and saving config to `/etc/vigilon/agent.conf`.

## Phase 2: Telemetry & Ingestion
*   **Batch F: System & Hardware Discovery (Agent)**
    *   Implement OS, CPU, RAM, and Network interface detection in Go.
    *   Send inventory data to backend on startup.
*   **Batch G: Telemetry & Metrics Collection (Agent)**
    *   Implement polling for CPU, RAM, Disk, and Load averages (`/proc` and `/sys`).
    *   Implement local SQLite buffering for offline resilience.
*   **Batch H: Backend Ingestion API**
    *   Create `/v1/agent/{server_id}/telemetry` endpoint.
    *   Store incoming metrics into the raw database tables.
*   **Batch I: Metrics Rollup & Aggregation (Backend)**
    *   Implement a cron job (`node-cron`) to downsample 1-minute metrics into 5-minute and hourly aggregates to keep the database lightweight.

## Phase 3: Security & Threat Detection
*   **Batch J: Security Hardening Scanner (Agent)**
    *   Implement local scans for SSH config, UFW/iptables status, and dangerous file permissions.
*   **Batch K: Threat Detection Engine (Agent)**
    *   Implement log tailing for `/var/log/auth.log` (SSH brute-force detection).
*   **Batch L: Findings & Events API (Backend)**
    *   Endpoints to ingest security scans and real-time threat events.
*   **Batch M: Risk Scoring Engine (Backend)**
    *   Implement logic to calculate 0-100 scores (Health, Security) based on recent metrics and findings.

## Phase 4: Remote Command & Remediation
*   **Batch N: Real-time Communication (WebSocket)**
    *   Backend: Set up WebSocket server for agent connections.
    *   Agent: Implement WebSocket client for persistent connection.
*   **Batch O: Remote Remediation Execution (Agent)**
    *   Implement agent-side command verification.
    *   Allow execution of safe, whitelisted commands (e.g., block IP, restart service).

## Phase 5: Dashboard (Frontend)
*   **Batch P: Frontend Scaffold (Next.js)**
    *   Initialize Next.js + Tailwind CSS.
    *   Setup authentication context, routing, and global sidebar layout.
*   **Batch Q: Dashboard Home & Server Overview**
    *   Build server listing data tables.
    *   Display high-level status indicators and risk scores.
*   **Batch R: Server Details & Metrics Charts**
    *   Integrate charting library (e.g., Recharts).
    *   Visualize CPU, RAM, and Network trends.
*   **Batch S: Security & Threat UI**
    *   Display security findings and timeline events in the dashboard.
*   **Batch T: One-Click Fix UI**
    *   Add UI buttons to trigger remediation commands via the backend API.

## Phase 6: Advanced Monitoring & Alerting
*   **Batch U: Application & Service Monitoring (Agent)**
    *   Detect and monitor systemd services and PM2 instances.
*   **Batch V: Alerting Engine (Backend)**
    *   Implement threshold evaluation (e.g., trigger when CPU > 90% for 5 mins).
*   **Batch W: Notifications System (Backend)**
    *   Integrate SMTP for Email alerts.
    *   Integrate basic Webhooks for Slack/Discord notifications.

## Phase 7: Polish & AI Integration
*   **Batch X: AI Log Digest & Assistant (Backend)**
    *   Integrate OpenAI/Anthropic SDK.
    *   Implement prompt construction using local DB context for the AI Assistant feature.
*   **Batch Y: Multi-Tenant & MSP Features (Backend)**
    *   Refine role-based access control (RBAC).
    *   Allow MSPs to switch between tenant views.
*   **Batch Z: Deployment Scripts & Final Polish**
    *   Write PM2 ecosystem files.
    *   Document Nginx reverse proxy and Certbot (SSL) setup.
    *   Finalize `README.md` deployment instructions.

## Phase 8: Cross-Platform Expansion, CI/CD & Automated Deployment
*   **Batch AA: Cross-Platform Agent Expansion (Windows & Linux)**
    *   Refactor the Go agent codebase to support Windows endpoints natively.
    *   Implement Windows Service registration alongside Linux `systemd`.
*   **Batch BB: Automated Agent Deployment (MeshCentral Style)**
    *   Develop an automated deployment pipeline/script for endpoints.
    *   Ensure agents auto-install, register as background services, and authenticate using deployment tokens seamlessly.
*   **Batch CC: CI/CD - Agent Build & Open-Source Signing (GitHub Actions)**
    *   Create GitHub Actions workflow to automatically compile Go binaries for both Windows (`.exe`) and Linux.
    *   Implement code signing for the Windows agent using an open-source certificate within the pipeline.
    *   Configure GitHub Actions to store the compiled agent artifacts for 1 day.
*   **Batch DD: Full Application Testing CI Pipeline (GitHub Actions)**
    *   Write unit and integration tests across Backend, Frontend, and Agent.
    *   Create a comprehensive GitHub Actions workflow to run the full test suite automatically on PRs and merges.

## Phase 9: Commercialization & Public Site
*   **Batch EE: Marketing Website Setup**
    *   Develop the public-facing product website (refer to `WEBSITE_SPEC.md`).
    *   Explain the product value, host documentation, and link to the SaaS dashboard.
*   **Batch FF: Razorpay Payment Gateway Integration**
    *   Integrate Razorpay SDK in the Node.js backend.
    *   Create frontend billing and subscription management screens (Free, Pro, Business tiers) utilizing Razorpay checkout.

## Phase 10: Security, Lifecycle & Compliance (Enterprise Readiness)
*   **Batch GG: Dashboard Security & 2FA**
    *   Implement TOTP-based Two-Factor Authentication (2FA) for dashboard logins.
    *   Implement Dashboard Audit Logging (recording user actions like "clicked Block IP", "deleted server").
    *   Implement session management (view and revoke active sessions).
*   **Batch HH: Agent Lifecycle Management (OTA Updates & Uninstall)**
    *   Implement Over-The-Air (OTA) secure auto-updates for the Go agent (download latest signed binary, replace, restart).
    *   Create a clean uninstaller script (`uninstall.sh` and Windows equivalent) to remove the agent and configuration completely.
*   **Batch II: Data Retention & Backend Backups**
    *   Implement background cron jobs in the Node.js backend to prune old metrics (e.g., delete raw data > 30 days old).
    *   Create an automated script to backup the Vigilon database (SQLite/Postgres) and upload it to an external S3-compatible storage.
*   **Batch JJ: Privacy & Compliance (GDPR/CCPA)**
    *   Implement "Delete Account" functionality that cascade-deletes all tenant data, servers, metrics, and triggers a self-destruct command to connected agents.
*   **Batch KK: CI/CD Security & E2E Testing**
    *   Add Dependabot and CodeQL/GoSec scanning to the GitHub Actions workflow to scan our own source code.
    *   Add Playwright or Cypress End-to-End (E2E) testing to the GitHub Actions pipeline to test critical UI flows.
