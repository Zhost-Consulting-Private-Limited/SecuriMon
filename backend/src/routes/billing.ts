import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { prisma } from '../utils/prisma';

const router = Router();

// Plan prices in the smallest currency unit (paise for INR), configurable via env so
// this scaffold doesn't hardcode business pricing decisions into source code.
const PLAN_PRICES_PAISE: Record<string, number> = {
  pro: Number(process.env.RAZORPAY_PRO_PRICE_PAISE) || 99900, // default ₹999/mo
  business: Number(process.env.RAZORPAY_BUSINESS_PRICE_PAISE) || 499900, // default ₹4999/mo
};

function getRazorpayClient(): Razorpay {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing)');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// POST /v1/billing/checkout - create a Razorpay order for the requested plan
router.post('/checkout', authenticate, async (req: AuthRequest, res: Response) => {
  const tenantId = req.user?.tenantId;
  const { plan } = req.body;

  if (plan !== 'pro' && plan !== 'business') {
    return res.status(400).json({ error: 'plan must be "pro" or "business"' });
  }

  try {
    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.create({
      amount: PLAN_PRICES_PAISE[plan],
      currency: 'INR',
      receipt: `tenant_${tenantId}_${plan}_${Date.now()}`,
      notes: { tenantId: tenantId!, plan },
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    res.status(503).json({ error: error.message });
  }
});

// GET /v1/billing/plan
router.get('/plan', authenticate, async (req: AuthRequest, res: Response) => {
  const tenant = await prisma.tenant.findUnique({ where: { id: req.user?.tenantId } });
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  res.json({ plan: tenant.plan });
});

// GET /v1/billing/usage - simple server-count usage vs plan limits
const PLAN_SERVER_LIMITS: Record<string, number> = { free: 1, pro: 10, business: Infinity };

router.get('/usage', authenticate, async (req: AuthRequest, res: Response) => {
  const tenantId = req.user?.tenantId;
  const [tenant, serverCount] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.server.count({ where: { tenantId } }),
  ]);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

  const limit = PLAN_SERVER_LIMITS[tenant.plan] ?? PLAN_SERVER_LIMITS.free;
  res.json({ plan: tenant.plan, servers: { used: serverCount, limit: limit === Infinity ? null : limit } });
});

// Razorpay webhook handler - registered separately in index.ts with a raw body parser
// (signature verification needs the exact raw bytes, not the re-serialized JSON).
export async function handleRazorpayWebhook(req: Request, res: Response) {
  const signature = req.headers['x-razorpay-signature'];
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    console.error('[billing] RAZORPAY_WEBHOOK_SECRET is not configured; rejecting webhook');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }
  if (typeof signature !== 'string') {
    return res.status(400).json({ error: 'Missing signature' });
  }

  const rawBody: Buffer = req.body;
  const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  if (expectedSignature !== signature) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  try {
    if (event.event === 'order.paid' || event.event === 'payment.captured') {
      const payment = event.payload?.payment?.entity ?? event.payload?.order?.entity;
      const notes = payment?.notes || {};
      const { tenantId, plan } = notes;

      if (tenantId && (plan === 'pro' || plan === 'business')) {
        await prisma.tenant.update({ where: { id: tenantId }, data: { plan } });
        console.log(`[billing] Tenant ${tenantId} upgraded to ${plan} via Razorpay webhook`);
      }
    }
    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('[billing] Failed to process webhook event:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
}

export default router;
