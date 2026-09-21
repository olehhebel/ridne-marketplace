import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/ridne-telegram`;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
const esc = (v: unknown) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const OBLASTS = [
  "Вінницька", "Волинська", "Дніпропетровська", "Донецька", "Житомирська", "Закарпатська",
  "Запорізька", "Івано-Франківська", "Київська", "Кіровоградська", "Луганська", "Львівська",
  "Миколаївська", "Одеська", "Полтавська", "Рівненська", "Сумська", "Тернопільська",
  "Харківська", "Херсонська", "Хмельницька", "Черкаська", "Чернівецька", "Чернігівська",
  "АР Крим", "м. Київ"
];

const PRODUCT_CHOICES: Record<string, string[]> = {
  vegetables: ["Томати", "Огірки", "Картопля", "Цибуля", "Морква", "Капуста", "Перець", "Буряк", "Кабачки", "Інші овочі"],
  fruits: ["Яблука", "Груші", "Сливи", "Абрикоси", "Персики", "Виноград", "Кавуни / дині", "Інші фрукти"],
  berries: ["Полуниця", "Малина", "Смородина", "Лохина", "Ожина", "Аґрус", "Журавлина", "Інші ягоди"],
  herbs: ["Кріп", "Петрушка", "Зелена цибуля", "Базилік", "М’ята", "Салат", "Трави / збори", "Інша зелень"],
  nuts: ["Волоський горіх", "Фундук", "Мигдаль", "Насіння", "Горіхова суміш", "Інші горіхи"],
  honey: ["Мед квітковий", "Мед липовий", "Мед гречаний", "Мед акацієвий", "Стільниковий мед", "Прополіс", "Інший продукт пасіки"],
  "dry-goods": ["Борошно", "Крупи", "Сухофрукти", "Трав’яний чай", "Домашня локшина", "Насіння", "Сушені гриби", "Інші сухі продукти"],
  preserves: ["Варення", "Джем", "Соління", "Квашені овочі", "Соус / аджика", "Сік / компот", "Паста / намазка", "Інша заготовка"]
};

const UNITS: Record<string, string> = {
  kg: "кг", g100: "100 г", g500: "500 г", piece: "шт", liter: "л", l05: "0,5 л",
  jar: "банка", pack: "упаковка", bunch: "пучок", box: "ящик"
};

const STORAGES: Record<string, string> = {
  room: "Кімнатна температура",
  cool: "Сухе прохолодне місце",
  fridge: "Холодильник",
  frozen: "Заморожене зберігання",
  none: "Без особливих умов"
};

const PRODUCER_TYPES: Record<string, string> = {
  own: "Вирощую / виробляю сам",
  craft: "Крафтове / сімейне виробництво",
  undecided: "Ще визначаюсь"
};

async function cfg() {
  const { data, error } = await db.from("bot_runtime_config").select("*").eq("id", 1).single();
  if (error) throw error;
  return data;
}

async function tg(method: string, payload: Record<string, unknown> = {}) {
  if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await r.json();
  if (!r.ok || !data.ok) throw new Error(`${method}: ${JSON.stringify(data)}`);
  return data.result;
}

async function send(chatId: number | string, text: string, extra: Record<string, unknown> = {}) {
  return tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, ...extra });
}

const menu = () => ({ inline_keyboard: [
  [{ text: "🥕 Купити", callback_data: "menu:buy" }, { text: "➕ Продати", callback_data: "menu:sell" }],
  [{ text: "🏡 Мій профіль", callback_data: "menu:profile" }, { text: "📦 Мої замовлення", callback_data: "menu:orders" }],
  [{ text: "ℹ️ Як працює РІДНЕ", callback_data: "menu:about" }]
] });

function rows<T>(items: T[], size = 2) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function ensureUser(from: any) {
  const payload = {
    telegram_user_id: from.id,
    telegram_username: from.username || null,
    first_name: from.first_name || null,
    last_name: from.last_name || null,
    last_bot_interaction_at: new Date().toISOString()
  };
  const { data, error } = await db.from("marketplace_users").upsert(payload, { onConflict: "telegram_user_id" }).select("*").single();
  if (error) throw error;
  return data;
}

async function setState(userId: string, state: string, context: Record<string, unknown> = {}) {
  const { error } = await db.from("marketplace_users").update({
    bot_state: state,
    bot_context: context,
    last_bot_interaction_at: new Date().toISOString()
  }).eq("id", userId);
  if (error) throw error;
}

async function sellerFor(userId: string) {
  const { data } = await db.from("seller_profiles").select("*").eq("user_id", userId).maybeSingle();
  return data;
}

function telegramContact(user: any) {
  const label = user.telegram_username ? "@" + user.telegram_username : [user.first_name, user.last_name].filter(Boolean).join(" ") || "Профіль Telegram";
  const href = user.telegram_username ? "https://t.me/" + user.telegram_username : "tg://user?id=" + user.telegram_user_id;
  return `<a href="${esc(href)}">${esc(label)}</a>`;
}

async function notifyAdmin(text: string, replyMarkup?: unknown) {
  const c = await cfg();
  const destination = c.moderation_chat_id || c.admin_telegram_id;
  if (!destination) return;
  const markup:any=replyMarkup||{inline_keyboard:[]};if(markup.inline_keyboard)markup.inline_keyboard.push([{text:"Відкрити адмін-панель",url:"https://ridne.store/admin/moderation/"}]);return send(destination, text, {reply_markup:markup});
}

async function sendPendingModeration(targetType: "seller" | "product", targetId: string) {
  const c = await cfg();
  const destination = c.moderation_chat_id || c.admin_telegram_id;
  if (!destination) return { status: "no_destination", target_type: targetType, target_id: targetId };

  const { data: claimed, error: claimError } = await db.rpc("claim_moderation_notification", {
    p_target_type: targetType,
    p_target_id: targetId
  });
  if (claimError) throw claimError;
  const notice = Array.isArray(claimed) ? claimed[0] : claimed;
  if (!notice?.id) return { status: "skipped", target_type: targetType, target_id: targetId };

  try {
    let text = "";
    let replyMarkup: unknown;
    if (targetType === "seller") {
      const { data: seller, error } = await db.from("seller_profiles")
        .select("id,display_name,producer_type,email,oblast,locality")
        .eq("id", targetId).single();
      if (error) throw error;
      text = `<b>Виробник на перевірку</b>\n${esc(seller.display_name)}\n${esc(seller.producer_type || "Тип не вказано")}\n${esc([seller.locality, seller.oblast].filter(Boolean).join(", ") || "Локація не вказана")}\n${seller.email ? `Email: ${esc(seller.email)}` : "Заявка з Telegram"}`;
      replyMarkup = { inline_keyboard: [[
        { text: "✅ Схвалити", callback_data: `as:approve:${seller.id}` },
        { text: "↩️ Уточнення", callback_data: `as:changes:${seller.id}` }
      ]] };
    } else {
      const { data: product, error } = await db.from("products")
        .select("id,title,price_uah,unit,origin_oblast,origin_locality,seller_profiles(display_name,verification_status)")
        .eq("id", targetId).single();
      if (error) throw error;
      const seller = Array.isArray(product.seller_profiles) ? product.seller_profiles[0] : product.seller_profiles;
      text = `<b>Товар на модерацію</b>\n${esc(product.title)}\n${Number(product.price_uah).toFixed(0)} грн / ${esc(product.unit)}\n${esc([product.origin_locality, product.origin_oblast].filter(Boolean).join(", ") || "Походження не вказане")}\nВиробник: ${esc(seller?.display_name || "Не вказаний")}\nСтатус виробника: ${esc(seller?.verification_status || "невідомий")}`;
      replyMarkup = { inline_keyboard: [[
        { text: "✅ Опублікувати", callback_data: `ap:approve:${product.id}` },
        { text: "↩️ Уточнення", callback_data: `ap:changes:${product.id}` }
      ]] };
    }

    const sent = await send(destination, text, { reply_markup: replyMarkup });
    await db.from("moderation_notifications").update({
      status: "sent",
      telegram_chat_id: destination,
      telegram_message_id: sent.message_id,
      sent_at: new Date().toISOString(),
      last_error: null
    }).eq("id", notice.id);
    return { status: "sent", target_type: targetType, target_id: targetId };
  } catch (error) {
    await db.from("moderation_notifications").update({
      status: "failed",
      last_error: String(error).slice(0, 1000)
    }).eq("id", notice.id);
    return { status: "failed", target_type: targetType, target_id: targetId, error: String(error) };
  }
}

async function syncPendingModeration() {
  const [{ data: sellers, error: sellerError }, { data: products, error: productError }] = await Promise.all([
    db.from("seller_profiles").select("id").eq("verification_status", "pending").order("submitted_at", { ascending: true }),
    db.from("products").select("id").eq("status", "pending").order("submitted_at", { ascending: true })
  ]);
  if (sellerError) throw sellerError;
  if (productError) throw productError;
  const results = [];
  for (const seller of sellers || []) results.push(await sendPendingModeration("seller", seller.id));
  for (const product of products || []) results.push(await sendPendingModeration("product", product.id));
  return {
    ok: results.every((item) => item.status !== "failed" && item.status !== "no_destination"),
    sent: results.filter((item) => item.status === "sent").length,
    skipped: results.filter((item) => item.status === "skipped").length,
    failed: results.filter((item) => item.status === "failed").length,
    results
  };
}

async function connectModerationChannel(chatId: number, token: string) {
  const { data } = await db.from("marketplace_settings").select("value").eq("key", "telegram_moderation_channel_claim").maybeSingle();
  if (!data || String(data.value) !== token) return send(chatId, "Посилання підключення недійсне або вже використане.");
  await db.from("bot_runtime_config").update({ moderation_chat_id: chatId, updated_at: new Date().toISOString() }).eq("id", 1);
  await db.from("marketplace_settings").delete().eq("key", "telegram_moderation_channel_claim");
  return send(chatId, "✅ <b>RIDNE Administration підключено.</b>\nНові профілі, товари та звернення надходитимуть у цей канал.");
}

async function launchQuota() {
  const { data } = await db.from("marketplace_settings").select("key,value").in("key", ["launch_free_listing_limit", "launch_free_listing_used"]);
  const map = new Map((data || []).map((r: any) => [r.key, r.value]));
  const limit = Number(map.get("launch_free_listing_limit") ?? 50);
  const used = Number(map.get("launch_free_listing_used") ?? 0);
  return { limit: Number.isFinite(limit) ? limit : 50, used: Number.isFinite(used) ? used : 0 };
}

async function showMenu(chatId: number, user: any) {
  const name = user.first_name ? `, ${esc(user.first_name)}` : "";
  return send(chatId, `<b>РІДНЕ${name}</b>\nЛокальні продукти від українських виробників. Оберіть дію:`, { reply_markup: menu() });
}

async function claimOwner(chatId: number, user: any, token: string) {
  const c = await cfg();
  if (c.admin_telegram_id) return send(chatId, "Адміністратор РІДНЕ вже налаштований.", { reply_markup: menu() });
  const { data } = await db.from("marketplace_settings").select("value").eq("key", "telegram_owner_claim").maybeSingle();
  if (!data || String(data.value) !== token) return send(chatId, "Посилання адміністратора недійсне або вже використане.", { reply_markup: menu() });
  await db.from("bot_runtime_config").update({ admin_telegram_id: user.telegram_user_id, updated_at: new Date().toISOString() }).eq("id", 1);
  await db.from("marketplace_users").update({ role: "admin" }).eq("id", user.id);
  await db.from("marketplace_settings").delete().eq("key", "telegram_owner_claim");
  await setState(user.id, "idle", {});
  return send(chatId, "✅ <b>Ви адміністратор РІДНЕ.</b>\nНові виробники, товари та звернення приходитимуть сюди.", { reply_markup: menu() });
}

function planRank(plan: string | null) {
  if (plan === "top") return 3;
  if (plan === "boost") return 2;
  return 1;
}

async function browse(chatId: number) {
  const { data, error } = await db.from("public_product_catalog").select("*").order("approved_at", { ascending: false }).limit(30);
  if (error) throw error;
  if (!data?.length) return send(chatId, "Каталог ще формується. Перші перевірені товари з’являться тут після модерації.", { reply_markup: menu() });
  const products = [...data].sort((a: any, b: any) => planRank(b.listing_plan) - planRank(a.listing_plan) || String(b.approved_at).localeCompare(String(a.approved_at))).slice(0, 10);
  await send(chatId, "<b>Свіжі товари РІДНЕ</b>\nСхвалені позиції від перевірених виробників.");
  for (const p of products) {
    const badge = p.listing_plan === "top" ? "⭐ ТОП\n" : p.listing_plan === "boost" ? "⬆️ Помітне\n" : "";
    const caption = `${badge}<b>${esc(p.title)}</b>\n${Number(p.price_uah).toFixed(0)} грн / ${esc(p.unit)}\n${esc([p.origin_locality, p.origin_oblast].filter(Boolean).join(", "))}`;
    await send(chatId, caption, { reply_markup: { inline_keyboard: [[{ text: "Замовити", callback_data: `buy:${p.id}` }]] } });
  }
}

async function askSellerType(chatId: number, user: any) {
  await setState(user.id, "seller_type", {});
  return send(chatId, "<b>Стати виробником РІДНЕ</b>\nОберіть варіант, який найближче описує вас:", { reply_markup: { inline_keyboard: [
    [{ text: "🌱 Вирощую / виробляю сам", callback_data: "stype:own" }],
    [{ text: "🧺 Крафтове / сімейне виробництво", callback_data: "stype:craft" }],
    [{ text: "🤔 Ще визначаюсь", callback_data: "stype:undecided" }]
  ] } });
}

async function startSeller(chatId: number, user: any) {
  const seller = await sellerFor(user.id);
  if (!seller) return askSellerType(chatId, user);
  if (seller.verification_status === "verified") return chooseCategory(chatId, user);
  if (seller.verification_status === "pending") {
    await send(chatId, "⏳ Профіль виробника вже на перевірці. Це не заважає подати товар — перші 50 заявок на розміщення безкоштовні.");
    return chooseCategory(chatId, user);
  }
  if (seller.verification_status === "suspended") return send(chatId, "Профіль призупинено. Напишіть /support.", { reply_markup: menu() });
  if (seller.verification_status === "rejected") return send(chatId, "Профіль потребує уточнення. Напишіть /support.", { reply_markup: menu() });
  return askSellerType(chatId, user);
}

async function askOblast(chatId: number, user: any, ctx: any) {
  await setState(user.id, "seller_oblast", ctx);
  const buttons = OBLASTS.map((name, i) => ({ text: name, callback_data: `oblast:${i}` }));
  return send(chatId, "<b>Де ви працюєте?</b>\nОберіть область:", { reply_markup: { inline_keyboard: rows(buttons, 2) } });
}

async function askTelegramContact(chatId: number, user: any, context: any) {
  await setState(user.id, "seller_telegram", context);
  return send(chatId, `<b>Як із вами зв’язатися?</b>\nКонтакт: ${telegramContact(user)}.\n\nНомер телефону та державна реєстрація для первинної заявки не потрібні. Після підтвердження одразу перейдемо до створення товару.\n\nНатискаючи кнопку, ви погоджуєтеся з правилами: https://ridne.store/terms/`, {
    reply_markup: { inline_keyboard: [
      [{ text: "✅ Надати мій Telegram", callback_data: "seller:telegram:share" }],
      [{ text: "Скасувати", callback_data: "seller:cancel" }]
    ] }
  });
}

async function submitSeller(chatId: number, user: any, ctx: any) {
  if (user.bot_state !== "seller_telegram" || !["producer_type", "oblast"].every(key => typeof ctx[key] === "string" && ctx[key].trim())) {
    return send(chatId, "Ця кнопка вже неактуальна. Натисніть «Продати», щоб почати знову.", { reply_markup: menu() });
  }
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || "Виробник РІДНЕ";
  const locality = ctx.oblast === "м. Київ" ? "Київ" : "Область уточнюється";
  const payload = {
    user_id: user.id,
    display_name: displayName,
    producer_type: ctx.producer_type,
    oblast: ctx.oblast,
    locality,
    public_origin_text: ctx.oblast,
    contact_preference: "telegram",
    verification_status: "pending",
    submitted_at: new Date().toISOString(),
    terms_accepted_at: new Date().toISOString()
  };
  const { data: seller, error } = await db.from("seller_profiles").upsert(payload, { onConflict: "user_id" }).select("*").single();
  if (error) throw error;
  await db.from("moderation_events").insert({ target_type: "seller", seller_id: seller.id, decision: "submitted" });
  await setState(user.id, "idle", {});
  await send(chatId, "✅ Профіль виробника створено й передано на перевірку.\n\nТепер одразу додамо перший товар. На старті перші 50 заявок на розміщення — безкоштовні.");
  await notifyAdmin(`<b>Новий виробник на перевірку</b>\n${esc(seller.display_name)}\n${esc(seller.oblast)}\nTelegram: ${telegramContact(user)}`, {
    inline_keyboard: [[
      { text: "✅ Схвалити", callback_data: `as:approve:${seller.id}` },
      { text: "↩️ Уточнення", callback_data: `as:changes:${seller.id}` }
    ]]
  });
  return chooseCategory(chatId, user);
}

async function chooseCategory(chatId: number, user: any) {
  const seller = await sellerFor(user.id);
  if (!seller) return askSellerType(chatId, user);
  if (["rejected", "suspended"].includes(seller.verification_status)) return startSeller(chatId, user);
  const quota = await launchQuota();
  if (quota.used >= quota.limit) {
    await setState(user.id, "idle", {});
    return send(chatId, `Перші ${quota.limit} безкоштовних заявок уже використані. Нові розміщення тимчасово призупинені, поки РІДНЕ готує наступну модель розміщення.`, { reply_markup: menu() });
  }
  const { data, error } = await db.from("categories").select("slug,name_uk").neq("publication_mode", "blocked").eq("is_active", true).order("sort_order");
  if (error) throw error;
  const buttons = (data || []).map((c: any) => ({ text: c.name_uk, callback_data: `pcat:${c.slug}` }));
  await setState(user.id, "product_category", {});
  return send(chatId, `<b>1/7 · Що продаєте?</b>\nОберіть категорію товару. Безкоштовних заявок залишилось: <b>${Math.max(0, quota.limit - quota.used)}</b>.`, { reply_markup: { inline_keyboard: rows(buttons, 2) } });
}

async function askProductChoice(chatId: number, user: any, categorySlug: string) {
  const choices = PRODUCT_CHOICES[categorySlug] || ["Інший локальний товар"];
  await setState(user.id, "product_item", { category_slug: categorySlug });
  const buttons = choices.map((label, i) => ({ text: label, callback_data: `pitem:${i}` }));
  return send(chatId, "<b>2/7 · Оберіть товар</b>\nНе потрібно нічого вводити вручну:", { reply_markup: { inline_keyboard: rows(buttons, 2) } });
}

async function askUnit(chatId: number, user: any, ctx: any) {
  await setState(user.id, "product_unit", ctx);
  const buttons = Object.entries(UNITS).map(([key, label]) => ({ text: label, callback_data: `punit:${key}` }));
  return send(chatId, `<b>3/7 · Як продаєте?</b>\n${esc(ctx.title)} — оберіть одиницю:`, { reply_markup: { inline_keyboard: rows(buttons, 2) } });
}

function priceOptions(unitKey: string) {
  if (unitKey === "piece") return [10, 20, 30, 50, 75, 100, 150, 250];
  if (unitKey === "g100") return [20, 30, 40, 50, 75, 100, 150, 200];
  if (unitKey === "g500") return [30, 50, 75, 100, 150, 200, 300, 400];
  if (unitKey === "jar" || unitKey === "pack") return [50, 75, 100, 150, 200, 250, 300, 500];
  return [30, 50, 75, 100, 150, 200, 300, 500];
}

async function askPrice(chatId: number, user: any, ctx: any) {
  await setState(user.id, "product_price", ctx);
  const buttons = priceOptions(ctx.unit_key).map(price => ({ text: `${price} грн`, callback_data: `pprice:${price}` }));
  return send(chatId, `<b>4/7 · Ціна</b>\nСкільки коштує ${esc(ctx.unit)}?`, { reply_markup: { inline_keyboard: rows(buttons, 2) } });
}

async function askQuantity(chatId: number, user: any, ctx: any) {
  await setState(user.id, "product_quantity", ctx);
  const quantities = [1, 5, 10, 20, 50, 100];
  const buttons = quantities.map(q => ({ text: `${q} ${ctx.unit}`, callback_data: `pqty:${q}` }));
  return send(chatId, "<b>5/7 · Скільки є в наявності?</b>", { reply_markup: { inline_keyboard: rows(buttons, 2) } });
}

async function askStorage(chatId: number, user: any, ctx: any) {
  await setState(user.id, "product_storage", ctx);
  const buttons = Object.entries(STORAGES).map(([key, label]) => ({ text: label, callback_data: `pstorage:${key}` }));
  return send(chatId, "<b>6/7 · Зберігання</b>\nОберіть умови зберігання:", { reply_markup: { inline_keyboard: buttons.map(b => [b]) } });
}

async function askPhoto(chatId: number, user: any, ctx: any) {
  await setState(user.id, "product_photo", ctx);
  return send(chatId, "<b>7/7 · Фото товару</b>\nНадішліть одне реальне фото товару або пропустіть цей крок.", {
    reply_markup: { inline_keyboard: [[{ text: "Пропустити фото", callback_data: "photo:skip" }], [{ text: "Скасувати", callback_data: "seller:cancel" }]] }
  });
}

async function submitLaunchProduct(chatId: number, user: any, ctx: any) {
  const seller = await sellerFor(user.id);
  if (!seller || ["rejected", "suspended"].includes(seller.verification_status)) {
    await setState(user.id, "idle", {});
    return send(chatId, "Профіль виробника не може зараз додавати товари. Напишіть /support.", { reply_markup: menu() });
  }
  const { data: category } = await db.from("categories").select("id,name_uk,publication_mode").eq("slug", ctx.category_slug).maybeSingle();
  if (!category || category.publication_mode === "blocked") {
    await setState(user.id, "idle", {});
    return send(chatId, "Ця категорія зараз недоступна.", { reply_markup: menu() });
  }

  const { data, error } = await db.rpc("submit_launch_free_product", {
    p_seller_id: seller.id,
    p_category_id: category.id,
    p_title: ctx.title,
    p_description: `${ctx.title}. Локальний товар від виробника РІДНЕ.`,
    p_price_uah: ctx.price,
    p_unit: ctx.unit,
    p_available_quantity: ctx.quantity,
    p_origin_oblast: seller.oblast,
    p_origin_locality: seller.locality,
    p_storage_requirements: ctx.storage,
    p_telegram_photo_file_ids: ctx.photo_file_id ? [ctx.photo_file_id] : [],
    p_fulfillment_options: seller.fulfillment_options || []
  });
  if (error) throw error;
  const claimed = Array.isArray(data) ? data[0] : data;
  await setState(user.id, "idle", {});
  if (!claimed?.product_id) {
    const quota = await launchQuota();
    return send(chatId, `Безкоштовний стартовий ліміт ${quota.limit} заявок уже вичерпано. Нові розміщення тимчасово призупинені — модель монетизації визначимо окремо.`, { reply_markup: menu() });
  }

  await send(chatId, `✅ <b>Заявку прийнято безкоштовно.</b>\nТовар «${esc(ctx.title)}» передано на модерацію.\n\nЦе заявка <b>${claimed.slot_no}/${claimed.slot_limit}</b> стартового безкоштовного набору.`, { reply_markup: menu() });
  await notifyAdmin(`<b>Новий безкоштовний товар на модерацію</b>\n${esc(ctx.title)}\n${Number(ctx.price).toFixed(0)} грн / ${esc(ctx.unit)}\nСтартова заявка: ${claimed.slot_no}/${claimed.slot_limit}\nВиробник: ${esc(seller.display_name)}\nСтатус виробника: ${esc(seller.verification_status)}`, {
    inline_keyboard: [[
      { text: "✅ Опублікувати", callback_data: `ap:approve:${claimed.product_id}` },
      { text: "↩️ Уточнення", callback_data: `ap:changes:${claimed.product_id}` }
    ]]
  });
}

async function showProfile(chatId: number, user: any) {
  const seller = await sellerFor(user.id);
  if (!seller) return send(chatId, "Ви ще не створили профіль виробника.", { reply_markup: { inline_keyboard: [[{ text: "Стати виробником", callback_data: "menu:sell" }], [{ text: "← Меню", callback_data: "menu:home" }]] } });
  return send(chatId, `<b>${esc(seller.display_name)}</b>\nСтатус: <b>${esc(seller.verification_status)}</b>\nЛокація: ${esc([seller.locality, seller.oblast].filter(Boolean).join(", "))}\nКонтакт: ${telegramContact(user)}`, { reply_markup: menu() });
}

async function showOrders(chatId: number, user: any) {
  const seller = await sellerFor(user.id);
  let q = db.from("orders").select("id,status,total,created_at,seller_id,buyer_id").order("created_at", { ascending: false }).limit(10);
  q = seller ? q.or(`buyer_id.eq.${user.id},seller_id.eq.${seller.id}`) : q.eq("buyer_id", user.id);
  const { data } = await q;
  if (!data?.length) return send(chatId, "Замовлень поки немає.", { reply_markup: menu() });
  const lines = data.map((o: any) => `• ${o.id.slice(0, 8)} · ${esc(o.status)} · ${Number(o.total).toFixed(2)} грн`).join("\n");
  return send(chatId, `<b>Останні замовлення</b>\n${lines}`, { reply_markup: menu() });
}

async function createOrder(chatId: number, user: any, productId: string) {
  const { data: p } = await db.from("public_product_catalog").select("*").eq("id", productId).maybeSingle();
  if (!p) return send(chatId, "Цей товар уже недоступний.", { reply_markup: menu() });
  const subtotal = Number(p.price_uah);
  const commissionBps = 0;
  const fee = Math.round(subtotal * commissionBps) / 10000;
  const { data: order, error } = await db.from("orders").insert({
    buyer_id: user.id,
    seller_id: p.seller_id,
    status: "new",
    subtotal,
    total: subtotal,
    marketplace_fee: fee,
    commission_bps: commissionBps,
    payment_status: "disabled",
    fulfillment_method: "to_be_agreed"
  }).select("*").single();
  if (error) throw error;
  await db.from("order_items").insert({ order_id: order.id, product_id: p.id, product_title_snapshot: p.title, unit_snapshot: p.unit, unit_price: subtotal, quantity: 1, line_total: subtotal });
  const { data: seller } = await db.from("seller_profiles").select("user_id,display_name").eq("id", p.seller_id).single();
  if (seller) {
    const { data: su } = await db.from("marketplace_users").select("telegram_user_id").eq("id", seller.user_id).single();
    if (su?.telegram_user_id) await send(su.telegram_user_id, `<b>Нова заявка</b>\n${esc(p.title)} · ${subtotal.toFixed(2)} грн\nНомер: ${order.id.slice(0, 8)}\nОнлайн-оплата товару поки вимкнена.`);
  }
  return send(chatId, `<b>Заявку створено</b>\n${esc(p.title)} · ${subtotal.toFixed(2)} грн\nНомер: ${order.id.slice(0, 8)}\nПродавець отримав повідомлення.`, { reply_markup: menu() });
}

async function adminSellerDecision(fromId: number, chatId: number, action: string, sellerId: string) {
  const c = await cfg();
  if (String(fromId) !== String(c.admin_telegram_id)) return send(chatId, "Недостатньо прав.");
  if(action!=="approve")return send(chatId,"Відкрийте заявку в адмін-панелі й натисніть «Запросити дані»: оберіть конкретні поля та напишіть прохання.",{reply_markup:{inline_keyboard:[[{text:"Відкрити адмін-панель",url:"https://ridne.store/admin/moderation/"}]]}});
  const patch = action === "approve"
    ? { verification_status: "verified", verified_at: new Date().toISOString(), rejection_reason: null }
    : { verification_status: "rejected", rejection_reason: "Потрібні уточнення" };
  const { data: seller } = await db.from("seller_profiles").update(patch).eq("id", sellerId).select("*").single();
  await db.from("moderation_events").insert({ target_type: "seller", seller_id: sellerId, decision: action === "approve" ? "approved" : "needs_changes", admin_telegram_user_id: fromId });
  const { data: u } = await db.from("marketplace_users").select("telegram_user_id").eq("id", seller.user_id).single();
  if (action === "approve") await db.from("marketplace_users").update({ role: "seller" }).eq("id", seller.user_id);
  if (u?.telegram_user_id) await send(u.telegram_user_id, action === "approve" ? "✅ Профіль виробника РІДНЕ перевірено. Товари можна публікувати після модерації." : "Профіль потребує уточнень. Напишіть /support.", { reply_markup: menu() });
  return send(chatId, action === "approve" ? "Виробника схвалено." : "Повернуто на уточнення.");
}

async function adminProductDecision(fromId: number, chatId: number, action: string, productId: string) {
  const c = await cfg();
  if (String(fromId) !== String(c.admin_telegram_id)) return send(chatId, "Недостатньо прав.");
  if(action!=="approve")return send(chatId,"Відкрийте заявку в адмін-панелі й натисніть «Запросити дані»: оберіть конкретні поля та напишіть прохання.",{reply_markup:{inline_keyboard:[[{text:"Відкрити адмін-панель",url:"https://ridne.store/admin/moderation/"}]]}});
  const { data: p } = await db.from("products").select("*,categories(slug,name_uk,publication_mode),seller_profiles(user_id,display_name,verification_status)").eq("id", productId).single();
  if (!p) return;
  if (action === "approve" && !["free_launch", "paid", "legacy"].includes(p.listing_payment_status)) return send(chatId, "Не можна схвалити: заявка не має активного права на розміщення.");
  if (action === "approve" && (p.seller_profiles.verification_status !== "verified" || p.categories.publication_mode === "blocked")) return send(chatId, "Не можна схвалити: продавець ще не перевірений або категорія заблокована.");
  let publicImageUrls = p.public_image_urls || [];
  if (action === "approve" && p.web_image_path && !publicImageUrls.length) {
    const { data: original, error: downloadError } = await db.storage.from("ridne-web-products").download(p.web_image_path);
    if (downloadError || !original) return send(chatId, "Не вдалося підготувати фото товару. Спробуйте ще раз.");
    const ext = p.web_image_path.split(".").pop() || "webp";
    const publicPath = `products/${p.id}/cover.${ext}`;
    const { error: uploadError } = await db.storage.from("ridne-product-images").upload(publicPath, original, { contentType: original.type || `image/${ext}`, upsert: true });
    if (uploadError) return send(chatId, "Не вдалося опублікувати фото товару. Спробуйте ще раз.");
    publicImageUrls = [db.storage.from("ridne-product-images").getPublicUrl(publicPath).data.publicUrl];
  }
  const patch = action === "approve"
    ? { status: "approved", approved_at: new Date().toISOString(), moderation_reason: null, public_image_urls: publicImageUrls }
    : { status: "rejected", moderation_reason: "Потрібні уточнення" };
  await db.from("products").update(patch).eq("id", productId);
  await db.from("moderation_events").insert({ target_type: "product", product_id: productId, seller_id: p.seller_id, decision: action === "approve" ? "approved" : "needs_changes", admin_telegram_user_id: fromId });
  const { data: u } = await db.from("marketplace_users").select("telegram_user_id").eq("id", p.seller_profiles.user_id).single();
  if (u?.telegram_user_id) await send(u.telegram_user_id, action === "approve" ? `✅ Товар «${esc(p.title)}» схвалено та опубліковано.` : `Товар «${esc(p.title)}» потребує уточнень.`);
  if (action === "approve" && c.channel_id) await send(c.channel_id, `<b>${esc(p.title)}</b>\n${Number(p.price_uah).toFixed(2)} грн / ${esc(p.unit)}\nВиробник: ${esc(p.seller_profiles.display_name)}\n${esc([p.origin_locality, p.origin_oblast].filter(Boolean).join(", "))}\n\n${c.site_url}`);
  return send(chatId, action === "approve" ? "Товар схвалено." : "Товар повернуто на уточнення.");
}

async function handleChannelPost(message: any) {
  const chatId = message?.chat?.id;
  const body = String(message?.text || "").trim();
  if (!chatId || !body.startsWith("/connectridneadmin")) return;
  const token = body.split(/\s+/, 2)[1] || "";
  return connectModerationChannel(chatId, token);
}

async function adminStats(chatId: number, fromId: number) {
  const c = await cfg();
  if (String(fromId) !== String(c.admin_telegram_id)) return;
  const quota = await launchQuota();
  const [{ count: sellers }, { count: products }, { count: orders }, { count: support }] = await Promise.all([
    db.from("seller_profiles").select("*", { count: "exact", head: true }).eq("verification_status", "pending"),
    db.from("products").select("*", { count: "exact", head: true }).eq("status", "pending"),
    db.from("orders").select("*", { count: "exact", head: true }).eq("status", "new"),
    db.from("support_requests").select("*", { count: "exact", head: true }).eq("status", "open")
  ]);
  return send(chatId, `<b>Адмін РІДНЕ</b>\nВиробники на перевірці: ${sellers || 0}\nТовари на модерації: ${products || 0}\nБезкоштовні заявки: ${quota.used}/${quota.limit}\nЗалишилось безкоштовних: ${Math.max(0, quota.limit - quota.used)}\nНові замовлення: ${orders || 0}\nЗвернення: ${support || 0}`);
}

async function handleText(chatId: number, user: any, message: any) {
  const text = String(message.text || "").trim();
  if (text.startsWith("/start")) {
    const payload = text.split(/\s+/, 2)[1] || "";
    if (payload.startsWith("owner_")) return claimOwner(chatId, user, payload.slice(6));
    await setState(user.id, "idle", {});
    if (payload === "sell") return startSeller(chatId, user);
    return showMenu(chatId, user);
  }
  if (text === "/menu") { await setState(user.id, "idle", {}); return showMenu(chatId, user); }
  if (text === "/terms") return send(chatId, "Правила РІДНЕ: https://ridne.store/terms/");
  if (text === "/support") { await setState(user.id, "support_message", {}); return send(chatId, "Напишіть одним повідомленням, з чим потрібна допомога. Підтримка РІДНЕ отримає звернення."); }
  if (text === "/admin") return adminStats(chatId, user.telegram_user_id);

  const state = user.bot_state || "idle";
  const ctx: any = user.bot_context || {};
  if(state==='review_reply'){
    if(text.length<3)return send(chatId,'Напишіть конкретну відповідь на запит адміністратора.');
    const {data:r}=await db.from('seller_review_requests').select('*,seller_profiles(user_id)').eq('id',ctx.review_id).eq('status','needs_data').maybeSingle();
    if(!r||r.seller_profiles?.user_id!==user.id){await setState(user.id,'idle',{});return send(chatId,'Запит уже опрацьовано.');}
    if((r.requested_fields||[]).some((f:string)=>['photo','document'].includes(f))){await db.from('seller_review_requests').update({reply:text.slice(0,2000),replied_at:new Date().toISOString()}).eq('id',r.id);}else{const {error}=await db.rpc('reply_telegram_review',{p_marketplace_user_id:user.id,p_review_id:r.id,p_reply:text.slice(0,2000),p_seller_patch:{},p_product_patch:{},p_file_path:null,p_file_bucket:null});if(error)throw error;}
    await notifyAdmin(`<b>Виробник відповів на запит даних</b>\n${telegramContact(user)}\n${esc(text.slice(0,2000))}\n\nhttps://ridne.store/admin/moderation/`);
    await setState(user.id,'idle',{});
    return send(chatId,'Відповідь передано адміністратору. Якщо потрібен файл, надішліть його через /support.',{reply_markup:menu()});
  }
  if (state === "support_message") {
    if (!text) return send(chatId, "Будь ласка, надішліть текстове повідомлення.");
    await db.from("support_requests").insert({ user_id: user.id, message: text });
    await notifyAdmin(`<b>Звернення в підтримку</b>\nTelegram ID: ${user.telegram_user_id}\n${esc(text)}`);
    await setState(user.id, "idle", {});
    return send(chatId, "Дякую. Звернення передано підтримці.", { reply_markup: menu() });
  }
  if (state === "product_photo" && message.photo?.length) {
    ctx.photo_file_id = message.photo[message.photo.length - 1].file_id;
    return submitLaunchProduct(chatId, user, ctx);
  }
  if (state === "product_photo") return send(chatId, "Надішліть фото товару або натисніть «Пропустити фото».", { reply_markup: { inline_keyboard: [[{ text: "Пропустити фото", callback_data: "photo:skip" }]] } });
  if (state.startsWith("seller_") || state.startsWith("product_")) return send(chatId, "На цьому кроці нічого вводити не потрібно — оберіть варіант кнопкою вище.");
  return showMenu(chatId, user);
}

async function handleCallback(chatId: number, from: any, user: any, callback: any) {
  const data = String(callback.data || "");
  await tg("answerCallbackQuery", { callback_query_id: callback.id });
  if(data.startsWith('review:')){
    const id=data.slice(7);const {data:r}=await db.from('seller_review_requests').select('*,seller_profiles(user_id)').eq('id',id).eq('status','needs_data').maybeSingle();
    if(!r||r.seller_profiles?.user_id!==user.id)return send(chatId,'Запит уже опрацьовано або недоступний.');
    await setState(user.id,'review_reply',{review_id:id});
    return send(chatId,`<b>Що потрібно доповнити</b>\n${esc(r.reason)}\n\nНадішліть відповідь одним текстовим повідомленням. Вона збережеться разом із заявкою для адміністратора. Якщо потрібен файл, скористайтеся підтримкою /support.`);
  }
  if (data === "menu:home") return showMenu(chatId, user);
  if (data === "menu:buy") return browse(chatId);
  if (data === "menu:sell") return startSeller(chatId, user);
  if (data === "menu:profile") return showProfile(chatId, user);
  if (data === "menu:orders") return showOrders(chatId, user);
  if (data === "menu:about") {
    const quota = await launchQuota();
    return send(chatId, `<b>Як працює РІДНЕ</b>\n1. Виробник створює профіль.\n2. Додає товар кнопками без довгих анкет.\n3. Перші <b>${quota.limit}</b> заявок на розміщення безкоштовні.\n4. Виробник і товар проходять модерацію.\n5. Після схвалення товар з’являється в каталозі.\n\nЗараз використано: <b>${quota.used}/${quota.limit}</b>.\n\nhttps://ridne.store`, { reply_markup: menu() });
  }
  if (data === "seller:cancel") { await setState(user.id, "idle", {}); return showMenu(chatId, user); }

  if (data.startsWith("stype:")) {
    const key = data.slice(6);
    const type = PRODUCER_TYPES[key];
    if (!type) return askSellerType(chatId, user);
    return askOblast(chatId, user, { producer_type: type });
  }
  if (data.startsWith("oblast:")) {
    const idx = Number(data.slice(7));
    const oblast = OBLASTS[idx];
    if (!oblast) return startSeller(chatId, user);
    const ctx: any = user.bot_context || {};
    ctx.oblast = oblast;
    return askTelegramContact(chatId, user, ctx);
  }
  if (data === "seller:telegram:share") return submitSeller(chatId, user, user.bot_context || {});

  if (data.startsWith("pcat:")) return askProductChoice(chatId, user, data.slice(5));
  if (data.startsWith("pitem:")) {
    const ctx: any = user.bot_context || {};
    const choices = PRODUCT_CHOICES[ctx.category_slug] || ["Інший локальний товар"];
    const item = choices[Number(data.slice(6))];
    if (!item) return chooseCategory(chatId, user);
    ctx.title = item;
    return askUnit(chatId, user, ctx);
  }
  if (data.startsWith("punit:")) {
    const ctx: any = user.bot_context || {};
    const key = data.slice(6);
    const unit = UNITS[key];
    if (!unit) return askUnit(chatId, user, ctx);
    ctx.unit_key = key;
    ctx.unit = unit;
    return askPrice(chatId, user, ctx);
  }
  if (data.startsWith("pprice:")) {
    const ctx: any = user.bot_context || {};
    const price = Number(data.slice(7));
    if (!priceOptions(ctx.unit_key).includes(price)) return askPrice(chatId, user, ctx);
    ctx.price = price;
    return askQuantity(chatId, user, ctx);
  }
  if (data.startsWith("pqty:")) {
    const ctx: any = user.bot_context || {};
    const quantity = Number(data.slice(5));
    if (![1, 5, 10, 20, 50, 100].includes(quantity)) return askQuantity(chatId, user, ctx);
    ctx.quantity = quantity;
    return askStorage(chatId, user, ctx);
  }
  if (data.startsWith("pstorage:")) {
    const ctx: any = user.bot_context || {};
    const key = data.slice(9);
    const storage = STORAGES[key];
    if (!storage) return askStorage(chatId, user, ctx);
    ctx.storage = storage;
    return askPhoto(chatId, user, ctx);
  }
  if (data === "photo:skip") {
    const ctx: any = user.bot_context || {};
    ctx.photo_file_id = null;
    return submitLaunchProduct(chatId, user, ctx);
  }

  if (data.startsWith("buy:")) return createOrder(chatId, user, data.slice(4));
  if (data.startsWith("as:")) { const [, action, id] = data.split(":"); return adminSellerDecision(from.id, chatId, action, id); }
  if (data.startsWith("ap:")) { const [, action, id] = data.split(":"); return adminProductDecision(from.id, chatId, action, id); }
  return showMenu(chatId, user);
}

async function bootstrap() {
  if (!BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const c = await cfg();
  const info = await tg("getMe");
  const webhook = await tg("setWebhook", {
    url: WEBHOOK_URL,
    secret_token: c.webhook_secret,
    allowed_updates: ["message", "callback_query", "channel_post"],
    drop_pending_updates: false,
    max_connections: 20
  });
  const setup = await Promise.allSettled([
    tg("setMyName", { name: "РІДНЕ" }),
    tg("setMyDescription", { description: "РІДНЕ — український маркетплейс локальних продуктів. Купуйте у перевірених виробників або подавайте власні товари через простий Telegram-флоу. Перші 50 заявок на розміщення безкоштовні." }),
    tg("setMyShortDescription", { short_description: "Локальні продукти від українських виробників · ridne.store" }),
    tg("setMyCommands", { commands: [
      { command: "start", description: "Відкрити РІДНЕ" },
      { command: "menu", description: "Головне меню" },
      { command: "terms", description: "Правила платформи" },
      { command: "support", description: "Підтримка" }
    ] }),
    tg("setChatMenuButton", { menu_button: { type: "commands" } })
  ]);
  const hookInfo = await tg("getWebhookInfo");
  return { ok: true, username: info.username, webhook, webhook_url: hookInfo.url, pending_update_count: hookInfo.pending_update_count, allowed_updates: hookInfo.allowed_updates, setup: setup.map(x => x.status) };
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  if (req.method === "GET") {
    if (url.searchParams.get("bootstrap") === "1") {
      const config = await cfg();
      const oneTimeToken = url.searchParams.get("token") || "";
      const { data: claim } = await db.from("marketplace_settings").select("value").eq("key", "telegram_bootstrap_claim").maybeSingle();
      const authorized = req.headers.get("x-telegram-bot-api-secret-token") === config.webhook_secret || (oneTimeToken && String(claim?.value) === oneTimeToken);
      if (!authorized) return json({ error: "unauthorized" }, 401);
      try {
        const result = await bootstrap();
        if (oneTimeToken) await db.from("marketplace_settings").delete().eq("key", "telegram_bootstrap_claim");
        return json(result);
      } catch (e) { return json({ ok: false, error: String(e) }, 500); }
    }
    if (url.searchParams.get("sync_moderation") === "1") {
      const oneTimeToken = url.searchParams.get("token") || "";
      const { data: claim } = await db.from("marketplace_settings").select("value").eq("key", "telegram_moderation_sync_claim").maybeSingle();
      if (!oneTimeToken || String(claim?.value) !== oneTimeToken) return json({ error: "unauthorized" }, 401);
      try {
        const result = await syncPendingModeration();
        await db.from("marketplace_settings").delete().eq("key", "telegram_moderation_sync_claim");
        return json(result, result.ok ? 200 : 500);
      } catch (e) { return json({ ok: false, error: String(e) }, 500); }
    }
    const c = await cfg();
    const quota = await launchQuota();
    return json({ ok: true, service: "ridne-telegram", release: "moderation-admin-v8", bot_configured: Boolean(BOT_TOKEN), bot_username: c.bot_username, admin_configured: Boolean(c.admin_telegram_id), moderation_channel_configured: Boolean(c.moderation_chat_id), monetization_mode: "launch_free", free_listings_used: quota.used, free_listings_limit: quota.limit, payments_enabled: false });
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const c = await cfg();
  if (!BOT_TOKEN) return json({ error: "telegram_not_configured" }, 503);
  if (req.headers.get("x-telegram-bot-api-secret-token") !== c.webhook_secret) return json({ error: "unauthorized" }, 401);
  try {
    const update = await req.json();
    if (update.channel_post) {
      await handleChannelPost(update.channel_post);
      return json({ ok: true });
    }
    const eventType = update.callback_query ? "callback_query" : "message";
    const from = update.message?.from || update.callback_query?.from;
    const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
    if (from) {
      await db.from("bot_events").upsert({ telegram_update_id: update.update_id, event_type: eventType, telegram_user_id: from.id, payload: update }, { onConflict: "telegram_update_id", ignoreDuplicates: true });
    }
    if (!from || !chatId) return json({ ok: true });
    const user = await ensureUser(from);
    if (update.callback_query) await handleCallback(chatId, from, user, update.callback_query);
    else await handleText(chatId, user, update.message);
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ ok: true });
  }
});
