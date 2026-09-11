window.dataLayer = window.dataLayer || [];

function ridneTrack(eventName, params = {}) {
  const payload = { event: eventName, ...params };
  window.dataLayer.push(payload);
  if (typeof window.gtag === 'function') window.gtag('event', eventName, params);
  if (typeof window.clarity === 'function') window.clarity('event', eventName);
}

const search = document.querySelector('#market-search');
if (search) {
  search.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(search);
    ridneTrack('search_submit', {
      search_term: String(form.get('q') || '').trim(),
      search_location: String(form.get('location') || '').trim()
    });
    document.querySelector('#catalog')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
}

document.querySelectorAll('a[href^="/journal/"]').forEach((link) => {
  link.addEventListener('click', () => {
    ridneTrack('journal_open', { article_path: link.getAttribute('href') || '' });
  });
});

const telegram = window.RIDNE_TELEGRAM || { enabled: false, username: '', miniAppUrl: '/telegram/' };
const telegramLinks = document.querySelectorAll('.telegram-launch');
const status = document.querySelector('#bot-status');

telegramLinks.forEach((link) => {
  link.addEventListener('click', () => {
    const producerContext = link.matches('[data-producer-cta]') || Boolean(link.closest('#producers')) || location.pathname.startsWith('/vyrobnykam');
    ridneTrack(producerContext ? 'producer_cta_click' : 'telegram_cta_click', {
      page_path: location.pathname,
      link_text: (link.textContent || '').trim()
    });
    if (producerContext) ridneTrack('producer_signup_start', { page_path: location.pathname });
  });
});

// Completion is emitted only after a real signup flow signals success.
// Any onsite form, Telegram WebApp bridge, or future producer onboarding UI can dispatch:
// document.dispatchEvent(new CustomEvent('ridne:producer_signup_complete', { detail: { source: 'telegram' } }));
document.addEventListener('ridne:producer_signup_complete', (event) => {
  const detail = event instanceof CustomEvent && event.detail && typeof event.detail === 'object' ? event.detail : {};
  ridneTrack('producer_signup_complete', {
    page_path: location.pathname,
    ...detail
  });
});

if (telegram.enabled && telegram.username) {
  const username = String(telegram.username).replace(/^@/, '');
  telegramLinks.forEach((link) => {
    const producerContext = link.matches('[data-producer-cta]') || Boolean(link.closest('#producers')) || location.pathname.startsWith('/vyrobnykam');
    const start = producerContext ? 'sell' : 'ridne_store';
    link.href = `https://t.me/${encodeURIComponent(username)}?start=${start}`;
    link.removeAttribute('aria-disabled');
    if (link.textContent?.includes('підключається')) link.textContent = 'Відкрити бота РІДНЕ';
  });
  if (status) {
    status.dataset.state = 'live';
    status.textContent = `@${username} · працює`;
  }
} else {
  telegramLinks.forEach((link) => {
    if (link.getAttribute('href') === '#') link.setAttribute('aria-disabled', 'true');
  });
}

window.RIDNE_TRACK = ridneTrack;