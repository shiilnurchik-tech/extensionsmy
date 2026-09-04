// Name: Telegram Bot API (RU)
// Description: Telegram Bot API на русском + фишки, которых нет в Telegram (БД, таймеры, антифлуд, склонения, генераторы, погода, курсы, QR, перевод, нейросеть)
// ID: TelegramBotAPI
/* 
    Telegram Bot API — русская версия с расширенными возможностями
    Оригинал: @DBDev_IT (Scratch @damir2809), @Fedor_sushko, @Grisshink,
              @MEOW_MUR920, @FXCHK404, @AnonimKingNews, @d_den4ik_12
    Русская версия + новые блоки: 2026

    ВАЖНО: расширение должно быть загружено БЕЗ песочницы (unsandboxed).

    Что нового по сравнению с оригиналом:
      • все блоки и меню переведены на русский (английские значения меню
        по-прежнему понимаются — старые проекты не сломаются);
      • исправлены баги оригинала (sendPhoto без фото, неполные права при мьюте,
        кнопки только в один ряд, отсутствие обработки ошибок);
      • добавлены 50+ новых блоков: база данных, таймеры и отложенные сообщения,
        антифлуд/кулдауны, парсер команд с аргументами, русские склонения,
        генераторы, регулярные выражения, JSON/base64/хеши, дата и время,
        статистика, погода, курсы валют и крипты, QR-код, сокращение ссылок,
        перевод, нейросеть.
*/

(function (Scratch) {
    "use strict";

    if (!Scratch.extensions.unsandboxed)
        throw new Error("Расширение Telegram Bot API должно быть загружено без песочницы (unsandboxed)!");

    const NormalArray = Scratch.NormalArray ? Scratch.NormalArray : Array;

    // ---------------------------------------------------------------------
    // Нормализация значений меню: и русские, и английские варианты понимаются
    // ---------------------------------------------------------------------
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
    };

    // Коды погоды WMO -> русское описание
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

    const STORE_KEY = "TelegramBotAPI_RU_store_v1";

    // Иконка расширения (Telegram самолётик на синем круге #0088CC)
    const ICON =
        "data:image/svg+xml;base64," +
        btoa(
            '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">' +
                '<circle cx="20" cy="20" r="20" fill="#0088CC"/>' +
                '<g transform="translate(4.5, 4.5) scale(1.3)">' +
                    '<path fill="#ffffff" d="M5.491 11.74l11.57-4.461c.537-.194 1.006.131.832.943l-1.97 9.281c-.146.658-.537.818-1.084.508l-3-2.211-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953z"/>' +
                '</g>' +
            '</svg>'
        );

    class TelegramBotAPIExtension {
        constructor() {
            this.token = "";
            this.updates = [];
            this.offset = 0;
            this.pollingActive = false;
            this.pollingRunning = false;
            this.allUsers = new NormalArray();
            this.lastCommand = "";
            this.inlineButtons = new NormalArray();
            this.pollAnswers = new NormalArray();
            this.buttonsPerRow = 0; // 0 = все кнопки в один ряд

            // --- новое ---
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
            this.events = { update: false, message: false, command: null, callback: null, timer: null };
            this.ai = {
                key: "",
                model: "gpt-4o-mini",
                url: "https://api.openai.com/v1",
                role: "Ты — дружелюбный помощник. Отвечай кратко на русском языке.",
            };
            this._saveTimer = null;
            this._loadStore();
        }

        // =================================================================
        //                        ОПИСАНИЕ РАСШИРЕНИЯ
        // =================================================================
        getInfo() {
            return {
                id: "TelegramBotAPI",
                name: "Телеграм Бот API",
                color1: "#0088CC",
                color2: "#006699",
                color3: "#004d73",
                menuIconURI: ICON,
                blockIconURI: ICON,
                docsURI: "https://github.com/DBDev-IT/TelegramBotAPI",
                blocks: [
                    { blockType: Scratch.BlockType.LABEL, text: "Инициализация" },
                    {
                        opcode: "initBot",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "инициализировать бота с токеном [TOKEN]",
                        arguments: {
                            TOKEN: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "ТОКЕН",
                            },
                        },
                    },
                    {
                        opcode: "startPolling",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "запустить приём обновлений",
                    },
                    {
                        opcode: "stopPolling",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "остановить приём обновлений",
                    },
                    {
                        opcode: "getMe",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "информация о боте: [INFO]",
                        arguments: {
                            INFO: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "BOTINFO_MENU",
                            },
                        },
                    },

                    { blockType: Scratch.BlockType.LABEL, text: "Сообщения" },
                    {
                        opcode: "sendMessage",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "отправить [TEXT] в чат [CHATID] с форматированием [PARSE_MODE] с кнопками [BUTTONS]",
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Привет!",
                            },
                            BUTTONS: { type: Scratch.ArgumentType.ARRAY },
                            PARSE_MODE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "PARSE_MODE_MENU",
                            },
                            CHATID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                        },
                    },
                    {
                        opcode: "replyToMessage",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "ответить [TEXT] на сообщение [MESSAGEID] в чате [CHATID] с форматированием [PARSE_MODE] с кнопками [BUTTONS]",
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Как дела?",
                            },
                            MESSAGEID: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 1,
                            },
                            BUTTONS: { type: Scratch.ArgumentType.ARRAY },
                            PARSE_MODE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "PARSE_MODE_MENU",
                            },
                            CHATID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                        },
                    },
                    {
                        opcode: "sendPhoto",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "отправить фото [URL] с подписью [TEXT] в чат [CHATID] с форматированием [PARSE_MODE] с кнопками [BUTTONS]",
                        arguments: {
                            URL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "https://example.com/photo.png",
                            },
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Смотри!",
                            },
                            PARSE_MODE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "PARSE_MODE_MENU",
                            },
                            BUTTONS: { type: Scratch.ArgumentType.ARRAY },
                            CHATID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                        },
                    },
                    {
                        opcode: "sendSticker",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "отправить стикер [STICKERID] в чат [CHATID]",
                        arguments: {
                            STICKERID: { type: Scratch.ArgumentType.STRING },
                            CHATID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                        },
                    },
                    {
                        opcode: "sendDocument",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "отправить файл [URL] с подписью [TEXT] в чат [CHATID]",
                        arguments: {
                            URL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "https://example.com/file.pdf",
                            },
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Файл",
                            },
                            CHATID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                        },
                    },
                    {
                        opcode: "sendVideo",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "отправить видео [URL] с подписью [TEXT] в чат [CHATID]",
                        arguments: {
                            URL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "https://example.com/video.mp4",
                            },
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Видео",
                            },
                            CHATID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                        },
                    },
                    {
                        opcode: "sendAnimation",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "отправить гифку [URL] с подписью [TEXT] в чат [CHATID]",
                        arguments: {
                            URL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "https://example.com/anim.gif",
                            },
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Гифка",
                            },
                            CHATID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                        },
                    },
                    {
                        opcode: "sendDice",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "бросить [EMOJI] в чат [CHATID]",
                        arguments: {
                            EMOJI: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "DICE_MENU",
                            },
                            CHATID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                        },
                    },
                    {
                        opcode: "sendAction",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "показать в чате [CHATID] статус [ACTION]",
                        arguments: {
                            ACTION: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "ACTION_MENU",
                            },
                            CHATID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                        },
                    },
                    {
                        opcode: "sendPoll",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "отправить опрос [QUESTION] с вариантами [OPTIONS] настройки: [ISANONIM] [ALLOWSMULTIPLE] в чат [CHATID]",
                        arguments: {
                            QUESTION: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Опрос",
                            },
                            ISANONIM: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "POLL_ISANONIM_MENU",
                            },
                            ALLOWSMULTIPLE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "POLL_ALLOWSMULTIPLE_MENU",
                            },
                            OPTIONS: { type: Scratch.ArgumentType.ARRAY },
                            CHATID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                        },
                    },
                    {
                        opcode: "sendQuiz",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "отправить викторину [QUESTION] с вариантами [OPTIONS] верный номер [RIGHT] в чат [CHATID]",
                        arguments: {
                            QUESTION: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Столица России?",
                            },
                            RIGHT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
                            OPTIONS: { type: Scratch.ArgumentType.ARRAY },
                            CHATID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                        },
                    },
                    {
                        opcode: "editMessageText",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "изменить текст сообщения [MESSAGEID] в чате [CHATID] на [TEXT] с форматированием [PARSE_MODE] с кнопками [BUTTONS]",
                        arguments: {
                            MESSAGEID: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 1,
                            },
                            CHATID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Спасибо!",
                            },
                            PARSE_MODE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "PARSE_MODE_MENU",
                            },
                            BUTTONS: { type: Scratch.ArgumentType.ARRAY },
                        },
                    },
                    {
                        opcode: "deleteMessage",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "удалить сообщение [MESSAGEID] из чата [CHATID]",
                        arguments: {
                            MESSAGEID: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 1,
                            },
                            CHATID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                        },
                    },
                    {
                        opcode: "pinMessage",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "закрепить сообщение [MESSAGEID] в чате [CHATID]",
                        arguments: {
                            MESSAGEID: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 1,
                            },
                            CHATID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                        },
                    },
                    {
                        opcode: "unpinMessage",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "открепить сообщение [MESSAGEID] из чата [CHATID]",
                        arguments: {
                            MESSAGEID: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 1,
                            },
                            CHATID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                        },
                    },

                    { blockType: Scratch.BlockType.LABEL, text: "Права пользователей" },
                    {
                        opcode: "kickUser",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "кикнуть пользователя [USERID] из чата [CHATID]",
                        arguments: {
                            USERID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                            CHATID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                        },
                    },
                    {
                        opcode: "muteUser",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "заглушить пользователя [USERID] в чате [CHATID]",
                        arguments: {
                            USERID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                            CHATID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                        },
                    },
                    {
                        opcode: "muteUserFor",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "заглушить пользователя [USERID] в чате [CHATID] на [MINUTES] минут",
                        arguments: {
                            USERID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                            CHATID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                            MINUTES: { type: Scratch.ArgumentType.NUMBER, defaultValue: 5 },
                        },
                    },
                    {
                        opcode: "unmuteUser",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "снять мьют с пользователя [USERID] в чате [CHATID]",
                        arguments: {
                            USERID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                            CHATID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                        },
                    },
                    {
                        opcode: "banUser",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "забанить пользователя [USERID] в чате [CHATID]",
                        arguments: {
                            USERID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                            CHATID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                        },
                    },
                    {
                        opcode: "unbanUser",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "разбанить пользователя [USERID] в чате [CHATID]",
                        arguments: {
                            USERID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                            CHATID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                        },
                    },

                    { blockType: Scratch.BlockType.LABEL, text: "Реакции" },
                    {
                        opcode: "setReaction",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "поставить реакцию [REACTION] на сообщение [MESSAGEID] в чате [CHATID]",
                        arguments: {
                            REACTION: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "REACTION_MENU",
                            },
                            MESSAGEID: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 1,
                            },
                            CHATID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                        },
                    },

                    { blockType: Scratch.BlockType.LABEL, text: "Массивы и кнопки" },
                    {
                        opcode: "addInlineButtonToInlineButtonsArray",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "добавить кнопку [TEXT] типа [TYPE] с данными [DATA] в массив кнопок",
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Кнопка 1",
                            },
                            TYPE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "INLINE_BUTTONS_ARRAY_TYPE_MENU",
                            },
                            DATA: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "data_1",
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
                        text: "располагать кнопки по [COUNT] в ряд (0 = все в ряд)",
                        arguments: {
                            COUNT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                        },
                    },
                    {
                        opcode: "addPollAnswerToPollAnswersArray",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "добавить вариант [TEXT] в массив вариантов опроса",
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Вариант 1",
                            },
                        },
                    },
                    {
                        opcode: "clearArray",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "очистить массив [CLEAR_ARRAY]",
                        arguments: {
                            CLEAR_ARRAY: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "CLEAR_ARRAY_MENU",
                            },
                        },
                    },
                    {
                        opcode: "getArray",
                        blockType: Scratch.BlockType.ARRAY,
                        text: "массив [ARRAY]",
                        arguments: {
                            ARRAY: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "ARRAY_MENU",
                            },
                        },
                    },


                    { blockType: Scratch.BlockType.LABEL, text: "Обновления" },
                    { blockType: Scratch.BlockType.LABEL, text: "1. Сообщения" },
                    {
                        opcode: "getMessage",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "[GETMESSAGE_TYPE] последнего сообщения",
                        arguments: {
                            GETMESSAGE_TYPE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "GETMESSAGE_TYPE_MENU",
                            },
                        },
                    },
                    { blockType: Scratch.BlockType.LABEL, text: "2. Колбэки (нажатия кнопок)" },
                    {
                        opcode: "getCallback",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "[GETCALLBACK_TYPE] последнего колбэка",
                        arguments: {
                            GETCALLBACK_TYPE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "GETCALLBACK_TYPE_MENU",
                            },
                        },
                    },
                    {
                        opcode: "answerToCallback",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "ответить на колбэк [ID] типом [TYPE] с текстом [TEXT]",
                        arguments: {
                            ID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "1000000000",
                            },
                            TYPE: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "CALLBACK_ANSWER_TYPE_MENU",
                            },
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Готово!",
                            },
                        },
                    },
                    { blockType: Scratch.BlockType.LABEL, text: "3. Проверки обновлений" },
                    {
                        opcode: "hasNewMessages",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "есть новые сообщения?",
                    },
                    {
                        opcode: "isMessageStartsWith",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "последнее сообщение начинается с [TEXT]?",
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "/start",
                            },
                        },
                    },
                    {
                        opcode: "isCallback",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "последнее обновление — нажатие кнопки?",
                    },
                    {
                        opcode: "isCallbackEquals",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "данные колбэка равны [TEXT]?",
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "data_1",
                            },
                        },
                    },

                    { blockType: Scratch.BlockType.LABEL, text: "Пользователи" },
                    {
                        opcode: "getAllUsers",
                        blockType: Scratch.BlockType.ARRAY,
                        text: "все пользователи",
                    },
                    {
                        opcode: "isAdmin",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "пользователь [USERID] — админ в чате [CHATID]?",
                        arguments: {
                            USERID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                            CHATID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                        },
                    },
                    {
                        opcode: "isSubscribed",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "пользователь [USERID] подписан на [CHANNEL]?",
                        arguments: {
                            USERID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                            CHANNEL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "@my_channel",
                            },
                        },
                    },
                    {
                        opcode: "isSubscribedToAll",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "пользователь [USERID] подписан на все каналы из [ARRAY]?",
                        arguments: {
                            USERID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                            ARRAY: { type: Scratch.ArgumentType.ARRAY },
                        },
                    },
                    {
                        opcode: "chatMemberStatus",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "статус пользователя [USERID] в чате [CHANNEL]",
                        arguments: {
                            USERID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                            CHANNEL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "@my_channel",
                            },
                        },
                    },
                    {
                        opcode: "chatMemberCount",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "участников в чате [CHATID]",
                        arguments: {
                            CHATID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                        },
                    },
                    {
                        opcode: "userAvatar",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "ссылка на аватар пользователя [USERID]",
                        arguments: {
                            USERID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                        },
                    },
                    {
                        opcode: "getFileUrl",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "ссылка на файл [FILEID]",
                        arguments: {
                            FILEID: { type: Scratch.ArgumentType.STRING },
                        },
                    },

                    { blockType: Scratch.BlockType.LABEL, text: "События" },
                    {
                        opcode: "whenNewUpdate",
                        blockType: Scratch.BlockType.HAT,
                        text: "когда получено новое обновление",
                    },
                    {
                        opcode: "whenNewMessage",
                        blockType: Scratch.BlockType.HAT,
                        text: "когда пришло новое сообщение",
                    },
                    {
                        opcode: "whenCommand",
                        blockType: Scratch.BlockType.HAT,
                        text: "когда пришла команда [TEXT]",
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "/start",
                            },
                        },
                    },
                    {
                        opcode: "whenCallback",
                        blockType: Scratch.BlockType.HAT,
                        text: "когда нажата кнопка с данными [DATA]",
                        arguments: {
                            DATA: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "",
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
                    {
                        opcode: "clearUpdates",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "очистить обновления",
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
                        text: "отправить [TEXT] в чат [CHATID] через [SECONDS] секунд",
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Привет через минуту!",
                            },
                            CHATID: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "123456789",
                            },
                            SECONDS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 10 },
                        },
                    },
                    {
                        opcode: "deleteLater",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "удалить сообщение [MESSAGEID] из чата [CHATID] через [SECONDS] секунд",
                        arguments: {
                            MESSAGEID: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 1,
                            },
                            CHATID: {
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
                    {
                        opcode: "setBotCommands",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "установить меню команд из массива [ARRAY] (строки «команда | описание»)",
                        arguments: { ARRAY: { type: Scratch.ArgumentType.ARRAY } },
                    },
                    {
                        opcode: "clearBotCommands",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "очистить меню команд",
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
                    PARSE_MODE_MENU: {
                        items: ["нет", "Markdown", "HTML", "MarkdownV2"],
                    },
                    INLINE_BUTTONS_ARRAY_TYPE_MENU: {
                        items: ["данные", "ссылка", "новый ряд"],
                    },
                    CALLBACK_ANSWER_TYPE_MENU: {
                        items: ["всплывающее", "предупреждение"],
                    },
                    GETMESSAGE_TYPE_MENU: {
                        items: [
                            "текст",
                            "id",
                            "id чата",
                            "команда",
                            "ник",
                            "id пользователя",
                            "id стикера",
                            "имя",
                            "фамилия",
                            "полное имя",
                            "аргументы",
                            "время",
                            "тип чата",
                            "название чата",
                            "язык",
                            "премиум",
                            "бот",
                            "id ответа",
                            "id фото",
                            "id документа",
                        ],
                    },
                    GETCALLBACK_TYPE_MENU: {
                        items: [
                            "данные",
                            "id",
                            "id чата",
                            "ник",
                            "id пользователя",
                            "id сообщения",
                            "текст сообщения",
                        ],
                    },
                    POLL_ISANONIM_MENU: { items: ["анонимный", "публичный"] },
                    POLL_ALLOWSMULTIPLE_MENU: {
                        items: ["несколько ответов", "один ответ"],
                    },
                    REACTION_MENU: {
                        items: [
                            "👍", "👎", "❤", "🔥", "🥰", "👏", "😁", "🤔", "🤯",
                            "😱", "🤬", "😢", "🎉", "🤩", "🤮", "💩", "🙏", "👌",
                            "🕊", "🤡", "🥱", "🥴", "😍", "🐳", "❤‍🔥", "🌚", "🌭",
                            "💯", "🤣", "⚡", "🍌", "🏆", "💔", "🤨", "😐", "🍓",
                            "🍾", "💋", "🖕", "😈", "😴", "😭", "🤓", "👻", "👨‍💻",
                            "👀", "🎃", "🙈", "😇", "😨", "🤝", "✍", "🤗", "🫡",
                            "🎅", "🎄", "☃", "💅", "🤪", "🗿", "🆒", "💘", "🙉",
                            "🦄", "😘", "💊", "🙊", "😎", "👾", "🤷‍♂", "🤷",
                            "🤷‍♀", "😡",
                        ],
                    },
                    CLEAR_ARRAY_MENU: { items: ["кнопки", "варианты опроса"] },
                    ARRAY_MENU: { items: ["кнопки", "варианты опроса"] },
                    DICE_MENU: { items: ["🎲", "🎯", "🏀", "⚽", "🎳", "🎰"] },
                    ACTION_MENU: {
                        items: [
                            "печатает",
                            "отправляет фото",
                            "отправляет видео",
                            "снимает видео",
                            "отправляет голосовое",
                            "отправляет документ",
                            "выбирает стикер",
                        ],
                    },
                    BOTINFO_MENU: {
                        items: ["ник", "имя", "id", "может ли читать группы"],
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
                    RANDSTR_MENU: {
                        items: ["цифры", "буквы", "буквы и цифры", "пароль", "эмодзи"],
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
                },
            };
        }

        // =================================================================
        //                          УТИЛИТЫ
        // =================================================================

        // Нормализация значения меню (русское и английское понимаются одинаково)
        _n(group, value, fallback) {
            const map = NORM[group];
            if (!map) return value;
            const v = String(value === undefined || value === null ? "" : value)
                .trim()
                .toLowerCase();
            if (map[v] === undefined) return fallback === undefined ? value : fallback;
            return map[v];
        }

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

        // Универсальный вызов Telegram Bot API
        async _call(method, params, options) {
            if (!this.token) {
                this.lastError = "Бот не инициализирован: нет токена";
                return null;
            }
            const timeout = (options && options.timeout) || 20000;
            const url = "https://api.telegram.org/bot" + this.token + "/" + method;
            try {
                const controller =
                    typeof AbortController !== "undefined" ? new AbortController() : null;
                const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;
                const res = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(params || {}),
                    signal: controller ? controller.signal : undefined,
                });
                if (timer) clearTimeout(timer);
                const data = await res.json();
                if (!data.ok) {
                    this.lastError = data.description || ("Ошибка " + method);
                    this._log("Ошибка " + method + ": " + this.lastError);
                    return null;
                }
                return data.result;
            } catch (e) {
                this.lastError = String(e && e.message ? e.message : e);
                this._log("Сбой " + method + ": " + this.lastError);
                return null;
            }
        }

        // Сборка inline-клавиатуры из массива (поддерживаются объекты,
        // строки «текст | данные», ссылки http(s) и разделители рядов)
        _keyboard(list) {
            if (!list || !list.length) return null;
            const items = [];
            for (const raw of list) {
                let b = raw;
                if (b === "\n" || b === "" || b === null || b === undefined) {
                    items.push("\n");
                    continue;
                }
                if (typeof b === "string") {
                    const parts = b.split("|");
                    if (parts.length >= 2) {
                        const text = parts[0].trim();
                        const data = parts.slice(1).join("|").trim();
                        b = /^https?:\/\//i.test(data)
                            ? { text: text, url: data }
                            : { text: text, callback_data: data };
                    } else {
                        b = { text: b.trim(), callback_data: b.trim() };
                    }
                }
                if (b && b.__row) {
                    items.push("\n");
                    continue;
                }
                if (b && (b.text !== undefined)) items.push(b);
            }
            const rows = [];
            let row = [];
            const perRow = this.buttonsPerRow > 0 ? Math.floor(this.buttonsPerRow) : 0;
            for (const item of items) {
                if (item === "\n") {
                    if (row.length) rows.push(row);
                    row = [];
                    continue;
                }
                row.push(item);
                if (perRow > 0 && row.length >= perRow) {
                    rows.push(row);
                    row = [];
                }
            }
            if (row.length) rows.push(row);
            return rows.length ? rows : null;
        }

        // Добавить форматирование и кнопки к параметрам запроса
        _markup(payload, args, captionKey) {
            const mode = this._n("parse", args.PARSE_MODE, "нет");
            if (mode !== "нет") payload.parse_mode = mode;
            const kb = this._keyboard(args.BUTTONS);
            if (kb) payload.reply_markup = { inline_keyboard: kb };
            if (captionKey && args.TEXT !== undefined) payload.caption = args.TEXT;
        }

        // Запрос к внешнему JSON-API с таймаутом
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

        // Русские склонения: 1 сообщение, 2 сообщения, 5 сообщений
        _plural(n, one, few, many) {
            const abs = Math.abs(Math.floor(Number(n) || 0));
            const mod100 = abs % 100;
            const last = abs % 10;
            if (mod100 > 10 && mod100 < 20) return many;
            if (last > 1 && last < 5) return few;
            if (last === 1) return one;
            return many;
        }

        // -------------------- хранилище (БД, счётчики, статистика) --------------------
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

        // =================================================================
        //                       ИНИЦИАЛИЗАЦИЯ
        // =================================================================
        resetBot(args) {
            this.token = args.TOKEN;
            this.updates = [];
            this.offset = 0;
            this.allUsers = new NormalArray();
            this.lastCommand = "";
        }

        initBot(args) {
            this.pollingActive = false;

            return new Promise((resolve, _) => {
                const checkPoll = () => {
                    if (this.pollingRunning) {
                        setTimeout(checkPoll, 100);
                        return;
                    }
                    this.resetBot(args);
                    this._log("Бот инициализирован");
                    resolve();
                };
                checkPoll();
            });
        }

        startPolling(args) {
            if (!this.token || this.pollingActive || this.pollingRunning) return;
            const poll = () => {
                this.pollingRunning = true;
                const url =
                    "https://api.telegram.org/bot" +
                    this.token +
                    "/getUpdates?offset=" +
                    this.offset;
                fetch(url)
                    .then((response) => {
                        if (!response.ok) {
                            console.error(response.status);
                            this.lastError = "getUpdates: HTTP " + response.status;
                        }
                        return response.json();
                    })
                    .then((data) => {
                        if (data.ok && data.result.length > 0) {
                            this.updates = data.result;
                            this.offset = this.updates[this.updates.length - 1].update_id + 1;
                            this._updateUsers();
                            this._processEvents();
                        }
                        if (!this.pollingActive) {
                            this.pollingRunning = false;
                            return;
                        }
                        setTimeout(poll, (args && args.SECONDS ? args.SECONDS : 1) * 1000);
                    })
                    .catch((error) => {
                        if (!this.pollingActive) {
                            this.pollingRunning = false;
                            return;
                        }
                        console.error(error);
                        this.lastError = String(error);
                        setTimeout(poll, (args && args.SECONDS ? args.SECONDS : 1) * 1000);
                    });
            };
            this.pollingActive = true;
            poll();
        }

        stopPolling() {
            this.pollingActive = false;
        }

        // Разбор полученных обновлений: заполняем события для шляпных блоков
        _processEvents() {
            this.events.update = true;
            this.stats.updates += this.updates.length;
            let hasMessage = false;
            for (const upd of this.updates) {
                if (upd.message) {
                    hasMessage = true;
                    this.stats.messages++;
                    const text = upd.message.text || upd.message.caption || "";
                    if (text.startsWith("/")) {
                        let cmd = text.split(" ")[0].split("@")[0];
                        this.lastCommand = cmd;
                        this.events.command = cmd;
                    }
                }
                if (upd.callback_query) {
                    this.events.callback = upd.callback_query.data || "";
                }
            }
            if (hasMessage) this.events.message = true;
        }

        _updateUsers() {
            this.updates.forEach((update) => {
                let from = null;
                let chatId = null;
                if (update.message) {
                    from = update.message.from;
                    chatId = update.message.chat.id;
                } else if (update.callback_query) {
                    from = update.callback_query.from;
                    chatId =
                        update.callback_query.message && update.callback_query.message.chat
                            ? update.callback_query.message.chat.id
                            : null;
                }
                if (from && chatId !== null) {
                    const user = {
                        chatId: String(chatId),
                        username: from.username || String(from.id) || "Unknown",
                    };
                    const userKey = user.chatId + ":" + user.username;
                    if (!this.allUsers.includes(userKey)) this.allUsers.push(userKey);
                }
            });
        }

        async getMe(args) {
            const info = this._n("botInfo", args.INFO, "ник");
            const me = await this._call("getMe", {});
            if (!me) return "";
            if (info === "ник") return "@" + (me.username || "");
            if (info === "имя") return me.first_name || "";
            if (info === "id") return String(me.id || "");
            if (info === "может ли читать группы")
                return me.can_join_groups || me.can_read_all_group_messages ? "да" : "нет";
            return "";
        }

        // =================================================================
        //                         СООБЩЕНИЯ
        // =================================================================
        async sendMessage(args) {
            const payload = { chat_id: args.CHATID, text: args.TEXT };
            this._markup(payload, args);
            await this._call("sendMessage", payload);
        }

        async replyToMessage(args) {
            const payload = {
                chat_id: args.CHATID,
                text: args.TEXT,
                reply_to_message_id: args.MESSAGEID,
            };
            this._markup(payload, args);
            await this._call("sendMessage", payload);
        }

        async sendPhoto(args) {
            const payload = { chat_id: args.CHATID, photo: args.URL, caption: args.TEXT };
            this._markup(payload, args, true);
            await this._call("sendPhoto", payload);
        }

        async sendSticker(args) {
            await this._call("sendSticker", {
                chat_id: args.CHATID,
                sticker: args.STICKERID,
            });
        }

        async sendDocument(args) {
            await this._call("sendDocument", {
                chat_id: args.CHATID,
                document: args.URL,
                caption: args.TEXT,
            });
        }

        async sendVideo(args) {
            await this._call("sendVideo", {
                chat_id: args.CHATID,
                video: args.URL,
                caption: args.TEXT,
            });
        }

        async sendAnimation(args) {
            await this._call("sendAnimation", {
                chat_id: args.CHATID,
                animation: args.URL,
                caption: args.TEXT,
            });
        }

        async sendDice(args) {
            await this._call("sendDice", {
                chat_id: args.CHATID,
                emoji: this._n("dice", args.EMOJI, "🎲"),
            });
        }

        async sendAction(args) {
            await this._call("sendChatAction", {
                chat_id: args.CHATID,
                action: this._n("action", args.ACTION, "typing"),
            });
        }

        async sendPoll(args) {
            await this._call("sendPoll", {
                chat_id: args.CHATID,
                question: args.QUESTION,
                options: (args.OPTIONS || []).map((o) => this._str(o)),
                is_anonymous: this._n("anon", args.ISANONIM, true),
                allows_multiple_answers: this._n("multi", args.ALLOWSMULTIPLE, false),
            });
        }

        async sendQuiz(args) {
            const options = (args.OPTIONS || []).map((o) => this._str(o));
            let right = Math.floor(this._num(args.RIGHT, 1)) - 1;
            if (right < 0) right = 0;
            if (right >= options.length) right = Math.max(0, options.length - 1);
            await this._call("sendPoll", {
                chat_id: args.CHATID,
                question: args.QUESTION,
                options: options,
                type: "quiz",
                correct_option_id: right,
                is_anonymous: false,
            });
        }

        async editMessageText(args) {
            const payload = {
                chat_id: args.CHATID,
                message_id: args.MESSAGEID,
                text: args.TEXT,
            };
            // Telegram умеет менять и форматирование, и кнопки при редактировании
            this._markup(payload, args);
            await this._call("editMessageText", payload);
        }

        async deleteMessage(args) {
            await this._call("deleteMessage", {
                chat_id: args.CHATID,
                message_id: args.MESSAGEID,
            });
        }

        async pinMessage(args) {
            await this._call("pinChatMessage", {
                chat_id: args.CHATID,
                message_id: args.MESSAGEID,
            });
        }

        async unpinMessage(args) {
            await this._call("unpinChatMessage", {
                chat_id: args.CHATID,
                message_id: args.MESSAGEID,
            });
        }

        // =================================================================
        //                         ПРАВА ПОЛЬЗОВАТЕЛЕЙ
        // =================================================================
        async kickUser(args) {
            // kickChatMember устарел: сначала бан, затем разбан
            await this._call("banChatMember", {
                chat_id: args.CHATID,
                user_id: args.USERID,
            });
            await this._call("unbanChatMember", {
                chat_id: args.CHATID,
                user_id: args.USERID,
            });
        }

        async _restrict(userId, chatId, allowed, untilDate) {
            const p = {
                can_send_messages: allowed,
                can_send_audios: allowed,
                can_send_documents: allowed,
                can_send_photos: allowed,
                can_send_videos: allowed,
                can_send_video_notes: allowed,
                can_send_voice_notes: allowed,
                can_send_polls: allowed,
                can_send_other_messages: allowed,
                can_add_web_page_previews: allowed,
                can_change_info: false,
                can_invite_users: false,
                can_pin_messages: false,
                can_manage_topics: false,
            };
            const payload = {
                chat_id: chatId,
                user_id: userId,
                permissions: p,
            };
            if (untilDate) payload.until_date = untilDate;
            await this._call("restrictChatMember", payload);
        }

        async muteUser(args) {
            await this._restrict(args.USERID, args.CHATID, false, 0);
        }

        async muteUserFor(args) {
            const minutes = Math.max(1, this._num(args.MINUTES, 5));
            const until = Math.floor(Date.now() / 1000) + minutes * 60;
            await this._restrict(args.USERID, args.CHATID, false, until);
        }

        async unmuteUser(args) {
            await this._restrict(args.USERID, args.CHATID, true, 0);
        }

        async banUser(args) {
            await this._call("banChatMember", {
                chat_id: args.CHATID,
                user_id: args.USERID,
            });
        }

        async unbanUser(args) {
            await this._call("unbanChatMember", {
                chat_id: args.CHATID,
                user_id: args.USERID,
            });
        }

        // =================================================================
        //                            РЕАКЦИИ
        // =================================================================
        async setReaction(args) {
            const reaction = [{ type: "emoji", emoji: args.REACTION }];
            await this._call("setMessageReaction", {
                chat_id: args.CHATID,
                message_id: args.MESSAGEID,
                reaction: JSON.stringify(reaction),
            });
        }

        // =================================================================
        //                       МАССИВЫ И КНОПКИ
        // =================================================================
        addInlineButtonToInlineButtonsArray(args) {
            const type = this._n("btn", args.TYPE, "данные");
            if (type === "\n") {
                this.inlineButtons.push("\n");
            } else if (type === "ссылка") {
                this.inlineButtons.push({ text: args.TEXT, url: args.DATA });
            } else {
                this.inlineButtons.push({ text: args.TEXT, callback_data: args.DATA });
            }
        }

        addRowSeparator() {
            this.inlineButtons.push("\n");
        }

        setButtonsPerRow(args) {
            this.buttonsPerRow = Math.max(0, Math.floor(this._num(args.COUNT, 0)));
        }

        addPollAnswerToPollAnswersArray(args) {
            this.pollAnswers.push(args.TEXT);
        }

        clearArray(args) {
            const which = this._n("arr", args.CLEAR_ARRAY, "кнопки");
            if (which === "варианты опроса") this.pollAnswers = new NormalArray();
            else this.inlineButtons = new NormalArray();
        }

        getArray(args) {
            const which = this._n("arr", args.ARRAY, "кнопки");
            if (which === "варианты опроса") return this.pollAnswers;
            return this.inlineButtons;
        }

        // =================================================================
        //                           ОБНОВЛЕНИЯ
        // =================================================================
        _lastUpdate() {
            if (!this.updates.length) return null;
            return this.updates[this.updates.length - 1];
        }

        _lastMessage() {
            const u = this._lastUpdate();
            if (u && u.message) return u.message;
            // если последнее обновление — колбэк, берём сообщение из него
            if (u && u.callback_query && u.callback_query.message)
                return u.callback_query.message;
            return null;
        }

        getMessage(args) {
            const type = this._n("msg", args.GETMESSAGE_TYPE, "текст");
            const msg = this._lastMessage();
            if (!msg) return "";
            const from = msg.from || {};
            const chat = msg.chat || {};
            switch (type) {
                case "текст":
                    return msg.text || msg.caption || "";
                case "id":
                    return String(msg.message_id);
                case "id чата":
                    return String(chat.id);
                case "команда": {
                    const t = msg.text || "";
                    if (t.startsWith("/")) this.lastCommand = t.split(" ")[0].split("@")[0];
                    return this.lastCommand;
                }
                case "ник":
                    return from.username || "";
                case "id пользователя":
                    return String(from.id === undefined ? "" : from.id);
                case "id стикера":
                    return msg.sticker ? msg.sticker.file_id : "";
                case "имя":
                    return from.first_name || "";
                case "фамилия":
                    return from.last_name || "";
                case "полное имя":
                    return ((from.first_name || "") + " " + (from.last_name || "")).trim();
                case "аргументы": {
                    const parts = (msg.text || "").trim().split(/\s+/);
                    return parts.slice(1).join(" ");
                }
                case "время":
                    return msg.date ? String(msg.date) : "";
                case "тип чата":
                    return chat.type || "";
                case "название чата":
                    return chat.title || chat.first_name || "";
                case "язык":
                    return from.language_code || "";
                case "премиум":
                    return from.is_premium ? "да" : "нет";
                case "бот":
                    return from.is_bot ? "да" : "нет";
                case "id ответа":
                    return msg.reply_to_message ? String(msg.reply_to_message.message_id) : "";
                case "id фото":
                    return msg.photo && msg.photo.length
                        ? msg.photo[msg.photo.length - 1].file_id
                        : "";
                case "id документа":
                    return msg.document
                        ? msg.document.file_id
                        : msg.video
                        ? msg.video.file_id
                        : msg.voice
                        ? msg.voice.file_id
                        : msg.animation
                        ? msg.animation.file_id
                        : "";
                default:
                    return "";
            }
        }

        getCallback(args) {
            const type = this._n("cb", args.GETCALLBACK_TYPE, "данные");
            const u = this._lastUpdate();
            const cb = u ? u.callback_query : null;
            if (!cb) return "";
            const from = cb.from || {};
            switch (type) {
                case "данные":
                    return cb.data || "";
                case "id":
                    return String(cb.id || "");
                case "id чата":
                    return cb.message && cb.message.chat ? String(cb.message.chat.id) : "";
                case "ник":
                    return from.username || "";
                case "id пользователя":
                    return String(from.id === undefined ? "" : from.id);
                case "id сообщения":
                    return cb.message ? String(cb.message.message_id) : "";
                case "текст сообщения":
                    return cb.message ? cb.message.text || "" : "";
                default:
                    return "";
            }
        }

        async answerToCallback(args) {
            await this._call("answerCallbackQuery", {
                callback_query_id: args.ID,
                text: args.TEXT,
                show_alert: this._n("cbAnswer", args.TYPE, "всплывающее") === "предупреждение",
            });
        }

        hasNewMessages() {
            return this.updates.length > 0;
        }

        isMessageStartsWith(args) {
            const msg = this._lastMessage();
            const text = msg ? msg.text || msg.caption || "" : "";
            return text.startsWith(this._str(args.TEXT));
        }

        isCallback() {
            const u = this._lastUpdate();
            return !!(u && u.callback_query);
        }

        isCallbackEquals(args) {
            const u = this._lastUpdate();
            if (!u || !u.callback_query) return false;
            return (u.callback_query.data || "") === this._str(args.TEXT);
        }

        getAllUsers() {
            return this.allUsers;
        }

        whenNewUpdate() {
            if (this.events.update) {
                this.events.update = false;
                return true;
            }
            return false;
        }

        whenNewMessage() {
            if (this.events.message) {
                this.events.message = false;
                return true;
            }
            return false;
        }

        whenCommand(args) {
            const cmd = this.events.command;
            if (!cmd) return false;
            const want = this._str(args.TEXT).trim();
            if (want && want !== "/" && want !== cmd) return false;
            this.events.command = null;
            return true;
        }

        whenCallback(args) {
            const data = this.events.callback;
            if (data === null || data === undefined) return false;
            const want = this._str(args.DATA).trim();
            if (want && want !== data) return false;
            this.events.callback = null;
            return true;
        }

        async clearUpdates() {
            this.updates = [];
            this.lastCommand = "";
            this.events.update = false;
            this.events.message = false;
            this.events.command = null;
            this.events.callback = null;
        }

        // =================================================================
        //                          ПОЛЬЗОВАТЕЛИ
        // =================================================================
        async isAdmin(args) {
            const member = await this._call("getChatMember", {
                chat_id: args.CHATID,
                user_id: args.USERID,
            });
            if (!member) return false;
            return ["creator", "administrator"].indexOf(member.status) >= 0;
        }

        async isSubscribed(args) {
            const member = await this._call("getChatMember", {
                chat_id: args.CHANNEL,
                user_id: args.USERID,
            });
            if (!member) return false;
            return ["creator", "administrator", "member", "restricted"].indexOf(member.status) >= 0;
        }

        // Подписан ли пользователь на все перечисленные каналы
        async isSubscribedToAll(args) {
            const list = args.ARRAY || [];
            if (!list.length) return false;
            for (const channel of list) {
                const ch = this._str(channel).trim();
                if (!ch) continue;
                const member = await this._call("getChatMember", {
                    chat_id: ch,
                    user_id: args.USERID,
                });
                // пустой ответ = ошибка API (например, бот не админ канала)
                if (!member) return false;
                if (["creator", "administrator", "member", "restricted"].indexOf(member.status) < 0)
                    return false;
            }
            return true;
        }

        async chatMemberStatus(args) {
            const member = await this._call("getChatMember", {
                chat_id: args.CHANNEL,
                user_id: args.USERID,
            });
            if (!member) return "";
            const names = {
                creator: "создатель",
                administrator: "админ",
                member: "участник",
                restricted: "ограничен",
                left: "вышел",
                kicked: "забанен",
            };
            return names[member.status] || member.status || "";
        }

        async chatMemberCount(args) {
            const n = await this._call("getChatMemberCount", { chat_id: args.CHATID });
            return n === null ? "" : String(n);
        }

        // Прямой ссылки на аватар/файл в Telegram нет — получаем через getFile
        async _fileUrl(fileId) {
            if (!fileId) return "";
            const file = await this._call("getFile", { file_id: fileId });
            if (!file || !file.file_path) return "";
            return "https://api.telegram.org/file/bot" + this.token + "/" + file.file_path;
        }

        async userAvatar(args) {
            const photos = await this._call("getUserProfilePhotos", {
                user_id: args.USERID,
                limit: 1,
            });
            if (!photos || !photos.photos || !photos.photos.length) return "";
            const sizes = photos.photos[0];
            return await this._fileUrl(sizes[sizes.length - 1].file_id);
        }

        async getFileUrl(args) {
            return await this._fileUrl(args.FILEID);
        }

        // =================================================================
        //              БАЗА ДАННЫХ (в Telegram такого нет)
        // =================================================================
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

        _userKey(userId, key) {
            return "u:" + this._str(userId) + ":" + this._str(key);
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

        // =================================================================
        //        ТАЙМЕРЫ И ОТЛОЖЕННЫЕ СООБЩЕНИЯ (в Telegram такого нет)
        // =================================================================
        sendLater(args) {
            const seconds = Math.max(0, this._num(args.SECONDS, 0));
            const text = this._str(args.TEXT);
            const chat = args.CHATID;
            setTimeout(() => {
                this._call("sendMessage", { chat_id: chat, text: text });
            }, seconds * 1000);
        }

        deleteLater(args) {
            const seconds = Math.max(0, this._num(args.SECONDS, 0));
            const chat = args.CHATID;
            const id = args.MESSAGEID;
            setTimeout(() => {
                this._call("deleteMessage", { chat_id: chat, message_id: id });
            }, seconds * 1000);
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

        // =================================================================
        //          АНТИФЛУД И КУЛДАУНЫ (в Telegram такого нет)
        // =================================================================
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

        // =================================================================
        //           КОМАНДЫ И АРГУМЕНТЫ (в Telegram такого нет)
        // =================================================================
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

        async setBotCommands(args) {
            const list = args.ARRAY || [];
            const commands = [];
            for (const raw of list) {
                const parts = this._str(raw).split("|");
                const cmd = parts[0].trim().replace(/^\//, "");
                const desc = parts.length > 1 ? parts.slice(1).join("|").trim() : cmd;
                if (cmd) commands.push({ command: cmd, description: desc.slice(0, 256) });
            }
            if (!commands.length) return;
            await this._call("setMyCommands", { commands: commands });
        }

        async clearBotCommands() {
            await this._call("deleteMyCommands", {});
        }

        // =================================================================
        //             РУССКИЙ ЯЗЫК (в Telegram такого нет)
        // =================================================================
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

        // =================================================================
        //               ГЕНЕРАТОРЫ (в Telegram такого нет)
        // =================================================================
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

        // =================================================================
        //          ТЕКСТ, JSON, ШИФРЫ (в Telegram такого нет)
        // =================================================================
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

        // =================================================================
        //             ДАТА И ВРЕМЯ (в Telegram такого нет)
        // =================================================================
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

        // =================================================================
        //        СТАТИСТИКА И СЧЁТЧИКИ (в Telegram такого нет)
        // =================================================================
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

        // =================================================================
        //       ИНТЕРНЕТ-СЕРВИСЫ: погода, курсы, QR, факты, ИИ
        // =================================================================
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

        // =================================================================
        //                          ОТЛАДКА
        // =================================================================
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
    }

    Scratch.extensions.register(new TelegramBotAPIExtension());
})(Scratch);
