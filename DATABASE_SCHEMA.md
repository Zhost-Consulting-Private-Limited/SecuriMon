# SecuriMon — Database Schema (PostgreSQL)

This document defines the core relational data model. Time-series metrics are assumed to live in a TimescaleDB hypertable (or equivalent) but are shown here in simplified relational form for clarity. All tables include `created_at`/`updated_at` timestamps (omitted below for brevity unless noted).

## 1. Tenancy & Users

```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free', -- free | pro | business
    parent_msp_tenant_id UUID REFERENCES tenants(id), -- null unless managed by an MSP
    white_label_config JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member', -- owner | admin | member | msp_admin
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE install_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ,
    used_count INT NOT NULL DEFAULT 0
);
```

## 2. Servers & Inventory

```sql
CREATE TABLE servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    hostname TEXT NOT NULL,
    os TEXT,
    os_version TEXT,
    kernel_version TEXT,
    cloud_provider TEXT, -- aws | azure | gcp | digitalocean | hetzner | oracle | on_prem
    public_ip INET,
    private_ip INET,
    environment TEXT, -- production | staging | testing
    project TEXT,
    region TEXT,
    customer_label TEXT, -- for MSP grouping
    tags TEXT[],
    api_key_hash TEXT NOT NULL,
    agent_version TEXT,
    last_seen_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending', -- pending | online | offline | decommissioned
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE server_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES servers(id),
    software_name TEXT NOT NULL, -- nginx, docker, postgres, wordpress, etc.
    version TEXT,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 3. Metrics (Time-Series)

```sql
CREATE TABLE metrics_raw (
    server_id UUID NOT NULL REFERENCES servers(id),
    collected_at TIMESTAMPTZ NOT NULL,
    cpu_percent NUMERIC(5,2),
    ram_percent NUMERIC(5,2),
    disk_percent NUMERIC(5,2),
    swap_percent NUMERIC(5,2),
    load_1m NUMERIC(6,2),
    load_5m NUMERIC(6,2),
    load_15m NUMERIC(6,2),
    network_rx_bytes BIGINT,
    network_tx_bytes BIGINT,
    temperature_c NUMERIC(5,2),
    PRIMARY KEY (server_id, collected_at)
);
-- Convert to hypertable: SELECT create_hypertable('metrics_raw', 'collected_at');
-- Rollup tables metrics_5min / metrics_hourly follow the same shape with a bucketed timestamp.
```

## 4. Applications / Services

```sql
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES servers(id),
    manager_type TEXT NOT NULL, -- pm2 | systemd | docker | kubernetes | supervisor
    name TEXT NOT NULL,
    port INT,
    version TEXT,
    status TEXT, -- running | stopped | crash_loop
    restart_count_24h INT DEFAULT 0,
    last_restart_at TIMESTAMPTZ
);
```

## 5. Security Findings & Scans

```sql
CREATE TABLE security_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES servers(id),
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    risk_score INT -- 0-100
);

CREATE TABLE security_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL REFERENCES security_scans(id),
    server_id UUID NOT NULL REFERENCES servers(id),
    rule_id TEXT NOT NULL, -- e.g. ssh.password_login_enabled
    category TEXT NOT NULL, -- ssh | firewall | kernel | users | filesystem | packages
    severity TEXT NOT NULL, -- LOW | MEDIUM | HIGH | CRITICAL
    passed BOOLEAN NOT NULL,
    auto_fixable BOOLEAN NOT NULL DEFAULT false,
    business_impact_text TEXT, -- plain-language explanation
    recommended_action TEXT,
    estimated_fix_time TEXT,
    status TEXT NOT NULL DEFAULT 'open', -- open | fixed | ignored | fix_pending
    detail JSONB,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 6. Threats & Events

```sql
CREATE TABLE threat_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES servers(id),
    event_type TEXT NOT NULL, -- ssh_bruteforce | port_scan | crypto_miner | rootkit | ...
    severity TEXT NOT NULL,
    source_ip INET,
    detail TEXT,
    occurred_at TIMESTAMPTZ NOT NULL,
    auto_remediated BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES servers(id),
    event_category TEXT NOT NULL, -- infra | security | deployment | remediation | backup | ssl
    title TEXT NOT NULL,
    description TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 7. Remediation & Audit

```sql
CREATE TABLE remediation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES servers(id),
    triggered_by TEXT NOT NULL, -- threat_event | finding | manual
    trigger_ref_id UUID,
    action TEXT NOT NULL, -- block_ip | kill_process | restart_service | ...
    params JSONB,
    status TEXT NOT NULL DEFAULT 'pending', -- pending | success | failed
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE remediation_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    action TEXT NOT NULL,
    auto_enabled BOOLEAN NOT NULL DEFAULT false
);
```

## 8. Alerts

```sql
CREATE TABLE alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    server_id UUID REFERENCES servers(id), -- null = applies to all servers
    metric TEXT NOT NULL, -- cpu | disk | ssl_expiry | offline | ssh_attack | ...
    condition TEXT NOT NULL, -- e.g. "> 90"
    channels TEXT[] NOT NULL, -- email, slack, teams, discord, telegram, whatsapp, sms, webhook
    severity_routing JSONB,
    enabled BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_rule_id UUID NOT NULL REFERENCES alert_rules(id),
    server_id UUID NOT NULL REFERENCES servers(id),
    fired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    delivery_status JSONB -- per-channel delivery success/failure
);
```

## 9. Compliance

```sql
CREATE TABLE compliance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    server_id UUID REFERENCES servers(id),
    framework TEXT NOT NULL, -- cis | iso27001 | soc2 | hipaa | pci_dss | owasp | nist
    score INT,
    pdf_url TEXT,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 10. Backups

```sql
CREATE TABLE backup_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES servers(id),
    last_backup_at TIMESTAMPTZ,
    backup_size_bytes BIGINT,
    restore_tested BOOLEAN DEFAULT false,
    cloud_synced BOOLEAN DEFAULT false,
    last_failure_at TIMESTAMPTZ,
    last_failure_reason TEXT
);
```

## 11. Cost Optimization

```sql
CREATE TABLE cost_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES servers(id),
    category TEXT NOT NULL, -- idle_server | unused_volume | old_snapshot | large_logs | unused_ip | ...
    description TEXT,
    estimated_monthly_savings NUMERIC(10,2),
    currency TEXT DEFAULT 'USD',
    detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'open' -- open | applied | dismissed
);
```

## 12. Scores (Risk Scoring Module)

```sql
CREATE TABLE server_scores (
    server_id UUID NOT NULL REFERENCES servers(id),
    scored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    health_score INT,
    performance_score INT,
    security_score INT,
    compliance_score INT,
    availability_score INT,
    backup_score INT,
    overall_score INT,
    scoring_algorithm_version TEXT NOT NULL,
    PRIMARY KEY (server_id, scored_at)
);
```

## 13. Indexing Notes
- All `server_id` foreign key columns should be indexed for dashboard query performance.
- `threat_events(server_id, occurred_at DESC)` composite index for timeline queries.
- `security_findings(server_id, status)` composite index for the "what to fix today" view.
- Time-series tables should use hypertable partitioning (Timescale) or native Postgres partitioning by month.

## 14. Row-Level Security
All tenant-scoped tables (`servers`, `security_findings`, `threat_events`, `alert_rules`, etc.) should enforce `tenant_id` (directly or via `server_id` join) row-level security policies to guarantee strict multi-tenant isolation at the database layer, independent of application-layer checks.
