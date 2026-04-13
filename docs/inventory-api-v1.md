# Inventory API v1 (Fogatta)

Base URL:
- Local: `http://localhost:3000`

Authentication:
- Header: `x-inventory-key: <INVENTORY_API_KEY>`
- Alternative: admin session cookie from web panel.

## Supplies

### List supplies
- `GET /api/admin/inventario/insumos`

### Create supply
- `POST /api/admin/inventario/insumos`

Body:
```json
{
  "nombre": "Cera de vaso",
  "unidad": "g",
  "precioTotal": 288900,
  "cantidadTotal": 20000,
  "activo": true
}
```

### Update supply
- `PATCH /api/admin/inventario/insumos/:id`

### Delete supply
- `DELETE /api/admin/inventario/insumos/:id`

## Base products + recipes

### List base products
- `GET /api/admin/inventario/productos-base`

### Create base product
- `POST /api/admin/inventario/productos-base`

Body:
```json
{
  "nombre": "Vela Lavanda",
  "categoria": "Tamano",
  "recipeItems": [
    {
      "supplyId": "<insumo-id>",
      "cantidadUsada": 180
    }
  ]
}
```

### Update base product
- `PATCH /api/admin/inventario/productos-base/:id`

### Delete base product
- `DELETE /api/admin/inventario/productos-base/:id`

## Lots (production)

### List lots
- `GET /api/admin/inventario/lotes`

### Create lot
- `POST /api/admin/inventario/lotes`

Body:
```json
{
  "baseProductId": "<producto-base-id>",
  "serial": "VELALAV-TAM-20260413",
  "fechaFabricacion": "2026-04-13",
  "fechaDisponible": "2026-04-28",
  "cantidadFabricada": 100,
  "stockActual": 100,
  "precioBrutoUnitario": 35000,
  "porcentajeUtilidad": 30,
  "precioVentaUnitario": 45500
}
```

### Update lot
- `PATCH /api/admin/inventario/lotes/:id`

### Delete lot
- `DELETE /api/admin/inventario/lotes/:id`

## Shelf assignments

### List assignments
- `GET /api/admin/inventario/asignaciones`

### Create assignment
- `POST /api/admin/inventario/asignaciones`

Body:
```json
{
  "lotId": "<lote-id>",
  "nombreEstanteria": "Est-01",
  "cantidadAsignada": 20
}
```

## Catalog sync (variants)

These endpoints now also accept `x-inventory-key` to enable mobile app sync.

### List catalog (products + variants)
- `GET /api/admin/catalogo`

### Update a variant (stock, price, discount)
- `PATCH /api/admin/variantes/:id`

Body example:
```json
{
  "stockVirtual": 120,
  "precio": 35000,
  "descuentoActivo": true,
  "descuentoPorcentaje": 15
}
```

## Sales reservations workflow

When a customer submits checkout to WhatsApp (`POST /api/checkout/whatsapp-preview`):
- The order is saved as `pending`.
- Variant reservations are saved in `StockReservation` with `pending` status.
- Public catalog stock uses **available stock** = `stockVirtual - pending reservations`.
- If a pending order is not modified for 24 hours (`updatedAt`), reservations are auto-released:
  - Reservation status changes to `expired`.
  - Order status changes to `expired`.
  - Available stock is restored automatically.

### List pending reservations/orders
- `GET /api/admin/reservas?estado=pending`

### Approve a reservation/order (consumes stock)
- `PATCH /api/admin/reservas/:id`

Body:
```json
{
  "action": "approve"
}
```

### Reject a reservation/order (releases reservation)
- `PATCH /api/admin/reservas/:id`

Body:
```json
{
  "action": "reject"
}
```
