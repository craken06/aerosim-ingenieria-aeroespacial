/* ===== Estructura del ala ===== */
register('ala', (() => {
  let plan, sec, bend, diag, sub = '';
  const INFO = {
    all: ['Estructura completa', '', 'Elegí un componente para resaltarlo en la planta y en el corte. Así está armada un ala de construcción metálica clásica: dos largueros, costillas cada cierta distancia, larguerillos que corren a lo largo y el revestimiento que lo cubre todo.'],
    larguero: ['Larguero (spar)', 'Principal', 'Viga que se extiende a lo largo del ala, de la raíz a la puntera. Es el componente principal de soporte: toma los esfuerzos de flexión (la sustentación lo dobla hacia arriba) y de torsión. Tiene forma de doble T: alas (cordones) arriba y abajo que toman tracción y compresión, y un alma vertical que toma el corte. En el corte de abajo lo ves de frente.'],
    costilla: ['Costilla maestra (rib)', 'Principal', 'Pieza que va del borde de ataque al de fuga. Da la forma del perfil y transmite la carga del revestimiento a los largueros. Las maestras están en los puntos de carga concentrada: unión con el fuselaje, motores, tren, apoyos de alerones y flaps. Tienen agujeros de alivianamiento.'],
    revest: ['Revestimiento (sheath)', 'Principal', 'La "piel" de chapa del ala. Da y mantiene la forma aerodinámica, y como está remachado a largueros, costillas y larguerillos, colabora con la resistencia: forma junto con los largueros un cajón que es muy bueno para tomar torsión.'],
    herraje: ['Herrajes (fitting)', 'Principal', 'Piezas metálicas macizas que unen secciones del ala entre sí y el ala con el fuselaje. Por ellos pasa toda la carga del ala, así que de su cálculo depende buena parte de la resistencia estructural. Resisten esfuerzos, vibraciones y deflexiones.'],
    falsa: ['Falsas costillas', 'Secundario', 'Costillas cortas e intermedias, sobre todo en el borde de ataque, entre las costillas maestras. Su función es mantener la forma del perfil y sostener el revestimiento para que no se deforme; no transmiten las cargas grandes.'],
    larguerillo: ['Larguerillos (stringers)', 'Secundario', 'Perfiles livianos que corren a lo largo del ala pegados al revestimiento. Lo rigidizan para que no se abolle (pandee) en compresión y aportan algo a la flexión.'],
    refuerzo: ['Refuerzos', 'Secundario', 'Chapas o perfiles agregados donde hay aberturas o cambios de sección: alrededor de una tapa de inspección, de un pozo de tren, o donde se fija un apoyo. Recuperan la resistencia que se pierde al hacer el agujero.']
  };
  const span = 1, Cr = 0.34, Ct = 0.2;
  function geo(st) {
    const x0 = st.w * 0.07, x1 = st.w * 0.95, top = st.h * 0.14;
    const L = x1 - x0, cr = Math.min(st.h * 0.72, L * 0.42), ct = cr * Ct / Cr;
    const P = (s, u) => { const C = cr + (ct - cr) * s; const yle = top + s * cr * 0.12; return [x0 + s * L, yle + u * C]; };
    return { x0, x1, P };
  }
  function drawPlan(sel) {
    const st = plan, c = st.ctx; if (!st.w) return; clear(st, PAL.sky);
    const { P } = geo(st);
    const on = k => sel === 'all' || sel === k;
    const col = k => sel === k ? PAL.accent : sel === 'all' ? PAL.ink : alpha(PAL.muted, 0.35);
    const lw = (k, base) => sel === k ? base * 1.9 : base;
    // revestimiento
    c.save(); c.fillStyle = sel === 'revest' ? alpha(PAL.accent, 0.35) : alpha(PAL.metal, sel === 'all' ? 0.28 : 0.12);
    poly(c, [P(0, 0), P(1, 0), P(1, 1), P(0, 1)], true); c.fill(); c.strokeStyle = sel === 'revest' ? PAL.accent : PAL.muted; c.lineWidth = sel === 'revest' ? 3 : 1.4; c.stroke(); c.restore();
    c.lineCap = 'round';
    // larguerillos
    c.strokeStyle = col('larguerillo'); c.lineWidth = lw('larguerillo', 1.1);
    [0.08, 0.3, 0.42, 0.54, 0.76, 0.86].forEach(u => { const a = P(0, u), b = P(1, u); line(c, a[0], a[1], b[0], b[1]); });
    // falsas costillas (borde de ataque y entre maestras)
    c.strokeStyle = col('falsa'); c.lineWidth = lw('falsa', 1.4);
    for (let s = 0.0825; s < 1; s += 0.0825) { if ([0.33, 0.66].some(v => Math.abs(v - s) < 0.03)) continue; const a = P(s, 0), b = P(s, 0.18); line(c, a[0], a[1], b[0], b[1]); }
    // costillas maestras
    c.strokeStyle = col('costilla'); c.lineWidth = lw('costilla', 2.6);
    [0, 0.33, 0.66, 1].forEach(s => { const a = P(s, 0), b = P(s, 1); line(c, a[0], a[1], b[0], b[1]); });
    // largueros
    c.strokeStyle = col('larguero'); c.lineWidth = lw('larguero', 4);
    [0.18, 0.65].forEach(u => { const a = P(0, u), b = P(1, u); line(c, a[0], a[1], b[0], b[1]); });
    // refuerzo: tapa de inspección
    const h = P(0.5, 0.42); c.strokeStyle = col('refuerzo'); c.lineWidth = lw('refuerzo', 3); c.beginPath(); c.ellipse(h[0], h[1], 16, 9, 0, 0, Math.PI * 2); c.stroke();
    c.fillStyle = PAL.sky; c.beginPath(); c.ellipse(h[0], h[1], 10, 5, 0, 0, Math.PI * 2); c.fill();
    // herrajes de raíz
    c.fillStyle = col('herraje'); [0.18, 0.65].forEach(u => { const a = P(0, u); const s = sel === 'herraje' ? 1.4 : 1; c.fillRect(a[0] - 14 * s, a[1] - 8 * s, 18 * s, 16 * s); dot(c, a[0] - 8 * s, a[1], 3 * s, PAL.sky); });
    c.fillStyle = PAL.ink; c.fillRect(0, P(0, 0)[1] - 6, st.w * 0.045, P(0, 1)[1] - P(0, 0)[1] + 12);
    txt(c, 'fuselaje', 2, P(0, 1)[1] + 22, { size: 9.5, color: PAL.muted });
    txt(c, 'borde de ataque', P(0.55, 0)[0], P(0.55, 0)[1] - 6, { size: 9.5, color: PAL.muted });
    txt(c, 'borde de fuga', P(0.55, 1)[0], P(0.55, 1)[1] + 14, { size: 9.5, color: PAL.muted });
    txt(c, 'Planta de la semiala derecha', st.w - 8, st.h - 6, { align: 'right', size: 10, color: PAL.muted });
  }
  function drawSec(sel) {
    const st = sec, c = st.ctx; if (!st.w) return; clear(st, PAL.sky);
    const sc = st.w * 0.86, ox = st.w * 0.07, oy = st.h * 0.52;
    const X = x => ox + x * sc, Y = y => oy - y * sc * 1.35;
    const col = k => sel === k ? PAL.accent : sel === 'all' ? PAL.ink : alpha(PAL.muted, 0.35);
    const outline = airfoilPart(0, 1, 60, 0.02, 0.4, 0.15);
    // costilla (alma) con agujeros
    c.fillStyle = sel === 'costilla' ? alpha(PAL.accent, 0.35) : alpha(PAL.metal, sel === 'all' ? 0.35 : 0.12);
    poly(c, outline.map(p => [X(p[0]), Y(p[1])]), true); c.fill();
    [0.32, 0.45, 0.78].forEach(x => { const s = naca(0.02, 0.4, 0.15, x); c.fillStyle = PAL.sky; c.beginPath(); c.arc(X(x), Y((s.yu + s.yl) / 2), (s.yu - s.yl) * sc * 1.35 * 0.28, 0, Math.PI * 2); c.fill(); });
    // falsa costilla en la nariz
    if (sel === 'falsa') { c.fillStyle = alpha(PAL.accent, 0.45); poly(c, airfoilPart(0, 0.18, 20, 0.02, 0.4, 0.15).map(p => [X(p[0]), Y(p[1])]), true); c.fill(); }
    // revestimiento
    c.strokeStyle = col('revest'); c.lineWidth = sel === 'revest' ? 4 : 2; poly(c, outline.map(p => [X(p[0]), Y(p[1])]), true); c.stroke();
    // refuerzo (doble chapa inferior)
    c.strokeStyle = col('refuerzo'); c.lineWidth = sel === 'refuerzo' ? 6 : 3.5; c.beginPath(); for (let x = 0.36; x <= 0.5; x += 0.01) { const s = naca(0.02, 0.4, 0.15, x); const P = [X(s.xl), Y(s.yl) - 3]; if (x === 0.36) c.moveTo(P[0], P[1]); else c.lineTo(P[0], P[1]); } c.stroke();
    // larguerillos
    c.fillStyle = col('larguerillo');
    [0.08, 0.3, 0.42, 0.54, 0.76, 0.86].forEach(x => { const s = naca(0.02, 0.4, 0.15, x); const k = sel === 'larguerillo' ? 1.5 : 1; c.fillRect(X(s.xu) - 3 * k, Y(s.yu) + 2, 6 * k, 6 * k); c.fillRect(X(s.xl) - 3 * k, Y(s.yl) - 8 * k, 6 * k, 6 * k); });
    // largueros (doble T)
    [0.18, 0.65].forEach(x => { const s = naca(0.02, 0.4, 0.15, x); const k = sel === 'larguero' ? 1.6 : 1; c.fillStyle = col('larguero'); c.fillRect(X(x) - 2 * k, Y(s.yu), 4 * k, Y(s.yl) - Y(s.yu)); c.fillRect(X(x) - 9 * k, Y(s.yu) + 1, 18 * k, 5 * k); c.fillRect(X(x) - 9 * k, Y(s.yl) - 6 * k, 18 * k, 5 * k); });
    // herrajes
    if (sel === 'herraje' || sel === 'all') [0.18, 0.65].forEach(x => { const s = naca(0.02, 0.4, 0.15, x); c.fillStyle = col('herraje'); c.fillRect(X(x) + 4, (Y(s.yu) + Y(s.yl)) / 2 - 10, 14, 20); dot(c, X(x) + 11, (Y(s.yu) + Y(s.yl)) / 2, 3, PAL.sky); });
    txt(c, 'Corte del ala en la raíz', 8, 16, { size: 10, color: PAL.muted, weight: 600 });
  }
  function info(sel) {
    const [n, k, d] = INFO[sel];
    $('#ala-info').innerHTML = `<div class="row" style="justify-content:space-between"><h3 style="margin:0">${n}</h3>${k ? `<span class="chip ${k === 'Principal' ? 'p' : ''}">${k}</span>` : ''}</div><p style="margin:6px 0 0">${d}</p>`;
  }
  /* ---- carga ---- */
  const N = 60, B2 = 8, W = 5000 * G0, SIG_PER_G = 85;
  const ys = Array.from({ length: N + 1 }, (_, i) => B2 * i / N);
  const chord = y => 2.2 - 1.1 * y / B2;
  function loads(n) {
    const w0 = 2 * n * W / (Math.PI * B2), dy = B2 / N;
    const w = ys.map(y => w0 * Math.sqrt(Math.max(0, 1 - (y / B2) ** 2)));
    const V = new Array(N + 1).fill(0), M = new Array(N + 1).fill(0);
    for (let i = N - 1; i >= 0; i--) { V[i] = V[i + 1] + 0.5 * (w[i] + w[i + 1]) * dy; M[i] = M[i + 1] + 0.5 * (V[i] + V[i + 1]) * dy; }
    const th = new Array(N + 1).fill(0), d = new Array(N + 1).fill(0);
    for (let i = 1; i <= N; i++) { const k0 = M[i - 1] / (chord(ys[i - 1]) / 2.2) ** 3, k1 = M[i] / (chord(ys[i]) / 2.2) ** 3; th[i] = th[i - 1] + 0.5 * (k0 + k1) * dy; d[i] = d[i - 1] + 0.5 * (th[i - 1] + th[i]) * dy; }
    return { w, V, M, d };
  }
  const tipUnit = loads(1).d[N];
  function drawBend(dt) {
    const st = bend, c = st.ctx; if (!st.w) return; clear(st, PAL.sky);
    const n = val('ala-n'), ail = val('ala-t');
    const L = loads(n), M1root = loads(1).M[0];
    const defl = L.d.map(v => v / tipUnit * 0.22);
    const sig = ys.map((y, i) => SIG_PER_G * (L.M[i] / M1root) / (chord(y) / 2.2) ** 2);
    const sigMax = sig.reduce((a, b) => Math.abs(b) > Math.abs(a) ? b : a, 0);
    const x0 = st.w * 0.12, x1 = st.w * 0.95, sx = (x1 - x0) / B2, yb = st.h * 0.62, ex = 3 * sx;
    // fuselaje
    c.fillStyle = PAL.ink; c.beginPath(); c.arc(x0 - st.w * 0.04, yb, st.w * 0.07, 0, Math.PI * 2); c.fill();
    // sustentación
    if (Math.abs(n) > 0.05) for (let i = 2; i < N; i += 5) { const X = x0 + ys[i] * sx, Y = yb - defl[i] * ex; const len = Math.abs(L.w[i]) / (2 * 5.7 * W / (Math.PI * B2)) * st.h * 0.5; const sg = Math.sign(n); arrow(c, X, Y - sg * 6, X, Y - sg * (6 + len), PAL.good, 1.8, 6); }
    // larguero coloreado por tensión
    for (let i = 0; i < N; i++) { const t = Math.abs(sig[i]) / 483; c.strokeStyle = heatColor(t * 0.92); c.lineWidth = 10 - 5 * i / N; c.lineCap = 'round'; line(c, x0 + ys[i] * sx, yb - defl[i] * ex, x0 + ys[i + 1] * sx, yb - defl[i + 1] * ex); }
    c.save(); c.strokeStyle = alpha(PAL.muted, 0.6); c.setLineDash([4, 4]); line(c, x0, yb, x1, yb); c.restore();
    // puntera retorcida
    const tw = ail * 0.12; const ix = st.w * 0.78, iy = st.h * 0.15, isc = st.w * 0.14;
    c.save(); c.globalAlpha = 0.5; c.strokeStyle = PAL.muted; c.setLineDash([3, 3]); poly(c, airfoilPart(0, 1, 20).map(p => [ix + (p[0] - 0.5) * isc, iy - p[1] * isc]), true); c.stroke(); c.restore();
    c.fillStyle = PAL.accent; poly(c, airfoilPart(0, 1, 20).map(p => rot([p[0] - 0.5, p[1]], 0, 0, -tw * D2R * 3)).map(p => [ix + p[0] * isc, iy - p[1] * isc]), true); c.fill();
    txt(c, `puntera: torsión ${fmt(tw, 1)}° (dibujo ×3)`, ix, iy + isc * 0.28, { align: 'center', size: 9.5, color: PAL.muted });
    txt(c, 'Vista de frente · deformación ×3', 10, 18, { weight: 600, color: PAL.muted });
    for (let i = 0; i <= 10; i++) { c.fillStyle = heatColor(i / 10 * 0.92); c.fillRect(10 + i * 8, st.h - 16, 8, 8); }
    txt(c, '0 → 483 MPa (rotura 2024-T3)', 102, st.h - 8, { size: 9.5, color: PAL.muted });
    $('#ala-m').textContent = fmt(L.M[0] / 1000, 1) + ' kN·m'; $('#ala-v').textContent = fmt(L.V[0] / 1000, 1) + ' kN';
    $('#ala-f').textContent = fmt(defl[N] * 100, 0) + ' cm'; $('#ala-s').textContent = fmt(Math.abs(sigMax), 0) + ' MPa'; $('#ala-tw').textContent = fmt(tw, 1) + '°';
    const s = $('#ala-status');
    if (n >= 5.7) { s.className = 'status bad'; s.textContent = 'Carga última superada: la tensión llega a la de rotura del aluminio. En el ensayo estático de un prototipo, acá el ala se rompe.'; }
    else if (n > 3.8) { s.className = 'status warn'; s.textContent = 'Por encima de la carga límite (3,8 g): el material puede pasar la fluencia y quedar deformado. Debe aguantar hasta 5,7 g sin romperse.'; }
    else if (n < -1.52) { s.className = 'status warn'; s.textContent = 'Carga negativa mayor a la límite típica (−1,52 g): el ala flexiona hacia abajo y el cordón superior del larguero queda traccionado.'; }
    else if (n < 0) { s.className = 'status'; s.textContent = 'Carga negativa: la sustentación empuja hacia abajo. Se invierten tracción y compresión en los cordones del larguero.'; }
    else { s.className = 'status good'; s.textContent = `n = ${fmt(n, 1)}: el cordón superior del larguero trabaja a compresión y el inferior a tracción. Momento máximo en la raíz.`; }
    return L;
  }
  function drawDiag(L) {
    const st = diag, c = st.ctx; if (!st.w) return; clear(st, PAL.sky);
    const h = (st.h - 30) / 2;
    const Vmax = 5.7 * W / 2 / 1000, Mmax = 5.7 * 83.3;
    const b1 = { x: 52, y: 22, w: st.w - 68, h: h - 34 }, b2 = { x: 52, y: 22 + h, w: st.w - 68, h: h - 34 };
    let f = plotFrame(c, b1, [0, 8], [Math.min(0, -Vmax * 0.3), Vmax], { yl: 'Corte V [kN]', ny: 3 });
    curve(c, ys.map((y, i) => [y, L.V[i] / 1000]), f.sx, f.sy, PAL.accent, 2.4);
    f = plotFrame(c, b2, [0, 8], [Math.min(0, -Mmax * 0.3), Mmax], { yl: 'Momento flector M [kN·m]', xl: 'distancia desde la raíz [m]', ny: 3 });
    curve(c, ys.map((y, i) => [y, L.M[i] / 1000]), f.sx, f.sy, PAL.warm, 2.4);
  }
  return {
    init() {
      plan = makeCanvas('ala-plan', 0.5); sec = makeCanvas('ala-sec', 0.36); bend = makeCanvas('ala-bend', 0.55); diag = makeCanvas('ala-diag', 0.62);
      $('.seg[data-name="ala-c"]').addEventListener('change', () => info(seg('ala-c'))); info('all');
    },
    frame(dt) {
      const s = $('#p-ala').dataset.sub;
      if (s === 'comp') { const sel = seg('ala-c'); drawPlan(sel); drawSec(sel); }
      else { const L = drawBend(dt); drawDiag(L); }
    }
  };
})());
