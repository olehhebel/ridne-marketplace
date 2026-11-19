import { createClient } from "npm:@supabase/supabase-js@2.57.4";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const headers = {
  "Access-Control-Allow-Origin": "https://ridne.store",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};
const reply = (status: number, state: string) => new Response(JSON.stringify({state}), {status, headers});
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, {headers});
  if (req.method !== "POST") return reply(405, "method");
  const token = req.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return reply(401, "signin_required");
  const {data:{user}, error} = await db.auth.getUser(token);
  if (error || !user?.email || !user.email_confirmed_at) return reply(401, "verified_email_required");
  const {data:receipt,error:readError} = await db.from("member_welcome_receipts").select("user_id").eq("user_id",user.id).maybeSingle();
  if (readError) return reply(503, "retry");
  if (receipt) return reply(200, "sent");
  const {data:profile,error:profileError} = await db.from("web_profiles").select("user_id").eq("user_id",user.id).maybeSingle();
  if (profileError || !profile) return reply(409, "profile_required");
  const key = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RIDNE_MAIL_FROM");
  if (!key || !from) return reply(503, "sender_not_configured");
  const result = await fetch("https://api.resend.com/emails", {
    method:"POST",
    headers:{Authorization:"Bearer "+key,"Content-Type":"application/json","Idempotency-Key":"ridne-welcome-"+user.id},
    body:JSON.stringify({from,to:[user.email],subject:"Вітаємо в Рідному! Ваш кабінет готовий",
      text:"Дякуємо, що долучилися! Вашу електронну адресу підтверджено. У кабінеті Рідного можна переглядати запити, спілкуватися з виробниками й додавати власні товари.\n\nВідкрити кабінет: https://ridne.store/account/"})
  });
  if (!result.ok || !(await result.json()).id) return reply(503,"delivery_pending");
  const {error:saveError} = await db.from("member_welcome_receipts").upsert({user_id:user.id},{onConflict:"user_id",ignoreDuplicates:true});
  return saveError ? reply(503,"retry") : reply(200,"sent");
});
