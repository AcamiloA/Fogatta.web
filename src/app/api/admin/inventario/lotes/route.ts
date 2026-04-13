import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { createInventoryLotInputSchema } from "@/modules/inventory/admin-contracts";
import { isInventoryRequestAuthenticated } from "@/modules/inventory/auth";
import {
  InventoryAdminService,
  InventoryBaseProductNotFoundError,
  InventoryInvalidDateError,
  InventoryLotAssignmentsConflictError,
  InventoryLotNotFoundError,
} from "@/modules/inventory/admin-service";
import { listInventoryLotsResponseSchema } from "@/modules/inventory/contracts";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

function resolveBusinessError(error: unknown) {
  if (error instanceof InventoryBaseProductNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

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

export async function GET(request: NextRequest) {
  if (!isInventoryRequestAuthenticated(request)) {
    return unauthorized();
  }

  const service = new InventoryAdminService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const data = await service.listLots();
    return NextResponse.json(listInventoryLotsResponseSchema.parse({ data }), { status: 200 });
  } catch (error) {
    service.handleError(error, { route: "inventory_lots_list" });
    return NextResponse.json({ error: "No se pudo cargar lotes." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isInventoryRequestAuthenticated(request)) {
    return unauthorized();
  }

  const service = new InventoryAdminService();
  if (!service.isConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL no configurada." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const input = createInventoryLotInputSchema.parse(body);
    const created = await service.createLot(input);
    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Datos invalidos.", details: error.flatten() }, { status: 400 });
    }

    const businessError = resolveBusinessError(error);
    if (businessError) {
      return businessError;
    }

    service.handleError(error, { route: "inventory_lot_create" });
    return NextResponse.json({ error: "No se pudo crear el lote." }, { status: 500 });
  }
}
