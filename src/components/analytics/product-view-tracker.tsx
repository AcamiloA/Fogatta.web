"use client";

import { useEffect } from "react";

import { analyticsEvents } from "@/modules/analytics/events";
import { trackEvent } from "@/modules/analytics/track";

type Props = {
  nombre: string;
  slug: string;
  categoria: string;
};

export function ProductViewTracker({ nombre, slug, categoria }: Props) {
  useEffect(() => {
    const items = [
      {
        item_id: slug,
        item_name: nombre,
        item_category: categoria,
      },
    ];

    trackEvent(analyticsEvents.viewItem, {
      currency: "COP",
      value: 0,
      items,
    });

    trackEvent(analyticsEvents.viewProduct, {
      item_name: nombre,
      item_id: slug,
      item_category: categoria,
    });
  }, [categoria, nombre, slug]);

  return null;
}
