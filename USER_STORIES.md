# Vigilon — User Stories & Acceptance Criteria

Format: `As a [role], I want [capability], so that [benefit].` Each story includes acceptance criteria (AC) suitable for QA sign-off or AI-agent self-verification.

## Epic 1: Installation & Onboarding

**US-1.1** As a founder with no DevOps experience, I want to install the agent with a single command, so that I don't need to configure anything.
- AC1: Running the install command completes in under 2 minutes on a reference instance.
- AC2: No flags or config file editing is required for a successful install.
- AC3: The server appears in the dashboard within 60 seconds of install completing.

**US-1.2** As a user, I want the platform to automatically detect what's running on my server, so that I don't have to manually enter my stack.
- AC1: OS, web server, database, runtime, and container platform are correctly identified for all MVP-supported distros.
- AC2: Discovery re-runs automatically every 6 hours and can be triggered on-demand.

## Epic 2: Server Overview

**US-2.1** As a server owner, I want to see one screen that tells me if my server is healthy, so that I don't have to dig through logs.
- AC1: Health %, CPU, RAM, Disk, Uptime, Last Reboot, Internet, SSL, Firewall, Backups, and Risk Score are all visible without scrolling on desktop.
- AC2: Values refresh at least every 60 seconds without a full page reload.

## Epic 3: Security Hardening

**US-3.1** As a non-technical user, I want to know if my SSH setup is risky, so that I can fix it before I get hacked.
- AC1: Findings display severity, plain-language impact, and a recommended action — not raw config syntax as the primary text.
- AC2: A one-click fix is available for at least: disable password login, enable Fail2Ban, enable firewall default-deny.
- AC3: Applying a one-click fix updates the finding status to "fixed" within 30 seconds and logs the action to the Server Timeline.

**US-3.2** As a security-conscious user, I want a single risk score, so that I can track improvement over time.
- AC1: Score is 0–100, recalculated after every scan.
- AC2: Historical score trend is viewable as a chart (at least 30 days).

## Epic 4: Threat Detection

**US-4.1** As a server owner, I want to be alerted immediately if someone is trying to brute-force my SSH, so that I can respond quickly.
- AC1: A brute-force attempt is detected and an alert is dispatched within 60 seconds.
- AC2: Alert includes source IP, attempt count, and a one-click "Block this IP" action.

**US-4.2** As a user, I want crypto-miners automatically killed, so that my server isn't silently stolen for someone else's profit.
- AC1: Detected miner process triggers an alert.
- AC2: If auto-remediation for "kill_miner" is enabled, the process is terminated and logged; if disabled, a manual "Kill Process" button is presented instead.

## Epic 5: Application Monitoring

**US-5.1** As a developer, I want to know if my app is crash-looping, so that I can fix it before customers notice.
- AC1: 3+ restarts within 5 minutes triggers a "crash loop" status and alert.
- AC2: Recent logs for the crashing service are viewable inline without SSH access.

## Epic 6: Resource & Network Monitoring

**US-6.1** As an owner, I want to see historical CPU/RAM/disk trends, so that I can plan for scaling before I run out of resources.
- AC1: Charts available for at least 90 days at appropriate resolution.
- AC2: Top processes/users/apps by resource consumption are listed.

**US-6.2** As an owner, I want to see who is connecting to my server and from where, so that I can spot suspicious traffic.
- AC1: Geo map of connections is rendered.
- AC2: Top bandwidth consumers and failed connection attempts are listed.

## Epic 7: SSL & Domain Monitoring

**US-7.1** As an owner, I want to be reminded before my SSL certificate expires, so that my site never goes down due to an expired cert.
- AC1: Reminders sent at 30/14/7/1 day(s) before expiry via configured channels.
- AC2: One-click "Renew Now" triggers Certbot (or equivalent) renewal via the agent.

## Epic 8: Backup Monitoring

**US-8.1** As an owner, I want to know if my backups are actually running, so that I don't discover a missing backup only after data loss.
- AC1: Missing/failed backup within SLA window (default 24h) raises a HIGH severity alert.
- AC2: Last backup timestamp and size trend are visible on the dashboard.

## Epic 9: Log Intelligence

**US-9.1** As a busy founder, I want a daily plain-English summary of what happened on my server, so that I don't have to read raw logs.
- AC1: Daily digest is generated automatically and available in-dashboard and via configured delivery channel (e.g. email).
- AC2: Digest reflects actual events from that day (verifiable against raw log/event data).

## Epic 10: Cost Optimization

**US-10.1** As a cost-conscious founder, I want to know where I'm wasting cloud spend, so that I can reduce my bill.
- AC1: Idle servers, unused volumes, old snapshots, and unused Elastic IPs are identified when billing/API access is connected.
- AC2: An estimated total monthly savings figure is displayed.

## Epic 11: Compliance

**US-11.1** As an agency serving regulated clients, I want a CIS/SOC2/HIPAA compliance report, so that I can hand it to my client's auditor.
- AC1: PDF report generated per framework, per server or tenant, downloadable from the dashboard.
- AC2: Report reflects the current state of security findings at generation time.

## Epic 12: Alerts

**US-12.1** As a user, I want alerts sent to Slack (or my preferred channel), so that I see problems where I already work.
- AC1: At least Email, Slack, and Webhook channels are functional in MVP.
- AC2: Alert routing can be configured per severity (e.g. Critical → SMS + Slack).

## Epic 13: Multi-Server / Multi-Tenant

**US-13.1** As an agency managing 10 client servers, I want to group servers by customer, so that I can manage them without confusion.
- AC1: Servers can be grouped by Environment, Project, Region, Customer, and Tags.
- AC2: Aggregate status roll-up is shown per group.

**US-13.2** As an MSP, I want isolated dashboards per customer, so that customers cannot see each other's data.
- AC1: Data isolation verified via automated test (cross-tenant query attempt fails).
- AC2: MSP user can switch between customer views without re-authenticating.

## Epic 14: AI Assistant

**US-14.1** As a non-technical user, I want to ask "why did my CPU spike yesterday?" in plain English, so that I don't need to interpret graphs myself.
- AC1: AI Assistant answers using actual server data (not generic/fabricated text) and cites the underlying metric/event.
- AC2: If insufficient data exists, the assistant states that clearly rather than guessing.

## Epic 15: Auto-Remediation

**US-15.1** As a user, I want safe fixes applied automatically (like log rotation), but destructive fixes to require my approval, so that I stay in control.
- AC1: Destructive actions (kill process, restart service) default to OFF and require explicit opt-in.
- AC2: Every remediation action (auto or manual) is visible in the Server Timeline with outcome.

## Epic 16: Risk Scoring

**US-16.1** As an owner, I want a single overall score plus category scores, so that I know exactly what area needs attention.
- AC1: Health, Performance, Security, Compliance, Availability, Backup, and Overall scores are all displayed.
- AC2: Clicking any score navigates to the detail view explaining the contributing factors.
