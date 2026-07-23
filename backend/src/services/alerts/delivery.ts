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

// Works for Slack and Discord incoming webhooks (both accept { "content"/"text": string }),
// Teams incoming webhooks (MessageCard JSON), and generic webhooks (full JSON context).
async function deliverWebhook(url: string, channel: string, ctx: AlertContext): Promise<ChannelDeliveryResult> {
  try {
    let body: unknown;
    if (channel === 'slack' || channel === 'discord') {
      body = { text: ctx.message, content: ctx.message };
    } else if (channel === 'teams') {
      body = {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extension',
        summary: ctx.message,
        title: `Vigilon ${ctx.severity.toUpperCase()}: ${ctx.serverHostname}`,
        text: ctx.message,
      };
    } else {
      body = { type: 'alert', ...ctx };
    }

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

// Single shared bot for the whole deployment (self-hosted or SaaS) - not per-tenant.
async function deliverTelegram(chatId: string, ctx: AlertContext): Promise<ChannelDeliveryResult> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return { channel: 'telegram', success: false, error: 'TELEGRAM_BOT_TOKEN not configured' };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: ctx.message }),
    });
    if (!res.ok) {
      return { channel: 'telegram', success: false, error: `HTTP ${res.status}` };
    }
    return { channel: 'telegram', success: true };
  } catch (err: any) {
    return { channel: 'telegram', success: false, error: err.message };
  }
}

async function deliverSms(toNumber: string, ctx: AlertContext): Promise<ChannelDeliveryResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !fromNumber) {
    return { channel: 'sms', success: false, error: 'Twilio (TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER) not configured' };
  }
  try {
    const body = new URLSearchParams({ To: toNumber, From: fromNumber, Body: ctx.message });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      },
      body,
    });
    if (!res.ok) {
      return { channel: 'sms', success: false, error: `HTTP ${res.status}` };
    }
    return { channel: 'sms', success: true };
  } catch (err: any) {
    return { channel: 'sms', success: false, error: err.message };
  }
}

/**
 * channels: array of strings — "email:someone@example.com", "slack:<webhook_url>",
 * "discord:<webhook_url>", "teams:<webhook_url>", "webhook:<url>", "telegram:<chat_id>"
 * (uses the shared TELEGRAM_BOT_TOKEN), or "sms:<phone_number>" (uses Twilio env vars).
 * WhatsApp is not supported yet - it requires Meta Business verification and pre-approved
 * message templates, not just an API key.
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
      if (type === 'slack' || type === 'discord' || type === 'teams' || type === 'webhook') {
        return deliverWebhook(target, type, ctx);
      }
      if (type === 'telegram') return deliverTelegram(target, ctx);
      if (type === 'sms') return deliverSms(target, ctx);
      return { channel: type, success: false, error: 'Unknown channel type' };
    })
  );
  return results;
}
