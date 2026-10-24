/* ===== Hipersustentadores ===== */
const smin = (a, b, k) => { const m = Math.min(a, b); return m - k * Math.log(Math.exp(-(a - m) / k) + Math.exp(-(b - m) / k)); };
const HP = (() => {
  const TE = {
    none: { dCL: 0, dCLmax: 0, dCD: 0, ext: 0 },
    plain: { dCL: 0.9, dCLmax: 0.75, dCD: 0.055, ext: 0 },
    split: { dCL: 1.0, dCLmax: 0.85, dCD: 0.085, ext: 0 },
    zap: { dCL: 1.15, dCLmax: 1.0, dCD: 0.07, ext: 0.08 },
    slotted: { dCL: 1.35, dCLmax: 1.25, dCD: 0.045, ext: 0.04 },
    fowler: { dCL: 1.55, dCLmax: 1.6, dCD: 0.04, ext: 0.28 }
  };
  const LE = { none: { dCLmax: 0, ext: 0 }, droop: { dCLmax: 0.45, ext: 0 }, krueger: { dCLmax: 0.65, ext: 0.03 }, betz: { dCLmax: 0.55, ext: 0.02 }, slat: { dCLmax: 0.75, ext: 0.06 }, slatauto: { dCLmax: 0.75, ext: 0.06 } };
  const A0 = 0.1, ALPHA0 = -2, CLMAX0 = 1.45;
  const gTE = d => Math.sin(Math.PI / 2 * clamp(d / 40, 0, 1));
  function model(c) {
    const T = TE[c.te], L = LE[c.le];
    const g = c.te === 'none' ? 0 : gTE(c.dte), gl = c.le === 'none' ? 0 : clamp(c.dle / 25, 0, 1);
    const slope = A0 * (1 + T.ext * g + L.ext * gl), dCL = T.dCL * g;
    const CLmax = CLMAX0 + T.dCLmax * g + L.dCLmax * gl;
    const aS = (CLmax - dCL) / slope + ALPHA0;
    const cl = a => { const post = a > aS ? 0.33 * CLmax * (1 - Math.exp(-(a - aS) / 2.5)) : 0; return smin(slope * (a - ALPHA0) + dCL, CLmax - post, 0.06); };
    const cd = a => { const C = cl(a); return 0.008 + 0.0075 * C * C + T.dCD * g + 0.004 * gl + (a > aS ? 0.035 * (a - aS) : 0); };
    return { g, gl, slope, dCL, CLmax, aS, cl, cd };
  }
  return { TE, LE, model, gTE };
})();

register('hiper', (() => {
  let flow, clc, pol, drg, cache = { key: '' }, phase = 0, flapsOut = true;
  const SLAT_OPEN = 5, SLAT_FULL = 11;
  const autoSlat = a => 25 * clamp((a - SLAT_OPEN) / (SLAT_FULL - SLAT_OPEN), 0, 1);
  const cfg = () => { const le = seg('hp-le'), a = val('hp-a'); return { a, te: seg('hp-te'), dte: val('hp-dte'), le, dle: le === 'slatauto' ? autoSlat(a) : val('hp-dle') }; };
  const camber = x => naca(0.02, 0.4, 0.12, x).yc;

  /* geometría: cuerpos (para dibujar) y líneas medias (para el método de vórtices) en ejes del perfil */
  function geometry(c, M) {
    const bodies = [], cambers = [];
    const g = M.g, gl = M.gl, dT = c.dte * D2R * (c.te === 'none' ? 0 : 1), dL = c.dle * D2R * (c.le === 'none' ? 0 : 1);
    const camLine = (x0, x1, n) => { const a = []; for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n; a.push([x, camber(x)]); } return a; };
    let x0 = 0, x1 = 1;
    if (c.le === 'droop' || c.le === 'betz') x0 = c.le === 'droop' ? 0.15 : 0.13;
    if (c.te === 'plain') x1 = 0.75; else if (c.te === 'slotted') x1 = 0.82; else if (c.te === 'fowler') x1 = 0.8;
    bodies.push({ pts: airfoilPart(x0, x1), kind: 'main' }); cambers.push(camLine(x0, x1, 26));
    // borde de ataque
    if (c.le === 'droop') {
      const h = [0.15, camber(0.15)], tf = p => rot(p, h[0], h[1], dL);
      bodies.push({ pts: airfoilPart(0, 0.15, 16).map(tf), kind: 'le' }); cambers.push(camLine(0, 0.15, 5).map(tf));
    } else if (c.le === 'betz') {
      const h = [0.13, camber(0.13)], off = [-0.035 * gl, -0.03 * gl];
      const tf = p => { const r = rot(p, h[0], h[1], dL); return [r[0] + off[0], r[1] + off[1]]; };
      bodies.push({ pts: airfoilPart(0, 0.115, 16).map(tf), kind: 'le' }); cambers.push(camLine(0, 0.115, 5).map(tf));
    } else if (c.le === 'krueger') {
      const hx = 0.1, hy = naca(0.02, 0.4, 0.12, hx).yl, ang = -150 * D2R * gl;
      const plate = []; for (let i = 0; i <= 8; i++) { const s = i / 8; const p = [hx + 0.12 * s, hy - 0.004 * Math.sin(Math.PI * s) - 0.002]; plate.push(rot(p, hx, hy, ang)); }
      bodies.push({ pts: plate, kind: 'plate' }); cambers.push(plate.filter((_, i) => i % 2 === 0));
    } else if (c.le === 'slat' || c.le === 'slatauto') {
      /* slat: perfil auxiliar con forma de media luna que forma la nariz del ala; al extenderse avanza sobre rieles, baja y abre una ranura */
      const outer = [];
      for (let i = 0; i <= 14; i++) { const x = 0.16 * (1 - i / 14) ** 2; const s = naca(0.02, 0.4, 0.12, x); outer.push([s.xu, s.yu]); }
      for (let i = 1; i <= 6; i++) { const x = 0.035 * (i / 6) ** 2; const s = naca(0.02, 0.4, 0.12, x); outer.push([s.xl, s.yl]); }
      const C = [0.2, 0.012], th = 0.034;
      const inner = outer.map(([x, y], i) => { const dx = C[0] - x, dy = C[1] - y, L = Math.hypot(dx, dy) || 1; const k = th * Math.sin(Math.PI * (0.15 + 0.85 * i / (outer.length - 1))) + 0.003; return [x + dx / L * k, y + dy / L * k]; }).reverse();
      const off = [-0.075 * gl, -0.045 * gl], piv = [0.16, naca(0.02, 0.4, 0.12, 0.16).yu];
      const tf = p => { const r = rot(p, piv[0], piv[1], dL * 0.8); return [r[0] + off[0], r[1] + off[1]]; };
      bodies.push({ pts: outer.concat(inner).map(tf), kind: 'le' });
      const mid = outer.slice(0, 15).reverse().map((p, i) => { const q = inner[inner.length - 1 - (14 - i)]; return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; });
      cambers.push(mid.filter((_, i) => i % 3 === 0 || i === mid.length - 1).map(tf));
    }
    // borde de fuga
    if (c.te === 'plain') {
      const h = [0.75, camber(0.75)], tf = p => rot(p, h[0], h[1], -dT);
      bodies.push({ pts: airfoilPart(0.75, 1, 18).map(tf), kind: 'flap' }); cambers.push(camLine(0.75, 1, 7).map(tf));
    } else if (c.te === 'split' || c.te === 'zap') {
      const hx = 0.75 + (c.te === 'zap' ? 0.07 * g : 0), hy = naca(0.02, 0.4, 0.12, Math.min(hx, 0.99)).yl;
      const plate = []; for (let i = 0; i <= 6; i++) plate.push(rot([hx + 0.25 * i / 6, hy], hx, hy, -dT));
      bodies.push({ pts: plate, kind: 'plate' }); cambers.push(plate);
    } else if (c.te === 'slotted') {
      const piv = [0.79, -0.075], tf = p => rot(p, piv[0], piv[1], -dT);
      bodies.push({ pts: airfoilPart(0.76, 1, 18).map(tf), kind: 'flap' }); cambers.push(camLine(0.76, 1, 7).map(tf));
    } else if (c.te === 'fowler') {
      const off = [0.27 * g, -0.035 * g], le = [0.74 + off[0], camber(0.74) + off[1]];
      const tf = p => rot([p[0] + off[0], p[1] + off[1]], le[0], le[1], -dT);
      bodies.push({ pts: airfoilPart(0.74, 1, 18).map(tf), kind: 'flap' }); cambers.push(camLine(0.74, 1, 7).map(tf));
    }
    return { bodies, cambers };
  }

  /* flujo potencial: vórtices concentrados sobre la línea media + fuentes por espesor */
  function computeFlow(c, M) {
    const a = c.a * D2R, toW = p => rot(p, 0, 0, -a);
    const geo = geometry(c, M);
    const vort = [], ctrl = [];
    geo.cambers.forEach(cl => { const w = cl.map(toW); for (let i = 0; i < w.length - 1; i++) { const [x1, y1] = w[i], [x2, y2] = w[i + 1]; const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1e-6; vort.push([x1 + 0.25 * dx, y1 + 0.25 * dy]); ctrl.push([x1 + 0.75 * dx, y1 + 0.75 * dy, -dy / L, dx / L]); } });
    const n = vort.length, A = [], b = [];
    for (let i = 0; i < n; i++) { const [cx, cy, nx, ny] = ctrl[i]; const row = []; for (let j = 0; j < n; j++) { const dx = cx - vort[j][0], dy = cy - vort[j][1], r2 = dx * dx + dy * dy + 1e-9; row.push((-dy * nx + dx * ny) / (2 * Math.PI * r2)); } A.push(row); b.push(-nx); }
    let G = solve(A, b);
    const clPot = -2 * G.reduce((s, v) => s + v, 0);
    const clT = M.cl(c.a); const k = clPot > 0.05 ? clamp(clT / clPot, 0, 1.6) : 1; G = G.map(v => v * k);
    const src = []; const N = 30; let prev = null;
    for (let i = 0; i <= N; i++) { const x = 0.5 - 0.5 * Math.cos(Math.PI * i / N); const s = naca(0.02, 0.4, 0.12, x); const p = { x, t: 2 * s.yt, w: toW([x, s.yc]) }; if (prev) src.push([(prev.w[0] + p.w[0]) / 2, (prev.w[1] + p.w[1]) / 2, p.t - prev.t]); prev = p; }
    const vel = (x, y) => {
      let u = 1, v = 0;
      for (let j = 0; j < n; j++) { const dx = x - vort[j][0], dy = y - vort[j][1], r2 = dx * dx + dy * dy + 4e-4; u += -G[j] * dy / (2 * Math.PI * r2); v += G[j] * dx / (2 * Math.PI * r2); }
      for (const [sx, sy, q] of src) { const dx = x - sx, dy = y - sy, r2 = dx * dx + dy * dy + 4e-4; u += q * dx / (2 * Math.PI * r2); v += q * dy / (2 * Math.PI * r2); }
      return [u, v];
    };
    const lines = [];
    for (let y0 = -0.75; y0 <= 0.751; y0 += 0.1) {
      let x = -1.1, y = y0 + 0.1 * Math.sin(a); const pts = [[x, y, 1, 0]]; let t = 0;
      for (let s = 0; s < 700 && x < 2.3; s++) {
        let [u, v] = vel(x, y); let sp = Math.hypot(u, v) || 1e-6; const ds = 0.012;
        const xm = x + 0.5 * ds * u / sp, ym = y + 0.5 * ds * v / sp; [u, v] = vel(xm, ym); sp = Math.hypot(u, v) || 1e-6;
        x += ds * u / sp; y += ds * v / sp; t += ds / clamp(sp, 0.2, 4); pts.push([x, y, sp, t]);
      }
      lines.push({ pts, T: t, y0 });
    }
    const bodiesW = geo.bodies.map(bd => ({ ...bd, pts: bd.pts.map(toW) }));
    const upperAt = x => { const s = naca(0.02, 0.4, 0.12, x); return toW([s.xu, s.yu]); };
    lines.forEach(L => { const ref = upperAt(0.5); let best = null; for (const p of L.pts) if (best === null || Math.abs(p[0] - ref[0]) < Math.abs(best[0] - ref[0])) best = p; L.over = best && best[1] > ref[1] && best[1] - ref[1] < 0.42; L.gap = best ? best[1] - ref[1] : 9; });
    return { lines, bodiesW, a };
  }

  function drawFlow(dt) {
    const st = flow, c = st.ctx; if (!st.w) return;
    const C = cfg(), M = HP.model(C);
    const sl = $('#hp-dle'), auto = C.le === 'slatauto';
    if (sl.disabled !== auto) sl.disabled = auto;
    if (auto && Math.abs(+sl.value - C.dle) > 0.4) { sl.value = Math.round(C.dle); sl.dispatchEvent(new Event('input')); }
    const key = JSON.stringify(C);
    if (key !== cache.key) { cache = { key, ...computeFlow(C, M) }; }
    phase += dt;
    clear(st, PAL.sky);
    const sc = st.w * 0.36, ox = st.w * 0.3, oy = st.h * 0.5;
    const X = x => ox + x * sc, Y = y => oy - y * sc;
    const sepS = clamp((C.a - (M.aS - 3)) / 9, 0, 1), xsep = 1 - 0.95 * sepS;
    const sepX = X(Math.cos(cache.a) * xsep);
    // líneas de corriente
    cache.lines.forEach(L => {
      const turb = L.over && sepS > 0;
      c.save(); c.lineWidth = 1.2; c.strokeStyle = alpha(PAL.muted, 0.45);
      c.beginPath(); let started = false;
      L.pts.forEach(p => {
        let px = X(p[0]), py = Y(p[1]);
        if (turb && px > sepX) { const k = clamp((px - sepX) / (st.w * 0.3), 0, 1) * sepS; const amp = (0.6 - Math.min(L.gap, 0.4)) * sc * 0.35 * k; py -= amp * (0.8 + 0.6 * Math.sin(p[0] * 9 + phase * 6 + L.y0 * 20)); }
        if (!started) { c.moveTo(px, py); started = true; } else c.lineTo(px, py);
      });
      c.stroke(); c.restore();
      // partículas
      const n = Math.max(3, Math.round(L.T / 0.22));
      for (let k = 0; k < n; k++) {
        const tt = ((phase * 0.55 + k * L.T / n) % L.T);
        let lo = 0, hi = L.pts.length - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (L.pts[mid][3] < tt) lo = mid; else hi = mid; }
        const p = L.pts[hi]; let px = X(p[0]), py = Y(p[1]);
        let col = mix(PAL.muted, PAL.accent, clamp((p[2] - 0.85) / 0.7, 0, 1));
        if (turb && px > sepX) { const kk = clamp((px - sepX) / (st.w * 0.3), 0, 1) * sepS; py -= (0.6 - Math.min(L.gap, 0.4)) * sc * 0.35 * kk * (0.8 + 0.6 * Math.sin(p[0] * 9 + phase * 6 + L.y0 * 20)) + Math.sin(phase * 13 + k) * 4 * kk; col = PAL.warm; }
        dot(c, px, py, 2.1, col);
      }
    });
    // zona despegada
    if (sepS > 0) {
      c.save(); c.globalAlpha = 0.18 * sepS; c.fillStyle = PAL.warm;
      c.beginPath(); c.ellipse(sepX + st.w * 0.18, Y(-Math.sin(cache.a) * 0.9) - sc * 0.12 * sepS, st.w * 0.22, sc * 0.14 * (0.4 + sepS), 0, 0, Math.PI * 2); c.fill(); c.restore();
    }
    // cuerpos
    cache.bodiesW.forEach(bd => {
      c.save();
      if (bd.kind === 'plate') { c.strokeStyle = bd === cache.bodiesW[0] ? PAL.ink : PAL.accent; c.lineWidth = 3.5; c.lineCap = 'round'; poly(c, bd.pts.map(p => [X(p[0]), Y(p[1])])); c.stroke(); }
      else { c.fillStyle = bd.kind === 'main' ? PAL.ink : PAL.accent; poly(c, bd.pts.map(p => [X(p[0]), Y(p[1])]), true); c.fill(); }
      c.restore();
    });
    // fuerzas
    const cl = M.cl(C.a), cd = M.cd(C.a);
    const qx = X(0.25 * Math.cos(cache.a)), qy = Y(-0.25 * Math.sin(cache.a));
    const Lp = Math.min(cl * sc * 0.19, st.h * 0.4);
    arrow(c, qx, qy, qx, qy - Lp, PAL.good, 3, 10);
    txt(c, `L  CL=${fmt(cl, 2)}`, qx + 6, qy - Lp + 4, { color: PAL.good, weight: 700, bg: alpha(PAL.sky, 0.8) });
    arrow(c, qx, qy, qx + cd * sc * 3, qy, PAL.bad, 3, 9);
    txt(c, 'D (×3)', qx + cd * sc * 3 + 4, qy + 14, { color: PAL.bad, size: 10 });
    txt(c, `viento relativo →`, 10, 18, { color: PAL.muted, weight: 600, bg: alpha(PAL.sky, 0.85) });
    txt(c, `α = ${fmt(C.a, 1)}°`, 10, 36, { color: PAL.ink, weight: 700, bg: alpha(PAL.sky, 0.85) });
    if (sepS > 0.05) txt(c, C.a > M.aS ? 'PÉRDIDA: flujo despegado' : 'Empieza a despegarse el flujo', st.w - 10, 18, { align: 'right', color: PAL.warm, weight: 700 });
    // UI
    $('#hp-cl-v').textContent = fmt(cl, 2); $('#hp-clmax-v').textContent = fmt(M.CLmax, 2); $('#hp-as-v').textContent = fmt(M.aS, 1) + '°'; $('#hp-cd-v').textContent = fmt(cd, 3);
    const M0 = HP.model({ a: C.a, te: 'none', dte: 0, le: 'none', dle: 0 });
    const s = $('#hp-status');
    if (C.a > M.aS) { s.className = 'status bad'; s.textContent = `En pérdida: superaste α = ${fmt(M.aS, 1)}°. El CL cae y la resistencia se dispara.`; }
    else if (C.te === 'none' && C.le === 'none') { s.className = 'status'; s.textContent = 'Perfil limpio. Elegí un flap para comparar con la curva gris.'; }
    else { s.className = 'status good'; s.textContent = (C.le === 'slatauto' ? (C.dle < 0.5 ? `Slat automático cerrado: a α = ${fmt(C.a, 1)}° la succión en la nariz no alcanza para abrirlo. Subí el ángulo de ataque. ` : `Slat automático ${C.dle >= 24.5 ? 'totalmente abierto' : 'abriéndose'} por la succión en la nariz (α = ${fmt(C.a, 1)}°). `) : '') + `CLmáx ${fmt(M0.CLmax, 2)} → ${fmt(M.CLmax, 2)} (+${fmt((M.CLmax / M0.CLmax - 1) * 100, 0)} %). α de pérdida ${fmt(M0.aS, 1)}° → ${fmt(M.aS, 1)}°.`; }
  }

  function drawCL() {
    const st = clc, c = st.ctx; if (!st.w || !st.dirty) return; st.dirty = false;
    const C = cfg(), M = HP.model(C), M0 = HP.model({ a: 0, te: 'none', dte: 0, le: 'none', dle: 0 });
    clear(st, PAL.sky);
    const b = { x: 44, y: 22, w: st.w - 60, h: st.h - 56 };
    const f = plotFrame(c, b, [-8, 26], [-0.6, 3.4], { xl: 'α [°]', yl: 'CL', yd: 1 });
    const pts = m => { const a = []; for (let x = -8; x <= 26; x += 0.25) a.push([x, C.le === 'slatauto' && m !== M0 ? HP.model({ ...C, a: x, dle: autoSlat(x) }).cl(x) : m.cl(x)]); return a; };
    curve(c, pts(M0), f.sx, f.sy, PAL.muted, 2, [5, 4]);
    curve(c, pts(M), f.sx, f.sy, PAL.accent, 2.6);
    [[M0, PAL.muted], [M, PAL.accent]].forEach(([m, col], i) => { const x = f.sx(m.aS), y = f.sy(m.CLmax); dot(c, x, y, 3.5, col); txt(c, `CLmáx ${fmt(m.CLmax, 2)}`, x + 6, y - 6 - i * 0, { color: col, size: 10, weight: 600 }); });
    const a0 = -M.dCL / M.slope - 2; if (a0 > -8) { dot(c, f.sx(a0), f.sy(0), 3, PAL.accent); txt(c, `α₀=${fmt(a0, 1)}°`, f.sx(a0) + 4, f.sy(0) + 13, { color: PAL.accent, size: 10 }); }
    dot(c, f.sx(C.a), f.sy(M.cl(C.a)), 5.5, PAL.warm, PAL.sky);
  }

  /* ---- polar y punto de transición ---- */
  const W = 5000 * G0, S = 30, RHO = 1.225;
  const P = { cd0: 0.025, k: 0.045, dcd: 0.035, d: 0.7, clmc: 1.5, clmf: 2.3 };
  const cdClean = cl => P.cd0 + P.k * cl * cl, cdFlap = cl => P.cd0 + P.dcd + P.k * (cl - P.d) ** 2;
  const CLM = (P.dcd + P.k * P.d * P.d) / (2 * P.k * P.d);
  const vFor = cl => Math.sqrt(2 * W / (RHO * S * cl)) * 3.6;
  function drawPolar() {
    const st = pol, c = st.ctx; if (!st.w || !st.dirty) return; st.dirty = false;
    clear(st, PAL.sky);
    const V = val('hp-v') / 3.6, CL = 2 * W / (RHO * V * V * S);
    const b = { x: 44, y: 22, w: st.w - 62, h: st.h - 56 };
    const f = plotFrame(c, b, [0, 0.3], [0, 2.5], { xl: 'CD', yl: 'CL', xd: 2, yd: 1 });
    const cc = [], cf = []; for (let cl = 0; cl <= P.clmc; cl += 0.02) cc.push([cdClean(cl), cl]); for (let cl = 0; cl <= P.clmf; cl += 0.02) cf.push([cdFlap(cl), cl]);
    curve(c, cc, f.sx, f.sy, PAL.muted, 2.4); curve(c, cf, f.sx, f.sy, PAL.accent, 2.4);
    txt(c, 'sin flaps', f.sx(cdClean(1.45)) + 4, f.sy(1.45), { color: PAL.muted, size: 10, weight: 600 });
    txt(c, 'con flaps', f.sx(cdFlap(2.25)) - 4, f.sy(2.25), { color: PAL.accent, size: 10, weight: 600, align: 'right' });
    const mx = f.sx(cdClean(CLM)), my = f.sy(CLM); dot(c, mx, my, 5, PAL.ink); txt(c, 'M', mx - 14, my - 6, { weight: 700, size: 13 });
    // línea horizontal del CL actual
    c.save(); c.strokeStyle = alpha(PAL.warm, 0.6); c.setLineDash([4, 4]); line(c, b.x, f.sy(Math.min(CL, 2.5)), b.x + b.w, f.sy(Math.min(CL, 2.5))); c.restore();
    const low = V * 3.6 < vFor(CLM);
    const nIn = low ? "A'" : "B'", nOut = low ? 'A' : 'B';
    if (CL <= P.clmf) { const x = f.sx(cdFlap(CL)), y = f.sy(CL); dot(c, x, y, flapsOut ? 7 : 5, flapsOut ? PAL.warm : PAL.accent, PAL.sky); txt(c, nOut, x - 9, y - 6, { weight: 700, size: 13, color: PAL.accent, align: 'right' }); }
    if (CL <= P.clmc) { const x = f.sx(cdClean(CL)), y = f.sy(CL); dot(c, x, y, !flapsOut ? 7 : 5, !flapsOut ? PAL.warm : PAL.muted, PAL.sky); txt(c, nIn, x + 10, y - 6, { weight: 700, size: 13, color: PAL.muted }); }
    if (CL <= P.clmc && CL <= P.clmf) { const x1 = f.sx(flapsOut ? cdFlap(CL) : cdClean(CL)), x2 = f.sx(flapsOut ? cdClean(CL) : cdFlap(CL)); txt(c, (x2 < x1 ? '← ' : '') + (flapsOut ? 'si metés flaps' : 'si sacás flaps') + (x2 >= x1 ? ' →' : ''), (x1 + x2) / 2, f.sy(CL) + 16, { align: 'center', size: 9.5, color: PAL.warm }); }
    // UI
    const Dout = CL <= P.clmf ? W * cdFlap(CL) / CL : NaN, Din = CL <= P.clmc ? W * cdClean(CL) / CL : NaN;
    $('#hp-clreq').textContent = fmt(CL, 2); $('#hp-dout').textContent = Number.isFinite(Dout) ? fmt(Dout, 0) + ' N' : 'pérdida'; $('#hp-din').textContent = Number.isFinite(Din) ? fmt(Din, 0) + ' N' : 'pérdida'; $('#hp-vm').textContent = fmt(vFor(CLM), 0) + ' km/h';
    $('#hp-toggle').textContent = flapsOut ? 'Meter flaps' : 'Sacar flaps';
    const s = $('#hp-pstatus');
    const cur = flapsOut ? Dout : Din;
    if (!Number.isFinite(cur)) { s.className = 'status bad'; s.textContent = `Con flaps ${flapsOut ? 'fuera' : 'dentro'} el avión no puede dar CL = ${fmt(CL, 2)}: entra en pérdida (V de pérdida limpia ≈ ${fmt(vFor(P.clmc), 0)} km/h).`; }
    else if (!Number.isFinite(Din) || !Number.isFinite(Dout)) { s.className = 'status warn'; s.textContent = 'A esta velocidad solo se puede volar con flaps fuera.'; }
    else { const better = Dout < Din ? 'fuera' : 'dentro'; const now = flapsOut ? 'fuera' : 'dentro'; s.className = 'status ' + (better === now ? 'good' : 'bad'); s.textContent = better === now ? `Bien: con flaps ${now} la resistencia es la menor posible a esta velocidad.` : `Con flaps ${now} tenés ${fmt(Math.abs(Dout - Din), 0)} N más de resistencia que con flaps ${better}. ${low ? 'Estás por debajo de M: dejalos fuera.' : 'Estás por encima de M: metelos.'}`; }
  }
  function drawDrag() {
    const st = drg, c = st.ctx; if (!st.w || !st.dirty) return; st.dirty = false;
    clear(st, PAL.sky);
    const b = { x: 54, y: 22, w: st.w - 72, h: st.h - 56 };
    const f = plotFrame(c, b, [120, 320], [0, 9000], { xl: 'V [km/h]', yl: 'Resistencia D [N]', yf: v => fmt(v / 1000, 0) + 'k' });
    const a1 = [], a2 = [];
    for (let v = 120; v <= 320; v += 2) { const CL = 2 * W / (RHO * (v / 3.6) ** 2 * S); a1.push([v, CL <= P.clmc ? W * cdClean(CL) / CL : NaN]); a2.push([v, CL <= P.clmf ? W * cdFlap(CL) / CL : NaN]); }
    curve(c, a1, f.sx, f.sy, PAL.muted, 2.4); curve(c, a2, f.sx, f.sy, PAL.accent, 2.4);
    const vm = vFor(CLM); c.save(); c.strokeStyle = PAL.ink; c.setLineDash([3, 4]); line(c, f.sx(vm), b.y, f.sx(vm), b.y + b.h); c.restore();
    txt(c, `M = ${fmt(vm, 0)} km/h`, f.sx(vm) + 4, b.y + 12, { weight: 700 });
    txt(c, '← flaps fuera conviene', f.sx(vm) - 4, b.y + b.h - 8, { align: 'right', size: 10, color: PAL.accent });
    txt(c, 'flaps dentro conviene →', f.sx(vm) + 4, b.y + b.h - 8, { size: 10, color: PAL.muted });
    const v = val('hp-v'); const CL = 2 * W / (RHO * (v / 3.6) ** 2 * S); const D = flapsOut ? (CL <= P.clmf ? W * cdFlap(CL) / CL : NaN) : (CL <= P.clmc ? W * cdClean(CL) / CL : NaN);
    c.save(); c.strokeStyle = PAL.warm; line(c, f.sx(v), b.y, f.sx(v), b.y + b.h); c.restore();
    if (Number.isFinite(D)) dot(c, f.sx(v), f.sy(Math.min(D, 9000)), 6, PAL.warm, PAL.sky);
  }
  return {
    init() {
      flow = makeCanvas('hp-flow', 0.56); clc = makeCanvas('hp-cl', 0.6); pol = makeCanvas('hp-polar', 0.66); drg = makeCanvas('hp-drag', 0.55);
      ['hp-a', 'hp-dte', 'hp-dle'].forEach(id => $('#' + id).addEventListener('input', () => clc.dirty = true));
      ['hp-le', 'hp-te'].forEach(n => $(`.seg[data-name="${n}"]`).addEventListener('change', () => clc.dirty = true));
      $('#hp-v').addEventListener('input', () => { pol.dirty = drg.dirty = true; });
      $('#hp-toggle').addEventListener('click', () => { flapsOut = !flapsOut; pol.dirty = drg.dirty = true; });
    },
    frame(dt) {
      if (this.dirty) { [clc, pol, drg].forEach(s => s.dirty = true); this.dirty = false; }
      const sub = $('#p-hiper').dataset.sub;
      if (sub === 'perfil') { drawFlow(dt); drawCL(); } else { drawPolar(); drawDrag(); }
    }
  };
})());
