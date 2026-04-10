import { describe, expect, it } from "vitest";

import { buildWhatsAppMessage } from "@/modules/checkout-whatsapp/message";

describe("checkout whatsapp message", () => {
  it("builds a payload with encoded text and subtotal", () => {
    const output = buildWhatsAppMessage({
      clienteNombre: "Ana Perez",
      clienteCiudad: "Bogota",
      telefono: "3001234567",
      items: [
        {
          nombreProducto: "Ambar Canela",
          nombreVariante: "220g",
          precioUnitario: 68000,
          cantidad: 2,
        },
      ],
    });

    expect(output.subtotalReferencia).toBe(136000);
    expect(output.mensaje).toContain("Ana Perez");
    expect(decodeURIComponent(output.mensajeUrlEncoded)).toContain("Ambar Canela");
  });
});
