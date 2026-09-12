window.RIDNE_TELEGRAM = {
  enabled: true,
  username: "ridne_store_bot",
  miniAppUrl: "/telegram/"
};

(function mountTelegramContact() {
  const config = window.RIDNE_TELEGRAM;
  if (!config || !config.enabled) return;

  function mount() {
    if (document.querySelector(".chatbot-dock")) return;

    if (!document.querySelector('link[href="/chatbot.css"]')) {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = "/chatbot.css";
      document.head.appendChild(stylesheet);
    }

    const contact = document.createElement("a");
    contact.className = "chatbot-dock";
    if (document.querySelector(".onboarding")) {
      contact.classList.add("chatbot-dock--no-nav");
    }
    contact.href = `https://t.me/${config.username}?start=ridne_store`;
    contact.target = "_blank";
    contact.rel = "noopener noreferrer";
    contact.setAttribute("aria-label", "Написати в РІДНЕ у Telegram — для покупців і продавців");
    contact.innerHTML = `
      <span class="chatbot-dock__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" role="presentation" focusable="false">
          <path d="M20.7 3.5 2.9 10.4c-1.2.5-1.2 1.2-.2 1.5l4.6 1.4 1.8 5.5c.2.7.1 1 .8 1 .5 0 .7-.2 1-.5l2.2-2.1 4.5 3.3c.8.5 1.4.3 1.6-.8l3-14.3c.3-1.3-.5-1.9-1.5-1.5ZM9 13l8.9-5.6c.4-.3.8-.1.5.2l-7.3 6.6-.3 3.4L9 13Z"/>
        </svg>
      </span>
      <span class="chatbot-dock__copy">
        <strong>Написати в РІДНЕ</strong>
        <span>Покупцям і продавцям</span>
      </span>`;

    document.body.appendChild(contact);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})();

(function restoreAnalyticsHooks() {
  function emit(event, details) {
    const payload = Object.assign({ event }, details || {});
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
    if (typeof window.gtag === "function") window.gtag("event", event, details || {});
    if (typeof window.clarity === "function") window.clarity("event", event);
  }

  function oncePerPage(key, event, details) {
    const marker = `ridne-analytics:${key}`;
    try {
      if (sessionStorage.getItem(marker)) return;
      sessionStorage.setItem(marker, "1");
    } catch (_) {}
    emit(event, details);
  }

  document.addEventListener("click", function (event) {
    const link = event.target.closest("a[href]");
    if (!link) return;
    const href = link.getAttribute("href") || "";
    if (href.startsWith("/signup/") && (href.includes("role=seller") || location.pathname === "/vyrobnykam/")) {
      emit("producer_cta_click", { link_url: link.href, link_text: (link.textContent || "").trim() });
    }
    if (href.startsWith("/journal/")) {
      emit("journal_open", { article_url: link.href, article_title: (link.textContent || "").trim() });
    }
  });

  document.addEventListener("submit", function (event) {
    if (event.target && event.target.matches(".header-search")) {
      const query = event.target.querySelector('[name="q"]')?.value?.trim() || "";
      emit("search_submit", { search_term: query });
    }
  });

  if (location.pathname === "/signup/") {
    const role = new URLSearchParams(location.search).get("role");
    if (role === "seller") {
      oncePerPage("producer-signup-start", "producer_signup_start", { signup_method: "web" });
    }
  }

  function complete(details) {
    oncePerPage("producer-signup-complete", "producer_signup_complete", Object.assign({ signup_method: "web" }, details || {}));
  }

  window.addEventListener("ridne:producer-signup-complete", function (event) {
    complete(event.detail || {});
  });

  window.addEventListener("message", function (event) {
    if (event.origin && event.origin !== location.origin) return;
    const data = event.data;
    if (data && typeof data === "object" && (data.type === "producer_signup_complete" || data.event === "producer_signup_complete")) {
      complete(data.details || {});
    }
  });
})();
