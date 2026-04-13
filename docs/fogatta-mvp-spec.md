# Fogatta MVP Spec (Escalable)

## Objetivo
- Web comercial para Colombia (espanol), foco en ventas por carrito a WhatsApp.
- Arquitectura escalable: monolito modular con contratos API para evolucionar sin reescritura.

## Alcance Implementado
- Secciones publicas: Inicio, Catalogo, Producto, Nosotros, FAQ, Blog, Contacto, Legal.
- Comentarios en blog sin login (caja de comentarios, emojis, contador de caracteres, notificacion por correo y moderacion).
- Endpoints publicos:
  - `GET /api/catalogo/productos`
  - `GET /api/catalogo/productos/{slug}`
  - `POST /api/checkout/whatsapp-preview`
  - `POST /api/leads/contacto`
- `GET|POST /api/blog/{slug}/comentarios`
- Endpoints admin para CMS interno:
  - `GET|PATCH /api/admin/contenido`
  - `GET|POST /api/admin/faq`
  - `PATCH|DELETE /api/admin/faq/{id}`
  - `GET|PATCH /api/admin/legal/{tipo}`
  - CRUD blog + catalogo existentes

## Modelo de Datos (PostgreSQL/Prisma)
- `Category`
- `Product`
- `Variant`
- `WhatsappOrder`
- `WhatsappOrderItem`
- `ContactLead`
- `BlogPost`
- `BlogComment`
- `FaqItem`
- `LegalDocument`
- `SiteContent`

## CMS Interno y Roles
- Login unico en `/admin/login`.
- `editor`: gestiona hero, nosotros, FAQ, legales, blog, productos y variantes.
- `admin`: acceso completo + configuracion.
- Moderacion de comentarios integrada en panel de contenido (aprobar/rechazar/eliminar).
- Soporte para credenciales separadas por entorno (`ADMIN_*`, `EDITOR_*`).
- Variables de produccion preparadas para notificaciones de comentarios y almacenamiento S3 opcional.

## Estado de Catalogo
- Seed mantiene categorias y contenido base.
- Productos pueden cargarse desde el panel admin (sin datos demo obligatorios).

## Identidad Visual
- Paleta alineada con marca Fogatta (referencia Instagram):
  - Azul noche profundo para fondos.
  - Crema/beige para superficies.
  - Acentos ambar/cobre para CTAs y detalles.

## Escalabilidad
- Front consume contratos API internos para desacoplar UI y dominio.
- Capa de repositorio permite fallback y futura extraccion de modulos.
- Base lista para fase 2: pasarela de pago, auth avanzada y admin operativo ampliado.
