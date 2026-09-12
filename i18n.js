(() => {
  'use strict';

  const STORAGE_KEY = 'ridne-lang';
  const queryLang = new URLSearchParams(location.search).get('lang');
  if (queryLang === 'uk' || queryLang === 'en') {
    try { localStorage.setItem(STORAGE_KEY, queryLang); } catch (_) {}
  }
  let lang = queryLang === 'uk' || queryLang === 'en'
    ? queryLang
    : (() => { try { return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'uk'; } catch (_) { return 'uk'; } })();

  const T = new Map(Object.entries({
    'До основного вмісту':'Skip to main content',
    'Локальні продукти':'Local products',
    'Видиме походження':'Visible origin',
    'Напряму від виробника':'Direct from producers',
    'Вирощено й зроблено в Україні. Знайдіть своє рідне.':'Grown and made in Ukraine. Find something truly local.',
    'Пошук товарів і виробників':'Search products and producers',
    'Що шукаєте? Мед, яблука, сир…':'What are you looking for? Honey, apples, cheese…',
    'Мед, яблука, щось до столу…':'Honey, apples, something for the table…',
    'Знайти товари':'Find products',
    'Знайти':'Search',
    'Кабінет':'Account',
    'Мій кабінет':'My account',
    'Продавати':'Sell',
    'Продавати на Рідне':'Sell on RIDNE',
    'Головна навігація':'Main navigation',
    'Навігація':'Navigation',
    'Каталог':'Catalog',
    'Як це працює':'How it works',
    'Виробникам':'For producers',
    'Журнал':'Journal',
    'Чат-бот':'Chatbot',
    'Шукати в':'Search in',
    'Область для пошуку':'Region to search',
    'усій Україні':'all of Ukraine',
    'Вся Україна':'All Ukraine',
    'Українська їжа. Реальні люди. Видиме походження.':'Ukrainian food. Real people. Visible origin.',
    'Знай своє.':'Find what is yours.',
    'Купуй у тих, хто виростив.':'Buy from the people who grew it.',
    'Знай своє. Купуй у тих, хто виростив.':'Find what is yours. Buy from the people who grew it.',
    'РІДНЕ допомагає знайти локальні продукти та виробників по всій Україні — з локацією, походженням і зрозумілими умовами отримання.':'RIDNE helps you find local products and producers across Ukraine — with location, origin and clear pickup or delivery terms.',
    'Знайти продукти':'Find products',
    'Я виробник':'I am a producer',
    'Що видно перед покупкою':'What you can see before buying',
    'Хто':'Who',
    'виробив':'made it',
    'Де':'Where',
    'зроблено':'it was made',
    'Як':'How',
    'отримати':'to receive it',
    'Сезонний натюрморт з українськими овочами, яблуками, медом і горіхами':'Seasonal still life with Ukrainian vegetables, apples, honey and nuts',
    'РІДНЕ / СЕЗОН':'RIDNE / SEASON',
    'Вересень — час яблук, горіхів, меду й овочів.':'September is the season for apples, nuts, honey and vegetables.',
    'Сезонний образ РІДНЕ. Фото конкретного товару дивіться у його картці.':'RIDNE seasonal image. See the actual product photo on its product card.',
    'Почніть звідси':'Start here',
    'Шукайте так, як думаєте про їжу.':'Search the way you think about food.',
    'За категорією, місцем або просто назвою продукту.':'By category, place or simply by product name.',
    'Категорії товарів':'Product categories',
    'Сезонні добірки':'Seasonal collections',
    'Зараз у сезоні':'In season now',
    'Яблука та фрукти':'Apples & fruit',
    'Перейти до фруктів →':'Browse fruit →',
    'До щоденного столу':'For the everyday table',
    'Овочі та зелень':'Vegetables & greens',
    'Перейти до овочів →':'Browse vegetables →',
    'Від пасіки':'From the apiary',
    'Мед і продукти бджільництва':'Honey & bee products',
    'Перейти до меду →':'Browse honey →',
    'Не просто картка товару':'More than a product card',
    'У їжі має бути адреса.':'Food should have an address.',
    'РІДНЕ будується навколо виробника, походження й прозорої інформації про продукт.':'RIDNE is built around the producer, origin and transparent product information.',
    'Виробник — не анонімний продавець':'The producer is not an anonymous seller',
    'Кожен товар прив’язаний до профілю виробника. Публікація проходить перевірку та модерацію.':'Every product is linked to a producer profile. Listings go through verification and moderation.',
    'Походження видно до контакту':'See the origin before contacting',
    'Область, населений пункт і дані про продукт допомагають зрозуміти, звідки він і хто за ним стоїть.':'Region, locality and product details show where it comes from and who stands behind it.',
    'Умови без сюрпризів':'No surprises in the terms',
    'Наявність і спосіб отримання уточнюються до замовлення. Ми не показуємо вигадані строки, рейтинги чи дефіцит.':'Availability and fulfillment are clarified before ordering. We do not show invented delivery times, ratings or scarcity.',
    'Маркетплейс':'Marketplace',
    'Продукти поруч і з усієї України':'Products nearby and from across Ukraine',
    'Фільтруйте за категорією та населеним пунктом. У картці видно виробника й походження.':'Filter by category and locality. Each card shows the producer and origin.',
    '♡ Обране':'♡ Favorites',
    'Фільтри каталогу':'Catalog filters',
    'Категорія':'Category',
    'Усі категорії':'All categories',
    'Місто або село':'City or village',
    'Населений пункт':'Locality',
    'Наприклад, Богуслав':'For example, Bohuslav',
    'Будь-яке місто чи село':'Any city or village',
    'Сортування':'Sort',
    'Спочатку нові':'Newest first',
    'Від дешевих':'Lowest price',
    'Від дорогих':'Highest price',
    'Від дешевих до дорогих':'Lowest to highest',
    'Від дорогих до дешевих':'Highest to lowest',
    'Скинути':'Reset',
    'Завантажуємо товари…':'Loading products…',
    'Показати демонстраційні картки':'Show demo product cards',
    'Подивитися приклади карток товарів':'View sample product cards',
    'Демонстраційна вітрина: назви, ціни й зображення наведено лише як приклад інтерфейсу. Це не пропозиції продавців, замовити їх неможливо.':'Demo showcase: names, prices and images are shown only as interface examples. These are not seller offers and cannot be ordered.',
    'Демонстраційна вітрина: назви, ціни та зображення наведено для прикладу. Це не пропозиції продавців, замовити їх неможливо.':'Demo showcase: names, prices and images are examples only. These are not seller offers and cannot be ordered.',
    'Перші виробники вже можуть додавати товари':'Producers can already start adding products',
    'Каталог наповнюється після перевірки профілів і модерації. Створіть власний магазин або перегляньте приклади нижче.':'The catalog fills up after profile verification and moderation. Create your own shop or view the examples below.',
    'Стати виробником':'Become a producer',
    'Приклад · не продається':'Demo · not for sale',
    'Демонстраційна картка':'Demo card',
    'Ціна наведена для прикладу':'Example price only',
    'Переглянути товар':'View product',
    'Локальний продукт':'Local product',
    'Виробник':'Producer',
    'Для тих, хто вирощує і робить своє':'For people who grow and make their own products',
    'Ваш продукт має знати більше людей.':'More people should know your product.',
    'Створити профіль':'Create profile',
    'Як працює РІДНЕ для виробників →':'How RIDNE works for producers →',
    'Профіль':'Profile',
    'Перевірка':'Verification',
    'Товар':'Product',
    'Модерація':'Moderation',
    'тип виробництва, область, контакти':'production type, region, contacts',
    'статус виробника та правила категорії':'producer status and category rules',
    'фото, ціна, походження, зберігання':'photo, price, origin, storage',
    'перед публікацією в каталозі':'before publication in the catalog',
    'Демо майбутнього стану':'Preview of a future state',
    'Як виглядатимуть відгуки після реальних замовлень':'How reviews will look after real orders',
    'Зупинити стрічку':'Pause reviews',
    'Запустити стрічку':'Resume reviews',
    'Усі імена, тексти та оцінки в цій стрічці вигадані й показані тільки як макет майбутнього інтерфейсу. Вони не впливають на рейтинги та не є досвідом реальних покупців.':'All names, texts and ratings in this feed are fictional and shown only as a preview of the future interface. They do not affect ratings and are not real customer experiences.',
    'Вигаданий приклад':'Fictional example',
    'Журнал РІДНЕ':'RIDNE Journal',
    'Сезонний гід':'Seasonal guide',
    'Що купувати у вересні':'What to buy in September',
    'Смак сезону у вашому кошику.':'The taste of the season in your basket.',
    'Обираємо уважно':'Choose with care',
    'Як обирати локальний мед':'How to choose local honey',
    'Походження, виробник і зберігання.':'Origin, producer and storage.',
    'Для виробника':'For producers',
    'Профіль, якому довіряють':'A profile people can trust',
    'Розкажіть покупцям про те, що робите.':'Show buyers what you make.',
    'Їжа, у якої є адреса.':'Food with an address.',
    'Правила':'Terms',
    'Правила платформи':'Platform terms',
    'Приватність':'Privacy',
    'Головна':'Home',
    'Обране':'Favorites',
    '© 2026 РІДНЕ · Україна':'© 2026 RIDNE · Ukraine',
    '© 2026 Рідне · Вся Україна':'© 2026 RIDNE · All Ukraine',
    'Покупцям і продавцям':'Buyers & sellers',
    'Написати в РІДНЕ':'Message RIDNE',
    'Написати в РІДНЕ у Telegram — для покупців і продавців':'Message RIDNE on Telegram — for buyers and sellers',

    'Овочі':'Vegetables','Фрукти':'Fruit','Ягоди':'Berries','Мед':'Honey','Зелень і трави':'Greens & herbs','Горіхи':'Nuts','Заготовки':'Preserves','Крафт і вироби':'Craft & handmade','Сухі продукти':'Dry goods','Риба':'Fish','Молочне':'Dairy','М’ясо':'Meat','Яйця':'Eggs',
    'Вінницька':'Vinnytsia Oblast','Волинська':'Volyn Oblast','Дніпропетровська':'Dnipropetrovsk Oblast','Донецька':'Donetsk Oblast','Житомирська':'Zhytomyr Oblast','Закарпатська':'Zakarpattia Oblast','Запорізька':'Zaporizhzhia Oblast','Івано-Франківська':'Ivano-Frankivsk Oblast','Київська':'Kyiv Oblast','Кіровоградська':'Kirovohrad Oblast','Луганська':'Luhansk Oblast','Львівська':'Lviv Oblast','Миколаївська':'Mykolaiv Oblast','Одеська':'Odesa Oblast','Полтавська':'Poltava Oblast','Рівненська':'Rivne Oblast','Сумська':'Sumy Oblast','Тернопільська':'Ternopil Oblast','Харківська':'Kharkiv Oblast','Херсонська':'Kherson Oblast','Хмельницька':'Khmelnytskyi Oblast','Черкаська':'Cherkasy Oblast','Чернівецька':'Chernivtsi Oblast','Чернігівська':'Chernihiv Oblast','АР Крим':'Autonomous Republic of Crimea','м. Київ':'Kyiv','м. Севастополь':'Sevastopol',

    '← До каталогу':'← Back to catalog','Уже є акаунт?':'Already have an account?','Назад':'Back','Продовжити':'Continue','Створити акаунт':'Create account','Повторити лист':'Resend email',
    'Що привело вас на Рідне?':'What brings you to RIDNE?','Купуйте у своїх або розкажіть про те, що створюєте.':'Buy from local producers or tell people what you make.','Ваша роль':'Your role','Хочу купувати':'I want to buy','Шукаю продукти й крафт для себе':'I am looking for food and craft products','Хочу продавати':'I want to sell','Вирощую, виготовляю або майструю':'I grow, produce or make things','Виробники також можуть переглядати каталог і зберігати товари.':'Producers can also browse the catalog and save products.',
    'Що ви створюєте?':'What do you make?','Що вам до смаку?':'What are you interested in?','Оберіть від однієї до п’яти категорій.':'Choose one to five categories.','Категорії':'Categories','Продаж після окремого погодження':'Sale requires separate approval','Оберіть категорію':'Choose category',
    'Де ваше рідне?':'Where are you based?','Покажіть, звідки ваші товари.':'Show where your products come from.','Знаходьте виробників поруч.':'Find producers nearby.','Доступна вся Україна.':'Available across Ukraine.','Область або місто зі спеціальним статусом':'Region or special-status city','Оберіть зі списку':'Choose from the list','Місто, селище або село':'City, town or village','Наприклад, Миронівка':'For example, Myronivka','Точну адресу зараз не потрібно. Доступність доставки залежатиме від продавця та перевізника.':'We do not need your exact address now. Delivery availability depends on the seller and carrier.',
    'Познайомимося?':'Tell us about yourself','Лише необхідне для вашого профілю.':'Only what is necessary for your profile.','Ваше ім’я':'Your name','Електронна пошта':'Email address','На неї надішлемо посилання для входу.':'We will send your sign-in link there.','Назва господарства або майстерні':'Farm or workshop name','Як вас бачитимуть покупці':'How buyers will see you','Ваше виробництво':'Your production type','Оберіть тип':'Choose type','Крафтова майстерня':'Craft workshop','Фермерське господарство':'Farm','Родинне виробництво':'Family production','Статус бізнесу':'Business status','Оберіть статус':'Choose status','Я ФОП':'I am a sole proprietor','Юридична особа':'Legal entity','Фізична особа':'Individual','Планую реєстрацію':'Planning registration','Документи зараз не потрібні. Вибір «Я ФОП» — ваше повідомлення про статус; перевірка для продажу відбувається окремо.':'Documents are not required at this stage. Selecting “sole proprietor” is your declaration of status; seller verification happens separately.',
    'Усе готово для старту':'Ready to get started','Перевірте пошту':'Check your email','Перевірте дані. Надішлемо посилання для підтвердження — пароль вигадувати не потрібно.':'Check your details. We will send a confirmation link — no password is required.','Профіль':'Profile','Покупець':'Buyer','Звідки ви':'Location','Пошта':'Email','Погоджуюся з':'I agree to the','правилами':'terms','обробкою даних':'data processing','Після створення профілю адміністратор Рідне отримає сповіщення з моїми реєстраційними даними.':'After the profile is created, the RIDNE administrator will receive a notification with my registration details.','Не бачите листа? Перевірте «Спам». Повторне надсилання доступне через 60 секунд.':'Cannot see the email? Check Spam. You can resend it after 60 seconds.',
    'Оберіть, хочете ви купувати чи продавати.':'Choose whether you want to buy or sell.','Оберіть від однієї до п’яти категорій.':'Choose one to five categories.','Оберіть область і вкажіть населений пункт.':'Choose a region and enter your locality.','Вкажіть ваше ім’я, щонайменше 2 символи.':'Enter your name, at least 2 characters.','Вкажіть правильну електронну адресу.':'Enter a valid email address.','Вкажіть назву, тип виробництва та статус бізнесу.':'Enter the name, production type and business status.','Для створення профілю потрібна згода з правилами та обробкою даних.':'You must agree to the terms and data processing to create a profile.','Можна обрати до п’яти категорій. Зніміть одну, щоб додати іншу.':'You can choose up to five categories. Remove one to add another.',
    'Лист уже запитано. Зачекайте 60 секунд і спробуйте ще раз.':'An email was already requested. Wait 60 seconds and try again.','Надсилання листів зараз недоступне. Ваші відповіді збережені у вкладці; спробуйте пізніше або зверніться через Telegram.':'Email delivery is currently unavailable. Your answers are saved in this tab; try later or contact us on Telegram.','Не вдалося надіслати посилання для входу. Перевірте адресу й повторіть спробу.':'Could not send the sign-in link. Check the address and try again.','Сервіс входу не завантажився. Оновіть сторінку.':'The sign-in service did not load. Refresh the page.',
    'Ваше Рідне':'Your RIDNE','Раді бачити знову':'Welcome back','Увійдіть за посиланням із листа.':'Sign in using the link in your email.','Надіслати посилання':'Send sign-in link','Ще немає акаунта?':'No account yet?','Створити профіль':'Create profile','Якщо акаунт із цією адресою існує, ви отримаєте лист для входу. Відкрийте його в цьому браузері.':'If an account with this address exists, you will receive a sign-in email. Open it in this browser.','Посилання недійсне або вже використане. Запросіть нове.':'This link is invalid or has already been used. Request a new one.','Відкриваємо ваш кабінет…':'Opening your account…',
    'Особистий кабінет':'Account','Мій профіль':'My profile','Мої товари':'My products','Замовлення':'Orders','Вийти':'Sign out','До каталогу':'Go to catalog','Моя картка':'My profile card','Локація':'Location','Назва виробництва':'Business name','Статус перевірки':'Verification status','Виробника перевірено':'Producer verified','Профіль на перевірці':'Profile under review','Чернетка':'Draft','Потрібні зміни':'Changes required','Профіль призупинено':'Profile suspended','Очікує перевірки':'Awaiting verification','Для зміни даних зверніться до підтримки в Telegram.':'Contact Telegram support to change profile details.','Мої замовлення':'My orders','Замовлень поки немає. Обирайте товари в каталозі.':'No orders yet. Browse products in the catalog.','Потрібна ще одна спроба':'One more try is needed','Повторити':'Try again','До реєстрації':'Back to registration',
    'Додати товар':'Add product','Збережіть товар як чернетку. Для публікації потрібні перевірка профілю та модерація.':'Save the product as a draft. Profile verification and moderation are required before publishing.','Ваш перший товар з’явиться тут.':'Your first product will appear here.','Новий товар':'New product','Назва':'Name','Ціна, грн':'Price, UAH','Одиниця':'Unit','Кількість у наявності':'Available quantity','Опис':'Description','Фото товару':'Product photo','Ваше власне фото, JPG, PNG або WebP до 5 МБ.':'Your own photo, JPG, PNG or WebP up to 5 MB.','Склад (якщо застосовно)':'Ingredients (if applicable)','Умови зберігання':'Storage conditions','Дата збору або виготовлення':'Harvest or production date','Вжити до (якщо застосовно)':'Best before (if applicable)','Зберегти чернетку':'Save draft','Скасувати':'Cancel','На модерацію':'Submit for moderation','На модерації':'Under review','Опубліковано':'Published','Немає в наявності':'Out of stock','Архів':'Archived','Товар надіслано на модерацію.':'Product submitted for moderation.','Чернетку збережено. Тепер її можна подати на модерацію.':'Draft saved. You can now submit it for moderation.','Фото завелике. Максимум — 5 МБ.':'Photo is too large. Maximum size is 5 MB.','Оберіть JPG, PNG або WebP.':'Choose JPG, PNG or WebP.',

    'РІДНЕ · для виробників':'RIDNE · for producers','Ваш продукт має адресу.':'Your product has an address.','Покажімо її покупцю.':'Let buyers see it.','Ваш продукт має адресу. Покажімо її покупцю.':'Your product has an address. Let buyers see it.','РІДНЕ збирає локальні продукти від реальних українських виробників. Ми починаємо з профілю, походження і зрозумілих умов отримання — а не з анонімного оголошення.':'RIDNE brings together local products from real Ukrainian producers. We start with the producer profile, origin and clear fulfillment terms — not an anonymous listing.','Подати товар через Telegram':'Submit a product via Telegram','Як працює перевірка':'How verification works','Три кроки до каталогу.':'Three steps to the catalog.','На старті ми свідомо не відкриваємо безконтрольне масове завантаження. Спочатку перевіряємо дані, які потрібні покупцеві й категорії.':'At launch, we intentionally avoid uncontrolled bulk uploads. We first verify the information that buyers and each category require.','Хто ви і де виробляєте':'Who you are and where you produce','Назва або ім’я виробника, контакти, населений пункт, область і коротка історія господарства чи майстерні.':'Producer or business name, contacts, locality, region and a short story about the farm or workshop.','Що саме продаєте':'What you sell','Категорія, фото, ціна, кількість, походження, склад і умови зберігання — коли вони потрібні для конкретного продукту.':'Category, photo, price, quantity, origin, ingredients and storage conditions — when relevant to the product.','Перевірка перед публікацією':'Verification before publication','Ми звіряємо базові дані та вимоги категорії. Після модерації товар може з’явитися в каталозі РІДНЕ.':'We verify the basic details and category requirements. After moderation, the product may appear in the RIDNE catalog.','Кого шукаємо першими':'Who we are looking for first','Локальні виробники, яких можна показати чесно.':'Local producers we can present transparently.','Для MVP пріоритет — Київщина та категорії, де можна чітко описати походження, сезонність і умови отримання.':'For the MVP, the priority is Kyiv Oblast and categories where origin, seasonality and fulfillment can be described clearly.','овочі, зелень, фрукти та ягоди;':'vegetables, greens, fruit and berries;','мед і продукти бджільництва;':'honey and bee products;','горіхи та сухі локальні продукти;':'nuts and local dry goods;','заготовки й крафтові продукти з належним маркуванням;':'preserves and craft products with proper labeling;','рибні господарства та рибна продукція з підтвердженим походженням;':'fish farms and fish products with verified origin;','м’ясо й м’ясна продукція лише там, де виконані обов’язкові вимоги до документів і зберігання.':'meat and meat products only where mandatory documentation and storage requirements are met.','Що бачить покупець':'What the buyer sees','Не «домашнє». Конкретне.':'Not just “homemade”. Specific and traceable.','Профіль виробника має пояснювати, хто зробив продукт, звідки він, як його отримати і які дані підтверджують довіру.':'The producer profile should explain who made the product, where it comes from, how to receive it and which details support trust.','Не обіцяємо автоматичну публікацію.':'We do not promise automatic publication.','Категорії харчових продуктів можуть мати різні вимоги до реєстрації потужності, маркування, простежуваності та безпечного зберігання. РІДНЕ запитує релевантні дані під час модерації.':'Food categories may have different requirements for facility registration, labeling, traceability and safe storage. RIDNE requests the relevant information during moderation.','Почати':'Get started','Є продукт із Київщини?':'Do you make a product in Kyiv Oblast?','Надішліть базові дані через Telegram. Це найкоротший шлях потрапити до першої хвилі виробників РІДНЕ.':'Send the basic details via Telegram. It is the fastest way to join the first wave of RIDNE producers.','Подати заявку':'Apply','Локальні продукти · реальні виробники · видиме походження':'Local products · real producers · visible origin',

    'Правила платформи · пілотний запуск':'Platform terms · pilot launch','Чесний товар. Реальний виробник. Видиме походження.':'Honest products. Real producers. Visible origin.','Ці правила описують базові умови подання профілю виробника і товарів до каталогу РІДНЕ на етапі контрольованого запуску.':'These terms describe the basic conditions for submitting a producer profile and products to the RIDNE catalog during the controlled launch.','Онлайн-оплата та автоматичне списання комісії зараз не активовані. Платіжний функціонал буде запущено окремо після перевірки провайдера, облікової моделі, повернень і виплат продавцям.':'Online payment and automatic commission collection are not active yet. Payment functionality will launch separately after the provider, accounting model, refunds and seller payouts are verified.','1. Хто може продавати':'1. Who can sell','Кожен товар має бути прив’язаний до реального профілю виробника. Під час onboarding РІДНЕ запитує контактні дані, локацію, тип виробництва та відомості, потрібні для перевірки продавця. Анонімні публікації не допускаються.':'Every product must be linked to a real producer profile. During onboarding, RIDNE requests contact details, location, production type and information needed to verify the seller. Anonymous listings are not allowed.','2. Реєстрація потужності':'2. Facility registration','Для харчових товарів продавець має надати дані державної реєстрації потужності оператора ринку або інші необхідні дозвільні відомості відповідно до категорії товару. Надання номера не означає автоматичної верифікації — дані проходять модерацію.':'For food products, the seller must provide state facility registration details or other permits required for the category. Providing a number does not mean automatic verification — the data is reviewed.','3. Які товари допускаються':'3. Eligible products','На старті РІДНЕ фокусується на контрольованих категоріях: овочі, фрукти, ягоди, зелень, горіхи, мед, сухі продукти та окремі заготовки. Категорії підвищеного ризику, зокрема м’ясо, молочні продукти, риба та яйця, не публікуються без окремо підтверджених вимог і документів.':'At launch, RIDNE focuses on controlled categories: vegetables, fruit, berries, greens, nuts, honey, dry goods and selected preserves. Higher-risk categories including meat, dairy, fish and eggs are not published without separately confirmed requirements and documentation.','4. Що потрібно вказати про товар':'4. Product information required','Продавець подає реальне фото, назву, опис, ціну, одиницю продажу, доступну кількість, походження, дату збору або виробництва — коли це застосовно — та умови зберігання. Заборонено вказувати неправдиве походження, сертифікати, статуси або властивості товару.':'The seller provides a real photo, name, description, price, unit, available quantity, origin, harvest or production date when applicable, and storage conditions. False origin, certificates, statuses or product claims are prohibited.','5. Модерація':'5. Moderation','Профіль виробника і кожен новий товар можуть проходити ручну перевірку. РІДНЕ може запросити уточнення, відхилити або призупинити публікацію, якщо дані неповні, суперечливі або категорія потребує додаткового підтвердження.':'The producer profile and each new product may be manually reviewed. RIDNE may request clarification, reject or pause publication if information is incomplete, inconsistent or requires additional category-specific confirmation.','6. Замовлення під час пілоту':'6. Orders during the pilot','Поки онлайн-оплата не активована, Telegram-бот створює структуровану заявку на замовлення і повідомляє продавця. Така заявка не є підтвердженням оплати. Умови виконання, доставки та остаточне підтвердження замовлення узгоджуються в межах доступного функціоналу РІДНЕ.':'While online payment is inactive, the Telegram bot creates a structured order request and notifies the seller. This request is not proof of payment. Fulfillment, delivery and final order confirmation are agreed within the available RIDNE functionality.','7. Комісія':'7. Commission','Архітектура РІДНЕ передбачає транзакційну комісію marketplace. До активації платежів комісія фактично не списується. Остаточна ставка, механіка утримання, повернення та виплати продавцям будуть оприлюднені до запуску платіжного функціоналу.':'RIDNE architecture allows for a marketplace transaction commission. No commission is charged before payments are activated. The final rate, withholding mechanism, refunds and seller payouts will be published before payment functionality launches.','8. Підтримка':'8. Support','Після запуску Telegram-бота звернення можна буде передати командою /support. Платформа зберігає історію модерації та службові події, необхідні для обробки заявок і підтримки.':'Support requests can be sent through the Telegram bot with /support. The platform stores moderation history and service events necessary to process requests and provide support.',

    'Рідне · приватність':'RIDNE · privacy','Ваші дані на Рідне':'Your data on RIDNE','Оновлено 12 вересня 2026 року.':'Updated September 12, 2026.','Що ми зберігаємо':'What we store','Для акаунта: ім’я, підтверджену електронну адресу, роль, обрані категорії, область і населений пункт. Для продавця — також назву виробництва, його тип і заявлений вами статус бізнесу. Паролі та коди входу не передаємо адміністратору.':'For your account: name, confirmed email address, role, selected categories, region and locality. For sellers: business name, production type and the business status you declare. Passwords and sign-in codes are not shared with the administrator.','Навіщо це потрібно':'Why we need it','Щоб створити ваш кабінет, показати відповідні товари, опрацювати звернення й модерувати профілі та оголошення. Заявлений статус ФОП не означає, що виробника перевірено.':'To create your account, show relevant products, process requests and moderate profiles and listings. Declaring sole-proprietor status does not mean the producer has been verified.','Хто отримує інформацію':'Who receives the information','Дані акаунта зберігаються у Supabase. Після створення профілю адміністратору Рідне на doctorgebel@gmail.com надсилається сповіщення з ім’ям, поштою, роллю, категоріями та загальною локацією. Ця адреса також використовується для звернень щодо приватності. Публічно показуємо лише інформацію магазину й товарів після модерації; коди входу, приватні документи та пошту покупця не публікуємо.':'Account data is stored in Supabase. After a profile is created, the RIDNE administrator at doctorgebel@gmail.com receives a notification containing name, email, role, categories and general location. This address is also used for privacy requests. Only moderated shop and product information is public; sign-in codes, private documents and buyer email addresses are never published.','Збереження та видалення':'Retention and deletion','Дані профілю зберігаємо, доки акаунт потрібен для користування платформою, з урахуванням обов’язків щодо завершених операцій. Щоб отримати копію, виправити або видалити дані, напишіть на doctorgebel@gmail.com з адреси свого акаунта.':'Profile data is retained while the account is needed to use the platform, subject to obligations related to completed transactions. To request a copy, correction or deletion, email doctorgebel@gmail.com from your account address.','Локальне збереження':'Local storage','Браузер зберігає незавершені відповіді онбордингу в межах вкладки, сесію входу та ідентифікатори обраних товарів. Можна вийти з акаунта або очистити дані сайту в браузері. Ми не запитуємо точну геолокацію автоматично.':'The browser stores unfinished onboarding answers within the tab, your sign-in session and favorite product IDs. You can sign out or clear site data in your browser. We do not automatically request precise location.','Відгуки та приклади':'Reviews and examples','Вигадані приклади товарів і відгуків завжди позначені як демонстраційні. Вони не беруть участі в рейтингах або оформленні замовлень.':'Fictional product and review examples are always marked as demos. They do not affect ratings or ordering.',

    'РІДНЕ · Telegram':'RIDNE · Telegram','Товар у каталог — без зайвого кабінету.':'List a product without unnecessary forms.','Виробник створює профіль і товар прямо в Telegram: категорія, тип товару, одиниця, ціна, кількість та умови зберігання обираються кнопками. Після перевірки профілю і товару заявка потрапляє на модерацію.':'A producer creates a profile and product directly in Telegram: category, product type, unit, price, quantity and storage are selected with buttons. After profile and product checks, the submission goes to moderation.','Відкрити Telegram-бот':'Open Telegram bot','На ridne.store':'Go to ridne.store','Без довгих форм і ручного введення структурованих даних.':'No long forms or repetitive structured data entry.','Перші 50 заявок на розміщення — без оплати під час запуску.':'The first 50 listing applications are free during launch.','Немодеровані товари не потрапляють у публічний каталог.':'Unmoderated products do not enter the public catalog.','Етапи роботи':'How it works','1. Профіль виробника':'1. Producer profile','Тип виробництва, область і контакт Telegram — без номера телефону та зайвих анкет.':'Production type, region and Telegram contact — no phone number or unnecessary questionnaires.','2. Товар кнопками':'2. Product via buttons','Категорія, конкретний товар, одиниця, ціна, кількість, зберігання та фото.':'Category, specific product, unit, price, quantity, storage and photo.','3. Безкоштовний запуск':'3. Free launch','Перші 50 заявок подаються без оплати. Подальшу модель розміщення буде оголошено окремо.':'The first 50 applications are submitted free of charge. The next listing model will be announced separately.','4. Модерація':'4. Moderation','Публікація можлива лише після перевірки профілю й товару.':'Publication is possible only after the profile and product are reviewed.','5. Замовлення':'5. Orders','Покупець створює заявку, а продавець отримує повідомлення в Telegram.':'The buyer creates a request and the seller receives a Telegram notification.',

    'До журналу':'Back to Journal','Журнал РІДНЕ · сезонність':'RIDNE Journal · seasonality','Вересень — момент, коли локальний кошик в Україні може бути максимально різноманітним: ще є літні овочі й зелень, одночасно входять у сезон яблука, груші, сливи, гарбузові та продукти для осінніх заготовок.':'September is when a local food basket in Ukraine can be exceptionally diverse: summer vegetables and greens are still available while apples, pears, plums, pumpkins and produce for autumn preserving come into season.','Що шукати насамперед':'What to look for first','Овочі:':'Vegetables:','томати, перець, баклажани, огірки, кабачки, гарбуз, буряк, морква, цибуля та картопля. Для локальної покупки важливі не лише назва й ціна, а населений пункт, дата збору та зрозумілий спосіб отримання.':'tomatoes, peppers, eggplants, cucumbers, zucchini, pumpkin, beetroot, carrots, onions and potatoes. For local purchases, locality, harvest date and a clear fulfillment method matter as much as the name and price.','Фрукти:':'Fruit:','яблука, груші та сливи. У вересні особливо доречно шукати господарства поруч: коротша логістика дає можливість купувати стиглий продукт без зайвого зберігання.':'apples, pears and plums. September is a good time to look for nearby farms: shorter logistics make it possible to buy ripe produce with less storage.','Ягоди й мед:':'Berries & honey:','фактична наявність залежить від сорту, погоди та регіону. Для меду дивіться не на слово «домашній», а на походження пасіки, вид меду й інформацію від виробника. Детальніше — у нашому гіді':'actual availability depends on variety, weather and region. For honey, look beyond the word “homemade” and check the apiary origin, honey type and producer information. Read more in our guide','як обирати локальний мед':'how to choose local honey','Київщина: шукайте не «кращий продукт», а найближчого зрозумілого виробника':'Kyiv Oblast: look for the nearest transparent producer, not an abstract “best product”','Для Київської області корисний сценарій пошуку простий: продукт → населений пункт або район → самовивіз чи доставка → профіль виробника. Це дозволяє порівнювати не абстрактні оголошення, а реальні пропозиції з видимим походженням.':'A useful search flow for Kyiv Oblast is simple: product → locality or district → pickup or delivery → producer profile. This lets you compare real offers with visible origin rather than anonymous listings.','Як перевіряти локальну пропозицію':'How to check a local offer','Перед замовленням уточніть чотири речі: де продукт вирощений або виготовлений, коли зібраний чи вироблений, як зберігався та яким способом його можна отримати. Для категорій із додатковими вимогами до безпеки й документів — зокрема м’яса, риби та частини переробленої продукції — важливі підтверджені дані виробника, а не лише фото.':'Before ordering, confirm four things: where the product was grown or made, when it was harvested or produced, how it was stored and how it can be received. For categories with additional safety and documentation requirements — including meat, fish and some processed foods — verified producer information matters, not just photos.','Хочете продавати власну продукцію?':'Want to sell your own products?','РІДНЕ будує каталог із реальних локальних пропозицій, тому спочатку набираємо якісну пропозицію від виробників. Якщо ви вирощуєте або виготовляєте продукт в Україні, перегляньте сторінку':'RIDNE is building a catalog of real local offers, so we are first onboarding quality supply from producers. If you grow or make a product in Ukraine, visit the','для виробників':'for producers','і подайте інформацію про господарство та товари.':'page and submit information about your farm or workshop and products.','Матеріал є редакційним гідом про сезонність і локальний вибір. Реальна доступність продукту залежить від регіону, погоди, сорту та конкретного виробника.':'This article is an editorial guide to seasonality and local choice. Actual product availability depends on region, weather, variety and the individual producer.',

    'Журнал РІДНЕ · гід':'RIDNE Journal · guide','Як обирати локальний мед і перевіряти походження':'How to choose local honey and verify its origin','Хороший вибір починається не з красивої етикетки, а з відповіді на прості питання: хто зробив мед, де його зібрали, коли фасували і як зберігали.':'A good choice starts not with a pretty label, but with simple answers: who made the honey, where it was collected, when it was packed and how it was stored.','1. Подивіться, хто виробник':'1. Check who the producer is','У локального продукту має бути зрозумілий виробник або пасіка, контакт і населений пункт. Для РІДНЕ це базова частина профілю: покупець має бачити не лише назву товару, а й його джерело.':'A local product should have a clearly identified producer or apiary, contact and locality. For RIDNE this is a basic part of the profile: buyers should see not only the product name, but also its source.','2. Уточніть місце та період збору':'2. Check the place and harvest period','Назва на кшталт «акацієвий» або «липовий» корисна лише разом із походженням. Регіон, місце пасіки й сезон допомагають зрозуміти контекст продукту та порівнювати пропозиції чесніше.':'Names such as “acacia” or “linden” are useful only together with origin. Region, apiary location and season provide context and make offers easier to compare fairly.','3. Перевірте партію і дату фасування':'3. Check the batch and packing date','Для повторної покупки важливо розуміти, до якої партії належить продукт. Дата фасування, номер партії та доступна інформація про зберігання роблять товар простежуваним, а не анонімним.':'For repeat purchases it helps to know which batch the product belongs to. Packing date, batch number and available storage information make a product traceable rather than anonymous.','4. Не робіть висновок лише за консистенцією':'4. Do not judge by texture alone','Рідкий або кристалізований стан сам по собі не є достатнім доказом якості. На практиці важливіше мати прозорі дані про продукт і виробника, а для питань безпеки — орієнтуватися на чинні вимоги та підтверджені відомості.':'Liquid or crystallized consistency alone is not proof of quality. In practice, transparent product and producer information matters more, while safety decisions should rely on current requirements and verified information.','Що РІДНЕ показуватиме в картці продукту':'What RIDNE will show on a product card','Ми проєктуємо картку так, щоб поруч із ціною були виробник, локація, походження, партія, умови отримання та релевантні для категорії дані. Це дозволяє обирати локально не «на віру», а за зрозумілими ознаками.':'We design product cards so the price sits alongside the producer, location, origin, batch, fulfillment terms and category-relevant details. This makes local choice evidence-based rather than a matter of faith.','Я виробник меду — додати свій продукт':'I produce honey — add my product','Далі: що купувати у вересні в українських виробників →':'Next: what to buy from Ukrainian producers in September →','Матеріал є редакційним поясненням продуктового підходу РІДНЕ і не замінює вимоги законодавства, лабораторні висновки чи рекомендації з харчової безпеки.':'This article explains RIDNE’s product approach and does not replace legal requirements, laboratory findings or food-safety guidance.',

    'Журнал РІДНЕ · Довіра':'RIDNE Journal · Trust','Профіль виробника, якому довіряють':'A producer profile you can trust','Коли покупець обирає локальний продукт, довіра починається не з красивої фотографії, а з відповідей на прості питання: хто це зробив, де, коли, з чого і як товар потрапить до покупця.':'When a buyer chooses a local product, trust starts not with a beautiful photo but with simple answers: who made it, where, when, from what, and how it will reach the buyer.','1. Видно, хто саме продає':'1. It is clear who is selling','У профілі має бути зрозуміле ім’я виробника або господарства, населений пункт, регіон і спосіб зв’язку. Для РІДНЕ товар не повинен існувати окремо від реального продавця: кожна пропозиція прив’язується до профілю виробника.':'The profile should clearly show the producer or farm name, locality, region and contact method. On RIDNE, a product should never exist separately from a real seller: every offer is linked to a producer profile.','2. Походження продукту описане конкретно':'2. Product origin is described specifically','Фраза «домашнє» сама по собі нічого не доводить. Корисніше бачити, де вирощено овочі, де розташована пасіка, з якого господарства риба або де виготовлено крафтовий продукт. Для окремих категорій важливі також партія, дата виготовлення та умови зберігання.':'The word “homemade” proves nothing by itself. It is more useful to see where vegetables were grown, where the apiary is located, which farm the fish comes from or where a craft product was made. For some categories, batch, production date and storage conditions also matter.','3. Дані відповідають категорії товару':'3. Information matches the product category','Для меду, свіжих овочів, риби чи м’ясної продукції набір важливих даних різний. Тому РІДНЕ не зводить довіру до одного універсального бейджа: профіль і картка продукту мають показувати саме ту інформацію, яка допомагає оцінити конкретну категорію.':'Honey, fresh vegetables, fish and meat each require different information. RIDNE therefore does not reduce trust to one universal badge: the profile and product card should show the information that matters for that category.','4. Покупець розуміє спосіб отримання':'4. The buyer understands fulfillment','Самовивіз, доставка виробника, доступний район, орієнтовний термін і умови передачі мають бути зрозумілими до контакту з продавцем. Це прибирає зайві повідомлення й робить локальний пошук практичним.':'Pickup, producer delivery, service area, estimated timing and handoff terms should be clear before contacting the seller. This removes unnecessary messages and makes local discovery practical.','5. Статус перевірки не маскує факти':'5. Verification status does not hide the facts','Позначка перевірки корисна лише тоді, коли зрозуміло, що саме перевірено. Тому важливі не тільки бейджі, а й видимі поля: особа або господарство, локація, походження, релевантні документи та дані конкретного товару.':'A verification badge is useful only when it is clear what was actually verified. Visible fields matter as much as badges: person or farm, location, origin, relevant documents and product-specific data.','Чекліст перед покупкою':'Checklist before buying','Перевірте, чи зрозуміло хто продавець, звідки продукт, коли він виготовлений або зібраний, як його зберігали, як ви його отримаєте та які дані підтверджені. Для меду додатково корисний наш гід':'Check whether it is clear who the seller is, where the product comes from, when it was made or harvested, how it was stored, how you will receive it and which information is verified. For honey, also see our guide','як обирати локальний мед і перевіряти походження':'how to choose local honey and verify its origin','Якщо ви самі виробляєте локальні продукти, перегляньте сторінку':'If you produce local food yourself, see','РІДНЕ для виробників':'RIDNE for producers','там описано, які базові дані підготувати для першої хвилі розміщень.':'for the basic information to prepare for the first wave of listings.','Матеріал є редакційним поясненням продуктового підходу РІДНЕ. Він не підміняє вимоги законодавства, харчової безпеки чи документів для конкретної категорії.':'This is an editorial explanation of RIDNE’s product approach. It does not replace legal, food-safety or category-specific documentation requirements.'
  }));

  const PLACEHOLDERS = new Map([
    ['Що шукаєте? Мед, яблука, сир…','What are you looking for? Honey, apples, cheese…'],
    ['Мед, яблука, щось до столу…','Honey, apples, something for the table…'],
    ['Наприклад, Богуслав','For example, Bohuslav'],
    ['Будь-яке місто чи село','Any city or village'],
    ['Наприклад, Миронівка','For example, Myronivka'],
    ['Як вас бачитимуть покупці','How buyers will see you']
  ]);

  const TITLE_MAP = new Map([
    ['РІДНЕ — локальні продукти напряму від українських виробників','RIDNE — local products direct from Ukrainian producers'],
    ['Створити профіль за 5 кроків — Рідне','Create a profile in 5 steps — RIDNE'],
    ['Мій кабінет — Рідне','My account — RIDNE'],
    ['Виробникам — продавати локальні продукти на РІДНЕ','For producers — sell local products on RIDNE'],
    ['Правила платформи — РІДНЕ','Platform terms — RIDNE'],
    ['Приватність — Рідне','Privacy — RIDNE'],
    ['РІДНЕ в Telegram — купуйте та продавайте локальні продукти','RIDNE on Telegram — buy and sell local products'],
    ['Що купувати у вересні в Україні: сезонні локальні продукти — РІДНЕ','What to buy in Ukraine in September: seasonal local products — RIDNE'],
    ['Як обирати локальний мед і перевіряти походження — РІДНЕ','How to choose local honey and verify its origin — RIDNE'],
    ['Профіль виробника, якому довіряють: що має бути видно — РІДНЕ','A producer profile you can trust: what buyers should see — RIDNE']
  ]);

  function translateValue(value) {
    if (!value || lang !== 'en') return value;
    const clean = value.trim();
    if (T.has(clean)) return value.replace(clean, T.get(clean));
    let m;
    if ((m = clean.match(/^Крок (\d+) із 5$/))) return `Step ${m[1]} of 5`;
    if ((m = clean.match(/^(\d+) із 5$/))) return `${m[1]} of 5`;
    if ((m = clean.match(/^(\d+) товарів · (.+)$/))) {
      let where = m[2].replace('Вся Україна','All Ukraine').replace('Обране','Favorites');
      return `${m[1]} products · ${where}`;
    }
    if ((m = clean.match(/^Вітаємо, (.+)!$/))) return `Welcome, ${m[1]}!`;
    if ((m = clean.match(/^Надіслали посилання на (.+)\. Відкрийте лист у цьому браузері, щоб завершити створення профілю\.$/))) return `We sent a link to ${m[1]}. Open the email in this browser to finish creating your profile.`;
    if ((m = clean.match(/^№ (.+) · Нове · (.+)$/))) return `# ${m[1]} · New · ${m[2]}`;
    return value;
  }

  function translateElement(root) {
    if (lang !== 'en' || !root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const tag = node.parentElement?.tagName;
        if (!node.nodeValue.trim() || ['SCRIPT','STYLE','NOSCRIPT'].includes(tag)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => { node.nodeValue = translateValue(node.nodeValue); });

    const elements = root.nodeType === Node.ELEMENT_NODE ? [root, ...root.querySelectorAll('*')] : [...document.querySelectorAll('*')];
    elements.forEach(el => {
      ['aria-label','title','alt'].forEach(attr => {
        const val = el.getAttribute?.(attr);
        if (val) el.setAttribute(attr, translateValue(val));
      });
      if (el.hasAttribute?.('placeholder')) {
        const val = el.getAttribute('placeholder');
        el.setAttribute('placeholder', PLACEHOLDERS.get(val) || translateValue(val));
      }
    });
  }

  function addSwitcher() {
    if (document.querySelector('.ridne-language-switch')) return;
    const nav = document.createElement('div');
    nav.className = 'ridne-language-switch';
    nav.setAttribute('role','group');
    nav.setAttribute('aria-label', lang === 'en' ? 'Language' : 'Мова');
    nav.innerHTML = `<button type="button" data-ridne-lang="uk" aria-pressed="${lang === 'uk'}">Українська</button><span aria-hidden="true">/</span><button type="button" data-ridne-lang="en" aria-pressed="${lang === 'en'}">English</button>`;
    const host = document.querySelector('.header-row') || document.querySelector('.header-inner') || document.querySelector('.legal-head') || document.querySelector('main') || document.body;
    host.appendChild(nav);
    nav.querySelectorAll('[data-ridne-lang]').forEach(btn => btn.addEventListener('click', () => {
      const next = btn.dataset.ridneLang;
      try { localStorage.setItem(STORAGE_KEY, next); } catch (_) {}
      const url = new URL(location.href);
      url.searchParams.delete('lang');
      location.href = url.href;
    }));
  }

  function addStyles() {
    if (document.getElementById('ridne-i18n-style')) return;
    const style = document.createElement('style');
    style.id = 'ridne-i18n-style';
    style.textContent = `.ridne-language-switch{display:inline-flex;align-items:center;gap:7px;margin-left:auto;flex:none;padding:6px 9px;border:1px solid rgba(31,38,31,.16);border-radius:999px;background:rgba(255,255,255,.86);backdrop-filter:blur(12px);font-size:11px;line-height:1;white-space:nowrap;color:#172d23}.ridne-language-switch button{appearance:none;border:0;background:transparent;color:inherit;padding:5px 3px;cursor:pointer;font:inherit;font-weight:650;opacity:.5}.ridne-language-switch button[aria-pressed="true"]{opacity:1}.site-header .ridne-language-switch{margin-left:10px}.legal-head>.ridne-language-switch,main>.ridne-language-switch{position:fixed;right:14px;top:14px;z-index:250;box-shadow:0 8px 30px rgba(0,0,0,.08)}@media(max-width:800px){.ridne-language-switch{order:2;margin-left:4px;font-size:10px;padding:5px 7px}.header-row .ridne-language-switch{margin-left:0}.site-header .ridne-language-switch{margin-left:auto}.ridne-language-switch button{padding:5px 2px}}`;
    document.head.appendChild(style);
  }

  function applyMeta() {
    document.documentElement.lang = lang === 'en' ? 'en' : 'uk';
    if (lang !== 'en') return;
    document.title = TITLE_MAP.get(document.title) || document.title;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) {
      const translated = translateValue(desc.content);
      if (translated !== desc.content) desc.content = translated;
    }
  }

  function boot() {
    addStyles();
    applyMeta();
    if (lang === 'en') translateElement(document.body);
    addSwitcher();
    if (lang === 'en') translateElement(document.querySelector('.ridne-language-switch'));

    const observer = new MutationObserver(mutations => {
      if (lang !== 'en') return;
      mutations.forEach(m => m.addedNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) node.nodeValue = translateValue(node.nodeValue);
        else if (node.nodeType === Node.ELEMENT_NODE) translateElement(node);
      }));
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
