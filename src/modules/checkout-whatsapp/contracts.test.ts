import { describe, expect, it } from "vitest";

import { whatsappPreviewInputSchema } from "@/modules/checkout-whatsapp/contracts";

describe("checkout contracts", () => {
  it("rejects payloads without items", () => {
    const result = whatsappPreviewInputSchema.safeParse({
      clienteNombre: "Juan",
      clienteCiudad: "Bogota",
      telefono: "3001234567",
      items: [],
    });

    expect(result.success).toBe(false);
  });

  it("accepts a valid checkout payload", () => {
    const result = whatsappPreviewInputSchema.safeParse({
      clienteNombre: "Juan",
      clienteCiudad: "Bogota",
      telefono: "3001234567",
      items: [
        {
          nombreProducto: "Coco Sandalo",
          precioUnitario: 70000,
          cantidad: 1,
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});
