/* ===== Comandos ===== */
function surfColor(d) { const k = clamp(Math.abs(d) / 25, 0, 1); if (Math.abs(d) < 0.5) return PAL.metal; return mix(PAL.metal, d > 0 ? PAL.accent : PAL.warm, 0.35 + 0.65 * k); }
function surfLabel(c, d, x, y) { if (Math.abs(d) < 0.5) return; txt(c, `${d > 0 ? '↓' : '↑'}${fmt(Math.abs(d), 0)}°`, x, y, { align: 'center', weight: 700, size: 11, color: d > 0 ? PAL.accent : PAL.warm, bg: alpha(PAL.surface, 0.0) }); }
/* vista en planta, nariz hacia arriba. defl: {aL,aR,e,eL,eR,r} en grados (positivo = borde de fuga abajo / timón a la derecha) */
function planTop(c, cx, cy, S, type, defl) {
  c.save(); c.translate(cx, cy);
  const s = S / 100; c.lineJoin = 'round';
  const P = pts => pts.map(([x, y]) => [x * s, y * s]);
  const fill = (pts, col) => { c.fillStyle = col; poly(c, P(pts), true); c.fill(); if (col !== PAL.metal || pts.length === 4) { c.strokeStyle = alpha(PAL.ink, 0.45); c.lineWidth = 1; c.stroke(); } };
  if (type === 'conv') {
    fill([[-48, -2], [-48, 10], [-8, 16], [8, 16], [48, 10], [48, -2], [8, -6], [-8, -6]], PAL.metal); // ala
    fill([[-48, 10], [-48, 4], [-28, 7], [-28, 13]], surfColor(defl.aL)); fill([[48, 10], [48, 4], [28, 7], [28, 13]], surfColor(defl.aR));
    fill([[-18, 44], [-18, 50], [18, 50], [18, 44], [6, 40], [-6, 40]], PAL.metal);
    fill([[-18, 50], [-18, 46.5], [-3, 46.5], [-3, 50]], surfColor(defl.e)); fill([[18, 50], [18, 46.5], [3, 46.5], [3, 50]], surfColor(defl.e));
    c.fillStyle = PAL.ink; c.beginPath(); c.ellipse(0, 8 * s, 4.5 * s, 46 * s, 0, 0, Math.PI * 2); c.fill();
    // deriva + timón
    c.strokeStyle = PAL.ink; c.lineWidth = Math.max(2, 1.4 * s); line(c, 0, 38 * s, 0, 48 * s);
    c.strokeStyle = surfColor(defl.r === 0 ? 0 : 20); c.lineWidth = Math.max(3, 1.8 * s); const ra = defl.r * D2R; line(c, 0, 48 * s, Math.sin(ra) * 8 * s, 48 * s + Math.cos(ra) * 8 * s);
    surfLabel(c, defl.aL, -38 * s, 22 * s); surfLabel(c, defl.aR, 38 * s, 22 * s); surfLabel(c, defl.e, 0, 62 * s);
    if (Math.abs(defl.r) > 0.5) txt(c, `timón ${defl.r > 0 ? '→' : '←'} ${fmt(Math.abs(defl.r), 0)}°`, 14 * s, 60 * s, { weight: 700, size: 10, color: PAL.ink });
    txt(c, 'alerón', -38 * s, -6 * s, { align: 'center', size: 9.5, color: PAL.muted }); txt(c, 'alerón', 38 * s, -6 * s, { align: 'center', size: 9.5, color: PAL.muted });
    txt(c, 'timón de profundidad', 0, 38 * s, { align: 'center', size: 9.5, color: PAL.muted });
  } else {
    fill([[0, -46], [46, 30], [46, 36], [-46, 36], [-46, 30]], PAL.metal);
    fill([[-46, 36], [-46, 30], [-8, 30], [-8, 36]], surfColor(defl.eL)); fill([[46, 36], [46, 30], [8, 30], [8, 36]], surfColor(defl.eR));
    c.fillStyle = PAL.ink; c.beginPath(); c.ellipse(0, -2 * s, 4.5 * s, 46 * s, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = PAL.ink; c.lineWidth = Math.max(2, 1.4 * s); line(c, 0, 18 * s, 0, 40 * s);
    c.strokeStyle = surfColor(defl.r === 0 ? 0 : 20); c.lineWidth = Math.max(3, 1.8 * s); const ra = defl.r * D2R; line(c, 0, 40 * s, Math.sin(ra) * 8 * s, 40 * s + Math.cos(ra) * 8 * s);
    surfLabel(c, defl.eL, -27 * s, 50 * s); surfLabel(c, defl.eR, 27 * s, 50 * s);
    txt(c, 'elevón izq.', -27 * s, 24 * s, { align: 'center', size: 9.5, color: PAL.muted }); txt(c, 'elevón der.', 27 * s, 24 * s, { align: 'center', size: 9.5, color: PAL.muted });
    if (Math.abs(defl.r) > 0.5) txt(c, `timón ${defl.r > 0 ? '→' : '←'} ${fmt(Math.abs(defl.r), 0)}°`, 10 * s, 50 * s, { weight: 700, size: 10 });
  }
  c.restore();
}
register('comandos', (() => {
  let top, att, pad, phi = 0, p = 0, th = 0, q = 0, psi = 0, r = 0;
  function defl() {
    const roll = pad.x, pitch = pad.y, ped = val('cm-ped');
    if (seg('cm-type') === 'conv') return { aL: roll * 15, aR: -roll * 15, e: pitch * 20, r: ped * 25 };
    return { eL: clamp(pitch * 20 + roll * 15, -25, 25), eR: clamp(pitch * 20 - roll * 15, -25, 25), r: ped * 25 };
  }
  return {
    init() {
      top = makeCanvas('cm-top', 0.62); att = makeCanvas('cm-att', 0.42); pad = makePad($('#cm-pad'));
      $('#cm-center').addEventListener('click', () => { $('#cm-ped').value = 0; $('#cm-ped').dispatchEvent(new Event('input')); });
      $('#cm-level').addEventListener('click', () => { phi = p = th = q = psi = r = 0; });
    },
    frame(dt) {
      pad.tick(dt);
      const d = defl(), type = seg('cm-type');
      const rollM = type === 'conv' ? (d.aL - d.aR) / 30 : (d.eL - d.eR) / 30;
      const pitchM = type === 'conv' ? d.e / 20 : (d.eL + d.eR) / 40;
      p += (3.5 * rollM - 3 * p) * dt; phi = clamp(phi + p * dt, -1.4, 1.4);
      q += (-2.2 * pitchM - 2.5 * q - 1.2 * th) * dt; th = clamp(th + q * dt, -0.6, 0.6);
      r += (1.2 * d.r / 25 - 1.8 * r) * dt; psi += r * dt;
      // vista en planta
      let st = top, c = st.ctx;
      if (st.w) { clear(st, PAL.sky); const S = Math.min(st.w * 0.8, st.h * 0.86); planTop(c, st.w / 2, st.h * 0.07 + 0.4 * S, S, type, d); txt(c, 'Vista en planta (nariz hacia arriba)', 10, 18, { color: PAL.muted, weight: 600 }); }
      // actitud
      st = att; c = st.ctx;
      if (st.w) {
        clear(st, PAL.sky);
        const w3 = st.w / 3;
        // alabeo (vista desde atrás)
        c.strokeStyle = PAL.line; c.lineWidth = 1; line(c, 10, st.h * 0.62, w3 * 1.2, st.h * 0.62);
        planeFront(c, w3 * 0.6, st.h * 0.55, w3 * 0.95, phi, { hs: type === 'conv' });
        txt(c, 'Rolido', 10, 18, { weight: 700 }); txt(c, `${fmt(phi * R2D, 0)}°`, 10, 34, { color: PAL.muted });
        // cabeceo (vista lateral)
        line(c, w3 * 1.25, st.h * 0.62, w3 * 2.3, st.h * 0.62);
        planeSide(c, w3 * 1.8, st.h * 0.55, w3 * 0.95, th, {});
        txt(c, 'Cabeceo', w3 * 1.25, 18, { weight: 700 }); txt(c, `${th >= 0 ? 'nariz arriba' : 'nariz abajo'} ${fmt(Math.abs(th * R2D), 0)}°`, w3 * 1.25, 34, { color: PAL.muted });
        // guiñada (rumbo)
        const hx = w3 * 2.62, hy = st.h * 0.58, R = Math.min(w3 * 0.3, st.h * 0.3);
        c.strokeStyle = PAL.line; c.beginPath(); c.arc(hx, hy, R, 0, Math.PI * 2); c.stroke();
        planeTopSimple(c, hx, hy, R * 1.5, psi - Math.PI / 2, {});
        txt(c, 'Guiñada', w3 * 2.35, 18, { weight: 700 }); txt(c, `rumbo ${fmt(((psi * R2D) % 360 + 360) % 360, 0)}°`, w3 * 2.35, 34, { color: PAL.muted });
      }
      // estado
      const s = $('#cm-status');
      const parts = [];
      if (type === 'conv') {
        if (Math.abs(d.aL) > 1) parts.push(`alerón izq. ${d.aL > 0 ? 'baja' : 'sube'} ${fmt(Math.abs(d.aL), 0)}° y der. ${d.aR > 0 ? 'baja' : 'sube'} ${fmt(Math.abs(d.aR), 0)}° → rolido a la ${d.aL > 0 ? 'derecha' : 'izquierda'}`);
        if (Math.abs(d.e) > 1) parts.push(`timón de profundidad ${d.e > 0 ? 'abajo → cola arriba, nariz abajo' : 'arriba → cola abajo, nariz arriba'}`);
      } else {
        if (Math.abs(d.eL) > 1 || Math.abs(d.eR) > 1) {
          const same = Math.sign(d.eL) === Math.sign(d.eR) && Math.abs(d.eL - d.eR) < 1;
          if (same) parts.push(`los dos elevones ${d.eL > 0 ? 'bajan' : 'suben'} ${fmt(Math.abs(d.eL), 0)}° → ${d.eL > 0 ? 'picada (nariz abajo)' : 'nariz arriba'}`);
          else parts.push(`elevón izq. ${d.eL >= 0 ? '↓' : '↑'}${fmt(Math.abs(d.eL), 0)}°, der. ${d.eR >= 0 ? '↓' : '↑'}${fmt(Math.abs(d.eR), 0)}° → ${Math.abs(pad.y) > 0.1 ? 'rolido y cabeceo combinados' : 'rolido a la ' + (d.eL > d.eR ? 'derecha' : 'izquierda')}`);
        }
      }
      if (Math.abs(d.r) > 1) parts.push(`timón de dirección a la ${d.r > 0 ? 'derecha → la nariz gira a la derecha' : 'izquierda → la nariz gira a la izquierda'}`);
      s.className = parts.length ? 'status good' : 'status';
      s.textContent = parts.length ? parts.join(' · ') : 'Mandos al centro: todas las superficies alineadas.';
    }
  };
})());
