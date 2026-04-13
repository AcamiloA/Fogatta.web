import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { createInventoryShelfAssignmentInputSchema } from "@/modules/inventory/admin-contracts";
import { isInventoryRequestAuthenticated } from "@/modules/inventory/auth";
import {
  InventoryAdminService,
  InventoryLotNotFoundError,
  InventoryStockInsufficientError,
} from "@/modules/inventory/admin-service";
import { listInventoryShelfAssignmentsResponseSchema } from "@/modules/inventory/contracts";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}

function resolveBusinessError(error: unknown) {
  if (error instanceof InventoryLotNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  if (error instanceof InventoryStockInsufficientError) {
    return NextResponse.json({ error: error.message, available: error.available }, { status: 409 });
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
    const data = await service.listShelfAssignments();
    return NextResponse.json(listInventoryShelfAssignmentsResponseSchema.parse({ data }), { status: 200 });
  } catch (error) {
    service.handleError(error, { route: "inventory_shelf_assignments_list" });
    return NextResponse.json({ error: "No se pudo cargar asignaciones." }, { status: 500 });
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
    const input = createInventoryShelfAssignmentInputSchema.parse(body);
    const created = await service.createShelfAssignment(input);
    return NextResponse.json({ ok: true, data: created }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Datos invalidos.", details: error.flatten() }, { status: 400 });
    }

    const businessError = resolveBusinessError(error);
    if (businessError) {
      return businessError;
    }

    service.handleError(error, { route: "inventory_shelf_assignment_create" });
    return NextResponse.json({ error: "No se pudo crear la asignacion." }, { status: 500 });
  }
}
