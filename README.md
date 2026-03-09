# BarberPro 360

Sistema real para barbería construido con React, Vite, Tailwind-style utility design en `index.css`, backend en PHP puro y PostgreSQL.

## Qué incluye
- Página principal comercial
- Registro y login reales
- Panel por roles: admin, barbero y cliente
- Agenda de citas
- Chat con imágenes y audio
- Notificaciones por mensajes y eventos del sistema
- Sonido de notificación en frontend
- Carrito persistente en base de datos
- Checkout real contra API
- Órdenes visibles por administración con detalle de cliente, productos comprados y último servicio/cita

## Cómo levantar el sistema
1. Crea la base de datos PostgreSQL.
2. Importa `schema.sql`.
3. Configura `backend/config.php`.
4. Levanta la API:
   - `php -S localhost:8000 -t backend`
5. Levanta el frontend:
   - `npm install`
   - `npm run dev`

## API principal
- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/users`
- `GET /api/users/{id}/profile`
- `POST /api/users/{id}/avatar`
- `DELETE /api/users/{id}/avatar`
- `GET /api/services`
- `GET /api/products`
- `POST /api/products`
- `GET /api/appointments`
- `POST /api/appointments`
- `POST /api/appointments/{id}/accept`
- `POST /api/appointments/{id}/cancel`
- `POST /api/appointments/{id}/complete`
- `GET /api/conversations`
- `POST /api/conversations`
- `POST /api/conversations/{id}/messages`
- `POST /api/conversations/{id}/clear`
- `DELETE /api/conversations/{id}`
- `GET /api/notifications`
- `POST /api/notifications/read-all`
- `GET /api/cart?client_id=...`
- `POST /api/cart`
- `PATCH /api/cart/{productId}`
- `DELETE /api/cart/{productId}`
- `GET /api/orders`
- `POST /api/orders/checkout`

Sistema real completo para barbería con:
- Frontend en React + Vite + Tailwind
- Backend en PHP puro
- Base de datos PostgreSQL
- API REST consumida por el frontend
- Página principal
- Login
- Registro
- Panel de administrador
- Panel de barbero
- Panel de cliente
- Citas
- Chat con imágenes y audio
- Notificaciones
- Tienda y carrito
- Métricas

## Estructura

- `src/` frontend React
- `backend/` API PHP
- `schema.sql` base de datos PostgreSQL

## Base de datos

1. Crear la base:
```sql
CREATE DATABASE barberpro360;
```

2. Importar el esquema:
```bash
psql -U postgres -d barberpro360 -f schema.sql
```

## Configurar backend

Editar `backend/config.php` con tus credenciales PostgreSQL si es necesario.

## Ejecutar backend

Desde la raíz del proyecto:
```bash
php -S localhost:8000 -t backend
```

La API quedará accesible en:
- `http://localhost:8000/api`

## Ejecutar frontend

```bash
npm install
npm run dev
```

## Credenciales semilla

### Admin
- correo: `admin@barberpro360.com`
- contraseña: `secret123`

### Barbero
- correo: `leandro@barberpro360.com`
- contraseña: `secret123`

### Cliente
- correo: `carlos@cliente.com`
- contraseña: `secret123`

## Endpoints principales

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/{id}`
- `DELETE /api/users/{id}`
- `GET /api/services`
- `GET /api/products`
- `POST /api/products`
- `PATCH /api/products/{id}`
- `DELETE /api/products/{id}`
- `GET /api/applications`
- `POST /api/applications`
- `POST /api/applications/{id}/approve`
- `POST /api/applications/{id}/reject`
- `GET /api/appointments`
- `POST /api/appointments`
- `POST /api/appointments/{id}/accept`
- `POST /api/appointments/{id}/cancel`
- `POST /api/appointments/{id}/complete`
- `GET /api/conversations`
- `POST /api/conversations`
- `POST /api/conversations/{id}/messages`
- `POST /api/conversations/{id}/clear`
- `DELETE /api/conversations/{id}`
- `GET /api/notifications`
- `POST /api/notifications/read-all`
- `GET /api/orders`
- `POST /api/orders/checkout`

## Flujo real del sistema

1. El frontend detecta la API PHP.
2. Login o registro contra el backend.
3. El backend consulta PostgreSQL.
4. El panel cambia según el rol del usuario.
5. Clientes crean citas.
6. Barberos aceptan citas y abren conversaciones.
7. Chat permite texto, imagen y voz.
8. Admin controla usuarios, postulaciones, productos, pedidos y métricas.
