// V2 requests use server-calculated prices and explicit participant checks.
const deliveries = ["nova_poshta", "ukrposhta", "pickup"];
const clean = (v: unknown, max = 1000) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";
const uuid = (v: unknown) =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
const email = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export async function createRequest(db: any, body: any, user: any) {
  const r = body.request || {};
  if (!uuid(r.product_id) || !uuid(r.idempotency_key))
    throw Error("Оберіть товар і повторіть запит.");
  const contact = clean(r.buyer_contact, 254).toLowerCase();
  if (
    clean(r.buyer_name, 100).length < 2 ||
    (!email(contact) && !/^\+?[\d\s()-]{9,20}$/.test(contact))
  )
    throw Error("Вкажіть ім’я та телефон або email.");
  if (!["purchase", "inquiry", "wholesale"].includes(r.kind))
    throw Error("Невідомий тип запиту.");
  if (r.kind === "inquiry" && clean(r.message, 2000).length < 2)
    throw Error("Напишіть повідомлення виробнику.");
  const quantity = r.kind === "inquiry" ? 1 : Number(r.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1000000)
    throw Error("Перевірте кількість.");
  if (!deliveries.includes(r.delivery_method)) throw Error("Оберіть доставку.");
  const { data, error } = await db.rpc("create_web_request", {
    p_input: {
      product_id: r.product_id,
      idempotency_key: r.idempotency_key,
      kind: r.kind,
      buyer_name: clean(r.buyer_name, 100),
      buyer_contact: contact,
      buyer_auth_id: user?.id || null,
      quantity,
      delivery_method: r.delivery_method,
      message: clean(r.message, 2000),
    },
  });
  if (error)
    throw Error(
      error.message.includes("rate_limit")
        ? "Забагато запитів. Спробуйте через годину."
        : error.message.includes("quantity")
          ? "Цієї кількості вже немає в наявності."
          : "Товар поки недоступний для замовлення.",
    );
  return { request: data };
}
export async function requestsDashboard(db: any, profile: any, seller: any) {
  // A verified email may claim only previously unclaimed guest requests.
  await db
    .from("web_requests")
    .update({ buyer_auth_id: profile.user_id })
    .is("buyer_auth_id", null)
    .eq("buyer_contact", profile.email.toLowerCase());
  const query = db
    .from("web_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  const { data, error } = seller
    ? await query.or(
        `buyer_auth_id.eq.${profile.user_id},seller_id.eq.${seller.id}`,
      )
    : await query.eq("buyer_auth_id", profile.user_id);
  if (error) throw error;
  return data || [];
}
export async function participant(db: any, id: string, profile: any) {
  if (!uuid(id)) throw Error("Запит не знайдено.");
  const { data: r, error } = await db
    .from("web_requests")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !r) throw Error("Запит не знайдено.");
  const { data: s } = await db
    .from("seller_profiles")
    .select("user_id")
    .eq("id", r.seller_id)
    .single();
  const seller = s?.user_id === profile.marketplace_user_id;
  if (!seller && r.buyer_auth_id !== profile.user_id)
    throw Error("Запит не знайдено.");
  return { r, seller };
}
export async function requestAction(db: any, body: any, profile: any) {
  const { r, seller } = await participant(db, body.request_id, profile);
  if (body.action === "request-thread") {
    const { data, error } = await db
      .from("web_request_messages")
      .select("id,author_role,message,created_at")
      .eq("request_id", r.id)
      .order("created_at");
    if (error) throw error;
    return { request: r, messages: data || [], as_seller: seller };
  }
  if (body.action === "request-message") {
    const message = clean(body.message, 2000);
    if (!message) throw Error("Напишіть повідомлення.");
    const { error } = await db.from("web_request_messages").insert({
      request_id: r.id,
      author_auth_id: profile.user_id,
      author_role: seller ? "seller" : "buyer",
      message,
    });
    if (error) throw error;
    return { saved: true, guest_contact_required: seller && !r.buyer_auth_id };
  }
  const next = body.status;
  const allowed = seller
    ? {
        requested: ["accepted", "changes_proposed", "cancelled"],
        accepted: ["completed", "cancelled"],
        changes_proposed: ["cancelled"],
        confirmed: ["completed", "cancelled"],
      }
    : {
        requested: ["cancelled"],
        accepted: ["confirmed", "cancelled"],
        changes_proposed: ["confirmed", "cancelled"],
        confirmed: ["cancelled"],
      };
  if (!(allowed as any)[r.status]?.includes(next))
    throw Error("Статус уже змінився. Оновіть запит.");
  const patch: any = { status: next, updated_at: new Date().toISOString() };
  if (next === "changes_proposed") {
    const p = body.proposal || {};
    if (
      !(
        Number(p.quantity) > 0 &&
        Number(p.quantity) <= 1000000 &&
        Number(p.total) > 0 &&
        Number(p.total) <= 1000000000
      ) ||
      !deliveries.includes(p.delivery_method)
    )
      throw Error("Перевірте кількість, суму та доставку.");
    patch.proposal = {
      quantity: Number(p.quantity),
      total: Math.round(Number(p.total) * 100) / 100,
      unit: clean(p.unit, 30) || r.unit,
      delivery_method: p.delivery_method,
      note: clean(p.note, 1000),
    };
  }
  if (next === "confirmed" && r.status === "changes_proposed")
    Object.assign(patch, {
      quantity: r.proposal.quantity,
      total: r.proposal.total,
      unit: r.proposal.unit,
      delivery_method: r.proposal.delivery_method,
    });
  const { data, error } = await db
    .from("web_requests")
    .update(patch)
    .eq("id", r.id)
    .eq("status", r.status)
    .select("*")
    .maybeSingle();
  if (error || !data) throw Error("Статус уже змінився. Оновіть запит.");
  return { request: data };
}
export async function activateSeller(
  db: any,
  user: any,
  profile: any,
  input: any,
) {
  const name = clean(input.display_name, 100),
    locality = clean(input.locality, 100),
    oblast = clean(input.oblast, 100);
  if (
    name.length < 2 ||
    locality.length < 2 ||
    !oblast ||
    !["craft", "farm", "household"].includes(input.producer_type)
  )
    throw Error("Вкажіть ім’я виробника, тип і походження.");
  const { data, error } = await db.rpc("activate_web_seller", {
    p_user_id: user.id,
    p_input: {
      display_name: name,
      locality,
      oblast,
      producer_type: input.producer_type,
      category_slug: clean(input.category_slug, 60),
      consent: input.consent === true,
    },
  });
  if (error)
    throw Error(
      "Не вдалося зберегти профіль виробника. Перевірте поля та згоду з правилами.",
    );
  return { seller: data };
}
export async function updateProfile(db: any, profile: any, input: any) {
  const name = clean(input.display_name, 100),
    locality = clean(input.locality, 100),
    oblast = clean(input.oblast, 100);
  if (name.length < 2 || !oblast || locality.length < 2)
    throw Error("Перевірте ім’я та локацію.");
  const options = Array.isArray(input.fulfillment_options)
    ? input.fulfillment_options.filter((x: string) => deliveries.includes(x))
    : [];
  const { error } = await db
    .from("web_profiles")
    .update({
      display_name: name,
      oblast,
      locality,
      delivery_details: clean(input.delivery_details, 500),
    })
    .eq("user_id", profile.user_id);
  if (error) throw error;
  const { error: se } = await db
    .from("seller_profiles")
    .update({
      display_name: name,
      oblast,
      locality,
      story: clean(input.story, 1000),
      fulfillment_options: options,
    })
    .eq("user_id", profile.marketplace_user_id);
  if (se) throw se;
  return { saved: true };
}
