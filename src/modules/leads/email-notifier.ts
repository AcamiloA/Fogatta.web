import nodemailer from "nodemailer";

import { logInfo } from "@/lib/logger";
import { CreateLeadInput } from "@/modules/leads/contracts";

const DEFAULT_NOTIFICATION_EMAIL = "fogatta.support@gmail.com";

export class LeadEmailConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeadEmailConfigurationError";
  }
}

export class LeadEmailSendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeadEmailSendError";
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
    throw new LeadEmailConfigurationError(
      "SMTP no configurado. Define SMTP_USER, SMTP_PASS y SMTP_FROM para enviar contactos por correo.",
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

function buildMailContent(leadId: string, input: CreateLeadInput) {
  const to = process.env.LEADS_NOTIFICATION_TO ?? DEFAULT_NOTIFICATION_EMAIL;
  const city = input.ciudad?.trim() ? input.ciudad.trim() : "No indicada";
  const safe = {
    leadId: htmlSafe(leadId),
    nombre: htmlSafe(input.nombre),
    correo: htmlSafe(input.correo),
    telefono: htmlSafe(input.telefono),
    ciudad: htmlSafe(city),
    mensaje: htmlSafe(input.mensaje).replace(/\n/g, "<br/>"),
  };

  return {
    to,
    subject: `Nuevo contacto web Fogatta: ${input.nombre}`,
    text: [
      "Nuevo mensaje desde el formulario de contacto de Fogatta.",
      "",
      `Lead ID: ${leadId}`,
      `Nombre: ${input.nombre}`,
      `Correo: ${input.correo}`,
      `Tel\u00E9fono: ${input.telefono}`,
      `Ciudad: ${city}`,
      "",
      "Mensaje:",
      input.mensaje,
    ].join("\n"),
    html: `<!doctype html>
<html lang="es">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nuevo contacto Fogatta</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f5f8;font-family:Arial,Helvetica,sans-serif;color:#2c1f14;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Nuevo mensaje de contacto recibido en Fogatta.
    </div>

    <table
      role="presentation"
      cellpadding="0"
      cellspacing="0"
      border="0"
      width="100%"
      style="background:#f3f5f8;padding:24px 12px;"
    >
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" style="max-width:640px;background:#ffffff;border:1px solid #e3e9f2;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="background:#fff;padding:28px 28px 10px;">
                <h1 style="margin:0 0 8px;font-size:22px;line-height:1.2;color:#2c1f14;">Nuevo mensaje de contacto</h1>
                <p style="margin:0;font-size:14px;line-height:1.5;color:#5b493a;">
                  Se registr&#243; una nueva solicitud desde el formulario de contacto del sitio.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 28px 8px;background-color:#f8f4ee;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:separate;border-spacing:0 10px;">
                  <tr>
                    <td style="background:#ffffff;border:1px solid #e7dfd1;border-radius:12px;padding:12px 14px;">
                      <p style="margin:0 0 4px;font-size:12px;color:#7d6654;">Lead ID</p>
                      <p style="margin:0;font-size:14px;color:#2c1f14;"><strong>${safe.leadId}</strong></p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#ffffff;border:1px solid #e7dfd1;border-radius:12px;padding:12px 14px;">
                      <p style="margin:0 0 4px;font-size:12px;color:#7d6654;">Nombre</p>
                      <p style="margin:0;font-size:14px;color:#2c1f14;"><strong>${safe.nombre}</strong></p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#ffffff;border:1px solid #e7dfd1;border-radius:12px;padding:12px 14px;">
                      <p style="margin:0 0 4px;font-size:12px;color:#7d6654;">Correo</p>
                      <p style="margin:0;font-size:14px;color:#2c1f14;"><strong>${safe.correo}</strong></p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#ffffff;border:1px solid #e7dfd1;border-radius:12px;padding:12px 14px;">
                      <p style="margin:0 0 4px;font-size:12px;color:#7d6654;">Tel&#233;fono</p>
                      <p style="margin:0;font-size:14px;color:#2c1f14;"><strong>${safe.telefono}</strong></p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#ffffff;border:1px solid #e7dfd1;border-radius:12px;padding:12px 14px;">
                      <p style="margin:0 0 4px;font-size:12px;color:#7d6654;">Ciudad</p>
                      <p style="margin:0;font-size:14px;color:#2c1f14;"><strong>${safe.ciudad}</strong></p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#ffffff;border:1px solid #d9c7ab;border-radius:12px;padding:14px;">
                      <p style="margin:0 0 8px;font-size:12px;color:#7d6654;">Mensaje</p>
                      <p style="margin:0;font-size:14px;line-height:1.6;color:#2c1f14;">${safe.mensaje}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="background:#fff;padding:16px 28px 28px;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#7d6654;">
                  Este correo fue generado autom&#225;ticamente por el sitio web de Fogatta.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    attachments: [],
  };
}

export async function sendLeadNotificationEmail(leadId: string, input: CreateLeadInput) {
  const smtp = requireSmtpConfig();
  const message = buildMailContent(leadId, input);

  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    });

    await transporter.sendMail({
      from: smtp.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      attachments: message.attachments,
      textEncoding: "base64",
    });

    logInfo("lead_email_notification_sent", {
      leadId,
      to: message.to,
    });
  } catch (error) {
    throw new LeadEmailSendError(
      error instanceof Error
        ? `No se pudo enviar correo de notificacion: ${error.message}`
        : "No se pudo enviar correo de notificacion.",
    );
  }
}
