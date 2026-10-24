/* ===== Compensadores (cornadura) ===== */
register('comp', (() => {
  let topC, secC, frc, anim = 0;
  function calc() {
    const type = seg('comp-type'), d = val('comp-d'), V = val('comp-v') / 3.6, f = type === 'none' ? 0 : val('comp-f') / 100;
    const q = 0.5 * 1.225 * V * V, eta = type === 'prot' ? 0.65 : 1;
    const B = type === 'none' ? 0 : eta * f * 0.3 / ((1 - f) * 0.25);
    const F0 = 0.34 * q * d * D2R, F = F0 * (1 - B);
    return { type, d, V, f, q, B, F0, F };
  }
  function drawTop(k) {
    const st = topC, c = st.ctx; if (!st.w) return; clear(st, PAL.sky);
    const x0 = st.w * 0.06, x1 = st.w * 0.9, yLE = st.h * 0.2, C = st.h * 0.62, yH = yLE + 0.6 * C, yTE = yLE + C;
    const hw = k.type === 'none' ? 0 : (k.f / 0.45) * 0.32 * (x1 - x0), yShield = yLE + 0.42 * C;
    const mov = surfColor(k.d);
    c.fillStyle = PAL.ink; c.fillRect(0, yLE - 4, x0, C + 8);
    txt(c, 'fuselaje', 4, yLE - 8, { size: 9.5, color: PAL.muted });
    c.fillStyle = PAL.metal;
    if (k.type === 'none') c.fillRect(x0, yLE, x1 - x0, yH - yLE);
    else if (k.type === 'desp') c.fillRect(x0, yLE, x1 - hw - x0 - 3, yH - yLE);
    else { c.fillRect(x0, yLE, x1 - x0, yShield - yLE); c.fillRect(x0, yShield, x1 - hw - x0 - 3, yH - yShield); }
    c.fillStyle = mov; c.fillRect(x0, yH + 2, x1 - x0, yTE - yH - 2);
    if (k.type !== 'none') { const yTop = k.type === 'desp' ? yLE : yShield + 3; c.fillRect(x1 - hw, yTop, hw, yH - yTop + 2); txt(c, 'cuerno', x1 - hw / 2, (yTop + yH) / 2 + 4, { align: 'center', weight: 700, size: 11, color: PAL.surface }); }
    c.save(); c.strokeStyle = PAL.bad; c.setLineDash([6, 4]); c.lineWidth = 1.5; line(c, x0, yH + 1, x1 + 8, yH + 1); c.restore();
    txt(c, 'bisagra', x1 + 2, yH - 4, { size: 9.5, color: PAL.bad, align: 'right' });
    txt(c, 'superficie fija (estabilizador)', x0 + 8, yLE + 18, { size: 10.5, weight: 600, color: PAL.surface });
    txt(c, 'superficie móvil (timón de profundidad)', x0 + 8, yTE - 10, { size: 10.5, weight: 600, color: PAL.surface });
    if (k.type === 'prot') txt(c, 'protección', x1 - hw / 2, yLE + 16, { align: 'center', size: 9.5, color: PAL.surface, weight: 600 });
    arrow(c, st.w * 0.5, 4, st.w * 0.5, yLE - 4, PAL.muted, 1.5, 7); txt(c, 'corriente', st.w * 0.5 + 6, 14, { size: 9.5, color: PAL.muted });
    txt(c, 'Vista en planta del semiestabilizador derecho', st.w - 10, st.h - 6, { align: 'right', size: 10, color: PAL.muted });
  }
  function drawSec(k, dt) {
    const st = secC, c = st.ctx; if (!st.w) return; clear(st, PAL.sky);
    anim += (k.d - anim) * Math.min(1, dt * 6);
    const sc = st.w * 0.8, ox = st.w * 0.1, oy = st.h * 0.5;
    const X = x => ox + x * sc, Y = y => oy - y * sc;
    const hx = 0.6, th = 0.035, a = anim * D2R;
    const nose = k.type === 'desp' ? 0.02 : k.type === 'prot' ? 0.44 : 0.6;
    // perfil simétrico simplificado
    const half = x => th * (1 - ((x - 0.35) / 0.7) ** 2) * 1.4 * Math.sqrt(Math.max(0, x)) / Math.sqrt(0.35 + x) * 1.3;
    const part = (xa, xb) => { const up = [], lo = []; for (let i = 0; i <= 24; i++) { const x = xa + (xb - xa) * i / 24; const h = Math.max(0.004, half(x)); up.push([x, h]); lo.push([x, -h]); } return up.concat(lo.reverse()); };
    if (k.type === 'prot') { c.fillStyle = PAL.metal; poly(c, part(0, 0.42).map(p => [X(p[0]), Y(p[1])]), true); c.fill(); txt(c, 'protección fija', X(0.2), Y(0.07), { align: 'center', size: 10, color: PAL.muted }); }
    if (k.type === 'none') { c.fillStyle = PAL.metal; poly(c, part(0, 0.585).map(p => [X(p[0]), Y(p[1])]), true); c.fill(); }
    const mv = part(nose, 1).map(p => rot(p, hx, 0, -a));
    c.fillStyle = surfColor(k.d); poly(c, mv.map(p => [X(p[0]), Y(p[1])]), true); c.fill();
    dot(c, X(hx), Y(0), 4, PAL.bad, PAL.sky);
    txt(c, 'bisagra', X(hx), Y(0) + 22, { align: 'center', size: 10, color: PAL.bad });
    // presiones
    const nArrows = Math.round(clamp(k.q * k.d / 9000, 0, 6));
    const L = 30 + k.q / 900;
    for (let i = 0; i < nArrows; i++) { const xx = hx + 0.06 + i * 0.055; const p = rot([xx, -half(xx)], hx, 0, -a); arrow(c, X(p[0]), Y(p[1]) + L, X(p[0]), Y(p[1]) + 3, PAL.warm, 2, 7); }
    if (k.type !== 'none' && k.d > 0.5) {
      const nh = Math.max(1, Math.round(nArrows * Math.min(1.4, k.B * 1.6) * 0.6));
      for (let i = 0; i < nh; i++) { const xx = Math.max(nose + 0.02, hx - 0.05 - i * 0.06); const p = rot([xx, half(xx)], hx, 0, -a); arrow(c, X(p[0]), Y(p[1]) - L * (k.type === 'prot' ? 0.75 : 1), X(p[0]), Y(p[1]) - 3, PAL.accent, 2, 7); }
    }
    // arcos de momento
    const arc = (r, a0, a1, col, lbl, ly) => { c.save(); c.strokeStyle = col; c.lineWidth = 2.5; c.beginPath(); c.arc(X(hx), Y(0), r, a0, a1, a1 < a0); c.stroke(); const ax = X(hx) + r * Math.cos(a1), ay = Y(0) + r * Math.sin(a1); arrow(c, ax - 6 * Math.sign(a1 - a0) * Math.sin(a1), ay + 6 * Math.sign(a1 - a0) * Math.cos(a1), ax, ay, col, 2.5, 8); c.restore(); if (lbl) txt(c, lbl, st.w - 8, 34, { color: col, size: 10, weight: 700, align: 'right' }); };
    if (k.d > 0.5) {
      arc(sc * 0.22, 0.8, -0.4, PAL.warm, 'momento que la devuelve', Y(0) - sc * 0.17);
      if (k.type !== 'none') arc(sc * 0.13, Math.PI + 0.9, Math.PI - 0.3 + 0, PAL.accent, '', 0);
    }
    txt(c, `Corte en el extremo: timón ${fmt(anim, 0)}° abajo`, 10, 18, { color: PAL.muted, weight: 600 });
    if (k.type !== 'none') txt(c, 'el aire empuja el cuerno: ayuda a girar', 10, st.h - 10, { color: PAL.accent, size: 10, weight: 700 });
  }
  function drawForce(k) {
    const st = frc, c = st.ctx; if (!st.w) return; clear(st, PAL.sky);
    const b = { x: 16, y: 26, w: st.w - 32, h: 26 };
    const lo = -200, hi = 500, sx = v => b.x + (clamp(v, lo, hi) - lo) / (hi - lo) * b.w;
    c.fillStyle = alpha(PAL.muted, 0.15); c.fillRect(b.x, b.y, b.w, b.h);
    c.fillStyle = alpha(PAL.muted, 0.35); c.fillRect(sx(0), b.y + 4, sx(k.F0) - sx(0), b.h - 8);
    c.fillStyle = k.F < 0 ? PAL.bad : PAL.good; c.fillRect(Math.min(sx(0), sx(k.F)), b.y, Math.abs(sx(k.F) - sx(0)), b.h);
    c.strokeStyle = PAL.ink; line(c, sx(0), b.y - 4, sx(0), b.y + b.h + 4);
    [-200, 0, 100, 200, 300, 400, 500].forEach(v => txt(c, `${v}`, sx(v), b.y + b.h + 14, { align: 'center', size: 9.5, color: PAL.muted }));
    txt(c, `Fuerza en la palanca: ${fmt(k.F, 0)} N`, b.x, 16, { weight: 700, size: 12 });
    if (st.w > 480) txt(c, `sin compensar sería ${fmt(k.F0, 0)} N (barra gris)`, b.x + b.w, 16, { align: 'right', size: 10, color: PAL.muted });
    const s = $('#comp-status');
    if (k.type === 'none') { s.className = 'status warn'; s.textContent = `Sin compensación el piloto hace ${fmt(k.F0, 0)} N (≈ ${fmt(k.F0 / G0, 0)} kg). Subí la velocidad: la fuerza crece con V².`; }
    else if (k.B > 1) { s.className = 'status bad'; s.textContent = 'Sobrecompensada: el cuerno hace más momento que la parte trasera. La superficie tiende a deflectarse sola y la fuerza en la palanca se invierte. Peligroso.'; }
    else if (k.B > 0.85) { s.className = 'status warn'; s.textContent = `Casi sin fuerza (${fmt(k.B * 100, 0)} % compensado): el piloto pierde la sensación de cuánto está mandando.`; }
    else { s.className = 'status good'; s.textContent = `La cornadura ${k.type === 'prot' ? 'protegida' : 'desprotegida'} compensa el ${fmt(k.B * 100, 0)} % del momento: la palanca baja de ${fmt(k.F0, 0)} N a ${fmt(k.F, 0)} N.`; }
  }
  return {
    init() { topC = makeCanvas('comp-top', 0.48); secC = makeCanvas('comp-sec', 0.42); frc = makeCanvas('comp-force', 0.16); frc.el.style.minHeight = '74px'; },
    frame(dt) { const k = calc(); drawTop(k); drawSec(k, dt); drawForce(k); }
  };
})());
