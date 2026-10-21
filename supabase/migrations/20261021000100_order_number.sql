-- Add a short, human-readable order number without changing UUID relationships.
-- Existing orders receive stable sequential numbers; new orders use the owned sequence.

ALTER TABLE public.store_orders
  ADD COLUMN IF NOT EXISTS order_number bigint;

CREATE SEQUENCE IF NOT EXISTS public.store_orders_order_number_seq;

ALTER TABLE public.store_orders
  ALTER COLUMN order_number
  SET DEFAULT nextval('public.store_orders_order_number_seq');

ALTER SEQUENCE public.store_orders_order_number_seq
  OWNED BY public.store_orders.order_number;

WITH numbered_orders AS (
  SELECT
    id,
    row_number() OVER (ORDER BY created_at ASC, id ASC)::bigint
      + COALESCE((SELECT MAX(order_number) FROM public.store_orders), 0) AS assigned_number
  FROM public.store_orders
  WHERE order_number IS NULL
)
UPDATE public.store_orders AS orders
SET order_number = numbered_orders.assigned_number
FROM numbered_orders
WHERE orders.id = numbered_orders.id;

SELECT setval(
  'public.store_orders_order_number_seq',
  GREATEST(COALESCE((SELECT MAX(order_number) FROM public.store_orders), 0) + 1, 1),
  false
);

ALTER TABLE public.store_orders
  ALTER COLUMN order_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS store_orders_order_number_uidx
  ON public.store_orders (order_number);

COMMENT ON COLUMN public.store_orders.order_number IS
  'Human-readable customer-facing order number. UUID id remains the internal primary key.';
