import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';
import { prisma } from './utils/prisma';

// Keep track of active agent connections
const activeAgents = new Map<string, WebSocket>();

export const setupWebSocket = (server: Server) => {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (request, socket, head) => {
    try {
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      if (url.pathname !== '/v1/agent/stream') {
        socket.destroy();
        return;
      }

      // Authenticate via query param for WebSocket
      const apiKey = url.searchParams.get('apiKey');
      if (!apiKey) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
      const dbServer = await prisma.server.findFirst({ where: { apiKeyHash } });

      if (!dbServer) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, dbServer.id);
      });
    } catch (err) {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket, request: any, serverId: string) => {
    console.log(`[WS] Agent connected: ${serverId}`);
    activeAgents.set(serverId, ws);

    ws.on('close', () => {
      console.log(`[WS] Agent disconnected: ${serverId}`);
      activeAgents.delete(serverId);
    });

    ws.on('error', (err) => {
      console.error(`[WS] Agent error (${serverId}):`, err);
      activeAgents.delete(serverId);
    });
    
    // Process messages from Agent (e.g. remediation results)
    ws.on('message', async (message) => {
      try {
        const payload = JSON.parse(message.toString());
        if (payload.type === 'remediation_result') {
           await prisma.remediationAction.update({
             where: { id: payload.command_id },
             data: { 
               status: payload.status,
               completedAt: new Date()
             }
           });
           
           await prisma.timelineEvent.create({
             data: {
               serverId,
               eventCategory: 'remediation',
               title: `Remediation executed: ${payload.action}`,
               description: `Result: ${payload.status} | Details: ${payload.detail || ''}`
             }
           });
        }
      } catch (e) {
        console.error('[WS] Error parsing agent message:', e);
      }
    });
  });
};

export const sendCommandToAgent = async (serverId: string, action: string, params: any, triggeredBy: string, triggerRefId?: string) => {
  const ws = activeAgents.get(serverId);
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    throw new Error('Agent is not currently connected via WebSocket');
  }

  // Record the action in DB as pending
  const remediation = await prisma.remediationAction.create({
    data: {
      serverId,
      triggeredBy,
      triggerRefId,
      action,
      params: JSON.stringify(params),
      status: 'pending'
    }
  });

  const payload = {
    command_id: remediation.id,
    action,
    params
  };

  ws.send(JSON.stringify(payload));
  return remediation;
};
