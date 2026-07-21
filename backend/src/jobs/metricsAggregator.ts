import cron from 'node-cron';
import { prisma } from '../utils/prisma';

// Helper to calculate averages for an array of metrics
const calculateAverages = (metrics: any[]) => {
  if (metrics.length === 0) return null;

  const count = metrics.length;
  const sum = (field: string) => metrics.reduce((acc, curr) => acc + (curr[field] || 0), 0);
  
  // For network bytes, we usually want max (or sum of deltas), but for simple aggregation we'll store max 
  // so we can see total bandwidth utilized in that window.
  const max = (field: string) => Math.max(...metrics.map(m => Number(m[field] || 0)));

  return {
    cpuPercent: sum('cpuPercent') / count,
    ramPercent: sum('ramPercent') / count,
    diskPercent: sum('diskPercent') / count,
    swapPercent: sum('swapPercent') / count,
    load1m: sum('load1m') / count,
    load5m: sum('load5m') / count,
    load15m: sum('load15m') / count,
    networkRxBytes: BigInt(max('networkRxBytes')),
    networkTxBytes: BigInt(max('networkTxBytes')),
    temperatureC: sum('temperatureC') / count,
  };
};

export const startMetricsAggregator = () => {
  console.log('Metrics Aggregator Cron Jobs Started.');

  // Every 5 minutes: Downsample MetricsRaw -> Metrics5m
  cron.schedule('*/5 * * * *', async () => {
    console.log('[Cron] Running 5-minute metrics aggregation...');
    const now = new Date();
    // Look at data from the last 5 minutes (roughly)
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000);
    // Truncate to the nearest 5-minute block for the timestamp
    const blockTime = new Date(Math.floor(now.getTime() / (5 * 60000)) * (5 * 60000));

    try {
      const servers = await prisma.server.findMany({ select: { id: true } });

      for (const server of servers) {
        const rawMetrics = await prisma.metricsRaw.findMany({
          where: {
            serverId: server.id,
            collectedAt: {
              gte: fiveMinutesAgo,
              lt: now,
            }
          }
        });

        if (rawMetrics.length > 0) {
          const avg = calculateAverages(rawMetrics);
          if (avg) {
            await prisma.metrics5m.upsert({
              where: {
                serverId_collectedAt: { serverId: server.id, collectedAt: blockTime }
              },
              update: avg,
              create: {
                serverId: server.id,
                collectedAt: blockTime,
                ...avg
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('[Cron] Error in 5-minute aggregation:', error);
    }
  });

  // Every 1 hour: Downsample Metrics5m -> MetricsHourly
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Running Hourly metrics aggregation...');
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60000);
    const blockTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);

    try {
      const servers = await prisma.server.findMany({ select: { id: true } });

      for (const server of servers) {
        const fiveMinMetrics = await prisma.metrics5m.findMany({
          where: {
            serverId: server.id,
            collectedAt: {
              gte: oneHourAgo,
              lt: now,
            }
          }
        });

        if (fiveMinMetrics.length > 0) {
          const avg = calculateAverages(fiveMinMetrics);
          if (avg) {
            await prisma.metricsHourly.upsert({
              where: {
                serverId_collectedAt: { serverId: server.id, collectedAt: blockTime }
              },
              update: avg,
              create: {
                serverId: server.id,
                collectedAt: blockTime,
                ...avg
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('[Cron] Error in Hourly aggregation:', error);
    }
  });

  // Every day at midnight: Prune old metrics
  cron.schedule('0 0 * * *', async () => {
    console.log('[Cron] Running daily metrics pruning...');
    const now = new Date();
    
    // Pruning Strategy:
    // Raw Metrics: Keep 24 hours
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    // 5-Minute Aggregates: Keep 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    // Hourly Aggregates: Keep 90 days
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    try {
      const deletedRaw = await prisma.metricsRaw.deleteMany({
        where: { collectedAt: { lt: oneDayAgo } }
      });
      console.log(`[Cron] Pruned ${deletedRaw.count} raw metrics older than 24h.`);

      const deleted5m = await prisma.metrics5m.deleteMany({
        where: { collectedAt: { lt: thirtyDaysAgo } }
      });
      console.log(`[Cron] Pruned ${deleted5m.count} 5m metrics older than 30d.`);

      const deletedHourly = await prisma.metricsHourly.deleteMany({
        where: { collectedAt: { lt: ninetyDaysAgo } }
      });
      console.log(`[Cron] Pruned ${deletedHourly.count} hourly metrics older than 90d.`);
    } catch (error) {
      console.error('[Cron] Error during metrics pruning:', error);
    }
  });
};
