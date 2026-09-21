alter table public.products drop constraint products_unit_check;
alter table public.products add constraint products_unit_check check(unit in ('кг','г','л','мл','шт','банка','упаковка','пучок','ящик','100 г','500 г','0,5 л','лоток','20 шт'));
alter table public.moderation_events add column if not exists requested_fields text[] not null default '{}';
create table public.seller_review_requests(
 id uuid primary key default gen_random_uuid(),
 event_id uuid unique not null references public.moderation_events(id),
 seller_id uuid not null references public.seller_profiles(id),
 product_id uuid references public.products(id),
 requested_fields text[] not null default '{}',
 reason text not null,
 status text not null default 'needs_data' check(status in ('needs_data','resubmitted','resolved')),
 delivery_status text not null default 'pending' check(delivery_status in ('pending','sent','failed','unavailable')),
 delivery_channel text,
 delivery_error text,
 reply text,
 reply_file_path text,
 reply_file_bucket text,
 created_at timestamptz not null default now(),
 replied_at timestamptz
);
create index seller_review_requests_seller on public.seller_review_requests(seller_id,created_at desc);
alter table public.seller_review_requests enable row level security;
revoke all on public.seller_review_requests from anon,authenticated;
grant all on public.seller_review_requests to service_role;
create or replace function public.queue_seller_review_request()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.decision='needs_changes' and new.seller_id is not null then
  insert into public.seller_review_requests(event_id,seller_id,product_id,requested_fields,reason)
  values(new.id,new.seller_id,new.product_id,new.requested_fields,coalesce(new.reason,'Зв’яжіться з командою РІДНЕ щодо заявки.'));
 end if;
 if new.decision='approved' then
  update public.seller_review_requests set status='resolved' where seller_id=new.seller_id and product_id is not distinct from new.product_id;
 end if;
 return new;
end $$;
revoke execute on function public.queue_seller_review_request() from public,anon,authenticated;
create trigger queue_seller_review_request after insert on public.moderation_events for each row execute function public.queue_seller_review_request();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('ridne-review-files','ridne-review-files',false,5242880,array['application/pdf','image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create or replace function public.reply_seller_review(p_user_id uuid,p_review_id uuid,p_reply text,p_seller_patch jsonb,p_product_patch jsonb,p_file_path text,p_file_bucket text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.seller_review_requests; w public.web_profiles;
begin
 select * into w from public.web_profiles where user_id=p_user_id;
 select q.* into r from public.seller_review_requests q join public.seller_profiles s on s.id=q.seller_id where q.id=p_review_id and s.user_id=w.marketplace_user_id and q.status='needs_data' for update of q;
 if not found then raise exception 'request_unavailable'; end if;
 if exists(select 1 from public.marketplace_users where id=w.marketplace_user_id and is_blocked) then raise exception 'blocked'; end if;
 update public.seller_profiles set email=coalesce(p_seller_patch->>'email',email),phone=coalesce(p_seller_patch->>'phone',phone),public_origin_text=coalesce(p_seller_patch->>'public_origin_text',public_origin_text) where id=r.seller_id;
 if r.product_id is null then
  update public.seller_profiles set verification_status='pending',submitted_at=now() where id=r.seller_id and verification_status='rejected';
 else
  update public.products set description=coalesce(p_product_patch->>'description',description),ingredients=coalesce(p_product_patch->>'ingredients',ingredients),storage_requirements=coalesce(p_product_patch->>'storage_requirements',storage_requirements),origin_locality=coalesce(p_product_patch->>'origin_locality',origin_locality),web_image_path=coalesce(p_product_patch->>'web_image_path',web_image_path),public_image_urls=coalesce(p_product_patch->'public_image_urls',public_image_urls),status='pending',submitted_at=now() where id=r.product_id and status='rejected';
 end if;
 if not found then raise exception 'state_changed'; end if;
 update public.seller_review_requests set status='resubmitted',reply=p_reply,reply_file_path=p_file_path,reply_file_bucket=p_file_bucket,replied_at=now() where id=r.id;
 update public.moderation_notifications set status='pending',attempts=0 where target_id=coalesce(r.product_id,r.seller_id);
 insert into public.moderation_events(target_type,seller_id,product_id,decision,reason) values(case when r.product_id is null then 'seller'::public.moderation_target_type else 'product'::public.moderation_target_type end,r.seller_id,r.product_id,'submitted','Виробник доповнив дані: '||left(p_reply,1000));
 return jsonb_build_object('target_type',case when r.product_id is null then 'seller' else 'product' end,'target_id',coalesce(r.product_id,r.seller_id));
end $$;
revoke execute on function public.reply_seller_review(uuid,uuid,text,jsonb,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.reply_seller_review(uuid,uuid,text,jsonb,jsonb,text,text) to service_role;

create or replace function public.reply_telegram_review(p_marketplace_user_id uuid,p_review_id uuid,p_reply text,p_seller_patch jsonb,p_product_patch jsonb,p_file_path text,p_file_bucket text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.seller_review_requests;
begin
 select q.* into r from public.seller_review_requests q join public.seller_profiles s on s.id=q.seller_id where q.id=p_review_id and s.user_id=p_marketplace_user_id and q.status='needs_data' for update of q;
 if not found then raise exception 'request_unavailable'; end if;
 if exists(select 1 from public.marketplace_users where id=p_marketplace_user_id and is_blocked) then raise exception 'blocked'; end if;
 update public.seller_profiles set email=coalesce(p_seller_patch->>'email',email),phone=coalesce(p_seller_patch->>'phone',phone),public_origin_text=coalesce(p_seller_patch->>'public_origin_text',public_origin_text) where id=r.seller_id;
 if r.product_id is null then
  update public.seller_profiles set verification_status='pending',submitted_at=now() where id=r.seller_id and verification_status='rejected';
 else
  update public.products set description=coalesce(p_product_patch->>'description',description),ingredients=coalesce(p_product_patch->>'ingredients',ingredients),storage_requirements=coalesce(p_product_patch->>'storage_requirements',storage_requirements),origin_locality=coalesce(p_product_patch->>'origin_locality',origin_locality),web_image_path=coalesce(p_product_patch->>'web_image_path',web_image_path),public_image_urls=coalesce(p_product_patch->'public_image_urls',public_image_urls),status='pending',submitted_at=now() where id=r.product_id and status='rejected';
 end if;
 if not found then raise exception 'state_changed'; end if;
 update public.seller_review_requests set status='resubmitted',reply=p_reply,reply_file_path=p_file_path,reply_file_bucket=p_file_bucket,replied_at=now() where id=r.id;
 update public.moderation_notifications set status='pending',attempts=0 where target_id=coalesce(r.product_id,r.seller_id);
 insert into public.moderation_events(target_type,seller_id,product_id,decision,reason) values(case when r.product_id is null then 'seller'::public.moderation_target_type else 'product'::public.moderation_target_type end,r.seller_id,r.product_id,'submitted','Виробник доповнив дані: '||left(p_reply,1000));
 return jsonb_build_object('target_type',case when r.product_id is null then 'seller' else 'product' end,'target_id',coalesce(r.product_id,r.seller_id));
end $$;
revoke execute on function public.reply_telegram_review(uuid,uuid,text,jsonb,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.reply_telegram_review(uuid,uuid,text,jsonb,jsonb,text,text) to service_role;
