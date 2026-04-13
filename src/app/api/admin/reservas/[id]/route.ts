import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  orderDecisionInputSchema,
  orderDecisionResponseSchema,
} from "@/modules/checkout-whatsapp/admin-contracts";
import {
  CheckoutReservationAdminService,
  ReservationOrderInvalidStateError,
  ReservationOrderNotFoundError,
  ReservationOrderStockConflictError,
} from "@/modules/checkout-whatsapp/admin-service";
import { isInventoryRequestAuthenticated } from "@/modules/inventory/auth";

type Params = {
  params: Promise<{ id: string }>;
};

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!isInventoryRequestAuthenticated(request)) {
    return unauthorized();
  }

  const service = new CheckoutReservationAdminService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = orderDecisionInputSchema.parse(body);
    const data = await service.decideOrder(id, parsed.action);
    return NextResponse.json(orderDecisionResponseSchema.parse({ ok: true, data }), { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Datos invalidos.", details: error.flatten() }, { status: 400 });
    }
    if (error instanceof ReservationOrderNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof ReservationOrderInvalidStateError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof ReservationOrderStockConflictError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: 409 });
    }

    service.handleError(error, { route: "admin_reservation_decide" });
    return NextResponse.json({ error: "No se pudo actualizar la reserva." }, { status: 500 });
  }
}
