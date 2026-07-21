# SecuriMon — Non-Functional Requirements (NFR)

## 1. Performance
| Requirement | Target |
|---|---|
| Agent memory footprint | < 40 MB resident |
| Agent CPU usage | < 1% average, < 5% during active scan |
| Install time | < 2 minutes end-to-end |
| Dashboard initial load | < 2 seconds (p95) on broadband connection |
| Metrics ingestion latency (agent → dashboard visible) | < 30 seconds |
| Threat detection latency | < 60 seconds from event occurrence to alert dispatch |
| API response time | < 300ms (p95) for standard read endpoints |

## 2. Scalability
- Backend must support at minimum 10,000 concurrently connected agents at MVP scale, horizontally scalable beyond that via containerized ingestion/API tiers.
- Time-series storage must support downsampling/retention to bound growth: raw (24h) → 5-min rollups (30 days) → hourly rollups (90 days minimum retention).
- Multi-tenant architecture must scale to thousands of tenants without cross-tenant performance interference (noisy-neighbor isolation at the ingestion tier).

## 3. Reliability & Availability
- Backend uptime SLA: 99.9% for Pro/Business tiers (≈ 43 minutes downtime/month budget).
- Agent must continue local detection and buffering during backend outages, with zero data loss for buffered telemetry up to a configurable local storage cap.
- Auto-remediation actions must fail safely: if the agent cannot confirm a signed, valid command, it must not execute it.

## 4. Security
- All data in transit encrypted via TLS 1.2+.
- All sensitive data at rest (API keys, cloud billing credentials, webhook secrets) encrypted via envelope encryption (KMS-backed).
- Agent-to-backend authentication via rotatable per-server API keys or mutual TLS.
- Remediation commands must be cryptographically signed and verified before agent execution.
- Role-based access control (RBAC) for dashboard users: owner, admin, member, msp_admin.
- Row-level tenant isolation enforced at the database layer, not solely the application layer.
- Regular third-party penetration testing recommended prior to GA (General Availability) launch.
- Agent binary releases must be signed; agent verifies signature before applying auto-updates.

## 5. Compliance
- Compliance module must support mapping to: CIS Linux Benchmark, ISO 27001, SOC2, HIPAA, PCI DSS, OWASP, NIST.
- Generated compliance PDF reports must be timestamped and reflect the exact scan data used to produce them (immutable snapshot).
- SecuriMon's own infrastructure (as a SaaS handling customer server data) should target SOC2 Type II compliance as a business goal (separate from the product's compliance-scanning feature).

## 6. Usability
- The four guiding questions (health / app status / attack status / priority fix) must be answerable within 60 seconds of dashboard load — validated via usability testing with non-technical target users (SMB owners, founders).
- All security/technical findings must be presented in plain, business-impact language by default, with technical detail available via expand/drill-down — never technical jargon as the only presentation.
- No feature should require SSH access to use; SSH remains available only as an optional escape hatch.

## 7. Data Retention
| Data Type | Minimum Retention |
|---|---|
| Raw metrics | 24 hours |
| 5-minute metric rollups | 30 days |
| Hourly metric rollups | 90 days |
| Security findings / scan history | 1 year |
| Threat events | 1 year |
| Compliance reports | Until deleted by user (audit trail requirement) |
| Remediation audit log | 1 year minimum, recommend indefinite for audit trail integrity |

## 8. Maintainability
- Agent and backend versioned independently; backend must remain backward compatible with at least the previous 2 agent minor versions.
- Scoring algorithm changes must be versioned (`scoring_algorithm_version`) so historical score comparisons remain interpretable.
- Infrastructure as Code (IaC) recommended for backend deployment reproducibility.

## 9. Portability
- Agent must run on: Ubuntu, Debian, CentOS, RHEL, AlmaLinux, Rocky Linux, Amazon Linux (x86_64 and arm64).
- No dependency on a specific cloud provider; must function identically on AWS, Azure, GCP, DigitalOcean, Hetzner, Oracle Cloud, and on-premise/bare-metal Linux.

## 10. Observability (of SecuriMon itself)
- Backend services must emit their own metrics/logs/traces for internal operational monitoring (dogfooding is encouraged but a separate concern from the customer-facing product).
- Alert delivery success/failure must be tracked and surfaced (e.g. a failed Slack webhook delivery should itself be visible/alertable to the account owner).

## 11. Internationalization (Future Consideration)
- Not required for MVP; dashboard text should avoid hard-coded string concatenation to ease future localization.

## 12. Legal / Data Residency (Future Consideration)
- Not required for MVP but architecture should not preclude future regional data residency (e.g. EU customer data staying in EU region) given the compliance-focused customer base (HIPAA/PCI DSS/ISO27001 users often require this).
