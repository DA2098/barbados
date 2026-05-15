import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import Stripe from 'stripe';
import pool from '../db.js';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;
const paypalEnv = (process.env.PAYPAL_ENV || 'sandbox').toLowerCase() === 'live' ? 'live' : 'sandbox';
const paypalBaseUrl = paypalEnv === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';
const frontendBaseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const paymentCurrency = (process.env.PAYMENT_CURRENCY || 'usd').toLowerCase();
const invoiceTaxRate = Number(process.env.INVOICE_TAX_RATE || 0.13);
const companyName = process.env.BRAND_NAME || 'BARBADOS';
const companyTagline = process.env.BRAND_TAGLINE || 'Barbería salvadoreña con estilo premium';
const companyAddress = process.env.BRAND_ADDRESS || 'El Salvador';
const companyPhone = process.env.BRAND_PHONE || '';
const companyEmail = process.env.BRAND_EMAIL || 'facturacion@barbados.com';
const logoPath = path.resolve(process.cwd(), '..', 'public', 'logitobarbados.png');

function roundAmount(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function toMinorUnits(value) {
  return Math.round(roundAmount(value) * 100);
}

function ensureStripeConfigured() {
  if (!stripe) {
    throw new Error('Stripe no está configurado. Define STRIPE_SECRET_KEY.');
  }
}

function ensurePayPalConfigured() {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal no está configurado. Define PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET.');
  }
}

async function getPaypalAccessToken() {
  ensurePayPalConfigured();
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`No se pudo autenticar con PayPal: ${text}`);
  }

  const data = await response.json();
  return data.access_token;
}

function normalizePaymentKind(kind) {
  return kind === 'appointment' ? 'appointment' : 'cart';
}

function buildInvoiceNumber(id, paidAt = new Date()) {
  const year = String(paidAt.getFullYear()).slice(-2);
  const month = String(paidAt.getMonth() + 1).padStart(2, '0');
  const day = String(paidAt.getDate()).padStart(2, '0');
  return `BB-${year}${month}${day}-${String(id).padStart(5, '0')}`;
}

function formatCurrency(amount, currency = paymentCurrency) {
  return new Intl.NumberFormat('es-SV', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(amount || 0));
}

function calcTotals(subtotal) {
  const taxAmount = roundAmount(subtotal * invoiceTaxRate);
  const total = roundAmount(subtotal + taxAmount);
  return { subtotal: roundAmount(subtotal), taxAmount, total };
}

function parsePayload(payload) {
  if (!payload) return {};
  if (typeof payload === 'object') return payload;
  try {
    return JSON.parse(payload);
  } catch {
    return {};
  }
}

async function fetchProductsByIds(items) {
  const ids = items.map((item) => item.productId).filter(Boolean);
  if (ids.length === 0) return [];
  const result = await pool.query(
    `SELECT id, name, description, price, stock, image_url FROM products WHERE id = ANY($1::int[])`,
    [ids.map((id) => Number(id))]
  );
  return result.rows;
}

function normalizeCartItems(rawItems = []) {
  return rawItems.map((item) => ({
    productId: String(item.productId),
    name: String(item.name || 'Producto'),
    price: Number(item.price || 0),
    quantity: Number(item.quantity || 1)
  }));
}

function normalizeAppointmentPayload(rawAppointment = {}) {
  return {
    barberId: String(rawAppointment.barberId || ''),
    barberName: String(rawAppointment.barberName || ''),
    serviceId: rawAppointment.serviceId ? String(rawAppointment.serviceId) : null,
    serviceName: String(rawAppointment.serviceName || 'Servicio'),
    servicePrice: Number(rawAppointment.servicePrice || 0),
    appointmentDate: String(rawAppointment.appointmentDate || ''),
    notes: String(rawAppointment.notes || '')
  };
}

function buildPurchaseUnits(items, totalAmount, label, context = {}) {
  return [{
    reference_id: label,
    custom_id: JSON.stringify(context),
    amount: {
      currency_code: paymentCurrency.toUpperCase(),
      value: roundAmount(totalAmount).toFixed(2),
      breakdown: {
        item_total: {
          currency_code: paymentCurrency.toUpperCase(),
          value: roundAmount(totalAmount).toFixed(2)
        }
      }
    },
    items: items.map((item) => ({
      name: item.name,
      description: item.description || item.name,
      sku: item.productId || label,
      unit_amount: {
        currency_code: paymentCurrency.toUpperCase(),
        value: roundAmount(item.price).toFixed(2)
      },
      quantity: String(item.quantity)
    }))
  }];
}

export async function createCheckoutSession({ user, kind, method, cartItems = [], appointment = null }) {
  const paymentKind = normalizePaymentKind(kind);
  const paymentMethod = method === 'paypal' ? 'paypal' : 'card';
  const payload = paymentKind === 'appointment'
    ? { appointment: normalizeAppointmentPayload(appointment || {}) }
    : { items: normalizeCartItems(cartItems) };

  if (paymentKind === 'cart') {
    const products = await fetchProductsByIds(payload.items || []);
    const productMap = new Map(products.map((product) => [String(product.id), product]));
    for (const item of payload.items) {
      const product = productMap.get(String(item.productId));
      if (!product) {
        throw new Error(`Producto no encontrado: ${item.name}`);
      }
      if (Number(product.stock) < Number(item.quantity)) {
        throw new Error(`Stock insuficiente para ${product.name}`);
      }
      item.name = product.name;
      item.price = Number(product.price);
    }
  }

  const subtotal = paymentKind === 'appointment'
    ? Number(payload.appointment.servicePrice || 0)
    : payload.items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);

  if (subtotal <= 0) {
    throw new Error('No hay monto válido para cobrar');
  }

  if (paymentMethod === 'card') {
    ensureStripeConfigured();

    const lineItems = paymentKind === 'appointment'
      ? [{
          price_data: {
            currency: paymentCurrency,
            product_data: {
              name: payload.appointment.serviceName,
              description: `Cita con ${payload.appointment.barberName || 'barbero'}`
            },
            unit_amount: toMinorUnits(subtotal)
          },
          quantity: 1
        }]
      : payload.items.map((item) => ({
          price_data: {
            currency: paymentCurrency,
            product_data: {
              name: item.name,
              description: item.name
            },
            unit_amount: toMinorUnits(item.price)
          },
          quantity: item.quantity
        }));

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      client_reference_id: user.id,
      success_url: `${frontendBaseUrl}/#/payments/return?provider=stripe&kind=${paymentKind}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendBaseUrl}/#/cart`,
      line_items: lineItems,
      metadata: {
        userId: String(user.id),
        kind: paymentKind,
        method: paymentMethod,
        payload: JSON.stringify(payload)
      }
    }, {
      // Use an idempotency key to reduce risk of duplicate charges
      idempotencyKey: `checkout_${user.id}_${Date.now()}`
    });

    return {
      provider: 'stripe',
      paymentMethod,
      kind: paymentKind,
      referenceId: session.id,
      checkoutUrl: session.url
    };
  }

  ensurePayPalConfigured();
  const accessToken = await getPaypalAccessToken();
  const items = paymentKind === 'appointment'
    ? [{
        productId: payload.appointment.serviceId || 'appointment',
        name: payload.appointment.serviceName,
        description: `Cita con ${payload.appointment.barberName || 'barbero'}`,
        price: subtotal,
        quantity: 1
      }]
    : payload.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        description: item.name,
        price: item.price,
        quantity: item.quantity
      }));

  const returnUrl = `${frontendBaseUrl}/#/payments/return?provider=paypal&kind=${paymentKind}`;
  const cancelUrl = paymentKind === 'appointment' ? `${frontendBaseUrl}/#/appointments` : `${frontendBaseUrl}/#/cart`;

  const response = await fetch(`${paypalBaseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: buildPurchaseUnits(items, subtotal, paymentKind, {
        userId: String(user.id),
        kind: paymentKind,
        method: paymentMethod,
        payload
      }),
      application_context: {
        brand_name: companyName,
        locale: 'es-SV',
        landing_page: 'BILLING',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        return_url: returnUrl,
        cancel_url: cancelUrl
      },
      payer: {
        email_address: user.email
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`No se pudo crear la orden de PayPal: ${text}`);
  }

  const order = await response.json();
  const approvalUrl = order.links?.find((link) => link.rel === 'approve')?.href || null;
  if (!approvalUrl) {
    throw new Error('PayPal no devolvió una URL de aprobación');
  }

  return {
    provider: 'paypal',
    paymentMethod,
    kind: paymentKind,
    referenceId: order.id,
    checkoutUrl: approvalUrl
  };
}

async function upsertPaymentSession(client, sessionData) {
  const { userId, kind, provider, providerReference, status, currency, amount, payload } = sessionData;
  await client.query(
    `INSERT INTO payment_sessions (user_id, kind, provider, provider_reference, status, currency, amount, payload, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $5 = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END)
     ON CONFLICT (provider, provider_reference) DO UPDATE
     SET status = EXCLUDED.status,
         currency = EXCLUDED.currency,
         amount = EXCLUDED.amount,
         payload = EXCLUDED.payload,
         completed_at = CASE WHEN EXCLUDED.status = 'completed' THEN CURRENT_TIMESTAMP ELSE payment_sessions.completed_at END`,
    [userId, kind, provider, providerReference, status, currency, amount, JSON.stringify(payload || {})]
  );
}

async function insertInvoice(client, invoiceData) {
  const result = await client.query(
    `INSERT INTO invoices (
      invoice_number, user_id, kind, payment_method, payment_provider, payment_reference,
      currency, subtotal, tax_amount, total, billing_name, billing_email, payload, paid_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)
     RETURNING id`,
    [
      invoiceData.invoiceNumber || null,
      invoiceData.userId,
      invoiceData.kind,
      invoiceData.paymentMethod,
      invoiceData.paymentProvider,
      invoiceData.paymentReference,
      invoiceData.currency,
      invoiceData.subtotal,
      invoiceData.taxAmount,
      invoiceData.total,
      invoiceData.billingName,
      invoiceData.billingEmail,
      JSON.stringify(invoiceData.payload || {})
    ]
  );

  const invoiceId = result.rows[0].id;
  const invoiceNumber = invoiceData.invoiceNumber || buildInvoiceNumber(invoiceId, new Date());
  await client.query('UPDATE invoices SET invoice_number = $1 WHERE id = $2', [invoiceNumber, invoiceId]);
  return { invoiceId, invoiceNumber };
}

async function createCartOrder(client, user, payload, paymentMethod, paymentProvider, paymentReference, currency) {
  const items = normalizeCartItems(payload.items || []);
  const productRows = await client.query(
    `SELECT id, name, price, stock FROM products WHERE id = ANY($1::int[])`,
    [items.map((item) => Number(item.productId))]
  );
  const productMap = new Map(productRows.rows.map((row) => [String(row.id), row]));

  for (const item of items) {
    const product = productMap.get(String(item.productId));
    if (!product) {
      throw new Error(`Producto no encontrado: ${item.name}`);
    }
    if (Number(product.stock) < Number(item.quantity)) {
      throw new Error(`Stock insuficiente para ${product.name}`);
    }
  }

  const subtotal = roundAmount(items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0));
  const { taxAmount, total } = calcTotals(subtotal);

  const orderRes = await client.query(
    `INSERT INTO orders (user_id, total, status, payment_method, payment_provider, payment_reference, currency)
     VALUES ($1, $2, 'completed', $3, $4, $5, $6)
     RETURNING id`,
    [user.id, total, paymentMethod, paymentProvider, paymentReference, currency]
  );

  const orderId = orderRes.rows[0].id;
  for (const item of items) {
    const product = productMap.get(String(item.productId));
    const unitPrice = roundAmount(product.price);
    const lineTotal = roundAmount(unitPrice * Number(item.quantity));
    await client.query(
      `INSERT INTO order_items (order_id, product_id, item_name, unit_price, quantity, line_total)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [orderId, product.id, product.name, unitPrice, item.quantity, lineTotal]
    );
    await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, product.id]);
  }

  const invoiceData = {
    userId: user.id,
    kind: 'cart',
    paymentMethod,
    paymentProvider,
    paymentReference,
    currency,
    subtotal,
    taxAmount,
    total,
    billingName: user.name,
    billingEmail: user.email,
    payload: {
      items,
      orderId,
      paymentReference
    }
  };
  const invoice = await insertInvoice(client, invoiceData);
  await client.query('UPDATE orders SET invoice_id = $1 WHERE id = $2', [invoice.invoiceId, orderId]);

  return {
    type: 'cart',
    orderId,
    invoiceId: invoice.invoiceId,
    invoiceNumber: invoice.invoiceNumber,
    subtotal,
    taxAmount,
    total,
    items
  };
}

async function createAppointmentBooking(client, user, payload, paymentMethod, paymentProvider, paymentReference, currency) {
  const appointment = normalizeAppointmentPayload(payload.appointment || {});
  if (!appointment.barberId || !appointment.serviceName || !appointment.appointmentDate) {
    throw new Error('Faltan datos de la cita');
  }

  const servicePrice = roundAmount(appointment.servicePrice || 0);
  const { taxAmount, total } = calcTotals(servicePrice);

  const created = await client.query(
    `INSERT INTO appointments (
      client_id, barber_id, service_id, service_name, appointment_date, notes,
      status, payment_status, payment_method, payment_provider, payment_reference, currency
     ) VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', 'paid', $7, $8, $9, $10)
     RETURNING id`,
    [
      user.id,
      appointment.barberId,
      appointment.serviceId || null,
      appointment.serviceName,
      appointment.appointmentDate,
      appointment.notes || '',
      paymentMethod,
      paymentProvider,
      paymentReference,
      currency
    ]
  );

  const appointmentId = created.rows[0].id;
  const invoiceData = {
    userId: user.id,
    kind: 'appointment',
    paymentMethod,
    paymentProvider,
    paymentReference,
    currency,
    subtotal: servicePrice,
    taxAmount,
    total,
    billingName: user.name,
    billingEmail: user.email,
    payload: {
      appointment: {
        ...appointment,
        appointmentId
      },
      paymentReference
    }
  };
  const invoice = await insertInvoice(client, invoiceData);
  await client.query('UPDATE appointments SET invoice_id = $1 WHERE id = $2', [invoice.invoiceId, appointmentId]);

  return {
    type: 'appointment',
    appointmentId,
    barberId: appointment.barberId,
    clientId: user.id,
    serviceName: appointment.serviceName,
    appointmentDate: appointment.appointmentDate,
    invoiceId: invoice.invoiceId,
    invoiceNumber: invoice.invoiceNumber,
    subtotal: servicePrice,
    taxAmount,
    total
  };
}

async function capturePaypalOrder(orderId) {
  const accessToken = await getPaypalAccessToken();
  const response = await fetch(`${paypalBaseUrl}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`No se pudo capturar la orden de PayPal: ${text}`);
  }

  return await response.json();
}

async function retrieveStripeSession(sessionId) {
  ensureStripeConfigured();
  return await stripe.checkout.sessions.retrieve(sessionId);
}

function resolveInvoiceData(row) {
  return {
    id: String(row.id),
    invoiceNumber: row.invoice_number,
    userId: String(row.user_id),
    kind: row.kind,
    paymentMethod: row.payment_method,
    paymentProvider: row.payment_provider,
    paymentReference: row.payment_reference,
    currency: row.currency,
    subtotal: Number(row.subtotal),
    taxAmount: Number(row.tax_amount),
    total: Number(row.total),
    billingName: row.billing_name,
    billingEmail: row.billing_email,
    payload: parsePayload(row.payload),
    createdAt: row.created_at,
    paidAt: row.paid_at
  };
}

export async function confirmPayment({ provider, referenceId }) {
  if (!referenceId) {
    throw new Error('Falta el identificador de pago');
  }

  let paymentProvider = provider === 'paypal' ? 'paypal' : 'stripe';
  let paymentMethod = paymentProvider === 'paypal' ? 'paypal' : 'card';
  let sessionPayload = {};
  let paymentKind = 'cart';
  let totalAmount = 0;
  let userEmail = '';
  let userId = null;

  if (paymentProvider === 'stripe') {
    const session = await retrieveStripeSession(referenceId);
    if (session.payment_status !== 'paid') {
      throw new Error('El pago todavía no está confirmado');
    }
    sessionPayload = parsePayload(session.metadata?.payload);
    paymentKind = normalizePaymentKind(session.metadata?.kind);
    totalAmount = Number(session.amount_total || 0) / 100;
    userId = session.metadata?.userId ? Number(session.metadata.userId) : null;
    userEmail = session.customer_details?.email || session.customer_email || '';
    paymentMethod = session.metadata?.method === 'paypal' ? 'paypal' : 'card';
  } else {
    const captured = await capturePaypalOrder(referenceId);
    const capture = captured.purchase_units?.[0]?.payments?.captures?.[0];
    if (!capture || capture.status !== 'COMPLETED') {
      throw new Error('El pago con PayPal no se completó correctamente');
    }
    const purchaseUnit = captured.purchase_units?.[0] || {};
    sessionPayload = parsePayload(purchaseUnit.custom_id) || {};
    paymentKind = normalizePaymentKind(sessionPayload.kind || 'cart');
    totalAmount = Number(purchaseUnit.amount?.value || capture.amount?.value || 0);
    userId = Number(sessionPayload.userId || 0) || null;
    userEmail = captured.payer?.email_address || '';
  }

  if (!userId) {
    throw new Error('No se pudo determinar el usuario del pago');
  }

  const userResult = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [userId]);
  const user = userResult.rows[0];
  if (!user) {
    throw new Error('Usuario no encontrado para el pago');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT i.*
       FROM invoices i
       JOIN payment_sessions p ON p.provider_reference = i.payment_reference
       WHERE p.provider = $1 AND p.provider_reference = $2
       LIMIT 1`,
      [paymentProvider, referenceId]
    );

    if (existing.rowCount > 0) {
      await client.query('COMMIT');
      return resolveInvoiceData(existing.rows[0]);
    }

    const paymentSessionPayload = paymentKind === 'appointment' ? sessionPayload : sessionPayload;
    const amountValue = paymentKind === 'appointment'
      ? Number(paymentSessionPayload.appointment?.servicePrice || totalAmount)
      : totalAmount;

    await upsertPaymentSession(client, {
      userId,
      kind: paymentKind,
      provider: paymentProvider,
      providerReference: referenceId,
      status: 'completed',
      currency: paymentCurrency,
      amount: amountValue,
      payload: paymentSessionPayload
    });

    const result = paymentKind === 'appointment'
      ? await createAppointmentBooking(client, user, paymentSessionPayload, paymentMethod, paymentProvider, referenceId, paymentCurrency)
      : await createCartOrder(client, user, paymentSessionPayload, paymentMethod, paymentProvider, referenceId, paymentCurrency);

    const invoiceRow = await client.query('SELECT * FROM invoices WHERE id = $1', [result.invoiceId]);
    await client.query('COMMIT');
    return resolveInvoiceData(invoiceRow.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listInvoicesForUser(userId, isAdmin = false) {
  const query = isAdmin
    ? `SELECT * FROM invoices ORDER BY created_at DESC`
    : `SELECT * FROM invoices WHERE user_id = $1 ORDER BY created_at DESC`;
  const result = await pool.query(query, isAdmin ? [] : [userId]);
  return result.rows.map(resolveInvoiceData);
}

export async function getInvoiceById(invoiceId) {
  const result = await pool.query('SELECT * FROM invoices WHERE id = $1', [invoiceId]);
  if (result.rowCount === 0) return null;
  return resolveInvoiceData(result.rows[0]);
}

function drawHeader(doc, invoice) {
  doc.roundedRect(36, 36, 523, 110, 16).fillAndStroke('#0f172a', '#0f172a');
  try {
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 56, 56, { width: 72, height: 72 });
    }
  } catch {
    // ignore logo loading errors
  }

  doc.fillColor('#ffffff');
  doc.fontSize(24).font('Helvetica-Bold').text(companyName, 150, 52);
  doc.fontSize(10).font('Helvetica').text(companyTagline, 150, 82);
  doc.text(companyAddress, 150, 98);
  if (companyPhone) doc.text(companyPhone, 150, 112);
  doc.text(companyEmail, 150, 126);

  doc.fillColor('#0f172a');
  doc.fontSize(18).font('Helvetica-Bold').text('FACTURA', 420, 56, { align: 'right' });
  doc.fontSize(10).font('Helvetica').text(`N° ${invoice.invoiceNumber}`, 420, 82, { align: 'right' });
  doc.text(`Fecha: ${new Date(invoice.paidAt || invoice.createdAt).toLocaleString('es-SV')}`, 360, 98, { align: 'right' });
  doc.text(`Método: ${invoice.paymentMethod.toUpperCase()}`, 360, 112, { align: 'right' });
}

function drawSectionTitle(doc, title, y) {
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text(title, 40, y);
  doc.strokeColor('#cbd5e1').moveTo(40, y + 16).lineTo(555, y + 16).lineWidth(1).stroke();
}

export async function buildInvoicePdfBuffer(invoice) {
  const doc = new PDFDocument({ size: 'A4', margin: 36 });
  const chunks = [];

  doc.on('data', (chunk) => chunks.push(chunk));

  const finished = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  drawHeader(doc, invoice);

  drawSectionTitle(doc, 'Datos del cliente', 170);
  doc.fontSize(10).font('Helvetica');
  doc.text(`Nombre: ${invoice.billingName}`, 40, 192);
  doc.text(`Correo: ${invoice.billingEmail}`, 40, 208);
  doc.text(`Tipo: ${invoice.kind === 'appointment' ? 'Cita agendada' : 'Compra de productos'}`, 40, 224);

  const payload = parsePayload(invoice.payload);
  const items = invoice.kind === 'appointment'
    ? [{
        name: payload.appointment?.serviceName || 'Servicio',
        quantity: 1,
        unitPrice: Number(invoice.subtotal),
        lineTotal: Number(invoice.subtotal)
      }]
    : (payload.items || []).map((item) => ({
        name: item.name,
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.price || 0),
        lineTotal: Number(item.price || 0) * Number(item.quantity || 1)
      }));

  drawSectionTitle(doc, 'Detalle', 252);
  let y = 276;
  doc.font('Helvetica-Bold').text('Concepto', 40, y);
  doc.text('Cant.', 300, y, { width: 50, align: 'right' });
  doc.text('P. Unit.', 365, y, { width: 80, align: 'right' });
  doc.text('Total', 460, y, { width: 95, align: 'right' });
  doc.strokeColor('#94a3b8').moveTo(40, y + 16).lineTo(555, y + 16).stroke();
  y += 24;
  doc.font('Helvetica');

  for (const item of items) {
    if (y > 700) {
      doc.addPage();
      y = 48;
    }
    doc.text(item.name, 40, y, { width: 240 });
    doc.text(String(item.quantity), 300, y, { width: 50, align: 'right' });
    doc.text(formatCurrency(item.unitPrice, invoice.currency), 365, y, { width: 80, align: 'right' });
    doc.text(formatCurrency(item.lineTotal, invoice.currency), 460, y, { width: 95, align: 'right' });
    y += 22;
  }

  y += 10;
  doc.strokeColor('#cbd5e1').moveTo(340, y).lineTo(555, y).stroke();
  y += 14;
  doc.font('Helvetica-Bold').text('Subtotal', 365, y, { width: 80, align: 'right' });
  doc.text(formatCurrency(invoice.subtotal, invoice.currency), 460, y, { width: 95, align: 'right' });
  y += 20;
  doc.font('Helvetica-Bold').text(`IVA ${(invoiceTaxRate * 100).toFixed(0)}%`, 365, y, { width: 80, align: 'right' });
  doc.text(formatCurrency(invoice.taxAmount, invoice.currency), 460, y, { width: 95, align: 'right' });
  y += 20;
  doc.fontSize(13).text('Total pagado', 365, y, { width: 80, align: 'right' });
  doc.text(formatCurrency(invoice.total, invoice.currency), 460, y, { width: 95, align: 'right' });

  y += 40;
  drawSectionTitle(doc, 'Pago y comprobante', y);
  y += 24;
  doc.fontSize(10).font('Helvetica');
  doc.text(`Proveedor: ${invoice.paymentProvider.toUpperCase()}`, 40, y);
  doc.text(`Referencia: ${invoice.paymentReference}`, 40, y + 16);
  doc.text(`Moneda: ${invoice.currency.toUpperCase()}`, 40, y + 32);
  doc.text('Gracias por confiar en Barbados.', 40, y + 52);

  doc.end();
  return finished;
}
