import 'dotenv/config';
import 'express-async-errors'; // Handles async errors in express routes
import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import authRoutes from './routes/auth';
import agentRoutes from './routes/agent';
import serverRoutes from './routes/server';
import aiRoutes from './routes/ai';
import alertRoutes from './routes/alerts';
import billingRoutes, { handleRazorpayWebhook } from './routes/billing';
import { startMetricsAggregator } from './jobs/metricsAggregator';
import { setupWebSocket } from './ws';
import { getDeploymentMode, isSaas } from './config';
import { startAlertEvaluator } from './services/alerts/evaluator';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());

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

// Billing/MSP surface only exists in SaaS mode — self-hosted deployments never mount
// this router, so the routes 404 rather than being permission-checked per request.
if (isSaas()) {
  app.use('/v1/billing', billingRoutes);
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

