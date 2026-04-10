import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";
import {
  WhatsAppPreviewInput,
  WhatsAppPreviewResponse,
  whatsappPreviewResponseSchema,
} from "@/modules/checkout-whatsapp/contracts";
import { buildWhatsAppMessage } from "@/modules/checkout-whatsapp/message";

export class CheckoutWhatsAppService {
  async preview(input: WhatsAppPreviewInput): Promise<WhatsAppPreviewResponse> {
    const preview = buildWhatsAppMessage(input);

    if (prisma) {
      try {
        await prisma.whatsappOrder.create({
          data: {
            clienteNombre: input.clienteNombre,
            clienteCiudad: input.clienteCiudad,
            telefono: input.telefono,
            subtotalReferencia: preview.subtotalReferencia,
            mensaje: preview.mensaje,
            estado: "pending",
            items: {
              create: input.items.map((item) => ({
                productId: item.productId,
                variantId: item.variantId,
                nombreProducto: item.nombreProducto,
                nombreVariante: item.nombreVariante,
                precioUnitario: item.precioUnitario,
                cantidad: item.cantidad,
                subtotal: item.precioUnitario * item.cantidad,
              })),
            },
          },
        });
      } catch (error) {
        logError("checkout_whatsapp_order_persist_failed", { error });
      }
    }

    return whatsappPreviewResponseSchema.parse(preview);
  }
}
