revoke all on function public.ensure_web_profile(uuid,text,text) from public, anon, authenticated;
grant execute on function public.ensure_web_profile(uuid,text,text) to service_role;
alter function public.ensure_web_profile(uuid,text,text) security definer;
alter function public.ensure_web_profile(uuid,text,text) set search_path = '';
