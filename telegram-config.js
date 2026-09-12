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
