# Vigilon - Website Specification

## 1. Overview
Vigilon requires a public-facing marketing website separate from (structurally, not just visually) the dashboard app.
The website clearly explains the value proposition ("Secure. Monitor. Optimize. Without Hiring a DevOps Team."), showcases features and concrete use cases, explains both deployment editions (Self-Hosted and SaaS — see `FEATURE_TIERS.md`), handles SaaS pricing/checkout via Razorpay, and directs users to sign up, log in, or get the self-host instructions.

## 2. Visual Direction

**Light theme only — no dark mode.** A modern, glossy finish: soft gradients, layered shadows/glass-like card surfaces, generous whitespace, rounded corners, subtle motion on scroll/hover. This is a deliberate change from the previous dark-mode-capable Tailwind setup; dark-mode variant classes should be removed from the marketing routes, not left as an unused toggle.

## 3. Tech Stack
- **Framework:** Next.js (React), within the existing `frontend/` app under a `(marketing)` route group
- **Styling:** Tailwind CSS, light-only palette
- **Deployment:** PM2, same process as the dashboard (see `DEPLOYMENT.md`)
- **Structural requirement:** the marketing route group must have its own root layout (no dashboard sidebar/`AuthProvider` bleeding into public pages — see `ARCHITECTURE.md`/frontend routing notes)

## 4. Core Pages

### 4.1 Home Page
- **Hero Section:** Strong tagline, call-to-action (CTA) to "Start Free" / "Deploy Self-Hosted", and a terminal/dashboard mockup showing the 1-click install.
- **Problem vs. Solution:** Contrast the pain of managing servers manually vs. the Vigilon always-on approach.
- **Feature Highlights:** 1-Click Install, Real-time Threat Detection, Automated Hardening & Compliance, Audit-Ready Reporting, AI Assistant.
- **Use Cases teaser:** short cards linking to the full Use Cases section/page (see §4.2).
- **Testimonials/Social Proof:** placeholder for customer reviews.
- **Footer:** Links to Docs, Self-Host Guide, Terms, Privacy, Contact.

### 4.2 Use Cases (required)
Dedicated section (or standalone page linked from nav) with one card/block per audience, drawn from `SRS.md` §2.3 User Classes, each stating a concrete before/after scenario rather than generic copy:
- **Startup Founder / SMB Owner** — deployed the app themselves, no ops headcount.
- **Agency / Freelancer** — manages servers across multiple clients.
- **MSP / Hosting Provider** — needs multi-tenant, white-labeled oversight.
- **DevOps / Security Team** — wants audit evidence and hardening automation layered on top of existing tooling.

### 4.3 Features Page
Deep dive into the modules (Security Hardening, Threat Detection, Application Monitoring, Log Intelligence, Compliance/Audit reporting, etc.), organized by the categories in `FEATURE_TIERS.md` §2.

### 4.4 Pricing Page (edition-aware, Razorpay for SaaS only)
- Two clearly separated blocks: **Self-Hosted** (free, "Deploy your own", link to `DEPLOYMENT.md` Part A) and **SaaS** (Free/Pro/Business cards per `FEATURE_TIERS.md` §3).
- Razorpay checkout is wired **only** on the SaaS Pro/Business cards — the Self-Hosted block never touches billing code.
- Toggle for Monthly/Annual billing on the SaaS cards.

### 4.5 Documentation / Help Center
- Self-Host guide and SaaS guide (linking to `DEPLOYMENT.md`).
- Explanations of Risk Scores and Compliance frameworks.
- API references (from `API_SPEC.md`).

## 5. User Flows

**Self-Hosted:** User lands on website → Pricing page "Self-Hosted" block → Docs → runs `DEPLOYMENT.md` Part A themselves. No account creation on Vigilon's own infrastructure required.

**SaaS:** User lands on website → clicks "Start Free" → redirected to the dashboard app's real register flow → (Pro/Business) completes Razorpay subscription checkout → receives the install command for their first server from inside the dashboard.
