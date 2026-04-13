import { NextRequest } from "next/server";

import { isAdminRequestAuthenticated } from "@/modules/admin/session";

export function isInventoryRequestAuthenticated(request: NextRequest) {
  if (isAdminRequestAuthenticated(request)) {
    return true;
  }

  const expectedApiKey = process.env.INVENTORY_API_KEY?.trim();
  if (!expectedApiKey) {
    return false;
  }

  const providedApiKey = request.headers.get("x-inventory-key")?.trim();
  if (!providedApiKey) {
    return false;
  }

  return providedApiKey === expectedApiKey;
}
