# Barbados - Backend API

Backend Node.js/Express + PostgreSQL para la aplicación Barbershop.

## Características

- ✓ PostgreSQL automáticamente inicializado
- ✓ Compatibilidad con Render, Railway, Neon
- ✓ API REST completa
- ✓ Autenticación con bcrypt
- ✓ CORS habilitado
- ✓ Inicialización automática de tablas
- ✓ Pagos reales con Stripe y PayPal
- ✓ Facturas PDF descargables con marca Barbados

## Setup Local

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar PostgreSQL

**Option A: Local (localhost)**
```bash
# Instalar PostgreSQL si no lo tienes
# En Windows: https://www.postgresql.org/download/windows/

# Crear base de datos
createdb barbados

# En .env
DATABASE_URL=postgresql://postgres:password@localhost:5432/barbados
```

**Option B: Neon (Cloud, Gratis)**
1. Ve a https://neon.tech
2. Crea cuenta gratis
3. Copia la connection string en `.env`

### 3. Crear archivo .env
```bash
cp .env.example .env
# Editar .env con tus credenciales
```

### 4. Configurar pagos

Si vas a cobrar con tarjeta o PayPal, completa estas variables:

```bash
FRONTEND_URL=http://localhost:5173
PAYMENT_CURRENCY=usd
INVOICE_TAX_RATE=0.13
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
```

### 4. Iniciar servidor
```bash
npm start
# O con hot reload:
npm run dev
```

El servidor estará en `http://localhost:3000`

## Deploy en Render

### 1. Crear proyecto en Render

1. Ve a https://render.com
2. Nuevo "Web Service"
3. Conecta tu repositorio GitHub
4. Configura:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 2. Añadir PostgreSQL en Render

1. En Render, crea una nueva **PostgreSQL Database**
2. Copia la connection string
3. En tu Web Service, añade variable de entorno:
   ```
   DATABASE_URL = [paste connection string]
   ```

### 3. Deploy
Cuando hagas push a GitHub, se desplegará automáticamente.

---

## Deploy en Railway

### 1. Crear cuenta en Railway
https://railway.app

### 2. Crear nuevo Proyecto
- Selecciona "From GitHub"
- Conecta tu repositorio

### 3. Añadir PostgreSQL
- Click "Add" → Busca "PostgreSQL"
- Se conectará automáticamente

### 4. Variables de entorno
Railway inyecta automáticamente `DATABASE_URL`

### 5. Deploy
Push a GitHub y Railway despliega automáticamente.

---

## API Endpoints

### Auth
- `POST /api` → `action=register` - Registrar usuario
- `POST /api` → `action=login` - Login
- `POST /api` → `action=create-admin` - Crear admin (solo admin)

### Users
- `GET /api?action=users` - Listar todos los usuarios
- `PUT /api?action=users&id=X` - Actualizar usuario
- `POST /api?action=change-password&id=X` - Cambiar contraseña

### Products
- `GET /api?action=products` - Listar productos
- `GET /api?action=products&category=service` - Productos por categoría
- `POST /api` → `action=products` - Crear producto
- `PUT /api?action=products&id=X` - Actualizar producto
- `DELETE /api?action=products&id=X` - Eliminar producto

### Health
- `GET /health` - Estado del servidor

## Variables de entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Connection string PostgreSQL | postgresql://localhost:5432/barbados |
| `PORT` | Puerto del servidor | 3000 |
| `NODE_ENV` | Entorno (development/production) | development |
| `FRONTEND_URL` | URL del frontend para retornos de pago | http://localhost:5173 |
| `PAYMENT_CURRENCY` | Moneda de cobro | usd |
| `INVOICE_TAX_RATE` | IVA de factura | 0.13 |
| `STRIPE_SECRET_KEY` | Clave privada de Stripe | - |
| `STRIPE_PUBLISHABLE_KEY` | Clave pública de Stripe | - |
| `PAYPAL_CLIENT_ID` | Cliente PayPal | - |
| `PAYPAL_CLIENT_SECRET` | Secreto PayPal | - |
| `PAYPAL_ENV` | sandbox o live | sandbox |

## Estructura de archivos

```
backend/
├── server.js                   # Servidor principal
├── db.js                       # Conexión PostgreSQL
├── scripts/initDB.js           # Inicialización de tablas (moved)
├── scripts/payments.js         # Pagos, facturas y PDF
├── package.json
├── .env.example
├── .env                        # (local, no versionar)
└── .gitignore
```

## Notas

- Las tablas se crean automáticamente al iniciar
- Usa bcrypt para contraseñas (nunca almacenes en texto plano)
- CORS habilitado para cualquier origen (cambiar en producción)
- Variables de entorno: Copia `.env.example` a `.env`

## Troubleshooting

**Error: "cannot find module 'express'"**
```bash
npm install
```

**Error: "connection refused"**
- Verifica que PostgreSQL esté corriendo
- Revisa DATABASE_URL en .env
- Local: `psql -U postgres` para verificar

**Error: "EADDRINUSE"**
```bash
# Cambiar PORT en .env
PORT=3001
```
