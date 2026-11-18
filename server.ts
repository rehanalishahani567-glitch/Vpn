import express from 'express';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SUBSCRIPTIONS_FILE = path.resolve(__dirname, '.data', 'subscriptions.json');

interface SubscriptionRecord {
  email: string;
  planId: 'pro' | 'max';
  billingCycle: 'monthly' | 'yearly';
  status: 'active' | 'canceled';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeSessionId?: string;
  amountFormatted?: string;
  currency?: string;
  updatedAt: string;
}

const AUTHORITATIVE_USD_PRICES: Record<'pro' | 'max', Record<'monthly' | 'yearly', number>> = {
  pro: { monthly: 6.99, yearly: 47.88 },
  max: { monthly: 11.99, yearly: 83.88 },
};

const CURRENCY_RATES: Record<string, { rate: number; symbol: string }> = {
  USD: { rate: 1, symbol: '$' },
  EUR: { rate: 0.92, symbol: '€' },
  GBP: { rate: 0.79, symbol: '£' },
  AED: { rate: 3.67, symbol: 'AED ' },
  PKR: { rate: 278, symbol: '₨' },
};

async function readSubscriptions(): Promise<Record<string, SubscriptionRecord>> {
  try {
    const raw = await fs.readFile(SUBSCRIPTIONS_FILE, 'utf8');
    return JSON.parse(raw) as Record<string, SubscriptionRecord>;
  } catch {
    return {};
  }
}

async function saveSubscription(record: SubscriptionRecord): Promise<void> {
  const store = await readSubscriptions();
  store[record.email.toLowerCase()] = record;
  await fs.mkdir(path.dirname(SUBSCRIPTIONS_FILE), { recursive: true });
  await fs.writeFile(SUBSCRIPTIONS_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function verifyStripeWebhookSignature(
  rawBody: Buffer,
  sigHeader: string | undefined,
  secret: string
): boolean {
  if (!sigHeader) return false;
  const parts = sigHeader.split(',');
  let timestamp = '';
  const signatures: string[] = [];
  for (const part of parts) {
    const [k, v] = part.split('=');
    if (k === 't' && v) timestamp = v;
    if (k === 'v1' && v) signatures.push(v);
  }
  if (!timestamp || signatures.length === 0) return false;

  const payload = `${timestamp}.${rawBody.toString('utf8')}`;
  const expected = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');

  return signatures.some((sig) => {
    try {
      const sigBuf = Buffer.from(sig, 'hex');
      return sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  });
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Raw body parser specifically for Stripe Webhook signature verification
  app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripeKey || !webhookSecret) {
      res.status(503).json({ error: 'Stripe webhook not configured' });
      return;
    }

    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
    const sig = req.headers['stripe-signature'] as string | undefined;
    if (!verifyStripeWebhookSignature(rawBody, sig, webhookSecret)) {
      res.status(400).json({ error: 'Invalid Stripe webhook signature' });
      return;
    }

    try {
      const event = JSON.parse(rawBody.toString('utf8')) as {
        type: string;
        data?: {
          object?: {
            id?: string;
            customer?: string;
            subscription?: string;
            customer_email?: string;
            customer_details?: { email?: string };
            payment_status?: string;
            metadata?: { planId?: string; billingCycle?: string };
            amount_total?: number;
            currency?: string;
          };
        };
      };

      const obj = event.data?.object;
      if (event.type === 'checkout.session.completed' && obj && obj.payment_status === 'paid') {
        const email = obj.customer_details?.email || obj.customer_email;
        const planId = obj.metadata?.planId === 'max' ? 'max' : 'pro';
        const billingCycle = obj.metadata?.billingCycle === 'monthly' ? 'monthly' : 'yearly';
        if (email) {
          const cur = (obj.currency || 'usd').toUpperCase();
          const amt = typeof obj.amount_total === 'number' ? (obj.amount_total / 100).toFixed(2) : undefined;
          await saveSubscription({
            email,
            planId,
            billingCycle,
            status: 'active',
            stripeCustomerId: obj.customer,
            stripeSubscriptionId: obj.subscription,
            stripeSessionId: obj.id,
            amountFormatted: amt ? `${cur} ${amt}` : undefined,
            currency: cur,
            updatedAt: new Date().toISOString(),
          });
        }
      } else if (event.type === 'customer.subscription.deleted' && obj?.id) {
        const store = await readSubscriptions();
        for (const [key, rec] of Object.entries(store)) {
          if (rec.stripeSubscriptionId === obj.id) {
            store[key] = { ...rec, status: 'canceled', updatedAt: new Date().toISOString() };
            await fs.writeFile(SUBSCRIPTIONS_FILE, JSON.stringify(store, null, 2), 'utf8');
          }
        }
      }

      res.json({ received: true });
    } catch {
      res.status(400).json({ error: 'Malformed webhook payload' });
    }
  });

  app.use(express.raw({ type: 'application/octet-stream', limit: '4mb' }));
  app.use(express.json());

  function isPrivateOrLocalIp(ip: string): boolean {
    return (
      !ip ||
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip.startsWith('10.') ||
      ip.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
    );
  }

  // Real network posture & global visitor geolocation endpoint
  app.get('/api/network-info', async (req, res) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    const rawIp =
      (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0])?.trim() ||
      (typeof req.headers['cf-connecting-ip'] === 'string' ? req.headers['cf-connecting-ip'].trim() : '') ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    const cleanIp = rawIp.replace(/^::ffff:/, '');
    const resolvedIp = cleanIp === '::1' ? '127.0.0.1' : cleanIp;
    const userAgent = req.headers['user-agent'] || 'Unknown Client';

    let geo: {
      city?: string;
      country?: string;
      code?: string;
      lat?: number;
      lon?: number;
    } | null = null;

    // 1. Check cloud/CDN geo headers if present
    const headerCountry =
      (req.headers['x-appengine-country'] as string) ||
      (req.headers['cf-ipcountry'] as string) ||
      (req.headers['x-vercel-ip-country'] as string);
    const headerCity =
      (req.headers['x-appengine-city'] as string) ||
      (req.headers['x-vercel-ip-city'] as string);
    const headerLatLong = req.headers['x-appengine-citylatlong'] as string | undefined;

    if (headerLatLong && headerLatLong.includes(',')) {
      const [latStr, lonStr] = headerLatLong.split(',');
      const lat = Number(latStr);
      const lon = Number(lonStr);
      if (Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0)) {
        geo = {
          city: headerCity ? decodeURIComponent(headerCity) : undefined,
          code: headerCountry && headerCountry !== 'ZZ' ? headerCountry.toUpperCase() : undefined,
          lat,
          lon,
        };
      }
    }

    // 2. Fallback to public IP geolocation when client IP is routable
    if ((!geo || !geo.city) && !isPrivateOrLocalIp(resolvedIp)) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 1600);
        const geoRes = await fetch(`https://ipwho.is/${encodeURIComponent(resolvedIp)}`, {
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (geoRes.ok) {
          const data = (await geoRes.json()) as {
            success?: boolean;
            city?: string;
            country?: string;
            country_code?: string;
            latitude?: number;
            longitude?: number;
          };
          if (
            data.success &&
            typeof data.latitude === 'number' &&
            typeof data.longitude === 'number'
          ) {
            geo = {
              city: data.city || geo?.city,
              country: data.country,
              code: data.country_code?.toUpperCase() || geo?.code,
              lat: data.latitude,
              lon: data.longitude,
            };
          }
        }
      } catch {
        // Ignore network timeout/errors and let client fall back to timezone detection
      }
    }

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      detectedIp: resolvedIp,
      geo,
      protocol: req.protocol,
      host: req.headers.host || 'localhost',
      userAgent,
      serverTimestamp: Date.now(),
    });
  });

  // Low-overhead ping probe for real RTT & jitter calculation
  app.get('/api/ping', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, ts: Date.now() });
  });

  // Download speed probe (512 KB binary payload)
  const probePayload = crypto.randomBytes(512 * 1024);
  app.get('/api/speed-probe', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', String(probePayload.length));
    res.send(probePayload);
  });

  // Upload speed probe
  app.post('/api/speed-probe', (req, res) => {
    const byteLength = Buffer.isBuffer(req.body) ? req.body.length : 0;
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      receivedBytes: byteLength,
      serverTimestamp: Date.now(),
    });
  });

  // Live payment gateway configuration check
  app.get('/api/billing/status', (_req, res) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      livePaymentsEnabled: Boolean(stripeKey),
      mode: stripeKey.startsWith('sk_live_')
        ? 'live'
        : stripeKey.startsWith('sk_test_')
          ? 'test'
          : 'unconfigured',
      provider: 'Stripe',
    });
  });

  // Real Stripe Checkout Session creation (Visa / Mastercard / Amex / Apple Pay / Google Pay)
  app.post('/api/billing/create-checkout-session', async (req, res) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      res.status(503).json({
        ok: false,
        missingSecret: true,
        error:
          'Stripe secret key is not configured yet. Add STRIPE_SECRET_KEY in Environment Secrets to process real card payments.',
      });
      return;
    }

    const { planId, billingCycle, currency, email, originUrl } = req.body || {};
    if (planId !== 'pro' && planId !== 'max') {
      res.status(400).json({ ok: false, error: 'Please select Meridian Pro or Meridian Max.' });
      return;
    }

    const cycle: 'monthly' | 'yearly' = billingCycle === 'monthly' ? 'monthly' : 'yearly';
    const curCode = typeof currency === 'string' && CURRENCY_RATES[currency] ? currency : 'USD';
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      res.status(400).json({ ok: false, error: 'Please enter a valid email address for your receipt.' });
      return;
    }

    const usdTotal = AUTHORITATIVE_USD_PRICES[planId as 'pro' | 'max'][cycle];
    const converted = usdTotal * CURRENCY_RATES[curCode].rate;
    const unitAmountMinor = Math.max(100, Math.round(converted * 100));

    const hostHeader = req.get('host');
    const fallbackOrigin = hostHeader ? `${req.protocol}://${hostHeader}` : 'http://localhost:3000';
    const baseUrl = (
      process.env.APP_URL ||
      (typeof originUrl === 'string' && originUrl.startsWith('http') ? originUrl : fallbackOrigin)
    ).replace(/\/$/, '');

    const params = new URLSearchParams();
    params.append('mode', 'subscription');
    params.append('payment_method_types[0]', 'card');
    params.append('customer_email', email.trim());
    params.append(
      'line_items[0][price_data][currency]',
      curCode.toLowerCase()
    );
    params.append(
      'line_items[0][price_data][product_data][name]',
      planId === 'pro' ? 'Meridian VPN Pro' : 'Meridian VPN Max'
    );
    params.append(
      'line_items[0][price_data][product_data][description]',
      planId === 'pro'
        ? 'All 16 global server locations · 10 devices · 10 Gbps Turbo'
        : 'All global locations · 25 devices · Double-Hop & Dedicated IP'
    );
    params.append('line_items[0][price_data][unit_amount]', String(unitAmountMinor));
    params.append(
      'line_items[0][price_data][recurring][interval]',
      cycle === 'yearly' ? 'year' : 'month'
    );
    params.append('line_items[0][quantity]', '1');
    params.append('metadata[planId]', planId);
    params.append('metadata[billingCycle]', cycle);
    params.append('success_url', `${baseUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
    params.append('cancel_url', `${baseUrl}/?checkout=canceled`);

    try {
      const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const stripeData = (await stripeRes.json()) as {
        id?: string;
        url?: string;
        error?: { message?: string };
      };

      if (!stripeRes.ok || !stripeData.url || !stripeData.id) {
        res.status(400).json({
          ok: false,
          error: stripeData.error?.message || 'Unable to start Stripe Checkout session.',
        });
        return;
      }

      res.setHeader('Cache-Control', 'no-store');
      res.json({
        ok: true,
        sessionId: stripeData.id,
        checkoutUrl: stripeData.url,
      });
    } catch {
      res.status(502).json({
        ok: false,
        error: 'Could not reach Stripe servers. Please try again.',
      });
    }
  });

  // Verify completed Stripe Checkout Session and persist active subscription
  app.get('/api/billing/verify-session', async (req, res) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const sessionId = typeof req.query.session_id === 'string' ? req.query.session_id.trim() : '';
    if (!stripeKey || !sessionId) {
      res.status(400).json({ ok: false, error: 'Missing Stripe session verification context.' });
      return;
    }

    try {
      const stripeRes = await fetch(
        `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
        {
          headers: { Authorization: `Bearer ${stripeKey}` },
        }
      );

      const session = (await stripeRes.json()) as {
        id?: string;
        payment_status?: string;
        status?: string;
        customer?: string;
        subscription?: string;
        customer_email?: string;
        customer_details?: { email?: string };
        amount_total?: number;
        currency?: string;
        metadata?: { planId?: string; billingCycle?: string };
        error?: { message?: string };
      };

      if (!stripeRes.ok || !session.id) {
        res.status(400).json({
          ok: false,
          error: session.error?.message || 'Unable to verify Stripe payment session.',
        });
        return;
      }

      if (session.payment_status !== 'paid' && session.status !== 'complete') {
        res.status(402).json({
          ok: false,
          paid: false,
          error: 'Payment has not completed yet.',
        });
        return;
      }

      const planId: 'pro' | 'max' = session.metadata?.planId === 'max' ? 'max' : 'pro';
      const billingCycle: 'monthly' | 'yearly' =
        session.metadata?.billingCycle === 'monthly' ? 'monthly' : 'yearly';
      const email = session.customer_details?.email || session.customer_email || 'customer@meridianvpn.net';
      const cur = (session.currency || 'usd').toUpperCase();
      const amountFormatted =
        typeof session.amount_total === 'number'
          ? `${cur} ${(session.amount_total / 100).toFixed(2)}`
          : cur;

      await saveSubscription({
        email,
        planId,
        billingCycle,
        status: 'active',
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        stripeSessionId: session.id,
        amountFormatted,
        currency: cur,
        updatedAt: new Date().toISOString(),
      });

      res.setHeader('Cache-Control', 'no-store');
      res.json({
        ok: true,
        paid: true,
        planId,
        billingCycle,
        email,
        transactionId: session.id,
        amountFormatted,
      });
    } catch {
      res.status(502).json({ ok: false, error: 'Failed to verify Stripe payment session.' });
    }
  });

  // Restore verified paid subscription by customer email
  app.get('/api/billing/subscription', async (req, res) => {
    const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : '';
    if (!email) {
      res.status(400).json({ ok: false, error: 'Email is required.' });
      return;
    }

    const store = await readSubscriptions();
    const record = store[email];
    if (!record || record.status !== 'active') {
      res.status(404).json({ ok: false, error: 'No active paid subscription found for this email.' });
      return;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, subscription: record });
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Meridian VPN server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
