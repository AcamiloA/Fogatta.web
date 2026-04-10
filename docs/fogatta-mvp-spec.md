# Fogatta MVP Spec (Escalable)

## Objetivo
- Web comercial para Colombia (espanol), foco en ventas por carrito a WhatsApp.
- Arquitectura escalable: monolito modular con contratos API para evolucionar a servicios.

## Alcance Implementado
- Secciones publicas: Inicio, Catálogo, Producto, Nosotros, FAQ, Blog, Contacto, Legal.
- Endpoints:
  - `GET /api/catalogo/productos`
  - `GET /api/catalogo/productos/{slug}`
  - `POST /api/checkout/whatsapp-preview`
  - `POST /api/leads/contacto`
- Modulos:
  - `catalog`
  - `checkout-whatsapp`
  - `content`
  - `analytics`
- SEO base: metadata, `sitemap.xml`, `robots.txt`.

## Modelo de Datos (PostgreSQL/Prisma)
- `Category`
- `Product`
- `Variant`
- `WhatsappOrder`
- `WhatsappOrderItem`
- `ContactLead`

## Estado de Catálogo
- Incluye fallback local con productos demo y variantes para pruebas end-to-end.
- Seed de Prisma crea categorias, productos y variantes iniciales en PostgreSQL.

## Identidad Visual
- Paleta alineada con marca Fogatta (referencia Instagram):
  - Azul noche profundo para fondos.
  - Crema/beige para superficies de lectura.
  - Acentos ambar/cobre para CTAs y detalles.

## Escalabilidad
- Front consume contratos API internos para desacoplar UI y dominio.
- Capa de repositorio permite fallback y futura extraccion de modulos.
- Fase siguiente sugerida: auth/roles + admin de stock sin romper contratos actuales.

## Costos de Referencia (Aprobados)
- Dominio `.com`: USD 12-20/anio.
- Hosting frontend: USD 0-25/mes.
- Base de datos administrada: USD 0-30/mes.
- CMS headless: USD 0-49/mes.
- Correo corporativo (1-3 cuentas): USD 6-12 por cuenta/mes.
- Mantenimiento tecnico: USD 80-250/mes.
- Pasarela (fase 2): integracion USD 200-600 + comision transaccional.
