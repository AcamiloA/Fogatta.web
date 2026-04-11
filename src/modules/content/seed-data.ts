import { ContentPayload } from "@/modules/content/contracts";

export const fallbackContent: ContentPayload = {
  nosotros: {
    titulo: "Creamos atmósferas que se quedan en la memoria",
    historia:
      "Fogatta nace para convertir rituales cotidianos en momentos especiales. Cada vela se mezcla, vierte y termina de forma artesanal en pequeños lotes.",
    promesa:
      "Seleccionamos fragancias que aportan calma, presencia y calidez para hogares que valoran los detalles.",
  },
  faq: [
    {
      id: "faq_1",
      pregunta: "¿Cuánto tarda el envío en Colombia?",
      respuesta:
        "Despachamos en 24-48 horas hábiles. El tiempo total depende de la ciudad, normalmente entre 2 y 5 días.",
      orden: 1,
    },
    {
      id: "faq_2",
      pregunta: "¿Qué medios de pago manejan?",
      respuesta:
        "Para esta fase recibimos transferencia bancaria y pagos por Nequi o Daviplata al confirmar el pedido por WhatsApp.",
      orden: 2,
    },
    {
      id: "faq_3",
      pregunta: "¿Cómo cuidar la vela para mayor duración?",
      respuesta:
        "Enciéndela al menos 2 horas en el primer uso y recorta la mecha a 5 mm antes de cada encendido.",
      orden: 3,
    },
  ],
  blog: [
    {
      id: "blog_1",
      slug: "como-elegir-aroma-segun-espacio",
      titulo: "Cómo elegir el aroma ideal según tu espacio",
      autor: "",
      extracto: "Una guía simple para combinar ambientes y fragancias en casa.",
      contenido:
        "Los espacios pequeños suelen agradecer notas frescas y limpias. Para salas, las mezclas ámbar y amaderadas aportan profundidad. En dormitorios recomendamos perfiles suaves que inviten a bajar el ritmo.",
      imagen: "/images/blog/aroma-espacio.svg",
      fechaPublicacion: "2026-04-10",
    },
    {
      id: "blog_2",
      slug: "ritual-nocturno-con-velas",
      titulo: "Ritual nocturno de 10 minutos para cerrar el día",
      autor: "",
      extracto: "Un hábito breve para desconectar del ruido y descansar mejor.",
      contenido:
        "Apaga pantallas, enciende una vela de perfil cálido, respira profundo por 2 minutos y escribe tres cosas por agradecer. Esta secuencia ayuda a preparar mente y cuerpo para el descanso.",
      imagen: "/images/blog/ritual-nocturno.svg",
      fechaPublicacion: "2026-04-08",
    },
  ],
  legales: [
    {
      tipo: "privacidad",
      contenido:
        "Recolectamos datos de contacto para gestionar pedidos, resolver solicitudes y mejorar la experiencia del sitio. Nunca vendemos información personal a terceros.",
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
