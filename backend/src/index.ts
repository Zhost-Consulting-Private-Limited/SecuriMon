import 'dotenv/config';
import 'express-async-errors'; // Handles async errors in express routes
import express from 'express';
import cors from 'cors';
import http from 'http';
import authRoutes from './routes/auth';
import agentRoutes from './routes/agent';
import serverRoutes from './routes/server';
import aiRoutes from './routes/ai';
import { startMetricsAggregator } from './jobs/metricsAggregator';
import { setupWebSocket } from './ws';

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/v1/auth', authRoutes);
app.use('/v1/agent', agentRoutes);
app.use('/v1/servers', serverRoutes);
app.use('/v1/ai', aiRoutes);
app.use('/v1/logs', aiRoutes);

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
  console.log(`SecuriMon Core API & Ingestion running on http://localhost:${PORT}`);
  startMetricsAggregator();
});

