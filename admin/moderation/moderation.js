"use strict";
const $ = (s, root = document) => root.querySelector(s);
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const cfg = window.RIDNE_CONFIG;
const client = window.supabase?.createClient(cfg.url, cfg.key, {
  auth: {
    flowType: "pkce",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
const ADMIN_EMAIL = "doctorgebel@gmail.com";
const LABELS = {
  email: "Контактний email",
  phone: "Контактний телефон",
  origin: "Походження продукту",
  description: "Опис товару",
  ingredients: "Склад",
  storage: "Умови зберігання",
  photo: "Реальне фото товару",
  document: "Конкретний документ",
  other: "Інша інформація",
};
const STATUSES = {
  pending: "На перевірці",
  verified: "Схвалено",
  rejected: "Очікуємо дані",
  suspended: "Призупинено",
  draft: "Чернетка",
};
let currentData = null,
  activeTab = "queue",
  loading = false;
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  setTimeout(() => ($("#toast").hidden = true), 7000);
}
const one = (v) => (Array.isArray(v) ? v[0] : v);
const date = (v) => (v ? new Date(v).toLocaleString("uk-UA") : "—");
async function api(action, data = {}) {
  if (!client) throw Error("Сервіс входу не завантажився. Оновіть сторінку.");
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) throw Error("Увійдіть у свій акаунт власника.");
  const r = await fetch(cfg.url + "/functions/v1/ridne-web", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: cfg.key,
      Authorization: "Bearer " + session.access_token,
    },
    body: JSON.stringify({ action, ...data }),
  });
  const result = await r.json();
  if (!r.ok) {
    if (r.status === 401 || r.status === 403)
      showLogin("Цей розділ доступний лише власнику РІДНЕ.");
    throw Error(result.error || "Не вдалося виконати дію.");
  }
  return result;
}
function meta(items) {
  return `<dl class="moderation-meta">${items
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(
      ([k, v]) =>
        `<div><dt>${esc(k)}</dt><dd>${esc(Array.isArray(v) ? v.join(", ") : v)}</dd></div>`,
    )
    .join("")}</dl>`;
}
function contacts(s) {
  const u = one(s.marketplace_users) || s;
  return `<div class="admin-contacts">${s.email ? `<a href="mailto:${esc(s.email)}">${esc(s.email)}</a>` : ""}${s.phone ? `<a href="tel:${esc(s.phone.replace(/[^+\d]/g, ""))}">${esc(s.phone)}</a>` : ""}${u.telegram_username ? `<a target="_blank" rel="noopener" href="https://t.me/${encodeURIComponent(u.telegram_username)}">@${esc(u.telegram_username)}</a>` : u.telegram_user_id ? `<a href="tg://user?id=${encodeURIComponent(u.telegram_user_id)}">Telegram ${esc(u.telegram_user_id)}</a>` : ""}</div>`;
}
function actions(type, id, disabled = false) {
  return `<div class="moderation-actions"><button class="btn primary" data-decision="approve" data-type="${type}" data-id="${id}" ${disabled ? "disabled" : ""}>Схвалити</button><button class="btn secondary" data-decision="request" data-type="${type}" data-id="${id}">Запросити дані</button></div>`;
}
function replies(type, id) {
  return (currentData.reviews || [])
    .filter(
      (r) =>
        (type === "product"
          ? r.product_id === id
          : r.seller_id === id && !r.product_id) && r.reply,
    )
    .map(
      (r) =>
        `<div class="review-answer"><strong>Відповідь виробника · ${date(r.replied_at)}</strong><p>${esc(r.reply)}</p>${r.file_url ? `<a href="${esc(r.file_url)}" target="_blank" rel="noopener">Відкрити наданий файл</a>` : ""}</div>`,
    )
    .join("");
}
function render(data) {
  currentData = data;
  $("#seller-count").textContent = data.sellers.length;
  $("#product-count").textContent = data.products.length;
  $("#seller-queue").innerHTML = data.sellers.length
    ? data.sellers
        .map(
          (s) =>
            `<article class="moderation-card"><span class="account-kicker">Виробник · ${date(s.submitted_at || s.created_at)}</span><h3>${esc(s.display_name)}</h3>${contacts(s)}${meta(
              [
                ["Виробництво", s.producer_type],
                ["Локація", [s.locality, s.oblast].filter(Boolean).join(", ")],
                ["Про себе", s.story],
                ["Доставка", s.fulfillment_options],
              ],
            )}${replies("seller", s.id)}${actions("seller", s.id)}</article>`,
        )
        .join("")
    : '<div class="queue-empty">Нових профілів немає.</div>';
  $("#product-queue").innerHTML = data.products.length
    ? data.products
        .map((p) => {
          const s = one(p.seller_profiles) || {},
            cat = one(p.categories) || {};
          const blocked =
            s.verification_status !== "verified" ||
            cat.publication_mode === "blocked";
          return `<article class="moderation-card">${p.image_url ? `<img class="moderation-photo" src="${esc(p.image_url)}" alt="${esc(p.title)}">` : ""}<span class="account-kicker">Товар · ${date(p.submitted_at || p.created_at)}</span><h3>${esc(p.title)}</h3><p>${esc(p.description || "Без опису")}</p>${meta(
            [
              [
                "Ціна",
                Number(p.price_uah).toLocaleString("uk-UA") + " ₴ / " + p.unit,
              ],
              ["Кількість", p.available_quantity],
              ["Категорія", cat.name_uk],
              ["Виробник", s.display_name],
              ["Статус виробника", STATUSES[s.verification_status]],
              [
                "Походження",
                [p.origin_locality, p.origin_oblast].filter(Boolean).join(", "),
              ],
              ["Склад", p.ingredients],
              ["Зберігання", p.storage_requirements],
              ["Виготовлено", p.harvest_or_production_date],
              ["Вжити до", p.best_before],
              ["Доставка", p.fulfillment_options],
            ],
          )}${contacts(s)}${replies("product", p.id)}${blocked ? '<p class="admin-warning">Спочатку схваліть виробника. Для закритої категорії публікація недоступна.</p>' : ""}${actions("product", p.id, blocked)}</article>`;
        })
        .join("")
    : '<div class="queue-empty">Нових товарів немає.</div>';
  renderUsers();
  renderHistory();
  const failed = [
    ...(data.notifications?.moderation || []),
    ...(data.notifications?.registrations || []),
  ].filter((x) => ["failed", "pending"].includes(x.status)).length;
  $("#admin-status").textContent =
    `Оновлено ${new Date().toLocaleTimeString("uk-UA")}. ${failed ? `Сповіщень очікують доставки: ${failed}.` : ""}`;
}
function renderUsers() {
  const q = ($("#admin-search").value || "").toLowerCase();
  const users = [
    ...(currentData.users || []).map((w) => ({
      ...w,
      source: "Сайт",
      is_blocked: w.marketplace_users?.is_blocked,
      seller: currentData.all_sellers.find(
        (s) => s.user_id === w.marketplace_user_id,
      ),
    })),
    ...(currentData.telegram_users || []).map((u) => ({
      ...u,
      display_name:
        [u.first_name, u.last_name].filter(Boolean).join(" ") ||
        "Користувач Telegram",
      source: "Telegram",
      seller: currentData.all_sellers.find((s) => s.user_id === u.id),
    })),
  ];
  $("#users-list").innerHTML =
    users
      .filter((u) =>
        [u.display_name, u.email, u.telegram_username, u.seller?.display_name]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
      .map(
        (u) =>
          `<article class="moderation-card"><span class="account-kicker">${u.source} · ${date(u.created_at)}</span><h3>${esc(u.seller?.display_name || u.display_name)}</h3><p>${u.seller ? "Виробник · " + esc(STATUSES[u.seller.verification_status]) : "Покупець · реєстрацію завершено"}</p>${contacts({ ...u, ...u.seller })}${meta(
            [
              [
                "Локація",
                [u.locality || u.seller?.locality, u.oblast || u.seller?.oblast]
                  .filter(Boolean)
                  .join(", "),
              ],
              ["Категорії", u.category_slugs],
            ],
          )}${u.seller?.rejection_reason ? `<p>Запитано: ${esc(u.seller.rejection_reason)}</p>` : ""}${u.user_id ? `<div class="moderation-actions"><button class="btn secondary" data-edit-user="${esc(u.user_id)}">Редагувати</button><button class="btn secondary" data-toggle-user="${esc(u.user_id)}">${u.is_blocked ? "Відновити" : "Призупинити"}</button><button class="btn tertiary" data-delete-user="${esc(u.user_id)}">Видалити акаунт</button></div>` : ""}</article>`,
      )
      .join("") || '<p class="queue-empty">Нікого не знайдено.</p>';
}
function renderHistory() {
  const delivery = {
    sent: "Доставлено",
    pending: "Очікує доставки",
    failed: "Помилка доставки",
    unavailable: "Лише в кабінеті — зовнішній канал не налаштовано",
  };
  $("#review-history").innerHTML =
    (currentData.reviews || [])
      .map((r) => {
        const s =
          currentData.all_sellers.find((s) => s.id === r.seller_id) || {};
        return `<article class="moderation-card"><strong>${esc(s.display_name || "Виробник")} · ${r.status === "needs_data" ? "Очікуємо відповідь" : r.status === "resubmitted" ? "Дані надійшли" : "Вирішено"}</strong><p>${esc(r.reason)}</p><small>${esc(delivery[r.delivery_status])}${r.delivery_channel ? " · " + esc(r.delivery_channel) : ""}</small>${r.delivery_status !== "sent" && s.email ? `<a href="mailto:${esc(s.email)}?subject=${encodeURIComponent("РІДНЕ: доповніть заявку")}&body=${encodeURIComponent(r.reason + "\n\nВідповісти: https://ridne.store/account/?review=" + r.id)}">Написати виробнику з вашої пошти</a>` : ""}${r.reply ? `<div class="review-answer"><b>Відповідь</b><p>${esc(r.reply)}</p>${r.file_url ? `<a target="_blank" rel="noopener" href="${esc(r.file_url)}">Наданий файл</a>` : ""}</div>` : ""}</article>`;
      })
      .join("") || '<p class="queue-empty">Запитів даних ще немає.</p>';
  $("#history-list").innerHTML =
    (currentData.history || [])
      .map(
        (h) =>
          `<p class="history-row"><strong>${esc(one(h.products)?.title || one(h.seller_profiles)?.display_name || "Заявка")}</strong><span>${esc({ submitted: "Надіслано на перевірку", approved: "Схвалено", needs_changes: "Запитано дані", rejected: "Відхилено" }[h.decision] || h.decision)} · ${date(h.created_at)}</span>${h.reason ? `<small>${esc(h.reason)}</small>` : ""}</p>`,
      )
      .join("") || "<p>Рішень поки немає.</p>";
}
function showLogin(message = "") {
  $("#admin-login").hidden = false;
  $("#admin-app").hidden = true;
  $("#admin-logout").hidden = true;
  $("#admin-login-status").textContent = message;
  currentData = null;
  $("#seller-queue").innerHTML = "";
  $("#product-queue").innerHTML = "";
  $("#users-list").innerHTML = "";
  $("#review-history").innerHTML = "";
  $("#history-list").innerHTML = "";
}
async function load() {
  if (loading) return;
  loading = true;
  try {
    const data = await api("admin-dashboard");
    render(data);
    $("#admin-login").hidden = true;
    $("#admin-app").hidden = false;
    $("#admin-logout").hidden = false;
  } catch (error) {
    if (!currentData) showLogin(error.message);
    else $("#admin-status").textContent = error.message;
  } finally {
    loading = false;
  }
}
async function start() {
  if (!client) {
    showLogin("Не вдалося завантажити вхід. Оновіть сторінку.");
    return;
  }
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) return showLogin();
  if (session.user.email?.toLowerCase() !== ADMIN_EMAIL) {
    showLogin(
      "Ви увійшли як інший користувач. Вийдіть із його акаунта для входу власника.",
    );
    $("#admin-logout").hidden = false;
    return;
  }
  await load();
}
$("#admin-login-form").onsubmit = async (e) => {
  e.preventDefault();
  const b = $("#admin-login-form button");
  b.disabled = true;
  try {
    if (!client) throw Error("Сервіс входу недоступний.");
    const password = new FormData(e.target).get('password');
    const { error } = await client.auth.signInWithPassword({ email: ADMIN_EMAIL, password: String(password) });
    if (error) throw Error('Невірний пароль або електронну пошту ще не підтверджено.');
    await load();
  } catch (error) {
    $("#admin-login-status").textContent = error.message;
    b.disabled = false;
  }
};
$("#admin-reset").onclick = async () => {
  const { error } = await client.auth.resetPasswordForEmail(ADMIN_EMAIL, { redirectTo: 'https://ridne.store/account/' });
  $("#admin-login-status").textContent = error ? 'Не вдалося надіслати лист для встановлення пароля.' : 'Якщо пошта зареєстрована, надіслано лист для встановлення пароля.';
};
$("#admin-logout").onclick = async () => {
  await client.auth.signOut();
  showLogin("Ви вийшли.");
};
$("#admin-search").oninput = renderUsers;
document.querySelectorAll("[data-tab]").forEach(
  (b) =>
    (b.onclick = () => {
      activeTab = b.dataset.tab;
      document
        .querySelectorAll("[data-tab]")
        .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      for (const name of ["queue", "users", "history"])
        $("#tab-" + name).hidden = name !== activeTab;
    }),
);
$("#refresh-admin").onclick = load;
function requestData(type, id) {
  const dialog = $("#review-dialog");
  const fields =
    type === "seller"
      ? ["email", "phone", "origin", "document", "other"]
      : Object.keys(LABELS);
  dialog.innerHTML = `<div class="review-dialog-head"><h2 id="review-title">Запросити дані у виробника</h2><button class="btn tertiary" id="close-review" type="button" aria-label="Закрити">×</button></div><form id="request-data-form"><fieldset><legend>Чого бракує?</legend>${fields.map((f) => `<label><input type="checkbox" name="fields" value="${f}">${LABELS[f]}</label>`).join("")}</fieldset><label class="field"><span>Що саме потрібно надати?</span><textarea name="reason" required minlength="8" maxlength="2000" rows="4" placeholder="Наприклад: вкажіть село й область, де розташована пасіка. Додайте фото етикетки зі складом."></textarea></label><p class="hint">Якщо потрібен документ, назвіть його й поясніть причину. Після відповіді заявка повернеться в чергу перевірки.</p><p role="alert" class="error" hidden></p><button class="btn primary">Надіслати запит даних</button></form>`;
  dialog.showModal();
  $("#close-review").onclick = () => dialog.close();
  const form = $("#request-data-form");
  form.onchange = (e) => {
    if (["photo", "document"].includes(e.target.value) && e.target.checked) {
      const other = form.querySelector(
        `[value="${e.target.value === "photo" ? "document" : "photo"}"]`,
      );
      if (other) other.checked = false;
    }
  };
  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const fields = fd.getAll("fields");
    const error = form.querySelector("[role=alert]");
    if (!fields.length) {
      error.textContent = "Оберіть, чого бракує.";
      error.hidden = false;
      return;
    }
    const b =
      form.querySelector("[type=submit]") || form.querySelector("button");
    b.disabled = true;
    try {
      const result = await api(
        type === "seller" ? "moderate-seller" : "moderate-product",
        {
          [type === "seller" ? "seller_id" : "product_id"]: id,
          decision: "reject",
          reason: fd.get("reason"),
          fields,
        },
      );
      dialog.close();
      toast(
        result.delivery?.status === "sent"
          ? "Запит даних доставлено: " + result.delivery.channel + "."
          : "Запит збережено в кабінеті. Зовнішню доставку перевірте в «Історії та повідомленнях».",
      );
      await load();
    } catch (err) {
      error.textContent = err.message;
      error.hidden = false;
      b.disabled = false;
    }
  };
}
document.addEventListener("click", async (e) => {
  const action = e.target.closest('[data-edit-user],[data-toggle-user],[data-delete-user]');
  if(action){
    const id=action.dataset.editUser||action.dataset.toggleUser||action.dataset.deleteUser;
    const target=currentData.users.find(u=>u.user_id===id);
    if(!target)return;
    let name=target.display_name;
    let blocked=Boolean(target.is_blocked);
    let endpoint='admin-update-user';
    if(action.dataset.editUser){name=prompt('Ім’я користувача',name);if(name===null)return;}
    if(action.dataset.toggleUser){blocked=!blocked;if(!confirm(blocked?'Призупинити доступ цього акаунта?':'Відновити доступ?'))return;}
    if(action.dataset.deleteUser){if(!confirm('Видалити доступ до акаунта '+target.email+'? Історія замовлень зберігається.'))return;endpoint='admin-delete-user';}
    action.disabled=true;
    try{await api(endpoint,{user_id:id,display_name:name,is_blocked:blocked});toast('Зміни збережено.');await load();}
    catch(error){toast(error.message);action.disabled=false;}
    return;
  }
  const b = e.target.closest("[data-decision]");
  if (!b) return;
  const { type, id, decision } = b.dataset;
  if (decision === "request") {
    requestData(type, id);
    return;
  }
  b.disabled = true;
  try {
    await api(type === "seller" ? "moderate-seller" : "moderate-product", {
      [type === "seller" ? "seller_id" : "product_id"]: id,
      decision: "approve",
    });
    toast("Схвалено.");
    await load();
  } catch (error) {
    toast(error.message);
    b.disabled = false;
  }
});
$("#sync-telegram").onclick = async () => {
  const b = $("#sync-telegram");
  b.disabled = true;
  try {
    const r = await api("sync-moderation");
    toast(`Доставлено: ${r.sent || 0}. Не доставлено: ${r.failed || 0}.`);
    await load();
  } catch (e) {
    toast(e.message);
  } finally {
    b.disabled = false;
  }
};
setInterval(() => {
  if (currentData && !document.hidden && !$("#review-dialog").open) load();
}, 30000);
start();
