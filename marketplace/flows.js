"use strict";
const DELIVERY = {
  nova_poshta: "Нова пошта",
  ukrposhta: "Укрпошта",
  pickup: "Самовивіз",
};
const REQUEST_STATUS = {
  requested: "Новий запит",
  accepted: "Прийнято",
  changes_proposed: "Запропоновано зміни",
  confirmed: "Підтверджено",
  completed: "Завершено",
  cancelled: "Скасовано",
};
const UNITS = [
  "кг",
  "г",
  "л",
  "мл",
  "шт",
  "банка",
  "упаковка",
  "пучок",
  "ящик",
  "100 г",
  "500 г",
  "0,5 л",
  "лоток",
  "20 шт",
];
let accountProfile = null,
  accountData = null,
  authCooldown = 0;
const draftKey = "ridne-product-draft-v2";
const pendingKey = "ridne-seller-intent";
const money = (value) =>
  Number(value || 0).toLocaleString("uk-UA", { maximumFractionDigits: 2 }) +
  " ₴";
function sessionRead(key, fallback = null) {
  try {
    return JSON.parse(sessionStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function sessionWrite(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
function formError(form, error) {
  const el = form.querySelector('[role="alert"]');
  if (el) {
    el.textContent = error.message || String(error);
    el.hidden = false;
  }
}
function field(label, name, value = "", type = "text", attrs = "") {
  return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" ${attrs}></label>`;
}
function regionField(value = "") {
  return `<label class="field"><span>Область</span><select name="origin_oblast" required><option value="">Оберіть область</option>${REGIONS.map((r) => `<option ${r === value ? "selected" : ""}>${esc(r)}</option>`).join("")}</select></label>`;
}
function deliveryFields(selected = []) {
  return `<fieldset class="delivery-options"><legend>Доставка</legend>${Object.entries(
    DELIVERY,
  )
    .map(
      ([id, label]) =>
        `<label><input type="checkbox" name="fulfillment_options" value="${id}" ${selected.includes(id) ? "checked" : ""}>${label}</label>`,
    )
    .join("")}</fieldset>`;
}
function flowModal(title, html) {
  let dialog = $("#flow-modal");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "flow-modal";
    dialog.className = "flow-modal";
    document.body.append(dialog);
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) {
        const r = dialog.getBoundingClientRect();
        if (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        )
          dialog.close();
      }
    });
  }
  dialog.innerHTML = `<div class="flow-modal-head"><h2 id="flow-title">${esc(title)}</h2><button type="button" class="flow-close" aria-label="Закрити вікно">×</button></div><div class="flow-body">${html}</div>`;
  dialog.setAttribute("aria-labelledby", "flow-title");
  dialog.querySelector(".flow-close").onclick = () => dialog.close();
  if (!dialog.open) dialog.showModal();
  return dialog;
}
async function publicApi(action, data = {}) {
  const session = client ? (await client.auth.getSession()).data.session : null;
  const response = await fetch(cfg.url + "/functions/v1/ridne-web", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: cfg.key,
      ...(session ? { Authorization: "Bearer " + session.access_token } : {}),
    },
    body: JSON.stringify({ action, ...data }),
  });
  const result = await response.json();
  if (!response.ok)
    throw Error(result.error || "Не вдалося надіслати. Спробуйте ще раз.");
  return result;
}
async function profileForSession() {
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) return null;
  const { data, error } = await client
    .from("web_profiles")
    .select("*")
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (error) throw Error("Не вдалося завантажити профіль. Спробуйте ще раз.");
  if (data) return data;
  const meta = session.user.user_metadata || {};
  const name =
    meta.ridne_onboarding?.display_name ||
    meta.full_name ||
    session.user.email?.split("@")[0] ||
    "Покупець";
  return (
    await api("ensure-profile", { name: name.length < 2 ? "Покупець" : name })
  ).profile;
}
async function openAuth(seller = false) {
  const dialog = flowModal(
    seller ? "Увійдіть, щоб додати товар" : "Ваш акаунт РІДНЕ",
    `<p>Одне посилання на пошту — без пароля. Один акаунт для покупок і продажів.</p><div id="social-auth"></div><form id="quick-auth">${field("Ваше ім’я", "name", "", "text", 'required minlength="2" maxlength="100" autocomplete="name"')}${field("Електронна пошта", "email", "", "email", 'required maxlength="254" autocomplete="email"')}<label class="checkline"><input type="checkbox" name="consent" required><span>Погоджуюся з <a href="/terms/" target="_blank" rel="noopener">правилами</a> та <a href="/privacy/" target="_blank" rel="noopener">обробкою даних</a>.</span></label><p role="alert" hidden class="error"></p><p id="auth-status" role="status"></p><button class="btn primary" type="submit">Отримати посилання</button></form><p class="hint">Маєте акаунт? Використайте ту саму пошту. Для перегляду й запитів на купівлю вхід не потрібен.</p>`,
  );
  const form = dialog.querySelector("form");
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (Date.now() < authCooldown) {
      formError(form, Error("Зачекайте хвилину перед повторним листом."));
      return;
    }
    const button = form.querySelector("[type=submit]");
    button.disabled = true;
    try {
      const fd = new FormData(form);
      await sendMagic(String(fd.get("email")).trim(), {
        display_name: String(fd.get("name")).trim(),
        consent: true,
      });
      authCooldown = Date.now() + 60000;
      $("#auth-status").textContent =
        "Лист надіслано. Відкрийте посилання в цьому браузері — ми повернемо вас до вибраного слота.";
      button.textContent = "Надіслати ще раз";
      setTimeout(() => (button.disabled = false), 60000);
    } catch (error) {
      formError(form, error);
      button.disabled = false;
    }
  };
  try {
    const response = await fetch(cfg.url + "/auth/v1/settings", {
      headers: { apikey: cfg.key },
    });
    if (!response.ok) return;
    const settings = await response.json();
    const target = dialog.querySelector("#social-auth");
    if (!target || !dialog.open) return;
    for (const provider of ["google", "apple"]) {
      if (!settings.external?.[provider]) continue;
      const button = document.createElement("button");
      button.className = "btn secondary";
      button.textContent =
        "Продовжити з " + (provider === "google" ? "Google" : "Apple");
      button.onclick = async () => {
        if (!form.elements.consent.checked) {
          formError(form, Error("Погодьтеся з правилами та обробкою даних."));
          return;
        }
        const { error } = await client.auth.signInWithOAuth({
          provider,
          options: { redirectTo: "https://ridne.store/account/" },
        });
        if (error) formError(form, error);
      };
      target.append(button);
    }
  } catch {
    /* Email sign-in remains available. */
  }
}
async function beginSell(seed = {}) {
  sessionWrite(pendingKey, seed);
  try {
    if (!client) throw Error("Сервіс входу не завантажився. Оновіть сторінку.");
    const profile = await profileForSession();
    if (!profile) {
      await openAuth(true);
      return;
    }
    accountProfile = profile;
    const data = await api("dashboard");
    accountData = data;
    openSellerForm(profile, data, seed);
  } catch (error) {
    flowModal(
      "Не вдалося відкрити форму",
      `<p role="alert">${esc(error.message)}</p><button class="btn primary" id="retry-sell">Спробувати ще раз</button>`,
    );
    $("#retry-sell").onclick = () => beginSell(seed);
  }
}
function openSellerForm(profile, data, seed = {}) {
  const saved = seed.id ? {} : sessionRead(draftKey, {});
  const same =
    !seed.category_slug || saved.category_slug === seed.category_slug;
  const p = same ? { ...seed, ...saved } : seed;
  const seller = data.seller;
  const selected =
    p.category_slug || profile.category_slugs?.[0] || "vegetables";
  const unit = UNITS.includes(p.unit) ? p.unit : "кг";
  const dialog = flowModal(
    "Додати свій товар",
    `<p class="hint">Коротка картка. Після перевірки її побачать покупці.</p><form id="quick-product"><div class="form-grid">${!seller ? `${field("Ваше ім’я або назва господарства", "seller_name", profile.display_name, "text", 'required minlength="2" maxlength="100"')}<label class="field"><span>Хто ви?</span><select name="producer_type" required><option value="household">Родинне виробництво</option><option value="farm">Фермерське господарство</option><option value="craft">Крафтова майстерня</option></select></label>` : ""}${p.id ? `<input type="hidden" name="id" value="${esc(p.id)}">` : ""}${field("Назва товару", "title", p.title || "", "text", 'required minlength="3" maxlength="160"')}<label class="field"><span>Категорія</span><select name="category_slug">${CATS.map((c) => `<option value="${c[0]}" ${c[0] === selected ? "selected" : ""}>${c[1]}</option>`).join("")}</select></label>${regionField(p.origin_oblast || profile.oblast)}${field("Місто або село — звідки продукт", "origin_locality", p.origin_locality || profile.locality, "text", 'required minlength="2" maxlength="100"')}${field("Ціна, грн", "price_uah", p.price_uah || "", "number", 'required min="0.01" max="1000000" step="0.01"')}<label class="field"><span>За яку одиницю?</span><select name="unit">${UNITS.map((u) => `<option ${u === unit ? "selected" : ""}>${u}</option>`).join("")}</select></label>${field("Кількість у наявності", "available_quantity", p.available_quantity || "", "number", 'required min="0.01" max="1000000" step="0.01"')}<label class="field"><span>Фото товару</span><input type="file" name="photo" accept="image/jpeg,image/png,image/webp"><small>JPG, PNG, WebP до 5 МБ</small></label><label class="field full"><span>Коротко про продукт</span><textarea name="description" rows="2" required maxlength="3000" placeholder="Наприклад: мед різнотрав’я з власної пасіки, збір цього літа.">${esc(p.description || "")}</textarea></label>${field("Як зберігати", "storage_requirements", p.storage_requirements || "", "text", 'required maxlength="500" placeholder="Наприклад: у сухому прохолодному місці"')}</div>${deliveryFields(p.fulfillment_options || seller?.fulfillment_options || [])}<details class="product-extra"><summary>Склад і термін придатності, якщо потрібно</summary><div class="form-grid">${field("Склад", "ingredients", p.ingredients || "", "text", 'maxlength="1000"')}${field("Дата виготовлення / збору", "harvest_or_production_date", p.harvest_or_production_date || "", "date")}${field("Вжити до", "best_before", p.best_before || "", "date")}</div></details>${!seller ? '<label class="checkline"><input type="checkbox" name="consent" required><span>Погоджуюся з <a href="/terms/" target="_blank" rel="noopener">правилами продажу</a> та перевіркою профілю.</span></label>' : ""}<p id="category-availability" class="hint"></p><p role="alert" class="error" hidden></p><div class="flow-actions"><button class="btn primary" type="submit">Надіслати на перевірку</button><button class="btn secondary" type="submit" name="save_only" value="1">Зберегти чернетку</button></div><p class="hint">Без онлайн-оплати. Чернетка зберігається в цьому браузері; фото оберіть перед надсиланням. Змінений товар проходить повторну перевірку.</p></form>`,
  );
  const form = dialog.querySelector("form");
  const capture = () => {
    const fd = new FormData(form);
    const values = Object.fromEntries(fd);
    delete values.photo;
    values.fulfillment_options = fd.getAll("fulfillment_options");
    sessionWrite(draftKey, values);
    return { fd, values };
  };
  form.addEventListener("input", capture);
  form.addEventListener("change", () => {
    capture();
    $("#category-availability").textContent = [
      "fish",
      "dairy",
      "meat",
      "eggs",
    ].includes(form.elements.category_slug.value)
      ? "Ця категорія поки закрита для публікації. Можна зберегти чернетку й звернутися до підтримки."
      : "";
  });
  form.dispatchEvent(new Event("change"));
  form.onsubmit = async (e) => {
    e.preventDefault();
    const { fd, values } = capture();
    const saveOnly = e.submitter?.name === "save_only";
    const buttons = [...form.querySelectorAll("[type=submit]")];
    buttons.forEach((b) => (b.disabled = true));
    try {
      if (!values.fulfillment_options.length)
        throw Error("Оберіть хоча б один спосіб доставки.");
      if (
        !saveOnly &&
        ["fish", "dairy", "meat", "eggs"].includes(values.category_slug)
      )
        throw Error("Ця категорія поки закрита. Збережіть чернетку.");
      if (!seller) {
        await api("activate-seller", {
          profile: {
            display_name: values.seller_name,
            producer_type: values.producer_type,
            category_slug: values.category_slug,
            oblast: values.origin_oblast,
            locality: values.origin_locality,
            consent: fd.get("consent") === "on",
          },
        });
      }
      const photo = fd.get("photo");
      if (photo?.size) {
        if (
          photo.size > 5242880 ||
          !["image/jpeg", "image/png", "image/webp"].includes(photo.type)
        )
          throw Error("Оберіть JPG, PNG або WebP до 5 МБ.");
        const bytes = new Uint8Array(await photo.arrayBuffer());
        let binary = "";
        for (const byte of bytes) binary += String.fromCharCode(byte);
        values.image = { type: photo.type, data: btoa(binary) };
      }
      const { product } = await api("save-product", { product: values });
      sessionStorage.removeItem(draftKey);
      sessionStorage.removeItem(pendingKey);
      if (!saveOnly) {
        try {
          await api("submit-product", { product_id: product.id });
        } catch (error) {
          flowModal(
            "Чернетку збережено",
            `<p>Товар збережено, але його ще не надіслано на перевірку.</p><p role="alert">${esc(error.message)}</p><a class="btn primary" href="/account/">Відкрити кабінет</a>`,
          );
          return;
        }
      }
      flowModal(
        saveOnly ? "Чернетку збережено" : "Товар на перевірці",
        `<p>${saveOnly ? "Можете повернутися до товару у своєму кабінеті." : "Профіль і товар перевірить команда РІДНЕ. Статус буде у вашому кабінеті."}</p><a class="btn primary" href="/account/">Мої товари</a>`,
      );
      if ($("#account-content")) await setupAccount();
    } catch (error) {
      formError(form, error);
    } finally {
      buttons.forEach((b) => (b.disabled = false));
    }
  };
}
setupAccount = async function () {
  try {
    if (!client) throw Error("Сервіс входу не завантажився. Оновіть сторінку.");
    const current = (await client.auth.getSession()).data.session;
    if (
      current?.user?.email?.toLowerCase() === "doctorgebel@gmail.com" &&
      params.get("mode") !== "personal"
    ) {
      location.replace("/admin/moderation/");
      return;
    }
    const profile = await profileForSession();
    if (!profile) {
      loginView(
        params.has("error") ? "Посилання недійсне. Запросіть нове." : "",
      );
      const extra = document.createElement("button");
      extra.className = "btn secondary";
      extra.textContent = "Увійти або зареєструватися";
      extra.onclick = () => openAuth(!!sessionRead(pendingKey));
      $("#account-content").append(extra);
      return;
    }
    accountProfile = profile;
    accountData = await api("dashboard");
    renderDashboard(profile, accountData);
    enhanceAccount(profile, accountData);
    const intent = sessionRead(pendingKey);
    if (intent && !$("#flow-modal")?.open)
      openSellerForm(profile, accountData, intent);
  } catch (error) {
    $("#account-content").innerHTML =
      `<div class="account-card"><h2>Не вдалося відкрити кабінет</h2><p role="alert">${esc(error.message)}</p><button class="btn primary" id="account-retry">Повторити</button></div>`;
    $("#account-retry").onclick = setupAccount;
  }
};
setupProductForm = function () {
  $$("[data-open-product]").forEach((b) => (b.onclick = () => beginSell()));
};
function enhanceAccount(profile, data) {
  renderReviewRequests(data);
  const tabs = $(".account-tabs");
  tabs.insertAdjacentHTML(
    "beforeend",
    '<a href="#requests">Запити й повідомлення</a><a href="#profile">Доставка</a>',
  );
  $(".profile-help").outerHTML =
    '<button class="btn secondary" id="edit-profile">Редагувати профіль і доставку</button>';
  $("#edit-profile").onclick = () => editProfile(profile, data);
  if (!data.seller) {
    const b = document.createElement("button");
    b.className = "btn secondary";
    b.textContent = "Почати продавати";
    b.onclick = () => beginSell();
    $(".profile-hero").append(b);
  }
  (data.products || []).forEach((p, i) => {
    const card = $$(".seller-product")[i];
    if (!card) return;
    const button = document.createElement("button");
    button.className = "btn secondary";
    button.textContent = "Редагувати";
    button.onclick = () =>
      openSellerForm(profile, data, {
        ...p,
        category_slug: p.categories?.slug,
      });
    card.querySelector(".seller-product-body").append(button);
    if (p.moderation_reason) {
      const reason = document.createElement("p");
      reason.textContent = p.moderation_reason;
      card.append(reason);
    }
  });
  const requests = data.requests || [];
  const incoming = requests.filter((r) => r.seller_id === data.seller?.id);
  const outgoing = requests.filter((r) => r.buyer_auth_id === profile.user_id);
  $(".account-primary").insertAdjacentHTML(
    "beforeend",
    `<section id="requests" class="account-card requests-panel"><div class="section-head"><h2>Запити й повідомлення</h2><button class="btn tertiary" id="refresh-requests">Оновити</button></div>${data.seller ? requestList(incoming, "Вхідні запити") : ""}${requestList(outgoing, "Мої покупки й запити")}</section>`,
  );
  $("#refresh-requests").onclick = setupAccount;
  $$("[data-request]").forEach(
    (b) => (b.onclick = () => openThread(b.dataset.request)),
  );
  if (location.hash === "#requests") $("#requests").scrollIntoView();
}
function requestList(rows, title) {
  return `<h3>${title}</h3>${rows.length ? rows.map((r) => `<button class="request-row" data-request="${esc(r.id)}"><span><strong>${esc(r.product_title)}</strong><small>${esc(REQUEST_STATUS[r.status])} · ${esc(r.buyer_name)} · ${new Date(r.created_at).toLocaleDateString("uk-UA")}</small></span><span>${r.kind === "inquiry" ? "Повідомлення" : money(r.total)} →</span></button>`).join("") : '<p class="hint">Запитів поки немає.</p>'}`;
}
function editProfile(profile, data) {
  const dialog = flowModal(
    "Профіль і доставка",
    `<form id="profile-form"><div class="form-grid">${field("Ім’я / назва виробника", "display_name", data.seller?.display_name || profile.display_name, "text", 'required minlength="2" maxlength="100"')}${regionField(profile.oblast)}${field("Місто або село", "locality", profile.locality, "text", 'required minlength="2" maxlength="100"')}${field("Відділення / дані доставки для покупок", "delivery_details", profile.delivery_details || "", "text", 'maxlength="500"')}${data.seller ? field("Коротко про виробництво", "story", data.seller.story || "", "text", 'maxlength="1000"') : ""}</div>${data.seller ? deliveryFields(data.seller.fulfillment_options) : ""}<p role="alert" class="error" hidden></p><button class="btn primary">Зберегти</button></form>`,
  );
  const form = dialog.querySelector("form");
  form.onsubmit = async (e) => {
    e.preventDefault();
    const b = form.querySelector("button");
    b.disabled = true;
    try {
      const fd = new FormData(form);
      await api("update-profile", {
        profile: {
          ...Object.fromEntries(fd),
          oblast: fd.get("origin_oblast"),
          fulfillment_options: fd.getAll("fulfillment_options"),
        },
      });
      dialog.close();
      await setupAccount();
      toast("Профіль збережено.");
    } catch (error) {
      formError(form, error);
      b.disabled = false;
    }
  };
}
openProduct = function (id) {
  const p = catalog.find((x) => x.id === id);
  if (!p) return;
  $("#product-detail").innerHTML =
    `<img src="${esc(safeImage(p.public_image_urls?.[0] || "/assets/ridne-editorial-hero.webp"))}" alt="${esc(p.title)}"><h2>${esc(p.title)}</h2><span class="price">${money(p.price_uah)} / ${esc(p.unit)}</span><button class="producer-link" id="view-producer">${esc(p.seller_profiles?.display_name || "Виробник")} · ${esc(p.origin_oblast || "Україна")}</button><p>${esc(p.description)}</p><p>${esc([p.origin_locality, p.origin_oblast].filter(Boolean).join(", "))}</p>${p.storage_requirements ? `<p>Зберігання: ${esc(p.storage_requirements)}</p>` : ""}<div class="flow-actions"><button class="btn primary" id="buy-product">Купити</button><button class="btn secondary" id="message-producer">Написати виробнику</button></div><p class="hint">Без реєстрації. Оплату й доставку узгоджуєте з виробником.</p>`;
  $("#product-modal").showModal();
  $("#buy-product").onclick = () => openPurchase(p, "purchase");
  $("#message-producer").onclick = () => openPurchase(p, "inquiry");
  $("#view-producer").onclick = () => openProducer(p);
};
async function openProducer(p) {
  const { data: s, error } = await client
    .from("seller_profiles")
    .select("id,display_name,oblast,locality,story,fulfillment_options")
    .eq("id", p.seller_profiles.id)
    .single();
  if (error) {
    toast("Не вдалося відкрити виробника.");
    return;
  }
  const dialog = flowModal(
    s.display_name,
    `<p>${esc([s.locality, s.oblast].filter(Boolean).join(", "))}</p><p>${esc(s.story || "Локальний виробник РІДНЕ")}</p><h3>Товари виробника</h3>${catalog
      .filter((x) => x.seller_profiles.id === s.id)
      .map(
        (x) =>
          `<button class="request-row" data-producer-product="${x.id}">${esc(x.title)} <b>${money(x.price_uah)}</b></button>`,
      )
      .join("")}`,
  );
  dialog.querySelectorAll("[data-producer-product]").forEach(
    (b) =>
      (b.onclick = () => {
        dialog.close();
        openProduct(b.dataset.producerProduct);
      }),
  );
}
function openPurchase(p, kind) {
  const inquiry = kind === "inquiry";
  const options = (
    p.fulfillment_options?.length
      ? p.fulfillment_options
      : Object.keys(DELIVERY)
  ).filter((x) => DELIVERY[x]);
  const idempotency = crypto.randomUUID();
  const dialog = flowModal(
    inquiry ? "Написати виробнику" : "Запит на купівлю",
    `<p><strong>${esc(p.title)}</strong><br>${money(p.price_uah)} / ${esc(p.unit)}</p><form id="purchase-form">${!inquiry ? `${field("Кількість, " + esc(p.unit), "quantity", 1, "number", `required min="0.01" step="0.01" max="${p.available_quantity || 1000000}"`)}<p class="request-total" role="status">Разом: <b id="request-total">${money(p.price_uah)}</b></p>` : ""}<label class="field"><span>Доставка</span><select name="delivery_method">${options.map((v) => `<option value="${v}">${DELIVERY[v]}</option>`).join("")}</select></label>${field("Ваше ім’я", "buyer_name", accountProfile?.display_name || "", "text", 'required minlength="2" maxlength="100" autocomplete="name"')}${field("Телефон або email", "buyer_contact", accountProfile?.email || "", "text", 'required maxlength="254"')}<label class="field"><span>${inquiry ? "Повідомлення" : "Побажання, адреса / відділення (необов’язково)"}</span><textarea name="message" maxlength="2000" rows="3" ${inquiry ? "required" : ""}></textarea></label><p class="hint">Контакт отримає виробник для відповіді. Це запит, а не онлайн-оплата.</p><p role="alert" class="error" hidden></p><button class="btn primary">${inquiry ? "Надіслати повідомлення" : "Надіслати запит"}</button></form>`,
  );
  const form = dialog.querySelector("form");
  if (!inquiry)
    form.elements.quantity.oninput = () =>
      ($("#request-total").textContent = money(
        Number(form.elements.quantity.value) * p.price_uah,
      ));
  form.onsubmit = async (e) => {
    e.preventDefault();
    const b = form.querySelector("button");
    b.disabled = true;
    try {
      const fields = Object.fromEntries(new FormData(form));
      const { request: r } = await publicApi("create-request", {
        request: {
          ...fields,
          kind,
          product_id: p.id,
          idempotency_key: idempotency,
        },
      });
      flowModal(
        "Запит надіслано",
        `<p>Запит збережено для виробника.</p><div class="request-confirmation"><strong>№ ${esc(r.id.slice(0, 8))}</strong><p>${esc(r.product_title)}</p><p>${r.quantity} ${esc(r.unit)} · ${money(r.total)}</p><p>${esc(DELIVERY[r.delivery_method])}</p><p>${esc(fields.buyer_contact)}</p></div><p>Виробник відповість за вказаним контактом.</p><button class="btn secondary" id="save-request-account">Зберегти запит у своєму акаунті</button>`,
      );
      $("#save-request-account").onclick = () => openAuth(false);
    } catch (error) {
      formError(form, error);
      b.disabled = false;
    }
  };
}
async function openThread(id) {
  try {
    const {
      request: r,
      messages,
      as_seller: seller,
    } = await api("request-thread", { request_id: id });
    const contact = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.buyer_contact)
      ? "mailto:" + r.buyer_contact
      : "tel:" + r.buyer_contact.replace(/[^+\d]/g, "");
    const actions = seller
      ? {
          requested: [
            ["accepted", "Прийняти"],
            ["changes_proposed", "Запропонувати зміни"],
            ["cancelled", "Відхилити"],
          ],
          accepted: [
            ["completed", "Завершити"],
            ["cancelled", "Скасувати"],
          ],
          confirmed: [
            ["completed", "Завершити"],
            ["cancelled", "Скасувати"],
          ],
          changes_proposed: [["cancelled", "Скасувати"]],
        }[r.status] || []
      : {
          requested: [["cancelled", "Скасувати"]],
          accepted: [
            ["confirmed", "Підтвердити"],
            ["cancelled", "Скасувати"],
          ],
          changes_proposed: [
            ["confirmed", "Прийняти зміни"],
            ["cancelled", "Відхилити"],
          ],
          confirmed: [["cancelled", "Скасувати"]],
        }[r.status] || [];
    const dialog = flowModal(
      r.product_title,
      `<p>${esc(REQUEST_STATUS[r.status])} · ${r.quantity} ${esc(r.unit)} · ${money(r.total)}</p><p>${esc(DELIVERY[r.delivery_method])}</p>${seller ? `<p>${esc(r.buyer_name)} · <a href="${esc(contact)}">${esc(r.buyer_contact)}</a></p>` : ""}${r.proposal ? `<div class="request-confirmation"><strong>Пропозиція виробника</strong><p>${r.proposal.quantity} ${esc(r.proposal.unit)} · ${money(r.proposal.total)} · ${esc(DELIVERY[r.proposal.delivery_method])}</p><p>${esc(r.proposal.note)}</p></div>` : ""}<div class="flow-actions">${actions.map(([status, label]) => `<button class="btn secondary" data-request-status="${status}">${label}</button>`).join("")}</div><div class="thread-messages">${r.message ? `<p class="message-bubble"><small>Початковий запит</small>${esc(r.message)}</p>` : ""}${messages.map((m) => `<p class="message-bubble ${m.author_role}"><small>${m.author_role === "seller" ? "Виробник" : "Покупець"} · ${new Date(m.created_at).toLocaleString("uk-UA")}</small>${esc(m.message)}</p>`).join("")}</div>${seller && !r.buyer_auth_id ? '<p class="hint">Покупець звернувся без акаунта. Для відповіді скористайтеся телефоном або email вище. Запис тут збережеться у листуванні, але не надсилається на його контакт автоматично.</p>' : ""}<form id="thread-form"><label class="field"><span>Повідомлення</span><textarea name="message" rows="2" required maxlength="2000"></textarea></label><p role="alert" class="error" hidden></p><button class="btn primary">${seller && !r.buyer_auth_id ? "Зберегти у листуванні" : "Надіслати"}</button></form>`,
    );
    dialog.querySelectorAll("[data-request-status]").forEach(
      (b) =>
        (b.onclick = async () => {
          if (b.dataset.requestStatus === "changes_proposed") {
            proposalForm(r);
            return;
          }
          b.disabled = true;
          try {
            await api("request-status", {
              request_id: id,
              status: b.dataset.requestStatus,
            });
            await openThread(id);
          } catch (error) {
            formError(dialog.querySelector("form"), error);
            b.disabled = false;
          }
        }),
    );
    const form = dialog.querySelector("form");
    form.onsubmit = async (e) => {
      e.preventDefault();
      const b = form.querySelector("button");
      b.disabled = true;
      try {
        await api("request-message", {
          request_id: id,
          message: new FormData(form).get("message"),
        });
        await openThread(id);
      } catch (error) {
        formError(form, error);
        b.disabled = false;
      }
    };
  } catch (error) {
    toast(error.message);
  }
}
function proposalForm(r) {
  const dialog = flowModal(
    "Запропонувати зміни",
    `<form><div class="form-grid">${field("Кількість", "quantity", r.quantity, "number", 'required min="0.01" max="1000000" step="0.01"')}${field("Одиниця", "unit", r.unit, "text", 'required maxlength="30"')}${field("Підсумкова сума, грн", "total", r.total, "number", 'required min="0.01" max="1000000000" step="0.01"')}<label class="field"><span>Доставка</span><select name="delivery_method">${Object.entries(
      DELIVERY,
    )
      .map(
        ([id, label]) =>
          `<option value="${id}" ${r.delivery_method === id ? "selected" : ""}>${label}</option>`,
      )
      .join(
        "",
      )}</select></label>${field("Коментар", "note", "", "text", 'maxlength="1000"')}</div><p role="alert" class="error" hidden></p><button class="btn primary">Запропонувати</button></form>`,
  );
  const form = dialog.querySelector("form");
  form.onsubmit = async (e) => {
    e.preventDefault();
    const b = form.querySelector("button");
    b.disabled = true;
    try {
      await api("request-status", {
        request_id: r.id,
        status: "changes_proposed",
        proposal: Object.fromEntries(new FormData(form)),
      });
      await openThread(r.id);
    } catch (error) {
      formError(form, error);
      b.disabled = false;
    }
  };
}
setupOnboarding = function () {
  const root = $("#onboard");
  let role = params.get("role") === "seller" ? "seller" : "";
  let interests = [];
  const render = () => {
    const choosing = !role;
    $("#step-counter").textContent = choosing ? "Почнімо" : "Ваші інтереси";
    $(".progress").hidden = true;
    if ($(".form-actions")) $(".form-actions").hidden = true;
    root.innerHTML = choosing
      ? `<h1>Що хочете робити?</h1><div class="role-choices"><button type="button" class="btn primary" data-role="buyer">Купувати</button><button type="button" class="btn secondary" data-role="seller">Продавати</button></div><p class="hint">Купуйте без реєстрації. Для продажів потрібен акаунт.</p>`
      : `<h1>${role === "seller" ? "Що ви створюєте?" : "Що вам до смаку?"}</h1><p>Оберіть категорії або пропустіть цей крок.</p><div class="interest-choices">${CATS.map((c) => `<button type="button" class="cat" data-interest="${c[0]}" aria-pressed="false">${c[2]} ${c[1]}</button>`).join("")}</div><div class="flow-actions"><button class="btn primary" type="button" id="continue-interest">${role === "seller" ? "Продовжити як виробник" : "До товарів"}</button><button class="btn tertiary" type="button" id="skip-interest">Пропустити</button></div>`;
    root.querySelectorAll("[data-role]").forEach(
      (b) =>
        (b.onclick = () => {
          role = b.dataset.role;
          storageSet("ridne-role", role);
          render();
        }),
    );
    root.querySelectorAll("[data-interest]").forEach(
      (b) =>
        (b.onclick = () => {
          const cat = b.dataset.interest;
          interests = interests.includes(cat)
            ? interests.filter((x) => x !== cat)
            : [...interests, cat];
          b.setAttribute("aria-pressed", String(interests.includes(cat)));
        }),
    );
    const finish = () => {
      storageSet("ridne-interests", interests);
      if (role === "seller")
        beginSell({ category_slug: interests[0] || "vegetables" });
      else
        location.href =
          "/?" +
          (interests.length === 1
            ? "category=" + encodeURIComponent(interests[0])
            : "") +
          "#catalog";
    };
    $("#continue-interest")?.addEventListener("click", finish);
    $("#skip-interest")?.addEventListener("click", () => {
      interests = [];
      finish();
    });
  };
  render();
  root.onsubmit = (e) => e.preventDefault();
};
document.addEventListener("click", (e) => {
  const slot = e.target.closest("[data-sell-category]");
  const sellerLink = e.target.closest('a[href^="/signup/?role=seller"]');
  if (slot || sellerLink) {
    e.preventDefault();
    beginSell(
      slot
        ? {
            category_slug: slot.dataset.sellCategory,
            title: slot.dataset.sellTitle,
            unit: slot.dataset.sellUnit,
          }
        : {},
    );
  }
});
if ($("#products")) {
  setupCatalog();
  $("#demo-products").innerHTML = SPRITE_DEMOS.map((p) =>
    productCard(p, true),
  ).join("");
  if (params.has("favorites")) {
    $("#demo-catalog").hidden = true;
  }
  const header = $(".desktop-actions");
  header?.insertAdjacentHTML(
    "afterbegin",
    '<a class="nav-link" href="/account/#requests">Повідомлення</a>',
  );
}
if ($("#onboard")) setupOnboarding();
if ($("#account-content")) setupAccount();
function renderReviewRequests(data) {
  const reviews = (data.reviews || []).filter((r) => r.status === "needs_data");
  if (!reviews.length) return;
  const root = $(".account-primary");
  root.insertAdjacentHTML(
    "afterbegin",
    `<section class="account-card"><h2>Потрібні дані для перевірки</h2>${reviews.map((r) => `<article class="review-answer"><p><strong>${r.product_id ? "Товар" : "Профіль виробника"}</strong></p><p>${esc(r.reason)}</p><button class="btn primary" data-review-id="${r.id}">Доповнити й надіслати повторно</button></article>`).join("")}</section>`,
  );
  root
    .querySelectorAll("[data-review-id]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          openReviewReply(reviews.find((r) => r.id === b.dataset.reviewId))),
    );
  const linked = reviews.find((r) => r.id === params.get("review"));
  if (linked) openReviewReply(linked);
}
function openReviewReply(r) {
  const labels = {
    email: "Контактний email",
    phone: "Контактний телефон",
    origin: "Область і населений пункт походження",
    description: "Опис товару",
    ingredients: "Склад",
    storage: "Умови зберігання",
  };
  const fileNeeded = r.requested_fields.some((f) =>
    ["photo", "document"].includes(f),
  );
  const dialog = flowModal(
    "Доповнити заявку",
    `<div class="review-answer"><strong>Команда РІДНЕ просить:</strong><p>${esc(r.reason)}</p></div><form id="review-reply-form">${r.requested_fields
      .filter((f) => labels[f])
      .map((f) =>
        field(
          labels[f],
          f,
          "",
          f === "email" ? "email" : "text",
          'required maxlength="1000"',
        ),
      )
      .join(
        "",
      )}${fileNeeded ? `<label class="field"><span>${r.requested_fields.includes("photo") ? "Фото товару" : "Запитаний документ"}</span><input name="file" type="file" required accept="${r.requested_fields.includes("photo") ? "image/jpeg,image/png,image/webp" : "application/pdf,image/jpeg,image/png,image/webp"}"><small>До 5 МБ. Документ доступний лише команді перевірки.</small></label>` : ""}<label class="field"><span>Що доповнили / ваша відповідь</span><textarea name="reply" required minlength="3" maxlength="2000" rows="3"></textarea></label><p role="alert" class="error" hidden></p><button class="btn primary">Надіслати повторно на перевірку</button></form>`,
  );
  const form = dialog.querySelector("form");
  form.onsubmit = async (e) => {
    e.preventDefault();
    const b = form.querySelector("button");
    b.disabled = true;
    try {
      const fd = new FormData(form);
      const values = Object.fromEntries(fd);
      delete values.file;
      delete values.reply;
      const body = { review_id: r.id, reply: fd.get("reply"), values };
      const f = fd.get("file");
      if (f?.size) {
        if (f.size > 5242880) throw Error("Файл має бути до 5 МБ.");
        let binary = "";
        for (const byte of new Uint8Array(await f.arrayBuffer()))
          binary += String.fromCharCode(byte);
        body.file = { type: f.type, data: btoa(binary) };
      }
      await api("review-reply", body);
      dialog.close();
      params.delete("review");
      history.replaceState(null, "", location.pathname);
      await setupAccount();
      toast("Дані надіслано. Заявка знову на перевірці.");
    } catch (error) {
      formError(form, error);
      b.disabled = false;
    }
  };
}
