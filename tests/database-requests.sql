begin;
do $$
declare auth_id uuid:=gen_random_uuid(); auth_buyer uuid:=gen_random_uuid(); market_id uuid; seller_id uuid; product_id uuid; category_id uuid; response jsonb; again jsonb; request_input jsonb; request_id uuid; profile jsonb;
begin
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(auth_id,'ridne-qa-seller@example.invalid',now(),'{}'),(auth_buyer,'ridne-qa-buyer@example.invalid',now(),'{}');
 profile:=public.ensure_web_profile(auth_id,'QA Пасіка','ridne-qa-seller@example.invalid');
 market_id:=(profile->>'marketplace_user_id')::uuid;
 perform public.activate_web_seller(auth_id,jsonb_build_object('display_name','QA Пасіка','locality','Миронівка','oblast','Київська','producer_type','household','category_slug','honey','consent',true));
 select id into seller_id from public.seller_profiles where user_id=market_id;
 if seller_id is null or (select count(*) from public.web_profiles where user_id=auth_id)<>1 then raise exception 'Identity duplication'; end if;
 update public.seller_profiles set verification_status='verified' where id=seller_id;
 select id into category_id from public.categories where slug='honey';
 insert into public.products(seller_id,category_id,title,price_uah,unit,available_quantity,status,storage_requirements,fulfillment_options)
 values(seller_id,category_id,'QA мед — не публікується',220,'кг',10,'draft','Сухе місце','["pickup"]') returning id into product_id;
 perform public.submit_web_product(auth_id,product_id);
 if not exists(select 1 from public.products where id=product_id and status='pending' and listing_payment_status='free_launch') then raise exception 'Free listing not eligible'; end if;
 update public.products set status='approved' where id=product_id;
 request_input:=jsonb_build_object('product_id',product_id,'idempotency_key',gen_random_uuid(),'kind','purchase','buyer_name','QA Покупець','buyer_contact','ridne-qa-buyer@example.invalid','quantity',2,'delivery_method','pickup','message','Test','price',1,'total',1);
 response:=public.create_web_request(request_input);
 if (response->>'total')::numeric<>440 then raise exception 'Client price was trusted'; end if;
 again:=public.create_web_request(request_input);
 if again->>'id'<>response->>'id' then raise exception 'Idempotency failed'; end if;
 if (select count(*) from public.web_requests where buyer_contact='ridne-qa-buyer@example.invalid')<>1 then raise exception 'Duplicate request'; end if;
 begin
 perform public.create_web_request(request_input||jsonb_build_object('idempotency_key',gen_random_uuid(),'quantity',11));
 raise exception 'Oversell accepted';
 exception when others then if sqlerrm<>'quantity_unavailable' then raise; end if; end;
 begin
 perform public.create_web_request(request_input||jsonb_build_object('idempotency_key',gen_random_uuid(),'delivery_method','nova_poshta'));
 raise exception 'Unsupported delivery accepted';
 exception when others then if sqlerrm<>'delivery_unavailable' then raise; end if; end;
 update public.products set status='draft' where id=product_id;
 begin
 perform public.create_web_request(request_input||jsonb_build_object('idempotency_key',gen_random_uuid()));
 raise exception 'Draft product accepted';
 exception when others then if sqlerrm<>'product_unavailable' then raise; end if; end;
end $$;
rollback;
