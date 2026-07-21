# SecuriMon - Website Specification

## 1. Overview
SecuriMon requires a public-facing marketing and documentation website separate from (or serving as the entry point to) the SaaS dashboard. 
The website will clearly explain the value proposition ("Secure. Monitor. Optimize. Without Hiring a DevOps Team."), showcase features, handle pricing via Razorpay, and direct users to sign up or log in.

## 2. Tech Stack
- **Framework:** Next.js (React)
- **Styling:** Tailwind CSS
- **Deployment:** PM2 (running alongside the dashboard, or exported as a static site and served via Nginx)
- **Directory:** `/website` (or integrated into `/frontend` under marketing routes)

## 3. Core Pages

### 3.1 Home Page
- **Hero Section:** Strong tagline, call-to-action (CTA) to "Start Free Trial", and a terminal/dashboard mockup showing the 1-click install.
- **Problem vs. Solution:** Contrast the pain of managing servers manually vs. the SecuriMon autonomous approach.
- **Feature Highlights:**
  - 1-Click Install (MeshCentral-style deployment for Linux & Windows)
  - Real-time Threat Detection
  - Automated Hardening & Compliance
  - Cost Optimization
- **Testimonials/Social Proof:** Placeholder for customer reviews.
- **Footer:** Links to Docs, Terms, Privacy, Contact.

### 3.2 Features Page
Deep dive into the 20+ modules (e.g., Log Intelligence, Resource Monitoring, Backup tracking).

### 3.3 Pricing Page (Razorpay Integration)
- Display pricing tiers (Free, Pro, Business/MSP).
- **Billing Engine:** Integrated with Razorpay for subscription management (INR/USD support).
- Toggle for Monthly/Annual billing.

### 3.4 Documentation / Help Center
- Guide for installing the agent on Linux (systemd) and Windows (Windows Service).
- Explanations of Risk Scores and Compliance frameworks.
- API references.

## 4. User Flow
1. User lands on the website.
2. Clicks "Sign Up" -> Redirected to the Next.js Dashboard App (`/auth/register`).
3. User completes Razorpay subscription checkout.
4. User receives the MeshCentral-style installation script/executable for their first server.
