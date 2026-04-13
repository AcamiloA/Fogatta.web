-- Convert old fixed discount amount to percentage discount.
-- Example: precioDelta=35000 and descuentoValor=3500 => descuentoValor=10
UPDATE "public"."Variant"
SET "descuentoValor" = LEAST(
  100,
  GREATEST(
    0,
    ROUND(("descuentoValor"::numeric / NULLIF("precioDelta", 0)::numeric) * 100)
  )
)
WHERE "descuentoActivo" = true
  AND "descuentoValor" > 0
  AND "precioDelta" > 0;
