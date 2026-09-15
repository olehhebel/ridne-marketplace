(() => {
  'use strict';

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  const CATEGORIES = [
    ['vegetables', 'Овочі', '🥕'],
    ['fruits', 'Фрукти', '🍎'],
    ['berries', 'Ягоди', '🫐'],
    ['honey', 'Мед', '🍯'],
    ['herbs', 'Зелень і трави', '🌿'],
    ['nuts', 'Горіхи', '🌰'],
    ['preserves', 'Заготовки', '🥒'],
    ['craft', 'Крафт і вироби', '🧺'],
    ['dry-goods', 'Сухі продукти', '🌾'],
    ['fish', 'Риба', '🐟'],
    ['dairy', 'Молочне', '🥛'],
    ['meat', 'М’ясо', '🥩'],
    ['eggs', 'Яйця', '🥚']
  ];

  const PHOTOS = {
    vegetables: 'https://unsplash.com/photos/CthScWvGvsM/download?force=true&w=900',
    fruits: 'https://unsplash.com/photos/uYAY3yCjVS8/download?force=true&w=900',
    berries: 'https://unsplash.com/photos/sqzu9xKLcaI/download?force=true&w=900',
    honey: 'https://unsplash.com/photos/yQzrDgU-KAI/download?force=true&w=900',
    herbs: 'https://unsplash.com/photos/Zz2prRbsgsk/download?force=true&w=900',
    nuts: 'https://unsplash.com/photos/uOnt5frudDU/download?force=true&w=900',
    preserves: 'https://unsplash.com/photos/dPwGdunfxZU/download?force=true&w=900',
    craft: 'https://unsplash.com/photos/13-sB80ByvA/download?force=true&w=900',
    'dry-goods': 'https://unsplash.com/photos/xHd0z8rvJDE/download?force=true&w=900',
    fish: 'https://unsplash.com/photos/JozPmdkMhwI/download?force=true&w=900',
    dairy: '/assets/ridne-editorial-hero.webp',
    meat: 'https://unsplash.com/photos/I3mswxNbjK0/download?force=true&w=900',
    eggs: 'https://unsplash.com/photos/Jo2tCHAy-8E/download?force=true&w=900'
  };

  const ITEMS = [
    { cat: 'vegetables', title: 'Томати червоні з поля', price: 62, unit: 'кг', source: 'Minfin · середня ціна, вересень 2026' },
    { cat: 'vegetables', title: 'Огірки ґрунтові', price: 50, unit: 'кг', source: 'Minfin · діапазон супермаркетів, вересень 2026' },

    { cat: 'fruits', title: 'Яблука українські', price: 39, unit: 'кг', source: 'Minfin · середня ціна, вересень 2026' },
    { cat: 'fruits', title: 'Виноград столовий', price: 155, unit: 'кг', source: 'ринковий онлайн-орієнтир · вересень 2026' },

    { cat: 'berries', title: 'Лохина українська', price: 180, unit: 'кг', source: 'роздрібний діапазон 135–240 ₴/кг · вересень 2026' },
    { cat: 'berries', title: 'Малина свіжа', price: 220, unit: 'кг', source: 'ринковий онлайн-орієнтир · вересень 2026' },

    { cat: 'honey', title: 'Мед квітковий 2026', price: 305, unit: '700 г', source: 'Rozetka · актуальна пропозиція' },
    { cat: 'honey', title: 'Мед лісовий карпатський', price: 290, unit: '700 г', source: 'Honey Craft · актуальна пропозиція' },

    { cat: 'herbs', title: 'Петрушка молода', price: 15, unit: 'пучок', source: 'локальний онлайн-маркет · орієнтир' },
    { cat: 'herbs', title: 'Базилік зелений', price: 15, unit: 'пучок', source: 'локальний онлайн-маркет · орієнтир' },

    { cat: 'nuts', title: 'Ядро волоського горіха', price: 260, unit: 'кг', source: 'ринковий діапазон 150–550 ₴/кг · 2026' },
    { cat: 'nuts', title: 'Фундук очищений', price: 650, unit: 'кг', source: 'ринковий онлайн-орієнтир · 2026' },

    { cat: 'preserves', title: 'Огірки квашені домашні', price: 120, unit: 'банка', source: 'ринковий онлайн-орієнтир · вересень 2026' },
    { cat: 'preserves', title: 'Капуста квашена', price: 95, unit: 'кг', source: 'ринковий онлайн-орієнтир · вересень 2026' },

    { cat: 'craft', title: 'Кошик плетений з лози', price: 799, unit: 'шт', source: 'Rozetka · актуальна пропозиція' },
    { cat: 'craft', title: 'Дошка кухонна з дуба, ручна робота', price: 390, unit: 'шт', source: 'Prom · актуальна пропозиція' },

    { cat: 'dry-goods', title: 'Яблука сушені', price: 220, unit: 'кг', source: 'ринковий онлайн-орієнтир · вересень 2026' },
    { cat: 'dry-goods', title: 'Білі гриби сушені', price: 395, unit: '100 г', source: 'Prom · актуальна пропозиція' },

    { cat: 'fish', title: 'Лящ в’ялений', price: 350, unit: 'кг', source: 'онлайн-магазин в’яленої риби · актуальна ціна', regulated: true },
    { cat: 'fish', title: 'Лящ холодного копчення', price: 328, unit: 'кг', source: 'Епіцентр · актуальна пропозиція', regulated: true },

    { cat: 'dairy', title: 'Бринза домашня', price: 200, unit: 'кг', source: 'локальний онлайн-маркет · орієнтир', regulated: true },
    { cat: 'dairy', title: 'Сир кисломолочний', price: 120, unit: 'кг', source: 'локальний онлайн-маркет · орієнтир', regulated: true },

    { cat: 'meat', title: 'Перепілка домашня', price: 180, unit: 'кг', source: 'локальний онлайн-маркет · орієнтир', regulated: true },
    { cat: 'meat', title: 'Кріль домашній', price: 250, unit: 'кг', source: 'локальний онлайн-маркет · орієнтир', regulated: true },

    { cat: 'eggs', title: 'Яйця курячі домашні', price: 50, unit: '10 шт', source: 'локальний онлайн-маркет · орієнтир', regulated: true },
    { cat: 'eggs', title: 'Яйця перепелині', price: 80, unit: '20 шт', source: 'Minfin · близько 79,78 ₴/20 шт', regulated: true }
  ];

  const categoryMeta = new Map(CATEGORIES.map(([slug, name, emoji]) => [slug, { name, emoji }]));

  function card(item) {
    const meta = categoryMeta.get(item.cat) || { name: 'Локальний продукт', emoji: '🌱' };
    const photo = PHOTOS[item.cat] || '/assets/ridne-editorial-hero.webp';
    return `
      <article class="product demo-showcase-card" data-demo-category="${esc(item.cat)}">
        <div class="product-media">
          <img src="${esc(photo)}" width="640" height="480" loading="lazy" decoding="async" alt="Ілюстративне фото: ${esc(item.title)}">
          <span class="demo-badge">Приклад · не продається</span>
        </div>
        <div class="product-body">
          <p class="category-label">${meta.emoji} ${esc(meta.name)}</p>
          <h3>${esc(item.title)}</h3>
          <span class="price">${Number(item.price).toLocaleString('uk-UA')} ₴ <small>/ ${esc(item.unit)}</small></span>
          <small class="demo-price-source">Орієнтир: ${esc(item.source)}</small>
          ${item.regulated ? '<small class="demo-risk">Після перевірки виробника</small>' : ''}
        </div>
      </article>`;
  }

  function renderShowcase() {
    const mount = document.querySelector('#demo-products');
    if (!mount) return;

    mount.classList.remove('demo-groups');
    const selected = document.querySelector('#filter-category')?.value || '';
    mount.innerHTML = ITEMS.filter((item) => !selected || item.cat === selected).map(card).join('');

    mount.querySelectorAll('img').forEach((img) => {
      img.addEventListener('error', () => {
        if (!img.src.endsWith('/assets/ridne-editorial-hero.webp')) img.src = '/assets/ridne-editorial-hero.webp';
      }, { once: true });
    });

    const note = document.querySelector('#demo-catalog .demo-note');
    if (note) {
      note.innerHTML = '<strong>26 демонстраційних позицій.</strong> Ціни — орієнтири станом на 12.09.2026. Ці картки не є пропозиціями продавців.';
    }

    const summary = document.querySelector('#demo-catalog > summary');
    if (summary) summary.innerHTML = 'Ідеї для вашого кошика <span aria-hidden="true">⌄</span>';
  }

  function exposeAllCategories() {
    const strip = document.querySelector('#categories');
    const filter = document.querySelector('#filter-category');
    if (!strip || !filter) return;

    const existing = new Set([...strip.querySelectorAll('[data-cat]')].map((el) => el.dataset.cat));
    CATEGORIES.filter(([slug]) => !existing.has(slug)).forEach(([slug, name, emoji]) => {
      const button = document.createElement('button');
      button.className = 'cat';
      button.dataset.cat = slug;
      button.setAttribute('aria-pressed', 'false');
      button.innerHTML = `<span class="emoji" aria-hidden="true">${emoji}</span>${esc(name)}`;
      button.addEventListener('click', () => {
        filter.value = slug;
        filter.dispatchEvent(new Event('change', { bubbles: true }));
        document.querySelector('#catalog')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      });
      strip.appendChild(button);
    });
  }

  function injectStyles() {
    if (document.querySelector('#ridne-showcase-styles')) return;
    const style = document.createElement('style');
    style.id = 'ridne-showcase-styles';
    style.textContent = `
      .demo-showcase-card .product-media img{width:100%;height:100%;object-fit:cover}
      .demo-price-source{display:block;margin-top:7px;line-height:1.35;opacity:.66}
      .demo-risk{display:block;margin-top:7px;color:var(--green,#0b5d3b);font-size:.72rem;font-weight:700}
    `;
    document.head.appendChild(style);
  }

  injectStyles();
  exposeAllCategories();
  renderShowcase();
  document.querySelector('#filter-category')?.addEventListener('change', renderShowcase);
  document.querySelector('#categories')?.addEventListener('click', () => setTimeout(renderShowcase, 0));
  document.querySelector('#clear-filters')?.addEventListener('click', () => setTimeout(renderShowcase, 0));
})();
