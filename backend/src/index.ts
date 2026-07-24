import 'dotenv/config';
import http from 'http';
import { app } from './app';
import { startMetricsAggregator } from './jobs/metricsAggregator';
import { setupWebSocket } from './ws';
import { getDeploymentMode } from './config';
import { startAlertEvaluator } from './services/alerts/evaluator';

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`Vigilon Core API & Ingestion running on http://localhost:${PORT} [mode: ${getDeploymentMode()}]`);
  startMetricsAggregator();
  startAlertEvaluator();
});
