/* ===== Dibujos compartidos de avión ===== */
function planeSide(c, cx, cy, L, pitch, o = {}) {
  c.save(); c.translate(cx, cy); c.rotate(-pitch);
  const s = L / 100;
  c.fillStyle = o.body || PAL.ink;
  // fuselaje
  c.beginPath(); c.moveTo(-50 * s, 0); c.quadraticCurveTo(-50 * s, -6 * s, -42 * s, -6 * s); c.lineTo(30 * s, -6 * s); c.lineTo(48 * s, -3 * s); c.lineTo(50 * s, -1 * s); c.lineTo(30 * s, 5 * s); c.lineTo(-42 * s, 5 * s); c.quadraticCurveTo(-50 * s, 5 * s, -50 * s, 0); c.fill();
  // deriva
  c.beginPath(); c.moveTo(30 * s, -6 * s); c.lineTo(44 * s, -24 * s); c.lineTo(50 * s, -24 * s); c.lineTo(48 * s, -3 * s); c.fill();
  // ala (vista lateral: perfil)
  c.fillStyle = o.wing || PAL.metal;
  c.beginPath(); c.ellipse(-4 * s, 3 * s, 14 * s, 2.2 * s, 0, 0, Math.PI * 2); c.fill();
  if (o.spoiler) { c.strokeStyle = o.spColor || PAL.warm; c.lineWidth = Math.max(2, 1.6 * s); c.lineCap = 'round'; const a = o.spoiler; line(c, 0, 1.2 * s, 0 + 6 * s * Math.cos(a), 1.2 * s - 6 * s * Math.sin(a)); }
  if (o.elev !== undefined) { c.strokeStyle = o.elevColor || PAL.accent; c.lineWidth = Math.max(2, 1.5 * s); line(c, 44 * s, -2 * s, 44 * s + 7 * s * Math.cos(o.elev), -2 * s + 7 * s * Math.sin(o.elev)); }
  c.restore();
}
function planeFront(c, cx, cy, span, bank, o = {}) {
  c.save(); c.translate(cx, cy); c.rotate(bank);
  const s = span / 100, dih = 4 * D2R;
  c.strokeStyle = o.wing || PAL.metal; c.lineWidth = Math.max(3, 2.4 * s); c.lineCap = 'round';
  line(c, 0, 2 * s, -50 * s * Math.cos(dih), 2 * s - 50 * s * Math.sin(dih));
  line(c, 0, 2 * s, 50 * s * Math.cos(dih), 2 * s - 50 * s * Math.sin(dih));
  c.fillStyle = o.body || PAL.ink; c.beginPath(); c.arc(0, 0, 6 * s, 0, Math.PI * 2); c.fill();
  c.fillRect(-1.2 * s, -22 * s, 2.4 * s, 20 * s);
  if (o.hs !== false) { c.lineWidth = Math.max(2, 1.6 * s); c.strokeStyle = o.body || PAL.ink; line(c, -16 * s, -3 * s, 16 * s, -3 * s); }
  if (o.spL || o.spR) {
    c.strokeStyle = PAL.warm; c.lineWidth = Math.max(2.5, 1.8 * s);
    [[-1, o.spL || 0], [1, o.spR || 0]].forEach(([sd, a]) => { const x = sd * 28 * s, y = 2 * s - 28 * s * Math.sin(dih) - 1.5 * s; line(c, x - sd * 4 * s, y, x - sd * 4 * s + sd * 7 * s * Math.cos(a) * 0.4, y - 7 * s * Math.sin(a)); line(c, x + sd * 4 * s, y, x + sd * 4 * s + sd * 7 * s * Math.cos(a) * 0.4, y - 7 * s * Math.sin(a)); });
  }
  c.restore();
}
function planeTopSimple(c, cx, cy, L, heading, o = {}) {
  c.save(); c.translate(cx, cy); c.rotate(heading);
  const s = L / 100; c.fillStyle = o.body || PAL.ink;
  c.beginPath(); c.ellipse(0, 0, 50 * s, 5 * s, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = o.wing || PAL.metal;
  c.beginPath(); c.moveTo(8 * s, 0); c.lineTo(-14 * s, -46 * s); c.lineTo(-22 * s, -46 * s); c.lineTo(-12 * s, 0); c.lineTo(-22 * s, 46 * s); c.lineTo(-14 * s, 46 * s); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(-38 * s, 0); c.lineTo(-46 * s, -16 * s); c.lineTo(-50 * s, -16 * s); c.lineTo(-48 * s, 0); c.lineTo(-50 * s, 16 * s); c.lineTo(-46 * s, 16 * s); c.closePath(); c.fill();
  if (o.spoilers) { c.fillStyle = PAL.warm; for (let i = 0; i < 4; i++) { c.fillRect(-15 * s - i * 1.2 * s, -12 * s - i * 7 * s, 4 * s, 5 * s); c.fillRect(-15 * s - i * 1.2 * s, 7 * s + i * 7 * s, 4 * s, 5 * s); } }
  c.restore();
}

/* ===== Spoilers ===== */
register('spoil', (() => {
  let sec, view, pad, phi = 0, p = 0, V = 150, t = 0;
  const lanes = [{ name: 'Sin spoilers', sp: false }, { name: 'Con spoilers a 60°', sp: true }];
  let landing = null;
  const sEff = d => Math.sin(clamp(d / 60, 0, 1) * Math.PI / 2);
  const CLs = d => 0.6 * (1 - 0.85 * sEff(d)), CDs = d => 0.02 + 0.13 * sEff(d) ** 2;
  function currentDeflection() {
    const m = seg('sp-mode');
    if (m === 'roll') return Math.max(0, pad.x) * 35;
    if (m === 'flight') return val('sp-d');
    return landing && landing.t > 0.5 ? 60 : 0;
  }
  function drawSection(d) {
    const st = sec, c = st.ctx; if (!st.w) return;
    clear(st, PAL.sky);
    const sc = st.w * 0.5, ox = st.w * 0.22, oy = st.h * 0.58, a = 3 * D2R;
    const W = q => { const r = rot(q, 0, 0, -a); return [ox + r[0] * sc, oy - r[1] * sc]; };
    const body = airfoilPart(0, 1, 40).map(W);
    const hx = 0.62, hu = naca(0.02, 0.4, 0.12, hx); const hinge = [hu.xu, hu.yu];
    const tip = rot([hinge[0] + 0.15, hinge[1] - 0.005], hinge[0], hinge[1], d * D2R); const tipW = W(tip), hingeW = W(hinge);
    const s = sEff(d);
    // líneas de flujo sobre el extradós
    for (let k = 0; k < 5; k++) {
      const off = 0.03 + k * 0.045; c.save(); c.strokeStyle = alpha(PAL.muted, 0.6); c.lineWidth = 1.3; c.beginPath();
      for (let i = 0; i <= 60; i++) {
        const x = -0.2 + i * 1.5 / 60; let y;
        if (x < 0) y = off + x * 0.04; else if (x <= 1) { const u = naca(0.02, 0.4, 0.12, x); y = u.yu + off; } else y = off + naca(0.02, 0.4, 0.12, 1).yu - (x - 1) * 0.05;
        const bump = Math.max(0, (tip[1] - hinge[1]) + 0.02 - off) * Math.exp(-((x - hx - 0.1) ** 2) / 0.02);
        y += bump * 1.1;
        if (x > hx + 0.15 && s > 0.05) y += Math.sin(x * 30 + t * 8 + k) * 0.012 * s * (1 - k / 5);
        const P = W([x, y]); if (i === 0) c.moveTo(P[0], P[1]); else c.lineTo(P[0], P[1]);
      }
      c.stroke(); c.restore();
    }
    if (s > 0.05) { c.save(); c.globalAlpha = 0.22 + 0.2 * s; c.fillStyle = PAL.warm; const cpt = W([hx + 0.42, hu.yu + 0.04 * (1 + s)]); c.beginPath(); c.ellipse(cpt[0], cpt[1], sc * 0.33, sc * 0.05 * (1 + 2 * s), -a, 0, Math.PI * 2); c.fill(); c.restore(); txt(c, 'flujo despegado', W([hx + 0.45, hu.yu + 0.13 * (1 + s)])[0], W([hx + 0.45, hu.yu + 0.13 * (1 + s)])[1], { color: PAL.warm, size: 10, weight: 600, align: 'center' }); }
    c.fillStyle = PAL.ink; poly(c, body, true); c.fill();
    c.strokeStyle = PAL.warm; c.lineWidth = 4; c.lineCap = 'round'; line(c, hingeW[0], hingeW[1], tipW[0], tipW[1]);
    const qc = W([0.3, 0]);
    const L = CLs(d) / 0.6, D = CDs(d) / 0.02;
    arrow(c, qc[0], qc[1], qc[0], qc[1] - L * st.h * 0.35, PAL.good, 3, 10);
    txt(c, `L ${fmt(L * 100, 0)} %`, qc[0] + 6, qc[1] - L * st.h * 0.35 + 6, { color: PAL.good, weight: 700 });
    arrow(c, qc[0], qc[1], qc[0] + Math.min(D, 8) * st.w * 0.05, qc[1], PAL.bad, 3, 9);
    txt(c, `D ×${fmt(D, 1)}`, qc[0] + Math.min(D, 8) * st.w * 0.05 + 4, qc[1] + 15, { color: PAL.bad, weight: 700 });
    txt(c, 'Corte del ala en el tramo del spoiler', 10, 18, { color: PAL.muted, weight: 600 });
    $('#sp-d-v').textContent = fmt(d, 0) + '°'; $('#sp-l-v').textContent = fmt(L * 100, 0) + ' %'; $('#sp-dr-v').textContent = '×' + fmt(D, 1);
  }
  function drawRoll(dt) {
    const st = view, c = st.ctx; if (!st.w) return;
    const x = pad.x; p += (3.2 * x - 2.2 * p) * dt; phi = clamp(phi + p * dt, -1.2, 1.2);
    if (Math.abs(x) < 0.02) phi *= Math.exp(-dt * 0.15);
    clear(st, PAL.sky);
    const cx = st.w / 2, cy = st.h * 0.55;
    c.save(); c.translate(cx, cy); c.rotate(-phi * 0); c.restore();
    // horizonte fijo
    c.strokeStyle = PAL.line; c.lineWidth = 1; line(c, 0, cy + st.h * 0.3, st.w, cy + st.h * 0.3);
    const spR = Math.max(0, x) * 35 * D2R, spL = Math.max(0, -x) * 35 * D2R;
    planeFront(c, cx, cy, st.w * 0.7, phi, { spL, spR });
    // fuerzas de sustentación por semiala (girando con el avión)
    const LL = 1 - 0.45 * sEff(spL * R2D), LR = 1 - 0.45 * sEff(spR * R2D);
    [[-1, LL], [1, LR]].forEach(([sd, Lw]) => { const r = rot([cx + sd * st.w * 0.2, cy], cx, cy, phi); const a = rot([r[0], r[1] - Lw * st.h * 0.3], r[0], r[1], phi); arrow(c, r[0], r[1], a[0], a[1], PAL.good, 3, 9); txt(c, `L ${fmt(Lw * 100, 0)}%`, a[0], a[1] - 6, { align: 'center', color: PAL.good, weight: 600, size: 10 }); });
    txt(c, 'Vista desde atrás', 10, 18, { color: PAL.muted, weight: 600 });
    txt(c, `Alabeo ${fmt(phi * R2D, 0)}°`, st.w - 10, 18, { align: 'right', weight: 700 });
    const s = $('#sp-status');
    if (Math.abs(x) > 0.05) { const side = x > 0 ? 'derecha' : 'izquierda'; s.className = 'status good'; s.textContent = `Spoiler ${side} arriba → el ala ${side} pierde sustentación → el avión rola a la ${side}.`; }
    else { s.className = 'status'; s.textContent = 'Palanca al centro: los dos spoilers abajo, las dos alas sustentan igual. El avión mantiene el alabeo que tenía.'; }
  }
  function drawFlight(dt) {
    const st = view, c = st.ctx; if (!st.w) return;
    const d = val('sp-d'); const m = 60000, S = 122, rho = 0.9;
    const q = 0.5 * rho * V * V; const CL = m * G0 / (q * S) / (1 - 0.35 * sEff(d));
    const D = q * S * (0.024 + 0.04 * CL * CL + 0.05 * sEff(d) ** 2);
    V = Math.max(60, V + (12000 - D) / m * dt * 3);
    clear(st, PAL.sky);
    t += dt;
    for (let i = 0; i < 6; i++) { const xx = ((i * st.w / 5 - t * V * 0.6) % (st.w + 60) + st.w + 60) % (st.w + 60) - 30; c.fillStyle = alpha(PAL.muted, 0.18); c.beginPath(); c.ellipse(xx, st.h * (0.2 + 0.12 * (i % 3)), 26, 7, 0, 0, Math.PI * 2); c.fill(); }
    planeSide(c, st.w * 0.45, st.h * 0.55, st.w * 0.55, 0.03, { spoiler: d * D2R });
    arrow(c, st.w * 0.45 + st.w * 0.3, st.h * 0.55, st.w * 0.45 + st.w * 0.3 + Math.min(D / 1500, st.w * 0.2), st.h * 0.55, PAL.bad, 3, 9);
    txt(c, `D = ${fmt(D / 1000, 1)} kN`, st.w - 10, st.h * 0.55 - 12, { align: 'right', color: PAL.bad, weight: 700 });
    txt(c, `V = ${fmt(V * 3.6, 0)} km/h`, 10, 20, { weight: 700, size: 14 });
    txt(c, `desaceleración ${fmt(Math.max(0, (D - 12000) / m), 2)} m/s²`, 10, 38, { color: PAL.muted });
    const s = $('#sp-status');
    if (d > 45) { s.className = 'status warn'; s.textContent = 'Los ángulos mayores se reservan para tierra. En vuelo los aerofrenos usan posiciones intermedias.'; }
    else if (d > 2) { s.className = 'status good'; s.textContent = `Aerofreno en vuelo: la resistencia sube a ${fmt(D / 1000, 0)} kN y el avión desacelera con motores en ralentí.`; }
    else { s.className = 'status'; s.textContent = 'Spoilers abajo: el avión pierde velocidad muy despacio (solo resistencia de forma e inducida).'; }
  }
  function startLanding() {
    landing = { t: 0, lanes: lanes.map(l => ({ ...l, x: 0, v: 70, done: false })) };
  }
  function stepLanding(dt) {
    if (!landing) return;
    landing.t += dt;
    const m = 60000, S = 122, rho = 1.225, W = m * G0, mu = 0.4;
    landing.lanes.forEach(L => {
      if (L.done) return;
      const dep = L.sp && landing.t > 0.5; const q = 0.5 * rho * L.v * L.v;
      const CL = dep ? 0.12 : 0.9, CD = dep ? 0.2 : 0.1;
      const Lift = q * S * CL, N = Math.max(0, W - Lift), Fb = mu * N, Dr = q * S * CD;
      L.N = N / W;
      const a = (Fb + Dr) / m; L.v -= a * dt; L.x += L.v * dt;
      if (L.v <= 0.5) { L.v = 0; L.done = true; }
    });
  }
  function drawGround(dt) {
    const st = view, c = st.ctx; if (!st.w) return;
    for (let i = 0; i < 4; i++) stepLanding(dt * 0.5);
    clear(st, PAL.sky);
    const x0 = 30, x1 = st.w - 20, sc = (x1 - x0) / 1600;
    c.font = `10px ${MONO}`;
    for (let m = 0; m <= 1600; m += 200) { const X = x0 + m * sc; c.strokeStyle = PAL.line; line(c, X, 24, X, st.h - 18); txt(c, `${m} m`, X, st.h - 5, { align: 'center', color: PAL.muted, size: 9.5 }); }
    const laneH = (st.h - 50) / 2;
    lanes.forEach((ln, i) => {
      const y = 30 + i * laneH + laneH / 2; c.fillStyle = alpha(PAL.muted, 0.15); c.fillRect(x0, y - laneH * 0.32, x1 - x0, laneH * 0.64);
      c.strokeStyle = PAL.surface; c.setLineDash([10, 10]); line(c, x0, y, x1, y); c.setLineDash([]);
      const L = landing ? landing.lanes[i] : { x: 0, v: 70, done: false, N: 0 };
      planeTopSimple(c, x0 + L.x * sc, y, Math.min(laneH * 0.6, 60), 0, { spoilers: ln.sp && landing && landing.t > 0.5 });
      txt(c, ln.name, x0 + 4, y - laneH * 0.36, { weight: 700, size: 11, color: ln.sp ? PAL.warm : PAL.ink });
      txt(c, landing ? `${fmt(L.x, 0)} m · ${fmt(L.v * 3.6, 0)} km/h · peso en ruedas ${fmt((L.N || 0) * 100, 0)} %` : 'listo', x1, y - laneH * 0.36, { align: 'right', size: 10, color: PAL.muted });
    });
    const s = $('#sp-status');
    if (!landing) { s.className = 'status'; s.textContent = 'Apretá "Aterrizar los dos aviones" para comparar la carrera de aterrizaje.'; }
    else if (landing.lanes.every(l => l.done)) { const [a, b] = landing.lanes; s.className = 'status good'; s.textContent = `Sin spoilers: ${fmt(a.x, 0)} m. Con spoilers: ${fmt(b.x, 0)} m. Los spoilers acortaron la carrera un ${fmt((1 - b.x / a.x) * 100, 0)} % (sin reversores, solo frenos de rueda).`; }
    else { s.className = 'status warn'; s.textContent = 'Frenando… mirá cuánto peso apoya sobre las ruedas en cada avión.'; }
  }
  return {
    init() {
      sec = makeCanvas('sp-sec', 0.45); view = makeCanvas('sp-view', 0.5); pad = makePad($('#sp-pad'));
      const modeUI = () => { const m = seg('sp-mode'); $('#sp-roll-ui').hidden = m !== 'roll'; $('#sp-flight-ui').hidden = m !== 'flight'; $('#sp-ground-ui').hidden = m !== 'ground'; canvases.forEach(c => c.fit()); };
      $('.seg[data-name="sp-mode"]').addEventListener('change', modeUI); modeUI();
      $('#sp-reset').addEventListener('click', () => { V = 150; });
      $('#sp-land').addEventListener('click', startLanding);
    },
    frame(dt) {
      t += dt; pad.tick(dt);
      drawSection(currentDeflection());
      const m = seg('sp-mode');
      if (m === 'roll') drawRoll(dt); else if (m === 'flight') drawFlight(dt); else drawGround(dt);
    }
  };
})());
