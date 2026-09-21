-- Additive V2 requests; all writes go through the verified Edge API.
create table public.web_requests (
 id uuid primary key default gen_random_uuid(),
 idempotency_key uuid not null unique,
 product_id uuid not null references public.products(id),
 seller_id uuid not null references public.seller_profiles(id),
 buyer_auth_id uuid references auth.users(id),
 kind text not null check(kind in ('purchase','inquiry','wholesale')),
 product_title text not null,
 buyer_name text not null,
 buyer_contact text not null,
 quantity numeric not null check(quantity>0),
 unit text not null,
 listed_price numeric not null check(listed_price>0),
 total numeric not null check(total>0),
 delivery_method text not null check(delivery_method in ('nova_poshta','ukrposhta','pickup')),
 message text not null default '',
 status text not null default 'requested' check(status in ('requested','accepted','changes_proposed','confirmed','completed','cancelled')),
 proposal jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index web_requests_seller_date on public.web_requests(seller_id,created_at desc);
create index web_requests_buyer_date on public.web_requests(buyer_auth_id,created_at desc);
create index web_requests_contact_date on public.web_requests(buyer_contact,created_at desc);
alter table public.web_requests enable row level security;
revoke all on public.web_requests from anon,authenticated;
grant all on public.web_requests to service_role;
create table public.web_request_messages (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references public.web_requests(id) on delete cascade,
 author_auth_id uuid not null references auth.users(id),
 author_role text not null check(author_role in ('seller','buyer')),
 message text not null check(char_length(message) between 1 and 2000),
 created_at timestamptz not null default now()
);
create index web_request_messages_thread on public.web_request_messages(request_id,created_at);
alter table public.web_request_messages enable row level security;
revoke all on public.web_request_messages from anon,authenticated;
grant all on public.web_request_messages to service_role;
alter table public.web_profiles add column if not exists delivery_details text not null default '';

create or replace function public.create_web_request(p_input jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare p public.products; s public.seller_profiles; c public.categories; r public.web_requests; contact text; qty numeric; n integer;
begin
 contact:=lower(trim(p_input->>'buyer_contact')); qty:=(p_input->>'quantity')::numeric;
 if char_length(contact) not between 5 and 254 or char_length(trim(p_input->>'buyer_name')) not between 2 and 100 or qty<=0 or qty>1000000 then raise exception 'invalid_request'; end if;
 perform pg_advisory_xact_lock(hashtextextended(contact,0));
 select * into r from public.web_requests where idempotency_key=(p_input->>'idempotency_key')::uuid;
 if found then
   if r.buyer_contact<>contact or r.product_id<>(p_input->>'product_id')::uuid or r.buyer_auth_id is distinct from (p_input->>'buyer_auth_id')::uuid then raise exception 'invalid_retry'; end if;
   return jsonb_build_object('id',r.id,'product_title',r.product_title,'quantity',r.quantity,'unit',r.unit,'total',r.total,'delivery_method',r.delivery_method,'status',r.status);
 end if;
 select count(*) into n from public.web_requests where buyer_contact=contact and created_at>now()-interval '1 hour';
 if n>=10 then raise exception 'rate_limit'; end if;
 select * into p from public.products where id=(p_input->>'product_id')::uuid and status='approved';
 if not found then raise exception 'product_unavailable'; end if;
 select * into s from public.seller_profiles where id=p.seller_id;
 select * into c from public.categories where id=p.category_id;
 if s.verification_status<>'verified' or not c.is_active or c.publication_mode='blocked' then raise exception 'product_unavailable'; end if;
 if exists(select 1 from public.marketplace_users where id=s.user_id and is_blocked) then raise exception 'product_unavailable'; end if;
 if (p_input->>'buyer_auth_id') is not null and exists(select 1 from public.web_profiles w join public.marketplace_users m on m.id=w.marketplace_user_id where w.user_id=(p_input->>'buyer_auth_id')::uuid and m.is_blocked) then raise exception 'profile_unavailable'; end if;
 if p_input->>'kind'<>'inquiry' and p.available_quantity is not null and qty>p.available_quantity then raise exception 'quantity_unavailable'; end if;
 if jsonb_array_length(p.fulfillment_options)>0 and not p.fulfillment_options ? (p_input->>'delivery_method') then raise exception 'delivery_unavailable'; end if;
 insert into public.web_requests(idempotency_key,product_id,seller_id,buyer_auth_id,kind,product_title,buyer_name,buyer_contact,quantity,unit,listed_price,total,delivery_method,message)
 values((p_input->>'idempotency_key')::uuid,p.id,p.seller_id,(p_input->>'buyer_auth_id')::uuid,p_input->>'kind',p.title,trim(p_input->>'buyer_name'),contact,qty,p.unit,p.price_uah,round(p.price_uah*qty,2),p_input->>'delivery_method',left(coalesce(p_input->>'message',''),2000)) returning * into r;
 return jsonb_build_object('id',r.id,'product_title',r.product_title,'quantity',r.quantity,'unit',r.unit,'total',r.total,'delivery_method',r.delivery_method,'status',r.status);
end $$;
revoke execute on function public.create_web_request(jsonb) from public,anon,authenticated;
grant execute on function public.create_web_request(jsonb) to service_role;

create or replace function public.activate_web_seller(p_user_id uuid,p_input jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare w public.web_profiles; s public.seller_profiles;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 select * into w from public.web_profiles where user_id=p_user_id for update;
 if not found or not coalesce((p_input->>'consent')::boolean,false) then raise exception 'profile_required'; end if;
 if not exists(select 1 from public.categories where slug=p_input->>'category_slug' and is_active) then raise exception 'category_required'; end if;
 if exists(select 1 from public.marketplace_users where id=w.marketplace_user_id and is_blocked) then raise exception 'profile_unavailable'; end if;
 select * into s from public.seller_profiles where user_id=w.marketplace_user_id;
 if found then return to_jsonb(s); end if;
 insert into public.seller_profiles(user_id,display_name,producer_type,email,oblast,locality,contact_preference,verification_status,terms_accepted_at,submitted_at)
 values(w.marketplace_user_id,p_input->>'display_name',p_input->>'producer_type',w.email,p_input->>'oblast',p_input->>'locality','email','pending',now(),now()) returning * into s;
 update public.web_profiles set account_type='seller',producer_type=p_input->>'producer_type',business_status='individual',oblast=p_input->>'oblast',locality=p_input->>'locality',category_slugs=array[p_input->>'category_slug'] where user_id=p_user_id;
 update public.marketplace_users set role='seller' where id=w.marketplace_user_id;
 insert into public.moderation_events(target_type,seller_id,decision,reason) values('seller',s.id,'submitted','Активація продажів у наявному акаунті');
 return to_jsonb(s);
end $$;
revoke execute on function public.activate_web_seller(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.activate_web_seller(uuid,jsonb) to service_role;

-- Free applications must be publishable after moderation, without claiming payment.
alter table public.products drop constraint products_listing_payment_status_check;
alter table public.products add constraint products_listing_payment_status_check check(listing_payment_status in ('legacy','unpaid','pending','paid','refunded','free_launch'));

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
 update public.products set status='pending',listing_payment_status='free_launch',submitted_at=now() where id=p.id;
 insert into public.moderation_events(target_type,product_id,seller_id,decision,reason) values('product',p.id,v_seller,'submitted','Заявка з вебкабінету. Безкоштовний запуск; перевірка виробника та категорії обов’язкові.');
 return jsonb_build_object('id',p.id,'status','pending');
end $$;
revoke execute on function public.submit_web_product(uuid,uuid) from public,anon,authenticated;
grant execute on function public.submit_web_product(uuid,uuid) to service_role;


-- Optional buyer accounts need no address or interests at sign-up.
alter table public.web_profiles drop constraint if exists web_profiles_category_slugs_check;
alter table public.web_profiles add constraint web_profiles_category_slugs_check check(cardinality(category_slugs) between 0 and 5);
create or replace function public.ensure_web_profile(p_user_id uuid,p_name text,p_email text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare w public.web_profiles; m uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 select * into w from public.web_profiles where user_id=p_user_id;
 if found then return to_jsonb(w); end if;
 if char_length(trim(p_name)) not between 2 and 100 or not exists(select 1 from auth.users where id=p_user_id and email_confirmed_at is not null and lower(email)=lower(p_email)) then raise exception 'verified_identity_required'; end if;
 insert into public.marketplace_users(first_name,role) values(trim(p_name),'buyer') returning id into m;
 insert into public.web_profiles(user_id,marketplace_user_id,display_name,email,account_type,category_slugs,oblast,locality)
 values(p_user_id,m,trim(p_name),lower(p_email),'buyer','{}','','') returning * into w;
 insert into public.registration_notifications(user_id) values(p_user_id) on conflict(user_id) do nothing;
 return to_jsonb(w);
end $$;
revoke execute on function public.ensure_web_profile(uuid,text,text) from public,anon,authenticated;
grant execute on function public.ensure_web_profile(uuid,text,text) to service_role;
