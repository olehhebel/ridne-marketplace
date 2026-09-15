-- Additive web marketplace schema. Existing Telegram identities remain separate.
create table if not exists public.web_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 marketplace_user_id uuid unique not null references public.marketplace_users(id),
 display_name text not null check(char_length(display_name) between 2 and 100),
 email text not null,
 account_type text not null check(account_type in ('buyer','seller')),
 producer_type text check(producer_type in ('craft','farm','household')),
 business_status text check(business_status in ('fop','company','individual','planning')),
 category_slugs text[] not null check(cardinality(category_slugs) between 1 and 5),
 oblast text not null, locality text not null,
 consent_version text not null default '2026-09-12',
 created_at timestamptz not null default now()
);
alter table public.web_profiles enable row level security;
revoke all on public.web_profiles from anon, authenticated;
grant select on public.web_profiles to authenticated;
create policy web_profile_owner_read on public.web_profiles for select to authenticated using (user_id=(select auth.uid()));

create table if not exists public.registration_notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references public.web_profiles(user_id) on delete cascade,
 recipient text not null default 'doctorgebel@gmail.com' check(recipient='doctorgebel@gmail.com'),
 status text not null default 'pending' check(status in ('pending','sending','sent','failed')),
 attempts integer not null default 0,
 last_error text,
 claimed_at timestamptz,
 sent_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.registration_notifications enable row level security;
revoke all on public.registration_notifications from anon, authenticated;

create or replace function public.complete_web_onboarding(p_user_id uuid,p_profile jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_existing public.web_profiles; v_market uuid; v_seller uuid; v_slugs text[]; v_count integer; v_role text;
begin
 -- The service-only caller verifies identity with auth.getUser before invoking.
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 if nullif(p_profile->>'verified_email','') is null then raise exception 'Verified email required'; end if;
 select * into v_existing from public.web_profiles where user_id=p_user_id;
 if found then return to_jsonb(v_existing); end if;
 v_role := p_profile->>'account_type';
 if v_role not in ('buyer','seller') then raise exception 'Invalid account type'; end if;
 select array_agg(distinct value) into v_slugs from jsonb_array_elements_text(p_profile->'category_slugs');
 if cardinality(v_slugs) not between 1 and 5 then raise exception 'Choose one to five categories'; end if;
 select count(*) into v_count from public.categories where slug=any(v_slugs) and is_active;
 if v_count<>cardinality(v_slugs) then raise exception 'Invalid categories'; end if;
 if char_length(trim(p_profile->>'display_name')) not between 2 and 100 or char_length(trim(p_profile->>'locality')) not between 2 and 100 then raise exception 'Invalid profile'; end if;
 if not coalesce((p_profile->>'consent')::boolean,false) then raise exception 'Consent required'; end if;
 insert into public.marketplace_users(first_name,role) values(trim(p_profile->>'display_name'),v_role::public.ridne_user_role) returning id into v_market;
 insert into public.web_profiles(user_id,marketplace_user_id,display_name,email,account_type,producer_type,business_status,category_slugs,oblast,locality)
 values(p_user_id,v_market,trim(p_profile->>'display_name'),(p_profile->>'verified_email'),v_role,case when v_role='seller' then p_profile->>'producer_type' end,case when v_role='seller' then p_profile->>'business_status' end,v_slugs,p_profile->>'oblast',trim(p_profile->>'locality')) returning * into v_existing;
 if v_role='seller' then
  insert into public.seller_profiles(user_id,display_name,producer_type,email,oblast,locality,contact_preference,verification_status,terms_accepted_at,submitted_at)
  values(v_market,coalesce(nullif(trim(p_profile->>'shop_name'),''),v_existing.display_name),v_existing.producer_type,(p_profile->>'verified_email'),v_existing.oblast,v_existing.locality,'email','pending',now(),now()) returning id into v_seller;
  insert into public.moderation_events(target_type,seller_id,decision,reason) values('seller',v_seller,'submitted','Профіль із вебсайту. Статус бізнесу заявлений користувачем, не перевірений.');
 end if;
 insert into public.registration_notifications(user_id) values(p_user_id) on conflict(user_id) do nothing;
 return to_jsonb(v_existing);
end $$;
revoke execute on function public.complete_web_onboarding(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.complete_web_onboarding(uuid,jsonb) to service_role;

-- Do not expose private seller contacts or documents through the browser API.
revoke select on public.seller_profiles from anon,authenticated;
grant select(id,display_name,producer_type,oblast,locality,public_origin_text,story,fulfillment_options,verification_status,created_at) on public.seller_profiles to anon,authenticated;

insert into public.categories(slug,name_uk,description_uk,publication_mode,requires_food_operator_registration,sort_order)
values('craft','Крафт і вироби ручної роботи','Вироби локальних майстрів. Публікація після модерації.','review_required',false,130)
on conflict(slug) do nothing;

create or replace function public.claim_registration_notice(p_user_id uuid)
returns setof public.registration_notifications language sql security invoker set search_path='' as $$
 update public.registration_notifications set status='sending',claimed_at=now(),attempts=attempts+1
 where user_id=p_user_id and (status in ('pending','failed') or (status='sending' and claimed_at<now()-interval '10 minutes')) and attempts<8
 returning *;
$$;
revoke execute on function public.claim_registration_notice(uuid) from public,anon,authenticated;
grant execute on function public.claim_registration_notice(uuid) to service_role;
grant all on public.web_profiles,public.registration_notifications to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('ridne-web-products','ridne-web-products',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
alter table public.products add column if not exists web_image_path text;

create table if not exists public.web_listing_submissions(
 product_id uuid primary key references public.products(id) on delete cascade,
 submitted_by uuid not null references auth.users(id),
 submitted_at timestamptz not null default now()
);
alter table public.web_listing_submissions enable row level security;
revoke all on public.web_listing_submissions from anon,authenticated;
grant all on public.web_listing_submissions to service_role;

create or replace function public.submit_web_product(p_user_id uuid,p_product_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare p public.products; v_seller uuid; v_count integer; v_limit integer; v_mode text; v_cat public.categories;
begin
 select sp.id into v_seller from public.web_profiles w join public.seller_profiles sp on sp.user_id=w.marketplace_user_id join public.marketplace_users m on m.id=w.marketplace_user_id where w.user_id=p_user_id and w.account_type='seller' and not m.is_blocked and sp.verification_status not in ('suspended','rejected');
 if v_seller is null then raise exception 'Seller profile unavailable'; end if;
 select * into p from public.products where id=p_product_id and seller_id=v_seller for update;
 if p.id is null then raise exception 'Product not found'; end if;
 if p.status='pending' then return jsonb_build_object('id',p.id,'status',p.status); end if;
 if p.status<>'draft' then raise exception 'Only drafts can be submitted'; end if;
 select * into v_cat from public.categories where id=p.category_id;
 if v_cat.publication_mode='blocked' or not v_cat.is_active then raise exception 'This category is not open for applications'; end if;
 select value#>>'{}' into v_mode from public.marketplace_settings where key='monetization_mode';
 if v_mode<>'launch_free' then raise exception 'Applications are temporarily paused'; end if;
 select (value#>>'{}')::integer into v_count from public.marketplace_settings where key='launch_free_listing_used' for update;
 select (value#>>'{}')::integer into v_limit from public.marketplace_settings where key='launch_free_listing_limit';
 if v_count is null or v_limit is null or v_count>=v_limit then raise exception 'Free launch limit reached'; end if;
 insert into public.web_listing_submissions(product_id,submitted_by) values(p.id,p_user_id) on conflict(product_id) do nothing;
 if found then update public.marketplace_settings set value=to_jsonb(v_count+1) where key='launch_free_listing_used'; end if;
 update public.products set status='pending',submitted_at=now() where id=p.id;
 insert into public.moderation_events(target_type,product_id,seller_id,decision,reason) values('product',p.id,v_seller,'submitted','Заявка з вебкабінету. Безкоштовний запуск; перевірка виробника та категорії обов’язкові.');
 return jsonb_build_object('id',p.id,'status','pending');
end $$;
revoke execute on function public.submit_web_product(uuid,uuid) from public,anon,authenticated;
grant execute on function public.submit_web_product(uuid,uuid) to service_role;

-- Unified owner moderation queue for web and Telegram submissions.
alter table public.bot_runtime_config add column if not exists moderation_chat_id bigint;

create table if not exists public.moderation_notifications (
 id uuid primary key default gen_random_uuid(),
 target_type public.moderation_target_type not null,
 target_id uuid not null,
 status text not null default 'pending' check(status in ('pending','sending','sent','failed')),
 attempts integer not null default 0,
 last_error text,
 telegram_chat_id bigint,
 telegram_message_id bigint,
 claimed_at timestamptz,
 sent_at timestamptz,
 created_at timestamptz not null default now(),
 unique(target_type,target_id)
);
alter table public.moderation_notifications enable row level security;
revoke all on public.moderation_notifications from anon,authenticated;
grant all on public.moderation_notifications to service_role;

create or replace function public.claim_moderation_notification(p_target_type public.moderation_target_type,p_target_id uuid)
returns setof public.moderation_notifications language plpgsql security invoker set search_path='' as $$
begin
 insert into public.moderation_notifications(target_type,target_id)
 values(p_target_type,p_target_id)
 on conflict(target_type,target_id) do nothing;
 return query
 update public.moderation_notifications
 set status='sending',claimed_at=now(),attempts=attempts+1
 where target_type=p_target_type and target_id=p_target_id
   and (status in ('pending','failed') or (status='sending' and claimed_at<now()-interval '10 minutes'))
   and attempts<8
 returning *;
end $$;
revoke execute on function public.claim_moderation_notification(public.moderation_target_type,uuid) from public,anon,authenticated;
grant execute on function public.claim_moderation_notification(public.moderation_target_type,uuid) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('ridne-product-images','ridne-product-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
