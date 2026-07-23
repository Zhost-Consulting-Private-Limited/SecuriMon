# Vigilon — API Specification

## 1. Overview
This document defines the REST and WebSocket API contract between:
- Agent ↔ Backend (ingestion, config, remediation commands)
- Dashboard ↔ Backend (Core API)

Base URL (example): `https://vigilon.bithost.in/v1`
Ingestion URL (example): `https://vigilon.bithost.in/v1`

All endpoints use JSON request/response bodies unless noted. All timestamps are ISO 8601 UTC.

## 2. Authentication

| Client | Method |
|---|---|
| Dashboard (user) | Bearer JWT (obtained via `/auth/login`, refreshed via `/auth/refresh`) |
| Agent | Bearer API key (per-server, issued at install, rotatable) |
| MSP switching tenants | JWT includes active `tenant_id` claim, switchable via `/auth/switch-tenant` |

## 3. Agent-Facing Endpoints (Ingestion Service)

### `POST /v1/agent/register`
Registers a new agent using the install token.
```json
// Request
{
  "install_token": "tok_abcd1234",
  "hostname": "app-01",
  "os": "ubuntu",
  "os_version": "22.04",
  "cloud_provider": "aws",
  "public_ip": "203.0.113.10",
  "private_ip": "10.0.1.5"
}
// Response
{
  "server_id": "srv_9f8e7d",
  "api_key": "key_live_...",
  "tenant_id": "tnt_1234"
}
```

### `POST /v1/agent/{server_id}/telemetry`
Batched metrics submission.
```json
{
  "collected_at": "2026-07-21T10:00:00Z",
  "cpu_percent": 21.4,
  "ram_percent": 46.2,
  "disk_percent": 61.0,
  "load_average": [0.5, 0.4, 0.3],
  "network": { "rx_bytes": 102400, "tx_bytes": 51200 },
  "top_processes": [{"pid": 1234, "name": "node", "cpu": 12.1, "mem": 8.4}]
}
```
Response: `202 Accepted`

### `POST /v1/agent/{server_id}/findings`
Security scan results.
```json
{
  "scan_id": "scan_2026072101",
  "findings": [
    {
      "rule_id": "ssh.password_login_enabled",
      "category": "ssh",
      "severity": "HIGH",
      "passed": false,
      "auto_fixable": true,
      "details": { "config_path": "/etc/ssh/sshd_config" }
    }
  ]
}
```

### `POST /v1/agent/{server_id}/events`
Real-time threat/event stream (also available over WebSocket, see §5).
```json
{
  "event_type": "ssh_bruteforce",
  "severity": "HIGH",
  "source_ip": "198.51.100.23",
  "occurred_at": "2026-07-21T11:11:00Z",
  "detail": "12 failed login attempts in 60 seconds"
}
```

### `GET /v1/agent/{server_id}/config`
Returns current desired configuration (poll or push via WebSocket).

### `POST /v1/agent/{server_id}/remediation-result`
Agent reports outcome of an executed remediation command.
```json
{
  "command_id": "cmd_5566",
  "action": "block_ip",
  "status": "success",
  "executed_at": "2026-07-21T11:12:03Z"
}
```

## 4. Dashboard-Facing Endpoints (Core API)

### Auth
- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `POST /v1/auth/switch-tenant`

### Servers
- `GET /v1/servers` — list servers (supports `?group_by=environment|project|region|customer|tag`)
- `GET /v1/servers/{server_id}` — server overview (health, scores, status)
- `GET /v1/servers/{server_id}/metrics?range=24h` — historical metrics
- `GET /v1/servers/{server_id}/inventory` — discovered software/services
- `POST /v1/servers/{server_id}/rescan` — trigger on-demand discovery/security scan

### Security & Compliance
- `GET /v1/servers/{server_id}/findings` — current security findings
- `POST /v1/servers/{server_id}/findings/{finding_id}/fix` — apply one-click fix (issues signed remediation command to agent)
- `GET /v1/servers/{server_id}/compliance?framework=cis` — compliance report
- `POST /v1/servers/{server_id}/compliance/report` — generate PDF report (returns download URL)

### Threats & Timeline
- `GET /v1/servers/{server_id}/threats` — threat event log
- `GET /v1/servers/{server_id}/timeline` — unified chronological event feed

### Applications
- `GET /v1/servers/{server_id}/applications` — discovered services/processes and status

### Alerts
- `GET /v1/alerts/rules`
- `POST /v1/alerts/rules` — create alert rule (threshold + channel routing)
- `PUT /v1/alerts/rules/{rule_id}`
- `DELETE /v1/alerts/rules/{rule_id}`
- `GET /v1/alerts/history`

### Cost Optimization
- `GET /v1/servers/{server_id}/cost-recommendations`

### Logs
- `GET /v1/servers/{server_id}/logs/digest?date=2026-07-20` — AI-generated daily digest

### AI Assistant
- `POST /v1/ai/ask`
```json
// Request
{ "server_id": "srv_9f8e7d", "question": "Why did CPU increase yesterday?" }
// Response
{
  "answer": "CPU usage rose from 20% to 68% between 14:00–15:30 due to a Node.js process (PID 4321) handling an unusual spike in incoming requests.",
  "citations": [{"type": "metric", "metric": "cpu_percent", "range": "2026-07-20T14:00Z/2026-07-20T15:30Z"}]
}
```

### Multi-Tenant (MSP)
- `GET /v1/tenants` — list managed customer tenants (MSP role only)
- `POST /v1/tenants` — create new customer tenant
- `GET /v1/tenants/{tenant_id}/servers`

### Billing
- `GET /v1/billing/plan`
- `POST /v1/billing/upgrade`
- `GET /v1/billing/usage`

## 5. WebSocket Channels

| Channel | Direction | Purpose |
|---|---|---|
| `wss://vigilon.bithost.in/v1/agent/{server_id}/stream` | Agent ↔ Backend | Real-time event push, remediation command delivery |
| `wss://vigilon.bithost.in/v1/dashboard/{tenant_id}/stream` | Dashboard ↔ Backend | Live metric updates, live alert push, live timeline updates |

Remediation command payload (Backend → Agent):
```json
{
  "command_id": "cmd_5566",
  "action": "block_ip",
  "params": { "ip": "198.51.100.23" },
  "signature": "base64-signed-payload"
}
```

## 6. Error Format
```json
{
  "error": {
    "code": "server_not_found",
    "message": "No server exists with the given ID for this tenant.",
    "status": 404
  }
}
```

## 7. Rate Limits
- Agent telemetry endpoints: rate-limited per server (not per tenant) to prevent one runaway agent from affecting others.
- Dashboard API: standard per-tenant rate limit (e.g. 300 req/min), returned via `X-RateLimit-*` headers.

## 8. Versioning
- URL-based versioning (`/v1/...`). Breaking changes require a new version path; additive changes are backward compatible within a version.
