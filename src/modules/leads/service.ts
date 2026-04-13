import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/db";
import { logError, logInfo } from "@/lib/logger";
import { CreateLeadInput, createLeadResponseSchema } from "@/modules/leads/contracts";
import { sendLeadNotificationEmail } from "@/modules/leads/email-notifier";

async function notifyLeadEmailSafely(leadId: string, input: CreateLeadInput) {
  try {
    await sendLeadNotificationEmail(leadId, input);
  } catch (error) {
    logError("lead_notification_email_failed", { error, leadId });
  }
}

export class LeadsService {
  async createLead(input: CreateLeadInput) {
    try {
      if (prisma) {
        const created = await prisma.contactLead.create({
          data: {
            nombre: input.nombre,
            correo: input.correo,
            telefono: input.telefono,
            ciudad: input.ciudad,
            mensaje: input.mensaje,
            source: "web_contacto",
          },
        });
        await notifyLeadEmailSafely(created.id, input);

        return createLeadResponseSchema.parse({
          ok: true,
          id: created.id,
        });
      }

      const offlineId = randomUUID();
      logInfo("lead_received_without_database", { offlineId, input });
      await sendLeadNotificationEmail(offlineId, input);

      return createLeadResponseSchema.parse({
        ok: true,
        id: offlineId,
      });
    } catch (error) {
      logError("create_lead_failed", { error, input });
      throw error;
    }
  }
}
