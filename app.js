const search = document.querySelector('#market-search');
if (search) {
  search.addEventListener('submit', (event) => {
    event.preventDefault();
    document.querySelector('#catalog')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
}

const telegram = window.RIDNE_TELEGRAM || { enabled: false, username: '', miniAppUrl: '/telegram/' };
const telegramLinks = document.querySelectorAll('.telegram-launch');
const status = document.querySelector('#bot-status');

if (telegram.enabled && telegram.username) {
  const username = String(telegram.username).replace(/^@/, '');
  const url = `https://t.me/${encodeURIComponent(username)}?start=ridne_store`;
  telegramLinks.forEach((link) => {
    link.href = url;
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
