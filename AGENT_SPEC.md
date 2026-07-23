# Vigilon — Agent Technical Specification

## 1. Overview
The Agent is a single lightweight binary installed on each monitored Linux server. It is the sole component with local visibility into the host and is responsible for collection, detection, enforcement, and (optionally) remediation.

**Language:** Rust (preferred) or Go
**Distribution:** Static binary, installed as a `systemd` service (`vigilon-agent.service`)
**Resource budget:** < 40 MB resident memory, < 1% average CPU
**Local storage:** SQLite (buffering, local cache, offline resilience)

## 2. Installation Flow
1. User runs `curl -sSL install.product.com | bash` (or the `wget` + `bash` equivalent) with a tenant-scoped install token embedded in the URL or passed as an env var.
2. Install script:
   - Detects OS/distro/arch.
   - Downloads the correct static binary.
   - Installs binary to `/usr/local/bin/vigilon-agent`.
   - Creates systemd unit and enables/starts the service.
   - Registers the server with the backend using the install token, receiving a per-server API key in return, stored at `/etc/vigilon/agent.conf` (mode `0600`, root-owned).
3. Agent performs initial discovery scan and reports inventory within the first check-in cycle.
4. Total elapsed time target: **< 2 minutes**.

## 3. Core Agent Modules

### 3.1 Discovery Module
- Detects OS/distro/version, kernel version, CPU/RAM/disk specs, cloud provider (via IMDS probing: AWS 169.254.169.254, Azure/GCP equivalents), public/private IP.
- Detects installed software by checking package managers (`dpkg`, `rpm`), running processes, and well-known config file locations (nginx.conf, apache2.conf, docker.sock, pm2 process list, etc.).
- Runs on install, then every 6 hours (configurable), and on-demand via backend command.

### 3.2 Metrics Collector
- Polls `/proc`, `/sys`, and relevant syscalls for CPU, RAM, swap, disk usage/IO, network throughput, load average, temperature (if sensors available).
- Sampling interval: default 30–60 seconds (configurable, bounded to protect resource budget).
- Batches and compresses metrics before transmission; buffers locally in SQLite if offline.

### 3.3 Security Hardening Scanner
- Runs a rules-based check engine against SSH config (`sshd_config`), firewall state (ufw/iptables/nftables), sysctl parameters, user/password policy (`/etc/shadow` metadata, not contents), filesystem permissions (world-writable, SUID/SGID scan), and installed package versions vs. known CVE feed (synced periodically from backend).
- Runs on a schedule (default: daily) and on-demand.
- Outputs a structured findings list with rule ID, severity, pass/fail, and remediation metadata (whether auto-fixable, command needed).

### 3.4 Threat Detection Engine
- Real-time, rule + heuristic based detection for: brute-force/SSH attacks (auth log tailing), port scans (connection pattern analysis), reverse shell indicators (suspicious outbound connections from shell processes), crypto-miner signatures (CPU + known process/binary patterns), privilege escalation attempts, rootkit indicators (checksum/behavioral heuristics), unauthorized SSH key changes (`authorized_keys` file watch), unexpected cron jobs (crontab diffing), hidden/unknown user accounts (`/etc/passwd` diffing), modified system binaries (checksum comparison against package manager manifest).
- Target detection latency: **< 60 seconds** from event occurrence to alert dispatch.
- Uses local eBPF hooks where available (optional enhancement) for deeper process/network visibility with lower overhead than polling.

### 3.5 Application Monitor
- Discovers and tracks PM2 process lists, systemd units, Docker containers, Kubernetes pods (if kubelet present), Supervisor programs.
- Tracks running state, restart count/frequency, resource usage per process, and tails associated log output for crash signatures.

### 3.6 Log Tailer
- Tails relevant logs (syslog, auth.log, nginx/apache access & error logs, application logs registered by the user) with rotation-aware file handle management.
- Forwards structured log events (not raw firehose) to reduce bandwidth — pre-filters at the edge for relevance (errors, warnings, security-relevant lines) before shipping.

### 3.7 Policy & Remediation Executor
- Receives signed remediation commands from the backend (e.g. "block IP X", "restart service Y", "kill PID Z").
- Verifies command signature before execution.
- Executes locally-permitted remediation actions only from an allow-list (see below); reports success/failure back to backend.
- Maintains a local action log (mirrored to backend audit log).

**Allow-listed remediation actions (MVP):**
- Block IP (via firewall rule)
- Ban brute-force source (integrate with Fail2Ban or equivalent)
- Kill a specific process by PID/signature match (crypto-miner, confirmed malicious process)
- Restart a specific managed service (systemd/PM2/Docker container)
- Rotate logs
- Remove specified temp files/directories
- Renew SSL certificate (trigger Certbot or equivalent renewal)
- Apply rate-limiting rule to a source IP

### 3.8 Local Buffer & Sync
- SQLite-backed queue ensures no data loss during network interruption.
- Exponential backoff reconnect strategy.
- Deduplication on replay to avoid double-counting events after reconnect.

## 4. Communication Protocol
- Outbound-only. Agent initiates all connections (HTTPS for batched telemetry, WebSocket for real-time events and remediation command channel).
- Authentication: per-server API key issued at install, rotatable from the dashboard without requiring reinstall (agent picks up new key via signed config push).
- All payloads TLS 1.2+ encrypted; message integrity verified.

## 5. Configuration
Local config file: `/etc/vigilon/agent.conf`
```
tenant_id = "..."
server_id = "..."
api_key = "..."
backend_url = "https://ingest.product.com"
metrics_interval_seconds = 60
scan_schedule = "daily"
auto_remediation = {
  block_ip = true
  ban_bruteforce = true
  kill_miner = false
  restart_service = true
  rotate_logs = true
  renew_ssl = true
}
log_sources = ["/var/log/nginx/*.log", "/var/log/auth.log"]
```
Users can adjust `auto_remediation` flags and `log_sources` from the dashboard; changes are pushed to the agent via the config channel.

## 6. Agent Update Mechanism
- Agent checks for updates on a schedule (default daily) against a signed release manifest.
- Updates applied via atomic binary swap + service restart, with automatic rollback if the new binary fails health check within N seconds of restart.
- Staged rollout supported at the backend level (canary tenant cohort before general availability).

## 7. Failure Modes & Resilience
| Failure | Agent Behavior |
|---|---|
| Backend unreachable | Buffer telemetry locally (SQLite), retry with backoff, continue local detection/enforcement |
| Disk full (agent's own storage) | Drop oldest buffered non-critical data first, preserve security event buffer longest |
| Agent crash | systemd auto-restart; crash reported to backend on next successful check-in |
| Remediation command fails | Report failure + reason to backend; do not retry destructive actions automatically |
| Corrupted local SQLite | Agent recreates local store, logs data-loss window, resumes operation |

## 8. Testing Requirements
- Unit tests per module (discovery, scanner, detection, remediation).
- Integration test matrix across supported OS list (Ubuntu 20.04/22.04/24.04, Debian 11/12, CentOS Stream, RHEL 8/9, AlmaLinux, Rocky Linux, Amazon Linux 2/2023).
- Resource budget verification test (memory/CPU under sustained load) as a CI gate — build fails if budget exceeded.
- Chaos test: simulate network partition, verify buffering/replay correctness.
