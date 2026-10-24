/* ===== Protección térmica ===== */
const SIGMA = 5.670e-8;
register('tps', (() => {
  let ship, zones, traj, absec, abplot, morb, mplot, vch, vplot;
  /* ---------- Reentrada ---------- */
  const TR = [[0, 120, 7.6], [300, 85, 7.5], [600, 74, 7.0], [900, 68, 6.1], [1200, 58, 4.5], [1500, 45, 2.6], [1800, 25, 0.8]];
  function trajAt(t) { for (let i = 1; i < TR.length; i++) if (t <= TR[i][0]) { const u = (t - TR[i - 1][0]) / (TR[i][0] - TR[i - 1][0]); const s = u * u * (3 - 2 * u); return [lerp(TR[i - 1][1], TR[i][1], s), lerp(TR[i - 1][2], TR[i][2], s)]; } return [25, 0.8]; }
  const qNose = t => { const [h, v] = trajAt(t); const rho = 1.225 * Math.exp(-h / 7.2); return 1.7415e-4 * Math.sqrt(rho / 0.6) * (v * 1000) ** 3; };
  const Teq = (q, eps = 0.85) => Math.pow(q / (eps * SIGMA), 0.25) - 273;
  let qInt = null; const qTotal = (() => { let s = 0; for (let t = 0; t <= 1800; t += 5) s += qNose(t) * 5; return s; })();
  const ZONES = [{ n: 'RCC · nariz y bordes de ataque', f: 1, lim: 1650, col: '#3a3d42' }, { n: 'HRSI · panza (losetas)', f: 0.45, lim: 1260, col: '#1d1f22' }, { n: 'AFRSI · zona superior (manta)', f: 0.04, lim: 650, col: '#e9e6dc' }];
  let playing = false, bare = false;
  function drawShip(t) {
    const st = ship, c = st.ctx; if (!st.w) return;
    const [h, v] = trajAt(t), q = qNose(t);
    clear(st, mix(PAL.sky, '#0b1020', clamp((h - 40) / 80, 0, 1) * 0.85));
    const L = Math.min(st.w * 0.62, st.h * 1.3), cx = st.w * 0.45, cy = st.h * 0.52, aoa = 40 * D2R, s = L / 100;
    // onda de choque
    const glow = clamp(q / 5.5e5, 0, 1);
    if (glow > 0.02) {
      const gx = cx + 22 * s, gy = cy + 14 * s;
      const g = c.createRadialGradient(gx, gy, L * 0.1, gx, gy, L * 0.7); g.addColorStop(0, `rgba(255,140,40,${0.55 * glow})`); g.addColorStop(1, 'rgba(255,140,40,0)');
      c.fillStyle = g; c.fillRect(0, 0, st.w, st.h);
      c.save(); c.translate(cx, cy); c.strokeStyle = `rgba(255,180,90,${0.4 + 0.5 * glow})`; c.lineWidth = 2.5; c.beginPath(); c.ellipse(4 * s, 8 * s, 66 * s, 44 * s, -0.15, -1.4, 1.75); c.stroke(); c.restore();
      txt(c, 'onda de choque: gas comprimido y muy caliente', 10, st.h - 10, { color: '#ffb46b', size: 10, weight: 600 });
    }
    const T = ZONES.map(z => bare ? Teq(q * z.f, 0.3) : Teq(q * z.f));
    const zc = i => { const tt = clamp(T[i] / 1700, 0, 1); return glow > 0.05 ? mix(ZONES[i].col, heatColor(0.25 + tt * 0.7), clamp(tt * 1.3, 0, 1)) : ZONES[i].col; };
    const bareC = i => mix('#a9b0b8', heatColor(0.25 + clamp(T[i] / 1700, 0, 1) * 0.7), glow > 0.05 ? 0.8 : 0);
    c.save(); c.translate(cx, cy); c.rotate(-aoa);
    const body = [[-46, -8], [38, -8], [46, -5], [52, 0], [46, 5], [38, 7], [-46, 7]];
    c.fillStyle = bare ? bareC(2) : zc(2); poly(c, body.map(p => [p[0] * s, p[1] * s]), true); c.fill();
    c.fillStyle = bare ? bareC(1) : zc(1); poly(c, [[-46, 3], [38, 3], [46, 4.5], [38, 7], [-46, 7]].map(p => [p[0] * s, p[1] * s]), true); c.fill();
    // ala (vista lateral) y deriva
    c.fillStyle = bare ? bareC(1) : zc(1); poly(c, [[12, 7], [-44, 7], [-46, 10], [6, 9]].map(p => [p[0] * s, p[1] * s]), true); c.fill();
    c.fillStyle = bare ? bareC(0) : zc(0); poly(c, [[12, 7], [6, 9], [3, 8]].map(p => [p[0] * s, p[1] * s]), true); c.fill();
    c.fillStyle = bare ? bareC(2) : zc(2); poly(c, [[-30, -8], [-42, -30], [-47, -30], [-46, -8]].map(p => [p[0] * s, p[1] * s]), true); c.fill();
    c.fillStyle = bare ? bareC(0) : zc(0); poly(c, [[44, -5.5], [52, 0], [44, 5.5]].map(p => [p[0] * s, p[1] * s]), true); c.fill();
    c.strokeStyle = alpha(PAL.ink, 0.5); c.lineWidth = 1; poly(c, body.map(p => [p[0] * s, p[1] * s]), true); c.stroke();
    c.restore();
    arrow(c, st.w - 12, cy - L * 0.45, st.w - 12 - 50, cy - L * 0.45, '#9fb3c8', 2, 8); txt(c, 'aire relativo', st.w - 14, cy - L * 0.45 - 8, { align: 'right', size: 9.5, color: '#9fb3c8' });
    txt(c, `t = ${fmt(t, 0)} s · ángulo de ataque 40°`, 10, 18, { weight: 700, color: h > 60 ? '#dbe6f2' : PAL.ink });
    $('#tps-h').textContent = fmt(h, 0) + ' km'; $('#tps-v').textContent = fmt(v, 1) + ' km/s'; $('#tps-q').textContent = fmt(q / 1e4, 0) + ' W/cm²';
    return { T, q };
  }
  function drawZones(t, T) {
    const st = zones, c = st.ctx; if (!st.w) return; clear(st, PAL.sky);
    let cum = 0; for (let x = 0; x <= t; x += 5) cum += qNose(x) * 5; const Tst = 20 + 155 * cum / qTotal;
    const rows = bare ? ZONES.map((z, i) => [z.n.replace(/·.*/, '· aluminio desnudo'), T[i], 660]) : ZONES.map((z, i) => [z.n, T[i], z.lim]);
    rows.push(['Estructura de aluminio (debajo del TPS)', bare ? Math.max(...T) : Tst, bare ? 660 : 177]);
    const bx = 10, bw = st.w - 20, rh = (st.h - 8) / rows.length, mx = 1800;
    rows.forEach(([n, v, lim], i) => {
      const y = 4 + i * rh; const over = v > lim;
      txt(c, n, bx, y + 12, { size: 10.5, weight: 600, font: BODY, color: over ? PAL.bad : PAL.ink });
      txt(c, `${fmt(Math.max(v, -100), 0)} °C / límite ${fmt(lim, 0)} °C`, bx + bw, y + 12, { size: 10, align: 'right', color: over ? PAL.bad : PAL.muted });
      c.fillStyle = alpha(PAL.muted, 0.15); c.fillRect(bx, y + 17, bw, rh - 24);
      c.fillStyle = over ? PAL.bad : heatColor(clamp(v / 1700, 0, 1) * 0.85 + 0.1); c.fillRect(bx, y + 17, bw * clamp(v / mx, 0, 1), rh - 24);
      c.fillStyle = PAL.ink; c.fillRect(bx + bw * lim / mx - 1, y + 14, 2, rh - 18);
    });
    return rows;
  }
  function drawTraj(t) {
    const st = traj, c = st.ctx; if (!st.w) return; clear(st, PAL.sky);
    const h2 = (st.h - 20) / 2;
    const b1 = { x: 46, y: 20, w: st.w - 92, h: h2 - 34 }, b2 = { x: 46, y: 20 + h2 + 4, w: st.w - 92, h: h2 - 34 };
    let f = plotFrame(c, b1, [0, 1800], [0, 130], { yl: 'altura [km]', ny: 3 });
    const pts = [], pv = [], pq = []; for (let x = 0; x <= 1800; x += 10) { const [h, v] = trajAt(x); pts.push([x, h]); pv.push([x, v * 16.25]); pq.push([x, qNose(x) / 1e4]); }
    curve(c, pts, f.sx, f.sy, PAL.accent, 2.2); curve(c, pv, f.sx, f.sy, PAL.good, 2.2, [5, 3]);
    txt(c, 'velocidad (0–8 km/s)', b1.x + b1.w + 4, f.sy(pv[20][1]), { size: 9.5, color: PAL.good });
    c.strokeStyle = PAL.warm; line(c, f.sx(t), b1.y, f.sx(t), b1.y + b1.h);
    f = plotFrame(c, b2, [0, 1800], [0, 60], { yl: 'calor en la nariz [W/cm²]', xl: 't [s]', ny: 3 });
    curve(c, pq, f.sx, f.sy, PAL.bad, 2.4);
    c.strokeStyle = PAL.warm; line(c, f.sx(t), b2.y, f.sx(t), b2.y + b2.h); dot(c, f.sx(t), f.sy(qNose(t) / 1e4), 5, PAL.warm, PAL.sky);
  }
  function reentry(dt) {
    if (playing) { const el = $('#tps-t'); let t = +el.value + dt * 120; if (t >= 1800) { t = 1800; playing = false; } el.value = t; el.dispatchEvent(new Event('input')); }
    const t = val('tps-t'); const r = drawShip(t); const rows = drawZones(t, r.T); drawTraj(t);
    const s = $('#tps-status');
    const over = rows.filter(x => x[1] > x[2]);
    if (bare && over.length) { s.className = 'status bad'; s.textContent = 'Sin TPS el aluminio superaría los 660 °C y se fundiría. Por eso el Orbiter no podía volver sin sus losetas.'; }
    else if (r.q / 1e4 > 40) { s.className = 'status warn'; s.textContent = `Pico de calentamiento: la nariz recibe ${fmt(r.q / 1e4, 0)} W/cm² y llega a ${fmt(r.T[0], 0)} °C. El RCC lo aguanta.`; }
    else { s.className = 'status good'; s.textContent = 'Cada zona está por debajo del límite de su material.'; }
    $('#tps-play').textContent = playing ? 'Pausar' : 'Reproducir reentrada';
  }
  /* ---------- Ablativo 1D ---------- */
  const AB = { rho: 1450, k: 0.6, cp: 1300, H: 25e6, Tab: 2473, eps: 0.85 };
  let ab = null, abRun = false;
  function abReset() {
    const L = val('abl-L') / 1000, N = 80, dx = L / N;
    ab = { L, N, dx, T: new Array(N + 1).fill(293), rem: 0, t: 0, hist: [] };
    abRun = false;
  }
  function abFlux(t) { const q = val('abl-q') * 1e4; return seg('abl-mode') === 'caps' ? q * Math.exp(-(((t - 90) / 50) ** 2)) * (t < 260 ? 1 : 0) : (t < 60 ? q : 0); }
  function abStep(dtS) {
    const a = AB.k / (AB.rho * AB.cp), dtMax = 0.4 * ab.dx * ab.dx / a; let n = Math.ceil(dtS / dtMax); const h = dtS / n;
    for (let k = 0; k < n; k++) {
      const s0 = Math.min(ab.N, Math.floor(ab.rem / ab.dx)); if (s0 >= ab.N) { ab.burn = true; return; }
      const T = ab.T, Tn = T.slice(), q = abFlux(ab.t);
      for (let i = s0 + 1; i < ab.N; i++) Tn[i] = T[i] + a * h / (ab.dx * ab.dx) * (T[i - 1] - 2 * T[i] + T[i + 1]);
      Tn[ab.N] = T[ab.N] + a * h / (ab.dx * ab.dx) * 2 * (T[ab.N - 1] - T[ab.N]);
      const cond = AB.k * (T[s0] - T[s0 + 1]) / ab.dx;
      let Ts = T[s0] + (q - AB.eps * SIGMA * T[s0] ** 4 - cond) * h / (AB.rho * AB.cp * ab.dx / 2);
      if (Ts >= AB.Tab) { const ex = q - AB.eps * SIGMA * AB.Tab ** 4 - AB.k * (AB.Tab - T[s0 + 1]) / ab.dx; if (ex > 0) ab.rem += ex / (AB.rho * AB.H) * h; Ts = AB.Tab; }
      Tn[s0] = Ts; for (let i = 0; i < s0; i++) Tn[i] = NaN;
      ab.T = Tn; ab.t += h;
    }
    ab.hist.push([ab.t, ab.T[ab.N] - 273, abFlux(ab.t) / 1e4]);
  }
  function drawAbl(dt) {
    if (!ab || Math.abs(ab.L - val('abl-L') / 1000) > 1e-9) abReset();
    const tEnd = seg('abl-mode') === 'caps' ? 600 : 180;
    if (abRun && !ab.burn && ab.t < tEnd) abStep(dt * 25);
    if (ab.t >= tEnd || ab.burn) abRun = false;
    const s0 = Math.min(ab.N, Math.floor(ab.rem / ab.dx));
    let st = absec, c = st.ctx;
    if (st.w) {
      clear(st, PAL.sky);
      const top = st.h * 0.28, depth = st.h * 0.58, x0 = 20, x1 = st.w - 20, py = d => top + d / ab.L * depth;
      const q = abFlux(ab.t);
      if (q > 0) { const g = c.createLinearGradient(0, 0, 0, top); g.addColorStop(0, 'rgba(255,120,30,0)'); g.addColorStop(1, `rgba(255,120,30,${0.25 + 0.6 * q / 1e7})`); c.fillStyle = g; c.fillRect(x0, 0, x1 - x0, top + ab.rem / ab.L * depth); txt(c, seg('abl-mode') === 'caps' ? 'plasma de reentrada' : 'llama oxiacetilénica', st.w / 2, 16, { align: 'center', weight: 700, size: 11, color: '#d0601c' }); }
      for (let i = s0; i < ab.N; i++) {
        const Tc = ab.T[i] - 273; const col = Tc > 600 ? '#262220' : Tc > 300 ? mix('#8a5a2b', '#3a2a1e', (Tc - 300) / 300) : mix('#c8a06a', '#a77c45', clamp(Tc / 300, 0, 1));
        c.fillStyle = col; c.fillRect(x0, py(i * ab.dx), x1 - x0, py((i + 1) * ab.dx) - py(i * ab.dx) + 0.6);
      }
      if (ab.T[s0] > 1200) { c.fillStyle = `rgba(255,${Math.round(200 - (ab.T[s0] - 1200) / 10)},60,0.85)`; c.fillRect(x0, py(ab.rem) - 2, x1 - x0, 3); }
      c.fillStyle = PAL.metal; c.fillRect(x0, top + depth, x1 - x0, st.h * 0.08);
      txt(c, 'estructura', x0 + 6, top + depth + st.h * 0.06, { size: 10, weight: 600, color: PAL.ink });
      c.save(); c.strokeStyle = PAL.ink; c.setLineDash([4, 4]); line(c, x0, top, x1, top); c.restore();
      txt(c, 'superficie original', x1, top - 4, { align: 'right', size: 9.5, color: PAL.muted });
      // etiquetas de capas
      let charD = 0, pyD = 0; for (let i = s0; i <= ab.N; i++) { const Tc = ab.T[i] - 273; if (Tc > 600) charD = (i + 1) * ab.dx; if (Tc > 300) pyD = (i + 1) * ab.dx; }
      if (charD > ab.rem + ab.dx) txt(c, 'char', x0 + 6, (py(ab.rem) + py(charD)) / 2 + 4, { size: 10, weight: 700, color: '#f4e6d0' });
      if (pyD > charD + ab.dx) txt(c, 'pirólisis', x0 + 6, (py(charD) + py(pyD)) / 2 + 4, { size: 10, weight: 700, color: '#f4e6d0' });
      txt(c, 'virgen', x0 + 6, (py(pyD) + py(ab.L)) / 2 + 4, { size: 10, weight: 700, color: '#3a2a1e' });
    }
    st = abplot; c = st.ctx;
    if (st.w) {
      clear(st, PAL.sky);
      const b = { x: 46, y: 22, w: st.w - 60, h: st.h - 56 };
      const f = plotFrame(c, b, [0, ab.L * 1000], [0, 2400], { xl: 'profundidad [mm]', yl: 'T [°C]' });
      c.save(); c.fillStyle = alpha(PAL.warm, 0.08); c.fillRect(f.sx(0), f.sy(600), b.w, f.sy(300) - f.sy(600)); c.restore();
      txt(c, 'pirólisis 300–600 °C', b.x + b.w - 4, f.sy(600) - 4, { align: 'right', size: 9.5, color: PAL.warm });
      curve(c, ab.T.map((T, i) => [i * ab.dx * 1000, Number.isFinite(T) ? T - 273 : NaN]), f.sx, f.sy, PAL.bad, 2.4);
      c.save(); c.strokeStyle = PAL.good; c.setLineDash([4, 3]); line(c, b.x, f.sy(180), b.x + b.w, f.sy(180)); c.restore(); txt(c, 'límite estructura 180 °C', b.x + 4, f.sy(180) - 4, { size: 9.5, color: PAL.good });
    }
    const Tb = ab.T[ab.N] - 273, Ts = ab.T[s0] - 273;
    $('#abl-t').textContent = fmt(ab.t, 0) + ' s'; $('#abl-r').textContent = fmt(ab.rem * 1000, 1) + ' mm'; $('#abl-ts').textContent = Number.isFinite(Ts) ? fmt(Ts, 0) + ' °C' : '—'; $('#abl-tb').textContent = fmt(Tb, 0) + ' °C';
    $('#abl-go').textContent = abRun ? 'Pausar' : (ab.t > 0 ? 'Continuar' : 'Iniciar');
    const s = $('#abl-status');
    if (ab.burn) { s.className = 'status bad'; s.textContent = 'Se consumió todo el escudo: la llama llegó a la estructura. Hace falta más espesor.'; }
    else if (Tb > 180) { s.className = 'status bad'; s.textContent = `La cara interior llegó a ${fmt(Tb, 0)} °C: la estructura se daña. Subí el espesor o bajá el flujo.`; }
    else if (ab.t >= tEnd) { s.className = 'status good'; s.textContent = `Misión cumplida: se sacrificaron ${fmt(ab.rem * 1000, 1)} mm de material y la cara interior quedó en ${fmt(Tb, 0)} °C. Fijate que siguió subiendo un rato después del pico: el calor guardado sigue avanzando hacia adentro.`; }
    else if (ab.t === 0) { s.className = 'status'; s.textContent = seg('abl-mode') === 'caps' ? 'Pulso de reentrada de unos 4 minutos con pico a los 90 s. Apretá Iniciar.' : 'Ensayo de 60 s con flujo constante. El soplete oxiacetilénico típico da unos 835 W/cm².'; }
    else { s.className = 'status warn'; s.textContent = 'Ablacionando: la superficie se mantiene a ~2200 °C mientras retrocede; el interior casi no se entera.'; }
  }
  /* ---------- MLI ---------- */
  const MCP = 135000, GS = 1361, PER = 5520, RR = 1.0628;
  let mli = { t: 0, Ti: 293, hist: [] };
  function mliState(n, P, sun) {
    const Ti = mli.Ti;
    if (n === 0) {
      const a = 0.9, e = 0.85, h = 5;
      const solve = (Qa) => { let T = 250; for (let k = 0; k < 40; k++) { const f = Qa + h * (Ti - T) - e * SIGMA * T ** 4, df = -h - 4 * e * SIGMA * T ** 3; T = clamp(T - f / df, 3, 800); } return T; };
      const Tsun = solve(sun ? a * GS : 0), Tsh = solve(0);
      const Qnet = P + h * (Tsun - Ti) + 5 * h * (Tsh - Ti);
      return { Tsun, Tsh, Qnet };
    }
    const ee = 1 / ((n + 1) * (2 / 0.03 - 1)) + 0.004, ao = 0.4, eo = 0.7;
    const To = Qa => Math.pow((Qa + ee * SIGMA * Ti ** 4) / (SIGMA * (eo + ee)), 0.25);
    const Tsun = To(sun ? ao * GS : 0), Tsh = To(0);
    const leak = ee * SIGMA * (Tsun ** 4 - Ti ** 4) + 4.7 * ee * SIGMA * (Tsh ** 4 - Ti ** 4);
    const Qnet = P + leak - 0.8 * SIGMA * 0.3 * Ti ** 4;
    return { Tsun, Tsh, Qnet };
  }
  function drawMLI(dt) {
    const n = +seg('mli-n'), P = val('mli-p');
    if (mli.n !== n) { mli.n = n; mli.hist = []; }
    const steps = 6, dts = dt * PER / 12 / steps; let S;
    for (let k = 0; k < steps; k++) {
      const th = (mli.t / PER) * 2 * Math.PI; const x = Math.cos(th), y = Math.sin(th);
      const sun = !(x > 0 && Math.abs(y) * RR < 1);
      S = mliState(n, P, sun); S.sun = sun; S.th = th;
      mli.Ti += S.Qnet / MCP * dts; mli.t += dts;
    }
    mli.hist.push([mli.t, mli.Ti - 273, S.sun]); while (mli.hist.length && mli.hist[0][0] < mli.t - 4 * PER) mli.hist.shift();
    let st = morb, c = st.ctx;
    if (st.w) {
      clear(st, mix(PAL.sky, '#0b1020', 0.9));
      const cx = st.w * 0.55, cy = st.h / 2, R = Math.min(st.h * 0.3, st.w * 0.2), r = R * RR * 1.35;
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(cx, cy - R, st.w - cx, 2 * R);
      for (let k = 0; k < 5; k++) arrow(c, 8, cy - R + k * R / 2, 46, cy - R + k * R / 2, '#f3c64a', 2, 7);
      txt(c, 'Sol', 8, cy - R - 10, { color: '#f3c64a', weight: 700 });
      c.fillStyle = '#2f6db3'; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.45)'; c.beginPath(); c.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.25)'; c.setLineDash([3, 4]); c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
      const sx = cx + r * Math.cos(S.th), sy = cy - r * Math.sin(S.th);
      const bs = 16;
      c.fillStyle = heatColor(clamp((S.Tsun - 150) / 300, 0, 1)); c.fillRect(sx - bs / 2, sy - bs / 2, 5, bs);
      c.fillStyle = heatColor(clamp((S.Tsh - 150) / 300, 0, 1)); c.fillRect(sx - bs / 2 + 5, sy - bs / 2, bs - 5, bs);
      c.strokeStyle = '#fff'; c.lineWidth = 1; c.strokeRect(sx - bs / 2, sy - bs / 2, bs, bs);
      txt(c, S.sun ? 'al sol' : 'eclipse', sx, sy - 14, { align: 'center', size: 10, weight: 700, color: S.sun ? '#f3c64a' : '#9fb3c8' });
      txt(c, 'órbita baja: 92 min por vuelta', st.w - 8, st.h - 8, { align: 'right', size: 9.5, color: '#9fb3c8' });
    }
    st = mplot; c = st.ctx;
    if (st.w) {
      clear(st, PAL.sky);
      const b = { x: 46, y: 22, w: st.w - 60, h: st.h - 56 };
      const t1 = mli.t, t0 = t1 - 4 * PER;
      const f = plotFrame(c, b, [0, 4 * 92], [-80, 80], { xl: 'minutos (últimas 4 órbitas)', yl: 'Electrónica [°C]' });
      let inE = null; mli.hist.forEach(([t, , sun]) => { const m = (t - t0) / 60; if (!sun && inE === null) inE = m; if (sun && inE !== null) { c.fillStyle = alpha(PAL.muted, 0.15); c.fillRect(f.sx(inE), b.y, f.sx(m) - f.sx(inE), b.h); inE = null; } });
      if (inE !== null) { c.fillStyle = alpha(PAL.muted, 0.15); c.fillRect(f.sx(inE), b.y, f.sx(4 * 92) - f.sx(inE), b.h); }
      c.fillStyle = alpha(PAL.good, 0.12); c.fillRect(b.x, f.sy(40), b.w, f.sy(-10) - f.sy(40)); txt(c, 'rango admisible −10 a +40 °C', b.x + 4, f.sy(40) + 12, { size: 9.5, color: PAL.good });
      curve(c, mli.hist.map(([t, T]) => [(t - t0) / 60, clamp(T, -80, 80)]), f.sx, f.sy, PAL.accent, 2.4);
      txt(c, 'franjas grises = eclipse', b.x + b.w, b.y - 6, { align: 'right', size: 9.5, color: PAL.muted });
    }
    const Ti = mli.Ti - 273;
    $('#mli-ts').textContent = fmt(S.Tsun - 273, 0) + ' °C'; $('#mli-tsh').textContent = fmt(S.Tsh - 273, 0) + ' °C'; $('#mli-ti').textContent = fmt(Ti, 1) + ' °C';
    const s = $('#mli-status');
    if (n === 0) { const lit = mliState(n, P, true); s.className = 'status bad'; s.textContent = `Sin MLI la caja intercambia calor con todo el entorno: al sol una cara llega a ${fmt(lit.Tsun - 273, 0)} °C mientras la opuesta está a ${fmt(lit.Tsh - 273, 0)} °C, y la electrónica oscila con cada eclipse.`; }
    else if (Ti < -10 || Ti > 40) { s.className = 'status warn'; s.textContent = `La electrónica está a ${fmt(Ti, 0)} °C, fuera de rango. El MLI la aísla del sol, así que ahora depende del balance entre su potencia y el radiador.`; }
    else { const lit = mliState(n, P, true); s.className = 'status good'; s.textContent = `Con ${n} capa${n > 1 ? 's' : ''} la electrónica se mantiene estable en ${fmt(Ti, 0)} °C aunque afuera la manta esté a ${fmt(lit.Tsun - 273, 0)} °C del lado del sol y a ${fmt(lit.Tsh - 273, 0)} °C del lado de la sombra.`; }
  }
  /* ---------- Vacío térmico ---------- */
  const ORB = { leo: { lo: -20, hi: 50, per: '92 min', note: 'unos 16 ciclos reales por día' }, meo: { lo: -30, hi: 60, per: '12 h', note: '2 ciclos reales por día' }, geo: { lo: -40, hi: 70, per: '24 h', note: 'eclipses solo cerca de los equinoccios, de hasta 72 min' } };
  let vac = null;
  function vacStart() { vac = { t: 0, Ts: 20, Tsh: 20, P: 1013, hist: [], cyc: 0, done: false, orb: seg('vac-orb') }; }
  function shroud(o, u) { const k = u % 1; const p = k < 0.15 ? lerp(0, 1, k / 0.15) : k < 0.45 ? 1 : k < 0.6 ? lerp(1, -1, (k - 0.45) / 0.15) : k < 0.9 ? -1 : lerp(-1, 0, (k - 0.9) / 0.1); return p > 0 ? 20 + (o.hi + 10 - 20) * p : 20 + (20 - (o.lo - 10)) * p; }
  function drawVac(dt) {
    const o = ORB[seg('vac-orb')];
    $('#vac-note').textContent = `Órbita: ${o.per} por vuelta · ${o.note}`;
    if (vac && !vac.done) {
      vac.t += dt;
      if (vac.t < 4) { vac.P = 1013 * Math.pow(1e-9, vac.t / 4); }
      else { const u = (vac.t - 4) / 4; vac.cyc = Math.floor(u); vac.Tsh = shroud(o, u); if (vac.cyc >= 6) { vac.done = true; vac.Tsh = 20; } }
      vac.Ts += (vac.Tsh - vac.Ts) * Math.min(1, dt * 1.1);
      vac.hist.push([vac.t, vac.Tsh, vac.Ts, vac.P]);
    }
    let st = vch, c = st.ctx;
    if (st.w) {
      clear(st, PAL.sky);
      const cx = st.w / 2, cy = st.h * 0.48, w = st.w * 0.7, h = st.h * 0.66;
      c.fillStyle = PAL.metal; c.beginPath(); c.roundRect ? c.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2) : c.rect(cx - w / 2, cy - h / 2, w, h); c.fill();
      const Tsh = vac ? vac.Tsh : 20, Ts = vac ? vac.Ts : 20, P = vac ? vac.P : 1013;
      c.fillStyle = mix('#3b6fd4', '#d9452b', clamp((Tsh + 50) / 130, 0, 1)); c.beginPath(); c.roundRect ? c.roundRect(cx - w / 2 + 10, cy - h / 2 + 10, w - 20, h - 20, h / 2 - 10) : c.rect(cx - w / 2 + 10, cy - h / 2 + 10, w - 20, h - 20); c.fill();
      c.fillStyle = PAL.sky; c.beginPath(); c.roundRect ? c.roundRect(cx - w / 2 + 18, cy - h / 2 + 18, w - 36, h - 36, h / 2 - 18) : c.rect(cx - w / 2 + 18, cy - h / 2 + 18, w - 36, h - 36); c.fill();
      const nMol = Math.round(clamp(Math.log10(P) + 9, 0, 12) * 6);
      for (let i = 0; i < nMol; i++) dot(c, cx - w / 2 + 30 + ((i * 73 + performance.now() / 20 * (i % 3 + 1)) % (w - 60)), cy - h / 2 + 30 + ((i * 41) % (h - 60)), 2, alpha(PAL.muted, 0.7));
      const sw = Math.min(w * 0.18, h * 0.4); c.fillStyle = mix('#3b6fd4', '#d9452b', clamp((Ts + 50) / 130, 0, 1)); c.fillRect(cx - sw / 2, cy - sw / 2, sw, sw);
      c.fillStyle = '#1f3a6b'; c.fillRect(cx - sw / 2 - sw * 1.1, cy - sw * 0.25, sw * 1.05, sw * 0.5); c.fillRect(cx + sw / 2 + sw * 0.05, cy - sw * 0.25, sw * 1.05, sw * 0.5);
      txt(c, `satélite ${fmt(Ts, 0)} °C`, cx, cy + sw / 2 + 16, { align: 'center', weight: 700, size: 11 });
      txt(c, `paredes (shrouds) ${fmt(Tsh, 0)} °C`, cx, cy - h / 2 + 34, { align: 'center', size: 10.5, weight: 600 });
      c.fillStyle = PAL.ink; c.fillRect(cx - 14, cy + h / 2, 28, st.h * 0.1);
      txt(c, `bomba de vacío · ${P > 1 ? fmt(P, 0) : P.toExponential(1).replace('.', ',')} hPa`, cx, st.h - 6, { align: 'center', size: 10.5, weight: 600 });
    }
    st = vplot; c = st.ctx;
    if (st.w) {
      clear(st, PAL.sky);
      const b = { x: 46, y: 22, w: st.w - 60, h: st.h - 56 };
      const f = plotFrame(c, b, [0, 28], [-60, 90], { xl: 'tiempo de ensayo (comprimido)', yl: 'T [°C]', xf: v => '' });
      c.fillStyle = alpha(PAL.muted, 0.12); c.fillRect(f.sx(0), b.y, f.sx(4) - f.sx(0), b.h); txt(c, 'vacío', f.sx(2), b.y + 12, { align: 'center', size: 9.5, color: PAL.muted });
      c.save(); c.setLineDash([4, 4]); c.strokeStyle = alpha(PAL.bad, 0.6); line(c, b.x, f.sy(o.hi), b.x + b.w, f.sy(o.hi)); c.strokeStyle = alpha(PAL.accent, 0.6); line(c, b.x, f.sy(o.lo), b.x + b.w, f.sy(o.lo)); c.restore();
      txt(c, `meseta caliente ${o.hi} °C`, b.x + b.w - 2, f.sy(o.hi) - 4, { align: 'right', size: 9.5, color: PAL.bad }); txt(c, `meseta fría ${o.lo} °C`, b.x + b.w - 2, f.sy(o.lo) + 12, { align: 'right', size: 9.5, color: PAL.accent });
      if (vac) { curve(c, vac.hist.map(h => [h[0], h[1]]), f.sx, f.sy, PAL.warm, 2, [5, 3]); curve(c, vac.hist.map(h => [h[0], h[2]]), f.sx, f.sy, PAL.ink, 2.4); }
      txt(c, 'cortada: paredes · llena: satélite', b.x + b.w, b.y - 6, { size: 9.5, color: PAL.muted, align: 'right' });
    }
    const s = $('#vac-status');
    if (!vac) { s.className = 'status'; s.textContent = 'Elegí la órbita y apretá Iniciar ensayo.'; }
    else if (vac.t < 4) { s.className = 'status warn'; s.textContent = 'Haciendo vacío: sin aire no hay convección; desde ahora el satélite solo intercambia calor por radiación con las paredes.'; }
    else if (!vac.done) { s.className = 'status warn'; s.textContent = `Ciclo ${vac.cyc + 1} de 6. El satélite sigue a las paredes con retraso: así se verifica que funcione en los extremos y que aguante las dilataciones repetidas.`; }
    else { s.className = 'status good'; s.textContent = 'Ensayo completo: 6 ciclos entre las mesetas fría y caliente. En un programa real se mide además que todo funcione en cada meseta.'; }
    $('#vac-go').textContent = vac && !vac.done ? 'Ensayando…' : 'Iniciar ensayo'; $('#vac-go').disabled = !!(vac && !vac.done);
  }
  return {
    init() {
      ship = makeCanvas('tps-ship', 0.55); zones = makeCanvas('tps-zones', 0.42); traj = makeCanvas('tps-traj', 0.62);
      absec = makeCanvas('abl-sec', 0.5); abplot = makeCanvas('abl-plot', 0.5); morb = makeCanvas('mli-orbit', 0.5); mplot = makeCanvas('mli-plot', 0.5);
      vch = makeCanvas('vac-ch', 0.55); vplot = makeCanvas('vac-plot', 0.5);
      $('#tps-play').addEventListener('click', () => { if (!playing && val('tps-t') >= 1800) { $('#tps-t').value = 0; } playing = !playing; });
      $('#tps-bare').addEventListener('click', e => { bare = !bare; e.target.setAttribute('aria-pressed', bare); e.target.textContent = bare ? 'Volver a poner el TPS' : 'Quitar el TPS'; });
      abReset();
      $('#abl-go').addEventListener('click', () => { if (ab.burn || ab.t >= (seg('abl-mode') === 'caps' ? 600 : 180)) abReset(); abRun = !abRun; });
      $('#abl-reset').addEventListener('click', abReset);
      $('.seg[data-name="abl-mode"]').addEventListener('change', () => { if (seg('abl-mode') === 'astm') { $('#abl-q').value = 840; $('#abl-q').dispatchEvent(new Event('input')); } abReset(); });
      $('#vac-go').addEventListener('click', vacStart);
      $('.seg[data-name="vac-orb"]').addEventListener('change', () => { vac = null; });
    },
    frame(dt) {
      const s = $('#p-tps').dataset.sub;
      if (s === 'reent') reentry(dt); else if (s === 'abl') drawAbl(dt); else if (s === 'mli') drawMLI(dt); else drawVac(dt);
    }
  };
})());
