const trim = (v: unknown, n = 2000) =>
  typeof v === "string" ? v.trim().slice(0, n) : "";
export const reviewFields: Record<string, string> = {
  email: "Контактний email",
  phone: "Контактний телефон",
  origin: "Походження: область і населений пункт",
  description: "Опис товару",
  ingredients: "Склад",
  storage: "Умови зберігання",
  photo: "Реальне фото товару",
  document: "Документ (уточніть який у повідомленні)",
  other: "Інша інформація",
};
export async function deliverReview(db: any, telegram: any, request: any) {
  const { data: s } = await db
    .from("seller_profiles")
    .select("email,display_name,marketplace_users(telegram_user_id)")
    .eq("id", request.seller_id)
    .single();
  const t = Array.isArray(s?.marketplace_users)
    ? s.marketplace_users[0]
    : s?.marketplace_users;
  const body = `РІДНЕ: доповніть ${request.product_id ? "картку товару" : "профіль виробника"}.\n\n${request.reason}\n\n${request.requested_fields.map((f: string) => reviewFields[f] || f).join("\n")}\n\nВідповісти й повторно надіслати: https://ridne.store/account/?review=${request.id}\nЯкщо подавали через Telegram, натисніть «Надати дані» нижче для текстової відповіді.\nПісля відповіді заявка знову потрапить на перевірку.`;
  let channel = null,
    error = null;
  try {
    if (t?.telegram_user_id) {
      await telegram("sendMessage", {
        chat_id: t.telegram_user_id,
        text: body,
        reply_markup: {
          inline_keyboard: [
            [{ text: "Надати дані", callback_data: "review:" + request.id }],
          ],
        },
      });
      channel = "telegram";
    } else {
      const key = Deno.env.get("RESEND_API_KEY"),
        from = Deno.env.get("RIDNE_MAIL_FROM");
      if (key && from && s?.email) {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + key,
            "Content-Type": "application/json",
            "Idempotency-Key": "ridne-review-" + request.id,
          },
          body: JSON.stringify({
            from,
            to: [s.email],
            subject: "РІДНЕ: потрібні дані для вашої заявки",
            text: body,
          }),
        });
        if (!r.ok) throw Error("email_delivery_failed");
        channel = "email";
      }
    }
  } catch {
    error = "Не вдалося доставити повідомлення. Воно доступне в кабінеті.";
  }
  const status = channel ? "sent" : error ? "failed" : "unavailable";
  await db
    .from("seller_review_requests")
    .update({
      delivery_status: status,
      delivery_channel: channel,
      delivery_error: error,
    })
    .eq("id", request.id);
  return { status, channel, email: s?.email || null, reason: request.reason };
}
export async function notifyLatestReview(
  db: any,
  telegram: any,
  target: string,
  id: string,
) {
  const q = db
    .from("seller_review_requests")
    .select("*")
    .eq(target === "seller" ? "seller_id" : "product_id", id)
    .eq("status", "needs_data")
    .order("created_at", { ascending: false })
    .limit(1);
  const { data, error } = await q;
  if (error) throw error;
  if (!data?.length) return null;
  return deliverReview(db, telegram, data[0]);
}
export async function replyToReview(db: any, profile: any, body: any) {
  const { data: r, error } = await db
    .from("seller_review_requests")
    .select("*,seller_profiles(user_id)")
    .eq("id", body.review_id)
    .eq("status", "needs_data")
    .single();
  const seller = Array.isArray(r?.seller_profiles)
    ? r.seller_profiles[0]
    : r?.seller_profiles;
  if (error || seller?.user_id !== profile.marketplace_user_id)
    throw Error("Запит не знайдено або вже опрацьовано.");
  const input = body.values || {};
  const fields = r.requested_fields || [];
  if (trim(body.reply).length < 3)
    throw Error("Коротко опишіть, що доповнили.");
  for (const field of fields) {
    if (["photo", "document", "other"].includes(field)) continue;
    if (!trim(input[field], 3000)) throw Error("Заповніть усі запитані поля.");
  }
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))
    throw Error("Перевірте email.");
  if (input.phone && !/^\+?[\d\s()-]{9,20}$/.test(input.phone))
    throw Error("Перевірте телефон.");
  if (
    fields.some((f: string) => ["photo", "document"].includes(f)) &&
    !body.file
  )
    throw Error("Додайте запитаний файл.");
  let path = null,
    bucket = null;
  if (body.file) {
    const f = body.file;
    const types: Record<string, string> = {
      "application/pdf": "pdf",
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    if (!types[f.type] || typeof f.data !== "string" || f.data.length > 7000000)
      throw Error("Додайте PDF, JPG, PNG або WebP до 5 МБ.");
    const bytes = Uint8Array.from(atob(f.data), (c) => c.charCodeAt(0));
    if (bytes.length > 5242880) throw Error("Файл завеликий.");
    const valid =
      f.type === "application/pdf"
        ? String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-"
        : f.type === "image/jpeg"
          ? bytes[0] === 255 && bytes[1] === 216
          : f.type === "image/png"
            ? bytes[0] === 137 &&
              bytes[1] === 80 &&
              bytes[2] === 78 &&
              bytes[3] === 71
            : String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
              String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
    if (!valid) throw Error("Вміст файлу не відповідає формату.");
    if (fields.includes("photo") && f.type === "application/pdf")
      throw Error("Для фото оберіть зображення.");
    bucket =
      fields.includes("photo") && r.product_id
        ? "ridne-web-products"
        : "ridne-review-files";
    path = profile.user_id + "/" + crypto.randomUUID() + "." + types[f.type];
    const { error: upload } = await db.storage
      .from(bucket)
      .upload(path, bytes, { contentType: f.type });
    if (upload) throw upload;
  }
  // Only fields explicitly requested by the owner may be patched.
  const sp: any = {};
  if (fields.includes("email")) sp.email = trim(input.email, 254);
  if (fields.includes("phone")) sp.phone = trim(input.phone, 30);
  if (fields.includes("origin"))
    sp.public_origin_text = trim(input.origin, 500);
  const pp: any = {};
  if (fields.includes("description"))
    pp.description = trim(input.description, 3000);
  if (fields.includes("ingredients"))
    pp.ingredients = trim(input.ingredients, 1000);
  if (fields.includes("storage"))
    pp.storage_requirements = trim(input.storage, 500);
  if (fields.includes("origin")) pp.origin_locality = trim(input.origin, 100);
  if (bucket === "ridne-web-products") {
    pp.web_image_path = path;
    pp.public_image_urls = [];
  }
  const { data, error: save } = await db.rpc("reply_seller_review", {
    p_user_id: profile.user_id,
    p_review_id: r.id,
    p_reply: trim(body.reply),
    p_seller_patch: sp,
    p_product_patch: pp,
    p_file_path: path,
    p_file_bucket: bucket,
  });
  if (save) {
    if (path) await db.storage.from(bucket).remove([path]);
    throw Error("Не вдалося зберегти відповідь. Оновіть заявку.");
  }
  return data;
}
