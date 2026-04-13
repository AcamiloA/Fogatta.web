# Fogatta Web MVP (Escalable)

Sitio comercial para Fogatta construido con Next.js + API interna modular.
Incluye un CMS interno (panel admin) para que contenido y catalogo se gestionen sin tocar codigo.

## Stack

- Next.js (App Router, TypeScript)
- Prisma + PostgreSQL
- Tailwind CSS v4
- Zod para contratos
- Vitest para pruebas

## Modulos

- `catalogo`: categorias, productos y variantes
- `checkout-whatsapp`: carrito y mensaje de pedido
- `contenido`: hero, nosotros, FAQ, legales y blog
- `analytics`: eventos base de conversion
- `leads`: formulario de contacto y notificaciones
- `admin`: autenticacion y panel de gestion

## Endpoints publicos

- `GET /api/catalogo/productos`
- `GET /api/catalogo/productos/:slug`
- `POST /api/checkout/whatsapp-preview`
- `POST /api/leads/contacto`
- `GET|POST /api/blog/:slug/comentarios`

### Moderacion de comentarios

- Todo comentario nuevo entra como `pending`.
- En el sitio publico solo se muestran comentarios `approved`.
- Moderacion en panel admin: `Contenido -> Moderacion de comentarios`.
- Acciones disponibles: aprobar, rechazar, eliminar.

## Endpoints admin principales

- `GET|PATCH /api/admin/contenido`
- `GET|POST /api/admin/faq`
- `PATCH|DELETE /api/admin/faq/:id`
- `GET|PATCH /api/admin/legal/:tipo`
- `GET|POST /api/admin/blog`
- `PATCH|DELETE /api/admin/blog/:id`
- `GET /api/admin/catalogo`
- `GET|POST /api/admin/inventario/insumos`
- `PATCH|DELETE /api/admin/inventario/insumos/:id`
- `GET|POST /api/admin/inventario/productos-base`
- `PATCH|DELETE /api/admin/inventario/productos-base/:id`
- `GET|POST /api/admin/inventario/lotes`
- `PATCH|DELETE /api/admin/inventario/lotes/:id`
- `GET|POST /api/admin/inventario/asignaciones`

## Variables de entorno

Copia `.env.example` a `.env.local` y ajusta:

```env
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_WHATSAPP_PHONE="573001234567"
NEXT_PUBLIC_SITE_URL="https://fogatta.co"
NEXT_PUBLIC_GA_MEASUREMENT_ID="G-XXXXXXXXXX"
NEXT_PUBLIC_THEME_PRESET="warm"
HEADLESS_CMS_BASE_URL=""
HEADLESS_CMS_TOKEN=""
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="cambia-esto"
ADMIN_2FA_SECRET=""
EDITOR_USERNAME="editor"
EDITOR_PASSWORD="cambia-esto-tambien"
EDITOR_2FA_SECRET=""
ADMIN_SESSION_SECRET="cambia-esto-por-un-secreto-largo"
LEADS_NOTIFICATION_TO="ventas@fogatta.com"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="tu_correo@gmail.com"
SMTP_PASS="app_password_de_gmail"
SMTP_FROM="Fogatta <tu_correo@gmail.com>"
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
COMMENTS_NOTIFICATION_TO="fogatta.support@fogatta.co"
STOCK_ALERT_NOTIFICATION_TO="fogatta.support@gmail.com"
INVENTORY_API_KEY=""
STORAGE_DRIVER="local"
S3_REGION=""
S3_BUCKET=""
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
S3_PUBLIC_BASE_URL=""
```

## Desarrollo

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

## 2FA (TOTP)

- Genera secretos para `admin` y `editor` con:

```bash
npm run 2fa:generate
```

- Guarda `ADMIN_2FA_SECRET` y `EDITOR_2FA_SECRET` en variables de entorno.
- Escanea cada `otpauth=` en Google Authenticator, Authy, 1Password u otra app compatible TOTP.

## Panel interno (CMS)

- Login: `/admin/login`
- Login requiere 2FA (codigo TOTP de 6 digitos) para `admin` y `editor`.
- Rol `editor`: gestiona hero, nosotros, FAQ, legales, blog, productos y stock.
- Rol `admin`: todo lo anterior + pagina de configuracion.
- Ambos roles pueden moderar comentarios del blog.

## Produccion (resumen)

- Las credenciales y claves **NO** van en el codigo ni en git.
- Configuralas solo en variables de entorno del hosting (Vercel, Railway, etc.).
- En produccion usa credenciales no obvias, `ADMIN_SESSION_SECRET` fuerte (>=32 chars) y secretos `ADMIN_2FA_SECRET`/`EDITOR_2FA_SECRET` validos.
- Para rate-limit distribuido (recomendado en prod), configura `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`.
- En produccion serverless usa `STORAGE_DRIVER="s3"` para persistir imagenes.
- Para comentarios del blog, configura `SMTP_*` + `COMMENTS_NOTIFICATION_TO`.
- Para alertas de stock bajo, configura `SMTP_*` + `STOCK_ALERT_NOTIFICATION_TO`.
- Para integracion movil de inventario, configura `INVENTORY_API_KEY` y envialo como header `x-inventory-key`.
- Despues de desplegar, ejecuta migraciones Prisma en produccion.

### Convencion de archivos `.env`

- `/.env.local`: archivo real de trabajo local (secreto, no se versiona).
- `/.env.example`: plantilla sin secretos para referencia.
- No usamos `/.env` para evitar confusion entre entornos.
- Prisma carga variables desde `prisma.config.ts` (prioriza `.env.local`).

## Pruebas

```bash
npm run lint
npm run test
npm run build
```
