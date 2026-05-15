#!/usr/bin/env node
import 'dotenv/config.js';
import Stripe from 'stripe';

const BACKEND_URL = process.env.BACKEND_URL || process.env.WEBHOOK_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const paymentMock = (process.env.PAYMENT_MOCK || '').toString() === '1';

async function registerStripe() {
  const key = process.env.STRIPE_SECRET_KEY || '';
  if (!key) {
    console.log('Stripe: STRIPE_SECRET_KEY not set — skipping Stripe webhook creation.');
    return;
  }
  if (paymentMock) {
    console.log('Stripe: PAYMENT_MOCK=1 — skipping Stripe webhook creation.');
    return;
  }

  try {
    const stripe = new Stripe(key);
    const url = `${BACKEND_URL.replace(/\/$/, '')}/webhooks/stripe`;
    console.log('Creating Stripe webhook endpoint for:', url);
    const ep = await stripe.webhookEndpoints.create({
      url,
      enabled_events: ['checkout.session.completed', 'payment_intent.succeeded']
    });

    console.log('\nStripe webhook created:');
    console.log('- id:', ep.id);
    if (ep.secret) console.log('- secret:', ep.secret);
    else console.log('- Note: signing secret may not be returned via API. Obtain it from the Dashboard or run `stripe listen` locally to get a signing secret.');
    console.log('- Set STRIPE_WEBHOOK_SECRET to the signing secret (whsec_... )');
  } catch (err) {
    console.error('Stripe webhook creation failed:', err.message || err);
  }
}

async function registerPayPal() {
  const clientId = process.env.PAYPAL_CLIENT_ID || '';
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
  const env = (process.env.PAYPAL_ENV || 'sandbox').toLowerCase();
  if (!clientId || !clientSecret) {
    console.log('PayPal: credentials not set — skipping PayPal webhook creation.');
    return;
  }
  if (paymentMock) {
    console.log('PayPal: PAYMENT_MOCK=1 — skipping PayPal webhook creation.');
    return;
  }

  try {
    const base = env === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
    // get access token
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials'
    });
    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      throw new Error(`PayPal token error: ${txt}`);
    }
    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token;

    const url = `${BACKEND_URL.replace(/\/$/, '')}/webhooks/paypal`;
    console.log('Creating PayPal webhook endpoint for:', url);

    const createRes = await fetch(`${base}/v1/notifications/webhooks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        event_types: [
          { name: 'PAYMENT.CAPTURE.COMPLETED' },
          { name: 'CHECKOUT.ORDER.APPROVED' }
        ]
      })
    });

    if (!createRes.ok) {
      const txt = await createRes.text();
      throw new Error(`PayPal webhook create failed: ${txt}`);
    }

    const created = await createRes.json();
    console.log('\nPayPal webhook created:');
    console.log('- id:', created.id);
    console.log('- Set PAYPAL_WEBHOOK_ID to this id');
  } catch (err) {
    console.error('PayPal webhook creation failed:', err.message || err);
  }
}

async function main() {
  console.log('Register webhooks helper — will attempt to create webhook endpoints if credentials are present.');
  console.log('Backend base URL:', BACKEND_URL);
  await registerStripe();
  await registerPayPal();
  console.log('\nDone. After creating webhooks, add the returned secrets/ids to your environment and restart the backend.');
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
