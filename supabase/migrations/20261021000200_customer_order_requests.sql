-- Persist customer cancellation and return reasons alongside the order state.
-- Safe to re-run and does not alter existing orders or inventory.
alter table public.store_orders
  add column if not exists cancellation_reason text,
  add column if not exists return_reason text;

alter table public.store_orders
  drop constraint if exists store_orders_cancellation_reason_length,
  add constraint store_orders_cancellation_reason_length
    check (cancellation_reason is null or char_length(cancellation_reason) <= 1000),
  drop constraint if exists store_orders_return_reason_length,
  add constraint store_orders_return_reason_length
    check (return_reason is null or char_length(return_reason) <= 1000);
