# Deploy en Render — Variables y pruebas

Instrucciones rápidas para desplegar el backend en Render y habilitar pagos (modo Checkout con Stripe/PayPal).

IMPORTANTE: nunca subas claves secretas a repositorios públicos. Usa las Environment Variables del servicio en Render.

## Variables de entorno necesarias (backend service)

- `PAYMENT_MOCK`: `0` para pagos reales, `1` para modo simulación (útil para pruebas). Default durante pruebas: `1`.
- `FRONTEND_URL`: URL pública del frontend (ej. `https://barbados.onrender.com`).
- `DATABASE_URL`: conexión Postgres.

Stripe (pruebas):
- `STRIPE_SECRET_KEY` (sk_test_...)
- `STRIPE_PUBLISHABLE_KEY` (pk_test_...)
- `STRIPE_WEBHOOK_SECRET` (whsec_..., obtenido al registrar webhook)

PayPal (sandbox/live):
- `PAYPAL_ENV` (`sandbox` o `live`)
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID`

Otros:
- `BRAND_*` (opcional, vienen en `.env.example`) — nombre y correo para facturas.

## Registrar webhooks

1. Stripe: Dashboard → Developers → Webhooks → Add endpoint
   - URL: `https://<tu-backend-domain>/webhooks/stripe`
   - Eventos recomendados: `checkout.session.completed`, `payment_intent.succeeded`
   - Copia el Signing Secret a `STRIPE_WEBHOOK_SECRET`.

2. PayPal: Developer Dashboard → Webhooks → Create webhook
   - URL: `https://<tu-backend-domain>/webhooks/paypal`
   - Eventos: `PAYMENT.CAPTURE.COMPLETED`, `CHECKOUT.ORDER.APPROVED`
   - Copia el `webhook_id` a `PAYPAL_WEBHOOK_ID`.

## Pasos de deploy

1. En Render → selecciona el servicio backend → Settings → Environment
2. Añade las variables listadas arriba (usa `PAYMENT_MOCK=1` mientras preparas pruebas)
3. Guarda y redeploya (o push a main si usas builds automáticos)
4. Prueba una compra desde el frontend público. Si usas `PAYMENT_MOCK=1` la app devolverá `checkoutUrl` con `session_id=MOCK_...` y no se harán cargos.

## Pruebas (curl)

Crear sesión de checkout (ejemplo):

```bash
curl -X POST "https://<tu-backend>/api?action=payments" \
 -H "Content-Type: application/json" \
 -d '{"intent":"create","userId":11,"kind":"cart","method":"card","cartItems":[{"productId":"1","name":"Prueba","price":5,"quantity":1}] }'
```

Respuesta esperada: JSON con `checkoutUrl` donde abrir el flujo de pago (o `MOCK_...` si `PAYMENT_MOCK=1`).

## Notas de seguridad y operación

- `PAYMENT_MOCK=1` es solo para pruebas: no procesa pagos reales ni pide datos de tarjeta.
- Para producción: establece `PAYMENT_MOCK=0`, agrega claves live, registra webhooks y prueba en modo sandbox antes de cambiar a `live`.
- Recomendación: habilita 2FA en Stripe/PayPal y revisa KYC/payouts.

## Problemas frecuentes

- Error `Stripe not configured` o `Neither apiKey nor config.authenticator provided`: ocurre cuando `STRIPE_SECRET_KEY` no está definida y `PAYMENT_MOCK=0`. Solución: define variables o activa `PAYMENT_MOCK=1` temporalmente.
- `Too many requests`: el backend aplica rate limiting. Si necesitas pruebas masivas, ajusta temporalmente `RATE_LIMIT` en el servidor o incrementa `max` en `server.js`.

---
Si quieres, puedo: (A) ejecutar un `curl` de prueba contra tu deploy (dame la URL pública), o (B) ayudarte a registrar los webhooks paso a paso.
