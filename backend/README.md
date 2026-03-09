# Backend PHP para BarberPro 360

## Stack

- PHP puro
- PostgreSQL
- PDO
- API REST JSON

## Archivos

- `index.php`: router principal de la API REST.
- `config.php`: CORS, content-type y credenciales PostgreSQL.
- `Database.php`: conexión PDO.
- `helpers.php`: helpers JSON y generación de IDs.
- `../schema.sql`: esquema completo de base de datos con datos semilla.

## 1) Crear base de datos en PostgreSQL

Ejemplo:

```sql
CREATE DATABASE barberpro360;
```

## 2) Importar esquema

Desde terminal:

```bash
psql -U postgres -d barberpro360 -f schema.sql
```

O desde pgAdmin ejecutando el contenido de `schema.sql`.

## 3) Configurar credenciales

Edita `backend/config.php`:

- host
- port
- dbname
- user
- password

## 4) Levantar el backend en local

```bash
php -S localhost:8000 -t backend
```

Con esto la API quedará disponible en:

```text
http://localhost:8000/api
```

## 5) Integración con el frontend

El frontend React detecta automáticamente estas rutas en este orden:

1. `/api`
2. `http://localhost:8000/api`

Si encuentra la API real, consume PostgreSQL vía PHP.
Si no la encuentra, entra automáticamente en modo demo local para que el sistema siga funcionando.

## Endpoints principales

### Salud
- `GET /api/health`

### Dashboard
- `GET /api/dashboard/summary`

### Servicios
- `GET /api/services`

### Usuarios
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/{id}`
- `DELETE /api/users/{id}`

### Postulaciones de barberos
- `GET /api/applications`
- `POST /api/applications`
- `POST /api/applications/{id}/approve`
- `POST /api/applications/{id}/reject`

### Productos
- `GET /api/products`
- `POST /api/products`
- `PATCH /api/products/{id}`
- `DELETE /api/products/{id}`

### Citas
- `GET /api/appointments`
- `POST /api/appointments`
- `POST /api/appointments/{id}/accept`
- `POST /api/appointments/{id}/cancel`
- `POST /api/appointments/{id}/complete`

### Conversaciones y mensajes
- `GET /api/conversations`
- `POST /api/conversations`
- `POST /api/conversations/{id}/messages`
- `POST /api/conversations/{id}/clear`
- `DELETE /api/conversations/{id}`

### Notificaciones
- `GET /api/notifications`
- `GET /api/notifications?user_id=...`
- `POST /api/notifications/read-all`

### Órdenes
- `GET /api/orders`
- `POST /api/orders/checkout`

## Qué soporta este backend

- alta y baja de usuarios
- aprobación y rechazo de postulaciones
- gestión de catálogo e inventario
- agenda de citas
- aceptación, cancelación y cierre de citas
- apertura de chat ligada a citas
- mensajes de texto, imágenes y voz vía payload
- limpieza y archivado de conversaciones
- notificaciones administrativas, de cliente y barbero
- checkout de tienda con rebaja de stock
- métricas de ingresos y operación

## Importante

Este backend ya deja la base sólida del sistema real.
El frontend entregado ya está preparado para consumir esta API automáticamente cuando esté activa.
