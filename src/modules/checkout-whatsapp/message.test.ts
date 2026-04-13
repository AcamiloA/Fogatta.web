import { describe, expect, it } from "vitest";

import { buildWhatsAppMessage } from "@/modules/checkout-whatsapp/message";

describe("checkout whatsapp message", () => {
  it("builds a payload with item breakdown and general total", () => {
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
    expect(output.mensaje).toContain("========== RESUMEN ==========");
    expect(output.mensaje).toContain("Item 1:");
    expect(output.mensaje).toContain("Valor unt:");
    expect(output.mensaje).toContain("Valor total:");
    expect(output.mensaje).toContain("TOTAL GENERAL:");
    expect(output.mensaje).toContain("Ana Perez");
    expect(decodeURIComponent(output.mensajeUrlEncoded)).toContain("Ambar Canela");
  });
});
