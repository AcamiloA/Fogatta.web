import { formatCOP } from "@/lib/currency";
import { siteConfig } from "@/config/site";
import { WhatsAppPreviewInput } from "@/modules/checkout-whatsapp/contracts";

export function buildWhatsAppMessage(
  input: WhatsAppPreviewInput,
  options?: {
    orderId?: string;
    costoEnvio?: number;
    destino?: string;
    departamento?: string;
  },
): {
  subtotalReferencia: number;
  subtotalProductos: number;
  costoEnvio: number;
  totalReferencia: number;
  mensaje: string;
  mensajeUrlEncoded: string;
} {
  const lines = input.items.flatMap((item, index) => {
    const itemTotal = item.precioUnitario * item.cantidad;
    const variant = item.nombreVariante ? ` (${item.nombreVariante})` : "";

    return [
      "------------------------------",
      `Item ${index + 1}: ${item.nombreProducto}${variant}`,
      `Cantidad: ${item.cantidad}`,
      `Valor unt: ${formatCOP(item.precioUnitario)}`,
      `Valor total: ${formatCOP(itemTotal)}`,
    ];
  });

  const subtotalProductos = input.items.reduce((acc, item) => {
    return acc + item.precioUnitario * item.cantidad;
  }, 0);
  const costoEnvio = options?.costoEnvio ?? 0;
  const totalReferencia = subtotalProductos + costoEnvio;
  const destino = options?.departamento
    ? `${options.destino ?? input.clienteCiudad}, ${options.departamento}`
    : input.clienteCiudad;

  const notas = input.notas?.trim() ? `\nNotas: ${input.notas.trim()}` : "";
  const utmText = input.utm
    ? Object.entries(input.utm)
        .filter(([, value]) => Boolean(value))
        .map(([key, value]) => `${key}=${value}`)
        .join(" | ")
    : "";
  const pedido = options?.orderId ? `Pedido: #${options.orderId}` : null;

  const mensaje = [
    `Hola ${siteConfig.name}, quiero confirmar este pedido:`,
    "",
    ...(pedido ? [pedido] : []),
    "========== RESUMEN ==========",
    ...lines,
    "------------------------------",
    `Subtotal productos: ${formatCOP(subtotalProductos)}`,
    `Envio a ${destino}: ${formatCOP(costoEnvio)}`,
    "",
    `TOTAL GENERAL: ${formatCOP(totalReferencia)}`,
    "=============================",
    `Cliente: ${input.clienteNombre}`,
    `Ciudad: ${destino}`,
    `Telefono: ${input.telefono}`,
    notas,
    utmText ? `Tracking: ${utmText}` : "",
  ]
    .join("\n")
    .trim();

  return {
    subtotalReferencia: totalReferencia,
    subtotalProductos,
    costoEnvio,
    totalReferencia,
    mensaje,
    mensajeUrlEncoded: encodeURIComponent(mensaje),
  };
}
