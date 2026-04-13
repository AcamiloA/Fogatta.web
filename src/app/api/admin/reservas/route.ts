import { NextRequest, NextResponse } from "next/server";

import { isInventoryRequestAuthenticated } from "@/modules/inventory/auth";
import { reservationOrderListResponseSchema } from "@/modules/checkout-whatsapp/admin-contracts";
import { CheckoutReservationAdminService } from "@/modules/checkout-whatsapp/admin-service";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!isInventoryRequestAuthenticated(request)) {
    return unauthorized();
  }

  const service = new CheckoutReservationAdminService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const estado = request.nextUrl.searchParams.get("estado") ?? "pending";
    const data = await service.listOrders(estado);
    return NextResponse.json(reservationOrderListResponseSchema.parse({ data }), { status: 200 });
  } catch (error) {
    service.handleError(error, { route: "admin_reservations_list" });
    return NextResponse.json({ error: "No se pudo cargar reservas." }, { status: 500 });
  }
}
