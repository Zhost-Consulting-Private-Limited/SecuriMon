import nodemailer from 'nodemailer';

export interface AlertContext {
  serverHostname: string;
  metric: string;
  condition: string;
  severity: string;
  message: string;
}

export interface ChannelDeliveryResult {
  channel: string;
  success: boolean;
  error?: string;
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) return null;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

async function deliverEmail(to: string, ctx: AlertContext): Promise<ChannelDeliveryResult> {
  const t = getTransporter();
  if (!t) {
    return { channel: 'email', success: false, error: 'SMTP not configured' };
  }
  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || 'alerts@vigilon.local',
      to,
      subject: `[Vigilon] ${ctx.severity.toUpperCase()}: ${ctx.serverHostname} - ${ctx.metric}`,
      text: ctx.message,
    });
    return { channel: 'email', success: true };
  } catch (err: any) {
    return { channel: 'email', success: false, error: err.message };
  }
}

// Works for Slack and Discord incoming webhooks (both accept { "content"/"text": string })
// and generic webhooks (receive the full JSON context).
async function deliverWebhook(url: string, channel: string, ctx: AlertContext): Promise<ChannelDeliveryResult> {
  try {
    const isChatWebhook = channel === 'slack' || channel === 'discord';
    const body = isChatWebhook
      ? { text: ctx.message, content: ctx.message }
      : { type: 'alert', ...ctx };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return { channel, success: false, error: `HTTP ${res.status}` };
    }
    return { channel, success: true };
  } catch (err: any) {
    return { channel, success: false, error: err.message };
  }
}

/**
 * channels: array of strings, either "email:someone@example.com" or
 * "slack:<webhook_url>" / "discord:<webhook_url>" / "webhook:<url>".
 */
export async function deliverAlert(channels: string[], ctx: AlertContext): Promise<ChannelDeliveryResult[]> {
  const results = await Promise.all(
    channels.map(async (raw) => {
      const separatorIndex = raw.indexOf(':');
      if (separatorIndex === -1) {
        return { channel: raw, success: false, error: 'Malformed channel spec' };
      }
      const type = raw.slice(0, separatorIndex);
      const target = raw.slice(separatorIndex + 1);

      if (type === 'email') return deliverEmail(target, ctx);
      if (type === 'slack' || type === 'discord' || type === 'webhook') {
        return deliverWebhook(target, type, ctx);
      }
      return { channel: type, success: false, error: 'Unknown channel type' };
    })
  );
  return results;
}
