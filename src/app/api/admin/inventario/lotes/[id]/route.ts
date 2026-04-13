import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { updateInventoryLotInputSchema } from "@/modules/inventory/admin-contracts";
import { isInventoryRequestAuthenticated } from "@/modules/inventory/auth";
import {
  InventoryAdminService,
  InventoryInvalidDateError,
  InventoryLotAssignmentsConflictError,
  InventoryLotNotFoundError,
} from "@/modules/inventory/admin-service";

type Params = {
  params: Promise<{ id: string }>;
};

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

function resolveBusinessError(error: unknown) {
  if (error instanceof InventoryLotNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  if (error instanceof InventoryInvalidDateError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (error instanceof InventoryLotAssignmentsConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  if (error instanceof Error && error.message.includes("stock")) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return null;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!isInventoryRequestAuthenticated(request)) {
    return unauthorized();
  }

  const service = new InventoryAdminService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateInventoryLotInputSchema.parse({ ...body, id });

    const { id: lotId, ...updateData } = parsed;
    const updated = await service.updateLot(lotId, updateData);

    return NextResponse.json({ ok: true, data: updated }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Datos invalidos.", details: error.flatten() }, { status: 400 });
    }

    const businessError = resolveBusinessError(error);
    if (businessError) {
      return businessError;
    }

    service.handleError(error, { route: "inventory_lot_update" });
    return NextResponse.json({ error: "No se pudo actualizar el lote." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!isInventoryRequestAuthenticated(request)) {
    return unauthorized();
  }

  const service = new InventoryAdminService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const { id } = await params;
    await service.deleteLot(id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const businessError = resolveBusinessError(error);
    if (businessError) {
      return businessError;
    }

    service.handleError(error, { route: "inventory_lot_delete" });
    return NextResponse.json({ error: "No se pudo eliminar el lote." }, { status: 500 });
  }
}
