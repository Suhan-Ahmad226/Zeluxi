-- Add explicit marketing intent to each post without changing existing publishing behavior.
alter table public.social_posts
  add column if not exists content_goal text not null default 'PRODUCT_SHOWCASE'
  check (content_goal in (
    'PRODUCT_SHOWCASE',
    'PRODUCT_EDUCATION',
    'NEW_ARRIVAL',
    'OFFER_CAMPAIGN',
    'CUSTOMER_TRUST',
    'ENGAGEMENT'
  ));

create index if not exists social_posts_content_goal_created_idx
  on public.social_posts(content_goal, created_at desc);

comment on column public.social_posts.content_goal is
  'Marketing objective used to generate and organize the post. Customer trust content must use verified customer-provided feedback only.';
