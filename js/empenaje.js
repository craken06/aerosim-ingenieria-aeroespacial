/* ===== Empenaje en V ===== */
register('cola', (() => {
  let rear, mot, pad, th = 0, q = 0, psi = 0, r = 0;
  const KF = 150, DCP = 1.2;
  function calc() {
    const G = val('cl-gam') * D2R, pitch = pad.y, yaw = val('cl-ped');
    const dR = clamp(pitch * 20 + yaw * 15, -25, 25), dL = clamp(pitch * 20 - yaw * 15, -25, 25);
    const fR = KF * dR, fL = KF * dL;
    const FR = [-fR * Math.sin(G), fR * Math.cos(G)], FL = [fL * Math.sin(G), fL * Math.cos(G)];
    const Fx = FR[0] + FL[0], Fy = FR[1] + FL[1];
    const tauV = Math.abs(DCP * (fR - fL)), tauC = Math.abs(Fx) * DCP;
    return { G, dR, dL, fR, fL, FR, FL, Fx, Fy, tauV, tauC, pitch, yaw };
  }
  function drawRear(k) {
    const st = rear, c = st.ctx; if (!st.w) return; clear(st, PAL.sky);
    const cx = st.w / 2, cy = st.h * 0.66, R = Math.min(st.w, st.h) * 0.09, Ls = Math.min(st.w * 0.36, st.h * 0.62);
    const sc = Ls / 4500;
    c.save(); c.globalAlpha = 0.22; c.strokeStyle = PAL.metal; c.lineWidth = 8; c.lineCap = 'round'; line(c, cx - st.w * 0.46, cy + R * 1.6, cx + st.w * 0.46, cy + R * 1.2); c.restore(); txt(c, 'ala (al fondo)', cx + st.w * 0.45, cy + R * 1.2 + 18, { align: 'right', size: 9.5, color: PAL.muted });
    c.fillStyle = PAL.ink; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fill();
    [[1, k.dR, k.FR, 'der.'], [-1, k.dL, k.FL, 'izq.']].forEach(([sd, d, F, nm]) => {
      const ux = sd * Math.cos(k.G), uy = -Math.sin(k.G);
      const x0 = cx + ux * R * 0.8, y0 = cy + uy * R * 0.8, x1 = cx + ux * (R + Ls), y1 = cy + uy * (R + Ls);
      c.strokeStyle = PAL.metal; c.lineWidth = 12; c.lineCap = 'round'; line(c, x0, y0, x1, y1);
      const mx = x0 + (x1 - x0) * 0.25, my = y0 + (y1 - y0) * 0.25;
      c.strokeStyle = surfColor(d); c.lineWidth = 6; line(c, mx, my, x1 - (x1 - x0) * 0.04, y1 - (y1 - y0) * 0.04);
      // punto de aplicación y fuerza (perpendicular al plano)
      const px = x0 + (x1 - x0) * 0.55, py = y0 + (y1 - y0) * 0.55;
      if (Math.abs(d) > 0.5) arrow(c, px, py, px + F[0] * sc, py - F[1] * sc, d > 0 ? PAL.accent : PAL.warm, 2.5, 9);
      txt(c, `${nm} ${Math.abs(d) < 0.5 ? '0°' : (d > 0 ? '↓' : '↑') + fmt(Math.abs(d), 0) + '°'}`, x1 + sd * 6, y1 - 6, { align: sd > 0 ? 'left' : 'right', weight: 700, size: 11, color: Math.abs(d) < 0.5 ? PAL.muted : d > 0 ? PAL.accent : PAL.warm });
    });
    // resultante
    if (Math.hypot(k.Fx, k.Fy) > 50) arrow(c, cx, cy, cx + k.Fx * sc * 0.9, cy - k.Fy * sc * 0.9, PAL.ink, 5, 13);
    // torsión
    if (k.tauV > 100) {
      const sgn = Math.sign(k.fR - k.fL); c.save(); c.strokeStyle = PAL.bad; c.lineWidth = 3; const rr = R * 1.6;
      c.beginPath(); c.arc(cx, cy, rr, Math.PI * 0.2, Math.PI * 0.8); c.stroke();
      const ea = sgn > 0 ? Math.PI * 0.2 : Math.PI * 0.8; const ex = cx + rr * Math.cos(ea), ey = cy + rr * Math.sin(ea);
      arrow(c, ex + sgn * 5 * Math.sin(ea), ey - sgn * 5 * Math.cos(ea), ex - sgn * 2 * Math.sin(ea), ey + sgn * 2 * Math.cos(ea), PAL.bad, 3, 9);
      c.restore(); txt(c, 'torsión', cx, cy + rr + 16, { align: 'center', color: PAL.bad, weight: 700 });
    }
    txt(c, 'Vista desde atrás', 10, 18, { color: PAL.muted, weight: 600 });
    $('#cl-fv').textContent = `${fmt(k.Fy, 0)} N ${k.Fy > 30 ? '↑' : k.Fy < -30 ? '↓' : ''}`;
    $('#cl-fl').textContent = `${fmt(Math.abs(k.Fx), 0)} N ${k.Fx < -30 ? '←' : k.Fx > 30 ? '→' : ''}`;
    $('#cl-tv').textContent = `${fmt(k.tauV, 0)} N·m`; $('#cl-tc').textContent = `${fmt(k.tauC, 0)} N·m`;
  }
  function drawMotion(k, dt) {
    q += (-k.Fy / 3000 - 2.5 * q - 1.2 * th) * dt; th = clamp(th + q * dt, -0.6, 0.6);
    r += (-k.Fx / 4000 - 1.8 * r) * dt; psi += r * dt;
    const st = mot, c = st.ctx; if (!st.w) return; clear(st, PAL.sky);
    const h2 = st.w / 2;
    c.strokeStyle = PAL.line; line(c, 10, st.h * 0.65, h2 - 10, st.h * 0.65);
    planeSide(c, h2 * 0.5, st.h * 0.58, h2 * 0.8, th, {});
    txt(c, 'Cabeceo', 10, 18, { weight: 700 }); txt(c, `${th >= 0 ? 'nariz arriba' : 'nariz abajo'} ${fmt(Math.abs(th * R2D), 0)}°`, 10, 34, { color: PAL.muted });
    const R = Math.min(h2 * 0.32, st.h * 0.34), hx = h2 * 1.5, hy = st.h * 0.58;
    c.beginPath(); c.arc(hx, hy, R, 0, Math.PI * 2); c.stroke();
    planeTopSimple(c, hx, hy, R * 1.6, psi - Math.PI / 2, {});
    txt(c, 'Guiñada (vista en planta)', h2 + 10, 18, { weight: 700 }); txt(c, `rumbo ${fmt(((psi * R2D) % 360 + 360) % 360, 0)}°`, h2 + 10, 34, { color: PAL.muted });
    const s = $('#cl-status');
    const pitchOn = Math.abs(k.pitch) > 0.08, yawOn = Math.abs(k.yaw) > 0.04;
    if (!pitchOn && !yawOn) { s.className = 'status'; s.textContent = 'Mandos al centro: los dos planos en 0°. Probá empujar la palanca o mover los pedales.'; }
    else if (pitchOn && !yawOn) { s.className = 'status good'; s.textContent = k.pitch > 0 ? 'Palanca adelante: los dos planos bajan, la resultante es hacia arriba y levanta la cola. Las componentes laterales se anulan y no hay torsión.' : 'Palanca atrás: los dos planos suben, la resultante baja la cola y el avión asciende.'; }
    else if (yawOn && !pitchOn) { s.className = 'status warn'; s.textContent = `Viraje: un plano sube y el otro baja. Queda una fuerza lateral de ${fmt(Math.abs(k.Fx), 0)} N, pero el fuselaje recibe ${fmt(k.tauV, 0)} N·m de torsión, ${fmt(k.tauV / Math.max(1, k.tauC), 1)} veces lo que haría una deriva clásica.`; }
    else { s.className = 'status warn'; s.textContent = 'Palanca y pedales a la vez: cada plano suma las dos órdenes y se deflecta distinto.'; }
  }
  return {
    init() {
      rear = makeCanvas('cl-rear', 0.62); mot = makeCanvas('cl-motion', 0.4); pad = makePad($('#cl-pad'));
      $('#cl-center').addEventListener('click', () => { $('#cl-ped').value = 0; $('#cl-ped').dispatchEvent(new Event('input')); });
    },
    frame(dt) { pad.x = 0; pad.tick(dt); const k = calc(); drawRear(k); drawMotion(k, dt); }
  };
})());
