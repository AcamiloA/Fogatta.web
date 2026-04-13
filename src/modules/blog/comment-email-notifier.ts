import nodemailer from "nodemailer";

import { logInfo } from "@/lib/logger";
import { BlogCommentDTO } from "@/modules/blog/comments-contracts";

const DEFAULT_SUPPORT_EMAIL = "fogatta.support@fogatta.co";

export class CommentEmailConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommentEmailConfigurationError";
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
    throw new CommentEmailConfigurationError(
      "SMTP no configurado. Define SMTP_USER, SMTP_PASS y SMTP_FROM para notificaciones de comentarios.",
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

export async function sendBlogCommentNotificationEmail(input: {
  postSlug: string;
  postTitle: string;
  comment: BlogCommentDTO;
}) {
  const smtp = requireSmtpConfig();
  const to = process.env.COMMENTS_NOTIFICATION_TO ?? process.env.SMTP_FROM ?? DEFAULT_SUPPORT_EMAIL;

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
    "Nuevo comentario en blog de Fogatta.",
    "",
    `Post: ${input.postTitle}`,
    `Comentario ID: ${input.comment.id}`,
    `Fecha: ${input.comment.createdAt}`,
    "",
    "Mensaje:",
    input.comment.mensaje,
  ].join("\n");

  const safe = {
    postTitle: htmlSafe(input.postTitle),
    commentId: htmlSafe(input.comment.id),
    createdAt: htmlSafe(input.comment.createdAt),
    message: htmlSafe(input.comment.mensaje).replace(/\n/g, "<br/>"),
  };

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nuevo comentario Fogatta</title>
  </head>
  <body style="margin:0;padding:0;background:#f4efe7;font-family:Arial,Helvetica,sans-serif;color:#2b1c12;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4efe7;padding:24px 10px;">
      <tr>
        <td align="center">
          <table role="presentation" width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background:#ffffff;border:1px solid #e6d5c3;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(125deg,#0d1a29 0%,#1a2a3d 70%,#8d5430 100%);padding:24px 26px;">
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#e9d7bf;">Fogatta</p>
                <h1 style="margin:0;font-size:24px;line-height:1.2;color:#f8efe3;">Nuevo comentario recibido</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 26px;">
                <p style="margin:0 0 12px;font-size:14px;color:#5d4938;">
                  Se registro un comentario nuevo en el blog. Queda pendiente de moderacion.
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0 10px;">
                  <tr>
                    <td style="background:#fcf8f3;border:1px solid #ead8c3;border-radius:12px;padding:12px 14px;">
                      <p style="margin:0 0 4px;font-size:12px;color:#7a6553;">Publicacion</p>
                      <p style="margin:0;font-size:15px;color:#2b1c12;"><strong>${safe.postTitle}</strong></p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#fcf8f3;border:1px solid #ead8c3;border-radius:12px;padding:12px 14px;">
                      <p style="margin:0 0 4px;font-size:12px;color:#7a6553;">Comentario</p>
                      <p style="margin:0;font-size:14px;line-height:1.6;color:#2b1c12;">${safe.message}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:2px;">
                      <p style="margin:0;font-size:12px;color:#8d7866;">
                        ID: ${safe.commentId}<br/>
                        Fecha: ${safe.createdAt}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 26px 22px;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#8d7866;">
                  Notificacion automatica de Fogatta. Revisa y modera el comentario desde el panel de administracion.
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
    subject: `Nuevo comentario en Fogatta: ${input.postTitle}`,
    text,
    html,
  });

  logInfo("blog_comment_notification_sent", {
    commentId: input.comment.id,
    postSlug: input.postSlug,
    to,
  });
}
