import 'dotenv/config';
import 'express-async-errors'; // Handles async errors in express routes
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'http';
import path from 'path';
import authRoutes from './routes/auth';
import agentRoutes from './routes/agent';
import serverRoutes from './routes/server';
import aiRoutes from './routes/ai';
import alertRoutes from './routes/alerts';
import billingRoutes, { handleRazorpayWebhook } from './routes/billing';
import tenantsRoutes from './routes/tenants';
import remediationRoutes from './routes/remediation';
import { startMetricsAggregator } from './jobs/metricsAggregator';
import { setupWebSocket } from './ws';
import { getDeploymentMode, isSaas } from './config';
import { startAlertEvaluator } from './services/alerts/evaluator';

const app = express();
const PORT = process.env.PORT || 4000;

// Restricts which browser origins may call this API with credentials. Defaults to the
// local frontend dev server so nothing extra needs configuring for local development;
// production deployments must set CORS_ORIGIN (comma-separated) to their real frontend URL(s).
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// This is a pure JSON API consumed by a separate-origin frontend (already governed by
// the explicit CORS allowlist below), so the cross-origin-resource-policy default of
// "same-origin" would incorrectly block the frontend's own fetch calls - relax just that.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Strict limiter on auth endpoints - the highest-value target for credential
// stuffing/brute-force and registration spam.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
});
app.use(['/v1/auth/login', '/v1/auth/register'], authLimiter);

// Generous global safety-net limiter for everything else - deliberately loose so it
// never throttles legitimate multi-server agent fleets on their normal polling schedule
// (60s telemetry ticks, hourly scans, etc.) while still guarding against gross abuse.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 2000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Razorpay webhook signature verification needs the exact raw request bytes, so this
// must be registered with express.raw() BEFORE the global express.json() body parser,
// and only in SaaS mode.
if (isSaas()) {
  app.post('/v1/billing/webhook', express.raw({ type: 'application/json' }), handleRazorpayWebhook);
}

app.use(express.json());

// Serves the one-line install script referenced by the install command shown in the
// dashboard (see routes/server.ts POST /install-token).
app.get('/install.sh', (req, res) => {
  res.type('text/x-shellscript').sendFile(path.resolve(__dirname, '../../agent/install.sh'));
});

// Public: lets the frontend know which deployment edition it's talking to
app.get('/v1/config', (req, res) => {
  const deploymentMode = getDeploymentMode();
  res.json({
    deploymentMode,
    features: {
      billing: isSaas(),
      msp: isSaas(),
    },
  });
});

// Routes
app.use('/v1/auth', authRoutes);
app.use('/v1/agent', agentRoutes);
app.use('/v1/servers', serverRoutes);
app.use('/v1/ai', aiRoutes);
app.use('/v1/logs', aiRoutes);
app.use('/v1/alerts', alertRoutes);
app.use('/v1/remediation', remediationRoutes);

// Billing/MSP surface only exists in SaaS mode — self-hosted deployments never mount
// this router, so the routes 404 rather than being permission-checked per request.
if (isSaas()) {
  app.use('/v1/billing', billingRoutes);
  app.use('/v1/tenants', tenantsRoutes);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start Server & Background Jobs
const server = http.createServer(app);
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`Vigilon Core API & Ingestion running on http://localhost:${PORT} [mode: ${getDeploymentMode()}]`);
  startMetricsAggregator();
  startAlertEvaluator();
});

