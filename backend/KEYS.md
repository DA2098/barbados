# Keys & Production Payment Setup

Guía breve y segura para colocar las credenciales de Stripe y PayPal y dejar la aplicación lista para cobrar.

IMPORTANTE: nunca pegues claves secretas en foros, chats ni en commits. Usa el panel de variables/secretos de tu proveedor (Render, Heroku, Vercel, etc.) o un `.env` local que esté en `.gitignore`.

1) Variables de entorno requeridas

- `STRIPE_SECRET_KEY` (sk_test_... / sk_live_...)
- `STRIPE_PUBLISHABLE_KEY` (pk_test_... / pk_live_...)
- `STRIPE_WEBHOOK_SECRET` (whsec_... — obtén esto al registrar el webhook en Stripe)
- `PAYPAL_ENV` (`sandbox` o `live`)
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `PAYPAL_WEBHOOK_ID` (id que devuelve PayPal al crear el webhook)
- `FRONTEND_URL` (ej. `https://tudominio.com`)

2) Dónde ponerlas

- Desarrollo local: copia `backend/.env.example` → `backend/.env` y rellena los valores. `backend/.env` está en `.gitignore` y no debe subirse.
- Producción: añade las variables en el panel de tu hosting como "Environment Variables" / "Secrets". No uses archivos de texto con claves en el repo.

3) Registrar webhooks (es obligatorio para confirmar pagos)

- Stripe (pasos rápidos):
  1. Entra a Dashboard → Developers → Webhooks → Add endpoint.
  2. URL: `https://<tu-dominio>/webhooks/stripe` (ya implementado en el backend).
  3. Selecciona eventos: `checkout.session.completed`, `payment_intent.succeeded`.
  4. Guarda y copia el *Signing secret* (`whsec_...`) a `STRIPE_WEBHOOK_SECRET`.
  5. Para pruebas locales usa Stripe CLI:
     ```bash
     stripe login
     stripe listen --forward-to http://localhost:3000/webhooks/stripe
     # stripe CLI mostrará el webhook secret (whsec_...)
     stripe trigger checkout.session.completed
     ```

- PayPal (pasos rápidos):
  1. En dashboard de PayPal (Developers → Sandbox / Live) crea un webhook apuntando a `https://<tu-dominio>/webhooks/paypal`.
  2. Selecciona eventos: `PAYMENT.CAPTURE.COMPLETED`, `CHECKOUT.ORDER.APPROVED`.
  3. Copia el `webhook_id` y colócalo en `PAYPAL_WEBHOOK_ID`.
  4. Para pruebas usa el Webhooks simulator en la consola de PayPal sandbox.

4) Qué cuenta recibe el dinero

- El dinero siempre va a la cuenta MERCHANT asociada a las claves **live** que pongas (la cuenta Stripe o PayPal donde generaste las claves). Si colocas las claves de otra persona/empresa, el dinero irá a esa cuenta.
- Revisa KYC y los detalles de payout de esa cuenta (banco, frecuencia de payout).

5) Paso final: reiniciar y verificar

- Después de añadir las variables en el host, reinicia el servicio (o redeploy). En local, reinicia el backend (`npm run start-all` o `npm run dev`).
- Verifica con pruebas en sandbox (Stripe test cards, PayPal sandbox) antes de cambiar a `live`.

6) Resumen de seguridad mínimo

- Guarda claves en el gestor de secretos del proveedor, no en el repo.
- Habilita 2FA en Stripe y PayPal.
- Registra y verifica webhooks antes de confiar en redirects.
- No almacenes información de tarjetas en tu base de datos.

Si quieres, puedo ahora:

- 1) Comprobar que `backend/.env` está limpio y no tiene claves reales (ya está en `.gitignore`).
- 2) Crear un commit con este archivo y empujarlo al remoto (lo haré a continuación).
- 3) Guiarte paso a paso para poner tus claves de prueba en `backend/.env` y ejecutar una compra de prueba (no pegues claves live aquí).
