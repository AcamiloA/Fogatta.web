import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/db";
import { logError, logInfo } from "@/lib/logger";
import { CreateLeadInput, createLeadResponseSchema } from "@/modules/leads/contracts";

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

        return createLeadResponseSchema.parse({
          ok: true,
          id: created.id,
        });
      }

      const offlineId = randomUUID();
      logInfo("lead_received_without_database", { offlineId, input });

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
