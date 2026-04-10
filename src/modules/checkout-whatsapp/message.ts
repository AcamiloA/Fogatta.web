import { formatCOP } from "@/lib/currency";
import { siteConfig } from "@/config/site";
import { WhatsAppPreviewInput } from "@/modules/checkout-whatsapp/contracts";

export function buildWhatsAppMessage(input: WhatsAppPreviewInput): {
  subtotalReferencia: number;
  mensaje: string;
  mensajeUrlEncoded: string;
} {
  const lines = input.items.map((item, index) => {
    const subtotal = item.precioUnitario * item.cantidad;
    const variant = item.nombreVariante ? ` (${item.nombreVariante})` : "";
    return `${index + 1}. ${item.nombreProducto}${variant} x${item.cantidad} - ${formatCOP(subtotal)}`;
  });

  const subtotalReferencia = input.items.reduce((acc, item) => {
    return acc + item.precioUnitario * item.cantidad;
  }, 0);

  const notas = input.notas?.trim() ? `\nNotas: ${input.notas.trim()}` : "";

  const mensaje = [
    `Hola ${siteConfig.name}, quiero confirmar este pedido:`,
    "",
    ...lines,
    "",
    `Subtotal referencia: ${formatCOP(subtotalReferencia)}`,
    `Cliente: ${input.clienteNombre}`,
    `Ciudad: ${input.clienteCiudad}`,
    `Teléfono: ${input.telefono}`,
    notas,
  ]
    .join("\n")
    .trim();

  return {
    subtotalReferencia,
    mensaje,
    mensajeUrlEncoded: encodeURIComponent(mensaje),
  };
}
