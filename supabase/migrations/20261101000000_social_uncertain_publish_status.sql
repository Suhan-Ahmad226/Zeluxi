-- Preserve uncertain Meta publishing outcomes so they can never be blindly retried.
alter table public.social_posts
  drop constraint if exists social_posts_status_check;

alter table public.social_posts
  add constraint social_posts_status_check
  check (status in ('DRAFT','AWAITING_APPROVAL','SCHEDULED','PUBLISHING','PUBLISHED','FAILED','UNCERTAIN','CANCELLED'));

comment on column public.social_posts.status is
  'UNCERTAIN means Meta may have accepted the post; verify the Facebook Page before any manual reconciliation.';
