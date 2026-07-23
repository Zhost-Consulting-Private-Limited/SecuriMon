# Software Requirements Specification (SRS)
## Project: Vigilon — Enterprise Server Security, Monitoring & Audit Platform

**Version:** 1.1
**Status:** Draft for Development
**Document Owner:** Zhost Consulting Private Limited
**Powered By:** <a href="www.bithost.in" target="_blank">Bithost</a>
**Email:** sales@bithost.in | support@bithost.in

---

## 1. Introduction

### 1.1 Purpose
This document specifies the functional and system requirements for Vigilon, an enterprise-grade security, monitoring, and audit platform that continuously watches, secures, and reports on servers and the services running on them, on behalf of startups, SMEs, developers, and DevOps teams who do not want (or cannot afford) to build and staff a dedicated DevOps/security/compliance function. It is intended to be used directly by engineering (human or AI) to design, build, and test the product.

Vigilon is explicitly **not limited to web servers or application servers** — the agent and its detection/scoring logic are designed to observe and assess any service running on a monitored host (databases, queues, cache layers, background workers, internal tooling, etc.), giving the platform manager a single view of the attack surface and health of the whole fleet, not just the parts that happen to serve HTTP traffic.

### 1.2 Scope
Vigilon consists of:
- A lightweight **Agent** installed on customer servers (cloud or on-premises) via a single install command.
- A **Backend** that ingests telemetry, stores state, runs analysis, and serves the API — operated either by the customer (Self-Hosted edition) or by Vigilon/an MSP as a managed service (SaaS edition). See §2.7 and `FEATURE_TIERS.md` for the edition split.
- A **Web Dashboard** where customers view server health, security posture, threats, audit/compliance evidence, and (SaaS) costs, and configure alerts and remediations.

Vigilon must **not** be positioned or built as "just another monitoring tool." Feature parity with Grafana/Datadog/New Relic/Zabbix/Prometheus is explicitly out of scope as a goal; the product's differentiation is the combination of monitoring + security hardening + threat detection + auto-remediation + compliance/audit reporting + AI guidance in one always-on system requiring zero configuration, deployable either as a self-hosted platform or a managed SaaS.

### 1.3 Intended Audience
- Engineering teams (backend, agent, frontend, AI) building the product
- AI coding agents (e.g. Claude Code) implementing modules from this spec
- QA/test engineers validating acceptance criteria
- Product/design stakeholders reviewing scope

### 1.4 Definitions
| Term | Definition |
|------|------------|
| Agent | The lightweight binary installed on a monitored server |
| Tenant | A customer account, which may own one or more servers |
| MSP | Managed Service Provider managing multiple tenants |
| Risk Score | A 0–100 composite score representing server security/health risk |
| Auto-Remediation | An automatic corrective action taken by the agent without human intervention |
| CVE | Common Vulnerabilities and Exposures identifier |

### 1.5 References
- Original Vigilon PRD (source document)
- CIS Benchmarks for Linux
- OWASP Top 10
- ISO 27001, SOC2, HIPAA, PCI DSS, NIST frameworks (for compliance module)

---

## 2. Overall Description

### 2.1 Product Perspective
Vigilon is a new, standalone SaaS product. It is cloud-provider agnostic and works on AWS, Azure, GCP, DigitalOcean, Hetzner, Oracle Cloud, and on-premise Linux VMs. It is composed of three deployable units: Agent, Backend API, and Dashboard frontend, communicating over authenticated HTTPS/WebSocket channels.

### 2.2 Product Philosophy (Design Constraints)
1. The customer should **never need to SSH into the server** unless they choose to.
2. Everything important must be visible from the dashboard.
3. Install once, forget forever — zero ongoing configuration required for baseline value.
4. Complex technical findings must be translated into **business-impact language** with a recommended or automatic fix — never raw technical jargon as the primary presentation.
5. The product must answer four questions confidently within one minute of opening the dashboard:
   1. Is my server healthy?
   2. Is my application running correctly?
   3. Is someone trying to attack me?
   4. What should I fix today, in priority order?

### 2.3 User Classes and Characteristics
| User Class | Description | Technical Level |
|---|---|---|
| Startup Founder / SMB Owner | Owns 1–5 servers, deployed app themselves | Low-to-medium Linux knowledge |
| Agency / Freelancer | Manages servers for multiple clients | Medium technical knowledge |
| MSP / Hosting Provider | Manages many tenants, needs white-label | High technical knowledge |
| DevOps / Security Team | Uses platform to augment existing tooling | High technical knowledge |

### 2.4 Operating Environment
- **Agent OS support (MVP):** Ubuntu, Debian, CentOS, RHEL, AlmaLinux, Rocky Linux, Amazon Linux
- **Agent language:** Rust (preferred) or Go, compiled as a static binary
- **Backend:** Go and/or Laravel services, PostgreSQL, Redis, message bus (Kafka/NATS in later phase)
- **Frontend:** React / Next.js / Tailwind, served over HTTPS
- **Browsers supported:** Latest 2 versions of Chrome, Firefox, Edge, Safari

### 2.5 Design and Implementation Constraints
- Agent memory footprint: **< 40 MB** resident
- Agent CPU usage: **< 1%** average
- Installation time: **< 2 minutes**, single command, zero required configuration
- All customer credentials/secrets stored encrypted at rest
- Auto-remediation actions must be reversible or logged with rollback information where feasible

### 2.6 Assumptions and Dependencies
- Target servers have outbound internet access to reach the Vigilon backend (agent uses outbound-only connections; no inbound ports required on the customer server).
- Customers grant the agent root or sudo-equivalent privileges for hardening/remediation actions.
- Cloud provider billing API access (for cost optimization module) is optional and requires customer-provided read-only credentials.

### 2.7 Deployment Editions

Vigilon ships from a single codebase in two editions, selected at backend boot by a `DEPLOYMENT_MODE` setting. The full feature-by-feature matrix is the canonical `FEATURE_TIERS.md`; this section states the product-level distinction only.

- **Self-Hosted Edition**: the customer runs the backend, database, and agents entirely on their own infrastructure. Single-tenant (one organization's servers), no billing subsystem, no MSP/white-label capability, community support. This is the edition for teams that want full data ownership and are comfortable operating a small Node.js + Postgres/SQLite service themselves (see `DEPLOYMENT.md` Part A).
- **SaaS Edition**: Vigilon (or an MSP reselling it) operates the backend as a managed multi-tenant service. Billed via Razorpay subscriptions (Free/Pro/Business), supports MSP parent-tenant management and white-labeling on the Business tier, vendor-supported (see `DEPLOYMENT.md` Part B).

Both editions expose the same core product experience (the four guiding questions in §2.2 apply equally to both) — the difference is operational (who runs it, who pays for it) and in a small number of tenancy/billing-dependent features, not in the quality or completeness of the core monitoring/security/audit functionality.

---

## 3. System Features (Functional Requirements)

Each feature below includes an ID, description, and functional requirements (FR). These map to the 20 core modules in the original product concept.

### 3.1 Installation & Onboarding (FR-1xx)
- **FR-101**: The system shall provide a single shell command (`curl -sSL install.product.com | bash`) that installs the agent with no required flags or configuration.
- **FR-102**: Installation shall complete in under 2 minutes on a reference 1 vCPU / 1GB RAM instance.
- **FR-103**: Upon install, the agent shall auto-discover: OS/distro, kernel version, installed web servers, databases, runtimes, containers, cloud provider (via metadata endpoints), public IP, private IP, and installed software inventory.
- **FR-104**: The agent shall register itself with the backend using a per-tenant install token embedded in the install script.
- **FR-105**: On first successful check-in, the dashboard shall display the new server within 30 seconds.

### 3.2 Server Overview / Home (FR-2xx)
- **FR-201**: The dashboard shall display, per server: overall Health %, CPU %, RAM %, Disk %, Uptime, Last Reboot time, Internet reachability, SSL validity, Firewall status, Backup status, and Risk Score (0–100).
- **FR-202**: All Server Overview values shall refresh at minimum every 60 seconds.
- **FR-203**: The system shall present a single aggregate status (e.g. "Healthy" / "Needs Attention" / "Critical") derived from sub-scores.

### 3.3 Infrastructure Discovery (FR-3xx)
- **FR-301**: The agent shall detect OS/distro and version (Ubuntu, Debian, CentOS, RHEL, Alma, Rocky, Amazon Linux).
- **FR-302**: The agent shall detect installed software including but not limited to: Nginx, Apache, PM2, Node.js, PHP, Java, Python, Docker, Redis, RabbitMQ, MongoDB, MySQL, PostgreSQL, Elasticsearch, OpenSearch, Odoo, ERPNext, WordPress, Laravel, Next.js, React, Express.
- **FR-303**: Discovery results shall be re-scanned at a configurable interval (default: every 6 hours) and on-demand via dashboard action.

### 3.4 Security Hardening Scanner (FR-4xx)
- **FR-401**: The system shall scan and report SSH configuration: root login disabled, password login disabled, custom SSH port, Fail2Ban presence, MaxAuthTries setting, idle timeout.
- **FR-402**: The system shall scan firewall configuration: UFW/iptables/nftables enabled, default-deny policy, minimal open ports.
- **FR-403**: The system shall scan kernel/sysctl hardening: IPv4/IPv6 settings, SYN flood protection, and other CIS-aligned sysctl parameters.
- **FR-404**: The system shall audit user accounts: password policy compliance, unused/stale accounts, sudo privilege assignments.
- **FR-405**: The system shall scan the filesystem for world-writable files, dangerous permission combinations, and unexpected SUID/SGID binaries.
- **FR-406**: The system shall check installed package versions against known-vulnerable versions and flag outdated packages and pending kernel updates.
- **FR-407**: The system shall compute a Security Risk Score (0–100) from the above checks and display category-level pass/fail detail.

### 3.5 Threat Detection (FR-5xx)
- **FR-501**: The system shall detect and alert on: brute-force login attempts, SSH attacks, port scans, common web attack patterns, reverse shell indicators, cryptocurrency miner processes, privilege escalation attempts, rootkit indicators, unexpected binaries, unauthorized cron jobs, suspicious processes, unexpected outbound traffic, hidden/unknown users, unauthorized SSH keys, modified system binaries, and known persistence techniques.
- **FR-502**: Each detected threat shall generate a timestamped event with severity, description in plain language, and recommended/automatic action.
- **FR-503**: Detection latency for brute-force/SSH attack patterns shall not exceed 60 seconds from event occurrence.

### 3.6 Application Monitoring (FR-6xx)
- **FR-601**: The system shall auto-discover process managers/orchestrators: PM2, systemd services, Docker, Kubernetes, Supervisor.
- **FR-602**: For each discovered application/service, the system shall track: running state, restart frequency, crash-loop detection, associated logs, memory usage trend, CPU usage trend, version, and listening port.
- **FR-603**: Crash-loop detection shall trigger an alert after 3 or more restarts within 5 minutes (configurable).

### 3.7 Resource Monitoring (FR-7xx)
- **FR-701**: The system shall collect CPU, RAM, swap, disk usage/IO, temperature (where available), network throughput, load average, and filesystem growth rate.
- **FR-702**: The system shall display top processes, top users, and top applications by resource consumption.
- **FR-703**: The system shall retain historical metrics for at least 90 days at decreasing resolution (raw for 24h, 5-min aggregates for 30 days, hourly aggregates for 90 days) and present historical charts in the dashboard.

### 3.8 Network Monitoring (FR-8xx)
- **FR-801**: The system shall report inbound/outbound traffic volume, active connections, source countries/IPs, protocols in use, open/listening ports, failed connection attempts, top bandwidth consumers, and anomalous traffic patterns.
- **FR-802**: The dashboard shall render a geographic map of connection origins.

### 3.9 SSL Monitoring (FR-9xx)
- **FR-901**: The system shall monitor SSL/TLS certificate expiry, cipher strength, TLS version in use, certificate chain validity, and OCSP status for all detected HTTPS endpoints on the server.
- **FR-902**: The system shall send expiry reminders at 30, 14, 7, and 1 day(s) before expiration.

### 3.10 Domain Monitoring (FR-10xx)
- **FR-1001**: The system shall track DNS records, WHOIS expiry, SPF/DKIM/DMARC configuration, nameserver changes, subdomain discovery, and broken DNS configurations for domains associated with the server.

### 3.11 Backup Monitoring (FR-11xx)
- **FR-1101**: The system shall verify backup existence, last successful backup timestamp, backup size trend, restore-test status (if configured), cloud-sync status, and backup failure events.
- **FR-1102**: A missing or failed backup within the configured SLA window (default: 24 hours) shall raise a HIGH severity alert.

### 3.12 Log Intelligence (FR-12xx)
- **FR-1201**: The system shall ingest relevant system and application logs and produce a human-readable daily digest (e.g. "52 login attempts, 2 failed deployments, Apache restarted twice...").
- **FR-1202**: Log digests shall be generated using AI summarization and shall be available in the dashboard and optionally via daily email/Slack digest.

### 3.13 Cost Optimization (FR-13xx)
- **FR-1301**: Where cloud billing/API access is provided, the system shall identify idle servers, unused volumes, old snapshots, oversized logs, unused Elastic/static IPs, underutilized instances, bandwidth spikes, and storage waste.
- **FR-1302**: The system shall present an estimated monthly savings figure with itemized recommendations.

### 3.14 Security Recommendations (FR-14xx)
- **FR-1401**: Every security finding shall be presented with: severity (LOW/MEDIUM/HIGH/CRITICAL), plain-language business-impact description, recommended action, estimated time to fix, and a one-click fix button where automatable.
- **FR-1402**: One-click fixes shall request explicit user confirmation before execution unless the user has enabled auto-remediation for that category.

### 3.15 Compliance Scanner (FR-15xx)
- **FR-1501**: The system shall assess server configuration against CIS Linux Benchmark, and provide mapping/reporting support for ISO 27001, SOC2, HIPAA, PCI DSS, OWASP, and NIST frameworks.
- **FR-1502**: The system shall generate a downloadable PDF compliance report per server or per tenant, per framework.

### 3.16 Server Timeline (FR-16xx)
- **FR-1601**: The system shall present a single reverse-chronological timeline combining infrastructure events, security events, deployment events, and system changes for each server.

### 3.17 Alerting (FR-17xx)
- **FR-1701**: The system shall support alert delivery via Email, Slack, Microsoft Teams, Discord, Telegram, WhatsApp, SMS, and generic Webhook.
- **FR-1702**: The system shall support configurable thresholds for: CPU > X%, Disk > X%, SSL expiring within N days, server offline, SSH attack detected, application down, high RAM, high load average, database service stopped, backup failed.
- **FR-1703**: Users shall be able to configure per-alert-type routing (e.g. Critical → SMS + Slack, Info → Email only).

### 3.18 Multi-Server Dashboard (FR-18xx)
- **FR-1801**: The dashboard shall support grouping servers by Environment, Project, Region, Customer, and user-defined Tags.
- **FR-1802**: The system shall display an aggregate status roll-up per group (e.g. "Production: 5/5 healthy").

### 3.19 Multi-Tenant Support (FR-19xx)
- **FR-1901**: The system shall support an agency/MSP account type that manages multiple customer sub-accounts, each with isolated server lists and data.
- **FR-1902**: MSP users shall be able to switch between customer dashboards without re-authenticating.
- **FR-1903**: White-label branding (logo, color scheme, custom domain) shall be configurable at the MSP account level (Business tier).

### 3.20 AI Assistant (FR-20xx)
- **FR-2001**: The system shall provide a conversational AI assistant, scoped to the current server/tenant's telemetry and findings, capable of answering natural-language questions such as: "Why did CPU increase?", "Why did the server restart?", "Show me security risks", "Why is PM2 restarting?", "Summarize yesterday", "Explain this error."
- **FR-2002**: The AI assistant shall cite the underlying data (metric, log line, or event) supporting its answer where applicable.
- **FR-2003**: The AI assistant shall not fabricate findings; if data is insufficient to answer, it shall say so.

### 3.21 Auto Protection / Auto-Remediation (FR-21xx)
- **FR-2101**: The system shall support automatic remediation actions, including: block malicious IP, ban brute-force source, kill detected crypto-miner process, restart crashed service, rotate logs, remove temp files, restart application, renew SSL certificate, disable malicious process, and rate-limit attacking sources.
- **FR-2102**: Auto-remediation shall be **opt-in per action category**, disabled by default for destructive actions (e.g. killing processes), enabled by default for safe actions (e.g. log rotation).
- **FR-2103**: Every auto-remediation action shall be logged with timestamp, trigger reason, action taken, and outcome, and shall appear in the Server Timeline.

### 3.22 Risk Scoring (FR-22xx)
- **FR-2201**: The system shall compute and display, per server: Health Score, Performance Score, Security Score, Compliance Score, Availability Score, Backup Score, and an Overall Score, each 0–100.
- **FR-2202**: Score methodology shall be documented and consistent (versioned) so historical comparisons remain valid across scoring-algorithm updates, or a migration note shall be shown when the algorithm changes.

---

## 4. External Interface Requirements

### 4.1 User Interfaces
- Responsive web dashboard (desktop-first, tablet-usable) with sections: Home, Servers, Applications, Security, Threats, Logs, Resources, Compliance, Reports, Billing, Settings.
- Dark and light theme support (recommended, not required for MVP).

### 4.2 Agent-to-Backend Interface
- Outbound-only HTTPS (TLS 1.2+) and WebSocket connections from agent to backend.
- Agent authenticates using a per-server API key/token issued at install time, rotatable from the dashboard.

### 4.3 Third-Party Interfaces
- Cloud provider metadata APIs (AWS IMDS, Azure IMDS, GCP metadata server) for auto-discovery.
- Cloud billing APIs (read-only) for Cost Optimization module.
- Notification channel APIs: Email (SMTP/provider API), Slack, Teams, Discord, Telegram, WhatsApp Business API, SMS provider (e.g. Twilio), generic Webhooks.

### 4.4 Communications Interfaces
- All communications encrypted in transit (TLS 1.2+).
- WebSocket used for real-time dashboard updates (live metrics, live alerts).

---

## 5. Data Requirements (Summary — see DATABASE_SCHEMA.md for full detail)
- Tenant/Account data
- Server inventory and discovery data
- Time-series metrics (CPU, RAM, disk, network)
- Security findings and scan history
- Threat/event log
- Alert configuration and delivery history
- Compliance scan results and generated reports
- Backup status records
- Cost optimization findings
- Audit log of all auto-remediation actions

---

## 6. Non-Functional Requirements Summary
See `NON_FUNCTIONAL_REQUIREMENTS.md` for full detail. Key targets:
- Agent memory < 40MB, CPU < 1% average
- Install time < 2 minutes
- 99.9% backend uptime SLA (Pro/Business tiers)
- Threat detection latency < 60 seconds
- Data retention: 90 days minimum for metrics, 1 year for security/compliance events

---

## 7. Acceptance Criteria (High Level)
The MVP is considered complete when:
1. A user can install the agent with a single command and see their server appear in the dashboard within 60 seconds.
2. The Server Overview, Security Hardening Scanner, Threat Detection, Application Monitoring, Resource Monitoring, Alerts, and Risk Scoring modules are fully functional for at least Ubuntu and Debian.
3. At least 3 alert channels (Email, Slack, Webhook) are functional.
4. A user can view a Security Recommendation and apply a one-click fix successfully.
5. The four guiding questions (health / app status / attack status / priority fix) are answerable within 60 seconds of dashboard load, verified via usability test.

---

## 8. Out of Scope (MVP)
- Windows and macOS agents (Phase 2)
- Kubernetes deep monitoring (Phase 2)
- Full CSPM / EDR / SIEM / SOAR capability (Phase 3/4)
- Native mobile apps (future consideration, not in this spec)
