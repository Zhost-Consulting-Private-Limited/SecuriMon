# Vigilon — Deployment Guide

Vigilon runs from a single codebase in two editions. This document is the operational runbook for both. See `FEATURE_TIERS.md` for what each edition includes.

No Docker or Kubernetes is required or supported by design — the platform targets bare-metal/VM deployment via PM2 (Node processes) and systemd/Windows Service (agent), per the project's deployment constraints.

---

## Part A — Self-Host in ~15 Minutes

Use this if you want to run Vigilon entirely on your own infrastructure, for your own servers only (single tenant, no billing).

### Prerequisites
- A Linux VM or bare-metal host (2 vCPU / 2GB RAM minimum) with Node.js 20+, and either SQLite (default, zero setup) or PostgreSQL 14+ if you expect meaningful scale.
- A domain (or subdomain) pointed at this host if you want HTTPS via a reverse proxy (Nginx + Certbot recommended).
- PM2 installed globally: `npm install -g pm2`.

### 1. Clone and configure the backend
```bash
git clone https://github.com/Zhost-Consulting-Private-Limited/Vigilon.git
cd Vigilon/backend
cp .env.example .env
```
Edit `backend/.env`:
```
DEPLOYMENT_MODE=self_hosted
DATABASE_URL="file:./dev.db"        # or a postgres:// URL for production scale
JWT_SECRET="<generate a long random value — do not use the default>"
OPENAI_API_KEY=""                    # optional, only needed for AI Assistant / Log Digest
SMTP_HOST=""                         # optional, for email alerts
SMTP_PORT=""
SMTP_USER=""
SMTP_PASS=""
# RAZORPAY_* keys are not used in self_hosted mode — leave unset
```

### 2. Install, sync schema, build, run
```bash
npm install
npx prisma db push
npm run build
pm2 start dist/index.js --name vigilon-backend
```
(This project uses `prisma db push` rather than tracked migrations — there is no `prisma/migrations` history yet. If you need real migration history for a production SaaS deployment, run `npx prisma migrate dev --name init` once locally to generate one before switching to `migrate deploy`.)

### 3. Build and run the frontend
```bash
cd ../frontend
cp .env.example .env.local
# set NEXT_PUBLIC_API_URL=https://your-domain.com/api (or http://localhost:4000 for local testing)
npm install
npm run build
pm2 start npm --name vigilon-frontend -- start
```

### 4. Put both behind a reverse proxy (recommended)
Nginx: proxy `/` to the frontend port, `/api`/`/v1` (per your `NEXT_PUBLIC_API_URL` choice) to the backend port, and terminate TLS with Certbot. Exact Nginx config is environment-specific and intentionally not prescribed here.

### 5. Create your first tenant/user and install an agent
1. Open the dashboard, register the first account (this becomes your single self-hosted tenant).
2. From **Settings → Servers → Add Server**, copy the generated install command.
3. On each server you want monitored, run the install command as root:
   ```bash
   curl -sSL https://your-domain.com/install.sh | INSTALL_TOKEN=<token> bash
   ```
4. The server should appear in the dashboard within ~30-60 seconds of the agent's first check-in.

### Upgrading
```bash
git pull
cd backend && npm install && npx prisma db push && npm run build && pm2 restart vigilon-backend
cd ../frontend && npm install && npm run build && pm2 restart vigilon-frontend
```

---

## Part B — Run as SaaS (Multi-Tenant, Billed)

Use this if you're operating Vigilon as a hosted product for paying customers.

### Additional prerequisites beyond self-host
- A Razorpay account (Live or Test mode) — you'll need the **Key ID** and **Key Secret** from Razorpay Dashboard → Settings → API Keys, plus a **Webhook Secret** from Settings → Webhooks.
- SMTP credentials for transactional email (signup confirmation, alert delivery, invoices).

### Configuration differences from self-host
`backend/.env`:
```
DEPLOYMENT_MODE=saas
DATABASE_URL="postgresql://user:pass@host:5432/vigilon"   # Postgres strongly recommended at SaaS scale
JWT_SECRET="<long random value, different from any self-host instance>"
OPENAI_API_KEY="<your managed key — usage is now on your bill, not the customer's>"
RAZORPAY_KEY_ID="<from Razorpay dashboard>"
RAZORPAY_KEY_SECRET="<from Razorpay dashboard — treat as a secret, never commit>"
RAZORPAY_WEBHOOK_SECRET="<from Razorpay webhook settings>"
SMTP_HOST=... SMTP_PORT=... SMTP_USER=... SMTP_PASS=...
```

**Never paste live Razorpay keys into chat, source control, or CI logs.** Set them directly on the host (`.env`, systemd `EnvironmentFile=`, or your process manager's secret store) and add `RAZORPAY_WEBHOOK_SECRET` to Razorpay's webhook configuration pointing at `https://your-domain.com/v1/billing/webhook`.

### Everything else
Steps 1-4 from Part A are identical. In SaaS mode the backend additionally mounts:
- `/v1/billing/*` (checkout, webhook, plan, usage)
- `/v1/tenants/*` (MSP sub-tenant management, for accounts on a plan that includes it)

and the frontend additionally shows Billing and (for MSP-capable accounts) tenant-switching UI — see `FEATURE_TIERS.md` §4 for exactly how this gating works.

### Multi-tenant onboarding flow
1. Customer signs up → new `tenants` row created with `plan = 'free'`.
2. Customer subscribes via the pricing page → `POST /v1/billing/checkout` creates a Razorpay order → on successful payment, the webhook (`POST /v1/billing/webhook`) updates `tenants.plan`.
3. Customer installs agents using their own tenant-scoped install token, exactly as in the self-host flow.

### Operational recommendations for SaaS
- Run backend and frontend as separate PM2 processes (or separate hosts) so you can scale/restart independently.
- Take regular automated backups of the Postgres database (see `NON_FUNCTIONAL_REQUIREMENTS.md` §7 for retention targets).
- Monitor your own Vigilon infrastructure with... Vigilon, self-hosted, pointed at your production fleet (dogfooding note in `NON_FUNCTIONAL_REQUIREMENTS.md` §10).

---

## Rollback
Both editions: keep the previous `dist/` (backend) and `.next/` (frontend) build output or git commit tagged before upgrading; `pm2 restart` after `git checkout <previous-tag>` + reinstall/build is sufficient to roll back, since there's no containerization layer to complicate it. Always check `npx prisma migrate status` before rolling back across a migration boundary — down-migrations are not auto-generated by Prisma, so a schema rollback may require a hand-written down migration if the upgrade added destructive schema changes.
