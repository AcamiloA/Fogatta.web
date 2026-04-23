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

function getTimeoutMs(envName: string, fallbackMs: number) {
  const raw = process.env[envName];
  if (!raw) {
    return fallbackMs;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackMs;
  }
  return parsed;
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
    subject: `Nuevo contacto en FOGATTA: ${input.nombre}`,
    text: [
      "Nuevo mensaje desde el formulario de contacto de FOGATTA.",
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
    <title>Nuevo contacto FOGATTA</title>
  </head>
  <body style="margin:0;padding:0;background:#f4efe7;font-family:Arial,Helvetica,sans-serif;color:#2b1c12;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4efe7;padding:24px 10px;">
      <tr>
        <td align="center">
          <table role="presentation" width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background:#ffffff;border:1px solid #e6d5c3;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(125deg,#0d1a29 0%,#1a2a3d 70%,#8d5430 100%);padding:24px 26px;">
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#e9d7bf;">FOGATTA</p>
                <h1 style="margin:0;font-size:24px;line-height:1.2;color:#f8efe3;">Nuevo mensaje de contacto</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 26px;">
                <p style="margin:0 0 12px;font-size:14px;color:#5d4938;">
                  Se registro una nueva solicitud desde el formulario de contacto del sitio.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0 10px;">
                  <tr>
                    <td style="background:#fcf8f3;border:1px solid #ead8c3;border-radius:12px;padding:12px 14px;">
                      <p style="margin:0 0 4px;font-size:12px;color:#7a6553;">Lead ID</p>
                      <p style="margin:0;font-size:15px;color:#2b1c12;"><strong>${safe.leadId}</strong></p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#fcf8f3;border:1px solid #ead8c3;border-radius:12px;padding:12px 14px;">
                      <p style="margin:0 0 4px;font-size:12px;color:#7a6553;">Nombre</p>
                      <p style="margin:0;font-size:14px;color:#2b1c12;"><strong>${safe.nombre}</strong></p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#fcf8f3;border:1px solid #ead8c3;border-radius:12px;padding:12px 14px;">
                      <p style="margin:0 0 4px;font-size:12px;color:#7a6553;">Correo</p>
                      <p style="margin:0;font-size:14px;color:#2b1c12;"><strong>${safe.correo}</strong></p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#fcf8f3;border:1px solid #ead8c3;border-radius:12px;padding:12px 14px;">
                      <p style="margin:0 0 4px;font-size:12px;color:#7a6553;">Telefono</p>
                      <p style="margin:0;font-size:14px;color:#2b1c12;"><strong>${safe.telefono}</strong></p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#fcf8f3;border:1px solid #ead8c3;border-radius:12px;padding:12px 14px;">
                      <p style="margin:0 0 4px;font-size:12px;color:#7a6553;">Ciudad</p>
                      <p style="margin:0;font-size:14px;color:#2b1c12;"><strong>${safe.ciudad}</strong></p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#fcf8f3;border:1px solid #ead8c3;border-radius:12px;padding:12px 14px;">
                      <p style="margin:0 0 4px;font-size:12px;color:#7a6553;">Mensaje</p>
                      <p style="margin:0;font-size:14px;line-height:1.6;color:#2b1c12;">${safe.mensaje}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 26px 22px;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#7d6654;">
                  Notificacion automatica de FOGATTA. Responde al cliente directamente desde su correo de contacto.
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
      connectionTimeout: getTimeoutMs("SMTP_CONNECTION_TIMEOUT_MS", 10_000),
      greetingTimeout: getTimeoutMs("SMTP_GREETING_TIMEOUT_MS", 10_000),
      socketTimeout: getTimeoutMs("SMTP_SOCKET_TIMEOUT_MS", 15_000),
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
