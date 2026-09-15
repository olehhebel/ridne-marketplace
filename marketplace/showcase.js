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
    vegetables: '/assets/products/product-00.webp',
    fruits: '/assets/products/product-01.webp',
    berries: '/assets/products/product-02.webp',
    honey: '/assets/products/product-03.webp',
    herbs: '/assets/products/product-04.webp',
    nuts: '/assets/products/product-05.webp',
    preserves: '/assets/products/product-06.webp',
    craft: '/assets/products/product-07.webp',
    'dry-goods': '/assets/products/product-08.webp',
    fish: '/assets/products/product-09.webp',
    dairy: '/assets/products/product-10.webp',
    meat: '/assets/products/product-11.webp',
    eggs: '/assets/products/product-12.webp'
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

  // The showcase is intentionally driven by the single audited 5×5 sprite.
  // Each card declares its exact cell so a category can never reuse a misleading photo.
  const EXACT_ITEMS = [
    ['vegetables','Томати рожеві',95,'кг','Стиглі червоні томати',0,'Маєте томати? Це ваш слот'],
    ['vegetables','Огірки ґрунтові',70,'кг','Свіжі зелені огірки',1,'Ваші огірки можуть бути тут'],
    ['vegetables','Картопля молода',38,'кг','Молода фермерська картопля',2,'Покажіть свій урожай'],
    ['vegetables','Морква з бадиллям',55,'кг','Свіжа морква з зеленим бадиллям',3,'Цей слот ще пустий'],
    ['vegetables','Перець солодкий',120,'кг','Червоний солодкий перець',4,'Тут може бути ваша реклама'],
    ['fruits','Яблука домашні',48,'кг','Домашні червоно-зелені яблука',5,'Додайте свої яблука'],
    ['fruits','Груші медові',85,'кг','Стиглі медові груші',6,'Займіть цю картку'],
    ['fruits','Виноград темний',110,'кг','Грона темного винограду',7,'Нехай побачать ваше'],
    ['berries','Малина свіжа',150,'лоток','Свіжа червона малина',8,'Ваші ягоди чекають'],
    ['berries','Лохина добірна',175,'лоток','Добірна свіжа лохина',9,'Перший слот для ягід'],
    ['herbs','Петрушка духмяна',35,'пучок','Пучок свіжої петрушки',10,'Ваша зелень — сюди'],
    ['herbs','Базилік зелений',42,'пучок','Свіже зелене листя базиліку',11,'Вирощуєте базилік? Додавайте'],
    ['herbs','Кріп молодий',30,'пучок','Пучок молодого кропу',12,'Розкажіть про свій продукт'],
    ['nuts','Горіх волоський',180,'кг','Волоські горіхи в шкаралупі та очищені',13,'Ваш крафт побачать тут'],
    ['honey','Мед різнотрав’я',220,'банка','Банка прозорого золотого меду',14,'Є мед? Покажіть його тут'],
    ['dairy','Молоко фермерське',45,'л','Скляна пляшка свіжого молока',15,'Молоко вашого господарства — сюди'],
    ['dairy','Бринза овеча',190,'500 г','Біла українська овеча бринза',16,'Ваша бринза шукає своїх'],
    ['dairy','Сир витриманий',320,'кг','Клин витриманого твердого сиру',17,'Сир може продаватися тут'],
    ['meat','Ковбаса копчена',390,'кг','Реміснича копчена ковбаса',18,'Додайте домашній смак'],
    ['eggs','Яйця перепелині',75,'20 шт','Перепелині яйця з природним крапом',19,'Ваші яйця — у вітрині'],
    ['fish','Таранька в’ялена',280,'кг','В’ялена ціла таранька',20,'Ваша риба — у стрічці'],
    ['fish','Форель копчена',460,'кг','Ціла копчена форель',21,'Коптите? Покажіть покупцям'],
    ['dry-goods','Гриби сушені',210,'100 г','Сушені лісові гриби',22,'Є гриби? Додайте їх сюди'],
    ['preserves','Кімчі домашнє',165,'банка','Скляна банка домашнього кімчі',23,'Ваші заготовки — на виду'],
    ['craft','Кошик лозовий',650,'шт','Плетений вручну кошик з лози',24,'Створюєте руками? Це ваше місце']
  ].map(([cat,title,price,unit,alt,sprite,sticker]) => ({cat,title,price,unit,alt,sprite,sticker}));

  const categoryMeta = new Map(CATEGORIES.map(([slug, name, emoji]) => [slug, { name, emoji }]));

  function card(item) {
    const meta = categoryMeta.get(item.cat) || { name: 'Локальний продукт', emoji: '🌱' };
      const photo = PHOTOS[item.cat] || '/assets/ridne-editorial-hero.webp';
      return `
        <article class="product demo-showcase-card" data-demo-category="${esc(item.cat)}">
          <div class="product-media">
          <div class="demo-sprite sprite-${item.sprite}" role="img" aria-label="${esc(item.alt || item.title)}" title="${esc(item.alt || item.title)}"></div>
          <span class="demo-sticker sticker-${(item.sprite % 8) + 1}">${esc(item.sticker)}</span>
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
    mount.innerHTML = EXACT_ITEMS.filter((item) => !selected || item.cat === selected).map(card).join('');

    mount.querySelectorAll('img').forEach((img) => {
      img.addEventListener('error', () => {
        if (!img.src.endsWith('/assets/ridne-editorial-hero.webp')) img.src = '/assets/ridne-editorial-hero.webp';
      }, { once: true });
    });

    const note = document.querySelector('#demo-catalog .demo-note');
    if (note) {
      note.innerHTML = '<strong>25 точних демонстраційних позицій.</strong> Кожна картка прив’язана до власної клітинки спрайта. Це місця для майбутніх товарів виробників.';
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
      .demo-showcase-card .product-media{aspect-ratio:1/1}
      .demo-showcase-card .demo-sprite{width:100%;height:100%;background-image:url('/assets/products/ridne-products-sprite-5x5.webp');background-size:500% 500%;background-repeat:no-repeat;transition:transform .25s ease,filter .25s ease}
      .demo-showcase-card:hover .demo-sprite{transform:scale(1.035);filter:saturate(1.04)}
      .demo-showcase-card .demo-sticker{position:absolute;z-index:2;top:10px;left:8px;max-width:calc(100% - 16px);padding:7px 10px;border:2px solid rgba(17,17,17,.9);border-radius:12px 14px 10px 13px;box-shadow:3px 4px 0 rgba(17,17,17,.9);font-size:clamp(.67rem,1vw,.78rem);font-weight:900;line-height:1.05;color:#102016;transform:rotate(-2deg)}
      .demo-showcase-card .sticker-1{background:#d9ff43}.demo-showcase-card .sticker-2{background:#ff9b3d;transform:rotate(2deg)}.demo-showcase-card .sticker-3{background:#ff79bd;transform:rotate(-3deg)}.demo-showcase-card .sticker-4{background:#ffe45b;transform:rotate(1deg)}.demo-showcase-card .sticker-5{background:#65d8ff;transform:rotate(-1deg)}.demo-showcase-card .sticker-6{background:#b8a3ff;transform:rotate(3deg)}.demo-showcase-card .sticker-7{background:#6ff0c8;transform:rotate(-2deg)}.demo-showcase-card .sticker-8{background:#ff6f61;transform:rotate(2deg)}
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
