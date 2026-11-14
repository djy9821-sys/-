/*!
 * 封面的水墨：流体模拟。改写自 WebGL-Fluid-Simulation
 * (https://github.com/PavelDoGreat/WebGL-Fluid-Simulation)。
 *
 * @license MIT
 * Copyright (c) 2017 Pavel Dobryakov
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
 * to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions
 * of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
 * THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 * CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 * 改动：去掉泛光、光束与调参面板；显示改成墨绿底上的淡墨；加了自动落墨、按帧率降档、
 * 显卡不支持或太慢时由调用方退回静态底色。许可全文另见 public/licenses/WebGL-Fluid-Simulation-MIT.txt。
 */

/**
 * 在一块 canvas 上起一池水墨。
 * @param {HTMLCanvasElement} canvas
 * @param {{ onStill?: () => void, onLost?: () => void }} [options] onStill：设备太慢，已停在当前画面；onLost：显卡上下文丢了
 * @returns {null | { start: () => void, stop: () => void, splash: Function, drag: Function, destroy: () => void }} 不支持时返回 null
 */
export const createInkFluid = (canvas, options = {}) => {
  const cfg = { SIM: 128, DYE: 512, DENSITY_DISSIPATION: 0.38, VELOCITY_DISSIPATION: 0.2, PRESSURE: 0.8, ITER: 14, CURL: 20, RADIUS: 0.34, FORCE: 5200, DPR: 1.5 };
  const PALETTE = [[0.26, 0.58, 0.5], [0.66, 0.54, 0.3], [0.62, 0.6, 0.54], [0.2, 0.44, 0.46]];
  let gl = null; let ext = null; let P = null; let blit = null;
  let dye = null; let velocity = null; let divergence = null; let curl = null; let pressure = null;
  let alive = false; let running = false; let raf = 0; let last = 0; let nextAmbient = 0; let level = 0;
  let samples = 0; let sum = 0; let windowStart = 0; let colorIndex = 0;
  const queue = [];

  const supports = (internalFormat, format, type) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  };
  const formatOf = (internalFormat, format, type) => {
    if (supports(internalFormat, format, type)) return { internalFormat, format };
    if (internalFormat === gl.R16F) return formatOf(gl.RG16F, gl.RG, type);
    if (internalFormat === gl.RG16F) return formatOf(gl.RGBA16F, gl.RGBA, type);
    return null;
  };
  const compile = (type, source, keywords) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, (keywords || []).map((word) => `#define ${word}\n`).join('') + source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'shader');
    return shader;
  };
  const program = (vertex, fragment) => {
    const prog = gl.createProgram();
    gl.attachShader(prog, vertex); gl.attachShader(prog, fragment);
    gl.bindAttribLocation(prog, 0, 'aPosition');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
    const uniforms = {};
    const count = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) { const name = gl.getActiveUniform(prog, i).name; uniforms[name] = gl.getUniformLocation(prog, name); }
    return { uniforms, bind: () => gl.useProgram(prog) };
  };

  const VERT = `
    precision highp float;
    attribute vec2 aPosition;
    varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
    uniform vec2 texelSize;
    void main () {
      vUv = aPosition * 0.5 + 0.5;
      vL = vUv - vec2(texelSize.x, 0.0); vR = vUv + vec2(texelSize.x, 0.0);
      vT = vUv + vec2(0.0, texelSize.y); vB = vUv - vec2(0.0, texelSize.y);
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }`;
  const HEAD = 'precision mediump float; precision mediump sampler2D; varying highp vec2 vUv; varying highp vec2 vL; varying highp vec2 vR; varying highp vec2 vT; varying highp vec2 vB;';
  const FRAG = {
    copy: `${HEAD} uniform sampler2D uTexture; void main () { gl_FragColor = texture2D(uTexture, vUv); }`,
    clear: `${HEAD} uniform sampler2D uTexture; uniform float value; void main () { gl_FragColor = value * texture2D(uTexture, vUv); }`,
    splat: `precision highp float; precision highp sampler2D; varying vec2 vUv;
      uniform sampler2D uTarget; uniform float aspectRatio; uniform vec3 color; uniform vec2 point; uniform float radius;
      void main () { vec2 p = vUv - point.xy; p.x *= aspectRatio; vec3 splat = exp(-dot(p, p) / radius) * color; vec3 base = texture2D(uTarget, vUv).xyz; gl_FragColor = vec4(base + splat, 1.0); }`,
    advection: `precision highp float; precision highp sampler2D; varying vec2 vUv;
      uniform sampler2D uVelocity; uniform sampler2D uSource; uniform vec2 texelSize; uniform vec2 dyeTexelSize; uniform float dt; uniform float dissipation;
      vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
        vec2 st = uv / tsize - 0.5; vec2 iuv = floor(st); vec2 fuv = fract(st);
        vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize); vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
        vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize); vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
        return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
      }
      void main () {
      #ifdef MANUAL_FILTERING
        vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
        vec4 result = bilerp(uSource, coord, dyeTexelSize);
      #else
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        vec4 result = texture2D(uSource, coord);
      #endif
        float decay = 1.0 + dissipation * dt;
        gl_FragColor = result / decay;
      }`,
    divergence: `${HEAD} uniform sampler2D uVelocity;
      void main () {
        float L = texture2D(uVelocity, vL).x; float R = texture2D(uVelocity, vR).x; float T = texture2D(uVelocity, vT).y; float B = texture2D(uVelocity, vB).y;
        vec2 C = texture2D(uVelocity, vUv).xy;
        if (vL.x < 0.0) { L = -C.x; } if (vR.x > 1.0) { R = -C.x; } if (vT.y > 1.0) { T = -C.y; } if (vB.y < 0.0) { B = -C.y; }
        gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
      }`,
    curl: `${HEAD} uniform sampler2D uVelocity;
      void main () {
        float L = texture2D(uVelocity, vL).y; float R = texture2D(uVelocity, vR).y; float T = texture2D(uVelocity, vT).x; float B = texture2D(uVelocity, vB).x;
        gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
      }`,
    vorticity: `precision highp float; precision highp sampler2D; varying vec2 vUv; varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
      uniform sampler2D uVelocity; uniform sampler2D uCurl; uniform float curl; uniform float dt;
      void main () {
        float L = texture2D(uCurl, vL).x; float R = texture2D(uCurl, vR).x; float T = texture2D(uCurl, vT).x; float B = texture2D(uCurl, vB).x; float C = texture2D(uCurl, vUv).x;
        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        force /= length(force) + 0.0001; force *= curl * C; force.y *= -1.0;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity += force * dt; velocity = min(max(velocity, -1000.0), 1000.0);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
      }`,
    pressure: `${HEAD} uniform sampler2D uPressure; uniform sampler2D uDivergence;
      void main () {
        float L = texture2D(uPressure, vL).x; float R = texture2D(uPressure, vR).x; float T = texture2D(uPressure, vT).x; float B = texture2D(uPressure, vB).x;
        float divergence = texture2D(uDivergence, vUv).x;
        gl_FragColor = vec4((L + R + B + T - divergence) * 0.25, 0.0, 0.0, 1.0);
      }`,
    gradient: `${HEAD} uniform sampler2D uPressure; uniform sampler2D uVelocity;
      void main () {
        float L = texture2D(uPressure, vL).x; float R = texture2D(uPressure, vR).x; float T = texture2D(uPressure, vT).x; float B = texture2D(uPressure, vB).x;
        vec2 velocity = texture2D(uVelocity, vUv).xy; velocity.xy -= vec2(R - L, T - B);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
      }`,
    // 显示：墨绿底，中间略亮、四周压暗；墨色叠在上面，过亮处压一压，免得发白
    display: `precision highp float; precision highp sampler2D; varying vec2 vUv;
      uniform sampler2D uTexture; uniform float uAspect;
      void main () {
        vec3 c = texture2D(uTexture, vUv).rgb;
        vec2 p = vUv - vec2(0.5, 0.56); p.x *= uAspect;
        float glow = smoothstep(0.92, 0.05, length(p));
        vec3 base = mix(vec3(0.018, 0.036, 0.032), vec3(0.05, 0.105, 0.088), glow);
        c = 0.9 * c / (1.0 + 1.3 * max(c.r, max(c.g, c.b)));
        gl_FragColor = vec4(base + c, 1.0);
      }`,
  };

  const createFBO = (w, h, internalFormat, format, type, filter) => {
    gl.activeTexture(gl.TEXTURE0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { texture, fbo, width: w, height: h, texelSizeX: 1 / w, texelSizeY: 1 / h, attach (id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, texture); return id; } };
  };
  const createDouble = (w, h, internalFormat, format, type, filter) => {
    let a = createFBO(w, h, internalFormat, format, type, filter); let b = createFBO(w, h, internalFormat, format, type, filter);
    return { width: w, height: h, texelSizeX: a.texelSizeX, texelSizeY: a.texelSizeY, get read () { return a; }, set read (value) { a = value; }, get write () { return b; }, set write (value) { b = value; }, swap () { const t = a; a = b; b = t; } };
  };
  const resizeDouble = (target, w, h, internalFormat, format, type, filter) => {
    if (target.width === w && target.height === h) return target;
    const fresh = createFBO(w, h, internalFormat, format, type, filter);
    P.copy.bind(); gl.uniform1i(P.copy.uniforms.uTexture, target.read.attach(0)); blit(fresh);
    target.read = fresh; target.write = createFBO(w, h, internalFormat, format, type, filter);
    target.width = w; target.height = h; target.texelSizeX = 1 / w; target.texelSizeY = 1 / h;
    return target;
  };
  const resolutionOf = (resolution) => {
    let aspect = gl.drawingBufferWidth / gl.drawingBufferHeight; if (aspect < 1) aspect = 1 / aspect;
    const min = Math.round(resolution); const max = Math.round(resolution * aspect);
    return gl.drawingBufferWidth > gl.drawingBufferHeight ? { width: max, height: min } : { width: min, height: max };
  };
  const initFramebuffers = () => {
    const sim = resolutionOf(cfg.SIM); const dyeRes = resolutionOf(cfg.DYE);
    const filter = ext.linear ? gl.LINEAR : gl.NEAREST;
    gl.disable(gl.BLEND);
    dye = dye ? resizeDouble(dye, dyeRes.width, dyeRes.height, ext.rgba.internalFormat, ext.rgba.format, ext.type, filter) : createDouble(dyeRes.width, dyeRes.height, ext.rgba.internalFormat, ext.rgba.format, ext.type, filter);
    velocity = velocity ? resizeDouble(velocity, sim.width, sim.height, ext.rg.internalFormat, ext.rg.format, ext.type, filter) : createDouble(sim.width, sim.height, ext.rg.internalFormat, ext.rg.format, ext.type, filter);
    divergence = createFBO(sim.width, sim.height, ext.r.internalFormat, ext.r.format, ext.type, gl.NEAREST);
    curl = createFBO(sim.width, sim.height, ext.r.internalFormat, ext.r.format, ext.type, gl.NEAREST);
    pressure = createDouble(sim.width, sim.height, ext.r.internalFormat, ext.r.format, ext.type, gl.NEAREST);
  };
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, cfg.DPR);
    const w = Math.max(2, Math.floor(canvas.clientWidth * dpr)); const h = Math.max(2, Math.floor(canvas.clientHeight * dpr));
    if (canvas.width === w && canvas.height === h) return false;
    canvas.width = w; canvas.height = h; return true;
  };

  const splat = (x, y, dx, dy, color) => {
    const aspect = canvas.width / canvas.height;
    let radius = cfg.RADIUS / 100; if (aspect > 1) radius *= aspect;
    P.splat.bind();
    gl.uniform1i(P.splat.uniforms.uTarget, velocity.read.attach(0));
    gl.uniform1f(P.splat.uniforms.aspectRatio, aspect);
    gl.uniform2f(P.splat.uniforms.point, x, y);
    gl.uniform3f(P.splat.uniforms.color, dx, dy, 0);
    gl.uniform1f(P.splat.uniforms.radius, radius);
    blit(velocity.write); velocity.swap();
    gl.uniform1i(P.splat.uniforms.uTarget, dye.read.attach(0));
    gl.uniform3f(P.splat.uniforms.color, color[0], color[1], color[2]);
    blit(dye.write); dye.swap();
  };
  const step = (dt) => {
    gl.disable(gl.BLEND);
    const tx = velocity.texelSizeX; const ty = velocity.texelSizeY;
    P.curl.bind(); gl.uniform2f(P.curl.uniforms.texelSize, tx, ty); gl.uniform1i(P.curl.uniforms.uVelocity, velocity.read.attach(0)); blit(curl);
    P.vorticity.bind(); gl.uniform2f(P.vorticity.uniforms.texelSize, tx, ty); gl.uniform1i(P.vorticity.uniforms.uVelocity, velocity.read.attach(0)); gl.uniform1i(P.vorticity.uniforms.uCurl, curl.attach(1)); gl.uniform1f(P.vorticity.uniforms.curl, cfg.CURL); gl.uniform1f(P.vorticity.uniforms.dt, dt); blit(velocity.write); velocity.swap();
    P.divergence.bind(); gl.uniform2f(P.divergence.uniforms.texelSize, tx, ty); gl.uniform1i(P.divergence.uniforms.uVelocity, velocity.read.attach(0)); blit(divergence);
    P.clear.bind(); gl.uniform1i(P.clear.uniforms.uTexture, pressure.read.attach(0)); gl.uniform1f(P.clear.uniforms.value, cfg.PRESSURE); blit(pressure.write); pressure.swap();
    P.pressure.bind(); gl.uniform2f(P.pressure.uniforms.texelSize, tx, ty); gl.uniform1i(P.pressure.uniforms.uDivergence, divergence.attach(0));
    for (let i = 0; i < cfg.ITER; i++) { gl.uniform1i(P.pressure.uniforms.uPressure, pressure.read.attach(1)); blit(pressure.write); pressure.swap(); }
    P.gradient.bind(); gl.uniform2f(P.gradient.uniforms.texelSize, tx, ty); gl.uniform1i(P.gradient.uniforms.uPressure, pressure.read.attach(0)); gl.uniform1i(P.gradient.uniforms.uVelocity, velocity.read.attach(1)); blit(velocity.write); velocity.swap();
    P.advection.bind(); gl.uniform2f(P.advection.uniforms.texelSize, tx, ty);
    if (!ext.linear) gl.uniform2f(P.advection.uniforms.dyeTexelSize, tx, ty);
    const id = velocity.read.attach(0);
    gl.uniform1i(P.advection.uniforms.uVelocity, id); gl.uniform1i(P.advection.uniforms.uSource, id); gl.uniform1f(P.advection.uniforms.dt, dt); gl.uniform1f(P.advection.uniforms.dissipation, cfg.VELOCITY_DISSIPATION); blit(velocity.write); velocity.swap();
    if (!ext.linear) gl.uniform2f(P.advection.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
    gl.uniform1i(P.advection.uniforms.uVelocity, velocity.read.attach(0)); gl.uniform1i(P.advection.uniforms.uSource, dye.read.attach(1)); gl.uniform1f(P.advection.uniforms.dissipation, cfg.DENSITY_DISSIPATION); blit(dye.write); dye.swap();
  };
  const render = () => {
    P.display.bind();
    gl.uniform1i(P.display.uniforms.uTexture, dye.read.attach(0));
    gl.uniform1f(P.display.uniforms.uAspect, canvas.width / canvas.height);
    blit(null);
  };
  const tint = (index, strength) => PALETTE[index % PALETTE.length].map((value) => value * strength);
  const ambient = (now) => {
    if (now < nextAmbient) return;
    nextAmbient = now + 2400 + Math.random() * 2600;
    const angle = Math.random() * Math.PI * 2; const speed = 150 + Math.random() * 190;
    queue.push([0.14 + Math.random() * 0.72, 0.2 + Math.random() * 0.62, Math.cos(angle) * speed, Math.sin(angle) * speed, tint(colorIndex++, 0.3)]);
  };
  // 开头量一量帧率：慢就降一档，再慢就停在当前这一帧。
  // 一轮最多量 24 帧或 0.8 秒，谁先到算谁——跑不动的设备一秒多就停下来，不让它卡上十来秒。
  const monitor = (now, delta) => {
    if (level >= 2) return;                       // 2：已停在当前画面；3：量过了，够流畅
    samples++; if (samples <= 6) return;          // 开头几帧在编译着色器，不算
    if (samples === 7) { sum = 0; windowStart = now - delta; }
    sum += delta;
    const counted = samples - 6;
    if (counted < 24 && now - windowStart < 800) return;
    const average = sum / counted; samples = 0; sum = 0;
    if (average > 60 || (level === 1 && average > 40)) { level = 2; stop(); if (options.onStill) options.onStill(); return; }
    if (level === 0 && average > 34) { level = 1; cfg.DYE = 256; cfg.ITER = 8; cfg.DPR = 1; resize(); initFramebuffers(); return; }
    level = 3;
  };
  const frame = (now) => {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const delta = last ? now - last : 16.6; last = now;
    const dt = Math.min(delta / 1000, 0.016666);
    if (resize()) initFramebuffers();
    while (queue.length) { const s = queue.shift(); splat(s[0], s[1], s[2], s[3], s[4]); }
    ambient(now);
    step(dt);
    render();
    monitor(now, delta);
  };
  const start = () => { if (!alive || running || level === 2 || document.hidden) return; running = true; last = 0; raf = requestAnimationFrame(frame); };
  function stop () { running = false; cancelAnimationFrame(raf); }

  const init = () => {
    try {
      const params = { alpha: false, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false, powerPreference: 'low-power' };
      gl = canvas.getContext('webgl2', params); const gl2 = Boolean(gl);
      if (!gl) gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
      if (!gl) return false;
      // 没有显卡加速、靠处理器硬算的（SwiftShader、llvmpipe 之类）跑不动这池墨：不试了，封面用静态底色。
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = `${gl.getParameter(gl.RENDERER)} ${debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : ''}`;
      if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer)) return false;
      let half = null; let linear = null;
      if (gl2) { gl.getExtension('EXT_color_buffer_float'); linear = gl.getExtension('OES_texture_float_linear'); } else { half = gl.getExtension('OES_texture_half_float'); linear = gl.getExtension('OES_texture_half_float_linear'); if (!half) return false; }
      const type = gl2 ? gl.HALF_FLOAT : half.HALF_FLOAT_OES;
      const rgba = gl2 ? formatOf(gl.RGBA16F, gl.RGBA, type) : formatOf(gl.RGBA, gl.RGBA, type);
      const rg = gl2 ? formatOf(gl.RG16F, gl.RG, type) : rgba;
      const r = gl2 ? formatOf(gl.R16F, gl.RED, type) : rgba;
      if (!rgba || !rg || !r) return false;
      ext = { rgba, rg, r, type, linear: Boolean(linear) };
      const vertex = compile(gl.VERTEX_SHADER, VERT);
      P = {};
      for (const name of Object.keys(FRAG)) P[name] = program(vertex, compile(gl.FRAGMENT_SHADER, FRAG[name], name === 'advection' && !ext.linear ? ['MANUAL_FILTERING'] : null));
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(0);
      blit = (target) => {
        if (target == null) { gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); gl.bindFramebuffer(gl.FRAMEBUFFER, null); } else { gl.viewport(0, 0, target.width, target.height); gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo); }
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
      };
      gl.clearColor(0, 0, 0, 1);
      if ((navigator.maxTouchPoints || 0) > 0 && Math.min(window.screen.width, window.screen.height) < 600) { cfg.DYE = 384; cfg.ITER = 12; }
      resize(); initFramebuffers();
      canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); alive = false; stop(); if (options.onLost) options.onLost(); });
      alive = true;
      render();
      return true;
    } catch { alive = false; return false; }
  };
  if (!init()) return null;
  return {
    start, stop,
    /** 在归一化坐标 (x, y)（y 向上）落一团墨，带初速。color 是三个 0–1 的数。 */
    splash (x, y, dx, dy, color) { if (alive) queue.push([x, y, dx, dy, color || tint(colorIndex++, 0.3)]); },
    /** 手指或鼠标划过：按位移推一下水，带一点墨。 */
    drag (x, y, ndx, ndy) {
      if (!alive || !running) return;
      const aspect = canvas.width / canvas.height;
      const dx = (aspect < 1 ? ndx * aspect : ndx) * cfg.FORCE; const dy = (aspect > 1 ? ndy / aspect : ndy) * cfg.FORCE;
      queue.push([x, y, dx, dy, tint(Math.floor(performance.now() / 2600), 0.16)]);
      if (queue.length > 24) queue.splice(0, queue.length - 24);
    },
    /** 离开封面时调用：停下并交还显卡资源。 */
    destroy () {
      stop(); alive = false;
      const lose = gl && gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    },
  };
};
