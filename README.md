# Barbados

Aplicación web de barbería + tienda + chat construida con **React 19**, **Vite**, **TypeScript**, **Tailwind CSS 4** y un backend en **PHP + MySQL**. Este README está escrito para explicar el proyecto desde la raíz: qué contiene cada carpeta, cómo fluye la información, qué hace cada rol, cómo se construye el bundle final en `dist` y cómo se usa el sistema como usuario, barbero y administrador.

---

## Índice

1. Visión general
2. Estructura del proyecto
3. Qué contiene la carpeta raíz
4. Qué contiene `src`
5. Cómo funciona `dist`
6. Arquitectura general del sistema
7. Roles y permisos
8. Flujo de datos entre frontend y backend
9. API PHP
10. Base de datos
11. Guía de uso
12. Build y despliegue
13. Notas importantes

---

## Visión general

Barbados es una plataforma que mezcla tres experiencias en una sola interfaz:

- **Barbería**: catálogo de cortes y servicios, citas, panel de barbero y panel de administración.
- **Tienda**: productos de barbería, comida y bebidas, con carrito para clientes.
- **Chat**: mensajería entre usuario, barbero y administrador, con notificaciones y sincronización en tiempo real.

La aplicación está pensada como un sistema de operación interna y al mismo tiempo como una web pública de reserva y contacto. El frontend vive en React y consume un backend PHP por medio de `fetch`. La persistencia está en MySQL.

---

## Estructura del proyecto

La estructura real del workspace es esta:

```text
api.php
backend-example.php
database.sql
index.html
package.json
test_connection.php
tsconfig.json
vite.config.ts
public/
src/
  App.tsx
  index.css
  main.tsx
  components/
    Card.tsx
    Navbar.tsx
  context/
    AuthContext.tsx
    CartContext.tsx
    ThemeContext.tsx
  hooks/
    useAutoRefresh.ts
    useRealtimeUserEvents.ts
  pages/
    AdminPanel.tsx
    Appointments.tsx
    BarberPanel.tsx
    Cart.tsx
    Chat.tsx
    ClientPanel.tsx
    Home.tsx
    Login.tsx
    Profile.tsx
    Register.tsx
    Store.tsx
  services/
    api.ts
  utils/
    cn.ts
dist/
  index.html
  hero-bg.jpg
  hero-video.mp4
  logitobarbados.png
  logo-bar4beards.svg
  logo-barbados.svg
```

Nota: `dist` es salida generada por el build. No es la fuente original, sino el resultado compilado y empaquetado.

---

## Qué contiene la carpeta raíz

### `api.php`

Es el backend principal real. Expone una API JSON para autenticación, usuarios, productos, citas, reseñas, chat, notificaciones, archivos y SSE para tiempo real.

También tiene una característica importante: **autoajusta el esquema** con `ensure_schema()`. Eso significa que, si faltan columnas o tablas, el script intenta crearlas o actualizarlas al arrancar.

### `backend-example.php`

Es un ejemplo mínimo de backend. Sirve como referencia didáctica, no como implementación completa. Solo muestra rutas básicas de usuarios, barberos y administradores.

### `database.sql`

Es un script SQL de referencia para crear tablas iniciales en MySQL / phpMyAdmin. Tiene una versión más simple del esquema, útil para montar la base desde cero o entender la estructura de datos.

### `test_connection.php`

Script de prueba para verificar conexión a la base de datos MySQL.

### `index.html`

Es la página raíz del proyecto en desarrollo. Vite monta la app React dentro del nodo `#root`.

### `package.json`

Define dependencias, scripts y herramientas del proyecto.

### `tsconfig.json`

Configuración de TypeScript.

### `vite.config.ts`

Configuración de Vite y del proceso de build.

### `public/`

Carpeta de assets públicos servidos tal cual por Vite en desarrollo.

---

## Qué contiene `src`

La carpeta `src` es el código fuente del frontend React.

### Entrada principal

- `main.tsx`: arranca React y renderiza `<App />` dentro del root del DOM.
- `App.tsx`: define la composición global: providers, router, navbar y rutas.
- `index.css`: contiene la identidad visual, tokens de color, temas, botones, tarjetas, hero y animaciones.

### Componentes

- `context/ThemeContext.tsx`: gestiona modo claro / oscuro y persistencia en `localStorage`.

### Hooks

- `hooks/useAutoRefresh.ts`: ejecuta recargas periódicas y también refresca al volver a enfocar la pestaña.
- `hooks/useRealtimeUserEvents.ts`: abre una conexión SSE al backend para escuchar cambios de sincronización del usuario.

- `services/api.ts`: cliente central para llamar la API PHP. Aquí están todos los métodos de red y los tipos TypeScript del dominio.

### Páginas

- `pages/Home.tsx`: landing page pública con hero, servicios destacados, testimonios, CTA de registro y footer.
- `pages/Login.tsx`: login de usuario.
- `pages/Register.tsx`: registro de usuario o postulación inicial como barbero.
- `pages/Store.tsx`: tienda por categorías con productos visibles y botón de carrito.
- `pages/Appointments.tsx`: agenda de citas, listado de citas, confirmación y calificación.
- `pages/Cart.tsx`: carrito de compras.
- `pages/AdminPanel.tsx`: panel maestro del administrador.
- `pages/Chat.tsx`: mensajería entre roles.
- `pages/ClientPanel.tsx`: archivo presente en el workspace, aunque la navegación principal actual se concentra en las pantallas anteriores.

### Utilidades

- `utils/cn.ts`: helper para concatenar clases CSS.

---

## Qué hace cada archivo clave

### `src/main.tsx`

Es la puerta de entrada del frontend. Importa `index.css`, crea el root React y monta la aplicación en modo `StrictMode`.

### `src/App.tsx`

Ordena toda la aplicación:

- `ThemeProvider` envuelve primero para que el tema exista en toda la UI.
- `AuthProvider` encima del router para que la sesión esté disponible globalmente.
- `CartProvider` para que el carrito exista en toda la tienda y en la navbar.
- `BrowserRouter` para navegación de SPA.
- `Navbar` arriba.
- `Routes` con todas las pantallas.

El orden de los providers es importante porque la navbar depende de sesión, tema y carrito.

### `src/index.css`

Define la identidad visual completa:

- Variables CSS para color, superficie, tarjeta, acento y sombras.
- Tema oscuro por defecto y tema claro mediante `[data-theme="light"]`.
- Fondo con gradientes radiales.
- Tipografías de display y cuerpo.
- Clases reutilizables como `.glass-card`, `.accent-btn`, `.nav-btn`, `.nav-icon-btn`, `.form-input`, `.hero-stage` y `.card-3d`.
- Animaciones como `fade-in-up` y `floaty`.

La app no depende de un theme UI externo: el estilo está completamente controlado por estas variables y clases.

---

## Cómo funciona `dist`

La carpeta `dist` es el resultado del build de Vite. En este proyecto contiene:

- `dist/index.html`: el HTML final ya empaquetado. Incluye el bundle JS inline porque el proyecto usa `vite-plugin-singlefile`.
- `dist/hero-video.mp4`: video usado en el hero.
- `dist/hero-bg.jpg`: fondo estático alternativo o complementario.
- `dist/logo-barbados.svg`: logo vectorial.
- `dist/logo-bar4beards.svg`: otro logo SVG del proyecto.
- `dist/logitobarbados.png`: logo PNG principal.

### Qué significa que el bundle esté “inline”

El archivo `dist/index.html` contiene el JavaScript compilado dentro del mismo HTML. Eso reduce el número de peticiones y hace el despliegue más simple, porque puedes servir prácticamente un solo archivo HTML junto con los assets estáticos.

### Qué no debes hacer con `dist`

- No editarlo como fuente principal.
- No tomar `dist` como arquitectura original.
- No corregir bugs directamente ahí; los cambios deben hacerse en `src` o en el backend PHP.

---

## Arquitectura general del sistema

La aplicación tiene tres capas principales:

### 1. Presentación

React + Vite + Tailwind + CSS custom.

Aquí viven las páginas, la navegación, el estado de sesión, el carrito y el tema.

### 2. Comunicación

`src/services/api.ts` encapsula todos los requests a `api.php`.

Esto evita que cada página tenga que construir URLs, parsear errores o repetir `fetch`.

### 3. Persistencia y reglas de negocio

`api.php` conecta con MySQL, valida roles, crea registros, sube imágenes, emite notificaciones y devuelve datos normalizados para el frontend.

---

## Roles y permisos

### Cliente (`user`)

Puede:

- Navegar por Home, Store, Appointments, Profile y Chat.
- Agregar productos al carrito.
- Agendar citas.
- Ver sus propias citas.
- Calificar citas completadas.
- Editar su perfil.
- Postularse a barbero desde Profile.
- Chatear con barbero y, en ciertos flujos, con admin según el backend.

No puede:

- Entrar al panel de admin.
- Entrar al panel de barbero.
- Comprar si es admin o barbero.

### Barbero (`barber`)

Puede:

- Acceder al panel de barbero si su cuenta está aprobada.
- Ver citas asignadas.
- Registrar actividad o ventas mediante logs.
- Ver clientes registrados para chat.
- Chatear con clientes y admin.
- Editar su avatar.

No puede:

- Comprar productos como cliente.
- Acceder al panel de admin.
- Agendar citas como cliente.

### Administrador (`admin`)

Puede:

- Ver y gestionar usuarios.
- Aprobar o rechazar barberos.
- Crear o editar productos de tienda.
- Crear o editar cortes/servicios.
- Ocultar o mostrar ítems.
- Subir imágenes de servicio.
- Ver logs de barberos.
- Ver postulaciones de barbero.
- Chatear con clientes y barberos.
- Gestionar reseñas y aprobaciones desde la lógica backend.

### Regla de aprobación de barberos

Un usuario puede registrarse como barbero, pero el sistema lo trata como pendiente de aprobación. Hasta que un admin lo apruebe:

- no puede iniciar sesión como barbero activo,
- no aparece como barbero válido en citas,
- el panel de barbero puede bloquear su acceso.

---

## Flujo de datos entre frontend y backend

### Sesión

1. El usuario inicia sesión desde `Login.tsx`.
2. `api.login()` llama a `api.php?action=login`.
3. El backend devuelve un usuario normalizado sin contraseña.
4. `AuthContext` guarda ese usuario en estado y en `localStorage`.
5. `Navbar` y el resto de páginas leen ese estado desde `useAuth()`.

### Tema

1. `ThemeProvider` lee `app_theme` desde `localStorage`.
2. Lo aplica como atributo `data-theme` en `document.documentElement`.
3. `index.css` cambia variables según `dark` o `light`.

### Carrito

1. `Store.tsx` llama `addToCart(product)`.
2. `CartContext` agrega o incrementa cantidad.
3. `Navbar` calcula el número total de ítems.
4. `Cart.tsx` muestra el resumen y el total.

### Tiempo real

1. `useRealtimeUserEvents()` abre `EventSource` contra `api.php?action=realtime`.
2. El backend emite eventos `sync` y `heartbeat`.
3. El frontend refresca contadores, contactos, mensajes o sesión según el evento.

### Auto refresh

1. `useAutoRefresh()` ejecuta una función al montar.
2. Repite la ejecución cada cierto intervalo.
3. También refresca cuando la pestaña recupera foco o visibilidad.

---

## API PHP

El backend está centralizado en `api.php`. Responde en JSON y también sirve SSE para real-time.

### Características globales

- CORS abierto con `Access-Control-Allow-Origin: *`.
- Soporta `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`.
- Conecta con MySQL usando PDO.
- Si faltan tablas o columnas, intenta crearlas con `ensure_schema()`.

### Endpoints principales

#### Autenticación

- `POST ?action=register`
- `POST ?action=login`
- `POST ?action=create-admin`
- `POST ?action=create-barber`
- `POST ?action=create-first-admin`

#### Usuarios

- `GET ?action=users`
- `PUT ?action=users&id=...`
- `DELETE ?action=users&id=...`
- `PUT ?action=user-role&id=...`

#### Subidas de archivo

- `POST ?action=upload-avatar`
- `POST ?action=upload-service-image`
- `POST ?action=upload-chat-media`

#### Productos

- `GET ?action=products`
- `POST ?action=products`
- `PUT ?action=products&id=...`
- `DELETE ?action=products&id=...`

#### Logs de barbero

- `GET ?action=logs`
- `POST ?action=logs`

#### Citas

- `POST ?action=appointments`
- `GET ?action=appointments&userId=...`
- `PUT ?action=appointments&id=...`
- `DELETE ?action=appointments&id=...`

#### Reseñas

- `POST ?action=appointment-reviews`
- `GET ?action=appointment-reviews`
- `PUT ?action=appointment-reviews&id=...`
- `DELETE ?action=appointment-reviews&id=...`

#### Chat

- `GET ?action=chat-contacts&userId=...`
- `POST ?action=conversations`
- `DELETE ?action=conversations&id=...`
- `GET ?action=messages&conversationId=...&userId=...`
- `POST ?action=messages`
- `POST ?action=toggle_client_messaging`

#### Notificaciones

- `GET ?action=notifications&userId=...`
- `PUT ?action=notifications&userId=...`
- `POST ?action=send_notification`

#### Tiempo real

- `GET ?action=realtime&userId=...`

### Reglas importantes del backend

- Solo `user` puede agendar citas.
- Solo el barbero asignado o un admin puede cambiar el estado de una cita.
- Solo el dueño, el barbero asignado o el admin pueden borrar una cita.
- Solo clientes pueden calificar citas completadas.
- Solo admins pueden aprobar o rechazar reseñas.
- Solo admins pueden crear otros admins o barberos desde el endpoint dedicado.
- Las imágenes tienen límites de tamaño y validación MIME.

---

## Base de datos

`database.sql` describe un esquema inicial. `api.php` después amplía y corrige tablas para soportar todo el sistema.

### Tablas principales

- `users`: usuarios, rol, teléfono, avatar, aprobación de barbero.
- `products`: catálogo de tienda y servicios.
- `appointments`: citas entre cliente, barbero y servicio.
- `orders`: pedidos de tienda.
- `barber_logs`: actividad registrada por barberos.
- `conversations`: conversaciones de chat.
- `conversation_participants`: participantes por conversación.
- `media_files`: archivos subidos para chat.
- `messages`: mensajes de texto o imagen.
- `message_reads`: control de lectura de mensajes.
- `notifications`: notificaciones por chat, citas y sistema.
- `appointment_reviews`: reseñas de citas.
- `barber_applications`: postulaciones a barbero.

### Diferencia entre `database.sql` y `api.php`

`database.sql` es una base inicial simplificada. `api.php` ya contempla un esquema más rico y puede crear o ajustar tablas para que el frontend funcione completo.

---

## Guía de uso

### 1. Abrir la app

En desarrollo, el frontend se monta con Vite y el backend debe estar accesible en `api.php`.

### 2. Registrarse

Desde `Register.tsx` puedes crear:

- una cuenta de cliente,
- una cuenta con intención de barbero.

Si eliges barbero, la cuenta entra en estado pendiente hasta que el administrador la apruebe.

### 3. Iniciar sesión

Desde `Login.tsx`:

- el sistema valida credenciales contra la API,
- guarda la sesión en `localStorage`,
- redirige según el rol:
  - admin → `/admin`
  - barber → `/barber`
  - user → `/`

### 4. Navegar como cliente

Como cliente puedes:

- ver la landing,
- abrir la tienda,
- agregar productos al carrito,
- revisar el carrito,
- agendar citas,
- revisar tus citas,
- calificar citas completadas,
- editar perfil,
- abrir chat.

### 5. Usar la tienda

En `Store.tsx`:

- cambias entre `Barberia`, `Comida` y `Bebidas`,
- ves solo productos visibles,
- un cliente puede agregarlos al carrito,
- admin y barbero solo ven el botón deshabilitado para compra.

### 6. Agendar cita

En `Appointments.tsx`:

- el cliente elige servicio,
- elige barbero aprobado,
- define fecha y hora,
- añade notas,
- la cita queda registrada como `pending`.

Cuando el cliente agenda, el backend además crea una conversación con el barbero si no existía y manda un mensaje inicial automático.

### 7. Calificar una cita

Cuando una cita se marca como `completed`, el cliente puede calificarla con estrellas y comentario. Esa reseña luego puede publicarse desde admin.

### 8. Editar perfil y postularse a barbero

En `Profile.tsx` puedes:

- cambiar nombre,
- cambiar teléfono,
- subir avatar,
- quitar avatar,
- enviar o actualizar postulación a barbero con experiencia, especialidades, disponibilidad y motivación.

### 9. Usar el panel de barbero

En `BarberPanel.tsx` el barbero puede:

- registrar un servicio vendido o realizado,
- ver su actividad reciente,
- ver total generado hoy,
- abrir chat con clientes,
- revisar citas asignadas,
- administrar su foto.

### 10. Usar el panel de administrador

En `AdminPanel.tsx` el admin puede:

- ver usuarios y roles,
- aprobar barberos,
- crear/editar/eliminar productos,
- crear/editar/eliminar cortes,
- ocultar o mostrar elementos,
- subir imágenes,
- ver postulaciones pendientes,
- ver logs de barbero,
- abrir chats con barberos y clientes.

### 11. Usar el chat

En `Chat.tsx`:

- se cargan contactos según el rol,
- se abre o crea conversación automáticamente,
- se muestran mensajes en orden,
- puedes enviar texto o imágenes,
- puedes limpiar la conversación.

---

## Qué hace cada página

### `Home.tsx`

Es la vitrina pública.

- Hero con video de fondo.
- Servicios destacados.
- Sección de razones para elegir Barbados.
- Testimonios publicados.
- CTA para unirse como barbero.
- Footer con contacto y horario.

También refresca los datos destacados y testimonios de forma periódica y con eventos en tiempo real.

### `Login.tsx`

Formulario de autenticación. Envía email y contraseña a la API, guarda sesión y redirige por rol.

### `Register.tsx`

Formulario de registro. Permite crear cliente o barbero. Si es barbero, la cuenta queda pendiente de aprobación.

### `Store.tsx`

Lista productos por categoría. Usa el carrito global.

### `Appointments.tsx`

Panel de citas. Maneja selección de servicio, barbero, fecha, notas, listado de citas y reseñas.

### `Cart.tsx`

Resumen de ítems agregados, totales y eliminación por producto.

### `Profile.tsx`

Edición de perfil y postulación a barbero para usuarios normales.

### `BarberPanel.tsx`

Panel operativo del barbero: logs, clientes, citas y foto.

### `AdminPanel.tsx`

Panel maestro con pestañas de usuarios, catálogo, cortes, chat y logs.

### `Chat.tsx`

Sistema de mensajería por conversación con soporte de imágenes.

---

## Cómo se ve el frontend por dentro

### Navbar

La barra superior se adapta según sesión:

- sin usuario: muestra login,
- con usuario: muestra chat, perfil y logout,
- con admin: muestra acceso a admin,
- con barbero aprobado: muestra acceso a barber,
- con cliente: muestra carrito.

Además:

- muestra contador de mensajes no leídos,
- muestra contador del carrito,
- permite cambiar tema claro/oscuro,
- en móvil despliega menú compacto.

### Tarjetas

`Card.tsx` hace que las tarjetas tengan una sensación 3D leve al mover el mouse. Se usa para destacar servicios y productos.

### Estilo visual

La UI está construida con:

- fondos oscuros y gradientes,
- superficies tipo glassmorphism,
- acento dorado / ámbar,
- tipografía de display más fuerte para títulos,
- CTA muy visibles.

---

## Build y despliegue

### Scripts disponibles

Desde `package.json`:

- `npm run dev`: arranca Vite en modo desarrollo.
- `npm run build`: genera la salida de producción.
- `npm run preview`: sirve el build para probarlo localmente.

### Qué hace el build

Vite compila el TypeScript, empaqueta React, procesa CSS y copia assets. Con `vite-plugin-singlefile`, gran parte del bundle termina embebido en el HTML final.

### Despliegue típico

1. Construir el frontend.
2. Publicar `dist/` en un hosting estático o servidor web.
3. Asegurar que `api.php` esté accesible en el mismo dominio o por la URL configurada en `VITE_API_URL`.
4. Verificar que MySQL tenga la base `barber_shop`.
5. Confirmar permisos de escritura para `uploads/avatars`, `uploads/services` y `uploads/chat`.

---

## Notas importantes

- El frontend no tiene backend mock: depende de la API real.
- `api.ts` define el contrato de tipos entre frontend y backend.
- Los archivos subidos se sirven desde rutas públicas tipo `/uploads/...`.
- Hay refresco automático y SSE, así que la experiencia depende de que PHP mantenga la conexión y el hosting permita streaming.
- `database.sql` y `api.php` no son idénticos; el backend real es la referencia final.
- `dist` es salida compilada, no fuente.

---

## Resumen corto del sistema

- `src` contiene la app React.
- `api.php` contiene la lógica de negocio y persistencia.
- `database.sql` define la base inicial.
- `dist` contiene el build final generado.

Barbados combina landing pública, tienda, agenda, chat, panel de barbero y panel de admin en un solo sistema basado en roles.#   b a r b a d o s 
 
 