import nodemailer from "nodemailer";

import { logInfo } from "@/lib/logger";

const DEFAULT_STOCK_ALERT_EMAIL = "fogatta.support@gmail.com";

export class StockAlertEmailConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockAlertEmailConfigurationError";
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function encodeUnicodeAsEntities(value: string) {
  return value.replace(/[^\x20-\x7E]/g, (char) => `&#${char.codePointAt(0)};`);
}

function htmlSafe(value: string) {
  return encodeUnicodeAsEntities(escapeHtml(value));
}

function requireSmtpConfig() {
  const host = process.env.SMTP_HOST ?? "smtp.gmail.com";
  const port = Number.parseInt(process.env.SMTP_PORT ?? "465", 10);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? user;

  if (!user || !pass || !from) {
    throw new StockAlertEmailConfigurationError(
      "SMTP no configurado. Define SMTP_USER, SMTP_PASS y SMTP_FROM para alertas de stock.",
    );
  }

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
  };
}

export async function sendLowStockVariantNotificationEmail(input: {
  productId: string;
  productNombre: string;
  variantId: string;
  nombreVariante: string;
  sku: string;
  stockVirtual: number;
  stockMinimoAlerta: number;
}) {
  const smtp = requireSmtpConfig();
  const to =
    process.env.STOCK_ALERT_NOTIFICATION_TO ?? process.env.SMTP_FROM ?? DEFAULT_STOCK_ALERT_EMAIL;

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  const text = [
    "Alerta de stock bajo en FOGATTA.",
    "",
    `Producto: ${input.productNombre}`,
    `Variante: ${input.nombreVariante}`,
    `SKU: ${input.sku}`,
    `Stock actual: ${input.stockVirtual}`,
    `Stock minimo configurado: ${input.stockMinimoAlerta}`,
    "",
    "Accion sugerida: revisar inventario y reponer esta variante.",
  ].join("\n");

  const safe = {
    productNombre: htmlSafe(input.productNombre),
    nombreVariante: htmlSafe(input.nombreVariante),
    sku: htmlSafe(input.sku),
    stockVirtual: String(input.stockVirtual),
    stockMinimoAlerta: String(input.stockMinimoAlerta),
    productId: htmlSafe(input.productId),
    variantId: htmlSafe(input.variantId),
  };

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Alerta stock bajo FOGATTA</title>
  </head>
  <body style="margin:0;padding:0;background:#f4efe7;font-family:Arial,Helvetica,sans-serif;color:#2b1c12;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4efe7;padding:24px 10px;">
      <tr>
        <td align="center">
          <table role="presentation" width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background:#ffffff;border:1px solid #e6d5c3;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(125deg,#0d1a29 0%,#1a2a3d 70%,#8d5430 100%);padding:24px 26px;">
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#e9d7bf;">FOGATTA</p>
                <h1 style="margin:0;font-size:24px;line-height:1.2;color:#f8efe3;">Alerta de stock bajo</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 26px;">
                <p style="margin:0 0 12px;font-size:14px;color:#5d4938;">
                  Una variante alcanzo o bajo del minimo de stock configurado.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0 10px;">
                  <tr>
                    <td style="background:#fcf8f3;border:1px solid #ead8c3;border-radius:12px;padding:12px 14px;">
                      <p style="margin:0 0 4px;font-size:12px;color:#7a6553;">Producto</p>
                      <p style="margin:0;font-size:15px;color:#2b1c12;"><strong>${safe.productNombre}</strong></p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#fcf8f3;border:1px solid #ead8c3;border-radius:12px;padding:12px 14px;">
                      <p style="margin:0 0 4px;font-size:12px;color:#7a6553;">Variante y SKU</p>
                      <p style="margin:0;font-size:14px;color:#2b1c12;"><strong>${safe.nombreVariante}</strong> (${safe.sku})</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#fcf8f3;border:1px solid #ead8c3;border-radius:12px;padding:12px 14px;">
                      <p style="margin:0 0 4px;font-size:12px;color:#7a6553;">Nivel de stock</p>
                      <p style="margin:0;font-size:14px;color:#2b1c12;">Actual: <strong>${safe.stockVirtual}</strong> | Minimo alerta: <strong>${safe.stockMinimoAlerta}</strong></p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 26px 22px;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#7d6654;">
                  IDs internos: Producto ${safe.productId}, Variante ${safe.variantId}.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  await transporter.sendMail({
    from: smtp.from,
    to,
    subject: `Alerta stock bajo FOGATTA: ${input.productNombre} - ${input.nombreVariante}`,
    text,
    html,
  });

  logInfo("stock_low_notification_sent", {
    productId: input.productId,
    variantId: input.variantId,
    to,
  });
}
