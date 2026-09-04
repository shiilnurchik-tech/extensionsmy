// Name: Discord Bot API (RU)
// Description: Discord Bot API на русском + фишки, которых нет в Discord (БД, таймеры, антифлуд, склонения, генераторы, погода, курсы, QR)
// ID: DiscordBotAPI
/*
    Discord Bot API — расширение для dashblocks (мод на TurboWarp)

    ВАЖНО: расширение должно быть загружено БЕЗ песочницы (unsandboxed).

    Как работает:
      • приём событий — по WebSocket-шлюзу Discord (как настоящий бот);
      • отправка — обычными запросами к https://discord.com/api/v10
        (Discord разрешает запросы из браузера, CORS открыт);
      • токен бота живёт в проекте — не выкладывай .sb3 в общий доступ.

    Перед стартом в https://discord.com/developers/applications:
      • Bot → Token (скопировать в блок «инициализировать бота с токеном»);
      • Bot → Privileged Gateway Intents → включить MESSAGE CONTENT INTENT,
        иначе текст сообщений приходить не будет;
      • OAuth2 → URL Generator → scopes «bot», права «Send Messages»,
        «Read Message History», «Manage Messages» и т.д. → добавить бота на сервер.
*/

(function (Scratch) {
    "use strict";

    if (!Scratch.extensions.unsandboxed)
        throw new Error("Расширение Discord Bot API должно быть загружено без песочницы (unsandboxed)!");

    const NormalArray = Scratch.NormalArray ? Scratch.NormalArray : Array;

    const NORM = {
        parse: {
            "нет": "нет", "no": "нет", "none": "нет", "обычный": "нет",
            "без форматирования": "нет", "текст": "нет", "plain": "нет",
            "markdown": "Markdown", "маркдаун": "Markdown", "md": "Markdown",
            "html": "HTML", "хтмл": "HTML",
            "markdownv2": "MarkdownV2", "markdown v2": "MarkdownV2",
            "маркдаунв2": "MarkdownV2", "маркдаун v2": "MarkdownV2",
        },
        btn: {
            "данные": "данные", "data": "данные", "колбэк": "данные",
            "колбек": "данные", "callback": "данные",
            "ссылка": "ссылка", "link": "ссылка", "url": "ссылка",
            "новый ряд": "\n", "ряд": "\n", "разделитель": "\n",
            "перенос": "\n", "row": "\n", "new row": "\n",
        },
        cbAnswer: {
            "всплывающее": "всплывающее", "всплывашка": "всплывающее",
            "popup": "всплывающее", "тост": "всплывающее",
            "предупреждение": "предупреждение", "окно": "предупреждение",
            "alert": "предупреждение", "алерт": "предупреждение",
        },
        msg: {
            "текст": "текст", "text": "текст",
            "id": "id", "id сообщения": "id", "message id": "id",
            "id чата": "id чата", "чат": "id чата", "chat id": "id чата",
            "команда": "команда", "command": "команда",
            "ник": "ник", "username": "ник", "никнейм": "ник",
            "id пользователя": "id пользователя", "user id": "id пользователя",
            "id стикера": "id стикера", "стикер": "id стикера",
            "sticker id": "id стикера",
            "имя": "имя", "first name": "имя",
            "фамилия": "фамилия", "last name": "фамилия",
            "полное имя": "полное имя", "full name": "полное имя",
            "аргументы": "аргументы", "args": "аргументы",
            "время": "время", "дата": "время", "time": "время",
            "тип чата": "тип чата", "chat type": "тип чата",
            "название чата": "название чата",
            "язык": "язык", "language": "язык", "lang": "язык",
            "премиум": "премиум", "premium": "премиум",
            "бот": "бот", "bot": "бот", "это бот": "бот",
            "id ответа": "id ответа", "reply id": "id ответа",
            "есть фото": "есть фото", "has photo": "есть фото",
            "id фото": "id фото", "photo id": "id фото",
            "id документа": "id документа", "file id": "id документа",
        },
        cb: {
            "данные": "данные", "data": "данные",
            "id": "id",
            "id чата": "id чата", "chat id": "id чата",
            "ник": "ник", "username": "ник",
            "id пользователя": "id пользователя", "user id": "id пользователя",
            "id сообщения": "id сообщения", "message id": "id сообщения",
            "текст сообщения": "текст сообщения",
            "текст": "текст сообщения",
        },
        anon: {
            "анонимный": true, "anonymous": true, "anon": true,
            "публичный": false, "неанонимный": false,
            "non-anonymous": false, "public": false,
        },
        multi: {
            "несколько ответов": true, "multiple answers": true,
            "несколько": true,
            "один ответ": false, "single answer": false, "один": false,
        },
        arr: {
            "кнопки": "кнопки", "buttons": "кнопки",
            "варианты опроса": "варианты опроса", "варианты": "варианты опроса",
            "poll options": "варианты опроса", "options": "варианты опроса",
        },
        case: {
            "верхний": "верхний", "upper": "верхний",
            "нижний": "нижний", "lower": "нижний",
            "первая заглавная": "первая заглавная",
            "каждое слово с заглавной": "каждое слово с заглавной",
            "перевёрнутый": "перевёрнутый", "перевернутый": "перевёрнутый",
            "без пробелов": "без пробелов", "без пробелов по краям": "без пробелов",
            "транслит": "транслит",
        },
        randStr: {
            "цифры": "цифры", "буквы": "буквы",
            "буквы и цифры": "буквы и цифры",
            "пароль": "пароль", "эмодзи": "эмодзи",
        },
        hash: {
            "md5": "MD5", "sha-1": "SHA-1", "sha1": "SHA-1",
            "sha-256": "SHA-256", "sha256": "SHA-256",
            "sha-512": "SHA-512", "sha512": "SHA-512",
        },
        fact: {
            "любой": "любой", "any": "любой", "все": "любой",
            "на русском": "на русском", "русский": "на русском",
            "ru": "на русском", "русские": "на русском",
            "из интернета": "из интернета", "online": "из интернета",
            "английские": "из интернета", "en": "из интернета",
        },
        esc: {
            "html": "HTML", "markdownv2": "MarkdownV2",
            "markdown v2": "MarkdownV2", "маркдаунv2": "MarkdownV2",
            "markdown": "Markdown", "маркдаун": "Markdown",
        },
        action: {
            "печатает": "typing", "typing": "typing",
            "отправляет фото": "upload_photo", "upload_photo": "upload_photo",
            "отправляет видео": "upload_video", "upload_video": "upload_video",
            "отправляет голосовое": "record_voice", "record_voice": "record_voice",
            "отправляет документ": "upload_document",
            "upload_document": "upload_document",
            "выбирает стикер": "choose_sticker", "choose_sticker": "choose_sticker",
            "снимает видео": "record_video", "record_video": "record_video",
        },
        dice: { "🎲": "🎲", "🎯": "🎯", "🏀": "🏀", "⚽": "⚽", "🎳": "🎳", "🎰": "🎰" },
        time: {
            "время": "время", "дата": "дата", "дата и время": "дата и время",
            "день недели": "день недели", "unix": "unix", "час": "час",
            "минута": "минута", "секунда": "секунда", "месяц": "месяц", "год": "год",
        },
        botInfo: {
            "ник": "ник", "username": "ник",
            "имя": "имя", "name": "имя",
            "id": "id", "может ли читать группы": "может ли читать группы",
        },

        array: {
            "кнопки": "кнопки", "buttons": "кнопки", "button": "кнопки",
        },
        btn: {
            "данные": "данные", "кнопка": "данные", "колбэк": "данные",
            "callback": "данные", "custom": "данные", "custom_id": "данные",
            "ссылка": "ссылка", "link": "ссылка", "url": "ссылка",
            "новый ряд": "\n", "ряд": "\n", "разделитель": "\n",
            "перенос": "\n", "row": "\n", "new row": "\n",
        },
        style: {
            "синий": 1, "primary": 1, "основной": 1, "1": 1,
            "серый": 2, "вторичный": 2, "secondary": 2, "2": 2,
            "зелёный": 3, "зеленый": 3, "success": 3, "успех": 3, "3": 3,
            "красный": 4, "danger": 4, "опасный": 4, "4": 4,
        },
        chantype: {
            "текстовый": 0, "текст": 0, "text": 0, "0": 0,
            "голосовой": 2, "voice": 2, "голос": 2, "2": 2,
            "категория": 4, "category": 4, "4": 4,
            "форум": 15, "forum": 15, "15": 15,
        },
    };

    const WMO = {
        0: "ясно", 1: "преимущественно ясно", 2: "переменная облачность",
        3: "пасмурно", 45: "туман", 48: "туман", 51: "слабая морось",
        53: "морось", 55: "сильная морось", 56: "ледяная морось",
        57: "ледяная морось", 61: "небольшой дождь", 63: "дождь",
        65: "сильный дождь", 66: "ледяной дождь", 67: "ледяной дождь",
        71: "небольшой снег", 73: "снег", 75: "сильный снег",
        77: "снежные зёрна", 80: "небольшой ливень", 81: "ливень",
        82: "сильный ливень", 85: "снегопад", 86: "сильный снегопад",
        95: "гроза", 96: "гроза с градом", 99: "сильная гроза с градом",
    };

    // Транслитерация RU <-> EN
    const TRANSLIT = {
        "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e",
        "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
        "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
        "ф": "f", "х": "h", "ц": "c", "ч": "ch", "ш": "sh", "щ": "sch",
        "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
        " ": " ", "-": "-", "_": "_", ".": ".", ",": ",",
    };

    const RU_FACTS = [
        "Кошки спят в среднем 16 часов в сутки.",
        "Самая длинная река Европы — Волга, её длина 3531 км.",
        "В русском алфавите 33 буквы.",
        "Мед при правильном хранении может не портиться тысячи лет.",
        "Байкал — самое глубокое озеро планеты, его глубина 1642 метра.",
        "Самое длинное слово в русском языке из 35 букв — «рентгеноэлектрокардиографический».",
        "Улитки могут спать до трёх лет подряд.",
        "Санкт-Петербург стоит на 42 островах.",
        "Сердце синего кита весит примерно 700 килограммов.",
        "Клубника с точки зрения ботаники — не ягода, а орешек.",
        "Банан — это ягода, а клубника — нет.",
        "Глаза хамелеона могут смотреть в разные стороны одновременно.",
        "Самая высокая гора России — Эльбрус, 5642 метра.",
        "У осьминога три сердца и голубая кровь.",
        "Первый компьютерный «баг» был настоящим мотыльком, застрявшим в реле.",
        "В России 11 часовых поясов — больше, чем в любой другой стране.",
        "Коровы дают больше молока, когда слушают спокойную музыку.",
        "Свет от Солнца идёт до Земли примерно 8 минут 20 секунд.",
        "Золотая рыбка может прожить более 40 лет.",
        "Слово «спасибо» произошло от «спаси Бог».",
        "Самая маленькая страна в мире — Ватикан, её площадь 0,44 км².",
        "Человеческий мозг примерно на 75% состоит из воды.",
        "В Антарктиде есть река, которая течёт кровью — из-за оксида железа.",
        "Пингвины могут прыгать из воды на высоту до 2 метров.",
        "Именно в России появился первый в мире искусственный спутник Земли.",
        "Ёжики существуют на Земле уже около 15 миллионов лет.",
        "Морские звёзды могут отращивать потерянные лучи заново.",
        "Один грамм золота можно растянуть в проволоку длиной 2 километра.",
        "Самая большая пустыня мира — Антарктида, а не Сахара.",
        "Носорог узнаёт человека по запаху, а видит очень плохо.",
        "Кофе — второй по объёму продаж товар в мире после нефти.",
        "У собак нет потовых желёз: они охлаждаются, высовывая язык.",
        "Самое глубокое место океана — Марианская впадина, почти 11 км.",
        "Библиотека Ивана Грозного считается одной из главных загадок истории.",
        "Молния нагревает воздух до 30 000 °C — горячее поверхности Солнца.",
        "Совы не могут вращать глазами: они поворачивают всю голову.",
        "В космосе человек без скафандра теряет сознание примерно за 15 секунд.",
        "Самое распространённое слово в русском языке — «и».",
        "ДНК человека совпадает с ДНК банана примерно на 50%.",
        "Одной пчеле нужно облететь около 2 миллионов цветков, чтобы собрать 500 г мёда.",
    ];

    // Реализация MD5 (RFC 1321) — crypto.subtle не поддерживает MD5

    function md5(input) {
        const text = String(input === undefined || input === null ? "" : input);
        let bytes;
        if (typeof TextEncoder !== "undefined") {
            bytes = new TextEncoder().encode(text);
        } else {
            const s = unescape(encodeURIComponent(text));
            bytes = new Uint8Array(s.length);
            for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xff;
        }
        const T = [];
        for (let i = 1; i <= 64; i++)
            T.push(Math.floor(Math.abs(Math.sin(i)) * 4294967296) >>> 0);
        const S = [
            7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
            5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
            4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
            6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
        ];
        let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
        const bitLen = bytes.length * 8;
        const buf = new Uint8Array((((bytes.length + 8) >> 6) + 1) * 64);
        buf.set(bytes);
        buf[bytes.length] = 0x80;
        const dv = new DataView(buf.buffer);
        dv.setUint32(buf.length - 8, bitLen >>> 0, true);
        dv.setUint32(buf.length - 4, Math.floor(bitLen / 4294967296), true);
        const add = (x, y) => (x + y) >>> 0;
        const rotl = (x, n) => ((x << n) | (x >>> (32 - n))) >>> 0;
        for (let off = 0; off < buf.length; off += 64) {
            const M = [];
            for (let j = 0; j < 16; j++) M.push(dv.getUint32(off + j * 4, true));
            let A = a0, B = b0, C = c0, D = d0;
            for (let i = 0; i < 64; i++) {
                let F, g;
                if (i < 16) {
                    F = (B & C) | (~B & D);
                    g = i;
                } else if (i < 32) {
                    F = (D & B) | (~D & C);
                    g = (5 * i + 1) % 16;
                } else if (i < 48) {
                    F = B ^ C ^ D;
                    g = (3 * i + 5) % 16;
                } else {
                    F = C ^ (B | ~D);
                    g = (7 * i) % 16;
                }
                F = F >>> 0;
                const tmp = D;
                D = C;
                C = B;
                B = add(B, rotl(add(add(A, F), add(T[i], M[g])), S[i]));
                A = tmp;
            }
            a0 = add(a0, A);
            b0 = add(b0, B);
            c0 = add(c0, C);
            d0 = add(d0, D);
        }
        const le = (n) => {
            const u = n >>> 0;
            return [u & 0xff, (u >>> 8) & 0xff, (u >>> 16) & 0xff, (u >>> 24) & 0xff]
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("");
        };
        return le(a0) + le(b0) + le(c0) + le(d0);
    }


    const STORE_KEY = "DiscordBotAPI_RU_store_v1";
    const API = "https://discord.com/api/v10";
    const GATEWAY = "wss://gateway.discord.gg/?v=10&encoding=json";

    // Наборы прав (intents) для подключения к шлюзу
    const INTENTS = {
        // GUILDS + GUILD_MESSAGES + GUILD_MESSAGE_REACTIONS +
        // DIRECT_MESSAGES + DIRECT_MESSAGE_REACTIONS + MESSAGE_CONTENT
        "обычный": 46593,
        "минимум": 33281, // GUILDS + GUILD_MESSAGES + MESSAGE_CONTENT
        "максимум": 46863, // + участники + баны + эмодзи + Presence (привилегированные!)
        "сообщения": 46593,
        "личные": 46593,
        "модерация": 46599, // обычный + GUILD_MODERATION(4) + GUILD_MEMBERS(2)
        "всё": 46863,
    };

    // Иконка расширения (Discord Clyde на фирменном фоне #5865F2)
    const ICON =
        "data:image/svg+xml;base64," +
        btoa(
            '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">' +
                '<rect width="40" height="40" rx="9" fill="#5865F2"/>' +
                '<g transform="translate(6.2, 6.2) scale(1.15)">' +
                    '<path fill="#ffffff" d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>' +
                '</g>' +
            '</svg>'
        );

    class DiscordBotAPIExtension {
        constructor() {
            this.token = "";
            this.connected = false;
            this.ws = null;
            this.hbTimer = null;
            this.heartbeatMs = 41250;
            this.seq = null;
            this.sessionId = null;
            this.resumeUrl = GATEWAY;
            this.intents = INTENTS["обычный"];
            this.autoReconnect = true;
            this.seeSelf = false; // реагировать ли на свои собственные сообщения

            this.botUser = null; // { id, username }
            this.applicationId = "";
            this.guilds = new NormalArray(); // [{ id, name, member_count }]

            this.lastMessage = null; // сырой объект сообщения Discord
            this.lastInteraction = null;
            this.lastMember = null;
            this.lastReaction = null;

            this.allUsers = new NormalArray();
            this.inlineButtons = new NormalArray();
            this.buttonsPerRow = 0;
            this.embed = null;

            this.startedAt = Date.now();
            this.log = new NormalArray();
            this.lastError = "";
            this.db = {};
            this.counters = {};
            this.stats = { messages: 0, updates: 0 };
            this.timers = {};
            this.timerFired = {};
            this.cooldowns = {};
            this.flood = {};
            this.badWords = new NormalArray();
            this.events = {
                ready: false,
                message: false,
                command: null,
                button: null,
                select: null,
                slash: null,
                memberAdd: false,
                memberRemove: false,
                reaction: false,
                timer: null,
            };
            this.ai = {
                key: "",
                model: "gpt-4o-mini",
                url: "https://api.openai.com/v1",
                role: "Ты — дружелюбный помощник. Отвечай кратко на русском языке.",
            };
            this.rateRemaining = "";
            this._saveTimer = null;
            this._loadStore();
        }

        getInfo() {
            return {
                id: "DiscordBotAPI",
                name: "Дискорд Бот API",
                color1: "#5865F2",
                color2: "#404EED",
                color3: "#23272A",
                menuIconURI: ICON,
                blockIconURI: ICON,
                blocks: [
                    // =============================================================
                    //  Инициализация
                    // =============================================================
                    { blockType: Scratch.BlockType.LABEL, text: "Инициализация" },
                    {
                        opcode: "initBot",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "инициализировать бота с токеном [TOKEN]",
                        arguments: {
                            TOKEN: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "MTIzNDU2Nzg5OlRva2Vu",
                            },
                        },
                    },
                    {
                        opcode: "connect",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "подключиться к шлюзу с правами [INTENTS]",
                        arguments: {
                            INTENTS: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "INTENTS_MENU",
                            },
                        },
                    },
                    {
                        opcode: "disconnect",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "отключиться от шлюза",
                    },
                    {
                        opcode: "isConnected",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "бот подключён?",
                    },
                    {
                        opcode: "resetBot",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "сбросить бота",
                    },

                    // =============================================================
                    //  О боте и серверах
                    // =============================================================
                    { blockType: Scratch.BlockType.LABEL, text: "Бот и серверы" },
                    { opcode: "botId", blockType: Scratch.BlockType.REPORTER, text: "id бота" },
                    {
                        opcode: "botName",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "имя бота",
                    },
                    {
                        opcode: "appId",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "id приложения бота",
                    },
                    {
                        opcode: "guildCount",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "количество серверов бота",
                    },
                    {
                        opcode: "guildList",
                        blockType: Scratch.BlockType.ARRAY,
                        text: "список серверов бота",
                    },
                    {
                        opcode: "guildName",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "название сервера [GUILD]",
                        arguments: {
                            GUILD: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },
                    {
                        opcode: "guildMembers",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "участников на сервере [GUILD]",
                        arguments: {
                            GUILD: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },
                    {
                        opcode: "channelList",
                        blockType: Scratch.BlockType.ARRAY,
                        text: "список каналов сервера [GUILD]",
                        arguments: {
                            GUILD: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },
                    {
                        opcode: "findChannel",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "найти канал [NAME] на сервере [GUILD]",
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "общий",
                            },
                            GUILD: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },

                    // =============================================================
                    //  Сообщения
                    // =============================================================
                    { blockType: Scratch.BlockType.LABEL, text: "Сообщения" },
                    {
                        opcode: "sendMessage",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "отправить [TEXT] в канал [CHANNEL] с кнопками [BUTTONS]",
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Привет!",
                            },
                            CHANNEL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            BUTTONS: { type: Scratch.ArgumentType.ARRAY },
                        },
                    },
                    {
                        opcode: "reply",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "ответить [TEXT] на последнее сообщение",
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "И тебе привет!",
                            },
                        },
                    },
                    {
                        opcode: "sendDM",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "отправить [TEXT] в личку пользователю [USER]",
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Привет!",
                            },
                            USER: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },
                    {
                        opcode: "sendEmbed",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "отправить эмбед в канал [CHANNEL] с кнопками [BUTTONS]",
                        arguments: {
                            CHANNEL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            BUTTONS: { type: Scratch.ArgumentType.ARRAY },
                        },
                    },
                    {
                        opcode: "sendFile",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "отправить файл [URL] в канал [CHANNEL] с подписью [TEXT]",
                        arguments: {
                            URL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "https://.../foto.png",
                            },
                            CHANNEL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "" },
                        },
                    },
                    {
                        opcode: "editMessage",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "изменить сообщение [ID] в канале [CHANNEL] на [TEXT]",
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            CHANNEL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Обновлённый текст",
                            },
                        },
                    },
                    {
                        opcode: "editButtons",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "изменить кнопки сообщения [ID] в канале [CHANNEL] на [BUTTONS]",
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            CHANNEL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            BUTTONS: { type: Scratch.ArgumentType.ARRAY },
                        },
                    },
                    {
                        opcode: "deleteMessage",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "удалить сообщение [ID] в канале [CHANNEL]",
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            CHANNEL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },
                    {
                        opcode: "pinMessage",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "закрепить сообщение [ID] в канале [CHANNEL]",
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            CHANNEL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },
                    {
                        opcode: "unpinMessage",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "открепить сообщение [ID] в канале [CHANNEL]",
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            CHANNEL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },
                    {
                        opcode: "addReaction",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "добавить реакцию [EMOJI] к сообщению [ID] в канале [CHANNEL]",
                        arguments: {
                            EMOJI: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "EMOJI_MENU",
                            },
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            CHANNEL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },
                    {
                        opcode: "removeReaction",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "убрать реакцию [EMOJI] у сообщения [ID] в канале [CHANNEL] у [USER]",
                        arguments: {
                            EMOJI: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "EMOJI_MENU",
                            },
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            CHANNEL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            USER: { type: Scratch.ArgumentType.STRING, defaultValue: "" },
                        },
                    },
                    {
                        opcode: "clearReactions",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "убрать все реакции у сообщения [ID] в канале [CHANNEL]",
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            CHANNEL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },
                    {
                        opcode: "typing",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "показать «печатает» в канале [CHANNEL]",
                        arguments: {
                            CHANNEL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },
                    {
                        opcode: "fetchMessages",
                        blockType: Scratch.BlockType.ARRAY,
                        text: "последние [N] сообщений канала [CHANNEL]",
                        arguments: {
                            N: { type: Scratch.ArgumentType.NUMBER, defaultValue: 10 },
                            CHANNEL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },

                    // =============================================================
                    //  Последнее сообщение
                    // =============================================================
                    { blockType: Scratch.BlockType.LABEL, text: "Последнее сообщение" },
                    {
                        opcode: "lastText",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "текст последнего сообщения",
                    },
                    {
                        opcode: "lastMessageId",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "id последнего сообщения",
                    },
                    {
                        opcode: "lastChannelId",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "id канала последнего сообщения",
                    },
                    {
                        opcode: "lastGuildId",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "id сервера последнего сообщения",
                    },
                    {
                        opcode: "lastUserId",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "id автора последнего сообщения",
                    },
                    {
                        opcode: "lastUserName",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "имя автора последнего сообщения",
                    },
                    {
                        opcode: "lastUserNick",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "ник автора последнего сообщения",
                    },
                    {
                        opcode: "lastUserMention",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "упоминание автора последнего сообщения",
                    },
                    {
                        opcode: "lastUserAvatar",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "аватар автора последнего сообщения",
                    },
                    {
                        opcode: "lastIsBot",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "автор последнего сообщения — бот?",
                    },
                    {
                        opcode: "lastUserRoles",
                        blockType: Scratch.BlockType.ARRAY,
                        text: "роли автора последнего сообщения",
                    },
                    {
                        opcode: "hasNewMessage",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "есть новое сообщение?",
                    },
                    {
                        opcode: "isMessageStartsWith",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "последнее сообщение начинается с [PREFIX]",
                        arguments: {
                            PREFIX: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "!",
                            },
                        },
                    },

                    // =============================================================
                    //  Эмбеды (красивые плашки)
                    // =============================================================
                    { blockType: Scratch.BlockType.LABEL, text: "Эмбеды" },
                    {
                        opcode: "embedClear",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "очистить эмбед",
                    },
                    {
                        opcode: "embedTitle",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "заголовок эмбеда [TEXT]",
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Заголовок",
                            },
                        },
                    },
                    {
                        opcode: "embedDesc",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "описание эмбеда [TEXT]",
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Текст плашки",
                            },
                        },
                    },
                    {
                        opcode: "embedColor",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "цвет эмбеда [COLOR]",
                        arguments: {
                            COLOR: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "COLOR_MENU",
                            },
                        },
                    },
                    {
                        opcode: "embedImage",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "картинка эмбеда [URL]",
                        arguments: {
                            URL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "https://.../image.png",
                            },
                        },
                    },
                    {
                        opcode: "embedThumb",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "миниатюра эмбеда [URL]",
                        arguments: {
                            URL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "https://.../mini.png",
                            },
                        },
                    },
                    {
                        opcode: "embedAuthor",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "автор эмбеда [NAME] ссылка [URL]",
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Мой бот",
                            },
                            URL: { type: Scratch.ArgumentType.STRING, defaultValue: "" },
                        },
                    },
                    {
                        opcode: "embedFooter",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "подвал эмбеда [TEXT]",
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "подвал",
                            },
                        },
                    },
                    {
                        opcode: "embedField",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "поле эмбеда [NAME] значение [VALUE] в строку [INLINE]",
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Поле",
                            },
                            VALUE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Значение",
                            },
                            INLINE: { type: Scratch.ArgumentType.STRING, menu: "BOOL_MENU" },
                        },
                    },
                    {
                        opcode: "embedTime",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "показывать время в эмбеде [ON]",
                        arguments: {
                            ON: { type: Scratch.ArgumentType.STRING, menu: "BOOL_MENU" },
                        },
                    },

                    // =============================================================
                    //  Кнопки и выпадающие списки
                    // =============================================================
                    { blockType: Scratch.BlockType.LABEL, text: "Кнопки и списки" },
                    {
                        opcode: "clearArray",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "очистить массив [ARRAY]",
                        arguments: {
                            ARRAY: { type: Scratch.ArgumentType.STRING, menu: "ARRAY_MENU" },
                        },
                    },
                    {
                        opcode: "addButton",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "добавить кнопку [TEXT] типа [TYPE] с данными [DATA] стиля [STYLE] в массив кнопок",
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Нажми",
                            },
                            TYPE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "BTN_TYPE_MENU",
                            },
                            DATA: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "knopka1",
                            },
                            STYLE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "BTN_STYLE_MENU",
                            },
                        },
                    },
                    {
                        opcode: "addRowSeparator",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "перенести следующие кнопки на новый ряд",
                    },
                    {
                        opcode: "setButtonsPerRow",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "располагать кнопки по [N] в ряд",
                        arguments: {
                            N: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                        },
                    },
                    {
                        opcode: "addSelect",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "добавить список [ID] с подсказкой [TEXT] варианты [OPTIONS] в массив кнопок",
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "vybor",
                            },
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Выбери вариант",
                            },
                            OPTIONS: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "первый|второй|третий",
                            },
                        },
                    },
                    {
                        opcode: "getArray",
                        blockType: Scratch.BlockType.ARRAY,
                        text: "массив [ARRAY]",
                        arguments: {
                            ARRAY: { type: Scratch.ArgumentType.STRING, menu: "ARRAY_MENU" },
                        },
                    },
                    {
                        opcode: "answerInteraction",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "ответить на нажатие [TEXT] только автору [HIDDEN]",
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Готово!",
                            },
                            HIDDEN: { type: Scratch.ArgumentType.STRING, menu: "BOOL_MENU" },
                        },
                    },
                    {
                        opcode: "answerInteractionMessage",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "ответить на нажатие сообщением [TEXT] с кнопками [BUTTONS]",
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Вот меню",
                            },
                            BUTTONS: { type: Scratch.ArgumentType.ARRAY },
                        },
                    },
                    {
                        opcode: "answerUpdate",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "заменить сообщение с кнопкой на [TEXT] с кнопками [BUTTONS]",
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Обновлено",
                            },
                            BUTTONS: { type: Scratch.ArgumentType.ARRAY },
                        },
                    },
                    {
                        opcode: "deferInteraction",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "отложить ответ на нажатие (бот думает) [HIDDEN]",
                        arguments: {
                            HIDDEN: { type: Scratch.ArgumentType.STRING, menu: "BOOL_MENU" },
                        },
                    },
                    {
                        opcode: "editInteractionReply",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "изменить ответ на нажатие на [TEXT]",
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Готово!",
                            },
                        },
                    },
                    {
                        opcode: "lastButtonData",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "данные последнего нажатия",
                    },
                    {
                        opcode: "lastSelectValue",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "выбор в последнем списке",
                    },

                    // =============================================================
                    //  Слэш-команды
                    // =============================================================
                    { blockType: Scratch.BlockType.LABEL, text: "Слэш-команды" },
                    {
                        opcode: "registerCommand",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "зарегистрировать команду [NAME] с описанием [DESC]",
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "привет",
                            },
                            DESC: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Поздороваться",
                            },
                        },
                    },
                    {
                        opcode: "registerGuildCommand",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "зарегистрировать команду [NAME] с описанием [DESC] на сервере [GUILD]",
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "привет",
                            },
                            DESC: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Поздороваться",
                            },
                            GUILD: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },
                    {
                        opcode: "deleteCommand",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "удалить команду [ID]",
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },
                    {
                        opcode: "deleteGuildCommand",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "удалить команду [ID] на сервере [GUILD]",
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            GUILD: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },
                    {
                        opcode: "listCommands",
                        blockType: Scratch.BlockType.ARRAY,
                        text: "список команд",
                    },
                    {
                        opcode: "findCommandId",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "id команды [NAME]",
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "привет",
                            },
                        },
                    },

                    // =============================================================
                    //  События
                    // =============================================================
                    { blockType: Scratch.BlockType.LABEL, text: "События" },
                    {
                        opcode: "whenReady",
                        blockType: Scratch.BlockType.HAT,
                        text: "когда бот подключился",
                    },
                    {
                        opcode: "whenMessage",
                        blockType: Scratch.BlockType.HAT,
                        text: "когда пришло новое сообщение",
                    },
                    {
                        opcode: "whenCommand",
                        blockType: Scratch.BlockType.HAT,
                        text: "когда пришла команда [PREFIX]",
                        arguments: {
                            PREFIX: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "!привет",
                            },
                        },
                    },
                    {
                        opcode: "whenButton",
                        blockType: Scratch.BlockType.HAT,
                        text: "когда нажата кнопка с данными [DATA]",
                        arguments: {
                            DATA: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "knopka1",
                            },
                        },
                    },
                    {
                        opcode: "whenSelect",
                        blockType: Scratch.BlockType.HAT,
                        text: "когда выбрано в списке [ID]",
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "vybor",
                            },
                        },
                    },
                    {
                        opcode: "whenSlash",
                        blockType: Scratch.BlockType.HAT,
                        text: "когда выполнена команда [NAME]",
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "привет",
                            },
                        },
                    },
                    {
                        opcode: "whenMemberAdd",
                        blockType: Scratch.BlockType.HAT,
                        text: "когда участник присоединился",
                    },
                    {
                        opcode: "whenMemberRemove",
                        blockType: Scratch.BlockType.HAT,
                        text: "когда участник вышел",
                    },
                    {
                        opcode: "whenReaction",
                        blockType: Scratch.BlockType.HAT,
                        text: "когда добавили реакцию",
                    },
                    {
                        opcode: "clearEvents",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "очистить события",
                    },
                    {
                        opcode: "lastReactionEmoji",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "эмодзи последней реакции",
                    },
                    {
                        opcode: "lastReactionChannel",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "id канала последней реакции",
                    },
                    {
                        opcode: "lastReactionMessage",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "id сообщения последней реакции",
                    },

                    // =============================================================
                    //  Участники и роли
                    // =============================================================
                    { blockType: Scratch.BlockType.LABEL, text: "Участники и роли" },
                    {
                        opcode: "lastMemberId",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "id последнего участника",
                    },
                    {
                        opcode: "lastMemberName",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "имя последнего участника",
                    },
                    {
                        opcode: "lastMemberGuild",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "id сервера последнего участника",
                    },
                    {
                        opcode: "memberRoles",
                        blockType: Scratch.BlockType.ARRAY,
                        text: "роли участника [USER] на сервере [GUILD]",
                        arguments: {
                            USER: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            GUILD: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },
                    {
                        opcode: "memberJoined",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "дата прихода участника [USER] на сервер [GUILD]",
                        arguments: {
                            USER: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            GUILD: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },
                    {
                        opcode: "addRole",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "выдать роль [ROLE] участнику [USER] на сервере [GUILD]",
                        arguments: {
                            ROLE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            USER: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            GUILD: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },
                    {
                        opcode: "removeRole",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "снять роль [ROLE] с участника [USER] на сервере [GUILD]",
                        arguments: {
                            ROLE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            USER: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            GUILD: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },
                    {
                        opcode: "roleList",
                        blockType: Scratch.BlockType.ARRAY,
                        text: "список ролей сервера [GUILD]",
                        arguments: {
                            GUILD: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },
                    {
                        opcode: "setNick",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "установить ник [NAME] участнику [USER] на сервере [GUILD]",
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Новый ник",
                            },
                            USER: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            GUILD: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },
                    {
                        opcode: "memberList",
                        blockType: Scratch.BlockType.ARRAY,
                        text: "список участников сервера [GUILD] лимит [N]",
                        arguments: {
                            GUILD: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            N: { type: Scratch.ArgumentType.NUMBER, defaultValue: 50 },
                        },
                    },

                    // =============================================================
                    //  Модерация
                    // =============================================================
                    { blockType: Scratch.BlockType.LABEL, text: "Модерация" },
                    {
                        opcode: "banUser",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "забанить [USER] на сервере [GUILD] причина [REASON]",
                        arguments: {
                            USER: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            GUILD: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            REASON: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "нарушение",
                            },
                        },
                    },
                    {
                        opcode: "unbanUser",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "разбанить [USER] на сервере [GUILD]",
                        arguments: {
                            USER: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            GUILD: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },
                    {
                        opcode: "kickUser",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "кикнуть [USER] с сервера [GUILD] причина [REASON]",
                        arguments: {
                            USER: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            GUILD: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            REASON: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "нарушение",
                            },
                        },
                    },
                    {
                        opcode: "timeoutUser",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "тайм-аут [USER] на [MIN] минут на сервере [GUILD]",
                        arguments: {
                            USER: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            MIN: { type: Scratch.ArgumentType.NUMBER, defaultValue: 10 },
                            GUILD: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },
                    {
                        opcode: "untimeoutUser",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "снять тайм-аут с [USER] на сервере [GUILD]",
                        arguments: {
                            USER: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            GUILD: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },
                    {
                        opcode: "isBanned",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "забанен [USER] на сервере [GUILD]",
                        arguments: {
                            USER: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            GUILD: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },
                    {
                        opcode: "banList",
                        blockType: Scratch.BlockType.ARRAY,
                        text: "список банов сервера [GUILD]",
                        arguments: {
                            GUILD: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },

                    // =============================================================
                    //  Каналы
                    // =============================================================
                    { blockType: Scratch.BlockType.LABEL, text: "Каналы" },
                    {
                        opcode: "channelName",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "название канала [CHANNEL]",
                        arguments: {
                            CHANNEL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },
                    {
                        opcode: "createChannel",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "создать канал [NAME] типа [TYPE] на сервере [GUILD]",
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "новый-канал",
                            },
                            TYPE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "CHANNEL_TYPE_MENU",
                            },
                            GUILD: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },
                    {
                        opcode: "deleteChannel",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "удалить канал [CHANNEL]",
                        arguments: {
                            CHANNEL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },
                    {
                        opcode: "renameChannel",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "переименовать канал [CHANNEL] в [NAME]",
                        arguments: {
                            CHANNEL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "новое-имя",
                            },
                        },
                    },
                    {
                        opcode: "setTopic",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "описание канала [CHANNEL]: [TEXT]",
                        arguments: {
                            CHANNEL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Тема канала",
                            },
                        },
                    },
                    {
                        opcode: "createThread",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "создать ветку [NAME] у сообщения [ID] в канале [CHANNEL]",
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "обсуждение",
                            },
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            CHANNEL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },
                    {
                        opcode: "createPrivateThread",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "создать приватную ветку [NAME] у сообщения [ID] в канале [CHANNEL]",
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "приватное",
                            },
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                            CHANNEL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789012345678",
                            },
                        },
                    },

                    {
                        opcode: "whenTimer",
                        blockType: Scratch.BlockType.HAT,
                        text: "когда сработал таймер [NAME]",
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "таймер1",
                            },
                        },
                    },
                    // =============================================================
                    //  НЕ В TELEGRAM: локальная база данных
                    // =============================================================
                    { blockType: Scratch.BlockType.LABEL, text: "⭐ База данных (нет в Telegram)" },
                    {
                        opcode: "dbSet",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "БД: записать ключ [KEY] значение [VALUE]",
                        arguments: {
                            KEY: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "ключ",
                            },
                            VALUE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "значение",
                            },
                        },
                    },
                    {
                        opcode: "dbGet",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "БД: значение ключа [KEY]",
                        arguments: {
                            KEY: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "ключ",
                            },
                        },
                    },
                    {
                        opcode: "dbDelete",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "БД: удалить ключ [KEY]",
                        arguments: {
                            KEY: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "ключ",
                            },
                        },
                    },
                    {
                        opcode: "dbHas",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "БД: есть ключ [KEY]?",
                        arguments: {
                            KEY: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "ключ",
                            },
                        },
                    },
                    {
                        opcode: "dbKeys",
                        blockType: Scratch.BlockType.ARRAY,
                        text: "БД: все ключи",
                    },
                    {
                        opcode: "dbSize",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "БД: количество записей",
                    },
                    {
                        opcode: "dbClear",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "БД: очистить всё",
                    },
                    {
                        opcode: "dbSetUser",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "БД: для пользователя [USERID] записать ключ [KEY] значение [VALUE]",
                        arguments: {
                            USERID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                            KEY: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "баланс",
                            },
                            VALUE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "0",
                            },
                        },
                    },
                    {
                        opcode: "dbGetUser",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "БД: значение ключа [KEY] у пользователя [USERID]",
                        arguments: {
                            KEY: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "баланс",
                            },
                            USERID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                        },
                    },
                    {
                        opcode: "dbAddUser",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "БД: прибавить [DELTA] к ключу [KEY] пользователя [USERID]",
                        arguments: {
                            DELTA: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
                            KEY: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "баланс",
                            },
                            USERID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                        },
                    },
                    {
                        opcode: "dbExport",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "БД: выгрузить в JSON",
                    },
                    {
                        opcode: "dbImport",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "БД: загрузить из JSON [JSON]",
                        arguments: {
                            JSON: { type: Scratch.ArgumentType.STRING, defaultValue: "{}" },
                        },
                    },
                    {
                        opcode: "dbSave",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "БД: сохранить в браузер",
                    },
                    {
                        opcode: "dbLoad",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "БД: загрузить из браузера",
                    },

                    // =============================================================
                    //  НЕ В TELEGRAM: таймеры и отложенные сообщения
                    // =============================================================
                    {
                        blockType: Scratch.BlockType.LABEL,
                        text: "⭐ Таймеры и отложенные сообщения",
                    },
                    {
                        opcode: "sendLater",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "отправить [TEXT] в канал [CHANNEL] через [SECONDS] секунд",
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Привет через минуту!",
                            },
                            CHANNEL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                            SECONDS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 10 },
                        },
                    },
                    {
                        opcode: "deleteLater",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "удалить сообщение [ID] из канала [CHANNEL] через [SECONDS] секунд",
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 1,
                            },
                            CHANNEL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                            SECONDS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 60 },
                        },
                    },
                    {
                        opcode: "startTimer",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "запустить таймер [NAME] каждые [SECONDS] секунд",
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "таймер1",
                            },
                            SECONDS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 60 },
                        },
                    },
                    {
                        opcode: "stopTimer",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "остановить таймер [NAME]",
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "таймер1",
                            },
                        },
                    },
                    {
                        opcode: "stopAllTimers",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "остановить все таймеры",
                    },
                    {
                        opcode: "isTimerRunning",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "таймер [NAME] запущен?",
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "таймер1",
                            },
                        },
                    },

                    // =============================================================
                    //  НЕ В TELEGRAM: антифлуд и кулдауны
                    // =============================================================
                    { blockType: Scratch.BlockType.LABEL, text: "⭐ Антифлуд и кулдауны" },
                    {
                        opcode: "antifloodAllow",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "антифлуд: пропустить чат [CHATID] не чаще [COUNT] раз в [SECONDS] сек?",
                        arguments: {
                            CHATID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                            COUNT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 3 },
                            SECONDS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 10 },
                        },
                    },
                    {
                        opcode: "cooldownReady",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "с события [NAME] прошло [SECONDS] сек?",
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "бонус",
                            },
                            SECONDS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 60 },
                        },
                    },
                    {
                        opcode: "cooldownTouch",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "запомнить момент события [NAME]",
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "бонус",
                            },
                        },
                    },
                    {
                        opcode: "cooldownReset",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "сбросить момент события [NAME]",
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "бонус",
                            },
                        },
                    },
                    {
                        opcode: "cooldownSeconds",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "секунд с события [NAME]",
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "бонус",
                            },
                        },
                    },
                    {
                        opcode: "badWordsAdd",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "добавить запрещённое слово [WORD]",
                        arguments: {
                            WORD: { type: Scratch.ArgumentType.STRING, defaultValue: "спам" },
                        },
                    },
                    {
                        opcode: "badWordsClear",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "очистить список запрещённых слов",
                    },
                    {
                        opcode: "hasBadWords",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "в тексте [TEXT] есть запрещённые слова?",
                        arguments: {
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "" },
                        },
                    },
                    {
                        opcode: "censorText",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "заменить запрещённые слова в [TEXT] на [REPL]",
                        arguments: {
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "" },
                            REPL: { type: Scratch.ArgumentType.STRING, defaultValue: "***" },
                        },
                    },

                    // =============================================================
                    //  НЕ В TELEGRAM: команды и аргументы
                    // =============================================================
                    { blockType: Scratch.BlockType.LABEL, text: "⭐ Команды и аргументы" },
                    {
                        opcode: "cmdText",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "команда последнего сообщения",
                    },
                    {
                        opcode: "cmdIs",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "команда равна [TEXT]?",
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "/start",
                            },
                        },
                    },
                    {
                        opcode: "cmdArg",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "аргумент [N] команды",
                        arguments: {
                            N: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
                        },
                    },
                    {
                        opcode: "cmdArgsCount",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "количество аргументов команды",
                    },
                    {
                        opcode: "cmdArgsAll",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "все аргументы команды через пробел",
                    },
                                                            // =============================================================
                    //  НЕ В TELEGRAM: русский язык
                    // =============================================================
                    { blockType: Scratch.BlockType.LABEL, text: "⭐ Русский язык" },
                    {
                        opcode: "plural",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "склонение для [COUNT]: один [ONE] несколько [FEW] много [MANY]",
                        arguments: {
                            COUNT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
                            ONE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "сообщение",
                            },
                            FEW: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "сообщения",
                            },
                            MANY: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "сообщений",
                            },
                        },
                    },
                    {
                        opcode: "textCase",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "текст [TEXT] в виде: [CASE]",
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "привет мир",
                            },
                            CASE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "CASE_MENU",
                            },
                        },
                    },
                    {
                        opcode: "cutText",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "обрезать [TEXT] до [LENGTH] символов",
                        arguments: {
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "" },
                            LENGTH: { type: Scratch.ArgumentType.NUMBER, defaultValue: 20 },
                        },
                    },

                    // =============================================================
                    //  НЕ В TELEGRAM: генераторы
                    // =============================================================
                    { blockType: Scratch.BlockType.LABEL, text: "⭐ Генераторы" },
                    {
                        opcode: "randInt",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "случайное целое от [MIN] до [MAX]",
                        arguments: {
                            MIN: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
                            MAX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 10 },
                        },
                    },
                    {
                        opcode: "randFloat",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "случайное дробное от [MIN] до [MAX]",
                        arguments: {
                            MIN: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            MAX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
                        },
                    },
                    {
                        opcode: "chance",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "шанс [PERCENT]%",
                        arguments: {
                            PERCENT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 50 },
                        },
                    },
                    {
                        opcode: "randItem",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "случайный элемент из [ARRAY]",
                        arguments: { ARRAY: { type: Scratch.ArgumentType.ARRAY } },
                    },
                    {
                        opcode: "shuffleArray",
                        blockType: Scratch.BlockType.ARRAY,
                        text: "перемешанный [ARRAY]",
                        arguments: { ARRAY: { type: Scratch.ArgumentType.ARRAY } },
                    },
                    {
                        opcode: "reverseArray",
                        blockType: Scratch.BlockType.ARRAY,
                        text: "перевёрнутый [ARRAY]",
                        arguments: { ARRAY: { type: Scratch.ArgumentType.ARRAY } },
                    },
                    {
                        opcode: "uuid",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "случайный UUID",
                    },
                    {
                        opcode: "randString",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "случайная строка длиной [LENGTH] вида [TYPE]",
                        arguments: {
                            LENGTH: { type: Scratch.ArgumentType.NUMBER, defaultValue: 10 },
                            TYPE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "RANDSTR_MENU",
                            },
                        },
                    },

                    // =============================================================
                    //  НЕ В TELEGRAM: текст, регулярные выражения, JSON, хеши
                    // =============================================================
                    { blockType: Scratch.BlockType.LABEL, text: "⭐ Текст, JSON, шифры" },
                    {
                        opcode: "regexFind",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "в [TEXT] найти по шаблону [PATTERN]",
                        arguments: {
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "Привет, мир 42" },
                            PATTERN: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "\\d+",
                            },
                        },
                    },
                    {
                        opcode: "regexAll",
                        blockType: Scratch.BlockType.ARRAY,
                        text: "в [TEXT] все совпадения шаблона [PATTERN]",
                        arguments: {
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "a1 b2 c3" },
                            PATTERN: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "\\d+",
                            },
                        },
                    },
                    {
                        opcode: "regexReplace",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "в [TEXT] заменить шаблон [PATTERN] на [REPL]",
                        arguments: {
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "a1 b2" },
                            PATTERN: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "\\d+",
                            },
                            REPL: { type: Scratch.ArgumentType.STRING, defaultValue: "#" },
                        },
                    },
                    {
                        opcode: "regexTest",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "[TEXT] подходит под шаблон [PATTERN]?",
                        arguments: {
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "79161234567" },
                            PATTERN: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "^\\d{11}$",
                            },
                        },
                    },
                    {
                        opcode: "jsonGet",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "JSON [JSON] взять по пути [PATH]",
                        arguments: {
                            JSON: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: '{"a":{"b":5}}',
                            },
                            PATH: { type: Scratch.ArgumentType.STRING, defaultValue: "a.b" },
                        },
                    },
                    {
                        opcode: "jsonSet",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "JSON [JSON] записать по пути [PATH] значение [VALUE]",
                        arguments: {
                            JSON: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: '{"a":{"b":5}}',
                            },
                            PATH: { type: Scratch.ArgumentType.STRING, defaultValue: "a.b" },
                            VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: "10" },
                        },
                    },
                    {
                        opcode: "b64encode",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "закодировать в base64 [TEXT]",
                        arguments: {
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "Привет" },
                        },
                    },
                    {
                        opcode: "b64decode",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "раскодировать из base64 [TEXT]",
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "0J/RgNC40LLQtdGC",
                            },
                        },
                    },
                    {
                        opcode: "urlEncode",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "закодировать в URL-вид [TEXT]",
                        arguments: {
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "привет мир" },
                        },
                    },
                    {
                        opcode: "urlDecode",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "раскодировать из URL-вида [TEXT]",
                        arguments: {
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "" },
                        },
                    },
                    {
                        opcode: "hashText",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "хеш [ALGO] от [TEXT]",
                        arguments: {
                            ALGO: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "HASH_MENU",
                            },
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "Привет" },
                        },
                    },
                    {
                        opcode: "escapeText",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "экранировать [TEXT] для [MODE]",
                        arguments: {
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "a_b*c" },
                            MODE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "ESCAPE_MENU",
                            },
                        },
                    },

                    // =============================================================
                    //  НЕ В TELEGRAM: дата и время
                    // =============================================================
                    { blockType: Scratch.BlockType.LABEL, text: "⭐ Дата и время" },
                    {
                        opcode: "nowTime",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "сейчас: [FORMAT]",
                        arguments: {
                            FORMAT: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "TIME_MENU",
                            },
                        },
                    },
                    {
                        opcode: "formatUnix",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "unix [TIMESTAMP] как [FORMAT]",
                        arguments: {
                            TIMESTAMP: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0,
                            },
                            FORMAT: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "TIME_MENU",
                            },
                        },
                    },
                    {
                        opcode: "timeAgo",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "прошло с unix [TIMESTAMP]",
                        arguments: {
                            TIMESTAMP: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0,
                            },
                        },
                    },
                    {
                        opcode: "uptime",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "секунд с запуска проекта",
                    },

                    // =============================================================
                    //  НЕ В TELEGRAM: статистика и счётчики
                    // =============================================================
                    { blockType: Scratch.BlockType.LABEL, text: "⭐ Статистика и счётчики" },
                    {
                        opcode: "counterUp",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "счётчик [NAME] увеличить на [N]",
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "сообщения",
                            },
                            N: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
                        },
                    },
                    {
                        opcode: "counterGet",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "счётчик [NAME]",
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "сообщения",
                            },
                        },
                    },
                    {
                        opcode: "counterReset",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "счётчик [NAME] сбросить",
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "сообщения",
                            },
                        },
                    },
                    {
                        opcode: "counterNames",
                        blockType: Scratch.BlockType.ARRAY,
                        text: "все счётчики",
                    },
                    {
                        opcode: "statMessages",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "получено сообщений за сессию",
                    },
                    {
                        opcode: "statUsers",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "уникальных пользователей",
                    },
                    {
                        opcode: "resetStats",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "сбросить статистику",
                    },

                    // =============================================================
                    //  НЕ В TELEGRAM: интернет-сервисы
                    // =============================================================
                    { blockType: Scratch.BlockType.LABEL, text: "⭐ Интернет-сервисы" },
                    {
                        opcode: "weather",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "погода в [CITY]",
                        arguments: {
                            CITY: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Москва",
                            },
                        },
                    },
                    {
                        opcode: "weatherTemp",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "температура в [CITY]",
                        arguments: {
                            CITY: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Москва",
                            },
                        },
                    },
                    {
                        opcode: "currencyRate",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "курс [FROM] к [TO]",
                        arguments: {
                            FROM: { type: Scratch.ArgumentType.STRING, defaultValue: "USD" },
                            TO: { type: Scratch.ArgumentType.STRING, defaultValue: "RUB" },
                        },
                    },
                    {
                        opcode: "convertMoney",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "перевести [AMOUNT] из [FROM] в [TO]",
                        arguments: {
                            AMOUNT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
                            FROM: { type: Scratch.ArgumentType.STRING, defaultValue: "USD" },
                            TO: { type: Scratch.ArgumentType.STRING, defaultValue: "RUB" },
                        },
                    },
                    {
                        opcode: "cryptoPrice",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "цена [COIN] в [CURRENCY]",
                        arguments: {
                            COIN: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "bitcoin",
                            },
                            CURRENCY: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "rub",
                            },
                        },
                    },
                    {
                        opcode: "qrCodeUrl",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "QR-код для [TEXT]",
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "https://dashblocks.org",
                            },
                        },
                    },
                    {
                        opcode: "shortLink",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "сократить ссылку [URL]",
                        arguments: {
                            URL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "https://dashblocks.org",
                            },
                        },
                    },
                    {
                        opcode: "randomFact",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "случайный факт: [SOURCE]",
                        arguments: {
                            SOURCE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "FACT_MENU",
                            },
                        },
                    },
                    {
                        opcode: "translateText",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "перевести [TEXT] с [FROM] на [TO]",
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Hello",
                            },
                            FROM: { type: Scratch.ArgumentType.STRING, defaultValue: "en" },
                            TO: { type: Scratch.ArgumentType.STRING, defaultValue: "ru" },
                        },
                    },
                    {
                        opcode: "aiSetup",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "ИИ: ключ [KEY] модель [MODEL] адрес [URL]",
                        arguments: {
                            KEY: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "sk-...",
                            },
                            MODEL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "gpt-4o-mini",
                            },
                            URL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "https://api.openai.com/v1",
                            },
                        },
                    },
                    {
                        opcode: "aiRole",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "ИИ: роль [ROLE]",
                        arguments: {
                            ROLE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Ты — помощник. Отвечай кратко по-русски.",
                            },
                        },
                    },
                    {
                        opcode: "aiAsk",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "ИИ: запрос [PROMPT]",
                        arguments: {
                            PROMPT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Привет!",
                            },
                        },
                    },

                    // =============================================================
                    //  Отладка
                    // =============================================================
                    { blockType: Scratch.BlockType.LABEL, text: "Отладка" },
                    {
                        opcode: "logText",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "в лог: [TEXT]",
                        arguments: {
                            TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "событие" },
                        },
                    },
                    {
                        opcode: "getLog",
                        blockType: Scratch.BlockType.ARRAY,
                        text: "лог",
                    },
                    {
                        opcode: "clearLog",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "очистить лог",
                    },
                    {
                        opcode: "getLastError",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "последняя ошибка",
                    },


                ],
                menus: {
                    INTENTS_MENU: {
                        items: ["обычный", "минимум", "модерация", "максимум", "всё"],
                    },
                    BOOL_MENU: { items: ["да", "нет"] },
                    ARRAY_MENU: { items: ["кнопки"] },
                    BTN_TYPE_MENU: { items: ["данные", "ссылка", "новый ряд"] },
                    BTN_STYLE_MENU: { items: ["синий", "серый", "зелёный", "красный"] },
                    CHANNEL_TYPE_MENU: {
                        items: ["текстовый", "голосовой", "категория", "форум"],
                    },
                    COLOR_MENU: {
                        items: [
                            "синий",
                            "зелёный",
                            "красный",
                            "жёлтый",
                            "фиолетовый",
                            "оранжевый",
                            "розовый",
                            "серый",
                            "чёрный",
                            "белый",
                        ],
                    },
                    EMOJI_MENU: {
                        items: [
                            "👍", "👎", "❤", "🔥", "🎉", "😂", "😮", "😢",
                            "✅", "❌", "⭐", "💯", "🤔", "👀", "🙏", "💔",
                            "🎮", "🏆", "⚡", "☕", "🐱", "🐶", "🌈", "🚀",
                        ],
                    },

                    CASE_MENU: {
                        items: [
                            "верхний",
                            "нижний",
                            "первая заглавная",
                            "каждое слово с заглавной",
                            "перевёрнутый",
                            "без пробелов",
                            "транслит",
                        ],
                    },
                    ESCAPE_MENU: { items: ["HTML", "MarkdownV2", "Markdown"] },
                    FACT_MENU: { items: ["любой", "на русском", "из интернета"] },
                    TIME_MENU: {
                        items: [
                            "время",
                            "дата",
                            "дата и время",
                            "день недели",
                            "unix",
                            "час",
                            "минута",
                            "секунда",
                            "месяц",
                            "год",
                        ],
                    },
                    FACT_MENU: { items: ["любой", "на русском", "из интернета"] },
                    TIME_MENU: {
                        items: [
                            "время",
                            "дата",
                            "дата и время",
                            "день недели",
                            "unix",
                            "час",
                            "минута",
                            "секунда",
                            "месяц",
                            "год",
                        ],
                    },
                    HASH_MENU: { items: ["MD5", "SHA-1", "SHA-256", "SHA-512"] },
                    ESCAPE_MENU: { items: ["HTML", "MarkdownV2", "Markdown"] },
                    FACT_MENU: { items: ["любой", "на русском", "из интернета"] },
                    TIME_MENU: {
                        items: [
                            "время",
                            "дата",
                            "дата и время",
                            "день недели",
                            "unix",
                            "час",
                            "минута",
                            "секунда",
                            "месяц",
                            "год",
                        ],
                    },
                    RANDSTR_MENU: {
                        items: ["цифры", "буквы", "буквы и цифры", "пароль", "эмодзи"],
                    },
                    TIME_MENU: {
                        items: [
                            "время",
                            "дата",
                            "дата и время",
                            "день недели",
                            "unix",
                            "час",
                            "минута",
                            "секунда",
                            "месяц",
                            "год",
                        ],
                    },


                },
            };
        }

        // =================================================================
        //                    ВСПОМОГАТЕЛЬНОЕ
        // =================================================================

        _intents(v) {
            const key = String(v === undefined || v === null ? "" : v)
                .trim()
                .toLowerCase();
            if (INTENTS[key] !== undefined) return INTENTS[key];
            const num = Number(v);
            return isNaN(num) ? INTENTS["обычный"] : Math.floor(num);
        }

        _bool(v) {
            const s = String(v === undefined || v === null ? "" : v)
                .trim()
                .toLowerCase();
            return s === "да" || s === "true" || s === "1" || s === "истина" || s === "yes";
        }

        _sleep(ms) {
            return new Promise((r) => setTimeout(r, ms));
        }

        // Универсальный запрос к Discord API с обработкой лимитов (429)
        async _rest(method, path, body, opts) {
            if (!this.token) {
                this.lastError = "Бот не инициализирован: нет токена";
                return null;
            }
            const url = API + path;
            const tries = (opts && opts.tries) || 3;
            for (let attempt = 0; attempt < tries; attempt++) {
                let timer = null;
                try {
                    const controller =
                        typeof AbortController !== "undefined" ? new AbortController() : null;
                    timer = controller
                        ? setTimeout(() => controller.abort(), (opts && opts.timeout) || 20000)
                        : null;
                    const init = {
                        method: method,
                        headers: { Authorization: "Bot " + this.token },
                        signal: controller ? controller.signal : undefined,
                    };
                    if ((opts && opts.reason) && /^[\x20-\x7E]*$/.test(opts.reason))
                        init.headers["X-Audit-Log-Reason"] = opts.reason;
                    if (!(opts && opts.formData)) {
                        if (body !== undefined && body !== null) {
                            init.headers["Content-Type"] = "application/json";
                            init.body = JSON.stringify(body);
                        }
                    } else {
                        init.body = body;
                    }
                    const res = await fetch(url, init);
                    if (timer) clearTimeout(timer);
                    const left = res.headers ? res.headers.get("x-ratelimit-remaining") : null;
                    if (left !== null) this.rateRemaining = left;
                    if (res.status === 429) {
                        let wait = 1;
                        try {
                            const j = await res.json();
                            wait = Number(j.retry_after) || 1;
                        } catch (e) {
                            /* пусто */
                        }
                        this._log("Лимит Discord (429), жду " + wait + " с");
                        await this._sleep(Math.min(wait * 1000, 20000) + 150);
                        continue;
                    }
                    if (res.status === 204) return true;
                    const text = await res.text();
                    let data = null;
                    try {
                        data = text ? JSON.parse(text) : true;
                    } catch (e) {
                        data = text;
                    }
                    if (!res.ok) {
                        this.lastError =
                            data && data.message
                                ? data.message + (data.code ? " (код " + data.code + ")" : "")
                                : "HTTP " + res.status;
                        this._log("Ошибка " + method + " " + path + ": " + this.lastError);
                        return null;
                    }
                    return data === null ? true : data;
                } catch (e) {
                    if (timer) clearTimeout(timer);
                    this.lastError = String(e && e.message ? e.message : e);
                    this._log("Сбой " + method + " " + path + ": " + this.lastError);
                    await this._sleep(800);
                }
            }
            return null;
        }

        async _appId() {
            if (this.applicationId) return this.applicationId;
            const app = await this._rest("GET", "/oauth2/applications/@me");
            if (app && app.id) {
                this.applicationId = app.id;
                return app.id;
            }
            this.lastError = "Не получил id приложения. Подключись к шлюзу или проверь токен.";
            return null;
        }

        // =================================================================
        //                       ИНИЦИАЛИЗАЦИЯ
        // =================================================================

        async initBot(args) {
            this.token = this._str(args.TOKEN).trim();
            if (!this.token) {
                this.lastError = "Пустой токен";
                return;
            }
            const me = await this._rest("GET", "/users/@me");
            if (me && me.id) {
                this.botUser = { id: me.id, username: me.username, discriminator: me.discriminator };
                this._log("Бот " + me.username + " (id " + me.id + ") инициализирован");
            } else {
                this._log("Токен задан, но Discord его не принял: " + this.lastError);
            }
        }

        resetBot() {
            this.disconnect();
            this.token = "";
            this.botUser = null;
            this.applicationId = "";
            this.guilds = new NormalArray();
            this.lastMessage = null;
            this.lastInteraction = null;
            this.lastMember = null;
            this.lastReaction = null;
            this.events = {
                ready: false,
                message: false,
                command: null,
                button: null,
                select: null,
                slash: null,
                memberAdd: false,
                memberRemove: false,
                reaction: false,
                timer: null,
            };
            this.lastError = "";
            this._log("Бот сброшен");
        }

        connect(args) {
            if (args && args.INTENTS !== undefined) this.intents = this._intents(args.INTENTS);
            if (!this.token) {
                this.lastError = "Сначала выполни «инициализировать бота с токеном»";
                this._log(this.lastError);
                return;
            }
            if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) {
                this._log("Уже подключены");
                return;
            }
            this.autoReconnect = true;
            this._openSocket();
        }

        _openSocket() {
            this._log("Подключаюсь к шлюзу Discord…");
            try {
                this.ws = new WebSocket(GATEWAY);
            } catch (e) {
                this.lastError = "Не удалось создать WebSocket: " + (e && e.message ? e.message : e);
                this._log(this.lastError);
                return;
            }
            const ws = this.ws;
            ws.onopen = () => this._log("Соединение с шлюзом открыто");
            ws.onmessage = (ev) => {
                try {
                    this._onGateway(JSON.parse(ev.data));
                } catch (e) {
                    /* игнорируем битый кадр */
                }
            };
            ws.onerror = () => {
                this.lastError = "Ошибка соединения с шлюзом";
            };
            ws.onclose = (ev) => {
                this.connected = false;
                if (this.hbTimer) clearInterval(this.hbTimer);
                this.hbTimer = null;
                this._log("Шлюз закрыт (код " + (ev && ev.code) + ")");
                if (this.autoReconnect && this.token) {
                    this._log("Переподключаюсь через 5 секунд…");
                    setTimeout(() => {
                        if (this.autoReconnect && this.token) this._openSocket();
                    }, 5000);
                }
            };
        }

        disconnect() {
            this.autoReconnect = false;
            if (this.hbTimer) clearInterval(this.hbTimer);
            this.hbTimer = null;
            if (this.ws) {
                try {
                    this.ws.onclose = null;
                    this.ws.close(1000);
                } catch (e) {
                    /* уже закрыт */
                }
                this.ws = null;
            }
            this.connected = false;
            this._log("Отключились от шлюза");
        }

        isConnected() {
            return !!this.connected && !!this.ws && this.ws.readyState === 1;
        }

        // =================================================================
        //                       ШЛЮЗ (WEBSOCKET)
        // =================================================================

        _send(op, d) {
            try {
                if (this.ws && this.ws.readyState === 1)
                    this.ws.send(JSON.stringify({ op: op, d: d }));
            } catch (e) {
                /* сокет умер — переподключение по onclose */
            }
        }

        _startHeartbeat(ms) {
            if (this.hbTimer) clearInterval(this.hbTimer);
            this.heartbeatMs = ms || 41250;
            const beat = () => this._send(1, this.seq);
            beat();
            this.hbTimer = setInterval(beat, this.heartbeatMs);
        }

        _onGateway(pkt) {
            const op = pkt.op;
            const t = pkt.t;
            const d = pkt.d;

            if (op === 10) {
                // HELLO
                this._startHeartbeat(d && d.heartbeat_interval);
                if (this.sessionId) this._send(6, {
                    token: this.token,
                    session_id: this.sessionId,
                    seq: this.seq,
                });
                else
                    this._send(2, {
                        token: this.token,
                        intents: this.intents,
                        properties: { os: "Android", browser: "dashblocks", device: "dashblocks" },
                        compress: false,
                        large_threshold: 100,
                    });
                return;
            }
            if (op === 1) {
                this._send(1, this.seq);
                return;
            }
            if (op === 7) {
                this._log("Discord просит переподключиться");
                try {
                    this.ws.close(4000);
                } catch (e) {
                    /* пусто */
                }
                return;
            }
            if (op === 9) {
                this._log("Сессия недействительна — идентифицируюсь заново");
                this.sessionId = null;
                this.seq = null;
                setTimeout(() => this._send(2, {
                    token: this.token,
                    intents: this.intents,
                    properties: { os: "Android", browser: "dashblocks", device: "dashblocks" },
                    compress: false,
                    large_threshold: 100,
                }), 1500);
                return;
            }
            if (op === 11) return; // heartbeat ACK

            if (op !== 0) return;
            if (d && d.s !== undefined && d.s !== null) this.seq = d.s;

            switch (t) {
                case "READY":
                    this.sessionId = d.session_id;
                    this.resumeUrl = d.resume_gateway_url || GATEWAY;
                    this.botUser = d.user;
                    if (d.application && d.application.id) this.applicationId = d.application.id;
                    this.guilds = new NormalArray();
                    (d.guilds || []).forEach((g) =>
                        this.guilds.push({
                            id: g.id,
                            name: g.name || g.id,
                            member_count: g.member_count || 0,
                        })
                    );
                    this.connected = true;
                    this.events.ready = true;
                    this._log("Бот на связи: " + (d.user ? d.user.username : "?") +
                        ", серверов: " + this.guilds.length);
                    break;

                case "RESUMED":
                    this.connected = true;
                    this._log("Сессия восстановлена");
                    break;

                case "MESSAGE_CREATE":
                    this._onMessage(d);
                    break;

                case "INTERACTION_CREATE":
                    this._onInteraction(d);
                    break;

                case "GUILD_MEMBER_ADD":
                    this.lastMember = {
                        id: d.user ? d.user.id : "",
                        name: d.user ? d.user.username : "",
                        guild_id: d.guild_id,
                        kind: "add",
                    };
                    this.events.memberAdd = true;
                    break;

                case "GUILD_MEMBER_REMOVE":
                    this.lastMember = {
                        id: d.user ? d.user.id : "",
                        name: d.user ? d.user.username : "",
                        guild_id: d.guild_id,
                        kind: "remove",
                    };
                    this.events.memberRemove = true;
                    break;

                case "MESSAGE_REACTION_ADD":
                    this.lastReaction = {
                        emoji: d.emoji ? d.emoji.name : "",
                        user_id: d.user_id,
                        message_id: d.message_id,
                        channel_id: d.channel_id,
                        guild_id: d.guild_id,
                    };
                    this.events.reaction = true;
                    break;

                case "GUILD_CREATE":
                    for (let i = 0; i < this.guilds.length; i++)
                        if (this.guilds[i].id === d.id) {
                            this.guilds[i] = {
                                id: d.id,
                                name: d.name,
                                member_count: d.approximate_member_count || d.member_count || 0,
                            };
                            return;
                        }
                    this.guilds.push({
                        id: d.id,
                        name: d.name,
                        member_count: d.approximate_member_count || d.member_count || 0,
                    });
                    break;
            }
        }

        _pushUser(user) {
            if (!user) return;
            if (!this.allUsers.includes(user.id)) this.allUsers.push(user.id);
        }

        _onMessage(d) {
            if (!d) return;
            if (!this.seeSelf && this.botUser && d.author && d.author.id === this.botUser.id) return;
            if (!this.seeSelf && d.author && d.author.bot) return;
            this.lastMessage = d;
            this.stats.messages++;
            this._pushUser(d.author);
            this.events.message = true;
            const parts = (d.content || "").trim().split(/\s+/).filter((s) => s.length);
            this.events.command = parts.length ? parts[0] : null;
        }

        _onInteraction(d) {
            this.lastInteraction = d;
            const data = d.data || {};
            if (d.type === 2) {
                // слэш-команда
                this.events.slash = data.name || "";
                return;
            }
            if (data.component_type === 2) {
                this.events.button = data.custom_id || "";
                return;
            }
            if (data.component_type === 3) {
                const values = data.values || [];
                this.events.select = { id: data.custom_id || "", value: values[0] || "" };
                return;
            }
        }

        // =================================================================
        //                     БОТ И СЕРВЕРЫ
        // =================================================================

        botId() {
            return this.botUser ? this.botUser.id : "";
        }

        botName() {
            return this.botUser ? this.botUser.username || "" : "";
        }

        async appId() {
            return (await this._appId()) || "";
        }

        guildCount() {
            return this.guilds.length;
        }

        guildList() {
            const out = new NormalArray();
            this.guilds.forEach((g) => out.push(g.id + ": " + g.name));
            return out;
        }

        async guildName(args) {
            const id = this._str(args.GUILD).trim();
            const cached = this.guilds.find((g) => g.id === id);
            if (cached) return cached.name;
            const g = await this._rest("GET", "/guilds/" + id);
            return g && g.name ? g.name : "";
        }

        async guildMembers(args) {
            const id = this._str(args.GUILD).trim();
            const g = await this._rest("GET", "/guilds/" + id + "?with_counts=true");
            if (!g) return 0;
            return g.approximate_member_count !== undefined
                ? g.approximate_member_count
                : (g.member_count || 0);
        }

        async channelList(args) {
            const id = this._str(args.GUILD).trim();
            const list = await this._rest("GET", "/guilds/" + id + "/channels");
            const out = new NormalArray();
            if (Array.isArray(list))
                list.forEach((c) => out.push(c.id + ": #" + (c.name || c.id)));
            return out;
        }

        async findChannel(args) {
            const want = this._str(args.NAME).trim().replace(/^#/, "").toLowerCase();
            const gid = this._str(args.GUILD).trim();
            const list = await this._rest("GET", "/guilds/" + gid + "/channels");
            if (!Array.isArray(list)) return "";
            const hit = list.find(
                (c) => String(c.name || "").toLowerCase() === want
            );
            return hit ? hit.id : "";
        }

        // =================================================================
        //                        СООБЩЕНИЯ
        // =================================================================

        // Сборка компонентов (кнопок и списков) из массива
        _components(list) {
            if (!list || !list.length) return null;
            const rows = [];
            let row = [];
            const perRow = this.buttonsPerRow > 0 ? Math.floor(this.buttonsPerRow) : 0;
            const flush = () => {
                if (row.length) rows.push(row);
                row = [];
            };
            for (const raw of list) {
                let it = raw;
                if (typeof it === "string") {
                    const parts = it.split("|");
                    if (parts.length >= 2) {
                        const label = parts[0].trim();
                        const data = parts.slice(1).join("|").trim();
                        it = /^https?:\/\//i.test(data)
                            ? { __btn: { type: 2, style: 5, label: label, url: data } }
                            : { __btn: { type: 2, style: 1, label: label, custom_id: data } };
                    } else {
                        it = { __btn: { type: 2, style: 1, label: it.trim(), custom_id: it.trim() } };
                    }
                }
                if (!it) continue;
                if (it.__row) {
                    flush();
                    continue;
                }
                if (it.__select) {
                    flush();
                    rows.push([it.__select]);
                    continue;
                }
                const btn = it.__btn || (it.type === 2 ? it : null);
                if (btn) {
                    row.push(btn);
                    if (perRow > 0 && row.length >= perRow) flush();
                }
            }
            flush();
            if (!rows.length) return null;
            return rows
                .slice(0, 5)
                .map((r) => ({ type: 1, components: r.slice(0, 5) }));
        }

        _payload(text, args) {
            const p = {};
            const t = this._str(text);
            if (t) p.content = t;
            const kb = this._components(args && args.BUTTONS);
            if (kb) p.components = kb;
            return p;
        }

        async sendMessage(args) {
            const channel = this._str(args.CHANNEL).trim();
            if (!channel) {
                this.lastError = "Не указан канал";
                return;
            }
            const payload = this._payload(args.TEXT, args);
            if (!payload.content && !payload.components) return;
            const res = await this._rest("POST", "/channels/" + channel + "/messages", payload);
            if (res && res.id) this.lastMessage = res;
            return res;
        }

        async reply(args) {
            const msg = this.lastMessage;
            if (!msg) {
                this.lastError = "Пока не было ни одного сообщения";
                return;
            }
            const payload = this._payload(args.TEXT, args);
            payload.message_reference = {
                message_id: msg.id,
                channel_id: msg.channel_id,
            };
            return await this._rest(
                "POST",
                "/channels/" + msg.channel_id + "/messages",
                payload
            );
        }

        async sendDM(args) {
            const userId = this._str(args.USER).trim();
            const ch = await this._rest("POST", "/users/@me/channels", { recipient_id: userId });
            if (!ch || !ch.id) return null;
            const payload = this._payload(args.TEXT, args);
            return await this._rest("POST", "/channels/" + ch.id + "/messages", payload);
        }

        async sendEmbed(args) {
            const channel = this._str(args.CHANNEL).trim();
            if (!channel) {
                this.lastError = "Не указан канал";
                return;
            }
            const emb = this._embedObject();
            if (!emb) {
                this.lastError = "Эмбед пустой — сначала задай заголовок или описание";
                return;
            }
            const p = { embeds: [emb] };
            const kb = this._components(args && args.BUTTONS);
            if (kb) p.components = kb;
            const res = await this._rest("POST", "/channels/" + channel + "/messages", p);
            if (res && res.id) this.lastMessage = res;
            return res;
        }

        async sendFile(args) {
            const channel = this._str(args.CHANNEL).trim();
            const url = this._str(args.URL).trim();
            if (!channel || !url) {
                this.lastError = "Нужны канал и ссылка на файл";
                return;
            }
            let blob;
            let name = "file";
            try {
                const res = await fetch(url);
                blob = await res.blob();
                name = (url.split("/").pop() || "file").split("?")[0] || "file";
            } catch (e) {
                this.lastError = "Не скачал файл: " + (e && e.message ? e.message : e);
                this._log(this.lastError);
                return;
            }
            const fd = new FormData();
            fd.append("files[0]", blob, name);
            const payload = {};
            const text = this._str(args.TEXT);
            if (text) payload.content = text;
            payload.attachments = [{ id: 0, filename: name }];
            fd.append("payload_json", JSON.stringify(payload));
            return await this._rest("POST", "/channels/" + channel + "/messages", fd, {
                formData: true,
            });
        }

        async editMessage(args) {
            const channel = this._str(args.CHANNEL).trim();
            const id = this._str(args.ID).trim();
            const p = {};
            const text = this._str(args.TEXT);
            if (text) p.content = text;
            const kb = this._components(args && args.BUTTONS);
            if (kb) p.components = kb;
            return await this._rest(
                "PATCH",
                "/channels/" + channel + "/messages/" + id,
                p
            );
        }

        async editButtons(args) {
            const channel = this._str(args.CHANNEL).trim();
            const id = this._str(args.ID).trim();
            const kb = this._components(args && args.BUTTONS);
            return await this._rest(
                "PATCH",
                "/channels/" + channel + "/messages/" + id,
                { components: kb || [] }
            );
        }

        async deleteMessage(args) {
            const channel = this._str(args.CHANNEL).trim();
            const id = this._str(args.ID).trim();
            return await this._rest("DELETE", "/channels/" + channel + "/messages/" + id);
        }

        async pinMessage(args) {
            return await this._rest(
                "PUT",
                "/channels/" + this._str(args.CHANNEL).trim() + "/pins/" + this._str(args.ID).trim()
            );
        }

        async unpinMessage(args) {
            return await this._rest(
                "DELETE",
                "/channels/" + this._str(args.CHANNEL).trim() + "/pins/" + this._str(args.ID).trim()
            );
        }

        async addReaction(args) {
            const emoji = encodeURIComponent(this._str(args.EMOJI).trim());
            return await this._rest(
                "PUT",
                "/channels/" + this._str(args.CHANNEL).trim() +
                    "/messages/" + this._str(args.ID).trim() +
                    "/reactions/" + emoji + "/@me"
            );
        }

        async removeReaction(args) {
            const emoji = encodeURIComponent(this._str(args.EMOJI).trim());
            const user = this._str(args.USER).trim() || "@me";
            return await this._rest(
                "DELETE",
                "/channels/" + this._str(args.CHANNEL).trim() +
                    "/messages/" + this._str(args.ID).trim() +
                    "/reactions/" + emoji + "/" + user
            );
        }

        async clearReactions(args) {
            return await this._rest(
                "DELETE",
                "/channels/" + this._str(args.CHANNEL).trim() +
                    "/messages/" + this._str(args.ID).trim() + "/reactions"
            );
        }

        async typing(args) {
            return await this._rest(
                "POST",
                "/channels/" + this._str(args.CHANNEL).trim() + "/typing"
            );
        }

        async fetchMessages(args) {
            const n = Math.max(1, Math.min(100, Math.floor(this._num(args.N, 10))));
            const list = await this._rest(
                "GET",
                "/channels/" + this._str(args.CHANNEL).trim() + "/messages?limit=" + n
            );
            const out = new NormalArray();
            if (Array.isArray(list))
                list.forEach((m) =>
                    out.push(
                        (m.author ? m.author.username : "?") + ": " + (m.content || "")
                    )
                );
            return out;
        }

        // =================================================================
        //                    ПОСЛЕДНЕЕ СООБЩЕНИЕ
        // =================================================================

        _lastMessage() {
            if (!this.lastMessage) return null;
            if (this.lastMessage.text === undefined)
                this.lastMessage.text = this.lastMessage.content || "";
            return this.lastMessage;
        }

        lastText() {
            return this.lastMessage ? this.lastMessage.content || "" : "";
        }

        lastMessageId() {
            return this.lastMessage ? this.lastMessage.id || "" : "";
        }

        lastChannelId() {
            return this.lastMessage ? this.lastMessage.channel_id || "" : "";
        }

        lastGuildId() {
            return this.lastMessage ? this.lastMessage.guild_id || "" : "";
        }

        lastUserId() {
            return this.lastMessage && this.lastMessage.author
                ? this.lastMessage.author.id || ""
                : "";
        }

        lastUserName() {
            return this.lastMessage && this.lastMessage.author
                ? this.lastMessage.author.username || ""
                : "";
        }

        lastUserNick() {
            const m = this.lastMessage;
            if (!m) return "";
            if (m.member && m.member.nick) return m.member.nick;
            return m.author ? m.author.global_name || m.author.username || "" : "";
        }

        lastUserMention() {
            const id = this.lastUserId();
            return id ? "<@" + id + ">" : "";
        }

        lastUserAvatar() {
            const m = this.lastMessage;
            if (!m || !m.author) return "";
            if (m.author.avatar)
                return (
                    "https://cdn.discordapp.com/avatars/" +
                    m.author.id + "/" + m.author.avatar + ".png?size=256"
                );
            return "https://cdn.discordapp.com/embed/avatars/0.png";
        }

        lastIsBot() {
            return !!(this.lastMessage && this.lastMessage.author && this.lastMessage.author.bot);
        }

        lastUserRoles() {
            const out = new NormalArray();
            const m = this.lastMessage;
            if (m && m.member && Array.isArray(m.member.roles))
                m.member.roles.forEach((r) => out.push(r));
            return out;
        }

        hasNewMessage() {
            return !!this.events.message;
        }

        isMessageStartsWith(args) {
            const text = this.lastText();
            const prefix = this._str(args.PREFIX);
            return prefix ? text.trim().toLowerCase().startsWith(prefix.toLowerCase()) : false;
        }

        getAllUsers() {
            return this.allUsers;
        }

        // =================================================================
        //                          ЭМБЕДЫ
        // =================================================================

        _embed() {
            if (!this.embed)
                this.embed = {
                    title: "",
                    description: "",
                    color: null,
                    image: "",
                    thumbnail: "",
                    author: null,
                    footer: null,
                    fields: [],
                    timestamp: false,
                };
            return this.embed;
        }

        _embedObject() {
            const e = this.embed;
            if (!e) return null;
            const out = {};
            if (e.title) out.title = e.title;
            if (e.description) out.description = e.description;
            if (e.color !== null && e.color !== undefined) out.color = e.color;
            if (e.image) out.image = { url: e.image };
            if (e.thumbnail) out.thumbnail = { url: e.thumbnail };
            if (e.author) out.author = e.author;
            if (e.footer) out.footer = e.footer;
            if (e.fields && e.fields.length) out.fields = e.fields.slice(0, 25);
            if (e.timestamp) out.timestamp = new Date().toISOString();
            if (!Object.keys(out).length) return null;
            return out;
        }

        _color(v) {
            const map = {
                "синий": 0x5865f2,
                "зелёный": 0x57f287,
                "зеленый": 0x57f287,
                "красный": 0xed4245,
                "жёлтый": 0xfee75c,
                "желтый": 0xfee75c,
                "фиолетовый": 0x9b59b6,
                "оранжевый": 0xe67e22,
                "розовый": 0xeb459e,
                "серый": 0x95a5a6,
                "чёрный": 0x000000,
                "черный": 0x000000,
                "белый": 0xffffff,
            };
            const key = String(v === undefined || v === null ? "" : v).trim().toLowerCase();
            if (map[key] !== undefined) return map[key];
            let hex = key.replace("#", "");
            if (/^[0-9a-f]{6}$/i.test(hex)) return parseInt(hex, 16);
            return 0x5865f2;
        }

        embedClear() {
            this.embed = null;
        }

        embedTitle(args) {
            this._embed().title = this._str(args.TEXT).slice(0, 256);
        }

        embedDesc(args) {
            this._embed().description = this._str(args.TEXT).slice(0, 4096);
        }

        embedColor(args) {
            this._embed().color = this._color(args.COLOR);
        }

        embedImage(args) {
            this._embed().image = this._str(args.URL).trim();
        }

        embedThumb(args) {
            this._embed().thumbnail = this._str(args.URL).trim();
        }

        embedAuthor(args) {
            this._embed().author = {
                name: this._str(args.NAME),
                url: this._str(args.URL).trim() || undefined,
            };
        }

        embedFooter(args) {
            this._embed().footer = { text: this._str(args.TEXT) };
        }

        embedField(args) {
            this._embed().fields.push({
                name: this._str(args.NAME) || "Поле",
                value: this._str(args.VALUE) || "—",
                inline: this._bool(args.INLINE),
            });
        }

        embedTime(args) {
            this._embed().timestamp = this._bool(args.ON);
        }

        // =================================================================
        //                     КНОПКИ И СПИСКИ
        // =================================================================

        addButton(args) {
            const label = this._str(args.TEXT) || "Кнопка";
            const type = this._n("btn", args.TYPE, "данные");
            const data = this._str(args.DATA);
            const style = this._n("style", args.STYLE, 1);
            if (type === "ссылка")
                this.inlineButtons.push({
                    __btn: { type: 2, style: 5, label: label, url: data },
                });
            else if (type === "\n" || type === "новый ряд")
                this.inlineButtons.push({ __row: true });
            else
                this.inlineButtons.push({
                    __btn: {
                        type: 2,
                        style: Number(style) || 1,
                        label: label,
                        custom_id: data || label,
                    },
                });
        }

        addRowSeparator() {
            this.inlineButtons.push({ __row: true });
        }

        setButtonsPerRow(args) {
            this.buttonsPerRow = Math.max(0, Math.floor(this._num(args.N, 0)));
        }

        addSelect(args) {
            const id = this._str(args.ID) || "vybor";
            const placeholder = this._str(args.TEXT) || "Выбери";
            const raw = this._str(args.OPTIONS);
            const options = [];
            raw.split(/[;,\n]/)
                .map((s) => s.trim())
                .filter((s) => s.length)
                .forEach((s) => {
                    const parts = s.split("|");
                    if (parts.length >= 2)
                        options.push({ label: parts[1].trim(), value: parts[0].trim() });
                    else options.push({ label: s, value: s });
                });
            if (!options.length) options.push({ label: "Вариант", value: "variant" });
            this.inlineButtons.push({
                __select: {
                    type: 3,
                    custom_id: id,
                    placeholder: placeholder,
                    options: options.slice(0, 25),
                    min_values: 1,
                    max_values: 1,
                },
            });
        }

        clearArray(args) {
            const which = this._n("array", args.ARRAY, "кнопки");
            if (which === "кнопки") this.inlineButtons = new NormalArray();
        }

        getArray(args) {
            const which = this._n("array", args.ARRAY, "кнопки");
            return which === "кнопки" ? this.inlineButtons : new NormalArray();
        }

        // =================================================================
        //                    ОТВЕТЫ НА НАЖАТИЯ
        // =================================================================

        _interaction(type, data) {
            const it = this.lastInteraction;
            if (!it) {
                this.lastError = "Нажатий пока не было";
                return null;
            }
            return this._rest(
                "POST",
                "/interactions/" + it.id + "/" + it.token + "/callback",
                { type: type, data: data || {} }
            );
        }

        async answerInteraction(args) {
            const data = { content: this._str(args.TEXT) || "Готово!" };
            if (this._bool(args.HIDDEN)) data.flags = 64; // видно только нажавшему
            return await this._interaction(4, data);
        }

        async answerInteractionMessage(args) {
            const data = { content: this._str(args.TEXT) || "" };
            const kb = this._components(args && args.BUTTONS);
            if (kb) data.components = kb;
            return await this._interaction(4, data);
        }

        async answerUpdate(args) {
            const data = {};
            const text = this._str(args.TEXT);
            if (text) data.content = text;
            const kb = this._components(args && args.BUTTONS);
            if (kb) data.components = kb;
            return await this._interaction(7, data);
        }

        async deferInteraction(args) {
            const data = {};
            if (this._bool(args.HIDDEN)) data.flags = 64;
            return await this._interaction(5, data);
        }

        async editInteractionReply(args) {
            const it = this.lastInteraction;
            const appId = await this._appId();
            if (!it || !appId) return null;
            return await this._rest(
                "PATCH",
                "/webhooks/" + appId + "/" + it.token + "/messages/@original",
                { content: this._str(args.TEXT) }
            );
        }

        lastButtonData() {
            const it = this.lastInteraction;
            if (it && it.data && it.data.custom_id) return it.data.custom_id;
            return "";
        }

        lastSelectValue() {
            const it = this.lastInteraction;
            if (it && it.data && it.data.values && it.data.values.length)
                return it.data.values[0];
            return "";
        }

        // =================================================================
        //                       СЛЭШ-КОМАНДЫ
        // =================================================================

        async registerCommand(args) {
            const appId = await this._appId();
            if (!appId) return null;
            return await this._rest("POST", "/applications/" + appId + "/commands", {
                name: this._str(args.NAME).trim().toLowerCase(),
                description: this._str(args.DESC).trim() || "Команда бота",
                type: 1,
            });
        }

        async registerGuildCommand(args) {
            const appId = await this._appId();
            const guild = this._str(args.GUILD).trim();
            if (!appId || !guild) return null;
            return await this._rest(
                "POST",
                "/applications/" + appId + "/guilds/" + guild + "/commands",
                {
                    name: this._str(args.NAME).trim().toLowerCase(),
                    description: this._str(args.DESC).trim() || "Команда бота",
                    type: 1,
                }
            );
        }

        async deleteCommand(args) {
            const appId = await this._appId();
            if (!appId) return null;
            return await this._rest(
                "DELETE",
                "/applications/" + appId + "/commands/" + this._str(args.ID).trim()
            );
        }

        async deleteGuildCommand(args) {
            const appId = await this._appId();
            if (!appId) return null;
            return await this._rest(
                "DELETE",
                "/applications/" + appId + "/guilds/" + this._str(args.GUILD).trim() +
                    "/commands/" + this._str(args.ID).trim()
            );
        }

        async listCommands() {
            const appId = await this._appId();
            const out = new NormalArray();
            if (!appId) return out;
            const list = await this._rest("GET", "/applications/" + appId + "/commands");
            if (Array.isArray(list))
                list.forEach((c) => out.push(c.id + ": /" + c.name + " — " + (c.description || "")));
            return out;
        }

        async findCommandId(args) {
            const appId = await this._appId();
            if (!appId) return "";
            const want = this._str(args.NAME).trim().replace(/^\//, "").toLowerCase();
            const list = await this._rest("GET", "/applications/" + appId + "/commands");
            if (!Array.isArray(list)) return "";
            const hit = list.find((c) => String(c.name).toLowerCase() === want);
            return hit ? hit.id : "";
        }

        // =================================================================
        //                          СОБЫТИЯ
        // =================================================================

        whenReady() {
            if (this.events.ready) {
                this.events.ready = false;
                return true;
            }
            return false;
        }

        whenMessage() {
            if (this.events.message) {
                this.events.message = false;
                return true;
            }
            return false;
        }

        whenCommand(args) {
            const want = this._str(args.PREFIX).trim();
            if (!want || !this.events.command) return false;
            if (String(this.events.command).toLowerCase() === want.toLowerCase()) {
                this.events.command = null;
                return true;
            }
            return false;
        }

        whenButton(args) {
            const want = this._str(args.DATA).trim();
            if (!want || this.events.button === null || this.events.button === undefined)
                return false;
            if (String(this.events.button) === want) {
                this.events.button = null;
                return true;
            }
            return false;
        }

        whenSelect(args) {
            const want = this._str(args.ID).trim();
            if (!want || !this.events.select) return false;
            if (String(this.events.select.id) === want) {
                this.events.select = null;
                return true;
            }
            return false;
        }

        whenSlash(args) {
            const want = this._str(args.NAME).trim().replace(/^\//, "");
            if (!want || !this.events.slash) return false;
            if (String(this.events.slash).toLowerCase() === want.toLowerCase()) {
                this.events.slash = null;
                return true;
            }
            return false;
        }

        whenMemberAdd() {
            if (this.events.memberAdd) {
                this.events.memberAdd = false;
                return true;
            }
            return false;
        }

        whenMemberRemove() {
            if (this.events.memberRemove) {
                this.events.memberRemove = false;
                return true;
            }
            return false;
        }

        whenReaction() {
            if (this.events.reaction) {
                this.events.reaction = false;
                return true;
            }
            return false;
        }

        clearEvents() {
            this.events.ready = false;
            this.events.message = false;
            this.events.command = null;
            this.events.button = null;
            this.events.select = null;
            this.events.slash = null;
            this.events.memberAdd = false;
            this.events.memberRemove = false;
            this.events.reaction = false;
        }

        lastReactionEmoji() {
            return this.lastReaction ? this.lastReaction.emoji || "" : "";
        }

        lastReactionChannel() {
            return this.lastReaction ? this.lastReaction.channel_id || "" : "";
        }

        lastReactionMessage() {
            return this.lastReaction ? this.lastReaction.message_id || "" : "";
        }

        // =================================================================
        //                     УЧАСТНИКИ И РОЛИ
        // =================================================================

        lastMemberId() {
            return this.lastMember ? this.lastMember.id || "" : "";
        }

        lastMemberName() {
            return this.lastMember ? this.lastMember.name || "" : "";
        }

        lastMemberGuild() {
            return this.lastMember ? this.lastMember.guild_id || "" : "";
        }

        async memberRoles(args) {
            const out = new NormalArray();
            const m = await this._rest(
                "GET",
                "/guilds/" + this._str(args.GUILD).trim() +
                    "/members/" + this._str(args.USER).trim()
            );
            if (m && Array.isArray(m.roles)) m.roles.forEach((r) => out.push(r));
            return out;
        }

        async memberJoined(args) {
            const m = await this._rest(
                "GET",
                "/guilds/" + this._str(args.GUILD).trim() +
                    "/members/" + this._str(args.USER).trim()
            );
            return m && m.joined_at ? m.joined_at : "";
        }

        async addRole(args) {
            return await this._rest(
                "PUT",
                "/guilds/" + this._str(args.GUILD).trim() +
                    "/members/" + this._str(args.USER).trim() +
                    "/roles/" + this._str(args.ROLE).trim()
            );
        }

        async removeRole(args) {
            return await this._rest(
                "DELETE",
                "/guilds/" + this._str(args.GUILD).trim() +
                    "/members/" + this._str(args.USER).trim() +
                    "/roles/" + this._str(args.ROLE).trim()
            );
        }

        async roleList(args) {
            const out = new NormalArray();
            const list = await this._rest(
                "GET",
                "/guilds/" + this._str(args.GUILD).trim() + "/roles"
            );
            if (Array.isArray(list))
                list.forEach((r) => out.push(r.id + ": " + r.name));
            return out;
        }

        async setNick(args) {
            return await this._rest(
                "PATCH",
                "/guilds/" + this._str(args.GUILD).trim() +
                    "/members/" + this._str(args.USER).trim(),
                { nick: this._str(args.NAME) }
            );
        }

        async memberList(args) {
            const out = new NormalArray();
            const n = Math.max(1, Math.min(1000, Math.floor(this._num(args.N, 50))));
            const list = await this._rest(
                "GET",
                "/guilds/" + this._str(args.GUILD).trim() + "/members?limit=" + n
            );
            if (Array.isArray(list))
                list.forEach((m) =>
                    out.push(
                        (m.user ? m.user.id : "?") + ": " + (m.user ? m.user.username : "?")
                    )
                );
            return out;
        }

        // =================================================================
        //                         МОДЕРАЦИЯ
        // =================================================================

        async banUser(args) {
            return await this._rest(
                "PUT",
                "/guilds/" + this._str(args.GUILD).trim() +
                    "/bans/" + this._str(args.USER).trim(),
                {},
                { reason: this._str(args.REASON) }
            );
        }

        async unbanUser(args) {
            return await this._rest(
                "DELETE",
                "/guilds/" + this._str(args.GUILD).trim() +
                    "/bans/" + this._str(args.USER).trim()
            );
        }

        async kickUser(args) {
            return await this._rest(
                "DELETE",
                "/guilds/" + this._str(args.GUILD).trim() +
                    "/members/" + this._str(args.USER).trim(),
                null,
                { reason: this._str(args.REASON) }
            );
        }

        async timeoutUser(args) {
            const min = Math.max(0, this._num(args.MIN, 10));
            const until = new Date(Date.now() + min * 60000).toISOString();
            return await this._rest(
                "PATCH",
                "/guilds/" + this._str(args.GUILD).trim() +
                    "/members/" + this._str(args.USER).trim(),
                { communication_disabled_until: until },
                { reason: "тайм-аут через блок" }
            );
        }

        async untimeoutUser(args) {
            return await this._rest(
                "PATCH",
                "/guilds/" + this._str(args.GUILD).trim() +
                    "/members/" + this._str(args.USER).trim(),
                { communication_disabled_until: null }
            );
        }

        async isBanned(args) {
            const list = await this._rest(
                "GET",
                "/guilds/" + this._str(args.GUILD).trim() + "/bans"
            );
            if (!Array.isArray(list)) return false;
            const id = this._str(args.USER).trim();
            return list.some((b) => b.user && String(b.user.id) === id);
        }

        async banList(args) {
            const out = new NormalArray();
            const list = await this._rest(
                "GET",
                "/guilds/" + this._str(args.GUILD).trim() + "/bans"
            );
            if (Array.isArray(list))
                list.forEach((b) =>
                    out.push(
                        (b.user ? b.user.id : "?") + ": " + (b.reason || "без причины")
                    )
                );
            return out;
        }

        // =================================================================
        //                          КАНАЛЫ
        // =================================================================

        async channelName(args) {
            const c = await this._rest("GET", "/channels/" + this._str(args.CHANNEL).trim());
            return c && c.name ? "#" + c.name : "";
        }

        async createChannel(args) {
            const type = this._n("chantype", args.TYPE, 0);
            return await this._rest(
                "POST",
                "/guilds/" + this._str(args.GUILD).trim() + "/channels",
                {
                    name: this._str(args.NAME).trim().toLowerCase().replace(/\s+/g, "-"),
                    type: Number(type) || 0,
                }
            );
        }

        async deleteChannel(args) {
            return await this._rest("DELETE", "/channels/" + this._str(args.CHANNEL).trim());
        }

        async renameChannel(args) {
            return await this._rest(
                "PATCH",
                "/channels/" + this._str(args.CHANNEL).trim(),
                { name: this._str(args.NAME).trim().toLowerCase().replace(/\s+/g, "-") }
            );
        }

        async setTopic(args) {
            return await this._rest(
                "PATCH",
                "/channels/" + this._str(args.CHANNEL).trim(),
                { topic: this._str(args.TEXT) }
            );
        }

        async createThread(args) {
            return await this._rest(
                "POST",
                "/channels/" + this._str(args.CHANNEL).trim() +
                    "/messages/" + this._str(args.ID).trim() + "/threads",
                { name: this._str(args.NAME), type: 11 }
            );
        }

        async createPrivateThread(args) {
            return await this._rest(
                "POST",
                "/channels/" + this._str(args.CHANNEL).trim() +
                    "/messages/" + this._str(args.ID).trim() + "/threads",
                { name: this._str(args.NAME), type: 12 }
            );
        }

    // ===== Автоматически перенесено из Telegram-версии (утилиты) =====

        _str(v) {
            return String(v === undefined || v === null ? "" : v);
        }

        _num(v, def) {
            const n = Number(v);
            return isNaN(n) ? (def === undefined ? 0 : def) : n;
        }

        _log(text) {
            const line = "[" + new Date().toLocaleTimeString("ru-RU") + "] " + text;
            this.log.push(line);
            if (this.log.length > 300) this.log.shift();
            console.log("[TelegramBotAPI] " + text);
        }

        async _json(url, options) {
            try {
                const controller =
                    typeof AbortController !== "undefined" ? new AbortController() : null;
                const timer = controller
                    ? setTimeout(() => controller.abort(), (options && options.timeout) || 15000)
                    : null;
                const res = await fetch(url, {
                    signal: controller ? controller.signal : undefined,
                });
                if (timer) clearTimeout(timer);
                if (!res.ok) throw new Error("HTTP " + res.status);
                const text = await res.text();
                try {
                    return JSON.parse(text);
                } catch (e) {
                    return text;
                }
            } catch (e) {
                this.lastError = String(e && e.message ? e.message : e);
                this._log("Ошибка запроса: " + this.lastError);
                return null;
            }
        }

        _plural(n, one, few, many) {
            const abs = Math.abs(Math.floor(Number(n) || 0));
            const mod100 = abs % 100;
            const last = abs % 10;
            if (mod100 > 10 && mod100 < 20) return many;
            if (last > 1 && last < 5) return few;
            if (last === 1) return one;
            return many;
        }

        _loadStore() {
            try {
                const raw = localStorage.getItem(STORE_KEY);
                if (!raw) return;
                const s = JSON.parse(raw);
                this.db = s.db || {};
                this.counters = s.counters || {};
                this.stats = Object.assign({ messages: 0, updates: 0 }, s.stats || {});
            } catch (e) {
                /* хранилище недоступно — работаем в памяти */
            }
        }

        _saveStore() {
            try {
                localStorage.setItem(
                    STORE_KEY,
                    JSON.stringify({ db: this.db, counters: this.counters, stats: this.stats })
                );
                return true;
            } catch (e) {
                return false;
            }
        }

        _saveSoon() {
            if (this._saveTimer) clearTimeout(this._saveTimer);
            this._saveTimer = setTimeout(() => {
                this._saveTimer = null;
                this._saveStore();
            }, 800);
        }

        _userKey(userId, key) {
            return "u:" + this._str(userId) + ":" + this._str(key);
        }

        _n(group, value, fallback) {
            const map = NORM[group];
            if (!map) return value;
            const v = String(value === undefined || value === null ? "" : value)
                .trim()
                .toLowerCase();
            if (map[v] === undefined) return fallback === undefined ? value : fallback;
            return map[v];
        }

        dbSet(args) {
            this.db[this._str(args.KEY)] = this._str(args.VALUE);
            this._saveSoon();
        }

        dbGet(args) {
            const v = this.db[this._str(args.KEY)];
            return v === undefined ? "" : String(v);
        }

        dbDelete(args) {
            delete this.db[this._str(args.KEY)];
            this._saveSoon();
        }

        dbHas(args) {
            return this.db[this._str(args.KEY)] !== undefined;
        }

        dbKeys() {
            return new NormalArray(...Object.keys(this.db));
        }

        dbSize() {
            return Object.keys(this.db).length;
        }

        dbClear() {
            this.db = {};
            this._saveSoon();
        }

        dbSetUser(args) {
            this.db[this._userKey(args.USERID, args.KEY)] = this._str(args.VALUE);
            this._saveSoon();
        }

        dbGetUser(args) {
            const v = this.db[this._userKey(args.USERID, args.KEY)];
            return v === undefined ? "" : String(v);
        }

        dbAddUser(args) {
            const k = this._userKey(args.USERID, args.KEY);
            const cur = Number(this.db[k] === undefined ? 0 : this.db[k]) || 0;
            this.db[k] = String(cur + this._num(args.DELTA, 1));
            this._saveSoon();
        }

        dbExport() {
            try {
                return JSON.stringify(this.db);
            } catch (e) {
                return "{}";
            }
        }

        dbImport(args) {
            try {
                const obj = JSON.parse(this._str(args.JSON));
                if (obj && typeof obj === "object") {
                    this.db = obj;
                    this._saveSoon();
                }
            } catch (e) {
                this.lastError = "Неверный JSON для базы";
            }
        }

        dbSave() {
            const ok = this._saveStore();
            if (!ok) this.lastError = "Не удалось сохранить (хранилище недоступно)";
        }

        dbLoad() {
            this._loadStore();
        }

        startTimer(args) {
            const name = this._str(args.NAME);
            const seconds = Math.max(0.1, this._num(args.SECONDS, 60));
            this.stopTimer(args);
            const id = setInterval(() => {
                this.timerFired[name] = true;
            }, seconds * 1000);
            this.timers[name] = id;
            this._log("Таймер «" + name + "» запущен, период " + seconds + " с");
        }

        stopTimer(args) {
            const name = this._str(args.NAME);
            if (this.timers[name]) {
                clearInterval(this.timers[name]);
                delete this.timers[name];
            }
        }

        stopAllTimers() {
            for (const name of Object.keys(this.timers)) {
                clearInterval(this.timers[name]);
                delete this.timers[name];
            }
        }

        isTimerRunning(args) {
            return !!this.timers[this._str(args.NAME)];
        }

        whenTimer(args) {
            const name = this._str(args.NAME);
            if (this.timerFired[name]) {
                delete this.timerFired[name];
                return true;
            }
            return false;
        }

        antifloodAllow(args) {
            const key = this._str(args.CHATID);
            const limit = Math.max(1, Math.floor(this._num(args.COUNT, 3)));
            const window = Math.max(1, this._num(args.SECONDS, 10)) * 1000;
            const now = Date.now();
            let arr = this.flood[key] || [];
            arr = arr.filter((t) => now - t < window);
            if (arr.length >= limit) {
                this.flood[key] = arr;
                return false;
            }
            arr.push(now);
            this.flood[key] = arr;
            return true;
        }

        cooldownReady(args) {
            const name = this._str(args.NAME);
            const last = this.cooldowns[name];
            if (last === undefined) return true;
            return Date.now() - last >= this._num(args.SECONDS, 60) * 1000;
        }

        cooldownTouch(args) {
            this.cooldowns[this._str(args.NAME)] = Date.now();
        }

        cooldownReset(args) {
            delete this.cooldowns[this._str(args.NAME)];
        }

        cooldownSeconds(args) {
            const last = this.cooldowns[this._str(args.NAME)];
            if (last === undefined) return -1;
            return Math.floor((Date.now() - last) / 1000);
        }

        badWordsAdd(args) {
            const w = this._str(args.WORD).trim().toLowerCase();
            if (w) this.badWords.push(w);
        }

        badWordsClear() {
            this.badWords = new NormalArray();
        }

        _hasBad(text) {
            const lower = this._str(text).toLowerCase();
            for (const w of this.badWords) {
                if (w && lower.indexOf(String(w).toLowerCase()) >= 0) return true;
            }
            return false;
        }

        hasBadWords(args) {
            return this._hasBad(args.TEXT);
        }

        censorText(args) {
            let out = this._str(args.TEXT);
            const repl = this._str(args.REPL);
            for (const w of this.badWords) {
                const word = this._str(w);
                if (!word) continue;
                const re = new RegExp(
                    word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                    "gi"
                );
                out = out.replace(re, repl);
            }
            return out;
        }

        _cmdParts() {
            const msg = this._lastMessage();
            const text = msg ? msg.text || msg.caption || "" : "";
            return text.trim().split(/\s+/).filter((s) => s.length > 0);
        }

        cmdText() {
            const parts = this._cmdParts();
            if (!parts.length || !parts[0].startsWith("/")) return "";
            return parts[0].split("@")[0];
        }

        cmdIs(args) {
            const cmd = this.cmdText();
            if (!cmd) return false;
            const want = this._str(args.TEXT).trim().split("@")[0];
            return cmd.toLowerCase() === want.toLowerCase();
        }

        cmdArg(args) {
            const parts = this._cmdParts();
            const n = Math.floor(this._num(args.N, 1));
            if (!parts.length || !parts[0].startsWith("/")) return "";
            return parts[n] === undefined ? "" : parts[n];
        }

        cmdArgsCount() {
            const parts = this._cmdParts();
            if (!parts.length || !parts[0].startsWith("/")) return 0;
            return Math.max(0, parts.length - 1);
        }

        cmdArgsAll() {
            const parts = this._cmdParts();
            if (!parts.length || !parts[0].startsWith("/")) return "";
            return parts.slice(1).join(" ");
        }

        plural(args) {
            return this._plural(args.COUNT, args.ONE, args.FEW, args.MANY);
        }

        textCase(args) {
            const mode = this._n("case", args.CASE, "верхний");
            const t = this._str(args.TEXT);
            switch (mode) {
                case "верхний":
                    return t.toUpperCase();
                case "нижний":
                    return t.toLowerCase();
                case "первая заглавная":
                    return t.charAt(0).toUpperCase() + t.slice(1);
                case "каждое слово с заглавной":
                    return t.replace(/(^|\s)(\S)/g, (m, p1, p2) => p1 + p2.toUpperCase());
                case "перевёрнутый":
                    return t.split("").reverse().join("");
                case "без пробелов":
                    return t.trim().replace(/\s+/g, "");
                case "транслит":
                    return t
                        .toLowerCase()
                        .split("")
                        .map((c) => (TRANSLIT[c] === undefined ? c : TRANSLIT[c]))
                        .join("");
                default:
                    return t;
            }
        }

        cutText(args) {
            const t = this._str(args.TEXT);
            const len = Math.max(0, Math.floor(this._num(args.LENGTH, 20)));
            if (len === 0) return "";
            return t.length <= len ? t : t.slice(0, len) + "…";
        }

        randInt(args) {
            let min = this._num(args.MIN, 1);
            let max = this._num(args.MAX, 10);
            if (min > max) {
                const t = min;
                min = max;
                max = t;
            }
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        randFloat(args) {
            let min = this._num(args.MIN, 0);
            let max = this._num(args.MAX, 1);
            if (min > max) {
                const t = min;
                min = max;
                max = t;
            }
            return Math.random() * (max - min) + min;
        }

        chance(args) {
            const p = Math.min(100, Math.max(0, this._num(args.PERCENT, 50)));
            return Math.random() * 100 < p;
        }

        randItem(args) {
            const arr = args.ARRAY || [];
            if (!arr.length) return "";
            return arr[Math.floor(Math.random() * arr.length)];
        }

        shuffleArray(args) {
            const arr = (args.ARRAY || []).slice();
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const t = arr[i];
                arr[i] = arr[j];
                arr[j] = t;
            }
            return new NormalArray(...arr);
        }

        reverseArray(args) {
            return new NormalArray(...(args.ARRAY || []).slice().reverse());
        }

        uuid() {
            try {
                if (typeof crypto !== "undefined" && crypto.randomUUID)
                    return crypto.randomUUID();
            } catch (e) {
                /* старый браузер */
            }
            return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
                const r = (Math.random() * 16) | 0;
                const v = c === "x" ? r : (r & 0x3) | 0x8;
                return v.toString(16);
            });
        }

        randString(args) {
            const len = Math.max(1, Math.floor(this._num(args.LENGTH, 10)));
            const type = this._n("randStr", args.TYPE, "буквы и цифры");
            const digits = "0123456789";
            const lower = "abcdefghijklmnopqrstuvwxyz";
            const letters = lower + lower.toUpperCase();
            const symbols = "!@#$%^&*()-_=+[]{}?";
            const emoji = "😀😃😄😁😆😅😂🤣😊😇🙂🙃😉😍🥰😘😎🤩🥳😜🤪🤗🤔🤨😐😴🤯";
            let pool = letters + digits;
            if (type === "цифры") pool = digits;
            else if (type === "буквы") pool = letters;
            else if (type === "пароль") pool = letters + digits + symbols;
            else if (type === "эмодзи") pool = emoji;
            let out = "";
            const arr = Array.from(pool);
            for (let i = 0; i < len; i++)
                out += arr[Math.floor(Math.random() * arr.length)];
            return out;
        }

        _regex(pattern) {
            try {
                return new RegExp(this._str(pattern), "g");
            } catch (e) {
                this.lastError = "Неверный шаблон: " + this._str(pattern);
                return null;
            }
        }

        regexFind(args) {
            const re = this._regex(args.PATTERN);
            if (!re) return "";
            const m = re.exec(this._str(args.TEXT));
            return m ? (m[1] !== undefined ? m[1] : m[0]) : "";
        }

        regexAll(args) {
            const re = this._regex(args.PATTERN);
            if (!re) return new NormalArray();
            const out = [];
            let m;
            while ((m = re.exec(this._str(args.TEXT))) !== null) {
                out.push(m[1] !== undefined ? m[1] : m[0]);
                if (m.index === re.lastIndex) re.lastIndex++;
            }
            return new NormalArray(...out);
        }

        regexReplace(args) {
            const re = this._regex(args.PATTERN);
            if (!re) return this._str(args.TEXT);
            return this._str(args.TEXT).replace(re, this._str(args.REPL));
        }

        regexTest(args) {
            const re = this._regex(args.PATTERN);
            if (!re) return false;
            re.lastIndex = 0;
            return re.test(this._str(args.TEXT));
        }

        _pathParts(path) {
            return this._str(path)
                .split(".")
                .map((p) => p.trim())
                .filter((p) => p.length > 0);
        }

        jsonGet(args) {
            try {
                let obj = JSON.parse(this._str(args.JSON));
                for (const p of this._pathParts(args.PATH)) {
                    if (obj === null || obj === undefined) return "";
                    obj = obj[/^\d+$/.test(p) ? Number(p) : p];
                }
                if (obj === null || obj === undefined) return "";
                return typeof obj === "object" ? JSON.stringify(obj) : String(obj);
            } catch (e) {
                this.lastError = "Неверный JSON";
                return "";
            }
        }

        jsonSet(args) {
            try {
                let obj = JSON.parse(this._str(args.JSON) || "{}");
                const parts = this._pathParts(args.PATH);
                if (!parts.length) return this._str(args.JSON);
                let cur = obj;
                for (let i = 0; i < parts.length - 1; i++) {
                    const p = parts[i];
                    if (cur[p] === null || typeof cur[p] !== "object") cur[p] = {};
                    cur = cur[p];
                }
                const last = parts[parts.length - 1];
                let value = this._str(args.VALUE);
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    /* оставляем строкой */
                }
                cur[last] = value;
                return JSON.stringify(obj);
            } catch (e) {
                this.lastError = "Неверный JSON";
                return this._str(args.JSON);
            }
        }

        urlEncode(args) {
            return encodeURIComponent(this._str(args.TEXT));
        }

        urlDecode(args) {
            try {
                return decodeURIComponent(this._str(args.TEXT));
            } catch (e) {
                return this._str(args.TEXT);
            }
        }

        b64encode(args) {
            return btoa(unescape(encodeURIComponent(this._str(args.TEXT))));
        }

        b64decode(args) {
            try {
                return decodeURIComponent(escape(atob(this._str(args.TEXT))));
            } catch (e) {
                this.lastError = "Неверный base64";
                return "";
            }
        }

        async hashText(args) {
            const algo = this._n("hash", args.ALGO, "MD5");
            const text = this._str(args.TEXT);
            if (algo === "MD5") return md5(text);
            const subtle =
                typeof crypto !== "undefined" && crypto.subtle ? crypto.subtle : null;
            if (!subtle) {
                this.lastError = "Хеширование недоступно (нет HTTPS)";
                return "";
            }
            const map = { "SHA-1": "SHA-1", "SHA-256": "SHA-256", "SHA-512": "SHA-512" };
            const data = new TextEncoder().encode(text);
            const buf = await subtle.digest(map[algo] || "SHA-256", data);
            return Array.from(new Uint8Array(buf))
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("");
        }

        escapeText(args) {
            const mode = this._n("esc", args.MODE, "HTML");
            const t = this._str(args.TEXT);
            if (mode === "HTML")
                return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            if (mode === "Markdown")
                return t.replace(/([_*`\[])/g, "\\$1");
            return t.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
        }

        _fmt(date, format) {
            const pad = (n) => String(n).padStart(2, "0");
            const days = [
                "воскресенье",
                "понедельник",
                "вторник",
                "среда",
                "четверг",
                "пятница",
                "суббота",
            ];
            const months = [
                "января", "февраля", "марта", "апреля", "мая", "июня",
                "июля", "августа", "сентября", "октября", "ноября", "декабря",
            ];
            switch (format) {
                case "время":
                    return pad(date.getHours()) + ":" + pad(date.getMinutes());
                case "дата":
                    return pad(date.getDate()) + "." + pad(date.getMonth() + 1) + "." + date.getFullYear();
                case "дата и время":
                    return (
                        pad(date.getDate()) +
                        "." +
                        pad(date.getMonth() + 1) +
                        "." +
                        date.getFullYear() +
                        " " +
                        pad(date.getHours()) +
                        ":" +
                        pad(date.getMinutes())
                    );
                case "день недели":
                    return days[date.getDay()];
                case "unix":
                    return String(Math.floor(date.getTime() / 1000));
                case "час":
                    return String(date.getHours());
                case "минута":
                    return String(date.getMinutes());
                case "секунда":
                    return String(date.getSeconds());
                case "месяц":
                    return months[date.getMonth()];
                case "год":
                    return String(date.getFullYear());
                default:
                    return date.toLocaleString("ru-RU");
            }
        }

        nowTime(args) {
            return this._fmt(new Date(), this._n("time", args.FORMAT, "время"));
        }

        formatUnix(args) {
            const ts = this._num(args.TIMESTAMP, 0);
            const d = new Date(ts > 100000000000 ? ts : ts * 1000);
            return this._fmt(d, this._n("time", args.FORMAT, "дата и время"));
        }

        timeAgo(args) {
            const ts = this._num(args.TIMESTAMP, 0);
            const seconds = Math.floor(Date.now() / 1000) - ts;
            if (seconds < 0) return "в будущем";
            if (seconds < 60)
                return seconds + " " + this._plural(seconds, "секунду", "секунды", "секунд") + " назад";
            const minutes = Math.floor(seconds / 60);
            if (minutes < 60)
                return minutes + " " + this._plural(minutes, "минуту", "минуты", "минут") + " назад";
            const hours = Math.floor(minutes / 60);
            if (hours < 24)
                return hours + " " + this._plural(hours, "час", "часа", "часов") + " назад";
            const days = Math.floor(hours / 24);
            if (days < 31) return days + " " + this._plural(days, "день", "дня", "дней") + " назад";
            const months = Math.floor(days / 30);
            if (months < 12)
                return months + " " + this._plural(months, "месяц", "месяца", "месяцев") + " назад";
            const years = Math.floor(days / 365);
            return years + " " + this._plural(years, "год", "года", "лет") + " назад";
        }

        uptime() {
            return Math.floor((Date.now() - this.startedAt) / 1000);
        }

        counterUp(args) {
            const name = this._str(args.NAME);
            const cur = Number(this.counters[name] === undefined ? 0 : this.counters[name]) || 0;
            this.counters[name] = cur + this._num(args.N, 1);
            this._saveSoon();
        }

        counterGet(args) {
            const v = this.counters[this._str(args.NAME)];
            return v === undefined ? 0 : v;
        }

        counterReset(args) {
            delete this.counters[this._str(args.NAME)];
            this._saveSoon();
        }

        counterNames() {
            return new NormalArray(...Object.keys(this.counters));
        }

        statMessages() {
            return this.stats.messages;
        }

        statUsers() {
            return this.allUsers.length;
        }

        resetStats() {
            this.stats = { messages: 0, updates: 0 };
            this.startedAt = Date.now();
            this._saveSoon();
        }

        async _coords(city) {
            const geo = await this._json(
                "https://geocoding-api.open-meteo.com/v1/search?count=1&language=ru&format=json&name=" +
                    encodeURIComponent(this._str(city))
            );
            if (!geo || !geo.results || !geo.results.length) {
                this.lastError = "Город не найден: " + city;
                return null;
            }
            return geo.results[0];
        }

        async _weatherData(city) {
            const place = await this._coords(city);
            if (!place) return null;
            const data = await this._json(
                "https://api.open-meteo.com/v1/forecast?latitude=" +
                    place.latitude +
                    "&longitude=" +
                    place.longitude +
                    "&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto"
            );
            if (!data || !data.current) return null;
            data.__place = place;
            return data;
        }

        async weather(args) {
            const data = await this._weatherData(args.CITY);
            if (!data) return "не удалось узнать погоду";
            const c = data.current;
            const desc = WMO[c.weather_code] || "неясно";
            const name = data.__place ? data.__place.name : this._str(args.CITY);
            return (
                name +
                ": " +
                Math.round(c.temperature_2m) +
                "°C, " +
                desc +
                ", ощущается как " +
                Math.round(c.apparent_temperature) +
                "°C, влажность " +
                c.relative_humidity_2m +
                "%, ветер " +
                Math.round(c.wind_speed_10m) +
                " км/ч"
            );
        }

        async weatherTemp(args) {
            const data = await this._weatherData(args.CITY);
            if (!data) return "";
            return Math.round(data.current.temperature_2m);
        }

        async _rates(base) {
            const data = await this._json(
                "https://open.er-api.com/v6/latest/" + encodeURIComponent(String(base).toUpperCase())
            );
            if (data && data.rates) return data.rates;
            return null;
        }

        async currencyRate(args) {
            const from = this._str(args.FROM).toUpperCase() || "USD";
            const to = this._str(args.TO).toUpperCase() || "RUB";
            if (from === to) return 1;
            const rates = await this._rates(from);
            if (!rates) return "";
            const v = rates[to];
            return v === undefined ? "" : v;
        }

        async convertMoney(args) {
            const amount = this._num(args.AMOUNT, 0);
            const rate = await this.currencyRate(args);
            if (rate === "" || rate === null) return "";
            return Math.round(amount * Number(rate) * 100) / 100;
        }

        async cryptoPrice(args) {
            let coin = this._str(args.COIN).trim().toLowerCase();
            const aliases = {
                btc: "bitcoin", eth: "ethereum", ton: "the-open-network",
                sol: "solana", usdt: "tether", doge: "dogecoin",
                ltc: "litecoin", xrp: "ripple", trx: "tron", bnb: "binancecoin",
                not: "notcoin", pepe: "pepe", ada: "cardano",
            };
            if (aliases[coin]) coin = aliases[coin];
            let cur = this._str(args.CURRENCY).trim().toLowerCase() || "usd";
            if (cur === "руб" || cur === "р" || cur === "rur") cur = "rub";
            if (cur === "доллар" || cur === "$") cur = "usd";
            if (cur === "евро") cur = "eur";
            const data = await this._json(
                "https://api.coingecko.com/api/v3/simple/price?ids=" +
                    encodeURIComponent(coin) +
                    "&vs_currencies=" +
                    encodeURIComponent(cur)
            );
            if (!data || !data[coin] || data[coin][cur] === undefined) {
                this.lastError = "Криптовалюта не найдена: " + coin;
                return "";
            }
            return data[coin][cur];
        }

        qrCodeUrl(args) {
            return (
                "https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=" +
                encodeURIComponent(this._str(args.TEXT))
            );
        }

        async shortLink(args) {
            let url = this._str(args.URL).trim();
            if (!/^https?:\/\//i.test(url)) url = "https://" + url;
            const data = await this._json(
                "https://is.gd/create.php?format=json&url=" + encodeURIComponent(url)
            );
            if (data && data.shorturl) return data.shorturl;
            const short = await this._json(
                "https://tinyurl.com/api-create.php?url=" + encodeURIComponent(url),
                { timeout: 15000 }
            );
            if (typeof short === "string" && short.indexOf("http") === 0) return short.trim();
            return url;
        }

        async randomFact(args) {
            const mode = this._n("fact", args.SOURCE, "любой");
            const ru = () => RU_FACTS[Math.floor(Math.random() * RU_FACTS.length)];
            if (mode === "на русском") return ru();
            let online = "";
            const data = await this._json("https://uselessfacts.jsph.pl/api/v2/facts/random");
            if (data && data.text) online = data.text;
            else {
                const cat = await this._json("https://catfact.ninja/fact");
                if (cat && cat.fact) online = cat.fact;
            }
            if (!online) return ru();
            if (mode === "из интернета") return online;
            return Math.random() < 0.6 ? ru() : online;
        }

        async translateText(args) {
            const pair =
                encodeURIComponent(this._str(args.FROM).toLowerCase() || "en") +
                "|" +
                encodeURIComponent(this._str(args.TO).toLowerCase() || "ru");
            const data = await this._json(
                "https://api.mymemory.translated.net/get?q=" +
                    encodeURIComponent(this._str(args.TEXT).slice(0, 500)) +
                    "&langpair=" +
                    pair
            );
            if (data && data.responseData && data.responseData.translatedText)
                return data.responseData.translatedText;
            return this._str(args.TEXT);
        }

        aiSetup(args) {
            this.ai.key = this._str(args.KEY);
            this.ai.model = this._str(args.MODEL) || "gpt-4o-mini";
            this.ai.url = this._str(args.URL).replace(/\/+$/, "") || "https://api.openai.com/v1";
            this._log("Настройки ИИ обновлены");
        }

        aiRole(args) {
            this.ai.role = this._str(args.ROLE);
        }

        async aiAsk(args) {
            if (!this.ai.key) {
                this.lastError = "Не задан ключ ИИ (блок «ИИ: ключ...»)";
                return "";
            }
            const url = this.ai.url + "/chat/completions";
            try {
                const controller =
                    typeof AbortController !== "undefined" ? new AbortController() : null;
                const timer = controller ? setTimeout(() => controller.abort(), 60000) : null;
                const res = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + this.ai.key,
                    },
                    body: JSON.stringify({
                        model: this.ai.model,
                        messages: [
                            { role: "system", content: this.ai.role },
                            { role: "user", content: this._str(args.PROMPT) },
                        ],
                        temperature: 0.7,
                    }),
                    signal: controller ? controller.signal : undefined,
                });
                if (timer) clearTimeout(timer);
                const data = await res.json();
                if (data && data.choices && data.choices.length)
                    return data.choices[0].message.content;
                this.lastError =
                    (data && data.error && data.error.message) || "ИИ вернул пустой ответ";
                return "";
            } catch (e) {
                this.lastError = String(e && e.message ? e.message : e);
                return "";
            }
        }

        logText(args) {
            this._log(this._str(args.TEXT));
        }

        getLog() {
            return this.log;
        }

        clearLog() {
            this.log = new NormalArray();
        }

        getLastError() {
            return this.lastError;
        }

        // =================================================================
        //        ПЕРЕОПРЕДЕЛЕНИЯ ПОД DISCORD (должны идти ПОСЛЕ утилит)
        // =================================================================

        // Парсер команд: в Discord префикс обычно «!», а не «/».
        // Внутри приводим его к «/», чтобы блоки из Telegram-версии работали
        // без изменений.
        _cmdParts() {
            const msg = this._lastMessage();
            const text = msg ? msg.content || msg.text || "" : "";
            const parts = String(text).trim().split(/\s+/).filter((s) => s.length > 0);
            if (!parts.length) return [];
            const first = parts[0];
            if (first.startsWith("/")) return parts;
            const prefixes = ["!", "?", ".", "$", "-", "+", ">", ";"];
            for (const p of prefixes) {
                if (first.startsWith(p) && first.length > p.length) {
                    parts[0] = "/" + first.slice(p.length);
                    break;
                }
            }
            return parts;
        }

        sendLater(args) {
            const seconds = Math.max(0, this._num(args.SECONDS, 0));
            const text = this._str(args.TEXT);
            const channel =
                args.CHANNEL !== undefined ? args.CHANNEL : args.CHATID;
            setTimeout(() => {
                this._rest("POST", "/channels/" + channel + "/messages", { content: text });
            }, seconds * 1000);
        }

        deleteLater(args) {
            const seconds = Math.max(0, this._num(args.SECONDS, 0));
            const channel =
                args.CHANNEL !== undefined ? args.CHANNEL : args.CHATID;
            const id = args.ID !== undefined ? args.ID : args.MESSAGEID;
            setTimeout(() => {
                this._rest("DELETE", "/channels/" + channel + "/messages/" + id);
            }, seconds * 1000);
        }
    }

    Scratch.extensions.register(new DiscordBotAPIExtension());
})(Scratch);
