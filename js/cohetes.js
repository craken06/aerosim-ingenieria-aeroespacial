/* ===== Tsiolkovsky ===== */
function drawRocket(c, x, y, w, h, o = {}) {
  c.save(); c.translate(x, y);
  if (o.flame) { const fl = h * (0.25 + 0.08 * Math.sin(performance.now() / 40)); const g = c.createLinearGradient(0, 0, 0, fl); g.addColorStop(0, 'rgba(255,230,140,0.95)'); g.addColorStop(1, 'rgba(255,90,20,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(-w * 0.35, 0); c.lineTo(w * 0.35, 0); c.lineTo(0, fl); c.closePath(); c.fill(); }
  const segs = o.segs || [[h, PAL.surface]];
  let yy = 0;
  segs.forEach(([sh, col, lbl]) => { c.fillStyle = col; c.fillRect(-w / 2, yy - sh, w, sh); c.strokeStyle = alpha(PAL.ink, 0.5); c.lineWidth = 1; c.strokeRect(-w / 2, yy - sh, w, sh); if (lbl && sh > 12) txt(c, lbl, w / 2 + 6, yy - sh / 2 + 4, { size: 9.5, color: o.lblColor || PAL.muted }); yy -= sh; });
  c.fillStyle = o.nose || PAL.ink; c.beginPath(); c.moveTo(-w / 2, yy); c.lineTo(w / 2, yy); c.lineTo(0, yy - w * 1.1); c.closePath(); c.fill();
  c.fillStyle = PAL.ink; c.beginPath(); c.moveTo(-w / 2, 0); c.lineTo(-w * 0.9, 6); c.lineTo(-w / 2, -h * 0.15); c.fill(); c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w * 0.9, 6); c.lineTo(w / 2, -h * 0.15); c.fill();
  c.restore();
}
register('tsio', (() => {
  let rk, pl, sim = null, stars = [];
  function params() { const isp = +seg('ts-prop'), c = isp * G0, M0 = val('ts-m0') * 1000, fp = val('ts-mp') / 100, Mf = M0 * (1 - fp), tb = val('ts-tb'); return { isp, c, M0, Mf, tb, mdot: (M0 - Mf) / tb, R: M0 / Mf, dv: c * Math.log(M0 / Mf), grav: seg('ts-grav') === 'si' }; }
  function draw(dt) {
    const p = params();
    if (sim && !sim.done) { sim.t = Math.min(p.tb, sim.t + dt * p.tb / 6); const M = p.M0 - p.mdot * sim.t; sim.v = p.c * Math.log(p.M0 / M) - (p.grav ? G0 * sim.t : 0); sim.y += sim.v * dt * p.tb / 6; sim.hist.push([sim.t, sim.v]); if (sim.t >= p.tb) sim.done = true; }
    let st = rk, c = st.ctx;
    if (st.w) {
      clear(st, mix(PAL.sky, '#070b16', 0.85));
      if (!stars.length) for (let i = 0; i < 70; i++) stars.push([Math.random(), Math.random(), Math.random()]);
      const off = sim ? sim.y / 2000 : 0;
      stars.forEach(([x, y, s]) => dot(c, x * st.w, ((y * st.h + off * (0.5 + s)) % st.h), 0.6 + s, 'rgba(255,255,255,0.7)'));
      const M = sim ? p.M0 - p.mdot * sim.t : p.M0, fprop = (M - p.Mf) / (p.M0 - p.Mf);
      const H = st.h * 0.62, W = st.w * 0.07, bx = st.w * 0.3, by = st.h * 0.88;
      const Hs = H * (1 - val('ts-mp') / 100) / 0.6 * 0.35 + H * 0.12, Hp = H - Hs;
      drawRocket(c, bx, by, W, H, { flame: sim && !sim.done, segs: [[Hp * fprop, '#e8b64a', ''], [Hp * (1 - fprop), alpha(PAL.metal, 0.35), ''], [Hs, PAL.metal, '']], nose: PAL.accent });
      txt(c, 'propelente', bx + W / 2 + 6, by - Hp * fprop / 2, { size: 10, color: '#e8b64a', weight: 600 });
      txt(c, 'estructura + carga', bx + W / 2 + 6, by - Hp - Hs / 2, { size: 10, color: '#c7d0da', weight: 600 });
      const rx = st.w * 0.62;
      txt(c, `t = ${fmt(sim ? sim.t : 0, 0)} s`, rx, 30, { size: 13, weight: 700, color: '#e6edf3' });
      txt(c, `M = ${fmt(M / 1000, 1)} t`, rx, 50, { size: 12, color: '#c7d0da' });
      txt(c, `V = ${fmt(sim ? sim.v : 0, 0)} m/s`, rx, 70, { size: 12, color: '#c7d0da' });
      txt(c, `M₀/M = ${fmt(p.M0 / M, 2)}`, rx, 90, { size: 12, color: '#c7d0da' });
      if (p.grav) arrow(c, bx + W * 2.2, by - H * 0.5, bx + W * 2.2, by - H * 0.5 + 34, '#ff8a7a', 2, 7), txt(c, 'g', bx + W * 2.2 + 6, by - H * 0.5 + 24, { color: '#ff8a7a', weight: 700 });
    }
    st = pl; c = st.ctx;
    if (st.w) {
      clear(st, PAL.sky);
      const vmax = Math.max(1000, Math.ceil(p.dv / 1000) * 1000 + 500);
      const b = { x: 50, y: 22, w: st.w - 64, h: st.h - 56 };
      const f = plotFrame(c, b, [0, p.tb], [0, vmax], { xl: 't [s]', yl: 'V [m/s]', yf: v => fmt(v, 0) });
      const ideal = [], real = []; for (let t = 0; t <= p.tb; t += p.tb / 100) { const M = p.M0 - p.mdot * t; ideal.push([t, p.c * Math.log(p.M0 / M)]); real.push([t, p.c * Math.log(p.M0 / M) - G0 * t]); }
      curve(c, ideal, f.sx, f.sy, alpha(PAL.accent, 0.4), 2, [5, 4]);
      if (p.grav) curve(c, real, f.sx, f.sy, alpha(PAL.bad, 0.4), 2, [5, 4]);
      if (sim) curve(c, sim.hist, f.sx, f.sy, p.grav ? PAL.bad : PAL.accent, 2.8);
      txt(c, 'c·ln(M₀/M)', f.sx(p.tb) - 4, f.sy(p.dv) - 6, { align: 'right', size: 10, color: PAL.accent, weight: 600 });
      if (p.grav) txt(c, '− g·t', f.sx(p.tb) - 4, f.sy(Math.max(0, p.dv - G0 * p.tb)) + 14, { align: 'right', size: 10, color: PAL.bad, weight: 600 });
    }
    $('#ts-c').textContent = fmt(p.c, 0) + ' m/s'; $('#ts-r').textContent = fmt(p.R, 2); $('#ts-dv').textContent = fmt(p.dv, 0) + ' m/s'; $('#ts-vnow').textContent = fmt(sim ? sim.v : 0, 0) + ' m/s';
    const s = $('#ts-status');
    if (p.grav) { const loss = G0 * p.tb; s.className = loss > p.dv ? 'status bad' : 'status warn'; s.textContent = loss > p.dv ? `Con ${fmt(p.tb, 0)} s de combustión la gravedad le quita ${fmt(loss, 0)} m/s, más de lo que da el motor: el cohete ni despega bien. Quemá más rápido.` : `ΔV ideal ${fmt(p.dv, 0)} m/s − pérdida por gravedad ${fmt(loss, 0)} m/s = ${fmt(p.dv - loss, 0)} m/s. Acortá el tiempo de combustión y la pérdida baja.`; }
    else { s.className = 'status good'; s.textContent = `ΔV = ${fmt(p.c, 0)} · ln(${fmt(p.R, 2)}) = ${fmt(p.dv, 0)} m/s. El tiempo de combustión no cambia el resultado ideal; solo cuánto tarda en llegar.`; }
    $('#ts-go').textContent = sim && !sim.done ? 'Quemando…' : 'Encender motor';
  }
  return {
    init() { rk = makeCanvas('ts-rocket', 0.6); pl = makeCanvas('ts-plot', 0.55); $('#ts-go').addEventListener('click', () => { sim = { t: 0, v: 0, y: 0, hist: [[0, 0]], done: false }; }); ['ts-m0', 'ts-mp', 'ts-tb'].forEach(id => $('#' + id).addEventListener('input', () => { sim = null; })); ['ts-prop', 'ts-grav'].forEach(n => $(`.seg[data-name="${n}"]`).addEventListener('change', () => { sim = null; })); },
    frame(dt) { draw(dt); }
  };
})());

/* ===== Etapas y órbitas ===== */
const MU = 398600.4418, RE = 6371;
let ROCKET_DV2 = null;
register('etapas', (() => {
  let rk, bars, ob, launch = null, obAng = 0;
  function calc() {
    const ML = val('et-ml'), MP = val('et-mp'), e = val('et-eps') / 100, c = val('et-isp') * G0 / 1000, f = val('et-f') / 100;
    const MS = e / (1 - e) * MP;
    const one = { M0: ML + MP + MS, Mb: ML + MS }; one.R = one.M0 / one.Mb; one.dv = c * Math.log(one.R);
    const MP1 = f * MP, MP2 = MP - MP1, MS1 = e / (1 - e) * MP1, MS2 = e / (1 - e) * MP2;
    const M01 = ML + MP1 + MS1 + MP2 + MS2, Mb1 = M01 - MP1, M02 = ML + MP2 + MS2, Mb2 = ML + MS2;
    const two = { MP1, MP2, MS1, MS2, M01, Mb1, M02, Mb2, R1: M01 / Mb1, R2: M02 / Mb2 }; two.dv1 = c * Math.log(two.R1); two.dv2 = c * Math.log(two.R2); two.dv = two.dv1 + two.dv2;
    ROCKET_DV2 = two.dv;
    return { ML, MP, MS, e, c, f, one, two };
  }
  function drawEt(dt) {
    const k = calc(), NEED = 9.4;
    if (launch) launch.t += dt;
    let st = rk, c = st.ctx;
    if (st.w) {
      const T = launch ? launch.t : 0;
      clear(st, mix(PAL.sky, '#070b16', clamp(T / 6, 0, 0.85)));
      c.fillStyle = alpha(PAL.good, 0.35); c.fillRect(0, st.h - 10, st.w, 10);
      const H = st.h * 0.55, W = st.w * 0.07, base = st.h - 12;
      const tot = k.one.M0, mH = m => H * m / tot;
      // altura alcanzada proporcional a ΔV
      const alt = (dv, t) => clamp(t / 6, 0, 1) ** 2 * (st.h * 0.9) * Math.min(1, dv / NEED);
      // 1 etapa
      const x1 = st.w * 0.28, y1 = base - alt(k.one.dv, T);
      const burn1 = launch && T < 6 * Math.min(1, k.one.dv / NEED) ** 0.5;
      drawRocket(c, x1, y1, W, H, { flame: burn1, segs: [[mH(k.MP) * (launch ? clamp(1 - T / 6, 0, 1) : 1), '#e8b64a', 'MP'], [mH(k.MS), PAL.metal, 'MS'], [mH(k.ML), PAL.accent, 'ML']], lblColor: PAL.muted });
      txt(c, '1 etapa', x1, st.h - 16, { align: 'center', weight: 700 });
      // 2 etapas
      const x2 = st.w * 0.7; const sep = 6 * 0.55;
      const T1 = Math.min(T, sep), stage2 = T > sep;
      const y2 = base - alt(k.two.dv, T);
      if (!stage2) drawRocket(c, x2, y2, W, H, { flame: !!launch, segs: [[mH(k.two.MP1) * (launch ? clamp(1 - T1 / sep, 0, 1) : 1), '#e8b64a', 'MP1'], [mH(k.two.MS1), PAL.metal, 'MS1'], [mH(k.two.MP2), '#d99a2b', 'MP2'], [mH(k.two.MS2), PAL.metal, 'MS2'], [mH(k.ML), PAL.accent, 'ML']] });
      else {
        const p2 = clamp((T - sep) / (6 - sep), 0, 1);
        drawRocket(c, x2, y2, W, H, { flame: p2 < 1, segs: [[mH(k.two.MP2) * (1 - p2), '#d99a2b', 'MP2'], [mH(k.two.MS2), PAL.metal, 'MS2'], [mH(k.ML), PAL.accent, 'ML']] });
        const fall = (T - sep) ** 2 * 30; const ys = base - alt(k.two.dv, sep) + fall;
        c.save(); c.translate(x2 + (T - sep) * 18, ys); c.rotate((T - sep) * 0.8); c.fillStyle = PAL.metal; c.fillRect(-W / 2, -mH(k.two.MS1) - 4, W, mH(k.two.MS1) + 4); c.restore();
        if (T - sep < 1.5) txt(c, 'separación: se suelta MS1', x2 - W, y2 + 18, { align: 'right', size: 10, color: PAL.warm, weight: 700 });
      }
      txt(c, '2 etapas', x2, st.h - 16, { align: 'center', weight: 700 });
      c.save(); c.strokeStyle = PAL.good; c.setLineDash([5, 4]); const yo = base - st.h * 0.9; line(c, 0, yo, st.w, yo); c.restore(); txt(c, 'órbita baja (9,4 km/s)', 8, yo - 4, { size: 10, color: PAL.good, weight: 700 });
      if (launch && launch.t > 8) launch = null;
    }
    st = bars; c = st.ctx;
    if (st.w) {
      clear(st, PAL.sky);
      const b = { x: 90, y: 14, w: st.w - 110, h: st.h - 40 }, mx = Math.max(12, k.two.dv + 1);
      const sx = v => b.x + v / mx * b.w;
      [['1 etapa', [[k.one.dv, PAL.muted]]], ['2 etapas', [[k.two.dv1, PAL.accent], [k.two.dv2, '#7fa6f5']]]].forEach(([n, parts], i) => {
        const y = b.y + i * (b.h / 2) + 6, h = b.h / 2 - 16; let acc = 0;
        txt(c, n, b.x - 8, y + h / 2 + 4, { align: 'right', weight: 700 });
        parts.forEach(([v, col], j) => { c.fillStyle = col; c.fillRect(sx(acc), y, sx(acc + v) - sx(acc), h); if (sx(acc + v) - sx(acc) > 50) txt(c, `${j ? 'etapa 2' : parts.length > 1 ? 'etapa 1' : ''} ${fmt(v, 2)}`, sx(acc) + 4, y + h / 2 + 4, { size: 9.5, color: '#fff', weight: 600 }); acc += v; });
        txt(c, `${fmt(acc, 2)} km/s`, sx(acc) + 4, y + h / 2 + 4, { size: 10.5, weight: 700 });
      });
      c.strokeStyle = PAL.good; c.lineWidth = 2; line(c, sx(NEED), b.y, sx(NEED), b.y + b.h); txt(c, 'órbita baja 9,4', sx(NEED), b.y + b.h + 14, { align: 'center', size: 10, color: PAL.good, weight: 700 });
    }
    const r = (a, d = 1) => fmt(a, d);
    $('#et-table').innerHTML = `<thead><tr><th></th><th>M₀ [t]</th><th>Mb [t]</th><th>R</th><th>ΔV [km/s]</th></tr></thead><tbody>
      <tr><td>1 etapa</td><td class="num">${r(k.one.M0)}</td><td class="num">${r(k.one.Mb)}</td><td class="num">${r(k.one.R, 2)}</td><td class="num">${r(k.one.dv, 2)}</td></tr>
      <tr><td>2 etapas · etapa 1</td><td class="num">${r(k.two.M01)}</td><td class="num">${r(k.two.Mb1)}</td><td class="num">${r(k.two.R1, 2)}</td><td class="num">${r(k.two.dv1, 2)}</td></tr>
      <tr><td>2 etapas · etapa 2</td><td class="num">${r(k.two.M02)}</td><td class="num">${r(k.two.Mb2)}</td><td class="num">${r(k.two.R2, 2)}</td><td class="num">${r(k.two.dv2, 2)}</td></tr></tbody>`;
    const s = $('#et-status');
    const ok1 = k.one.dv >= NEED, ok2 = k.two.dv >= NEED;
    s.className = 'status ' + (ok2 ? 'good' : 'bad');
    s.textContent = `Mismo propelente y misma estructura total: 1 etapa da ${fmt(k.one.dv, 2)} km/s ${ok1 ? '(llega a órbita)' : '(no llega)'}, 2 etapas dan ${fmt(k.two.dv, 2)} km/s ${ok2 ? '(llega a órbita)' : '(no llega: bajá la carga útil o la estructura)'}. Ganancia: +${fmt(k.two.dv - k.one.dv, 2)} km/s solo por soltar la estructura vacía.`;
  }
  const hFromV = v => 160 * Math.pow(40000 / 160, v / 1000), vFromH = h => 1000 * Math.log(h / 160) / Math.log(40000 / 160);
  function drawOb(dt) {
    calc();
    const h = hFromV(val('ob-h')); $('output[for="ob-h"]').textContent = fmt(h, 0) + ' km';
    const r = RE + h, v = Math.sqrt(MU / r), T = 2 * Math.PI * Math.sqrt(r ** 3 / MU), ve = Math.sqrt(2 * MU / r);
    const r1 = RE + 200; let dv = 9.4;
    if (h > 200) { const a = (r1 + r) / 2; dv += Math.sqrt(MU / r1) * (Math.sqrt(r / a) - 1) + Math.sqrt(MU / r) * (1 - Math.sqrt(r1 / a)); }
    obAng += dt * 2 * Math.PI / (T / 600);
    const st = ob, c = st.ctx;
    if (st.w) {
      clear(st, mix(PAL.sky, '#070b16', 0.85));
      const cx = st.w / 2, cy = st.h / 2, maxR = Math.min(st.w, st.h) / 2 - 16;
      const scale = maxR / Math.max(r, RE * 1.5);
      const g = c.createRadialGradient(cx - RE * scale * 0.3, cy - RE * scale * 0.3, 2, cx, cy, RE * scale); g.addColorStop(0, '#5d9ce8'); g.addColorStop(1, '#1f4f8f'); c.fillStyle = g; c.beginPath(); c.arc(cx, cy, RE * scale, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.setLineDash([3, 4]); c.beginPath(); c.arc(cx, cy, r * scale, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
      const sx = cx + r * scale * Math.cos(obAng), sy = cy - r * scale * Math.sin(obAng);
      dot(c, sx, sy, 5, '#ffd36b');
      arrow(c, sx, sy, sx - Math.sin(obAng) * 30, sy - Math.cos(obAng) * 30, '#ffd36b', 2, 7);
      txt(c, `${fmt(v, 2)} km/s`, sx + 8, sy - 8, { size: 10, color: '#ffd36b', weight: 700 });
      txt(c, 'Tierra y órbita a escala', 10, 18, { color: '#c7d0da', weight: 600 });
      txt(c, 'animación: 1 vuelta = período / 600', st.w - 10, st.h - 8, { align: 'right', size: 9.5, color: '#9fb3c8' });
    }
    const Th = T / 3600;
    $('#ob-v').textContent = fmt(v, 2) + ' km/s'; $('#ob-T').textContent = Th < 2 ? fmt(T / 60, 0) + ' min' : fmt(Th, 1) + ' h'; $('#ob-ve').textContent = fmt(ve, 2) + ' km/s'; $('#ob-dv').textContent = fmt(dv, 1) + ' km/s';
    const s = $('#ob-status'), my = ROCKET_DV2 || 0;
    s.className = 'status ' + (my >= dv ? 'good' : 'warn');
    s.textContent = `Tu cohete de 2 etapas da ${fmt(my, 2)} km/s y esta órbita pide ≈ ${fmt(dv, 1)} km/s: ${my >= dv ? 'llega.' : 'no alcanza. Ajustalo en "1 etapa vs 2 etapas".'}${Math.abs(h - 35786) < 400 ? ' Período ≈ 1 día: geoestacionaria.' : ''}`;
  }
  return {
    init() {
      rk = makeCanvas('et-rocket', 0.7); bars = makeCanvas('et-bars', 0.34); ob = makeCanvas('ob-cv', 0.8);
      $('#et-go').addEventListener('click', () => { launch = { t: 0 }; });
      const el = $('#ob-h'); el.value = vFromH(400);
      $$('#p-etapas [data-h]').forEach(b => b.addEventListener('click', () => { el.value = vFromH(+b.dataset.h); }));
    },
    frame(dt) { if ($('#p-etapas').dataset.sub === 'et') drawEt(dt); else drawOb(dt); }
  };
})());
