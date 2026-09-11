// Name: WebGL (RU)
// ID: webglru
// Description: 2D/3D-графика на WebGL прямо поверх сцены: шейдеры, uniform-матрицы и атрибуты, буферы, текстуры из URL/костюмов/пикселей, рендер в текстуру, состояния конвейера, примитивы, чтение пикселей, FPS и снимок кадра в костюм.
// Author: extensionsmy
// Version: 1.1.0
// License: MPL-2.0
// Context: unsandboxed
//
// ============================================================================
//  WebGL (RU) — расширение для DashBlocks / TurboWarp
// ----------------------------------------------------------------------------
//  ВНИМАНИЕ: расширение должно быть загружено БЕЗ песочницы (unsandboxed),
//  потому что ему нужен доступ к canvas-сцене и WebGL-контексту страницы.
//
//  Возможности:
//    * Холст WebGL1/WebGL2 автоматически встаёт поверх (или позади) сцены,
//      умеет подгоняться под сцену с учётом devicePixelRatio;
//    * информация о видеокарте, версии WebGL, GLSL, расширениях, ошибках GL;
//    * свои вершинные/фрагментные шейдеры, uniform (числа, vec2/3/4, целые,
//      матрицы 2x2/3x3/4x4), атрибуты из буферов и константные атрибуты;
//    * буферы вершин и индексов (квадратные массивы Dash, JSON, строки),
//      частичное обновление bufferSubData, drawArrays/drawElements;
//    * состояния конвейера: очистка цвет/глубина, ножницы, маски цвета и
//      глубины, функции глубины, отсечение граней, намотка, смешивание
//      (уравнение и факторы), толщина линий, polygon offset, flush/finish;
//    * готовые 2D-блоки: прямоугольник, треугольник, текстура в рамке,
//      быстрое рисование буфера вершин в пиксельных координатах;
//    * текстуры: по URL (CORS), из костюма спрайта, из массива RGBA-пикселей,
//      фильтры/повтор, flipY и premultiply alpha, привязка к сэмплеру;
//    * рендер в текстуру: кадровые буферы с опциональной глубиной;
//    * чтение пикселей кадра (строкой и квадратным массивом);
//    * HAT-блок «когда отрисован кадр», FPS, время кадра, потеря контекста;
//    * снимок кадра в data-URL или сразу в новый костюм спрайта.
//
//  Координаты встроенных 2D-блоков и ножниц — пиксели сцены (ось Y вниз, как в
//  Скретче), origin — левый верхний угол. Цвета — числа от 0 до 1 (R, G, B, A).
//
//  Свои шейдеры могут использовать соглашение:
//    attribute vec2 a_position;   // позиция в пикселях
//    uniform   vec2 u_resolution; // размер холста (ставится автоматически)
//  и переводить пиксели в clip-space стандартным образом.
// ============================================================================

(function (Scratch) {
  "use strict";

  if (!Scratch.extensions.unsandboxed) {
    throw new Error(
      "WebGL (RU):\nЭто расширение должно быть загружено без песочницы (unsandboxed)."
    );
  }

  const vm = Scratch.vm;
  const runtime = vm.runtime;
  const Cast = Scratch.Cast;

  // Квадратная форма блока для массивов Dash (в обычном TurboWarp — круглая).
  const SQUARE = (Scratch.BlockShape && Scratch.BlockShape.SQUARE) || undefined;

  // Иконка: тёмный квадрат с разноцветным 3D-кубом (WebGL-вайб), инлайн-SVG.
  const ICON =
    "data:image/svg+xml;base64," +
    btoa(
      '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">' +
        '<rect width="40" height="40" rx="9" fill="#10142B"/>' +
        '<path d="M20 7 L32 13.5 L32 26.5 L20 33 L8 26.5 L8 13.5 Z" fill="none" stroke="#7C5CFF" stroke-width="1.6" stroke-linejoin="round"/>' +
        '<path d="M20 7 L32 13.5 L20 20 L8 13.5 Z" fill="#7C5CFF" fill-opacity="0.85"/>' +
        '<path d="M20 20 L20 33 L8 26.5 L8 13.5 Z" fill="#36C5F0" fill-opacity="0.75"/>' +
        '<path d="M20 20 L32 13.5 L32 26.5 L20 33 Z" fill="#FF4FD8" fill-opacity="0.7"/>' +
        "</svg>"
    );

  // Встроенные шейдеры для 2D-помощников (координаты — пиксели, Y вниз).
  const SHAPE_VS =
    "attribute vec2 a_position;" +
    "uniform vec2 u_resolution;" +
    "void main(){" +
    "  vec2 p = a_position / u_resolution * 2.0 - 1.0;" +
    "  p.y = -p.y;" +
    "  gl_Position = vec4(p, 0.0, 1.0);" +
    "}";
  const SHAPE_FS =
    "precision mediump float;" +
    "uniform vec4 u_color;" +
    "void main(){ gl_FragColor = u_color; }";

  const TEX_VS =
    "attribute vec2 a_position;" +
    "attribute vec2 a_texcoord;" +
    "uniform vec2 u_resolution;" +
    "varying vec2 v_uv;" +
    "void main(){" +
    "  vec2 p = a_position / u_resolution * 2.0 - 1.0;" +
    "  p.y = -p.y;" +
    "  gl_Position = vec4(p, 0.0, 1.0);" +
    "  v_uv = a_texcoord;" +
    "}";
  const TEX_FS =
    "precision mediump float;" +
    "varying vec2 v_uv;" +
    "uniform sampler2D u_texture;" +
    "void main(){ gl_FragColor = texture2D(u_texture, v_uv); }";

  const DEFAULT_VS =
    "attribute vec2 a_position; uniform vec2 u_resolution; " +
    "void main(){ vec2 p=a_position/u_resolution*2.0-1.0; p.y=-p.y; " +
    "gl_Position=vec4(p,0.0,1.0); }";
  const DEFAULT_FS =
    "precision mediump float; uniform vec4 u_color; " +
    "void main(){ gl_FragColor = u_color; }";

  class WebGLRU {
    constructor() {
      // --- холст и контекст
      this.canvas = null;
      this.gl = null;
      this.apiVersion = ""; // "webgl2" | "webgl1"
      this.layer = "front"; // "front" | "behind"
      this._rafId = 0;
      this._lastRect = "";

      // --- ресурсы GL
      this.programs = Object.create(null); // id -> {program, uniform:{}, attrib:{}}
      this.buffers = Object.create(null); // id -> {buffer, target, length, type?, count?}
      this.textures = Object.create(null); // id -> {texture, width, height, loaded, error}
      this.framebuffers = Object.create(null); // id -> {fb, rb, width, height, textureId}
      this.currentProgramId = "";
      this.flipY = false;        // UNPACK_FLIP_Y_WEBGL при загрузке текстур
      this.premultiply = false;  // UNPACK_PREMULTIPLY_ALPHA_WEBGL
      this.contextLost = false;
      this._shapeProgram = null;
      this._texProgram = null;
      this._quadBuffer = null;
      this._scratchBuffer = null;

      // --- состояние кадра
      this.fps = 0;
      this.frameMs = 0;

      // --- ошибки и события HAT
      this.lastError = "";
      this._eventSeq = Object.create(null);
      this._eventSeen = Object.create(null);

      // кэш проверок поддержки
      this._support = null;

      // Потеря/восстановление контекста — стрелки, чтобы сохранять this.
      this._onContextLost = (e) => {
        e.preventDefault();
        this.contextLost = true;
        this._fireHat("whenContext", "lost");
        this._err("context", "WebGL-контекст потерян (нехватка видеопамяти или сбой драйвера)");
      };
      this._onContextRestored = () => {
        this.contextLost = false;
        // Все GPU-ресурсы браузер стёр — пересоздаём хотя бы встроенные
        // программы; пользовательские шейдеры/буферы нужно создать заново.
        this.programs = Object.create(null);
        this.buffers = Object.create(null);
        this.textures = Object.create(null);
        this.framebuffers = Object.create(null);
        this.currentProgramId = "";
        this._shapeProgram = null;
        this._texProgram = null;
        this._quadBuffer = null;
        this._scratchBuffer = null;
        if (this.gl) {
          try {
            this._shapeProgram = this._buildProgram(SHAPE_VS, SHAPE_FS);
            this._texProgram = this._buildProgram(TEX_VS, TEX_FS);
            this.gl.clearColor(0, 0, 0, 0);
          } catch (e) {
            this._err("context", e);
          }
        }
        this._fireHat("whenContext", "restored");
      };

      console.log(
        "%cWebGL (RU) v1.1.0",
        "color:#fff;background:#7C3AED;padding:2px 6px;border-radius:3px",
        "— расширение WebGL для DashBlocks / TurboWarp."
      );
    }

    // ======================================================================
    //  ВСПОМОГАТЕЛЬНОЕ
    // ======================================================================

    /** Записывает ошибку в буфер и консоль, никогда не бросает наружу. */
    _err(where, error) {
      const message =
        (error && (error.message || error.code)) ||
        (typeof error === "string" ? error : "unknown error");
      this.lastError = where + ": " + message;
      console.warn("WebGL (RU) [" + where + "]", error);
      return this.lastError;
    }

    clearError() {
      this.lastError = "";
    }

    getLastError() {
      return this.lastError;
    }

    /** HAT-событие: увеличивает счётчик. */
    _fireHat(opcode, key) {
      const full = opcode + ":" + (key || "");
      this._eventSeq[full] = (this._eventSeq[full] || 0) + 1;
    }

    /** HAT-предикат: true ровно один раз на каждое событие для каждого блока. */
    _checkHat(opcode, key, util) {
      const full = opcode + ":" + (key || "");
      const seq = this._eventSeq[full] || 0;
      let blockId = "";
      try {
        blockId = (util && util.thread && util.thread.topBlock) || "";
      } catch (e) {
        blockId = "";
      }
      const seenKey = blockId + "#" + full;
      const seen = this._eventSeen[seenKey] || 0;
      if (seq > seen) {
        this._eventSeen[seenKey] = seq;
        return true;
      }
      return false;
    }

    /**
     * Превращает значение с входа блока в массив чисел.
     * Понимает: обычные JS-массивы, массивы Dash (NormalArray),
     * JSON-строки и строки вида "1, 2; 3 4".
     */
    _toNumberArray(value) {
      if (value === null || value === undefined) return [];

      const filterNums = (list) => {
        const out = [];
        for (const v of list) {
          const n = Number(v);
          if (!Number.isNaN(n)) out.push(n);
        }
        return out;
      };

      // Обычные JS-массивы и типизированные массивы.
      if (Array.isArray(value) || ArrayBuffer.isView(value)) {
        return filterNums(value);
      }
      // Массивы Dash (Scratch.NormalArray): у них есть length и индексы,
      // но они могут не иметь итератора Symbol.iterator.
      if (typeof value === "object" && typeof value.length === "number") {
        // Map (Scratch.NormalObject) сюда не попадает — у него нет length.
        try {
          if (typeof value.map === "function") {
            const out = [];
            value.map((v) => {
              const n = Number(v);
              if (!Number.isNaN(n)) out.push(n);
              return v;
            });
            return out;
          }
          const out = [];
          for (let i = 0; i < value.length; i++) {
            const n = Number(value[i]);
            if (!Number.isNaN(n)) out.push(n);
          }
          return out;
        } catch (e) {
          /* упадём ниже в парсинг строки */
        }
      }
      if (typeof value === "object") {
        try {
          const parsed = JSON.parse(String(value));
          if (Array.isArray(parsed)) {
            return filterNums(parsed);
          }
        } catch (e) {
          /* не JSON */
        }
        return [];
      }
      const text = String(value).trim();
      if (!text) return [];
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          return filterNums(parsed);
        }
      } catch (e) {
        /* не JSON — считаем разделителями запятые/пробелы/точки с запятой */
      }
      return text
        .split(/[\s,;]+/)
        .filter(Boolean)
        .map(Number)
        .filter((v) => !Number.isNaN(v));
    }

    // ----------------------------------------------------------------------
    //  Проверка поддержки (без создания видимого холста)
    // ----------------------------------------------------------------------

    _probeSupport() {
      if (this._support) return this._support;
      const out = { webgl1: false, webgl2: false, gl1: null, gl2: null };
      try {
        // ВАЖНО: один canvas отдаёт контекст только одной версии — для
        // проверки WebGL1 и WebGL2 нужны отдельные пробные холсты.
        const probe2 = document.createElement("canvas");
        probe2.width = probe2.height = 1;
        const gl2 = probe2.getContext("webgl2");
        if (gl2) {
          out.webgl2 = true;
          out.gl2 = gl2;
          try {
            const lose = gl2.getExtension("WEBGL_lose_context");
            if (lose) lose.loseContext();
          } catch (e) {
            /* ignore */
          }
        }

        const probe1 = document.createElement("canvas");
        probe1.width = probe1.height = 1;
        const gl1 =
          probe1.getContext("webgl") || probe1.getContext("experimental-webgl");
        if (gl1) {
          out.webgl1 = true;
          out.gl1 = gl1;
          try {
            const lose = gl1.getExtension("WEBGL_lose_context");
            if (lose) lose.loseContext();
          } catch (e) {
            /* ignore */
          }
        }
      } catch (e) {
        this._err("probeSupport", e);
      }
      this._support = out;
      return out;
    }

    isWebGLSupported() {
      const s = this._probeSupport();
      return s.webgl1 || s.webgl2;
    }

    isWebGL2Supported() {
      return this._probeSupport().webgl2;
    }

    // ======================================================================
    //  ХОЛСТ
    // ======================================================================

    /** Размещает canvas точно поверх canvas-сцены (вызывается каждый кадр). */
    _placeCanvas() {
      if (!this.canvas || !runtime.canvas) return;
      const stage = runtime.canvas;
      const parent = stage.parentNode;
      if (!parent || this.canvas.parentNode !== parent) {
        if (this.layer === "behind" && stage.parentNode) {
          parent.insertBefore(this.canvas, stage);
        } else if (parent) {
          parent.appendChild(this.canvas);
        }
      }
      const rect = stage.getBoundingClientRect();
      const prect = parent.getBoundingClientRect ? parent.getBoundingClientRect() : { left: 0, top: 0 };
      const left = rect.left - prect.left;
      const top = rect.top - prect.top;
      const sig = Math.round(left) + "," + Math.round(top) + "," + Math.round(rect.width) + "," + Math.round(rect.height);
      if (sig === this._lastRect) return;
      this._lastRect = sig;

      const cs = this.canvas.style;
      cs.position = "absolute";
      cs.left = left + "px";
      cs.top = top + "px";
      cs.width = rect.width + "px";
      cs.height = rect.height + "px";
      cs.pointerEvents = "none";
      cs.zIndex = this.layer === "behind" ? "0" : "100";
      try {
        if (getComputedStyle(parent).position === "static") {
          parent.style.position = "relative";
        }
      } catch (e) {
        parent.style.position = "relative";
      }
    }

    createCanvas(args) {
      try {
        // Повторный вызов пересоздаёт холст.
        this._destroyGL();

        const width = Math.max(1, Math.round(Cast.toNumber(args.W) || 480));
        const height = Math.max(1, Math.round(Cast.toNumber(args.H) || 360));
        const want = Cast.toString(args.VERSION);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.dataset.webglru = "1";

        const contextAttrs = {
          alpha: true,
          antialias: true,
          depth: true,
          preserveDrawingBuffer: true,
        };

        let gl = null;
        let version = "";
        if (want === "webgl2" || (want === "auto" && this._probeSupport().webgl2)) {
          gl = canvas.getContext("webgl2", contextAttrs);
          if (gl) version = "webgl2";
        }
        if (!gl && want !== "webgl2") {
          gl =
            canvas.getContext("webgl", contextAttrs) ||
            canvas.getContext("experimental-webgl", contextAttrs);
          if (gl) version = "webgl1";
        }
        if (!gl) {
          canvas.remove();
          this._err("createCanvas", "WebGL-контекст не удалось создать (поддержка отключена в браузере?)");
          return;
        }

        this.canvas = canvas;
        this.gl = gl;
        this.apiVersion = version;
        this.layer = "front";
        this.contextLost = false;

        // Потеря/восстановление контекста (например, после сворачивания
        // вкладки на мобильных или при нехватке видеопамяти).
        canvas.addEventListener("webglcontextlost", this._onContextLost);
        canvas.addEventListener("webglcontextrestored", this._onContextRestored);

        // Встроенные программы.
        this._shapeProgram = this._buildProgram(SHAPE_VS, SHAPE_FS);
        this._texProgram = this._buildProgram(TEX_VS, TEX_FS);
        if (!this._shapeProgram || !this._texProgram) {
          this._err("createCanvas", "не удалось скомпилировать встроенные шейдеры");
        }

        this._placeCanvas();
        this._startLoop();

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      } catch (e) {
        this._err("createCanvas", e);
      }
    }

    resizeCanvas(args) {
      if (!this._ready("resizeCanvas")) return;
      const width = Math.max(1, Math.round(Cast.toNumber(args.W) || 480));
      const height = Math.max(1, Math.round(Cast.toNumber(args.H) || 360));
      this.canvas.width = width;
      this.canvas.height = height;
      this._lastRect = "";
      this._placeCanvas();
      // После смены размера контекст сбрасывается — восстанавливаем базовое состояние.
      const gl = this.gl;
      gl.viewport(0, 0, width, height);
      this._setResolution(this.currentProgramId);
    }

    setVisible(args) {
      if (!this.canvas) return;
      this.canvas.style.display = Cast.toString(args.STATE) === "show" ? "" : "none";
    }

    setLayer(args) {
      this.layer = Cast.toString(args.LAYER) === "behind" ? "behind" : "front";
      this._lastRect = "";
      this._placeCanvas();
    }

    destroyCanvas() {
      this._destroyGL();
    }

    canvasReady() {
      return !!(this.gl && this.canvas);
    }

    _ready(where) {
      if (this.gl) return true;
      this._err(where, "холст не создан — сначала используй блок «создать WebGL-холст»");
      return false;
    }

    /** Полностью уничтожает GL-контекст и все ресурсы. */
    _destroyGL() {
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
        this._rafId = 0;
      }
      if (this.canvas && this.gl) {
        try {
          this.canvas.removeEventListener("webglcontextlost", this._onContextLost);
          this.canvas.removeEventListener("webglcontextrestored", this._onContextRestored);
        } catch (e) {
          /* ignore */
        }
      }
      if (this.gl) {
        try {
          for (const id of Object.keys(this.programs)) {
            const p = this.programs[id];
            if (p && p.program) this.gl.deleteProgram(p.program);
          }
          for (const id of Object.keys(this.buffers)) {
            if (this.buffers[id] && this.buffers[id].buffer)
              this.gl.deleteBuffer(this.buffers[id].buffer);
          }
          for (const id of Object.keys(this.textures)) {
            if (this.textures[id] && this.textures[id].texture)
              this.gl.deleteTexture(this.textures[id].texture);
          }
          for (const id of Object.keys(this.framebuffers)) {
            const f = this.framebuffers[id];
            if (f && f.fb) this.gl.deleteFramebuffer(f.fb);
            if (f && f.rb) this.gl.deleteRenderbuffer(f.rb);
          }
          const lose = this.gl.getExtension("WEBGL_lose_context");
          if (lose) lose.loseContext();
        } catch (e) {
          /* ignore */
        }
      }
      if (this.canvas && this.canvas.parentNode) {
        this.canvas.parentNode.removeChild(this.canvas);
      }
      this.canvas = null;
      this.gl = null;
      this.apiVersion = "";
      this.contextLost = false;
      this.programs = Object.create(null);
      this.buffers = Object.create(null);
      this.textures = Object.create(null);
      this.framebuffers = Object.create(null);
      this.currentProgramId = "";
      this._shapeProgram = null;
      this._texProgram = null;
      this._quadBuffer = null;
      this._scratchBuffer = null;
    }

    // ======================================================================
    //  ИНФОРМАЦИЯ О КОНТЕКСТЕ
    // ======================================================================

    /** Возвращает живой контекст: холст расширения либо временный пробный. */
    _anyGL() {
      if (this.gl) return this.gl;
      const s = this._probeSupport();
      return s.gl2 || s.gl1;
    }

    _glParameter(paramName, fallback) {
      const gl = this._anyGL();
      if (!gl) return fallback;
      try {
        let param = gl[paramName];
        // Для информации о рендерере нужно расширение.
        let value;
        if (paramName === "UNMASKED_VENDOR_WEBGL" || paramName === "UNMASKED_RENDERER_WEBGL") {
          const dbg = gl.getExtension("WEBGL_debug_renderer_info");
          if (!dbg) return fallback;
          param = dbg[paramName];
          value = gl.getParameter(param);
        } else {
          value = gl.getParameter(param);
        }
        return value === null || value === undefined ? fallback : value;
      } catch (e) {
        return fallback;
      }
    }

    getVersion() {
      if (this.gl) {
        return this.apiVersion === "webgl2" ? "WebGL 2" : "WebGL 1";
      }
      const s = this._probeSupport();
      if (s.webgl2) return "WebGL 2 (доступен, холст не создан)";
      if (s.webgl1) return "WebGL 1 (доступен, холст не создан)";
      return "недоступен";
    }

    getVendor() {
      return this._glParameter("UNMASKED_VENDOR_WEBGL", "неизвестно");
    }

    getRenderer() {
      return this._glParameter("UNMASKED_RENDERER_WEBGL", "неизвестно");
    }

    getGLSL() {
      return this._glParameter("SHADING_LANGUAGE_VERSION", "неизвестно");
    }

    getMaxTextureSize() {
      return this._glParameter("MAX_TEXTURE_SIZE", 0);
    }

    isExtensionSupported(args) {
      const gl = this._anyGL();
      if (!gl) return false;
      try {
        return !!gl.getExtension(Cast.toString(args.EXT).trim());
      } catch (e) {
        return false;
      }
    }

    getExtensionsList() {
      const gl = this._anyGL();
      if (!gl) return "";
      try {
        return (gl.getSupportedExtensions() || []).join(", ");
      } catch (e) {
        return "";
      }
    }

    // ======================================================================
    //  КАДР, ОЧИСТКА, СОСТОЯНИЯ
    // ======================================================================

    _startLoop() {
      if (this._rafId) cancelAnimationFrame(this._rafId);
      let last = performance.now();
      let acc = 0;
      let frames = 0;

      const loop = (now) => {
        if (!this.gl) return;
        const dt = now - last;
        last = now;
        acc += dt;
        frames++;
        if (acc >= 500) {
          this.fps = Math.round((frames * 1000) / acc);
          this.frameMs = Math.round((acc / frames) * 100) / 100;
          acc = 0;
          frames = 0;
        }
        this._placeCanvas();
        this._fireHat("whenFrame", "");
        this._rafId = requestAnimationFrame(loop);
      };
      this._rafId = requestAnimationFrame(loop);
    }

    whenFrame(args, util) {
      return this._checkHat("whenFrame", "", util);
    }

    getFps() {
      return this.fps;
    }

    getFrameMs() {
      return this.frameMs;
    }

    clearColor(args) {
      if (!this._ready("clearColor")) return;
      const gl = this.gl;
      const r = this._clamp01(Cast.toNumber(args.R));
      const g = this._clamp01(Cast.toNumber(args.G));
      const b = this._clamp01(Cast.toNumber(args.B));
      const a = this._clamp01(Cast.toNumber(args.A));
      gl.clearColor(r, g, b, a);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    _clamp01(v) {
      v = Number(v);
      if (Number.isNaN(v)) v = 0;
      return Math.min(1, Math.max(0, v));
    }

    setBlend(args) {
      if (!this._ready("setBlend")) return;
      const gl = this.gl;
      switch (Cast.toString(args.BLEND)) {
        case "alpha":
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          break;
        case "additive":
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
          break;
        case "off":
        default:
          gl.disable(gl.BLEND);
          break;
      }
    }

    setDepthTest(args) {
      if (!this._ready("setDepthTest")) return;
      const gl = this.gl;
      if (Cast.toString(args.STATE) === "on") gl.enable(gl.DEPTH_TEST);
      else gl.disable(gl.DEPTH_TEST);
    }

    setCullFace(args) {
      if (!this._ready("setCullFace")) return;
      const gl = this.gl;
      if (Cast.toString(args.STATE) === "on") {
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
      } else {
        gl.disable(gl.CULL_FACE);
      }
    }

    setViewport(args) {
      if (!this._ready("setViewport")) return;
      const x = Math.round(Cast.toNumber(args.X) || 0);
      const y = Math.round(Cast.toNumber(args.Y) || 0);
      const w = Math.max(1, Math.round(Cast.toNumber(args.W) || this.canvas.width));
      const h = Math.max(1, Math.round(Cast.toNumber(args.H) || this.canvas.height));
      this.gl.viewport(x, y, w, h);
    }

    // ======================================================================
    //  ШЕЙДЕРЫ И ПРОГРАММЫ
    // ======================================================================

    _compileShader(type, source) {
      const gl = this.gl;
      const shader = gl.createShader(type);
      // Фрагментным шейдерам без указания точности добавляем precision.
      if (type === gl.FRAGMENT_SHADER && !/precision\s+(?:lowp|mediump|highp)\s+float/.test(source)) {
        source = "precision mediump float;\n" + source;
      }
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(shader) || "ошибка компиляции шейдера";
        gl.deleteShader(shader);
        throw new Error(log);
      }
      return shader;
    }

    _buildProgram(vsSource, fsSource) {
      const gl = this.gl;
      const vs = this._compileShader(gl.VERTEX_SHADER, vsSource);
      let fs = null;
      let program = null;
      try {
        fs = this._compileShader(gl.FRAGMENT_SHADER, fsSource);
        program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          const log = gl.getProgramInfoLog(program) || "ошибка линковки программы";
          gl.deleteProgram(program);
          throw new Error(log);
        }
      } finally {
        if (vs) gl.deleteShader(vs);
        if (fs) gl.deleteShader(fs);
      }
      return { program, uniform: Object.create(null), attrib: Object.create(null) };
    }

    createProgram(args) {
      if (!this._ready("createProgram")) return;
      const id = Cast.toString(args.ID);
      const vs = Cast.toString(args.VS);
      const fs = Cast.toString(args.FS);
      try {
        if (this.programs[id] && this.programs[id].program) {
          this.gl.deleteProgram(this.programs[id].program);
        }
        const built = this._buildProgram(vs, fs);
        this.programs[id] = built;
        this._useProgramObject(built);
        this.currentProgramId = id;
      } catch (e) {
        this.programs[id] = null;
        this._err("createProgram:" + id, e);
      }
    }

    useProgram(args) {
      if (!this._ready("useProgram")) return;
      const id = Cast.toString(args.ID);
      const p = this.programs[id];
      if (!p || !p.program) {
        this._err("useProgram", "программа «" + id + "» не готова (ошибка компиляции?)");
        return;
      }
      this.currentProgramId = id;
      this._useProgramObject(p);
    }

    _useProgramObject(p) {
      const gl = this.gl;
      gl.useProgram(p.program);
      // Автоматически заполняем u_resolution/uResolution, если шейдер его ждёт.
      let locRes = this._uniformLocation(p, "u_resolution");
      if (locRes === null) locRes = this._uniformLocation(p, "uResolution");
      if (locRes !== null && this.canvas) {
        gl.uniform2f(locRes, this.canvas.width, this.canvas.height);
      }
    }

    _setResolution(id) {
      if (!id) return;
      const p = this.programs[id];
      if (!p || !p.program || !this.canvas) return;
      const gl = this.gl;
      const a = this._uniformLocation(p, "u_resolution");
      if (a !== null) gl.uniform2f(a, this.canvas.width, this.canvas.height);
      const b = this._uniformLocation(p, "uResolution");
      if (b !== null) gl.uniform2f(b, this.canvas.width, this.canvas.height);
    }

    programReady(args) {
      const p = this.programs[Cast.toString(args.ID)];
      return !!(p && p.program);
    }

    deleteProgram(args) {
      if (!this.gl) return;
      const id = Cast.toString(args.ID);
      const p = this.programs[id];
      if (p && p.program) this.gl.deleteProgram(p.program);
      delete this.programs[id];
      if (this.currentProgramId === id) this.currentProgramId = "";
    }

    _uniformLocation(p, name) {
      if (p.uniform[name] === undefined) {
        p.uniform[name] = this.gl.getUniformLocation(p.program, name);
      }
      return p.uniform[name];
    }

    _currentProgram(where) {
      const p = this.programs[this.currentProgramId];
      if (!p || !p.program) {
        this._err(where, "программа не выбрана — используй блок «использовать программу»");
        return null;
      }
      return p;
    }

    /** Универсальный блок uniform: число / vec2 / vec3 / vec4. */
    setUniformVector(args) {
      if (!this._ready("setUniformVector")) return;
      const p = this._currentProgram("setUniform");
      if (!p) return;
      const gl = this.gl;
      const name = Cast.toString(args.NAME);
      const loc = this._uniformLocation(p, name);
      if (loc === null) {
        this._err("setUniform", "uniform «" + name + "» не найден (он удалён компилятором?)");
        return;
      }
      const x = Cast.toNumber(args.X);
      const y = Cast.toNumber(args.Y);
      const z = Cast.toNumber(args.Z);
      const w = Cast.toNumber(args.W);
      switch (Cast.toString(args.TYPE)) {
        case "vec2":
          gl.uniform2f(loc, x, y);
          break;
        case "vec3":
          gl.uniform3f(loc, x, y, z);
          break;
        case "vec4":
          gl.uniform4f(loc, x, y, z, w);
          break;
        case "float":
        default:
          gl.uniform1f(loc, x);
          break;
      }
    }

    setUniformMatrix4(args) {
      if (!this._ready("setUniformMatrix4")) return;
      const p = this._currentProgram("setUniformMatrix4");
      if (!p) return;
      const values = this._toNumberArray(args.ARR);
      if (values.length !== 16) {
        this._err("setUniformMatrix4", "нужно ровно 16 чисел, получено " + values.length);
        return;
      }
      const loc = this._uniformLocation(p, Cast.toString(args.NAME));
      if (loc === null) {
        this._err("setUniformMatrix4", "uniform «" + Cast.toString(args.NAME) + "» не найден");
        return;
      }
      this.gl.uniformMatrix4fv(loc, false, new Float32Array(values));
    }

    getAttribLocation(args) {
      const p = this.programs[this.currentProgramId];
      if (!this.gl || !p || !p.program) return -1;
      const name = Cast.toString(args.NAME);
      if (p.attrib[name] === undefined) {
        p.attrib[name] = this.gl.getAttribLocation(p.program, name);
      }
      return p.attrib[name];
    }

    /** Привязывает встроенный квадрат на весь холст (пиксели) к атрибуту. */
    bindFullscreenQuad(args) {
      if (!this._ready("bindFullscreenQuad")) return;
      const p = this._currentProgram("bindFullscreenQuad");
      if (!p) return;
      const gl = this.gl;
      const w = this.canvas.width;
      const h = this.canvas.height;
      if (!this._quadBuffer) this._quadBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this._quadBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([0, 0, w, 0, 0, h, w, h]),
        gl.STATIC_DRAW
      );
      const name = Cast.toString(args.NAME);
      let loc = p.attrib[name];
      if (loc === undefined) loc = p.attrib[name] = gl.getAttribLocation(p.program, name);
      if (loc < 0) {
        this._err("bindFullscreenQuad", "атрибут «" + name + "» не найден");
        return;
      }
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      this._setResolution(this.currentProgramId);
    }

    // ======================================================================
    //  БУФЕРЫ И РИСОВАНИЕ
    // ======================================================================

    createBuffer(args) {
      if (!this._ready("createBuffer")) return;
      const id = Cast.toString(args.ID);
      const data = this._toNumberArray(args.DATA);
      if (!data.length) {
        this._err("createBuffer", "пустой массив чисел для буфера «" + id + "»");
        return;
      }
      const gl = this.gl;
      let entry = this.buffers[id];
      if (!entry) {
        entry = { buffer: gl.createBuffer(), target: gl.ARRAY_BUFFER, length: data.length };
        this.buffers[id] = entry;
      }
      entry.target = gl.ARRAY_BUFFER;
      entry.length = data.length;
      gl.bindBuffer(gl.ARRAY_BUFFER, entry.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    }

    createIndexBuffer(args) {
      if (!this._ready("createIndexBuffer")) return;
      const id = Cast.toString(args.ID);
      const data = this._toNumberArray(args.DATA);
      if (!data.length) {
        this._err("createIndexBuffer", "пустой массив индексов для буфера «" + id + "»");
        return;
      }
      const gl = this.gl;
      const max = data.reduce((a, b) => Math.max(a, b), 0);
      let typed;
      let type;
      if (max <= 255 && data.every((v) => v >= 0 && Number.isInteger(v))) {
        typed = new Uint8Array(data);
        type = gl.UNSIGNED_BYTE;
      } else if (max <= 65535 && data.every((v) => v >= 0 && Number.isInteger(v))) {
        typed = new Uint16Array(data);
        type = gl.UNSIGNED_SHORT;
      } else {
        // Uint32 требует расширение в WebGL1 (в WebGL2 входит в ядро).
        if (this.apiVersion === "webgl1") {
          const ext = gl.getExtension("OES_element_index_uint");
          if (!ext) {
            this._err("createIndexBuffer", "индексы больше 65535, но расширение OES_element_index_uint недоступно");
            return;
          }
        }
        typed = new Uint32Array(data);
        type = gl.UNSIGNED_INT;
      }
      let entry = this.buffers[id];
      if (!entry) {
        entry = { buffer: gl.createBuffer(), target: gl.ELEMENT_ARRAY_BUFFER, length: data.length };
        this.buffers[id] = entry;
      }
      entry.target = gl.ELEMENT_ARRAY_BUFFER;
      entry.length = data.length;
      entry.type = type;
      entry.count = data.length;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, entry.buffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, typed, gl.STATIC_DRAW);
    }

    deleteBuffer(args) {
      if (!this.gl) return;
      const id = Cast.toString(args.ID);
      const entry = this.buffers[id];
      if (entry && entry.buffer) this.gl.deleteBuffer(entry.buffer);
      delete this.buffers[id];
    }

    setAttribute(args) {
      if (!this._ready("setAttribute")) return;
      const p = this._currentProgram("setAttribute");
      if (!p) return;
      const gl = this.gl;
      const entry = this.buffers[Cast.toString(args.BUF)];
      if (!entry || entry.target !== gl.ARRAY_BUFFER) {
        this._err("setAttribute", "буфер вершин «" + Cast.toString(args.BUF) + "» не найден");
        return;
      }
      const name = Cast.toString(args.NAME);
      let loc = p.attrib[name];
      if (loc === undefined) loc = p.attrib[name] = gl.getAttribLocation(p.program, name);
      if (loc < 0) {
        this._err("setAttribute", "атрибут «" + name + "» не найден");
        return;
      }
      const size = Math.min(4, Math.max(1, Math.round(Cast.toNumber(args.SIZE) || 2)));
      gl.bindBuffer(gl.ARRAY_BUFFER, entry.buffer);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    }

    _modeConst(mode) {
      const gl = this.gl;
      switch (mode) {
        case "triangle_strip":
          return gl.TRIANGLE_STRIP;
        case "triangle_fan":
          return gl.TRIANGLE_FAN;
        case "lines":
          return gl.LINES;
        case "line_strip":
          return gl.LINE_STRIP;
        case "points":
          return gl.POINTS;
        case "triangles":
        default:
          return gl.TRIANGLES;
      }
    }

    drawArrays(args) {
      if (!this._ready("drawArrays")) return;
      if (!this._currentProgram("drawArrays")) return;
      const gl = this.gl;
      const count = Math.max(0, Math.round(Cast.toNumber(args.COUNT) || 0));
      const first = Math.max(0, Math.round(Cast.toNumber(args.FIRST) || 0));
      gl.drawArrays(this._modeConst(Cast.toString(args.MODE)), first, count);
    }

    drawElements(args) {
      if (!this._ready("drawElements")) return;
      if (!this._currentProgram("drawElements")) return;
      const gl = this.gl;
      const entry = this.buffers[Cast.toString(args.BUF)];
      if (!entry || entry.target !== gl.ELEMENT_ARRAY_BUFFER) {
        this._err("drawElements", "индексный буфер «" + Cast.toString(args.BUF) + "» не найден");
        return;
      }
      const count = Math.max(0, Math.round(Cast.toNumber(args.COUNT) || entry.count || 0));
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, entry.buffer);
      gl.drawElements(this._modeConst(Cast.toString(args.MODE)), count, entry.type, 0);
    }

    // ======================================================================
    //  2D-ПОМОЩНИКИ (пиксели, Y вниз)
    // ======================================================================

    /** Заливает массив вершин во временный буфер и рисует его. */
    _drawShape2D(positions, mode, r, g, b, a) {
      const gl = this.gl;
      if (!this._shapeProgram) return;
      this._useProgramObject(this._shapeProgram);
      if (!this._scratchBuffer) this._scratchBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this._scratchBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
      const loc = gl.getAttribLocation(this._shapeProgram.program, "a_position");
      if (loc >= 0) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      }
      const cLoc = this._uniformLocation(this._shapeProgram, "u_color");
      if (cLoc !== null) gl.uniform4f(cLoc, r, g, b, a);
      gl.drawArrays(mode, 0, positions.length / 2);
      // Возвращаем пользовательскую программу.
      if (this.currentProgramId && this.programs[this.currentProgramId]) {
        this._useProgramObject(this.programs[this.currentProgramId]);
      }
    }

    drawRect(args) {
      if (!this._ready("drawRect")) return;
      const x = Cast.toNumber(args.X);
      const y = Cast.toNumber(args.Y);
      const w = Cast.toNumber(args.W);
      const h = Cast.toNumber(args.H);
      const positions = [x, y, x + w, y, x, y + h, x + w, y + h];
      this._drawShape2D(
        positions,
        this.gl.TRIANGLE_STRIP,
        this._clamp01(Cast.toNumber(args.R)),
        this._clamp01(Cast.toNumber(args.G)),
        this._clamp01(Cast.toNumber(args.B)),
        this._clamp01(Cast.toNumber(args.A))
      );
    }

    drawTriangle(args) {
      if (!this._ready("drawTriangle")) return;
      const positions = [
        Cast.toNumber(args.X1), Cast.toNumber(args.Y1),
        Cast.toNumber(args.X2), Cast.toNumber(args.Y2),
        Cast.toNumber(args.X3), Cast.toNumber(args.Y3),
      ];
      this._drawShape2D(
        positions,
        this.gl.TRIANGLES,
        this._clamp01(Cast.toNumber(args.R)),
        this._clamp01(Cast.toNumber(args.G)),
        this._clamp01(Cast.toNumber(args.B)),
        this._clamp01(Cast.toNumber(args.A))
      );
    }

    drawTexturedRect(args) {
      if (!this._ready("drawTexturedRect")) return;
      const gl = this.gl;
      const id = Cast.toString(args.ID);
      const tex = this.textures[id];
      if (!tex || !tex.texture || !tex.loaded) {
        this._err("drawTexturedRect", "текстура «" + id + "» ещё не загружена");
        return;
      }
      const x = Cast.toNumber(args.X);
      const y = Cast.toNumber(args.Y);
      const w = Cast.toNumber(args.W);
      const h = Cast.toNumber(args.H);

      // pos(2) + uv(2): верхний левый угол текстуры совпадает с верхним левым углом рамки.
      const verts = new Float32Array([
        x, y, 0, 1,
        x, y + h, 0, 0,
        x + w, y, 1, 1,
        x + w, y + h, 1, 0,
      ]);

      if (!this._texProgram) return;
      this._useProgramObject(this._texProgram);
      if (!this._scratchBuffer) this._scratchBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this._scratchBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);

      const stride = 4 * 4;
      const locPos = gl.getAttribLocation(this._texProgram.program, "a_position");
      if (locPos >= 0) {
        gl.enableVertexAttribArray(locPos);
        gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, stride, 0);
      }
      const locUv = gl.getAttribLocation(this._texProgram.program, "a_texcoord");
      if (locUv >= 0) {
        gl.enableVertexAttribArray(locUv);
        gl.vertexAttribPointer(locUv, 2, gl.FLOAT, false, stride, 2 * 4);
      }
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex.texture);
      const tLoc = this._uniformLocation(this._texProgram, "u_texture");
      if (tLoc !== null) gl.uniform1i(tLoc, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (this.currentProgramId && this.programs[this.currentProgramId]) {
        this._useProgramObject(this.programs[this.currentProgramId]);
      }
    }

    // ======================================================================
    //  ТЕКСТУРЫ
    // ======================================================================

    /** Создаёт (или сбрасывает) запись текстуры с прозрачным 1x1. */
    _createTextureEntry(id) {
      const gl = this.gl;
      let entry = this.textures[id];
      if (!entry) {
        entry = {
          texture: gl.createTexture(),
          width: 0,
          height: 0,
          loaded: false,
          error: false,
          userWrap: "clamp",
          userFilter: "linear",
        };
        this.textures[id] = entry;
      }
      entry.loaded = false;
      entry.error = false;
      gl.bindTexture(gl.TEXTURE_2D, entry.texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this.flipY);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this.premultiply);
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 0, 0])
      );
      this._configureTexture(entry, 1, 1, false);
      return entry;
    }

    /** Фильтры/повтор с учётом POT-ограничений WebGL1. */
    _configureTexture(entry, width, height, makeMipmaps) {
      const gl = this.gl;
      const pot =
        width > 0 &&
        (width & (width - 1)) === 0 &&
        (height & (height - 1)) === 0;
      const repeat = entry.userWrap === "repeat" && pot;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
      const linear = entry.userFilter !== "nearest";
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, linear ? gl.LINEAR : gl.NEAREST);
      if (makeMipmaps && pot && linear) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      } else if (makeMipmaps && pot) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, linear ? gl.LINEAR : gl.NEAREST);
      }
      return pot;
    }

    /** Заливает в текстуру уже декодированную картинку и настраивает её. */
    _uploadImageEntry(id, entry, img) {
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, entry.texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this.flipY);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this.premultiply);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      const width = img.naturalWidth || img.width || 0;
      const height = img.naturalHeight || img.height || 0;
      entry.width = width;
      entry.height = height;
      this._configureTexture(entry, width, height, true);
      entry.loaded = true;
      this._fireHat("whenTexture", id + ":loaded");
    }

    /** Общий путь асинхронной загрузки URL/data-URL в текстуру. */
    _loadImageSrc(id, src, label) {
      const entry = this._createTextureEntry(id);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (!this.gl || this.textures[id] !== entry) return;
        try {
          this._uploadImageEntry(id, entry, img);
        } catch (e) {
          entry.error = true;
          this._fireHat("whenTexture", id + ":error");
          this._err("loadTexture:" + id, e);
        }
      };
      img.onerror = () => {
        entry.error = true;
        this._fireHat("whenTexture", id + ":error");
        this._err("loadTexture:" + id, "не удалось загрузить " + (label || src));
      };
      // data/blob-URL не требуют CORS-заголовков; crossOrigin уже задан выше,
      // что гарантирует незагрязнённый холст для снимков.
      img.src = src;
    }

    loadTexture(args) {
      if (!this._ready("loadTexture")) return;
      const id = Cast.toString(args.ID);
      const url = Cast.toString(args.URL);
      if (!url) {
        this._err("loadTexture", "пустой URL текстуры «" + id + "»");
        return;
      }
      this._loadImageSrc(id, url, url);
    }

    /** Текстура из костюма спрайта (по имени; пусто — текущий костюм). */
    loadTextureFromCostume(args) {
      if (!this._ready("loadTextureFromCostume")) return;
      const id = Cast.toString(args.ID);
      const wanted = Cast.toString(args.NAME).trim();
      try {
        const target = vm.editingTarget || (runtime.targets && runtime.targets[0]);
        if (!target) {
          this._err("loadTextureFromCostume", "спрайт не выбран");
          return;
        }
        const costumes = target.sprite ? target.sprite.costumes : target.costumes;
        if (!costumes || !costumes.length) {
          this._err("loadTextureFromCostume", "у спрайта нет костюмов");
          return;
        }
        let costume;
        if (wanted) {
          costume = costumes.filter((c) => c.name === wanted)[0];
          if (!costume) {
            this._err("loadTextureFromCostume", "костюм «" + wanted + "» не найден");
            return;
          }
        } else {
          costume = costumes[target.currentCostume] || costumes[0];
        }
        const asset = costume && costume.asset;
        if (!asset || !asset.data) {
          this._err("loadTextureFromCostume", "данные костюма «" + costume.name + "» ещё не загружены");
          return;
        }
        const format = String(asset.dataFormat || "png").toLowerCase();
        const mime =
          format === "svg"
            ? "image/svg+xml"
            : format === "jpg" || format === "jpeg"
            ? "image/jpeg"
            : "image/png";
        const dataUrl =
          "data:" + mime + ";base64," + this._bytesToBase64(new Uint8Array(asset.data));
        // SVG-костюмы хранятся в малом размере — учитываем bitmapResolution.
        if (format === "svg" && costume.bitmapResolution > 1) {
          // <img> растеризует SVG в собственном размере; масштаб задаётся
          // самим SVG-видом костюма, дополнительных действий не требуется.
        }
        this._loadImageSrc(id, dataUrl, "костюм «" + costume.name + "»");
      } catch (e) {
        this._err("loadTextureFromCostume", e);
      }
    }

    /** Текстура из плоского массива RGBA-байтов (0–255). */
    loadTexturePixels(args) {
      if (!this._ready("loadTextureFromPixels")) return;
      const gl = this.gl;
      const id = Cast.toString(args.ID);
      const width = Math.round(Cast.toNumber(args.W) || 0);
      const height = Math.round(Cast.toNumber(args.H) || 0);
      const nums = this._toNumberArray(args.DATA);
      if (width < 1 || height < 1) {
        this._err("loadTextureFromPixels", "ширина и высота должны быть больше 0");
        return;
      }
      if (nums.length !== width * height * 4) {
        this._err(
          "loadTextureFromPixels",
          "нужно " + width * height * 4 + " RGBA-чисел, получено " + nums.length
        );
        return;
      }
      try {
        const entry = this._createTextureEntry(id);
        const bytes = new Uint8Array(nums.length);
        for (let i = 0; i < nums.length; i++) {
          bytes[i] = Math.max(0, Math.min(255, Math.round(nums[i])));
        }
        gl.bindTexture(gl.TEXTURE_2D, entry.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this.flipY);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this.premultiply);
        gl.texImage2D(
          gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes
        );
        entry.width = width;
        entry.height = height;
        this._configureTexture(entry, width, height, true);
        entry.loaded = true;
        this._fireHat("whenTexture", id + ":loaded");
      } catch (e) {
        this._err("loadTextureFromPixels", e);
      }
    }

    /** UNPACK_FLIP_Y_WEBGL: переворачивать картинки при загрузке. */
    setFlipY(args) {
      if (!this._ready("setFlipY")) return;
      this.flipY = Cast.toString(args.STATE) === "on";
      this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, this.flipY);
    }

    /** UNPACK_PREMULTIPLY_ALPHA_WEBGL при загрузке. */
    setPremultiply(args) {
      if (!this._ready("setPremultiply")) return;
      this.premultiply = Cast.toString(args.STATE) === "on";
      this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this.premultiply);
    }

    textureReady(args) {
      const tex = this.textures[Cast.toString(args.ID)];
      return !!(tex && tex.loaded);
    }

    whenTexture(args, util) {
      const id = Cast.toString(args.ID);
      const state = Cast.toString(args.TSTATE) === "error" ? "error" : "loaded";
      return this._checkHat("whenTexture", id + ":" + state, util);
    }

    bindTexture(args) {
      if (!this._ready("bindTexture")) return;
      const gl = this.gl;
      const tex = this.textures[Cast.toString(args.ID)];
      if (!tex || !tex.texture) {
        this._err("bindTexture", "текстура «" + Cast.toString(args.ID) + "» не найдена");
        return;
      }
      let slot = Math.round(Cast.toNumber(args.SLOT) || 0);
      // Спецификация гарантирует минимум 8 комбинированных текстурных юнитов.
      let maxSlot = 7;
      try {
        maxSlot = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS) - 1 || 7;
      } catch (e) {
        maxSlot = 7;
      }
      slot = Math.min(Math.max(0, slot), Math.max(7, maxSlot));
      const unit = gl.TEXTURE0 + slot;
      gl.activeTexture(unit);
      gl.bindTexture(gl.TEXTURE_2D, tex.texture);
    }

    /** Привязка текстуры к слоту + сразу uniform-сэмплеру текущей программы. */
    bindTextureToUniform(args) {
      if (!this._ready("bindTextureToUniform")) return;
      const p = this._currentProgram("bindTextureToUniform");
      if (!p) return;
      this.bindTexture(args);
      const gl = this.gl;
      const loc = this._uniformLocation(p, Cast.toString(args.UNIFORM));
      if (loc === null) {
        this._err("bindTextureToUniform", "uniform-сэмплер «" + Cast.toString(args.UNIFORM) + "» не найден");
        return;
      }
      gl.uniform1i(loc, Math.max(0, Math.round(Cast.toNumber(args.SLOT) || 0)));
    }

    setTextureParams(args) {
      if (!this._ready("setTextureParams")) return;
      const gl = this.gl;
      const tex = this.textures[Cast.toString(args.ID)];
      if (!tex || !tex.texture) {
        this._err("setTextureParams", "текстура «" + Cast.toString(args.ID) + "» не найдена");
        return;
      }
      gl.bindTexture(gl.TEXTURE_2D, tex.texture);
      tex.userWrap = Cast.toString(args.WRAP);
      tex.userFilter = Cast.toString(args.FILTER);
      // Мипмапы уже могли быть сгенерированы при загрузке — повторно не
      // генерируем, только выбираем MIN_FILTER под режим.
      this._configureTexture(tex, tex.width || 1, tex.height || 1, false);
      const pot =
        tex.width > 0 &&
        (tex.width & (tex.width - 1)) === 0 &&
        (tex.height & (tex.height - 1)) === 0;
      if (pot && tex.loaded) {
        try {
          gl.generateMipmap(gl.TEXTURE_2D);
        } catch (e) {
          /* ignore */
        }
      }
    }

    getTextureSize(args) {
      const tex = this.textures[Cast.toString(args.ID)];
      if (!tex || !tex.loaded) return "";
      return tex.width + "x" + tex.height;
    }

    deleteTexture(args) {
      if (!this.gl) return;
      const id = Cast.toString(args.ID);
      const tex = this.textures[id];
      if (tex && tex.texture) this.gl.deleteTexture(tex.texture);
      delete this.textures[id];
    }

    // ======================================================================
    //  СНИМОК КАДРА
    // ======================================================================

    snapshotDataURL() {
      if (!this._ready("snapshotDataURL")) return "";
      try {
        return this.canvas.toDataURL("image/png");
      } catch (e) {
        // Обычно SecurityError из-за текстуры, загруженной без CORS.
        this._err("snapshotDataURL", e);
        return "";
      }
    }

    async snapshotToCostume(args) {
      if (!this._ready("snapshotToCostume")) return;
      try {
        const storage = runtime.storage;
        if (!storage || !vm.addCostume) {
          this._err("snapshotToCostume", "хранилище костюмов недоступно в этой среде");
          return;
        }
        const AssetCtor = storage.Asset || storage.constructor.Asset;
        const AssetType = storage.AssetType || storage.constructor.AssetType;
        const DataFormat = storage.DataFormat || storage.constructor.DataFormat;
        if (!AssetCtor || !AssetType || !DataFormat) {
          this._err("snapshotToCostume", "API костюмов не найден");
          return;
        }

        const dataUrl = this.canvas.toDataURL("image/png");
        const binary = this._base64ToBytes(dataUrl.split(",")[1] || "");

        const asset = new AssetCtor(AssetType.Image, DataFormat.PNG, binary, null, true);
        const md5 = asset.assetId + "." + asset.dataFormat;
        await vm.addCostume(md5, {
          name: Cast.toString(args.NAME) || "WebGL кадр",
          asset,
          md5,
          assetId: asset.assetId,
          dataFormat: asset.dataFormat,
          rotationCenterX: Math.floor(this.canvas.width / 2),
          rotationCenterY: Math.floor(this.canvas.height / 2),
          bitmapResolution: 1,
        });
        try {
          vm.emitWorkspaceUpdate();
        } catch (e) {
          /* не критично */
        }
      } catch (e) {
        this._err("snapshotToCostume", e);
      }
    }

    _base64ToBytes(base64) {
      const bin = atob(base64);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    }

    /** Безопасная для больших данных упаковка байтов в base64 (чанками). */
    _bytesToBase64(bytes) {
      let binary = "";
      const CHUNK = 0x8000;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode.apply(
          null,
          bytes.subarray(i, Math.min(i + CHUNK, bytes.length))
        );
      }
      return btoa(binary);
    }

    // ======================================================================
    //  ДОПОЛНИТЕЛЬНО: СОСТОЯНИЯ КОНВЕЙЕРА
    // ======================================================================

    /** Универсальное включение/выключение возможностей GL. */
    setCapability(args) {
      if (!this._ready("setCapability")) return;
      const gl = this.gl;
      const constName = Cast.toString(args.CAP);
      const capConst = gl[constName];
      if (capConst === undefined) {
        this._err("setCapability", "возможность «" + constName + "» недоступна");
        return;
      }
      if (Cast.toString(args.STATE) === "on") gl.enable(capConst);
      else gl.disable(capConst);
    }

    /** Очистка выбранных буферов (цвет/глубина/оба). */
    clearEx(args) {
      if (!this._ready("clearEx")) return;
      const gl = this.gl;
      const what = Cast.toString(args.WHAT);
      let bits = 0;
      if (what === "color") bits = gl.COLOR_BUFFER_BIT;
      else if (what === "depth") bits = gl.DEPTH_BUFFER_BIT;
      else bits = gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT;
      gl.clear(bits);
    }

    /** Значение, в которое очищается буфер глубины. */
    setClearDepth(args) {
      if (!this._ready("setClearDepth")) return;
      const v = Math.min(1, Math.max(0, Cast.toNumber(args.D)));
      this.gl.clearDepth(v);
    }

    /** Ножницы: включает отсечение и задаёт прямоугольник (координаты сцены, Y вниз). */
    setScissor(args) {
      if (!this._ready("setScissor")) return;
      const gl = this.gl;
      const x = Math.round(Cast.toNumber(args.X) || 0);
      const h = Math.max(0, Math.round(Cast.toNumber(args.H) || 0));
      const y = this.canvas.height - Math.round(Cast.toNumber(args.Y) || 0) - h;
      const w = Math.max(0, Math.round(Cast.toNumber(args.W) || 0));
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(x, y, w, h);
    }

    disableScissor() {
      if (!this._ready("disableScissor")) return;
      this.gl.disable(this.gl.SCISSOR_TEST);
    }

    /** Маска записи каналов цвета. */
    setColorMask(args) {
      if (!this._ready("setColorMask")) return;
      this.gl.colorMask(
        Cast.toString(args.R) === "on",
        Cast.toString(args.G) === "on",
        Cast.toString(args.B) === "on",
        Cast.toString(args.A) === "on"
      );
    }

    /** Разрешена ли запись в буфер глубины. */
    setDepthMask(args) {
      if (!this._ready("setDepthMask")) return;
      this.gl.depthMask(Cast.toString(args.STATE) === "on");
    }

    setDepthFunc(args) {
      if (!this._ready("setDepthFunc")) return;
      const c = this.gl[Cast.toString(args.FUNC)];
      if (c !== undefined) this.gl.depthFunc(c);
    }

    /** Какие грани отсекать. */
    setCullMode(args) {
      if (!this._ready("setCullMode")) return;
      const gl = this.gl;
      const mode = Cast.toString(args.MODE);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(
        mode === "front" ? gl.FRONT : mode === "both" ? gl.FRONT_AND_BACK : gl.BACK
      );
    }

    /** Порядок намотки лицевых граней. */
    setFrontFace(args) {
      if (!this._ready("setFrontFace")) return;
      const gl = this.gl;
      gl.frontFace(Cast.toString(args.DIR) === "cw" ? gl.CW : gl.CCW);
    }

    /** Уравнение смешивания (сложение/вычитание/обратное вычитание). */
    setBlendEquation(args) {
      if (!this._ready("setBlendEquation")) return;
      const c = this.gl[Cast.toString(args.EQ)];
      if (c !== undefined) {
        this.gl.enable(this.gl.BLEND);
        this.gl.blendEquation(c);
      }
    }

    /** Факторы смешивания для источника и приёмника. */
    setBlendFunc(args) {
      if (!this._ready("setBlendFunc")) return;
      const gl = this.gl;
      const sf = gl[Cast.toString(args.SRC)];
      const df = gl[Cast.toString(args.DST)];
      if (sf === undefined || df === undefined) {
        this._err("setBlendFunc", "неизвестный фактор смешивания");
        return;
      }
      gl.enable(gl.BLEND);
      gl.blendFunc(sf, df);
    }

    /** Толщина линий (большинство GPU поддерживает только 1). */
    setLineWidth(args) {
      if (!this._ready("setLineWidth")) return;
      this.gl.lineWidth(Math.max(1, Cast.toNumber(args.W)));
    }

    /** Полигональное смещение глубины (борьба с z-fighting). */
    setPolygonOffset(args) {
      if (!this._ready("setPolygonOffset")) return;
      const gl = this.gl;
      const state = Cast.toString(args.STATE);
      if (state === "on") {
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(Cast.toNumber(args.FACTOR), Cast.toNumber(args.UNITS));
      } else {
        gl.disable(gl.POLYGON_OFFSET_FILL);
      }
    }

    flushGL() {
      if (this.gl) this.gl.flush();
    }

    finishGL() {
      if (this.gl) this.gl.finish();
    }

    // ======================================================================
    //  ДОПОЛНИТЕЛЬНО: UNIFORM И АТРИБУТЫ
    // ======================================================================

    /** Uniform-целое (например, индекс сэмплера, переключатель в шейдере). */
    setUniformInt(args) {
      if (!this._ready("setUniformInt")) return;
      const p = this._currentProgram("setUniformInt");
      if (!p) return;
      const loc = this._uniformLocation(p, Cast.toString(args.NAME));
      if (loc === null) {
        this._err("setUniformInt", "uniform «" + Cast.toString(args.NAME) + "» не найден");
        return;
      }
      this.gl.uniform1i(loc, Math.round(Cast.toNumber(args.V)));
    }

    /** Матрица 2x2 / 3x3 / 4x4 из плоского массива. */
    setUniformMatrix(args) {
      if (!this._ready("setUniformMatrix")) return;
      const p = this._currentProgram("setUniformMatrix");
      if (!p) return;
      const size = Math.round(Cast.toNumber(args.SIZE) || 4);
      const values = this._toNumberArray(args.ARR);
      const need = size * size;
      if (values.length !== need) {
        this._err("setUniformMatrix", "для матрицы " + size + "x" + size + " нужно " + need + " чисел, получено " + values.length);
        return;
      }
      const loc = this._uniformLocation(p, Cast.toString(args.NAME));
      if (loc === null) {
        this._err("setUniformMatrix", "uniform «" + Cast.toString(args.NAME) + "» не найден");
        return;
      }
      const gl = this.gl;
      if (size === 2) gl.uniformMatrix2fv(loc, false, new Float32Array(values));
      else if (size === 3) gl.uniformMatrix3fv(loc, false, new Float32Array(values));
      else gl.uniformMatrix4fv(loc, false, new Float32Array(values));
    }

    enableAttribute(args) {
      if (!this._ready("enableAttribute")) return;
      const p = this._currentProgram("enableAttribute");
      if (!p) return;
      const name = Cast.toString(args.NAME);
      let loc = p.attrib[name];
      if (loc === undefined) loc = p.attrib[name] = this.gl.getAttribLocation(p.program, name);
      if (loc >= 0) this.gl.enableVertexAttribArray(loc);
    }

    disableAttribute(args) {
      if (!this._ready("disableAttribute")) return;
      const p = this._currentProgram("disableAttribute");
      if (!p) return;
      const name = Cast.toString(args.NAME);
      let loc = p.attrib[name];
      if (loc === undefined) loc = p.attrib[name] = this.gl.getAttribLocation(p.program, name);
      if (loc >= 0) this.gl.disableVertexAttribArray(loc);
    }

    /** Константное значение атрибута (когда буфер не привязан). */
    setConstantAttribute(args) {
      if (!this._ready("setConstantAttribute")) return;
      const p = this._currentProgram("setConstantAttribute");
      if (!p) return;
      const gl = this.gl;
      const name = Cast.toString(args.NAME);
      let loc = p.attrib[name];
      if (loc === undefined) loc = p.attrib[name] = gl.getAttribLocation(p.program, name);
      if (loc < 0) {
        this._err("setConstantAttribute", "атрибут «" + name + "» не найден");
        return;
      }
      gl.disableVertexAttribArray(loc);
      const size = Math.min(4, Math.max(1, Math.round(Cast.toNumber(args.SIZE) || 2)));
      const x = Cast.toNumber(args.X);
      const y = Cast.toNumber(args.Y);
      const z = Cast.toNumber(args.Z);
      const w = Cast.toNumber(args.W);
      if (size === 1) gl.vertexAttrib1f(loc, x);
      else if (size === 2) gl.vertexAttrib2f(loc, x, y);
      else if (size === 3) gl.vertexAttrib3f(loc, x, y, z);
      else gl.vertexAttrib4f(loc, x, y, z, w);
    }

    // ======================================================================
    //  ДОПОЛНИТЕЛЬНО: БУФЕРЫ
    // ======================================================================

    /** Частичное обновление существующего буфера вершин. */
    bufferSubData(args) {
      if (!this._ready("bufferSubData")) return;
      const gl = this.gl;
      const entry = this.buffers[Cast.toString(args.ID)];
      if (!entry) {
        this._err("bufferSubData", "буфер «" + Cast.toString(args.ID) + "» не найден");
        return;
      }
      const data = this._toNumberArray(args.DATA);
      if (!data.length) return;
      const offset = Math.max(0, Math.round(Cast.toNumber(args.OFFSET) || 0));
      gl.bindBuffer(entry.target, entry.buffer);
      gl.bufferSubData(entry.target, offset * 4, new Float32Array(data));
    }

    /** Быстрое 2D-рисование: буфер вершин (x,y в пикселях) встроенным шейдером. */
    drawBuffer2D(args) {
      if (!this._ready("drawBuffer2D")) return;
      const gl = this.gl;
      const entry = this.buffers[Cast.toString(args.ID)];
      if (!entry || entry.target !== gl.ARRAY_BUFFER) {
        this._err("drawBuffer2D", "буфер вершин «" + Cast.toString(args.ID) + "» не найден");
        return;
      }
      if (!this._shapeProgram) return;
      this._useProgramObject(this._shapeProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, entry.buffer);
      const loc = gl.getAttribLocation(this._shapeProgram.program, "a_position");
      if (loc >= 0) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      }
      const cLoc = this._uniformLocation(this._shapeProgram, "u_color");
      if (cLoc !== null) {
        gl.uniform4f(
          cLoc,
          this._clamp01(Cast.toNumber(args.R)),
          this._clamp01(Cast.toNumber(args.G)),
          this._clamp01(Cast.toNumber(args.B)),
          this._clamp01(Cast.toNumber(args.A))
        );
      }
      gl.drawArrays(
        this._modeConst(Cast.toString(args.MODE)),
        0,
        Math.floor(entry.length / 2)
      );
      if (this.currentProgramId && this.programs[this.currentProgramId]) {
        this._useProgramObject(this.programs[this.currentProgramId]);
      }
    }

    // ======================================================================
    //  ДОПОЛНИТЕЛЬНО: РЕНДЕР В ТЕКСТУРУ (КАДРОВЫЕ БУФЕРЫ)
    // ======================================================================

    /**
     * Создаёт кадровый буфер с цветной текстурой [TEX] и (опционально)
     * буфером глубины.
     */
    createFramebuffer(args) {
      if (!this._ready("createFramebuffer")) return;
      const gl = this.gl;
      const id = Cast.toString(args.ID);
      const tex = this.textures[Cast.toString(args.TEX)];
      if (!tex || !tex.texture || !tex.loaded) {
        this._err("createFramebuffer", "текстура «" + Cast.toString(args.TEX) + "» не загружена");
        return;
      }
      try {
        if (this.framebuffers[id]) {
          if (this.framebuffers[id].fb) gl.deleteFramebuffer(this.framebuffers[id].fb);
          if (this.framebuffers[id].rb) gl.deleteRenderbuffer(this.framebuffers[id].rb);
        }
        const fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex.texture, 0
        );
        let rb = null;
        if (Cast.toString(args.DEPTH) === "on") {
          rb = gl.createRenderbuffer();
          gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
          gl.renderbufferStorage(
            gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, tex.width, tex.height
          );
          gl.framebufferRenderbuffer(
            gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb
          );
        }
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        this.framebuffers[id] = {
          fb,
          rb,
          width: tex.width,
          height: tex.height,
          textureId: Cast.toString(args.TEX),
          complete: status === gl.FRAMEBUFFER_COMPLETE,
        };
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
          this._err("createFramebuffer:" + id, "кадровый буфер неполон, статус 0x" + status.toString(16));
        }
        // Возвращаем вывод на экран — пусть пользователь сам решает, когда
        // переключаться блоком «рендерить в [цель]».
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      } catch (e) {
        this._err("createFramebuffer:" + id, e);
      }
    }

    /** Переключает вывод: id кадрового буфера или экран (пусто/«экран»). */
    bindFramebuffer(args) {
      if (!this._ready("bindFramebuffer")) return;
      const gl = this.gl;
      const target = Cast.toString(args.TARGET);
      if (!target || target === "screen" || target === "экран") {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        return;
      }
      const f = this.framebuffers[target];
      if (!f || !f.fb) {
        this._err("bindFramebuffer", "кадровый буфер «" + target + "» не найден");
        return;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, f.fb);
      gl.viewport(0, 0, f.width, f.height);
    }

    framebufferReady(args) {
      const f = this.framebuffers[Cast.toString(args.ID)];
      return !!(f && f.complete);
    }

    deleteFramebuffer(args) {
      if (!this.gl) return;
      const id = Cast.toString(args.ID);
      const f = this.framebuffers[id];
      if (f) {
        if (f.fb) this.gl.deleteFramebuffer(f.fb);
        if (f.rb) this.gl.deleteRenderbuffer(f.rb);
      }
      delete this.framebuffers[id];
    }

    // ======================================================================
    //  ДОПОЛНИТЕЛЬНО: ЧТЕНИЕ ПИКСЕЛЕЙ, РАЗМЕР, ОШИБКИ GL
    // ======================================================================

    /** Сырое чтение одного пикселя, координаты GL (Y снизу вверх). */
    _readPixel(glX, glY) {
      const pixel = new Uint8Array(4);
      this.gl.readPixels(
        Math.floor(glX),
        Math.floor(glY),
        1,
        1,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        pixel
      );
      return [pixel[0], pixel[1], pixel[2], pixel[3]];
    }

    /** Цвет пикселя в координатах сцены (Y вниз): строка "r,g,b,a" (0–255). */
    pixelAt(args) {
      if (!this._ready("pixelAt")) return "";
      try {
        const x = Math.floor(Cast.toNumber(args.X) || 0);
        // В WebGL начало координат снизу слева — переворачиваем ось Y.
        const y = this.canvas.height - Math.floor(Cast.toNumber(args.Y) || 0) - 1;
        return this._readPixel(x, y).join(", ");
      } catch (e) {
        this._err("pixelAt", e);
        return "";
      }
    }

    /** То же, но квадратным массивом [r,g,b,a] (Dash) или JSON-строкой. */
    pixelAtArray(args) {
      if (!this._ready("pixelAtArray")) return "";
      try {
        const x = Math.floor(Cast.toNumber(args.X) || 0);
        const y = this.canvas.height - Math.floor(Cast.toNumber(args.Y) || 0) - 1;
        return this._arrayValue(this._readPixel(x, y));
      } catch (e) {
        this._err("pixelAtArray", e);
        return "";
      }
    }

    /** Квадратный массив Dash либо JSON-строка в обычном TurboWarp. */
    _arrayValue(list) {
      const NormalArray = Scratch.NormalArray || null;
      if (NormalArray) {
        try {
          return new NormalArray(list);
        } catch (e) {
          /* ниже JSON */
        }
      }
      return JSON.stringify(list);
    }

    /** Подгоняет размер буфера кадра под реальный размер сцены. */
    resizeToStage(args) {
      if (!this._ready("resizeToStage")) return;
      const stage = runtime.canvas;
      if (!stage) return;
      let width = Number(stage.width) || 0;
      let height = Number(stage.height) || 0;
      const rect = stage.getBoundingClientRect ? stage.getBoundingClientRect() : null;
      if (rect && rect.width) {
        width = rect.width;
        height = rect.height;
      }
      let scale = 1;
      if (Cast.toString(args.DPR) === "device" && window.devicePixelRatio) {
        scale = window.devicePixelRatio;
      }
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
      this.canvas.width = width;
      this.canvas.height = height;
      this._lastRect = "";
      this._placeCanvas();
      this.gl.viewport(0, 0, width, height);
      this._setResolution(this.currentProgramId);
    }

    canvasWidth() {
      return this.canvas ? this.canvas.width : 0;
    }

    canvasHeight() {
      return this.canvas ? this.canvas.height : 0;
    }

    isContextLost() {
      if (!this.gl) return false;
      try {
        if (typeof this.gl.isContextLost === "function") {
          return this.gl.isContextLost() || this.contextLost;
        }
      } catch (e) {
        /* ignore */
      }
      return this.contextLost;
    }

    whenContext(args, util) {
      const state = Cast.toString(args.EVENT) === "restored" ? "restored" : "lost";
      return this._checkHat("whenContext", state, util);
    }

    /** Последняя ошибка самого GL (gl.getError) текстом. */
    getGLError() {
      if (!this.gl) return "контекст не создан";
      const gl = this.gl;
      let code;
      try {
        code = gl.getError();
      } catch (e) {
        return "ошибка опроса";
      }
      if (code === 0 || code === gl.NO_ERROR) return "нет ошибки";
      const names = [
        "INVALID_ENUM",
        "INVALID_VALUE",
        "INVALID_OPERATION",
        "INVALID_FRAMEBUFFER_OPERATION",
        "OUT_OF_MEMORY",
        "CONTEXT_LOST_WEBGL",
      ];
      for (const n of names) {
        if (gl[n] === code) return n;
      }
      return "0x" + code.toString(16);
    }

    // ======================================================================
    //  ОПИСАНИЕ БЛОКОВ
    // ======================================================================

    getInfo() {
      return {
        id: "webglru",
        name: "WebGL (RU)",
        color1: "#7C3AED",
        color2: "#5B21B6",
        color3: "#4C1D95",
        menuIconURI: ICON,
        blockIconURI: ICON,
        docsURI: "https://developer.mozilla.org/ru/docs/Web/API/WebGL_API",
        blocks: [
          // --- Холст ---
          { blockType: Scratch.BlockType.LABEL, text: "Холст и возможности" },
          {
            opcode: "createCanvas",
            blockType: Scratch.BlockType.COMMAND,
            text: "создать WebGL-холст [VERSION], размер [W] x [H]",
            arguments: {
              VERSION: {
                type: Scratch.ArgumentType.STRING,
                menu: "versions",
                defaultValue: "auto",
              },
              W: { type: Scratch.ArgumentType.NUMBER, defaultValue: 480 },
              H: { type: Scratch.ArgumentType.NUMBER, defaultValue: 360 },
            },
          },
          {
            opcode: "resizeCanvas",
            blockType: Scratch.BlockType.COMMAND,
            text: "изменить размер холста: [W] x [H]",
            arguments: {
              W: { type: Scratch.ArgumentType.NUMBER, defaultValue: 480 },
              H: { type: Scratch.ArgumentType.NUMBER, defaultValue: 360 },
            },
          },
          {
            opcode: "setVisible",
            blockType: Scratch.BlockType.COMMAND,
            text: "[STATE] холст",
            arguments: {
              STATE: { type: Scratch.ArgumentType.STRING, menu: "showhide", defaultValue: "show" },
            },
          },
          {
            opcode: "setLayer",
            blockType: Scratch.BlockType.COMMAND,
            text: "разместить холст [LAYER]",
            arguments: {
              LAYER: { type: Scratch.ArgumentType.STRING, menu: "layers", defaultValue: "front" },
            },
          },
          {
            opcode: "destroyCanvas",
            blockType: Scratch.BlockType.COMMAND,
            text: "удалить WebGL-холст",
          },
          {
            opcode: "canvasReady",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "холст создан?",
          },
          {
            opcode: "isWebGLSupported",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "WebGL поддерживается?",
          },
          {
            opcode: "isWebGL2Supported",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "WebGL 2 поддерживается?",
          },
          {
            opcode: "getVersion",
            blockType: Scratch.BlockType.REPORTER,
            text: "версия WebGL",
          },
          {
            opcode: "getVendor",
            blockType: Scratch.BlockType.REPORTER,
            text: "производитель графики",
          },
          {
            opcode: "getRenderer",
            blockType: Scratch.BlockType.REPORTER,
            text: "видеокарта (рендерер)",
          },
          {
            opcode: "getGLSL",
            blockType: Scratch.BlockType.REPORTER,
            text: "версия языка шейдеров (GLSL)",
          },
          {
            opcode: "getMaxTextureSize",
            blockType: Scratch.BlockType.REPORTER,
            text: "максимальный размер текстуры",
          },
          {
            opcode: "isExtensionSupported",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "расширение WebGL [EXT] поддерживается?",
            arguments: {
              EXT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "OES_texture_float",
              },
            },
          },
          {
            opcode: "getExtensionsList",
            blockType: Scratch.BlockType.REPORTER,
            text: "список расширений WebGL",
          },
          {
            opcode: "getLastError",
            blockType: Scratch.BlockType.REPORTER,
            text: "последняя ошибка WebGL",
          },
          {
            opcode: "clearError",
            blockType: Scratch.BlockType.COMMAND,
            text: "очистить ошибки WebGL",
          },

          // --- Кадр ---
          { blockType: Scratch.BlockType.LABEL, text: "Кадр и состояния" },
          {
            opcode: "whenFrame",
            blockType: Scratch.BlockType.HAT,
            text: "когда отрисован кадр",
            isEdgeActivated: true,
          },
          {
            opcode: "getFps",
            blockType: Scratch.BlockType.REPORTER,
            text: "FPS",
          },
          {
            opcode: "getFrameMs",
            blockType: Scratch.BlockType.REPORTER,
            text: "время кадра (мс)",
          },
          {
            opcode: "clearColor",
            blockType: Scratch.BlockType.COMMAND,
            text: "очистить холст: R [R] G [G] B [B] A [A]",
            arguments: {
              R: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              G: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              B: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              A: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: "setBlend",
            blockType: Scratch.BlockType.COMMAND,
            text: "режим смешивания [BLEND]",
            arguments: {
              BLEND: { type: Scratch.ArgumentType.STRING, menu: "blendModes", defaultValue: "alpha" },
            },
          },
          {
            opcode: "setDepthTest",
            blockType: Scratch.BlockType.COMMAND,
            text: "[STATE] проверку глубины",
            arguments: {
              STATE: { type: Scratch.ArgumentType.STRING, menu: "onoff", defaultValue: "off" },
            },
          },
          {
            opcode: "setCullFace",
            blockType: Scratch.BlockType.COMMAND,
            text: "[STATE] отсечение задних граней",
            arguments: {
              STATE: { type: Scratch.ArgumentType.STRING, menu: "onoff", defaultValue: "off" },
            },
          },
          {
            opcode: "setViewport",
            blockType: Scratch.BlockType.COMMAND,
            text: "область просмотра: x [X] y [Y] ширина [W] высота [H]",
            arguments: {
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              W: { type: Scratch.ArgumentType.NUMBER, defaultValue: 480 },
              H: { type: Scratch.ArgumentType.NUMBER, defaultValue: 360 },
            },
          },
          {
            opcode: "clearEx",
            blockType: Scratch.BlockType.COMMAND,
            text: "очистить буферы [WHAT]",
            arguments: {
              WHAT: { type: Scratch.ArgumentType.STRING, menu: "clearBits", defaultValue: "both" },
            },
          },
          {
            opcode: "setClearDepth",
            blockType: Scratch.BlockType.COMMAND,
            text: "значение очистки глубины [D]",
            arguments: {
              D: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: "setScissor",
            blockType: Scratch.BlockType.COMMAND,
            text: "ножницы: x [X] y [Y] ширина [W] высота [H]",
            arguments: {
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              W: { type: Scratch.ArgumentType.NUMBER, defaultValue: 480 },
              H: { type: Scratch.ArgumentType.NUMBER, defaultValue: 360 },
            },
          },
          {
            opcode: "disableScissor",
            blockType: Scratch.BlockType.COMMAND,
            text: "выключить ножницы",
          },
          {
            opcode: "setColorMask",
            blockType: Scratch.BlockType.COMMAND,
            text: "запись цвета: R [R] G [G] B [B] A [A]",
            arguments: {
              R: { type: Scratch.ArgumentType.STRING, menu: "onoff", defaultValue: "on" },
              G: { type: Scratch.ArgumentType.STRING, menu: "onoff", defaultValue: "on" },
              B: { type: Scratch.ArgumentType.STRING, menu: "onoff", defaultValue: "on" },
              A: { type: Scratch.ArgumentType.STRING, menu: "onoff", defaultValue: "on" },
            },
          },
          {
            opcode: "setDepthMask",
            blockType: Scratch.BlockType.COMMAND,
            text: "запись глубины [STATE]",
            arguments: {
              STATE: { type: Scratch.ArgumentType.STRING, menu: "onoff", defaultValue: "on" },
            },
          },
          {
            opcode: "setDepthFunc",
            blockType: Scratch.BlockType.COMMAND,
            text: "функция глубины [FUNC]",
            arguments: {
              FUNC: { type: Scratch.ArgumentType.STRING, menu: "depthFuncs", defaultValue: "LESS" },
            },
          },
          {
            opcode: "setCullMode",
            blockType: Scratch.BlockType.COMMAND,
            text: "отсекать грани [MODE]",
            arguments: {
              MODE: { type: Scratch.ArgumentType.STRING, menu: "faceModes", defaultValue: "back" },
            },
          },
          {
            opcode: "setFrontFace",
            blockType: Scratch.BlockType.COMMAND,
            text: "лицевые грани намотаны [DIR]",
            arguments: {
              DIR: { type: Scratch.ArgumentType.STRING, menu: "windings", defaultValue: "ccw" },
            },
          },
          {
            opcode: "setCapability",
            blockType: Scratch.BlockType.COMMAND,
            text: "[STATE] возможность GL [CAP]",
            arguments: {
              STATE: { type: Scratch.ArgumentType.STRING, menu: "onoff", defaultValue: "on" },
              CAP: { type: Scratch.ArgumentType.STRING, menu: "capabilities", defaultValue: "SCISSOR_TEST" },
            },
          },
          {
            opcode: "setBlendEquation",
            blockType: Scratch.BlockType.COMMAND,
            text: "уравнение смешивания [EQ]",
            arguments: {
              EQ: { type: Scratch.ArgumentType.STRING, menu: "blendEquations", defaultValue: "FUNC_ADD" },
            },
          },
          {
            opcode: "setBlendFunc",
            blockType: Scratch.BlockType.COMMAND,
            text: "факторы смешивания: источник [SRC], приёмник [DST]",
            arguments: {
              SRC: { type: Scratch.ArgumentType.STRING, menu: "blendFactors", defaultValue: "SRC_ALPHA" },
              DST: { type: Scratch.ArgumentType.STRING, menu: "blendFactors", defaultValue: "ONE_MINUS_SRC_ALPHA" },
            },
          },
          {
            opcode: "setLineWidth",
            blockType: Scratch.BlockType.COMMAND,
            text: "толщина линий [W]",
            arguments: {
              W: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: "setPolygonOffset",
            blockType: Scratch.BlockType.COMMAND,
            text: "полигональное смещение [STATE], множитель [FACTOR], единицы [UNITS]",
            arguments: {
              STATE: { type: Scratch.ArgumentType.STRING, menu: "onoff", defaultValue: "on" },
              FACTOR: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              UNITS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: "flushGL",
            blockType: Scratch.BlockType.COMMAND,
            text: "отправить все команды на GPU (flush)",
          },
          {
            opcode: "finishGL",
            blockType: Scratch.BlockType.COMMAND,
            text: "дождаться выполнения команд GPU (finish)",
          },

          // --- Шейдеры ---
          { blockType: Scratch.BlockType.LABEL, text: "Шейдеры" },
          {
            opcode: "createProgram",
            blockType: Scratch.BlockType.COMMAND,
            text: "скомпилировать программу [ID]: вершинный [VS] фрагментный [FS]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "main" },
              VS: { type: Scratch.ArgumentType.STRING, defaultValue: DEFAULT_VS },
              FS: { type: Scratch.ArgumentType.STRING, defaultValue: DEFAULT_FS },
            },
          },
          {
            opcode: "useProgram",
            blockType: Scratch.BlockType.COMMAND,
            text: "использовать программу [ID]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "main" },
            },
          },
          {
            opcode: "programReady",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "программа [ID] готова?",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "main" },
            },
          },
          {
            opcode: "deleteProgram",
            blockType: Scratch.BlockType.COMMAND,
            text: "удалить программу [ID]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "main" },
            },
          },
          {
            opcode: "setUniformVector",
            blockType: Scratch.BlockType.COMMAND,
            text: "uniform [NAME] [TYPE]: [X] [Y] [Z] [W]",
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "u_color" },
              TYPE: { type: Scratch.ArgumentType.STRING, menu: "uniformTypes", defaultValue: "vec4" },
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              Z: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              W: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: "setUniformMatrix4",
            blockType: Scratch.BlockType.COMMAND,
            blockShape: SQUARE,
            text: "uniform-матрица 4x4 [NAME] из массива [ARR]",
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "u_matrix" },
              ARR: { type: Scratch.ArgumentType.STRING, defaultValue: "1,0,0,0 0,1,0,0 0,0,1,0 0,0,0,1" },
            },
          },
          {
            opcode: "getAttribLocation",
            blockType: Scratch.BlockType.REPORTER,
            text: "позиция атрибута [NAME]",
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "a_position" },
            },
          },
          {
            opcode: "bindFullscreenQuad",
            blockType: Scratch.BlockType.COMMAND,
            text: "привязать квадрат на весь холст к атрибуту [NAME]",
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "a_position" },
            },
          },
          {
            opcode: "setUniformInt",
            blockType: Scratch.BlockType.COMMAND,
            text: "uniform-число целое [NAME] = [V]",
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "u_texture" },
              V: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            },
          },
          {
            opcode: "setUniformMatrix",
            blockType: Scratch.BlockType.COMMAND,
            blockShape: SQUARE,
            text: "uniform-матрица [SIZE]x[SIZE] [NAME] из массива [ARR]",
            arguments: {
              SIZE: { type: Scratch.ArgumentType.NUMBER, menu: "matrixSizes", defaultValue: 4 },
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "u_matrix" },
              ARR: { type: Scratch.ArgumentType.STRING, defaultValue: "1,0,0,0 0,1,0,0 0,0,1,0 0,0,0,1" },
            },
          },
          {
            opcode: "enableAttribute",
            blockType: Scratch.BlockType.COMMAND,
            text: "включить атрибут [NAME]",
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "a_position" },
            },
          },
          {
            opcode: "disableAttribute",
            blockType: Scratch.BlockType.COMMAND,
            text: "выключить атрибут [NAME]",
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "a_position" },
            },
          },
          {
            opcode: "setConstantAttribute",
            blockType: Scratch.BlockType.COMMAND,
            text: "константа атрибута [NAME] [SIZE]: [X] [Y] [Z] [W]",
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "a_color" },
              SIZE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 4 },
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              Z: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              W: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },

          // --- Геометрия ---
          { blockType: Scratch.BlockType.LABEL, text: "Буферы и примитивы" },
          {
            opcode: "createBuffer",
            blockType: Scratch.BlockType.COMMAND,
            blockShape: SQUARE,
            text: "создать буфер вершин [ID] из массива [DATA]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "verts" },
              DATA: { type: Scratch.ArgumentType.STRING, defaultValue: "0,0 480,0 0,360" },
            },
          },
          {
            opcode: "createIndexBuffer",
            blockType: Scratch.BlockType.COMMAND,
            blockShape: SQUARE,
            text: "создать индексный буфер [ID] из массива [DATA]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "index" },
              DATA: { type: Scratch.ArgumentType.STRING, defaultValue: "0,1,2" },
            },
          },
          {
            opcode: "deleteBuffer",
            blockType: Scratch.BlockType.COMMAND,
            text: "удалить буфер [ID]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "verts" },
            },
          },
          {
            opcode: "setAttribute",
            blockType: Scratch.BlockType.COMMAND,
            text: "атрибут [NAME] из буфера [BUF], компонентов [SIZE]",
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "a_position" },
              BUF: { type: Scratch.ArgumentType.STRING, defaultValue: "verts" },
              SIZE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 2 },
            },
          },
          {
            opcode: "drawArrays",
            blockType: Scratch.BlockType.COMMAND,
            text: "нарисовать [MODE]: вершин [COUNT], со смещения [FIRST]",
            arguments: {
              MODE: { type: Scratch.ArgumentType.STRING, menu: "drawModes", defaultValue: "triangles" },
              COUNT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 3 },
              FIRST: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            },
          },
          {
            opcode: "drawElements",
            blockType: Scratch.BlockType.COMMAND,
            text: "нарисовать индексами [MODE] из буфера [BUF], индексов [COUNT]",
            arguments: {
              MODE: { type: Scratch.ArgumentType.STRING, menu: "drawModes", defaultValue: "triangles" },
              BUF: { type: Scratch.ArgumentType.STRING, defaultValue: "index" },
              COUNT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 3 },
            },
          },
          {
            opcode: "bufferSubData",
            blockType: Scratch.BlockType.COMMAND,
            blockShape: SQUARE,
            text: "обновить буфер [ID] с позиции [OFFSET] массивом [DATA]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "verts" },
              OFFSET: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              DATA: { type: Scratch.ArgumentType.STRING, defaultValue: "0,0" },
            },
          },
          {
            opcode: "drawBuffer2D",
            blockType: Scratch.BlockType.COMMAND,
            text: "2D: нарисовать буфер [ID] режимом [MODE], R [R] G [G] B [B] A [A]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "verts" },
              MODE: { type: Scratch.ArgumentType.STRING, menu: "drawModes", defaultValue: "triangles" },
              R: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              G: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              B: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              A: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },

          // --- 2D-помощники ---
          { blockType: Scratch.BlockType.LABEL, text: "2D-помощники (пиксели)" },
          {
            opcode: "drawRect",
            blockType: Scratch.BlockType.COMMAND,
            text: "прямоугольник x [X] y [Y] ширина [W] высота [H], R [R] G [G] B [B] A [A]",
            arguments: {
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 50 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 50 },
              W: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
              H: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 },
              R: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0.2 },
              G: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0.8 },
              B: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              A: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: "drawTriangle",
            blockType: Scratch.BlockType.COMMAND,
            text: "треугольник: ([X1],[Y1]) ([X2],[Y2]) ([X3],[Y3]), R [R] G [G] B [B] A [A]",
            arguments: {
              X1: { type: Scratch.ArgumentType.NUMBER, defaultValue: 240 },
              Y1: { type: Scratch.ArgumentType.NUMBER, defaultValue: 60 },
              X2: { type: Scratch.ArgumentType.NUMBER, defaultValue: 140 },
              Y2: { type: Scratch.ArgumentType.NUMBER, defaultValue: 260 },
              X3: { type: Scratch.ArgumentType.NUMBER, defaultValue: 340 },
              Y3: { type: Scratch.ArgumentType.NUMBER, defaultValue: 260 },
              R: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              G: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0.3 },
              B: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0.8 },
              A: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: "drawTexturedRect",
            blockType: Scratch.BlockType.COMMAND,
            text: "текстура [ID] в рамке x [X] y [Y] ширина [W] высота [H]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "logo" },
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              W: { type: Scratch.ArgumentType.NUMBER, defaultValue: 480 },
              H: { type: Scratch.ArgumentType.NUMBER, defaultValue: 360 },
            },
          },

          // --- Текстуры ---
          { blockType: Scratch.BlockType.LABEL, text: "Текстуры" },
          {
            opcode: "loadTexture",
            blockType: Scratch.BlockType.COMMAND,
            text: "загрузить текстуру [ID] по URL [URL]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "logo" },
              URL: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "https://extensions.turbowarp.org/logo.png",
              },
            },
          },
          {
            opcode: "loadTextureFromCostume",
            blockType: Scratch.BlockType.COMMAND,
            text: "текстура [ID] из костюма [NAME]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "skin" },
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "" },
            },
          },
          {
            opcode: "loadTexturePixels",
            blockType: Scratch.BlockType.COMMAND,
            blockShape: SQUARE,
            text: "текстура [ID] из RGBA-пикселей [DATA], размер [W] x [H]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "pixels" },
              W: { type: Scratch.ArgumentType.NUMBER, defaultValue: 2 },
              H: { type: Scratch.ArgumentType.NUMBER, defaultValue: 2 },
              DATA: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "255,0,0,255 0,255,0,255 0,0,255,255 255,255,0,255",
              },
            },
          },
          {
            opcode: "setFlipY",
            blockType: Scratch.BlockType.COMMAND,
            text: "переворот текстур по Y [STATE]",
            arguments: {
              STATE: { type: Scratch.ArgumentType.STRING, menu: "onoff", defaultValue: "off" },
            },
          },
          {
            opcode: "setPremultiply",
            blockType: Scratch.BlockType.COMMAND,
            text: "premultiply alpha текстур [STATE]",
            arguments: {
              STATE: { type: Scratch.ArgumentType.STRING, menu: "onoff", defaultValue: "off" },
            },
          },
          {
            opcode: "textureReady",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "текстура [ID] загружена?",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "logo" },
            },
          },
          {
            opcode: "whenTexture",
            blockType: Scratch.BlockType.HAT,
            text: "когда текстура [ID] [TSTATE]",
            isEdgeActivated: true,
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "logo" },
              TSTATE: { type: Scratch.ArgumentType.STRING, menu: "textureStates", defaultValue: "loaded" },
            },
          },
          {
            opcode: "bindTexture",
            blockType: Scratch.BlockType.COMMAND,
            text: "привязать текстуру [ID] к слоту [SLOT]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "logo" },
              SLOT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            },
          },
          {
            opcode: "bindTextureToUniform",
            blockType: Scratch.BlockType.COMMAND,
            text: "привязать текстуру [ID] к слоту [SLOT] и сэмплеру [UNIFORM]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "logo" },
              SLOT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              UNIFORM: { type: Scratch.ArgumentType.STRING, defaultValue: "u_texture" },
            },
          },
          {
            opcode: "setTextureParams",
            blockType: Scratch.BlockType.COMMAND,
            text: "у текстуры [ID] повтор [WRAP], фильтр [FILTER]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "logo" },
              WRAP: { type: Scratch.ArgumentType.STRING, menu: "wrapModes", defaultValue: "clamp" },
              FILTER: { type: Scratch.ArgumentType.STRING, menu: "filters", defaultValue: "linear" },
            },
          },
          {
            opcode: "getTextureSize",
            blockType: Scratch.BlockType.REPORTER,
            text: "размер текстуры [ID]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "logo" },
            },
          },
          {
            opcode: "deleteTexture",
            blockType: Scratch.BlockType.COMMAND,
            text: "удалить текстуру [ID]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "logo" },
            },
          },

          // --- Рендер в текстуру ---
          { blockType: Scratch.BlockType.LABEL, text: "Рендер в текстуру" },
          {
            opcode: "createFramebuffer",
            blockType: Scratch.BlockType.COMMAND,
            text: "кадровый буфер [ID] на текстуре [TEX], глубина [DEPTH]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "target" },
              TEX: { type: Scratch.ArgumentType.STRING, defaultValue: "logo" },
              DEPTH: { type: Scratch.ArgumentType.STRING, menu: "onoff", defaultValue: "off" },
            },
          },
          {
            opcode: "bindFramebuffer",
            blockType: Scratch.BlockType.COMMAND,
            text: "рендерить в [TARGET]",
            arguments: {
              TARGET: { type: Scratch.ArgumentType.STRING, menu: "renderTargets", defaultValue: "screen" },
            },
          },
          {
            opcode: "framebufferReady",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "кадровый буфер [ID] готов?",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "target" },
            },
          },
          {
            opcode: "deleteFramebuffer",
            blockType: Scratch.BlockType.COMMAND,
            text: "удалить кадровый буфер [ID]",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "target" },
            },
          },

          // --- Снимок ---
          { blockType: Scratch.BlockType.LABEL, text: "Снимок кадра и пиксели" },
          {
            opcode: "pixelAt",
            blockType: Scratch.BlockType.REPORTER,
            text: "пиксель в x [X] y [Y] (r,g,b,a)",
            arguments: {
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            },
          },
          {
            opcode: "pixelAtArray",
            blockType: Scratch.BlockType.REPORTER,
            blockShape: SQUARE,
            text: "пиксель в x [X] y [Y] массивом",
            arguments: {
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            },
          },
          {
            opcode: "snapshotDataURL",
            blockType: Scratch.BlockType.REPORTER,
            text: "кадр как картинка (data URL)",
          },
          {
            opcode: "snapshotToCostume",
            blockType: Scratch.BlockType.COMMAND,
            text: "сохранить кадр как костюм [NAME]",
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "WebGL кадр" },
            },
          },
          {
            opcode: "resizeToStage",
            blockType: Scratch.BlockType.COMMAND,
            text: "подогнать холст под сцену, плотность [DPR]",
            arguments: {
              DPR: { type: Scratch.ArgumentType.STRING, menu: "dprModes", defaultValue: "1" },
            },
          },
          {
            opcode: "canvasWidth",
            blockType: Scratch.BlockType.REPORTER,
            text: "ширина холста (пиксели буфера)",
          },
          {
            opcode: "canvasHeight",
            blockType: Scratch.BlockType.REPORTER,
            text: "высота холста (пиксели буфера)",
          },
          {
            opcode: "getGLError",
            blockType: Scratch.BlockType.REPORTER,
            text: "ошибка GL (gl.getError)",
          },
          {
            opcode: "isContextLost",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "контекст WebGL потерян?",
          },
          {
            opcode: "whenContext",
            blockType: Scratch.BlockType.HAT,
            text: "когда контекст WebGL [EVENT]",
            isEdgeActivated: true,
            arguments: {
              EVENT: { type: Scratch.ArgumentType.STRING, menu: "contextEvents", defaultValue: "lost" },
            },
          },
        ],

        menus: {
          versions: {
            acceptReporters: true,
            items: [
              { text: "авто (WebGL 2, иначе 1)", value: "auto" },
              { text: "только WebGL 2", value: "webgl2" },
              { text: "только WebGL 1", value: "webgl1" },
            ],
          },
          showhide: {
            acceptReporters: true,
            items: [
              { text: "показать", value: "show" },
              { text: "скрыть", value: "hide" },
            ],
          },
          layers: {
            acceptReporters: true,
            items: [
              { text: "поверх сцены", value: "front" },
              { text: "позади сцены", value: "behind" },
            ],
          },
          onoff: {
            acceptReporters: true,
            items: [
              { text: "включить", value: "on" },
              { text: "выключить", value: "off" },
            ],
          },
          blendModes: {
            acceptReporters: true,
            items: [
              { text: "выключить", value: "off" },
              { text: "альфа (прозрачность)", value: "alpha" },
              { text: "аддитивное (свечение)", value: "additive" },
            ],
          },
          uniformTypes: {
            acceptReporters: true,
            items: [
              { text: "число", value: "float" },
              { text: "вектор 2", value: "vec2" },
              { text: "вектор 3", value: "vec3" },
              { text: "вектор 4", value: "vec4" },
            ],
          },
          drawModes: {
            acceptReporters: true,
            items: [
              { text: "треугольники", value: "triangles" },
              { text: "лента треугольников", value: "triangle_strip" },
              { text: "веер треугольников", value: "triangle_fan" },
              { text: "линии", value: "lines" },
              { text: "лента линий", value: "line_strip" },
              { text: "точки", value: "points" },
            ],
          },
          textureStates: {
            acceptReporters: true,
            items: [
              { text: "загружена", value: "loaded" },
              { text: "ошибка загрузки", value: "error" },
            ],
          },
          wrapModes: {
            acceptReporters: true,
            items: [
              { text: "зажим (без повтора)", value: "clamp" },
              { text: "повтор", value: "repeat" },
            ],
          },
          filters: {
            acceptReporters: true,
            items: [
              { text: "линейный (плавный)", value: "linear" },
              { text: "ближайший (пиксельный)", value: "nearest" },
            ],
          },
          clearBits: {
            acceptReporters: true,
            items: [
              { text: "цвет и глубину", value: "both" },
              { text: "только цвет", value: "color" },
              { text: "только глубину", value: "depth" },
            ],
          },
          capabilities: {
            acceptReporters: true,
            items: [
              { text: "смешивание (BLEND)", value: "BLEND" },
              { text: "проверку глубины (DEPTH_TEST)", value: "DEPTH_TEST" },
              { text: "отсечение граней (CULL_FACE)", value: "CULL_FACE" },
              { text: "ножницы (SCISSOR_TEST)", value: "SCISSOR_TEST" },
              { text: "смещение полигонов (POLYGON_OFFSET_FILL)", value: "POLYGON_OFFSET_FILL" },
              { text: "дизеринг (DITHER)", value: "DITHER" },
              { text: "сглаживание альфы (SAMPLE_ALPHA_TO_COVERAGE)", value: "SAMPLE_ALPHA_TO_COVERAGE" },
            ],
          },
          depthFuncs: {
            acceptReporters: true,
            items: [
              { text: "никогда (NEVER)", value: "NEVER" },
              { text: "меньше (LESS)", value: "LESS" },
              { text: "равно (EQUAL)", value: "EQUAL" },
              { text: "меньше или равно (LEQUAL)", value: "LEQUAL" },
              { text: "больше (GREATER)", value: "GREATER" },
              { text: "не равно (NOTEQUAL)", value: "NOTEQUAL" },
              { text: "больше или равно (GEQUAL)", value: "GEQUAL" },
              { text: "всегда (ALWAYS)", value: "ALWAYS" },
            ],
          },
          faceModes: {
            acceptReporters: true,
            items: [
              { text: "задние", value: "back" },
              { text: "передние", value: "front" },
              { text: "и те, и другие", value: "both" },
            ],
          },
          windings: {
            acceptReporters: true,
            items: [
              { text: "против часовой (CCW)", value: "ccw" },
              { text: "по часовой (CW)", value: "cw" },
            ],
          },
          blendEquations: {
            acceptReporters: true,
            items: [
              { text: "сложение (FUNC_ADD)", value: "FUNC_ADD" },
              { text: "вычитание (FUNC_SUBTRACT)", value: "FUNC_SUBTRACT" },
              { text: "обратное вычитание (REVERSE_SUBTRACT)", value: "REVERSE_SUBTRACT" },
            ],
          },
          blendFactors: {
            acceptReporters: true,
            items: [
              { text: "ноль (ZERO)", value: "ZERO" },
              { text: "единица (ONE)", value: "ONE" },
              { text: "альфа источника (SRC_ALPHA)", value: "SRC_ALPHA" },
              { text: "1 − альфа источника", value: "ONE_MINUS_SRC_ALPHA" },
              { text: "альфа приёмника (DST_ALPHA)", value: "DST_ALPHA" },
              { text: "1 − альфа приёмника", value: "ONE_MINUS_DST_ALPHA" },
              { text: "цвет источника (SRC_COLOR)", value: "SRC_COLOR" },
              { text: "1 − цвет источника", value: "ONE_MINUS_SRC_COLOR" },
            ],
          },
          matrixSizes: {
            acceptReporters: true,
            items: [
              { text: "2", value: "2" },
              { text: "3", value: "3" },
              { text: "4", value: "4" },
            ],
          },
          renderTargets: {
            acceptReporters: true,
            items: [
              { text: "экран", value: "screen" },
              { text: "target (пример id)", value: "target" },
            ],
          },
          dprModes: {
            acceptReporters: true,
            items: [
              { text: "1 (без масштаба)", value: "1" },
              { text: "как у дисплея (retina)", value: "device" },
            ],
          },
          contextEvents: {
            acceptReporters: true,
            items: [
              { text: "потерян", value: "lost" },
              { text: "восстановлен", value: "restored" },
            ],
          },
        },
      };
    }
  }

  Scratch.extensions.register(new WebGLRU());
})(Scratch);
