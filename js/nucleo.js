/* ===== Núcleo: utilidades, canvas, pestañas, controles ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const G0 = 9.80665;
const MONO = '"JetBrains Mono", ui-monospace, monospace';
const BODY = '"Archivo", system-ui, sans-serif';
const PAL = {};
function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  ['bg','surface','surface2','ink','muted','line','accent','warm','good','bad','sky','metal','hot'].forEach(k => PAL[k] = cs.getPropertyValue('--' + k).trim() || '#888');
}
function alpha(hex, a) {
  if (!hex || hex[0] !== '#') return hex;
  let h = hex.slice(1); if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function mix(h1, h2, t) {
  const p = h => { let s = h.slice(1); if (s.length === 3) s = s.split('').map(c => c + c).join(''); const n = parseInt(s, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const a = p(h1), b = p(h2);
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
}
/* rampa térmica: frío → caliente */
function heatColor(t) {
  t = clamp(t, 0, 1);
  const stops = [[0, [60, 90, 160]], [0.35, [70, 160, 140]], [0.55, [235, 200, 60]], [0.75, [240, 120, 30]], [0.9, [220, 40, 20]], [1, [255, 240, 220]]];
  for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) {
    const [t0, c0] = stops[i - 1], [t1, c1] = stops[i]; const u = (t - t0) / (t1 - t0);
    return `rgb(${c0.map((v, k) => Math.round(v + (c1[k] - v) * u)).join(',')})`;
  }
  return 'rgb(255,240,220)';
}
const fmt = (v, d = 0) => (Number.isFinite(v) ? v.toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—');

/* ---- canvas con DPR y redimensionado ---- */
const canvases = [];
function makeCanvas(id, ratio) {
  const el = typeof id === 'string' ? document.getElementById(id) : id;
  el.style.aspectRatio = String(1 / ratio);
  const ctx = el.getContext('2d');
  const st = { el, ctx, w: 0, h: 0, dirty: true };
  const fit = () => {
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    const d = Math.min(window.devicePixelRatio || 1, 2);
    if (el.width !== Math.round(w * d) || el.height !== Math.round(h * d)) {
      el.width = Math.round(w * d); el.height = Math.round(h * d);
    }
    ctx.setTransform(d, 0, 0, d, 0, 0);
    st.w = w; st.h = h; st.dirty = true;
  };
  st.fit = fit;
  try { new ResizeObserver(fit).observe(el); } catch (e) { window.addEventListener('resize', fit); }
  canvases.push(st);
  return st;
}
function clear(st, bg) { const c = st.ctx; c.save(); c.setTransform(1,0,0,1,0,0); c.clearRect(0, 0, st.el.width, st.el.height); c.restore(); if (bg) { c.fillStyle = bg; c.fillRect(0, 0, st.w, st.h); } }

/* ---- primitivas de dibujo ---- */
function line(c, x1, y1, x2, y2) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
function poly(c, pts, close = false) { if (!pts.length) return; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); if (close) c.closePath(); }
function arrow(c, x1, y1, x2, y2, color, w = 2, head = 8) {
  const L = Math.hypot(x2 - x1, y2 - y1); if (L < 1) return;
  const a = Math.atan2(y2 - y1, x2 - x1); head = Math.min(head, L * 0.6);
  c.save(); c.strokeStyle = color; c.fillStyle = color; c.lineWidth = w; c.lineCap = 'round';
  line(c, x1, y1, x2 - Math.cos(a) * head * 0.6, y2 - Math.sin(a) * head * 0.6);
  c.beginPath(); c.moveTo(x2, y2);
  c.lineTo(x2 - head * Math.cos(a - 0.42), y2 - head * Math.sin(a - 0.42));
  c.lineTo(x2 - head * Math.cos(a + 0.42), y2 - head * Math.sin(a + 0.42)); c.closePath(); c.fill();
  c.restore();
}
function txt(c, s, x, y, o = {}) {
  c.save(); c.font = `${o.weight || 500} ${o.size || 11}px ${o.font || MONO}`; c.fillStyle = o.color || PAL.ink;
  c.textAlign = o.align || 'left'; c.textBaseline = o.base || 'alphabetic';
  if (o.bg) { const m = c.measureText(s); const pw = m.width + 8, ph = (o.size || 11) + 6; let bx = x - 4; if (c.textAlign === 'center') bx = x - pw / 2; if (c.textAlign === 'right') bx = x - pw + 4; c.fillStyle = o.bg; c.fillRect(bx, y - (o.size || 11) - 1, pw, ph); c.fillStyle = o.color || PAL.ink; }
  c.fillText(s, x, y); c.restore();
}
function niceTicks(a, b, n = 5) {
  const span = b - a, step0 = span / n, mag = 10 ** Math.floor(Math.log10(step0));
  const s = [1, 2, 2.5, 5, 10].map(k => k * mag).find(k => k >= step0 - 1e-12);
  const out = []; for (let v = Math.ceil(a / s - 1e-9) * s; v <= b + 1e-9; v += s) out.push(+v.toFixed(10));
  return out;
}
/* marco de gráfico: devuelve funciones de escala */
function plotFrame(c, b, xr, yr, o = {}) {
  const sx = x => b.x + (x - xr[0]) / (xr[1] - xr[0]) * b.w;
  const sy = y => b.y + b.h - (y - yr[0]) / (yr[1] - yr[0]) * b.h;
  c.save(); c.lineWidth = 1; c.font = `10px ${MONO}`;
  const xt = o.xt || niceTicks(xr[0], xr[1], o.nx || 5), yt = o.yt || niceTicks(yr[0], yr[1], o.ny || 4);
  c.strokeStyle = alpha(PAL.line, 0.9) || PAL.line;
  xt.forEach(v => { const X = sx(v); c.globalAlpha = 0.55; line(c, X, b.y, X, b.y + b.h); c.globalAlpha = 1; c.fillStyle = PAL.muted; c.textAlign = 'center'; c.fillText(o.xf ? o.xf(v) : fmt(v, o.xd || 0), X, b.y + b.h + 13); });
  yt.forEach(v => { const Y = sy(v); c.globalAlpha = 0.55; line(c, b.x, Y, b.x + b.w, Y); c.globalAlpha = 1; c.fillStyle = PAL.muted; c.textAlign = 'right'; c.fillText(o.yf ? o.yf(v) : fmt(v, o.yd || 0), b.x - 5, Y + 3); });
  c.strokeStyle = PAL.muted; c.globalAlpha = 0.8;
  if (xr[0] < 0 && xr[1] > 0) line(c, sx(0), b.y, sx(0), b.y + b.h);
  if (yr[0] < 0 && yr[1] > 0) line(c, b.x, sy(0), b.x + b.w, sy(0));
  c.globalAlpha = 1; line(c, b.x, b.y + b.h, b.x + b.w, b.y + b.h); line(c, b.x, b.y, b.x, b.y + b.h);
  c.fillStyle = PAL.muted; c.font = `600 10.5px ${MONO}`;
  if (o.xl) { c.textAlign = 'right'; c.fillText(o.xl, b.x + b.w, b.y + b.h + 26); }
  if (o.yl) { c.textAlign = 'left'; c.fillText(o.yl, b.x + 2, b.y - 6); }
  c.restore();
  return { sx, sy };
}
function curve(c, pts, sx, sy, color, w = 2, dash) {
  c.save(); c.strokeStyle = color; c.lineWidth = w; c.lineJoin = 'round'; if (dash) c.setLineDash(dash);
  c.beginPath(); let started = false;
  for (const [x, y] of pts) { if (!Number.isFinite(y)) { started = false; continue; } const X = sx(x), Y = sy(y); if (!started) { c.moveTo(X, Y); started = true; } else c.lineTo(X, Y); }
  c.stroke(); c.restore();
}
function dot(c, x, y, r, fill, stroke) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2; c.stroke(); } }

/* ---- perfil NACA de 4 dígitos ---- */
function naca(m, p, t, x) {
  const yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
  let yc, dyc;
  if (x < p) { yc = m / (p * p) * (2 * p * x - x * x); dyc = 2 * m / (p * p) * (p - x); }
  else { yc = m / ((1 - p) ** 2) * ((1 - 2 * p) + 2 * p * x - x * x); dyc = 2 * m / ((1 - p) ** 2) * (p - x); }
  const th = Math.atan(dyc);
  return { yt, yc, xu: x - yt * Math.sin(th), yu: yc + yt * Math.cos(th), xl: x + yt * Math.sin(th), yl: yc - yt * Math.cos(th) };
}
/* contorno cerrado de un tramo del perfil [x0,x1] (coordenadas de cuerda, y hacia arriba) */
function airfoilPart(x0, x1, n = 40, m = 0.02, p = 0.4, t = 0.12) {
  const up = [], lo = [];
  for (let i = 0; i <= n; i++) {
    const b = i / n, x = x0 + (x1 - x0) * (0.5 - 0.5 * Math.cos(Math.PI * b));
    const s = naca(m, p, t, x); up.push([s.xu, s.yu]); lo.push([s.xl, s.yl]);
  }
  return up.reverse().concat(lo);
}
const rot = (pt, cx, cy, a) => { const c = Math.cos(a), s = Math.sin(a), dx = pt[0] - cx, dy = pt[1] - cy; return [cx + dx * c - dy * s, cy + dx * s + dy * c]; };

/* ---- sistema lineal (Gauss con pivoteo) ---- */
function solve(A, b) {
  const n = b.length; const M = A.map((r, i) => [...r, b[i]]);
  for (let k = 0; k < n; k++) {
    let p = k; for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i;
    [M[k], M[p]] = [M[p], M[k]];
    const d = M[k][k]; if (Math.abs(d) < 1e-14) continue;
    for (let i = k + 1; i < n; i++) { const f = M[i][k] / d; if (!f) continue; for (let j = k; j <= n; j++) M[i][j] -= f * M[k][j]; }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { let s = M[i][n]; for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j]; x[i] = Math.abs(M[i][i]) < 1e-14 ? 0 : s / M[i][i]; }
  return x;
}

/* ---- controles genéricos ---- */
const val = id => +document.getElementById(id).value;
function initRanges() {
  $$('input[type=range]').forEach(el => {
    const out = $(`output[for="${el.id}"]`);
    const upd = () => { if (out) { const d = +(el.dataset.dec || 0); out.textContent = fmt(+el.value, d) + (el.dataset.unit || ''); } };
    el.addEventListener('input', upd); upd();
  });
}
function seg(name) { const g = $(`.seg[data-name="${name}"]`); return g ? g.dataset.value : null; }
function initSegs() {
  $$('.seg').forEach(g => {
    const btns = $$('button', g);
    const cur = btns.find(b => b.getAttribute('aria-pressed') === 'true') || btns[0];
    btns.forEach(b => b.setAttribute('aria-pressed', b === cur ? 'true' : 'false'));
    g.dataset.value = cur.dataset.v;
    btns.forEach(b => b.addEventListener('click', () => {
      btns.forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      g.dataset.value = b.dataset.v; g.dispatchEvent(new CustomEvent('change', { detail: b.dataset.v }));
    }));
  });
}
function initSubnavs() {
  $$('.subnav').forEach(nav => {
    const panel = nav.closest('.panel');
    const btns = $$('button', nav);
    const show = v => {
      btns.forEach(b => b.setAttribute('aria-pressed', b.dataset.sub === v ? 'true' : 'false'));
      $$('.sub', panel).forEach(s => s.hidden = s.dataset.sub !== v);
      panel.dataset.sub = v;
      canvases.forEach(c => { c.fit(); });
    };
    btns.forEach(b => b.addEventListener('click', () => show(b.dataset.sub)));
    show(btns[0].dataset.sub);
  });
}
/* palanca de mando 2D: x = rolido (+ derecha), y = cabeceo (+ adelante / empujar) */
function makePad(el) {
  const knob = $('.knob', el); const st = { x: 0, y: 0, held: false };
  const place = () => { knob.style.left = `${50 + st.x * 40}%`; knob.style.top = `${50 - st.y * 40}%`; };
  const set = e => { const r = el.getBoundingClientRect(); st.x = clamp(((e.clientX - r.left) / r.width - 0.5) / 0.4, -1, 1); st.y = clamp(-((e.clientY - r.top) / r.height - 0.5) / 0.4, -1, 1); place(); };
  el.addEventListener('pointerdown', e => { st.held = true; el.setPointerCapture(e.pointerId); set(e); });
  el.addEventListener('pointermove', e => { if (st.held) set(e); });
  const up = () => { st.held = false; };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.tabIndex = 0;
  el.addEventListener('keydown', e => {
    const k = { ArrowLeft: [-0.25, 0], ArrowRight: [0.25, 0], ArrowUp: [0, 0.25], ArrowDown: [0, -0.25] }[e.key];
    if (k) { e.preventDefault(); st.x = clamp(st.x + k[0], -1, 1); st.y = clamp(st.y + k[1], -1, 1); place(); st.kb = 1.2; }
  });
  st.tick = dt => {
    if (st.held) return;
    if (st.kb > 0) { st.kb -= dt; return; }
    const k = Math.exp(-dt * 6); st.x *= k; st.y *= k; if (Math.abs(st.x) < 0.002) st.x = 0; if (Math.abs(st.y) < 0.002) st.y = 0; place();
  };
  return st;
}

/* ---- registro de módulos y bucle ---- */
const MODS = {}; let ACTIVE = null;
function register(id, m) { MODS[id] = m; }
let lastT = performance.now();
function loop(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;
  const m = MODS[ACTIVE];
  if (m && m.frame) { try { m.frame(dt); } catch (e) { console.error(e); } }
  requestAnimationFrame(loop);
}
function showTab(id) {
  if (!MODS[id] && !document.getElementById('p-' + id)) id = 'hiper';
  $$('nav.units button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === id ? 'true' : 'false'));
  $$('.panel').forEach(p => p.hidden = p.id !== 'p-' + id);
  ACTIVE = id;
  canvases.forEach(c => c.fit());
  const btn = $(`nav.units button[data-tab="${id}"]`); if (btn) btn.scrollIntoView({ block: 'nearest', inline: 'center' });
  try { localStorage.setItem('cae-tab', id); } catch (e) {}
}
function boot() {
  readPalette();
  initRanges(); initSegs(); initSubnavs();
  Object.values(MODS).forEach(m => { try { m.init && m.init(); } catch (e) { console.error(e); } });
  $$('nav.units button').forEach(b => b.addEventListener('click', () => { showTab(b.dataset.tab); if (history.replaceState) history.replaceState(null, '', '#' + b.dataset.tab); window.scrollTo({ top: 0 }); }));
  let start = (location.hash || '').slice(1);
  if (!start) { try { start = localStorage.getItem('cae-tab') || ''; } catch (e) {} }
  showTab(start || 'hiper');
  const repaint = () => { readPalette(); canvases.forEach(c => c.dirty = true); Object.values(MODS).forEach(m => m.dirty = true); };
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', repaint); } catch (e) {}
  new MutationObserver(repaint).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  requestAnimationFrame(loop);
}
