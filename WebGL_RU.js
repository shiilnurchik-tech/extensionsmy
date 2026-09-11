// Name: WebGL (RU)
// ID: webglru
// Description: 2D/3D-графика на WebGL прямо поверх сцены: шейдеры, uniform-переменные, буферы вершин, текстуры по URL, примитивы, FPS и снимок кадра в костюм.
// Author: extensionsmy
// Version: 1.0.0
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
//    * Холст WebGL1/WebGL2 автоматически встаёт поверх (или позади) сцены;
//    * информация о видеокарте, версии WebGL, поддерживаемых расширениях;
//    * свои вершинные/фрагментные шейды, uniform-переменные и атрибуты;
//    * буферы вершин и индексов (в т.ч. квадратные массивы Dash),
//      рисование TRIANGLES / LINES / POINTS и т.д.;
//    * готовые 2D-блоки: прямоугольник, треугольник, текстура в рамке;
//    * загрузка текстур по URL (CORS), фильтры и повтор;
//    * HAT-блок «когда отрисован кадр», FPS и время кадра;
//    * снимок кадра в data-URL или сразу в новый костюм спрайта.
//
//  Координаты встроенных 2D-блоков — пиксели сцены (ось Y вниз, как в
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
      this.currentProgramId = "";
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

      console.log(
        "%cWebGL (RU) v1.0.0",
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

      // Массивы Dash и обычные массивы.
      if (Array.isArray(value) || (typeof value === "object" && typeof value.length === "number" && typeof value !== "string")) {
        try {
          return Array.from(value, (v) => Number(v)).filter((v) => !Number.isNaN(v));
        } catch (e) {
          /* упадём ниже в парсинг строки */
        }
      }
      if (typeof value === "object") {
        try {
          const parsed = JSON.parse(String(value));
          if (Array.isArray(parsed)) {
            return parsed.map(Number).filter((v) => !Number.isNaN(v));
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
          return parsed.map(Number).filter((v) => !Number.isNaN(v));
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
        const probe = document.createElement("canvas");
        probe.width = probe.height = 1;
        const gl2 = probe.getContext("webgl2");
        if (gl2) {
          out.webgl2 = true;
          out.gl2 = gl2;
        }
        const gl1 =
          probe.getContext("webgl") || probe.getContext("experimental-webgl");
        if (gl1) {
          out.webgl1 = true;
          out.gl1 = gl1;
        }
        // Освобождаем пробные контексты.
        try {
          const lose2 = gl2 && gl2.getExtension("WEBGL_lose_context");
          if (lose2) lose2.loseContext();
          const lose1 = gl1 && gl1.getExtension("WEBGL_lose_context");
          if (lose1 && gl1 !== gl2) lose1.loseContext();
        } catch (e) {
          /* ignore */
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
      this.programs = Object.create(null);
      this.buffers = Object.create(null);
      this.textures = Object.create(null);
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
      const locRes = this._uniformLocation(p, "u_resolution") !== null
        ? this._uniformLocation(p, "u_resolution")
        : this._uniformLocation(p, "uResolution");
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

    loadTexture(args) {
      if (!this._ready("loadTexture")) return;
      const gl = this.gl;
      const id = Cast.toString(args.ID);
      const url = Cast.toString(args.URL);
      if (!url) {
        this._err("loadTexture", "пустой URL текстуры «" + id + "»");
        return;
      }

      let entry = this.textures[id];
      if (!entry) {
        entry = { texture: gl.createTexture(), width: 0, height: 0, loaded: false, error: false };
        this.textures[id] = entry;
      }
      entry.loaded = false;
      entry.error = false;

      // Заполняем прозрачным 1x1, чтобы текстура была валидной до загрузки.
      gl.bindTexture(gl.TEXTURE_2D, entry.texture);
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 0, 0])
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (!this.gl || this.textures[id] !== entry) return;
        try {
          gl.bindTexture(gl.TEXTURE_2D, entry.texture);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
          entry.width = img.naturalWidth || img.width;
          entry.height = img.naturalHeight || img.height;
          const pot =
            (entry.width & (entry.width - 1)) === 0 &&
            (entry.height & (entry.height - 1)) === 0;
          if (pot) {
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
          } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          }
          entry.loaded = true;
          this._fireHat("whenTexture", id + ":loaded");
        } catch (e) {
          entry.error = true;
          this._fireHat("whenTexture", id + ":error");
          this._err("loadTexture:" + id, e);
        }
      };
      img.onerror = () => {
        entry.error = true;
        this._fireHat("whenTexture", id + ":error");
        this._err("loadTexture:" + id, "не удалось загрузить " + url);
      };
      img.src = url;
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
      slot = Math.min(Math.max(0, slot), 31);
      const unit = gl.TEXTURE0 + slot;
      gl.activeTexture(unit);
      gl.bindTexture(gl.TEXTURE_2D, tex.texture);
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
      const linear = Cast.toString(args.FILTER) === "linear";
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, linear ? gl.LINEAR : gl.NEAREST);
      const pot = tex.width && (tex.width & (tex.width - 1)) === 0 && (tex.height & (tex.height - 1)) === 0;
      if (linear && pot) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, linear ? gl.LINEAR : gl.NEAREST);
      }
      const repeat = Cast.toString(args.WRAP) === "repeat";
      const wrap = repeat && pot ? gl.REPEAT : gl.CLAMP_TO_EDGE;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
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

          // --- Снимок ---
          { blockType: Scratch.BlockType.LABEL, text: "Снимок кадра" },
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
        },
      };
    }
  }

  Scratch.extensions.register(new WebGLRU());
})(Scratch);
