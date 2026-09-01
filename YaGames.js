// Name: Yandex Games SDK
// ID: yagames
// Description: Полная интеграция Yandex Games SDK v2 для DashBlocks / TurboWarp.
// Author: timaaos, scratch_craft_2, Den4ik-12, DBDev (improved & extended edition)
// Version: 2.1.0
// License: MPL-2.0
// Context: unsandboxed
//
// ============================================================================
//  Yandex Games SDK  —  расширение для DashBlocks (мод TurboWarp)
// ----------------------------------------------------------------------------
//  Что нового в 2.1.0:
//   * Все JSON-блоки стали «квадратными»: они возвращают настоящие структуры
//     DashBlocks (Scratch.NormalArray / Scratch.NormalObject), которые можно
//     класть в переменные, разворачивать в мониторе и разбирать блоками
//     категории JSON. В обычном TurboWarp (где этих классов нет) те же блоки
//     автоматически отдают JSON-строку — проект не ломается.
//   * Блоки сохранения принимают как JSON-строку, так и объект Dash.
//
//  Что было исправлено в 2.0.0 по сравнению с оригиналом:
//   * Исправлены критические баги оригинала:
//       - initsdk(): `script.onload = async function(){...}` использовал `this`
//         внутри обычной функции -> `this.ysdk` записывался в объект <script>,
//         а не в расширение. SDK фактически никогда не сохранялся.
//       - showFullscreenAdv onClose/onError — обычные function, `this.isAdOpened`
//         терялся, флаг «реклама открыта» залипал.
//       - canRateGame() возвращал undefined (синхронный return до resolve промиса).
//       - getdata() вызывал player.getData(key) без await и без массива ключей.
//       - setdata()/login(): `function initPlayer(){ return this.ysdk... }` —
//         вызов без контекста => TypeError.
//       - alreadyLogin() проверял getMode() == "lite" (это как раз НЕ
//         авторизованный игрок). Теперь используется player.isAuthorized().
//       - Getliaders() не ждал промис getEntries().
//       - loadID() «проглатывал» все ошибки кроме одной и возвращал undefined.
//       - initsdk() глушил звук по visibilitychange через обычную function,
//         где `this` === document.
//   * Добавлено ~90 блоков: реклама (fullscreen/rewarded/sticky), лидерборды,
//     покупки, игрок, облачные сохранения, окружение, отзывы, ярлык,
//     GameplayAPI/LoadingAPI, буфер обмена, remote config (флаги).
//   * HAT-блоки (события) для всех колбэков рекламы и покупок.
//   * Переводы: ru, en, tr, uk.
//   * Единая безопасная обёртка ошибок + репортер «последняя ошибка».
//   * Ни одного eval / new Function / innerHTML.
// ============================================================================

(function (Scratch) {
  "use strict";

  if (!Scratch.extensions.unsandboxed) {
    throw new Error(
      "Yandex Games SDK:\nThis extension must run unsandboxed!\n" +
        "Пожалуйста, включите небезопасный (unsandboxed) режим при загрузке расширения."
    );
  }

  const vm = Scratch.vm;
  const runtime = vm.runtime;
  const Cast = Scratch.Cast;

  // Иконка расширения (инлайновый SVG в data-URI — работает и без сети).
  const ICON =
    "data:image/svg+xml;base64," +
    btoa(
      '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">' +
        '<rect width="40" height="40" rx="9" fill="#4C1CBA"/>' +
        '<path d="M23.2 8.5h-3.9c-4.4 0-7.4 2.8-7.4 6.9 0 3.3 1.6 5.2 4.3 7.1L11.6 32h3.9l4.9-9.9-2-1.3c-2.2-1.5-3.3-2.7-3.3-5.2 0-2.2 1.5-3.7 4.3-3.7h1.5V32h3.6V8.5h-1.3z" fill="#fff"/>' +
        "</svg>"
    );

  // ==========================================================================
  //  1. ЛОКАЛИЗАЦИЯ (ru / en / tr / uk)
  // ==========================================================================
  const TRANSLATIONS = {
    en: {
      "yagames.name": "Yandex Games SDK",
      // --- core
      "lbl.core": "Initialization",
      "init": "initialize Yandex SDK",
      "initWait": "initialize Yandex SDK and wait",
      "debug": "enable debug (offline) mode",
      "ready": "SDK initialized?",
      "loadingReady": "tell SDK the game is ready (LoadingAPI.ready)",
      "lastError": "last error",
      "clearError": "clear last error",
      "raw": "raw SDK value of path [PATH]",
      // --- ads
      "lbl.ads": "Advertising",
      "showFullscreenAd": "show fullscreen ad",
      "showRewardedAd": "show rewarded video",
      "whenAdEvent": "when ad event [EVENT]",
      "adWasShown": "last ad was shown?",
      "rewardReceived": "reward received?",
      "adIsOpen": "ad is open?",
      "bannerShow": "show sticky banner",
      "bannerHide": "hide sticky banner",
      "bannerRefresh": "refresh sticky banner",
      "bannerVisible": "sticky banner is showing?",
      "bannerReason": "sticky banner status reason",
      // --- leaderboards
      "lbl.lb": "Leaderboards",
      "lbSetScore": "set score [SCORE] in leaderboard [NAME] with extra data [EXTRA]",
      "lbPlayerScore": "my score in leaderboard [NAME]",
      "lbPlayerRank": "my rank in leaderboard [NAME]",
      "lbPlayerEntry": "my entry (JSON) in leaderboard [NAME]",
      "lbEntries": "entries of leaderboard [NAME] top [TOP] around me [AROUND]",
      "lbEntryField": "[FIELD] of place [INDEX] in leaderboard [NAME] top [TOP] around me [AROUND]",
      "lbDescription": "description (JSON) of leaderboard [NAME]",
      // --- purchases
      "lbl.iap": "In-App Purchases",
      "iapInit": "initialize purchases",
      "iapReady": "purchases available?",
      "iapCatalog": "products catalog (JSON)",
      "iapCatalogField": "[FIELD] of product [ID]",
      "iapPurchase": "buy product [ID] with payload [PAYLOAD]",
      "iapPurchases": "my purchases (JSON)",
      "iapHas": "product [ID] purchased?",
      "iapConsume": "consume purchase [ID]",
      "iapConsumeAll": "consume all purchases",
      "whenPurchase": "when purchase [EVENT]",
      "lastPurchase": "last purchase (JSON)",
      // --- player
      "lbl.player": "Player & auth",
      "isAuthorized": "player authorized?",
      "openAuth": "open authorization dialog",
      "playerName": "player name",
      "playerId": "player unique ID",
      "playerAvatar": "player avatar URL size [SIZE]",
      "playerPaying": "player paying status",
      "playerMode": "player mode",
      "playerJSON": "player info (JSON)",
      // --- storage
      "lbl.data": "Cloud saves",
      "setData": "save data [DATA] flush [FLUSH]",
      "setKey": "save key [KEY] = [VALUE]",
      "getData": "loaded save: value of key [KEY]",
      "getAllData": "loaded save (JSON)",
      "loadData": "load save from cloud",
      "resetData": "erase save",
      "setStats": "increment stats [DATA]",
      "getStats": "stats (JSON)",
      // --- environment
      "lbl.env": "Environment",
      "lang": "game language",
      "tld": "domain (tld)",
      "appId": "app ID",
      "payload": "launch payload",
      "browserLang": "browser language",
      "serverTime": "server time",
      "deviceType": "device type",
      "isDevice": "device is [TYPE]?",
      "isTopLevel": "opened inside Yandex Games frame?",
      // --- feedback / shortcut
      "lbl.extra": "Feedback, shortcut, misc",
      "canReview": "can rate the game?",
      "requestReview": "show rating popup",
      "reviewDone": "game was rated?",
      "canShortcut": "can add shortcut?",
      "addShortcut": "show add-shortcut prompt",
      "shortcutAccepted": "shortcut was added?",
      "clipboard": "copy [TEXT] to clipboard",
      "gameplayStart": "gameplay start",
      "gameplayStop": "gameplay stop",
      "getFlags": "remote config flags (JSON)",
      "getFlag": "flag [NAME] (default [DEFAULT])",
      "muteOnHide": "mute game when tab is hidden [ON]",
      // --- menus
      "m.open": "opened",
      "m.close": "closed",
      "m.error": "error",
      "m.offline": "offline",
      "m.rewarded": "rewarded",
      "m.success": "successful",
      "m.failed": "failed",
      "m.small": "small",
      "m.medium": "medium",
      "m.large": "large",
      "m.desktop": "desktop",
      "m.mobile": "mobile",
      "m.tablet": "tablet",
      "m.tv": "TV",
      "m.score": "score",
      "m.rank": "rank",
      "m.name": "name",
      "m.avatar": "avatar",
      "m.extra": "extra data",
      "m.title": "title",
      "m.price": "price",
      "m.priceValue": "price value",
      "m.currency": "currency code",
      "m.desc": "description",
      "m.image": "image URL",
      "m.currencyImage": "currency image URL",
      "on": "on",
      "off": "off",
    },
    ru: {
      "yagames.name": "Yandex Games SDK",
      "lbl.core": "Инициализация",
      "init": "инициализировать Yandex SDK",
      "initWait": "инициализировать Yandex SDK и ждать",
      "debug": "включить отладочный (офлайн) режим",
      "ready": "SDK инициализирован?",
      "loadingReady": "сообщить SDK, что игра загружена (LoadingAPI.ready)",
      "lastError": "последняя ошибка",
      "clearError": "очистить последнюю ошибку",
      "raw": "значение SDK по пути [PATH]",
      "lbl.ads": "Реклама",
      "showFullscreenAd": "показать полноэкранную рекламу",
      "showRewardedAd": "показать рекламу за вознаграждение",
      "whenAdEvent": "когда реклама [EVENT]",
      "adWasShown": "реклама была показана?",
      "rewardReceived": "награда получена?",
      "adIsOpen": "реклама открыта?",
      "bannerShow": "показать стики-баннер",
      "bannerHide": "скрыть стики-баннер",
      "bannerRefresh": "обновить стики-баннер",
      "bannerVisible": "стики-баннер показывается?",
      "bannerReason": "причина статуса стики-баннера",
      "lbl.lb": "Лидерборды",
      "lbSetScore": "записать счёт [SCORE] в лидерборд [NAME] с доп. данными [EXTRA]",
      "lbPlayerScore": "мой счёт в лидерборде [NAME]",
      "lbPlayerRank": "моё место в лидерборде [NAME]",
      "lbPlayerEntry": "моя запись (JSON) в лидерборде [NAME]",
      "lbEntries": "записи лидерборда [NAME] топ [TOP] вокруг меня [AROUND]",
      "lbEntryField": "[FIELD] места [INDEX] в лидерборде [NAME] топ [TOP] вокруг меня [AROUND]",
      "lbDescription": "описание (JSON) лидерборда [NAME]",
      "lbl.iap": "Покупки",
      "iapInit": "инициализировать покупки",
      "iapReady": "покупки доступны?",
      "iapCatalog": "каталог товаров (JSON)",
      "iapCatalogField": "[FIELD] товара [ID]",
      "iapPurchase": "купить товар [ID] с данными [PAYLOAD]",
      "iapPurchases": "мои покупки (JSON)",
      "iapHas": "товар [ID] куплен?",
      "iapConsume": "потребить покупку [ID]",
      "iapConsumeAll": "потребить все покупки",
      "whenPurchase": "когда покупка [EVENT]",
      "lastPurchase": "последняя покупка (JSON)",
      "lbl.player": "Игрок и авторизация",
      "isAuthorized": "игрок авторизован?",
      "openAuth": "открыть окно авторизации",
      "playerName": "имя игрока",
      "playerId": "уникальный ID игрока",
      "playerAvatar": "ссылка на аватар размера [SIZE]",
      "playerPaying": "платящий статус игрока",
      "playerMode": "режим игрока",
      "playerJSON": "данные игрока (JSON)",
      "lbl.data": "Облачные сохранения",
      "setData": "сохранить данные [DATA] мгновенно [FLUSH]",
      "setKey": "сохранить ключ [KEY] = [VALUE]",
      "getData": "из загруженного сохранения: значение ключа [KEY]",
      "getAllData": "загруженное сохранение (JSON)",
      "loadData": "загрузить сохранение из облака",
      "resetData": "стереть сохранение",
      "setStats": "увеличить статистику [DATA]",
      "getStats": "статистика (JSON)",
      "lbl.env": "Окружение",
      "lang": "язык игры",
      "tld": "домен (tld)",
      "appId": "ID приложения",
      "payload": "параметры запуска (payload)",
      "browserLang": "язык браузера",
      "serverTime": "время сервера",
      "deviceType": "тип устройства",
      "isDevice": "устройство — [TYPE]?",
      "isTopLevel": "открыто внутри фрейма Яндекс Игр?",
      "lbl.extra": "Отзывы, ярлык, прочее",
      "canReview": "можно оценить игру?",
      "requestReview": "показать окно оценки игры",
      "reviewDone": "игра была оценена?",
      "canShortcut": "можно добавить ярлык?",
      "addShortcut": "показать окно добавления ярлыка",
      "shortcutAccepted": "ярлык был добавлен?",
      "clipboard": "скопировать [TEXT] в буфер обмена",
      "gameplayStart": "геймплей начат (GameplayStart)",
      "gameplayStop": "геймплей остановлен (GameplayStop)",
      "getFlags": "флаги удалённой конфигурации (JSON)",
      "getFlag": "флаг [NAME] (по умолчанию [DEFAULT])",
      "muteOnHide": "глушить игру при скрытии вкладки [ON]",
      "m.open": "открыта",
      "m.close": "закрыта",
      "m.error": "ошибка",
      "m.offline": "нет сети",
      "m.rewarded": "награда засчитана",
      "m.success": "успешна",
      "m.failed": "отменена/ошибка",
      "m.small": "маленький",
      "m.medium": "средний",
      "m.large": "большой",
      "m.desktop": "компьютер",
      "m.mobile": "телефон",
      "m.tablet": "планшет",
      "m.tv": "телевизор",
      "m.score": "счёт",
      "m.rank": "место",
      "m.name": "имя",
      "m.avatar": "аватар",
      "m.extra": "доп. данные",
      "m.title": "название",
      "m.price": "цена",
      "m.priceValue": "числовая цена",
      "m.currency": "код валюты",
      "m.desc": "описание",
      "m.image": "ссылка на картинку",
      "m.currencyImage": "ссылка на значок валюты",
      "on": "вкл",
      "off": "выкл",
    },
    uk: {
      "yagames.name": "Yandex Games SDK",
      "lbl.core": "Ініціалізація",
      "init": "ініціалізувати Yandex SDK",
      "initWait": "ініціалізувати Yandex SDK і чекати",
      "debug": "увімкнути режим налагодження (офлайн)",
      "ready": "SDK ініціалізовано?",
      "loadingReady": "повідомити SDK, що гру завантажено",
      "lastError": "остання помилка",
      "clearError": "очистити останню помилку",
      "raw": "значення SDK за шляхом [PATH]",
      "lbl.ads": "Реклама",
      "showFullscreenAd": "показати повноекранну рекламу",
      "showRewardedAd": "показати рекламу за винагороду",
      "whenAdEvent": "коли реклама [EVENT]",
      "adWasShown": "рекламу було показано?",
      "rewardReceived": "винагороду отримано?",
      "adIsOpen": "реклама відкрита?",
      "bannerShow": "показати стікі-банер",
      "bannerHide": "сховати стікі-банер",
      "bannerRefresh": "оновити стікі-банер",
      "bannerVisible": "стікі-банер показується?",
      "bannerReason": "причина статусу стікі-банера",
      "lbl.lb": "Лідерборди",
      "lbSetScore": "записати рахунок [SCORE] у лідерборд [NAME] з даними [EXTRA]",
      "lbPlayerScore": "мій рахунок у лідерборді [NAME]",
      "lbPlayerRank": "моє місце в лідерборді [NAME]",
      "lbPlayerEntry": "мій запис (JSON) у лідерборді [NAME]",
      "lbEntries": "записи лідерборда [NAME] топ [TOP] навколо мене [AROUND]",
      "lbEntryField": "[FIELD] місця [INDEX] у лідерборді [NAME] топ [TOP] навколо мене [AROUND]",
      "lbDescription": "опис (JSON) лідерборда [NAME]",
      "lbl.iap": "Покупки",
      "iapInit": "ініціалізувати покупки",
      "iapReady": "покупки доступні?",
      "iapCatalog": "каталог товарів (JSON)",
      "iapCatalogField": "[FIELD] товару [ID]",
      "iapPurchase": "купити товар [ID] з даними [PAYLOAD]",
      "iapPurchases": "мої покупки (JSON)",
      "iapHas": "товар [ID] куплено?",
      "iapConsume": "спожити покупку [ID]",
      "iapConsumeAll": "спожити всі покупки",
      "whenPurchase": "коли покупка [EVENT]",
      "lastPurchase": "остання покупка (JSON)",
      "lbl.player": "Гравець та авторизація",
      "isAuthorized": "гравець авторизований?",
      "openAuth": "відкрити вікно авторизації",
      "playerName": "ім'я гравця",
      "playerId": "унікальний ID гравця",
      "playerAvatar": "посилання на аватар розміру [SIZE]",
      "playerPaying": "платіжний статус гравця",
      "playerMode": "режим гравця",
      "playerJSON": "дані гравця (JSON)",
      "lbl.data": "Хмарні збереження",
      "setData": "зберегти дані [DATA] миттєво [FLUSH]",
      "setKey": "зберегти ключ [KEY] = [VALUE]",
      "getData": "із завантаженого збереження: значення ключа [KEY]",
      "getAllData": "завантажене збереження (JSON)",
      "loadData": "завантажити збереження з хмари",
      "resetData": "стерти збереження",
      "setStats": "збільшити статистику [DATA]",
      "getStats": "статистика (JSON)",
      "lbl.env": "Оточення",
      "lang": "мова гри",
      "tld": "домен (tld)",
      "appId": "ID застосунку",
      "payload": "параметри запуску (payload)",
      "browserLang": "мова браузера",
      "serverTime": "час сервера",
      "deviceType": "тип пристрою",
      "isDevice": "пристрій — [TYPE]?",
      "isTopLevel": "відкрито всередині фрейму Яндекс Ігор?",
      "lbl.extra": "Відгуки, ярлик, інше",
      "canReview": "можна оцінити гру?",
      "requestReview": "показати вікно оцінки гри",
      "reviewDone": "гру було оцінено?",
      "canShortcut": "можна додати ярлик?",
      "addShortcut": "показати вікно додавання ярлика",
      "shortcutAccepted": "ярлик було додано?",
      "clipboard": "скопіювати [TEXT] у буфер обміну",
      "gameplayStart": "геймплей почато (GameplayStart)",
      "gameplayStop": "геймплей зупинено (GameplayStop)",
      "getFlags": "прапорці віддаленої конфігурації (JSON)",
      "getFlag": "прапорець [NAME] (за замовчуванням [DEFAULT])",
      "muteOnHide": "глушити гру при прихованій вкладці [ON]",
      "m.open": "відкрита",
      "m.close": "закрита",
      "m.error": "помилка",
      "m.offline": "немає мережі",
      "m.rewarded": "винагороду зараховано",
      "m.success": "успішна",
      "m.failed": "скасована/помилка",
      "m.small": "маленький",
      "m.medium": "середній",
      "m.large": "великий",
      "m.desktop": "комп'ютер",
      "m.mobile": "телефон",
      "m.tablet": "планшет",
      "m.tv": "телевізор",
      "m.score": "рахунок",
      "m.rank": "місце",
      "m.name": "ім'я",
      "m.avatar": "аватар",
      "m.extra": "дод. дані",
      "m.title": "назва",
      "m.price": "ціна",
      "m.priceValue": "числова ціна",
      "m.currency": "код валюти",
      "m.desc": "опис",
      "m.image": "посилання на зображення",
      "m.currencyImage": "посилання на значок валюти",
      "on": "увімк",
      "off": "вимк",
    },
    tr: {
      "yagames.name": "Yandex Games SDK",
      "lbl.core": "Başlatma",
      "init": "Yandex SDK'yı başlat",
      "initWait": "Yandex SDK'yı başlat ve bekle",
      "debug": "hata ayıklama (çevrimdışı) modunu aç",
      "ready": "SDK başlatıldı mı?",
      "loadingReady": "SDK'ya oyunun hazır olduğunu bildir",
      "lastError": "son hata",
      "clearError": "son hatayı temizle",
      "raw": "[PATH] yolundaki SDK değeri",
      "lbl.ads": "Reklam",
      "showFullscreenAd": "tam ekran reklam göster",
      "showRewardedAd": "ödüllü video göster",
      "whenAdEvent": "reklam [EVENT] olduğunda",
      "adWasShown": "reklam gösterildi mi?",
      "rewardReceived": "ödül alındı mı?",
      "adIsOpen": "reklam açık mı?",
      "bannerShow": "yapışkan banner göster",
      "bannerHide": "yapışkan banner'ı gizle",
      "bannerRefresh": "yapışkan banner'ı yenile",
      "bannerVisible": "yapışkan banner görünüyor mu?",
      "bannerReason": "yapışkan banner durum nedeni",
      "lbl.lb": "Liderlik tabloları",
      "lbSetScore": "[NAME] tablosuna [SCORE] puanı ek veri [EXTRA] ile yaz",
      "lbPlayerScore": "[NAME] tablosundaki puanım",
      "lbPlayerRank": "[NAME] tablosundaki sıram",
      "lbPlayerEntry": "[NAME] tablosundaki kaydım (JSON)",
      "lbEntries": "[NAME] tablosu kayıtları ilk [TOP] çevremde [AROUND]",
      "lbEntryField": "[NAME] tablosunda [INDEX]. sıranın [FIELD] değeri ilk [TOP] çevremde [AROUND]",
      "lbDescription": "[NAME] tablosunun açıklaması (JSON)",
      "lbl.iap": "Uygulama içi satın alma",
      "iapInit": "satın almaları başlat",
      "iapReady": "satın almalar kullanılabilir mi?",
      "iapCatalog": "ürün kataloğu (JSON)",
      "iapCatalogField": "[ID] ürününün [FIELD] değeri",
      "iapPurchase": "[ID] ürününü [PAYLOAD] verisiyle satın al",
      "iapPurchases": "satın almalarım (JSON)",
      "iapHas": "[ID] ürünü satın alındı mı?",
      "iapConsume": "[ID] satın almasını tüket",
      "iapConsumeAll": "tüm satın almaları tüket",
      "whenPurchase": "satın alma [EVENT] olduğunda",
      "lastPurchase": "son satın alma (JSON)",
      "lbl.player": "Oyuncu ve giriş",
      "isAuthorized": "oyuncu giriş yaptı mı?",
      "openAuth": "giriş penceresini aç",
      "playerName": "oyuncu adı",
      "playerId": "oyuncu benzersiz kimliği",
      "playerAvatar": "[SIZE] boyutunda avatar bağlantısı",
      "playerPaying": "oyuncu ödeme durumu",
      "playerMode": "oyuncu modu",
      "playerJSON": "oyuncu bilgisi (JSON)",
      "lbl.data": "Bulut kayıtları",
      "setData": "[DATA] verisini kaydet, anında [FLUSH]",
      "setKey": "[KEY] anahtarını [VALUE] olarak kaydet",
      "getData": "yüklenen kayıtta [KEY] anahtarının değeri",
      "getAllData": "yüklenen kayıt (JSON)",
      "loadData": "kaydı buluttan yükle",
      "resetData": "kaydı sil",
      "setStats": "istatistikleri artır [DATA]",
      "getStats": "istatistikler (JSON)",
      "lbl.env": "Ortam",
      "lang": "oyun dili",
      "tld": "alan adı (tld)",
      "appId": "uygulama kimliği",
      "payload": "başlatma parametreleri (payload)",
      "browserLang": "tarayıcı dili",
      "serverTime": "sunucu zamanı",
      "deviceType": "cihaz türü",
      "isDevice": "cihaz [TYPE] mı?",
      "isTopLevel": "Yandex Games çerçevesinde mi açıldı?",
      "lbl.extra": "Geri bildirim, kısayol, diğer",
      "canReview": "oyun puanlanabilir mi?",
      "requestReview": "puanlama penceresini göster",
      "reviewDone": "oyun puanlandı mı?",
      "canShortcut": "kısayol eklenebilir mi?",
      "addShortcut": "kısayol ekleme penceresini göster",
      "shortcutAccepted": "kısayol eklendi mi?",
      "clipboard": "[TEXT] metnini panoya kopyala",
      "gameplayStart": "oynanış başladı (GameplayStart)",
      "gameplayStop": "oynanış durdu (GameplayStop)",
      "getFlags": "uzak yapılandırma bayrakları (JSON)",
      "getFlag": "[NAME] bayrağı (varsayılan [DEFAULT])",
      "muteOnHide": "sekme gizliyken sesi kapat [ON]",
      "m.open": "açıldı",
      "m.close": "kapandı",
      "m.error": "hata",
      "m.offline": "çevrimdışı",
      "m.rewarded": "ödül verildi",
      "m.success": "başarılı",
      "m.failed": "başarısız",
      "m.small": "küçük",
      "m.medium": "orta",
      "m.large": "büyük",
      "m.desktop": "masaüstü",
      "m.mobile": "telefon",
      "m.tablet": "tablet",
      "m.tv": "TV",
      "m.score": "puan",
      "m.rank": "sıra",
      "m.name": "isim",
      "m.avatar": "avatar",
      "m.extra": "ek veri",
      "m.title": "başlık",
      "m.price": "fiyat",
      "m.priceValue": "sayısal fiyat",
      "m.currency": "para birimi kodu",
      "m.desc": "açıklama",
      "m.image": "görsel bağlantısı",
      "m.currencyImage": "para birimi görseli",
      "on": "açık",
      "off": "kapalı",
    },
  };

  /** Возвращает текущую локаль редактора (DashBlocks/TurboWarp). */
  function locale() {
    let l = "en";
    try {
      if (Scratch.translate && Scratch.translate.language) l = Scratch.translate.language;
      else if (vm && typeof vm.getLocale === "function") l = vm.getLocale();
      else if (navigator && navigator.language) l = navigator.language;
    } catch (e) {
      /* игнорируем — вернём en */
    }
    l = String(l).toLowerCase().split("-")[0];
    return TRANSLATIONS[l] ? l : "en";
  }

  /** Переводит ключ. Если перевода нет — берётся английский, затем сам ключ. */
  function t(key) {
    const tbl = TRANSLATIONS[locale()];
    return (tbl && tbl[key]) || TRANSLATIONS.en[key] || key;
  }

  // ==========================================================================
  //  2. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ==========================================================================

  // --------------------------------------------------------------------------
  //  Поддержка «квадратных» (структурных) значений DashBlocks
  //  Dash умеет хранить в переменных настоящие массивы и объекты:
  //    Scratch.NormalArray  — массив  (квадратный блок, Scratch.BlockShape.SQUARE)
  //    Scratch.NormalObject — объект  (Map с [ключ, значение])
  //  Если расширение запущено в обычном TurboWarp, где этих классов нет,
  //  блоки автоматически возвращают JSON-строку — проект не ломается.
  // --------------------------------------------------------------------------
  const NormalArray = Scratch.NormalArray || null;
  const NormalObject = Scratch.NormalObject || null;
  const DASH_VALUES = !!(NormalArray && NormalObject);

  // Форма блоков-репортеров, возвращающих JSON: квадратная в Dash,
  // обычная круглая в TurboWarp (там BlockShape отсутствует).
  const SQUARE = (Scratch.BlockShape && Scratch.BlockShape.SQUARE) || undefined;

  /** Рекурсивно превращает обычный JS-объект/массив в структуру Dash. */
  function toDash(value) {
    if (value === null || value === undefined) return "";
    if (typeof value !== "object") return value;
    if (!DASH_VALUES) {
      // Обычный TurboWarp — отдаём JSON-строку.
      try {
        return JSON.stringify(value);
      } catch (e) {
        return String(value);
      }
    }
    if (Array.isArray(value)) return new NormalArray(value.map(toDash));
    if (value instanceof Map) {
      return new NormalObject(Array.from(value.entries()).map(([k, v]) => [String(k), toDash(v)]));
    }
    return new NormalObject(Object.entries(value).map(([k, v]) => [k, toDash(v)]));
  }

  /** Обратное преобразование: значение Dash (или JSON-строка) -> чистый JS. */
  function fromDash(value) {
    if (value === null || value === undefined) return value;
    if (Array.isArray(value)) return value.map(fromDash);
    if (value instanceof Map) {
      const out = {};
      for (const [k, v] of value.entries()) out[String(k)] = fromDash(v);
      return out;
    }
    if (typeof value === "object") {
      const out = {};
      for (const k of Object.keys(value)) out[k] = fromDash(value[k]);
      return out;
    }
    return value;
  }

  /** Безопасная сериализация чего угодно в строку для Scratch. */
  function toJSON(value) {
    if (value === undefined || value === null) return "";
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value);
    } catch (e) {
      return String(value);
    }
  }

  /** Пытается распарсить JSON-объект, иначе возвращает fallback. */
  function parseObject(value, fallback) {
    // Значение из Dash (NormalObject = Map) или обычный JS-объект.
    if (value instanceof Map) return fromDash(value);
    if (value && typeof value === "object" && !Array.isArray(value)) return fromDash(value);
    try {
      const parsed = JSON.parse(Cast.toString(value));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch (e) {
      /* not json */
    }
    return fallback || {};
  }

  /** Значение по пути "a.b.c" внутри объекта, без eval. */
  function getPath(root, path) {
    const parts = String(path).split(".").filter(Boolean);
    let cur = root;
    for (const p of parts) {
      if (cur === null || cur === undefined) return undefined;
      cur = cur[p];
      if (typeof cur === "function") return undefined; // функции не отдаём
    }
    return cur;
  }

  /** Промис с таймаутом, чтобы блок не висел вечно. */
  function withTimeout(promise, ms, label) {
    if (!ms) return promise;
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error((label || "operation") + " timeout")), ms)
      ),
    ]);
  }

  // ==========================================================================
  //  3. КЛАСС РАСШИРЕНИЯ
  // ==========================================================================
  class YandexGamesSDK {
    constructor() {
      // --- состояние SDK
      this.ysdk = null;          // объект YaGames SDK
      this.player = null;        // ysdk.getPlayer()
      this.payments = null;      // ysdk.getPayments()
      this.leaderboards = null;  // ysdk.getLeaderboards()
      this.initPromise = null;   // защита от двойной инициализации
      this.debug = false;        // офлайн-режим для тестов вне Яндекса

      // --- ошибки
      this.lastError = "";

      // --- реклама
      this.adOpened = false;
      this.adWasShown = false;
      this.rewardReceived = false;
      this.bannerShowing = false;
      this.bannerReason = "";

      // --- покупки
      this.lastPurchase = null;
      this.catalogCache = [];
      this.purchasesCache = [];

      // --- прочее
      this.dataCache = {};
      this.statsCache = {};
      this.flags = {};
      this.rated = false;
      this.shortcutAccepted = false;
      this.muteOnHide = true;
      this._visibilityBound = false;

      // --- счётчики событий для HAT-блоков
      this._eventSeq = {};
      this._eventSeen = {};

      console.log(
        "%cYandex Games SDK v2.1.0",
        "color:#fff;background:#4C1CBA;padding:2px 6px;border-radius:3px",
        "— расширение для DashBlocks. Авторы: timaaos, scratch_craft_2, Den4ik-12, DBDev."
      );
    }

    // ------------------------------------------------------------------
    //  3.1 Инфраструктура: ошибки, звук, события
    // ------------------------------------------------------------------

    /** Записывает ошибку в буфер и в консоль, никогда не бросает наружу. */
    _err(where, error) {
      const message =
        (error && (error.message || error.code || error.reason)) ||
        (typeof error === "string" ? error : "") ||
        "unknown error";
      this.lastError = where + ": " + message;
      console.warn("Yandex Games SDK [" + where + "]", error);
      return this.lastError;
    }

    /**
     * Универсальная обёртка любого асинхронного блока.
     * Гарантирует: блок никогда не «падает» и всегда что-то возвращает.
     */
    async _safe(where, fn, fallback) {
      try {
        const result = await fn();
        return result === undefined ? fallback : result;
      } catch (e) {
        this._err(where, e);
        return fallback;
      }
    }

    /** Требует инициализированный SDK; в debug-режиме — эмуляция. */
    _needSdk(where) {
      if (this.ysdk) return true;
      if (this.debug) return false;
      this.lastError = where + ": SDK is not initialized";
      return false;
    }

    _setGain(value) {
      try {
        const engine = runtime.audioEngine;
        if (engine && engine.inputNode) engine.inputNode.gain.value = value;
      } catch (e) {
        /* аудиодвижок может отсутствовать */
      }
    }

    _mute() {
      this._setGain(0);
    }

    _unmute() {
      this._setGain(1);
    }

    /**
     * Регистрирует наступление события для HAT-блоков.
     * HAT-блоки здесь edge-activated: их предикат опрашивается каждый кадр и
     * возвращает true ровно один раз на каждое событие для каждого блока
     * (идентификация по id верхнего блока потока).
     */
    _fireHat(opcode, fields) {
      const key = opcode + ":" + (fields && fields.EVENT ? fields.EVENT : "");
      this._eventSeq[key] = (this._eventSeq[key] || 0) + 1;
    }

    /** Проверка «событие произошло с прошлого опроса этого блока?». */
    _checkHat(opcode, event, util) {
      const key = opcode + ":" + event;
      const seq = this._eventSeq[key] || 0;
      let blockId = "";
      try {
        blockId = (util && util.thread && util.thread.topBlock) || "";
      } catch (e) {
        blockId = "";
      }
      const seenKey = blockId + "#" + key;
      const seen = this._eventSeen[seenKey] || 0;
      if (seq > seen) {
        this._eventSeen[seenKey] = seq;
        return true;
      }
      return false;
    }

    /** HAT: когда реклама открыта / закрыта / награда / ошибка / офлайн. */
    whenAdEvent(args, util) {
      return this._checkHat("whenAdEvent", Cast.toString(args.EVENT), util);
    }

    /** HAT: когда покупка успешна / отменена. */
    whenPurchase(args, util) {
      return this._checkHat("whenPurchase", Cast.toString(args.EVENT), util);
    }

    /** Автопауза звука/геймплея при скрытии вкладки — по требованиям Яндекса. */
    _bindVisibility() {
      if (this._visibilityBound) return;
      this._visibilityBound = true;

      const onHide = () => {
        if (!this.muteOnHide || this.adOpened) return;
        this._mute();
        try {
          if (this.ysdk && this.ysdk.features && this.ysdk.features.GameplayAPI) {
            this.ysdk.features.GameplayAPI.stop();
          }
        } catch (e) {
          /* ignore */
        }
      };
      const onShow = () => {
        if (this.adOpened) return;
        if (this.muteOnHide) this._unmute();
      };

      window.addEventListener("blur", onHide);
      window.addEventListener("focus", onShow);
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) onHide();
        else onShow();
      });
    }

    // ------------------------------------------------------------------
    //  3.2 getInfo() — описание всех блоков
    // ------------------------------------------------------------------
    getInfo() {
      return {
        id: "yagames",
        name: t("yagames.name"),
        color1: "#4C1CBA",
        color2: "#3E169B",
        color3: "#2F117A",
        menuIconURI: ICON,
        blockIconURI: ICON,
        docsURI: "https://yandex.ru/dev/games/doc/ru/",
        blocks: [
          // ============================ ЯДРО ============================
          { blockType: Scratch.BlockType.LABEL, text: t("lbl.core") },
          { opcode: "init", blockType: Scratch.BlockType.COMMAND, text: t("init") },
          { opcode: "initWait", blockType: Scratch.BlockType.COMMAND, text: t("initWait") },
          { opcode: "setDebug", blockType: Scratch.BlockType.COMMAND, text: t("debug") },
          { opcode: "isReady", blockType: Scratch.BlockType.BOOLEAN, text: t("ready") },
          { opcode: "loadingReady", blockType: Scratch.BlockType.COMMAND, text: t("loadingReady") },
          {
            opcode: "getLastError",
            blockType: Scratch.BlockType.REPORTER,
            text: t("lastError"),
            disableMonitor: false,
          },
          { opcode: "clearLastError", blockType: Scratch.BlockType.COMMAND, text: t("clearError") },
          {
            opcode: "rawValue",
            blockType: Scratch.BlockType.REPORTER,
            blockShape: SQUARE,
            text: t("raw"),
            disableMonitor: true,
            arguments: {
              PATH: { type: Scratch.ArgumentType.STRING, defaultValue: "environment.i18n.tld" },
            },
          },

          // ========================== РЕКЛАМА ===========================
          "---",
          { blockType: Scratch.BlockType.LABEL, text: t("lbl.ads") },
          {
            opcode: "showFullscreenAd",
            blockType: Scratch.BlockType.COMMAND,
            text: t("showFullscreenAd"),
            arguments: {},
            disableMonitor: true,
          },
          {
            opcode: "showRewardedAd",
            blockType: Scratch.BlockType.COMMAND,
            text: t("showRewardedAd"),
            arguments: {},
            disableMonitor: true,
          },
          {
            opcode: "whenAdEvent",
            blockType: Scratch.BlockType.HAT,
            text: t("whenAdEvent"),
            arguments: {
              EVENT: { type: Scratch.ArgumentType.STRING, menu: "adEvents" },
            },
          },
          { opcode: "adIsOpen", blockType: Scratch.BlockType.BOOLEAN, text: t("adIsOpen") },
          { opcode: "wasAdShown", blockType: Scratch.BlockType.BOOLEAN, text: t("adWasShown") },
          {
            opcode: "wasRewarded",
            blockType: Scratch.BlockType.BOOLEAN,
            text: t("rewardReceived"),
          },
          { opcode: "bannerShow", blockType: Scratch.BlockType.COMMAND, text: t("bannerShow") },
          { opcode: "bannerHide", blockType: Scratch.BlockType.COMMAND, text: t("bannerHide") },
          {
            opcode: "bannerRefresh",
            blockType: Scratch.BlockType.COMMAND,
            text: t("bannerRefresh"),
          },
          {
            opcode: "bannerVisible",
            blockType: Scratch.BlockType.BOOLEAN,
            text: t("bannerVisible"),
          },
          {
            opcode: "bannerStatusReason",
            blockType: Scratch.BlockType.REPORTER,
            text: t("bannerReason"),
            disableMonitor: true,
          },

          // ========================= ЛИДЕРБОРДЫ =========================
          "---",
          { blockType: Scratch.BlockType.LABEL, text: t("lbl.lb") },
          {
            opcode: "lbSetScore",
            blockType: Scratch.BlockType.COMMAND,
            text: t("lbSetScore"),
            arguments: {
              SCORE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "leaderboard" },
              EXTRA: { type: Scratch.ArgumentType.STRING, defaultValue: "" },
            },
          },
          {
            opcode: "lbPlayerScore",
            blockType: Scratch.BlockType.REPORTER,
            text: t("lbPlayerScore"),
            disableMonitor: true,
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "leaderboard" },
            },
          },
          {
            opcode: "lbPlayerRank",
            blockType: Scratch.BlockType.REPORTER,
            text: t("lbPlayerRank"),
            disableMonitor: true,
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "leaderboard" },
            },
          },
          {
            opcode: "lbPlayerEntry",
            blockType: Scratch.BlockType.REPORTER,
            blockShape: SQUARE,
            text: t("lbPlayerEntry"),
            disableMonitor: true,
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "leaderboard" },
            },
          },
          {
            opcode: "lbEntries",
            blockType: Scratch.BlockType.REPORTER,
            blockShape: SQUARE,
            text: t("lbEntries"),
            disableMonitor: true,
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "leaderboard" },
              TOP: { type: Scratch.ArgumentType.NUMBER, defaultValue: 10 },
              AROUND: { type: Scratch.ArgumentType.NUMBER, defaultValue: 5 },
            },
          },
          {
            opcode: "lbEntryField",
            blockType: Scratch.BlockType.REPORTER,
            text: t("lbEntryField"),
            disableMonitor: true,
            arguments: {
              FIELD: { type: Scratch.ArgumentType.STRING, menu: "entryFields" },
              INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "leaderboard" },
              TOP: { type: Scratch.ArgumentType.NUMBER, defaultValue: 10 },
              AROUND: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            },
          },
          {
            opcode: "lbDescription",
            blockType: Scratch.BlockType.REPORTER,
            blockShape: SQUARE,
            text: t("lbDescription"),
            disableMonitor: true,
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "leaderboard" },
            },
          },

          // =========================== ПОКУПКИ ==========================
          "---",
          { blockType: Scratch.BlockType.LABEL, text: t("lbl.iap") },
          { opcode: "iapInit", blockType: Scratch.BlockType.COMMAND, text: t("iapInit") },
          { opcode: "iapReady", blockType: Scratch.BlockType.BOOLEAN, text: t("iapReady") },
          {
            opcode: "iapCatalog",
            blockType: Scratch.BlockType.REPORTER,
            blockShape: SQUARE,
            text: t("iapCatalog"),
            disableMonitor: true,
          },
          {
            opcode: "iapCatalogField",
            blockType: Scratch.BlockType.REPORTER,
            text: t("iapCatalogField"),
            disableMonitor: true,
            arguments: {
              FIELD: { type: Scratch.ArgumentType.STRING, menu: "productFields" },
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "coins100" },
            },
          },
          {
            opcode: "iapPurchase",
            blockType: Scratch.BlockType.COMMAND,
            text: t("iapPurchase"),
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "coins100" },
              PAYLOAD: { type: Scratch.ArgumentType.STRING, defaultValue: "" },
            },
          },
          {
            opcode: "whenPurchase",
            blockType: Scratch.BlockType.HAT,
            text: t("whenPurchase"),
            arguments: {
              EVENT: { type: Scratch.ArgumentType.STRING, menu: "purchaseEvents" },
            },
          },
          {
            opcode: "lastPurchaseJSON",
            blockType: Scratch.BlockType.REPORTER,
            blockShape: SQUARE,
            text: t("lastPurchase"),
            disableMonitor: true,
          },
          {
            opcode: "iapPurchases",
            blockType: Scratch.BlockType.REPORTER,
            blockShape: SQUARE,
            text: t("iapPurchases"),
            disableMonitor: true,
          },
          {
            opcode: "iapHas",
            blockType: Scratch.BlockType.BOOLEAN,
            text: t("iapHas"),
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "coins100" },
            },
          },
          {
            opcode: "iapConsume",
            blockType: Scratch.BlockType.COMMAND,
            text: t("iapConsume"),
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "coins100" },
            },
          },
          { opcode: "iapConsumeAll", blockType: Scratch.BlockType.COMMAND, text: t("iapConsumeAll") },

          // ====================== ИГРОК / АВТОРИЗАЦИЯ ===================
          "---",
          { blockType: Scratch.BlockType.LABEL, text: t("lbl.player") },
          {
            opcode: "isAuthorized",
            blockType: Scratch.BlockType.BOOLEAN,
            text: t("isAuthorized"),
          },
          { opcode: "openAuth", blockType: Scratch.BlockType.COMMAND, text: t("openAuth") },
          {
            opcode: "playerName",
            blockType: Scratch.BlockType.REPORTER,
            text: t("playerName"),
            disableMonitor: true,
          },
          {
            opcode: "playerId",
            blockType: Scratch.BlockType.REPORTER,
            text: t("playerId"),
            disableMonitor: true,
          },
          {
            opcode: "playerAvatar",
            blockType: Scratch.BlockType.REPORTER,
            text: t("playerAvatar"),
            disableMonitor: true,
            arguments: {
              SIZE: { type: Scratch.ArgumentType.STRING, menu: "avatarSizes" },
            },
          },
          {
            opcode: "playerPaying",
            blockType: Scratch.BlockType.REPORTER,
            text: t("playerPaying"),
            disableMonitor: true,
          },
          {
            opcode: "playerMode",
            blockType: Scratch.BlockType.REPORTER,
            text: t("playerMode"),
            disableMonitor: true,
          },
          {
            opcode: "playerJSON",
            blockType: Scratch.BlockType.REPORTER,
            blockShape: SQUARE,
            text: t("playerJSON"),
            disableMonitor: true,
          },

          // ========================= СОХРАНЕНИЯ =========================
          "---",
          { blockType: Scratch.BlockType.LABEL, text: t("lbl.data") },
          {
            opcode: "setData",
            blockType: Scratch.BlockType.COMMAND,
            text: t("setData"),
            arguments: {
              DATA: { type: Scratch.ArgumentType.STRING, defaultValue: '{"coins": 10}' },
              FLUSH: { type: Scratch.ArgumentType.BOOLEAN },
            },
          },
          {
            opcode: "setKey",
            blockType: Scratch.BlockType.COMMAND,
            text: t("setKey"),
            arguments: {
              KEY: { type: Scratch.ArgumentType.STRING, defaultValue: "coins" },
              VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: "10" },
            },
          },
          { opcode: "loadData", blockType: Scratch.BlockType.COMMAND, text: t("loadData") },
          {
            opcode: "getData",
            blockType: Scratch.BlockType.REPORTER,
            blockShape: SQUARE,
            text: t("getData"),
            disableMonitor: true,
            arguments: {
              KEY: { type: Scratch.ArgumentType.STRING, defaultValue: "coins" },
            },
          },
          {
            opcode: "getAllData",
            blockType: Scratch.BlockType.REPORTER,
            blockShape: SQUARE,
            text: t("getAllData"),
            disableMonitor: true,
          },
          { opcode: "resetData", blockType: Scratch.BlockType.COMMAND, text: t("resetData") },
          {
            opcode: "setStats",
            blockType: Scratch.BlockType.COMMAND,
            text: t("setStats"),
            arguments: {
              DATA: { type: Scratch.ArgumentType.STRING, defaultValue: '{"kills": 1}' },
            },
          },
          {
            opcode: "getStats",
            blockType: Scratch.BlockType.REPORTER,
            blockShape: SQUARE,
            text: t("getStats"),
            disableMonitor: true,
          },

          // ========================== ОКРУЖЕНИЕ =========================
          "---",
          { blockType: Scratch.BlockType.LABEL, text: t("lbl.env") },
          { opcode: "lang", blockType: Scratch.BlockType.REPORTER, text: t("lang"), disableMonitor: true },
          { opcode: "tld", blockType: Scratch.BlockType.REPORTER, text: t("tld"), disableMonitor: true },
          { opcode: "appId", blockType: Scratch.BlockType.REPORTER, text: t("appId"), disableMonitor: true },
          { opcode: "payload", blockType: Scratch.BlockType.REPORTER, text: t("payload"), disableMonitor: true },
          {
            opcode: "browserLang",
            blockType: Scratch.BlockType.REPORTER,
            text: t("browserLang"),
            disableMonitor: true,
          },
          {
            opcode: "serverTime",
            blockType: Scratch.BlockType.REPORTER,
            text: t("serverTime"),
            disableMonitor: true,
          },
          {
            opcode: "deviceType",
            blockType: Scratch.BlockType.REPORTER,
            text: t("deviceType"),
            disableMonitor: true,
          },
          {
            opcode: "isDevice",
            blockType: Scratch.BlockType.BOOLEAN,
            text: t("isDevice"),
            arguments: {
              TYPE: { type: Scratch.ArgumentType.STRING, menu: "devices" },
            },
          },
          { opcode: "isTopLevel", blockType: Scratch.BlockType.BOOLEAN, text: t("isTopLevel") },

          // ================ ОТЗЫВЫ / ЯРЛЫК / ПРОЧЕЕ =====================
          "---",
          { blockType: Scratch.BlockType.LABEL, text: t("lbl.extra") },
          { opcode: "canReview", blockType: Scratch.BlockType.BOOLEAN, text: t("canReview") },
          { opcode: "requestReview", blockType: Scratch.BlockType.COMMAND, text: t("requestReview") },
          { opcode: "reviewDone", blockType: Scratch.BlockType.BOOLEAN, text: t("reviewDone") },
          { opcode: "canShortcut", blockType: Scratch.BlockType.BOOLEAN, text: t("canShortcut") },
          { opcode: "addShortcut", blockType: Scratch.BlockType.COMMAND, text: t("addShortcut") },
          {
            opcode: "shortcutWasAdded",
            blockType: Scratch.BlockType.BOOLEAN,
            text: t("shortcutAccepted"),
          },
          {
            opcode: "clipboard",
            blockType: Scratch.BlockType.COMMAND,
            text: t("clipboard"),
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "https://yandex.ru/games/" },
            },
          },
          { opcode: "gameplayStart", blockType: Scratch.BlockType.COMMAND, text: t("gameplayStart") },
          { opcode: "gameplayStop", blockType: Scratch.BlockType.COMMAND, text: t("gameplayStop") },
          {
            opcode: "getFlags",
            blockType: Scratch.BlockType.REPORTER,
            blockShape: SQUARE,
            text: t("getFlags"),
            disableMonitor: true,
          },
          {
            opcode: "getFlag",
            blockType: Scratch.BlockType.REPORTER,
            text: t("getFlag"),
            disableMonitor: true,
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "flag" },
              DEFAULT: { type: Scratch.ArgumentType.STRING, defaultValue: "false" },
            },
          },
          {
            opcode: "setMuteOnHide",
            blockType: Scratch.BlockType.COMMAND,
            text: t("muteOnHide"),
            arguments: {
              ON: { type: Scratch.ArgumentType.STRING, menu: "onoff" },
            },
          },
        ],

        // ------------------------- МЕНЮ -------------------------------
        menus: {
          adEvents: {
            acceptReporters: true,
            items: [
              { text: t("m.open"), value: "open" },
              { text: t("m.close"), value: "close" },
              { text: t("m.rewarded"), value: "rewarded" },
              { text: t("m.error"), value: "error" },
              { text: t("m.offline"), value: "offline" },
            ],
          },
          purchaseEvents: {
            acceptReporters: true,
            items: [
              { text: t("m.success"), value: "success" },
              { text: t("m.failed"), value: "failed" },
            ],
          },
          avatarSizes: {
            acceptReporters: true,
            items: [
              { text: t("m.small"), value: "small" },
              { text: t("m.medium"), value: "medium" },
              { text: t("m.large"), value: "large" },
            ],
          },
          devices: {
            acceptReporters: true,
            items: [
              { text: t("m.desktop"), value: "desktop" },
              { text: t("m.mobile"), value: "mobile" },
              { text: t("m.tablet"), value: "tablet" },
              { text: t("m.tv"), value: "tv" },
            ],
          },
          entryFields: {
            acceptReporters: true,
            items: [
              { text: t("m.score"), value: "score" },
              { text: t("m.rank"), value: "rank" },
              { text: t("m.name"), value: "name" },
              { text: t("m.avatar"), value: "avatar" },
              { text: t("m.extra"), value: "extraData" },
            ],
          },
          productFields: {
            acceptReporters: true,
            items: [
              { text: t("m.title"), value: "title" },
              { text: t("m.desc"), value: "description" },
              { text: t("m.price"), value: "price" },
              { text: t("m.priceValue"), value: "priceValue" },
              { text: t("m.currency"), value: "priceCurrencyCode" },
              { text: t("m.image"), value: "imageURI" },
              { text: t("m.currencyImage"), value: "priceCurrencyImage" },
            ],
          },
          onoff: {
            acceptReporters: true,
            items: [
              { text: t("on"), value: "on" },
              { text: t("off"), value: "off" },
            ],
          },
        },
      };
    }

    // ==================================================================
    //  4. ЯДРО: загрузка и инициализация SDK
    // ==================================================================

    /** Динамически подключает /sdk.js, если YaGames ещё нет на странице. */
    _loadScript() {
      if (window.YaGames) return Promise.resolve();
      if (this._scriptPromise) return this._scriptPromise;

      this._scriptPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-yagames-sdk="1"]');
        if (existing) {
          existing.addEventListener("load", () => resolve());
          existing.addEventListener("error", () => reject(new Error("sdk.js load error")));
          return;
        }
        const script = document.createElement("script");
        script.src = "/sdk.js"; // канонический путь на хостинге Яндекс Игр
        script.async = true;
        script.dataset.yagamesSdk = "1";
        script.onload = () => resolve();
        script.onerror = () => {
          // Запасной вариант — CDN (полезно при локальном тестировании).
          const fallback = document.createElement("script");
          fallback.src = "https://yandex.ru/games/sdk/v2";
          fallback.async = true;
          fallback.dataset.yagamesSdk = "1";
          fallback.onload = () => resolve();
          fallback.onerror = () => reject(new Error("sdk.js is unavailable"));
          document.head.appendChild(fallback);
        };
        document.head.appendChild(script);
      });
      return this._scriptPromise;
    }

    /** Полная инициализация: скрипт -> YaGames.init() -> player -> LoadingAPI. */
    _initInternal() {
      if (this.initPromise) return this.initPromise;

      this.initPromise = (async () => {
        this._bindVisibility();

        if (this.debug) {
          console.info("Yandex Games SDK: debug mode, real SDK is not loaded.");
          return null;
        }

        await this._loadScript();
        if (!window.YaGames) throw new Error("YaGames global is missing");

        const ysdk = await window.YaGames.init();
        this.ysdk = ysdk;

        // Игрок (без запроса персональных данных — scopes:false).
        try {
          this.player = await ysdk.getPlayer({ scopes: false });
        } catch (e) {
          this._err("getPlayer", e);
        }

        // Лидерборды (не критично, если недоступны).
        try {
          this.leaderboards = await ysdk.getLeaderboards();
        } catch (e) {
          this._err("getLeaderboards", e);
        }

        // Сообщаем платформе, что игра загрузилась.
        try {
          if (ysdk.features && ysdk.features.LoadingAPI) ysdk.features.LoadingAPI.ready();
        } catch (e) {
          this._err("LoadingAPI.ready", e);
        }

        console.log("Yandex Games SDK: initialized ✔");
        return ysdk;
      })().catch((e) => {
        this._err("init", e);
        this.initPromise = null; // разрешаем повторную попытку
        return null;
      });

      return this.initPromise;
    }

    init() {
      // Не блокирует поток проекта.
      this._initInternal();
    }

    initWait() {
      // Блок «и ждать» — возвращает промис, Scratch дождётся его.
      return this._initInternal().then(() => undefined);
    }

    setDebug() {
      this.debug = true;
      this._bindVisibility();
    }

    isReady() {
      return !!this.ysdk || this.debug;
    }

    loadingReady() {
      if (!this._needSdk("LoadingAPI.ready")) return;
      try {
        this.ysdk.features.LoadingAPI.ready();
      } catch (e) {
        this._err("LoadingAPI.ready", e);
      }
    }

    getLastError() {
      return this.lastError;
    }

    clearLastError() {
      this.lastError = "";
    }

    rawValue(args) {
      if (!this.ysdk) return "";
      const value = getPath(this.ysdk, Cast.toString(args.PATH));
      return toDash(value);
    }

    setMuteOnHide(args) {
      this.muteOnHide = Cast.toString(args.ON) !== "off";
    }

    // ==================================================================
    //  5. РЕКЛАМА
    // ==================================================================

    _adOpen() {
      this.adOpened = true;
      this._mute();
      try {
        if (this.ysdk && this.ysdk.features && this.ysdk.features.GameplayAPI) {
          this.ysdk.features.GameplayAPI.stop();
        }
      } catch (e) {
        /* ignore */
      }
      this._fireHat("whenAdEvent", { EVENT: "open" });
    }

    _adClose(wasShown) {
      this.adOpened = false;
      this.adWasShown = !!wasShown;
      this._unmute();
      try {
        if (this.ysdk && this.ysdk.features && this.ysdk.features.GameplayAPI) {
          this.ysdk.features.GameplayAPI.start();
        }
      } catch (e) {
        /* ignore */
      }
      this._fireHat("whenAdEvent", { EVENT: "close" });
    }

    _adError(error) {
      this.adOpened = false;
      this._unmute();
      this._err("adv", error);
      this._fireHat("whenAdEvent", { EVENT: "error" });
    }

    /** Полноэкранная реклама: onOpen / onClose / onError / onOffline. */
    showFullscreenAd() {
      this.adWasShown = false;

      if (this.debug) {
        this._adOpen();
        setTimeout(() => this._adClose(true), 300);
        return;
      }
      if (!this._needSdk("showFullscreenAdv")) return;

      try {
        this.ysdk.adv.showFullscreenAdv({
          callbacks: {
            onOpen: () => this._adOpen(),
            onClose: (wasShown) => this._adClose(wasShown),
            onError: (error) => this._adError(error),
            onOffline: () => {
              this.adOpened = false;
              this._unmute();
              this.lastError = "adv: offline";
              this._fireHat("whenAdEvent", { EVENT: "offline" });
            },
          },
        });
      } catch (e) {
        this._adError(e);
      }
    }

    /** Реклама за вознаграждение: onOpen / onRewarded / onClose / onError. */
    showRewardedAd() {
      this.rewardReceived = false;
      this.adWasShown = false;

      if (this.debug) {
        this._adOpen();
        setTimeout(() => {
          this.rewardReceived = true;
          this._fireHat("whenAdEvent", { EVENT: "rewarded" });
          this._adClose(true);
        }, 300);
        return;
      }
      if (!this._needSdk("showRewardedVideo")) return;

      try {
        this.ysdk.adv.showRewardedVideo({
          callbacks: {
            onOpen: () => this._adOpen(),
            onRewarded: () => {
              this.rewardReceived = true;
              this._fireHat("whenAdEvent", { EVENT: "rewarded" });
            },
            onClose: () => this._adClose(true),
            onError: (error) => this._adError(error),
          },
        });
      } catch (e) {
        this._adError(e);
      }
    }

    adIsOpen() {
      return this.adOpened;
    }

    wasAdShown() {
      return this.adWasShown;
    }

    wasRewarded() {
      return this.rewardReceived;
    }

    _applyBannerStatus(status) {
      if (!status) return;
      this.bannerShowing = !!status.stickyAdvIsShowing;
      this.bannerReason = status.reason || "";
    }

    bannerShow() {
      if (!this._needSdk("showBannerAdv")) return;
      return this._safe("showBannerAdv", async () => {
        this._applyBannerStatus(await this.ysdk.adv.showBannerAdv());
      });
    }

    bannerHide() {
      if (!this._needSdk("hideBannerAdv")) return;
      return this._safe("hideBannerAdv", async () => {
        this._applyBannerStatus(await this.ysdk.adv.hideBannerAdv());
      });
    }

    /** «Обновить» = скрыть и снова показать (отдельного API у Яндекса нет). */
    bannerRefresh() {
      if (!this._needSdk("refreshBannerAdv")) return;
      return this._safe("refreshBannerAdv", async () => {
        await this.ysdk.adv.hideBannerAdv();
        this._applyBannerStatus(await this.ysdk.adv.showBannerAdv());
      });
    }

    bannerVisible() {
      if (this.ysdk && this.ysdk.adv && this.ysdk.adv.getBannerAdvStatus) {
        // Обновляем кэш асинхронно, возвращаем последнее известное значение.
        this.ysdk.adv
          .getBannerAdvStatus()
          .then((s) => this._applyBannerStatus(s))
          .catch(() => {});
      }
      return this.bannerShowing;
    }

    bannerStatusReason() {
      return this.bannerReason;
    }

    // ==================================================================
    //  6. ЛИДЕРБОРДЫ
    // ==================================================================

    async _lb() {
      if (this.leaderboards) return this.leaderboards;
      if (!this.ysdk) throw new Error("SDK is not initialized");
      this.leaderboards = this.ysdk.leaderboards || (await this.ysdk.getLeaderboards());
      return this.leaderboards;
    }

    lbSetScore(args) {
      const name = Cast.toString(args.NAME);
      const score = Math.round(Cast.toNumber(args.SCORE));
      const extra = Cast.toString(args.EXTRA);
      return this._safe("setLeaderboardScore", async () => {
        const lb = await this._lb();
        if (extra) await lb.setLeaderboardScore(name, score, extra);
        else await lb.setLeaderboardScore(name, score);
      });
    }

    async _playerEntry(name) {
      const lb = await this._lb();
      return await lb.getLeaderboardPlayerEntry(name);
    }

    lbPlayerScore(args) {
      return this._safe(
        "getLeaderboardPlayerEntry",
        async () => {
          const entry = await this._playerEntry(Cast.toString(args.NAME));
          return entry && typeof entry.score === "number" ? entry.score : 0;
        },
        0
      );
    }

    lbPlayerRank(args) {
      return this._safe(
        "getLeaderboardPlayerEntry",
        async () => {
          const entry = await this._playerEntry(Cast.toString(args.NAME));
          return entry && typeof entry.rank === "number" ? entry.rank : 0;
        },
        0
      );
    }

    lbPlayerEntry(args) {
      return this._safe(
        "getLeaderboardPlayerEntry",
        async () => toDash(await this._playerEntry(Cast.toString(args.NAME))),
        ""
      );
    }

    async _entries(name, top, around) {
      const lb = await this._lb();
      const options = {
        quantityTop: Math.max(0, Math.min(20, Math.round(top))),
        includeUser: around > 0,
        quantityAround: Math.max(0, Math.min(10, Math.round(around))),
      };
      const result = await lb.getEntries(name, options);
      return (result && result.entries) || [];
    }

    lbEntries(args) {
      return this._safe(
        "getEntries",
        async () => {
          const entries = await this._entries(
            Cast.toString(args.NAME),
            Cast.toNumber(args.TOP),
            Cast.toNumber(args.AROUND)
          );
          // Приводим к компактному, удобному для Scratch виду.
          return toDash(
            entries.map((e) => ({
              rank: e.rank,
              score: e.score,
              extraData: e.extraData || "",
              name: (e.player && (e.player.publicName || e.player.scopePermissions)) ? e.player.publicName : "",
              avatar: e.player && e.player.getAvatarSrc ? e.player.getAvatarSrc("medium") : "",
              uniqueID: e.player ? e.player.uniqueID : "",
            }))
          );
        },
        toDash([])
      );
    }

    lbEntryField(args) {
      const field = Cast.toString(args.FIELD);
      const index = Math.round(Cast.toNumber(args.INDEX)) - 1;
      return this._safe(
        "getEntries",
        async () => {
          const entries = await this._entries(
            Cast.toString(args.NAME),
            Cast.toNumber(args.TOP),
            Cast.toNumber(args.AROUND)
          );
          const e = entries[index];
          if (!e) return "";
          switch (field) {
            case "score":
              return e.score;
            case "rank":
              return e.rank;
            case "extraData":
              return e.extraData || "";
            case "name":
              return (e.player && e.player.publicName) || "";
            case "avatar":
              return e.player && e.player.getAvatarSrc ? e.player.getAvatarSrc("medium") : "";
            default:
              return "";
          }
        },
        ""
      );
    }

    lbDescription(args) {
      return this._safe(
        "getLeaderboardDescription",
        async () => {
          const lb = await this._lb();
          return toDash(await lb.getLeaderboardDescription(Cast.toString(args.NAME)));
        },
        ""
      );
    }

    // ==================================================================
    //  7. ПОКУПКИ (IAP)
    // ==================================================================

    async _pay() {
      if (this.payments) return this.payments;
      if (!this.ysdk) throw new Error("SDK is not initialized");
      this.payments = await this.ysdk.getPayments();
      return this.payments;
    }

    iapInit() {
      return this._safe("getPayments", async () => {
        await this._pay();
      });
    }

    iapReady() {
      return !!this.payments;
    }

    iapCatalog() {
      return this._safe(
        "getCatalog",
        async () => {
          const payments = await this._pay();
          this.catalogCache = (await payments.getCatalog()) || [];
          return toDash(
            this.catalogCache.map((p) => ({
              id: p.id,
              title: p.title,
              description: p.description,
              imageURI: p.imageURI,
              price: p.price,
              priceValue: p.priceValue,
              priceCurrencyCode: p.priceCurrencyCode,
            }))
          );
        },
        toDash([])
      );
    }

    iapCatalogField(args) {
      const id = Cast.toString(args.ID);
      const field = Cast.toString(args.FIELD);
      return this._safe(
        "getCatalog",
        async () => {
          const payments = await this._pay();
          if (!this.catalogCache.length) this.catalogCache = (await payments.getCatalog()) || [];
          const product = this.catalogCache.find((p) => p.id === id);
          if (!product) return "";
          if (field === "priceCurrencyImage") {
            return product.getPriceCurrencyImage ? product.getPriceCurrencyImage("medium") : "";
          }
          const value = product[field];
          return value === undefined || value === null ? "" : value;
        },
        ""
      );
    }

    iapPurchase(args) {
      const id = Cast.toString(args.ID);
      const payload = Cast.toString(args.PAYLOAD);
      return this._safe("purchase", async () => {
        const payments = await this._pay();
        const request = { id: id };
        if (payload) request.developerPayload = payload;
        try {
          const purchase = await payments.purchase(request);
          this.lastPurchase = purchase;
          this._fireHat("whenPurchase", { EVENT: "success" });
        } catch (e) {
          this.lastPurchase = null;
          this._err("purchase", e);
          this._fireHat("whenPurchase", { EVENT: "failed" });
        }
      });
    }

    lastPurchaseJSON() {
      return toDash(this.lastPurchase || {});
    }

    iapPurchases() {
      return this._safe(
        "getPurchases",
        async () => {
          const payments = await this._pay();
          this.purchasesCache = (await payments.getPurchases()) || [];
          return toDash(
            this.purchasesCache.map((p) => ({
              productID: p.productID,
              purchaseToken: p.purchaseToken,
              developerPayload: p.developerPayload || "",
            }))
          );
        },
        toDash([])
      );
    }

    iapHas(args) {
      const id = Cast.toString(args.ID);
      return this._safe(
        "getPurchases",
        async () => {
          const payments = await this._pay();
          this.purchasesCache = (await payments.getPurchases()) || [];
          return this.purchasesCache.some((p) => p.productID === id);
        },
        false
      );
    }

    /** Потребляет покупку по ID товара (ищет токен в списке покупок). */
    iapConsume(args) {
      const id = Cast.toString(args.ID);
      return this._safe("consumePurchase", async () => {
        const payments = await this._pay();
        const purchases = (await payments.getPurchases()) || [];
        const target = purchases.find((p) => p.productID === id || p.purchaseToken === id);
        if (!target) {
          this.lastError = "consumePurchase: purchase '" + id + "' not found";
          return;
        }
        await payments.consumePurchase(target.purchaseToken);
      });
    }

    iapConsumeAll() {
      return this._safe("consumePurchase(all)", async () => {
        const payments = await this._pay();
        const purchases = (await payments.getPurchases()) || [];
        for (const p of purchases) {
          try {
            await payments.consumePurchase(p.purchaseToken);
          } catch (e) {
            this._err("consumePurchase", e);
          }
        }
      });
    }

    // ==================================================================
    //  8. ИГРОК И АВТОРИЗАЦИЯ
    // ==================================================================

    /** Заглушка игрока для отладочного (офлайн) режима. */
    _debugPlayer() {
      const self = this;
      return {
        getName: () => "Debug Player",
        getUniqueID: () => "debug-player-id",
        getMode: () => "lite",
        isAuthorized: () => false,
        getPayingStatus: () => "unknown",
        getPhoto: () => "",
        getData: async () => self.dataCache,
        setData: async (data) => Object.assign(self.dataCache, data),
        getStats: async () => self.statsCache,
        incrementStats: async (data) => {
          for (const k of Object.keys(data)) {
            self.statsCache[k] = (self.statsCache[k] || 0) + Number(data[k] || 0);
          }
          return self.statsCache;
        },
      };
    }

    async _getPlayer(scopes) {
      if (this.debug) return this._debugPlayer();
      if (!this.ysdk) throw new Error("SDK is not initialized");
      if (this.player && !scopes) return this.player;
      this.player = await this.ysdk.getPlayer({ scopes: !!scopes });
      return this.player;
    }

    isAuthorized() {
      return this._safe(
        "isAuthorized",
        async () => {
          const player = await this._getPlayer(false);
          return typeof player.isAuthorized === "function"
            ? player.isAuthorized()
            : player.getMode() !== "lite";
        },
        false
      );
    }

    openAuth() {
      if (!this._needSdk("openAuthDialog")) return;
      return this._safe("openAuthDialog", async () => {
        await this.ysdk.auth.openAuthDialog();
        // После успешного входа пересоздаём игрока с разрешениями.
        this.player = await this.ysdk.getPlayer({ scopes: true });
      });
    }

    playerName() {
      return this._safe(
        "getName",
        async () => {
          const player = await this._getPlayer(false);
          return player.getName() || "";
        },
        ""
      );
    }

    playerId() {
      return this._safe(
        "getUniqueID",
        async () => {
          const player = await this._getPlayer(false);
          return player.getUniqueID() || "";
        },
        ""
      );
    }

    playerAvatar(args) {
      const size = Cast.toString(args.SIZE);
      return this._safe(
        "getPhoto",
        async () => {
          const player = await this._getPlayer(false);
          return player.getPhoto(size) || "";
        },
        ""
      );
    }

    playerPaying() {
      return this._safe(
        "getPayingStatus",
        async () => {
          const player = await this._getPlayer(false);
          return player.getPayingStatus ? player.getPayingStatus() : "unknown";
        },
        "unknown"
      );
    }

    playerMode() {
      return this._safe(
        "getMode",
        async () => {
          const player = await this._getPlayer(false);
          return player.getMode ? player.getMode() : "";
        },
        ""
      );
    }

    playerJSON() {
      return this._safe(
        "playerJSON",
        async () => {
          const player = await this._getPlayer(false);
          return toDash({
            name: player.getName ? player.getName() : "",
            uniqueID: player.getUniqueID ? player.getUniqueID() : "",
            mode: player.getMode ? player.getMode() : "",
            authorized: player.isAuthorized ? player.isAuthorized() : false,
            payingStatus: player.getPayingStatus ? player.getPayingStatus() : "unknown",
            avatarSmall: player.getPhoto ? player.getPhoto("small") : "",
            avatarMedium: player.getPhoto ? player.getPhoto("medium") : "",
            avatarLarge: player.getPhoto ? player.getPhoto("large") : "",
          });
        },
        toDash({})
      );
    }

    // ==================================================================
    //  9. ОБЛАЧНЫЕ СОХРАНЕНИЯ
    // ==================================================================

    setData(args) {
      const data = parseObject(args.DATA, null);
      const flush = Cast.toBoolean(args.FLUSH);
      if (!data) {
        this.lastError = "setData: argument is not a valid JSON object";
        return;
      }
      return this._safe("setData", async () => {
        const player = await this._getPlayer(false);
        await player.setData(data, flush);
        Object.assign(this.dataCache, data);
      });
    }

    setKey(args) {
      const key = Cast.toString(args.KEY);
      let value = args.VALUE;
      // Числа и JSON сохраняем «как есть», остальное — строкой.
      try {
        const parsed = JSON.parse(Cast.toString(value));
        value = parsed;
      } catch (e) {
        value = Cast.toString(value);
      }
      const patch = {};
      patch[key] = value;
      return this.setData({ DATA: patch, FLUSH: true });
    }

    loadData() {
      return this._safe("getData", async () => {
        const player = await this._getPlayer(false);
        this.dataCache = (await player.getData()) || {};
      });
    }

    getData(args) {
      const key = Cast.toString(args.KEY);
      return this._safe(
        "getData",
        async () => {
          const player = await this._getPlayer(false);
          this.dataCache = (await player.getData()) || {};
          if (!key) return toDash(this.dataCache);
          const value = getPath(this.dataCache, key);
          return value === undefined ? "" : toDash(value);
        },
        ""
      );
    }

    getAllData() {
      return this._safe(
        "getData",
        async () => {
          const player = await this._getPlayer(false);
          this.dataCache = (await player.getData()) || {};
          return toDash(this.dataCache);
        },
        toDash({})
      );
    }

    resetData() {
      if (this.debug) {
        this.dataCache = {};
        return;
      }
      return this._safe("resetData", async () => {
        const player = await this._getPlayer(false);
        const current = (await player.getData()) || {};
        const cleared = {};
        for (const key of Object.keys(current)) cleared[key] = null;
        await player.setData(cleared, true);
        this.dataCache = {};
      });
    }

    setStats(args) {
      const data = parseObject(args.DATA, null);
      if (!data) {
        this.lastError = "setStats: argument is not a valid JSON object";
        return;
      }
      return this._safe("incrementStats", async () => {
        const player = await this._getPlayer(false);
        this.statsCache = (await player.incrementStats(data)) || {};
      });
    }

    getStats() {
      return this._safe(
        "getStats",
        async () => {
          const player = await this._getPlayer(false);
          this.statsCache = (await player.getStats()) || {};
          return toDash(this.statsCache);
        },
        toDash({})
      );
    }

    // ==================================================================
    //  10. ОКРУЖЕНИЕ
    // ==================================================================

    lang() {
      if (this.debug) return "ru";
      if (!this.ysdk) return "";
      try {
        return this.ysdk.environment.i18n.lang || "";
      } catch (e) {
        return this._err("lang", e), "";
      }
    }

    tld() {
      if (this.debug) return "ru";
      if (!this.ysdk) return "";
      try {
        return this.ysdk.environment.i18n.tld || "";
      } catch (e) {
        return this._err("tld", e), "";
      }
    }

    appId() {
      if (!this.ysdk) return "";
      try {
        return this.ysdk.environment.app.id || "";
      } catch (e) {
        return this._err("appId", e), "";
      }
    }

    payload() {
      if (!this.ysdk) return "";
      try {
        return this.ysdk.environment.payload || "";
      } catch (e) {
        return this._err("payload", e), "";
      }
    }

    browserLang() {
      if (!this.ysdk) return String(navigator.language || "").split("-")[0];
      try {
        return this.ysdk.environment.browser.lang || "";
      } catch (e) {
        return this._err("browserLang", e), "";
      }
    }

    serverTime() {
      if (!this.ysdk) return Date.now();
      try {
        return this.ysdk.serverTime();
      } catch (e) {
        return this._err("serverTime", e), Date.now();
      }
    }

    deviceType() {
      if (this.debug) return "desktop";
      if (!this.ysdk) return "";
      try {
        return this.ysdk.deviceInfo.type || "";
      } catch (e) {
        return this._err("deviceType", e), "";
      }
    }

    isDevice(args) {
      const type = Cast.toString(args.TYPE).toLowerCase();
      if (this.debug) return type === "desktop";
      if (!this.ysdk) return false;
      try {
        const info = this.ysdk.deviceInfo;
        switch (type) {
          case "desktop":
            return info.isDesktop();
          case "mobile":
            return info.isMobile();
          case "tablet":
            return info.isTablet();
          case "tv":
            return typeof info.isTV === "function" ? info.isTV() : false;
          default:
            return String(info.type).toLowerCase() === type;
        }
      } catch (e) {
        return this._err("isDevice", e), false;
      }
    }

    isTopLevel() {
      try {
        return window.self !== window.top;
      } catch (e) {
        return true;
      }
    }

    // ==================================================================
    //  11. ОТЗЫВЫ, ЯРЛЫК, БУФЕР ОБМЕНА, GAMEPLAY API, ФЛАГИ
    // ==================================================================

    canReview() {
      if (this.debug) return !this.rated;
      return this._safe(
        "canReview",
        async () => {
          if (!this.ysdk) return false;
          const result = await this.ysdk.feedback.canReview();
          if (result && result.reason) this.lastError = "canReview: " + result.reason;
          return !!(result && result.value);
        },
        false
      );
    }

    requestReview() {
      if (this.debug) {
        this.rated = true;
        return;
      }
      if (!this._needSdk("requestReview")) return;
      return this._safe("requestReview", async () => {
        const result = await this.ysdk.feedback.requestReview();
        this.rated = !!(result && result.feedbackSent);
      });
    }

    reviewDone() {
      return this.rated;
    }

    canShortcut() {
      if (this.debug) return true;
      return this._safe(
        "shortcut.canShowPrompt",
        async () => {
          if (!this.ysdk || !this.ysdk.shortcut) return false;
          const prompt = await this.ysdk.shortcut.canShowPrompt();
          return !!(prompt && prompt.canShow);
        },
        false
      );
    }

    addShortcut() {
      if (this.debug) {
        this.shortcutAccepted = true;
        return;
      }
      if (!this._needSdk("shortcut.showPrompt")) return;
      return this._safe("shortcut.showPrompt", async () => {
        const result = await this.ysdk.shortcut.showPrompt();
        this.shortcutAccepted = !!(result && result.outcome === "accepted");
      });
    }

    shortcutWasAdded() {
      return this.shortcutAccepted;
    }

    clipboard(args) {
      const text = Cast.toString(args.TEXT);
      return this._safe("clipboard.writeText", async () => {
        if (this.ysdk && this.ysdk.clipboard && this.ysdk.clipboard.writeText) {
          await this.ysdk.clipboard.writeText(text);
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          throw new Error("clipboard API is unavailable");
        }
      });
    }

    gameplayStart() {
      if (!this._needSdk("GameplayAPI.start")) return;
      try {
        this.ysdk.features.GameplayAPI.start();
      } catch (e) {
        this._err("GameplayAPI.start", e);
      }
    }

    gameplayStop() {
      if (!this._needSdk("GameplayAPI.stop")) return;
      try {
        this.ysdk.features.GameplayAPI.stop();
      } catch (e) {
        this._err("GameplayAPI.stop", e);
      }
    }

    getFlags() {
      return this._safe(
        "getFlags",
        async () => {
          if (!this.ysdk) return toDash({});
          this.flags = (await withTimeout(this.ysdk.getFlags(), 8000, "getFlags")) || {};
          return toDash(this.flags);
        },
        toDash({})
      );
    }

    getFlag(args) {
      const name = Cast.toString(args.NAME);
      const fallback = Cast.toString(args.DEFAULT);
      return this._safe(
        "getFlag",
        async () => {
          if (!this.ysdk) return fallback;
          if (!Object.keys(this.flags).length) {
            this.flags = (await withTimeout(this.ysdk.getFlags(), 8000, "getFlags")) || {};
          }
          const value = this.flags[name];
          return value === undefined ? fallback : toDash(value);
        },
        fallback
      );
    }
  }

  Scratch.extensions.register(new YandexGamesSDK());
})(Scratch);
