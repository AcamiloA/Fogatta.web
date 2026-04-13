import { ContentPayload } from "@/modules/content/contracts";

export const fallbackContent: ContentPayload = {
  hero: {
    titulo: "Velas artesanales con identidad Fogatta",
    descripcion:
      "Aromas para ambientar el hogar con una experiencia sensorial premium.",
  },
  nosotros: {
    titulo: "Creamos atmosferas que se quedan en la memoria",
    historia:
      "Fogatta nace para convertir rituales cotidianos en momentos especiales. Cada vela se mezcla, vierte y termina de forma artesanal en pequenos lotes.",
    promesa:
      "Seleccionamos fragancias que aportan calma, presencia y calidez para hogares que valoran los detalles.",
  },
  faq: [],
  blog: [],
  legales: [
    {
      tipo: "privacidad",
      contenido:
        "Recolectamos datos de contacto para gestionar pedidos, resolver solicitudes y mejorar la experiencia del sitio. Nunca vendemos informacion personal a terceros.",
      fechaVigencia: "2026-04-10",
    },
    {
      tipo: "terminos",
      contenido:
        "Los pedidos se confirman por WhatsApp y se procesan una vez validado el pago. Los tiempos de entrega son estimados y pueden variar por transportadora o zona.",
      fechaVigencia: "2026-04-10",
    },
  ],
};
