# SecuriMon — System Architecture

## 1. High-Level Overview

```
                              ┌─────────────────────────┐
                              │      Web Dashboard       │
                              │   (React / Next.js)      │
                              └────────────┬─────────────┘
                                           │ HTTPS / WSS
                              ┌────────────▼─────────────┐
                              │        API Gateway        │
                              │  (Auth, Rate Limit, WAF)  │
                              └────────────┬─────────────┘
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
          ┌─────────▼────────┐   ┌──────────▼─────────┐   ┌────────▼─────────┐
          │   Core API        │   │  Ingestion Service   │   │  AI Service        │
          │ (Go / Laravel)    │   │  (Go, high-throughput)│   │ (LLM orchestration)│
          └─────────┬────────┘   └──────────┬─────────┘   └────────┬─────────┘
                    │                       │                       │
          ┌─────────▼───────────────────────▼───────────────────────▼─────────┐
          │                       Message Bus (NATS / Kafka)                    │
          └─────────┬───────────────────────┬───────────────────────┬─────────┘
                    │                       │                       │
          ┌─────────▼────────┐   ┌──────────▼─────────┐   ┌────────▼─────────┐
          │  PostgreSQL       │   │  Time-Series Store   │   │  Redis (cache,     │
          │  (core relational │   │  (metrics, e.g.       │   │  sessions, queues) │
          │   data)           │   │  TimescaleDB)         │   │                    │
          └───────────────────┘   └───────────────────────┘   └────────────────────┘

                                           ▲
                                           │ Outbound-only HTTPS/WSS
                              ┌────────────┴─────────────┐
                              │        Agent Fleet         │
                              │  (Rust/Go binary, systemd)  │
                              └────────────┬─────────────┘
                     ┌──────────┬──────────┼──────────┬──────────┐
                 Server A    Server B   Server C   Server D   Server N
```

## 2. Components

### 2.1 Agent
- Single static binary, installed via systemd service.
- Responsibilities: metric collection, security scanning, threat detection, log tailing, policy enforcement, local caching (SQLite), remediation execution.
- Communicates **outbound only** — no inbound ports required on the customer server, minimizing attack surface and firewall friction.
- Local SQLite buffer ensures telemetry is not lost during connectivity gaps; agent replays buffered data on reconnect.

### 2.2 API Gateway
- Terminates TLS, handles authentication (JWT/session for dashboard users, API-key/mTLS for agents), rate limiting, and basic WAF rules.

### 2.3 Ingestion Service
- High-throughput endpoint dedicated to receiving agent telemetry (metrics, events, logs) and publishing to the message bus.
- Decoupled from the Core API so a burst of telemetry cannot degrade dashboard responsiveness.

### 2.4 Core API
- Serves the dashboard: server inventory, findings, alerts, configuration, billing, multi-tenant management.
- Business logic for risk scoring, compliance mapping, and recommendation generation.

### 2.5 AI Service
- Orchestrates LLM calls for: log summarization, AI Assistant Q&A, and translating raw technical findings into business-impact language.
- Retrieval layer pulls scoped context (this server/tenant only) before calling the model — no cross-tenant data leakage.

### 2.6 Message Bus
- Decouples ingestion from processing (scoring engine, threat detection engine, alerting engine, cost optimization engine each subscribe to relevant topics).
- Recommended: NATS for MVP simplicity; Kafka if higher durability/replay guarantees are needed at scale (per original roadmap).

### 2.7 Data Stores
- **PostgreSQL**: tenants, users, servers, findings, alert configs, compliance reports, audit log (see `DATABASE_SCHEMA.md`).
- **Time-series store** (TimescaleDB extension on Postgres, or a dedicated TSDB): CPU/RAM/disk/network metrics at multiple resolutions.
- **Redis**: session storage, short-lived caches, background job queues.

### 2.8 Web Dashboard
- React/Next.js SPA, Tailwind styling.
- Real-time updates via WebSocket subscription per server/tenant.

## 3. Processing Pipelines

### 3.1 Metrics Pipeline
Agent → Ingestion Service → Message Bus (`metrics.raw`) → Aggregation worker → Time-series store (multi-resolution rollups) → Dashboard (via API/WebSocket).

### 3.2 Security Scan Pipeline
Agent (scheduled local scan) → Findings payload → Ingestion Service → Message Bus (`security.findings`) → Scoring Engine (updates Risk/Security Score) → Recommendation Engine (translates to plain language + one-click fix metadata) → Postgres → Dashboard.

### 3.3 Threat Detection Pipeline
Agent (real-time local detection rules) → Event payload → Ingestion Service → Message Bus (`threats.events`) → Alerting Engine (matches against alert rules) → Notification dispatch (Email/Slack/etc.) and/or Auto-Remediation Engine (if enabled for that action type) → Server Timeline.

### 3.4 Auto-Remediation Pipeline
Threat/finding triggers remediation policy check → if auto-remediation enabled for category → command dispatched to Agent via WebSocket → Agent executes locally → result reported back → logged to audit trail and Server Timeline.

### 3.5 AI Assistant Pipeline
User question (dashboard) → Core API → AI Service → Context retrieval (scoped metrics/findings/logs for that server/tenant) → LLM call → Response with citations → Dashboard.

## 4. Deployment Topology
- Backend deployed as containerized services (Docker/Kubernetes) for horizontal scalability of Ingestion and API layers.
- Multi-region considerations deferred to Phase 2+, but ingestion endpoints should be designed to support geo-distributed deployment (agents connect to nearest region).
- Agent auto-updates via signed binary releases, staged rollout (canary tenants first).

## 5. Security Architecture Notes
- Agent-to-backend auth: mutual TLS or signed API tokens, rotatable without reinstall.
- All secrets (cloud billing credentials, notification webhooks) encrypted at rest using envelope encryption (KMS-backed).
- Auto-remediation commands are signed and verified by the agent before execution to prevent command injection via a compromised channel.
- Multi-tenant data isolation enforced at the database layer (row-level security or tenant_id scoping on every query) in addition to the application layer.

## 6. Scalability Considerations
- Ingestion Service and Message Bus sized for high-frequency, low-payload telemetry (thousands of servers reporting every 30–60s).
- Time-series store uses downsampling/retention policies (raw 24h → 5-min for 30 days → hourly for 90 days) to bound storage growth.
- AI Service calls are scoped and cached where possible (e.g. daily log digest generated once per server per day, not per request).
