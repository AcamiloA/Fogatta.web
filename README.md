# Fogatta Web MVP (Escalable)

Sitio comercial para Fogatta construido con Next.js + API interna modular, preparado para evolucionar a un sistema interno sin rehacer front ni contratos.

## Stack

- Next.js (App Router, TypeScript)
- Prisma + PostgreSQL
- Tailwind CSS v4
- Zod para contratos
- Vitest para pruebas de contratos y dominio

## Modulos

- `catalogo`: productos, categorias y variantes
- `checkout-whatsapp`: armado de pedido y trazabilidad
- `contenido`: contenido editorial y fallback local (con opcion headless CMS)
- `analytics`: eventos base de conversion
- `leads`: formulario de contacto

## Endpoints

- `GET /api/catalogo/productos`
- `GET /api/catalogo/productos/:slug`
- `POST /api/checkout/whatsapp-preview`
- `POST /api/leads/contacto`

## Variables de entorno

Copia `.env.example` a `.env` y ajusta:

```env
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_WHATSAPP_PHONE="573001234567"
NEXT_PUBLIC_GA_MEASUREMENT_ID="G-XXXXXXXXXX"
NEXT_PUBLIC_THEME_PRESET="warm"
HEADLESS_CMS_BASE_URL=""
HEADLESS_CMS_TOKEN=""
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="cambia-esto"
ADMIN_SESSION_SECRET="cambia-esto-por-un-secreto-largo"
```

## Desarrollo

```bash
npm install
npm run prisma:generate
npm run dev
```

Si tienes PostgreSQL listo:

```bash
npm run prisma:migrate
npm run prisma:seed
```

## Pruebas

```bash
npm run test
```

## Escalabilidad prevista

- Contratos API tipados y versionables
- Separacion por modulos de dominio
- Capa de persistencia desacoplada (Prisma/fallback)
- Lista para agregar `auth/roles`, `stock admin` y extraccion gradual de servicios en fases futuras

## Administracion de catalogo

- Login admin: `/admin/login`
- Panel de catalogo: `/admin`
- Credenciales por entorno:
  - `ADMIN_USERNAME`
  - `ADMIN_PASSWORD`
  - `ADMIN_SESSION_SECRET`

Con el panel puedes:
- Crear categorías
- Crear, editar y eliminar productos
- Subir imagenes de producto desde el panel (se guardan en `public/images/products`)
- Crear, editar y eliminar variantes (nombre, SKU, stock, delta de precio)
"# Fogatta.web" 
