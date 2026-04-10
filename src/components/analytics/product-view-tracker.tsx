"use client";

import { useEffect } from "react";

import { analyticsEvents } from "@/modules/analytics/events";
import { trackEvent } from "@/modules/analytics/track";

type Props = {
  nombre: string;
  slug: string;
};

export function ProductViewTracker({ nombre, slug }: Props) {
  useEffect(() => {
    trackEvent(analyticsEvents.viewProduct, {
      item_name: nombre,
      item_id: slug,
    });
  }, [nombre, slug]);

  return null;
}
