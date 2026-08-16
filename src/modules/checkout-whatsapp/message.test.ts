import { describe, expect, it } from "vitest";

import { buildWhatsAppMessage } from "@/modules/checkout-whatsapp/message";

describe("checkout whatsapp message", () => {
  it("builds a payload with item breakdown and general total", () => {
    const output = buildWhatsAppMessage(
      {
        clienteNombre: "Ana Perez",
        clienteCiudad: "Bogota",
        destinoSlug: "bogota-d-c-bogota-d-c",
        telefono: "3001234567",
        items: [
          {
            nombreProducto: "Ambar Canela",
            nombreVariante: "220g",
            precioUnitario: 68000,
            cantidad: 2,
          },
        ],
      },
      {
        costoEnvio: 8316,
        destino: "Bogota D.C.",
        departamento: "Bogota D.C.",
      },
    );

    expect(output.subtotalProductos).toBe(136000);
    expect(output.costoEnvio).toBe(8316);
    expect(output.subtotalReferencia).toBe(144316);
    expect(output.totalReferencia).toBe(144316);
    expect(output.mensaje).toContain("========== RESUMEN ==========");
    expect(output.mensaje).toContain("Item 1:");
    expect(output.mensaje).toContain("Valor unt:");
    expect(output.mensaje).toContain("Valor total:");
    expect(output.mensaje).toContain("Subtotal productos:");
    expect(output.mensaje).toContain("Envio a Bogota D.C., Bogota D.C.:");
    expect(output.mensaje).toContain("TOTAL GENERAL:");
    expect(output.mensaje).toContain("Ana Perez");
    expect(decodeURIComponent(output.mensajeUrlEncoded)).toContain("Ambar Canela");
  });
});
