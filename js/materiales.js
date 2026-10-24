/* ===== Materiales ===== */
register('mat', (() => {
  let car, trs, ttc, ttp, alc, alw, lam, bars, cure, fil, swsec, swbeam;
  /* ---------- Acero SAE ---------- */
  const FAM = { 1: 'Carbono', 2: 'Níquel', 3: 'Níquel-cromo', 4: 'Molibdeno', 5: 'Cromo', 6: 'Cromo-vanadio', 7: 'Tungsteno', 8: 'Níquel-cromo-molibdeno', 9: 'Silicio-manganeso' };
  const SERIES = { '10': 'acero al carbono simple (sin aleante importante)', '23': 'acero al níquel (≈3,5 % Ni)', '31': 'acero al níquel-cromo', '41': 'acero al cromo-molibdeno', '43': 'acero al níquel-cromo-molibdeno', '51': 'acero al cromo', '61': 'acero al cromo-vanadio', '86': 'acero al níquel-cromo-molibdeno (bajo)', '92': 'acero al silicio-manganeso (resortes)' };
  const USE = { '1020': 'piezas dobladas y soldadas, bulones comunes', '1045': 'ejes y piezas de máquina templables', '2330': 'engranajes y piezas cementadas', '3140': 'ejes y bielas', '4130': 'fuselajes reticulados de tubo soldado, bancadas de motor, trenes de aterrizaje', '4340': 'trenes de aterrizaje de aviones grandes, ejes muy cargados (alta resistencia tras temple)', '5140': 'engranajes, ejes', '6150': 'resortes y piezas a fatiga', '8620': 'engranajes cementados', '9260': 'resortes y ballestas' };
  function decode() {
    const code = $('#st-code').value; const d = code.split('');
    $('#st-digits').innerHTML = d.map((x, i) => `<div class="digit" style="color:${i === 0 ? 'var(--accent)' : i === 1 ? 'var(--warm)' : 'var(--good)'}">${x}</div>`).join('');
    const C = +(d[2] + d[3]) / 100;
    $('#st-decode').innerHTML = `<p style="margin:0"><b style="color:var(--accent)">${d[0]}</b> → aleante principal: <b>${FAM[d[0]]}</b><br><b style="color:var(--warm)">${d[1]}</b> → ${d[1] === '0' ? 'sin aleante significativo' : `≈ ${d[1]} % del aleante`} · serie ${d[0]}${d[1]}: ${SERIES[d[0] + d[1]] || ''}<br><b style="color:var(--good)">${d[2]}${d[3]}</b> → <b>${fmt(C, 2)} % de carbono</b><br><span class="note">Uso típico: ${USE[code]}</span></p>`;
    return C;
  }
  function drawCarbon() {
    const st = car, c = st.ctx; if (!st.w) return; clear(st, PAL.sky);
    const C = +$('#st-code').value.slice(2) / 100;
    const props = [['Resistencia', 0.25 + C * 1.1], ['Dureza', 0.2 + C * 1.2], ['Ductilidad', 1 - C * 1.05], ['Soldabilidad', 1.05 - C * 1.6]];
    const bx = 100, bw = st.w - bx - 20, rh = (st.h - 30) / props.length;
    txt(c, `Efecto del ${fmt(C, 2)} % de carbono (cualitativo)`, 10, 16, { weight: 600, color: PAL.muted });
    props.forEach(([n, v], i) => { const y = 26 + i * rh; v = clamp(v, 0.05, 1); txt(c, n, 10, y + rh * 0.6, { size: 11, font: BODY }); c.fillStyle = alpha(PAL.muted, 0.15); c.fillRect(bx, y + 4, bw, rh - 10); c.fillStyle = i < 2 ? PAL.accent : PAL.warm; c.fillRect(bx, y + 4, bw * v, rh - 10); });
  }
  /* reticulado: método de rigidez */
  const XS = [0, 0.8, 1.5, 2.3, 3.1, 3.9, 4.6];
  const yTop = x => x <= 1.5 ? 1.0 : 1.0 - (x - 1.5) / 3.1 * 0.45, yBot = x => x <= 1.5 ? 0 : (x - 1.5) / 3.1 * 0.35;
  const nodes = []; XS.forEach(x => { nodes.push([x, yBot(x)]); nodes.push([x, yTop(x)]); });
  const B = i => 2 * i, T = i => 2 * i + 1;
  const members = [];
  for (let i = 0; i < XS.length - 1; i++) { members.push([B(i), B(i + 1)]); members.push([T(i), T(i + 1)]); members.push(i % 2 === 0 ? [B(i), T(i + 1)] : [T(i), B(i + 1)]); }
  for (let i = 0; i < XS.length; i++) members.push([B(i), T(i)]);
  function solveTruss(n, tail, dmm) {
    const E = 205e9, t = 0.9e-3, d = dmm / 1000, di = d - 2 * t;
    const A = Math.PI / 4 * (d * d - di * di), I = Math.PI / 64 * (d ** 4 - di ** 4);
    const nd = nodes.length * 2; const K = Array.from({ length: nd }, () => new Array(nd).fill(0)); const F = new Array(nd).fill(0);
    members.forEach(([a, b]) => { const [x1, y1] = nodes[a], [x2, y2] = nodes[b]; const L = Math.hypot(x2 - x1, y2 - y1), cs = (x2 - x1) / L, sn = (y2 - y1) / L, k = E * A / L; const m = [[cs * cs, cs * sn], [cs * sn, sn * sn]]; const idx = [2 * a, 2 * a + 1, 2 * b, 2 * b + 1]; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const s = (i < 2) === (j < 2) ? 1 : -1; K[idx[i]][idx[j]] += s * k * m[i % 2][j % 2]; } });
    const g = G0 * n, add = (node, fy) => { F[2 * node + 1] += fy; };
    add(B(0), -22.5 * g); add(T(0), -22.5 * g); add(B(1), -22.5 * g); add(B(2), -22.5 * g); add(T(1), -10 * g); add(B(6), -4 * g); add(T(6), -4 * g);
    add(T(6), tail / 2 / 2); add(B(6), tail / 2 / 2);
    const fixed = [2 * T(1), 2 * T(1) + 1, 2 * T(2) + 1];
    const free = [...Array(nd).keys()].filter(i => !fixed.includes(i));
    const Kr = free.map(i => free.map(j => K[i][j])), Fr = free.map(i => F[i]);
    const ur = solve(Kr, Fr); const u = new Array(nd).fill(0); free.forEach((i, k) => u[i] = ur[k]);
    return members.map(([a, b]) => { const [x1, y1] = nodes[a], [x2, y2] = nodes[b]; const L = Math.hypot(x2 - x1, y2 - y1), cs = (x2 - x1) / L, sn = (y2 - y1) / L; const N = E * A / L * ((u[2 * b] - u[2 * a]) * cs + (u[2 * b + 1] - u[2 * a + 1]) * sn); const sig = N / A / 1e6; const Pcr = Math.PI ** 2 * E * I / (L * L); const util = N >= 0 ? sig / 460 : Math.max(-sig / 460, -N / Pcr); return { a, b, N, sig, Pcr, util, buck: N < 0 && -N / Pcr > -sig / 460, L }; });
  }
  function drawTruss() {
    const st = trs, c = st.ctx; if (!st.w) return; clear(st, PAL.sky);
    const n = val('st-n'), tail = val('st-tail'), dmm = val('st-d');
    const res = solveTruss(n, tail, dmm);
    const sc = (st.w - 60) / 5.2, ox = 40, oy = st.h * 0.78; const X = x => ox + x * sc, Y = y => oy - y * sc;
    // silueta
    c.fillStyle = alpha(PAL.muted, 0.12); poly(c, [[X(-0.6), Y(0.2)], [X(-0.6), Y(0.85)], [X(0), Y(1.0)], [X(1.5), Y(1.05)], [X(4.6), Y(0.6)], [X(5.0), Y(1.5)], [X(5.2), Y(1.5)], [X(5.0), Y(0.3)], [X(1.5), Y(-0.05)], [X(0), Y(-0.05)]], true); c.fill();
    c.fillStyle = alpha(PAL.metal, 0.5); c.fillRect(X(0.6), Y(1.15), X(1.7) - X(0.6), 7); txt(c, 'ala', X(1.15), Y(1.15) - 4, { align: 'center', size: 10, color: PAL.muted });
    const Fmax = Math.max(...res.map(r => Math.abs(r.N)), 1);
    res.forEach(r => { const [x1, y1] = nodes[r.a], [x2, y2] = nodes[r.b]; c.strokeStyle = r.util > 1 ? PAL.hot : r.N >= 0 ? PAL.bad : PAL.accent; c.lineWidth = 1.5 + 6 * Math.abs(r.N) / Fmax; c.lineCap = 'round'; if (r.util > 1) c.setLineDash([5, 4]); line(c, X(x1), Y(y1), X(x2), Y(y2)); c.setLineDash([]); });
    nodes.forEach(([x, y]) => dot(c, X(x), Y(y), 3, PAL.ink));
    [T(1), T(2)].forEach(i => { const [x, y] = nodes[i]; c.fillStyle = PAL.good; poly(c, [[X(x), Y(y) - 2], [X(x) - 7, Y(y) - 13], [X(x) + 7, Y(y) - 13]], true); c.fill(); });
    arrow(c, X(-0.15), Y(0.5), X(-0.15), Y(0.5) + 30, PAL.ink, 2, 7); txt(c, `motor ×${fmt(n, 1)}`, 4, Y(0.5) - 8, { size: 9.5 });
    arrow(c, X(1.2), Y(0) + 4, X(1.2), Y(0) + 30, PAL.ink, 2, 7); txt(c, 'piloto', X(1.2), Y(0) + 42, { size: 9.5, align: 'center' });
    if (Math.abs(tail) > 20) { const s = tail > 0 ? -1 : 1; arrow(c, X(4.75), Y(0.5), X(4.75), Y(0.5) + s * 32, PAL.warm, 2.5, 8); txt(c, `cola ${fmt(Math.abs(tail), 0)} N`, X(4.75), Y(0.5) + s * 44 + (s < 0 ? 0 : 6), { size: 9.5, align: 'center', color: PAL.warm }); }
    const worst = res.reduce((a, b) => b.util > a.util ? b : a);
    const [wx1, wy1] = nodes[worst.a], [wx2, wy2] = nodes[worst.b];
    txt(c, `${worst.N >= 0 ? 'tracción' : 'compresión'} ${fmt(Math.abs(worst.N) / 1000, 2)} kN`, (X(wx1) + X(wx2)) / 2, (Y(wy1) + Y(wy2)) / 2 - 8, { align: 'center', weight: 700, size: 10, bg: alpha(PAL.surface, 0.85) });
    txt(c, 'Lateral del fuselaje (mitad de la carga)', 10, 16, { weight: 600, color: PAL.muted });
    const s = $('#st-status');
    if (worst.util > 1) { s.className = 'status bad'; s.textContent = worst.buck ? `Falla por PANDEO un tubo comprimido: soporta ${fmt(worst.Pcr / 1000, 2)} kN y recibe ${fmt(-worst.N / 1000, 2)} kN. Agrandá el diámetro.` : `Un tubo supera la fluencia: σ = ${fmt(Math.abs(worst.sig), 0)} MPa.`; }
    else { s.className = 'status ' + (worst.util > 0.75 ? 'warn' : 'good'); s.textContent = `Tubo más exigido: ${fmt(worst.util * 100, 0)} % de su capacidad (${worst.buck ? 'limita el pandeo' : 'limita la fluencia'}, σ = ${fmt(Math.abs(worst.sig), 0)} MPa).`; }
  }
  /* ---------- Tratamientos térmicos ---------- */
  function ttProfile(type, Trev) {
    const P = { recocido: [[0, 20], [1, 860], [2, 860], [10, 120], [12, 60]], normalizado: [[0, 20], [1, 900], [1.6, 900], [2.8, 80], [12, 25]], temple: [[0, 20], [1, 870], [1.5, 870], [1.52, 60], [12, 25]], revenido: [[0, 20], [1, 870], [1.5, 870], [1.52, 60], [3, 25], [3.8, Trev], [5.8, Trev], [7.2, 30], [12, 25]], soluc: [[0, 20], [1, 480], [2, 480], [2.03, 30], [4, 25], [5, 121], [29, 121], [30, 25]] };
    return P[type];
  }
  function ttProps(type, Trev) {
    if (type === 'soluc') return [['7075-O (recocido)', 228, 17], ['7075-T6', 572, 11]];
    const u = clamp((Trev - 200) / 450, 0, 1);
    const M = { recocido: [560, 28], normalizado: [670, 25], temple: [1600, 4], revenido: [1550 - 790 * u ** 0.9, 7 + 15 * u] };
    return [type === 'recocido' ? ['4130 normalizado (para comparar)', 670, 25] : ['4130 recocido (para comparar)', 560, 28], [`4130 ${type === 'revenido' ? 'temple + revenido' : type}`, ...M[type]]];
  }
  function drawTT() {
    const type = seg('tt-type'), Trev = val('tt-rev'); $('#tt-rev-ui').hidden = type !== 'revenido';
    let st = ttc, c = st.ctx;
    if (st.w) {
      clear(st, PAL.sky);
      const pr = ttProfile(type, Trev), tmax = type === 'soluc' ? 30 : 12;
      const b = { x: 46, y: 22, w: st.w - 60, h: st.h - 56 };
      const f = plotFrame(c, b, [0, tmax], [0, 1000], { xl: 'tiempo [h]', yl: 'Temperatura [°C]' });
      if (type !== 'soluc') { c.save(); c.strokeStyle = alpha(PAL.warm, 0.6); c.setLineDash([4, 4]); line(c, b.x, f.sy(780), b.x + b.w, f.sy(780)); c.restore(); txt(c, 'zona de austenización', b.x + b.w - 4, f.sy(780) - 4, { align: 'right', size: 9.5, color: PAL.warm }); }
      curve(c, pr, f.sx, f.sy, PAL.accent, 2.8);
      const notes = { recocido: [[6, 500, 'enfriado lento en horno']], normalizado: [[2.2, 520, 'enfriado al aire']], temple: [[1.6, 420, 'enfriado brusco (agua/aceite)']], revenido: [[1.6, 420, 'temple'], [4.8, Trev + 40, 'revenido']], soluc: [[1.5, 540, 'solución'], [2.2, 300, 'temple'], [17, 170, 'envejecido artificial (T6)']] };
      notes[type].forEach(([x, y, s]) => txt(c, s, f.sx(x), f.sy(y), { size: 10, weight: 600, color: PAL.ink, bg: alpha(PAL.sky, 0.8) }));
    }
    st = ttp; c = st.ctx;
    if (st.w) {
      clear(st, PAL.sky);
      const P = ttProps(type, Trev); const bx = 10, bw = st.w - 20, rh = (st.h - 24) / 2;
      P.forEach(([n, uts, el], i) => {
        const y = 8 + i * rh; txt(c, n, bx, y + 12, { size: 11, weight: 600, font: BODY });
        c.fillStyle = alpha(PAL.muted, 0.15); c.fillRect(bx, y + 18, bw * 0.62, 12); c.fillRect(bx + bw * 0.66, y + 18, bw * 0.34, 12);
        c.fillStyle = PAL.accent; c.fillRect(bx, y + 18, bw * 0.62 * uts / 1700, 12); c.fillStyle = PAL.good; c.fillRect(bx + bw * 0.66, y + 18, bw * 0.34 * el / 30, 12);
        txt(c, `resistencia ${fmt(uts, 0)} MPa`, bx, y + 44, { size: 10, color: PAL.accent }); txt(c, `alargamiento ${fmt(el, 0)} %`, bx + bw * 0.66, y + 44, { size: 10, color: PAL.good });
      });
      const s = $('#tt-status'); const msg = { recocido: 'Recocido: el material queda blando y dúctil, fácil de doblar y mecanizar.', normalizado: 'Normalizado: grano fino, algo más resistente que recocido y todavía muy dúctil. Estado típico de tubos 4130.', temple: 'Temple solo: resistencia altísima pero muy frágil (alargamiento ≈ 4 %). No se usa así en piezas de vuelo.', revenido: `Revenido a ${fmt(Trev, 0)} °C: resignás resistencia (${fmt(P[1][1], 0)} MPa) y ganás tenacidad (${fmt(P[1][2], 0)} % de alargamiento).`, soluc: 'Solución + envejecimiento: el 7075 pasa de 228 a 572 MPa sin cambiar su composición.' };
      s.className = 'status'; s.textContent = msg[type];
    }
  }
  /* ---------- Aluminio ---------- */
  const ALU = [{ n: '2024-T3', c: 'Al-Cu', su: 483, sy: 345, el: 18, rho: 2780, fat: 1.0 }, { n: '7075-T6', c: 'Al-Zn', su: 572, sy: 503, el: 11, rho: 2810, fat: 0.65 }, { n: 'Acero 4130 norm.', c: 'ref.', su: 670, sy: 435, el: 25, rho: 7850, fat: 0.9 }];
  function drawAlu() {
    let st = alc, c = st.ctx;
    if (st.w) {
      clear(st, PAL.sky);
      const groups = [['Resistencia a rotura [MPa]', a => a.su, 700], ['Fluencia [MPa]', a => a.sy, 700], ['Fluencia / densidad [kN·m/kg]', a => a.sy * 1000 / a.rho, 200], ['Alargamiento [%]', a => a.el, 30]];
      const cols = [PAL.accent, PAL.warm, PAL.muted];
      const gh = (st.h - 30) / groups.length;
      groups.forEach(([n, f, mx], gi) => {
        const y = 10 + gi * gh; txt(c, n, 10, y + 11, { size: 10.5, weight: 600, font: BODY });
        ALU.forEach((a, i) => { const v = f(a), yy = y + 16 + i * ((gh - 22) / 3); const bh = (gh - 22) / 3 - 2; c.fillStyle = cols[i]; c.fillRect(110, yy, (st.w - 170) * v / mx, bh); txt(c, a.n, 104, yy + bh - 1, { size: 9.5, align: 'right', color: PAL.muted }); txt(c, fmt(v, 0), 114 + (st.w - 170) * v / mx, yy + bh - 1, { size: 9.5, weight: 600 }); });
      });
    }
    st = alw; c = st.ctx;
    if (st.w) {
      clear(st, PAL.sky);
      const up = seg('al-load') === 'up';
      const sc = st.w * 0.8, ox = st.w * 0.1, oy = st.h * 0.52; const X = x => ox + x * sc, Y = y => oy - y * sc * 1.6;
      const out = airfoilPart(0, 1, 60, 0.02, 0.4, 0.15);
      c.fillStyle = alpha(PAL.metal, 0.25); poly(c, out.map(p => [X(p[0]), Y(p[1])]), true); c.fill();
      const skin = (sideUp, col) => { c.strokeStyle = col; c.lineWidth = 6; c.beginPath(); for (let x = 0.18; x <= 0.651; x += 0.01) { const s = naca(0.02, 0.4, 0.15, x); const P = sideUp ? [X(s.xu), Y(s.yu)] : [X(s.xl), Y(s.yl)]; if (x < 0.185) c.moveTo(P[0], P[1]); else c.lineTo(P[0], P[1]); } c.stroke(); };
      skin(true, PAL.accent); skin(false, PAL.warm);
      [0.18, 0.65].forEach(x => { const s = naca(0.02, 0.4, 0.15, x); c.fillStyle = PAL.ink; c.fillRect(X(x) - 2, Y(s.yu), 4, Y(s.yl) - Y(s.yu)); });
      const su = naca(0.02, 0.4, 0.15, 0.42), sl = su;
      const cmp = up ? 'compresión' : 'tracción', trc = up ? 'tracción' : 'compresión';
      const ar = (x, y, dir, col) => { arrow(c, X(x) - dir * 26, y, X(x) - dir * 4, y, col, 2.5, 8); };
      ar(0.36, Y(su.yu) - 14, up ? 1 : -1, PAL.accent); ar(0.5, Y(su.yu) - 14, up ? -1 : 1, PAL.accent);
      ar(0.36, Y(sl.yl) + 14, up ? -1 : 1, PAL.warm); ar(0.5, Y(sl.yl) + 14, up ? 1 : -1, PAL.warm);
      txt(c, `revestimiento superior 7075-T6 → ${cmp}`, X(0.42), Y(su.yu) - 30, { align: 'center', weight: 700, size: 11, color: PAL.accent });
      txt(c, `revestimiento inferior 2024-T3 → ${trc}`, X(0.42), Y(sl.yl) + 40, { align: 'center', weight: 700, size: 11, color: PAL.warm });
      const s = $('#al-status');
      s.className = up ? 'status good' : 'status warn';
      s.textContent = up ? 'En vuelo normal el ala flexiona hacia arriba: el extradós se comprime (va el 7075, más resistente) y el intradós se tracciona en cada vuelo (va el 2024, mejor a fatiga).' : 'Con carga negativa se invierten los esfuerzos. Es una condición menos frecuente y de menor valor, por eso el diseño se guía por el vuelo normal.';
    }
  }
  /* ---------- Compuestos ---------- */
  const FIB = { vidrio: { n: 'Vidrio E', E1: 72, E2: 72, G: 30, nu: 0.22, rho: 2540 }, carbono: { n: 'Carbono', E1: 230, E2: 15, G: 20, nu: 0.2, rho: 1750 }, kevlar: { n: 'Kevlar 49', E1: 124, E2: 5.5, G: 2.9, nu: 0.35, rho: 1440 } };
  const RES = { E: 3.5, G: 1.3, nu: 0.35, rho: 1200 };
  function lamina() {
    const f = FIB[seg('cp-fib')], vf = val('cp-vf') / 100, vm = 1 - vf, th = val('cp-th') * D2R;
    const E1 = vf * f.E1 + vm * RES.E, E2 = 1 / (vf / f.E2 + vm / RES.E), G12 = 1 / (vf / f.G + vm / RES.G), nu = vf * f.nu + vm * RES.nu;
    const cs = Math.cos(th), sn = Math.sin(th);
    const Ex = 1 / (cs ** 4 / E1 + (1 / G12 - 2 * nu / E1) * sn * sn * cs * cs + sn ** 4 / E2);
    const rho = vf * f.rho + vm * RES.rho;
    return { f, vf, th, E1, E2, Ex, rho };
  }
  let cureT = -1;
  function drawComp(dt) {
    const L = lamina();
    let st = lam, c = st.ctx;
    if (st.w) {
      clear(st, PAL.sky);
      const s = Math.min(st.w * 0.42, st.h * 0.7), cx = st.w * 0.5, cy = st.h * 0.52;
      const stretch = 1 + clamp(18 / L.Ex, 0, 0.35);
      c.save(); c.translate(cx, cy); c.scale(stretch, 1 / (1 + (stretch - 1) * 0.3));
      c.fillStyle = alpha(PAL.warm, 0.25); c.fillRect(-s / 2, -s / 2, s, s);
      c.beginPath(); c.rect(-s / 2, -s / 2, s, s); c.clip();
      c.rotate(-L.th); c.strokeStyle = seg('cp-fib') === 'carbono' ? PAL.ink : seg('cp-fib') === 'kevlar' ? '#d7a400' : PAL.metal; c.lineWidth = 1.6;
      const gap = 3 + (1 - L.vf) * 10; for (let k = -s; k <= s; k += gap) line(c, -s, k, s, k);
      c.restore();
      arrow(c, cx - s * stretch / 2 - 4, cy, cx - s * stretch / 2 - 40, cy, PAL.bad, 3, 9); arrow(c, cx + s * stretch / 2 + 4, cy, cx + s * stretch / 2 + 40, cy, PAL.bad, 3, 9);
      txt(c, 'carga', cx + s * stretch / 2 + 22, cy - 10, { align: 'center', size: 10, color: PAL.bad });
      txt(c, `Lámina de ${L.f.n} + epoxi · fibras a ${fmt(L.th * R2D, 0)}° de la carga`, 10, 16, { weight: 600, color: PAL.muted, size: 10.5 });
      txt(c, `estiramiento dibujado (exagerado)`, st.w - 10, st.h - 8, { align: 'right', size: 9.5, color: PAL.muted });
    }
    st = bars; c = st.ctx;
    if (st.w) {
      clear(st, PAL.sky);
      const mats = [[`Compuesto (${fmt(L.th * R2D, 0)}°)`, L.Ex, L.rho, PAL.accent], ['Aluminio', 71, 2700, PAL.muted], ['Titanio', 114, 4430, PAL.muted], ['Acero', 205, 7850, PAL.muted]];
      const half = st.w / 2 - 10;
      [['Rigidez E [GPa]', m => m[1], 220], ['Rigidez por kilo E/ρ [MN·m/kg]', m => m[1] * 1000 / m[2], 140]].forEach(([n, f, mx], gi) => {
        const x0 = 10 + gi * (half + 10); txt(c, n, x0, 14, { size: 10, weight: 600, font: BODY });
        mats.forEach((m, i) => { const y = 24 + i * ((st.h - 30) / 4), bh = (st.h - 30) / 4 - 6; const w = (half - 70) * Math.min(1, f(m) / mx); c.fillStyle = m[3]; c.fillRect(x0 + 62, y, w, bh); txt(c, m[0].replace(/ \(.*/, ''), x0 + 58, y + bh - 2, { align: 'right', size: 9, color: PAL.muted }); txt(c, fmt(f(m), 0), x0 + 66 + w, y + bh - 2, { size: 9.5, weight: 600 }); });
      });
      const s = $('#cp-status'); const spec = L.Ex * 1000 / L.rho, alu = 71000 / 2700;
      if (L.th * R2D < 10) { s.className = 'status good'; s.textContent = `Fibras alineadas con la carga: por cada kilo, este compuesto es ${fmt(spec / alu, 1)} veces más rígido que el aluminio. Densidad ${fmt(L.rho, 0)} kg/m³.`; }
      else if (L.th * R2D > 60) { s.className = 'status bad'; s.textContent = `A ${fmt(L.th * R2D, 0)}° la carga la toma casi toda la resina: solo ${fmt(L.Ex, 0)} GPa. Por eso se apilan capas a 0°, ±45° y 90°.`; }
      else { s.className = 'status warn'; s.textContent = `Fuera de eje la rigidez cae rápido: ${fmt(L.Ex, 0)} GPa contra ${fmt(L.E1, 0)} GPa a 0°.`; }
    }
    // curado
    st = cure; c = st.ctx;
    if (st.w) {
      if (cureT >= 0) cureT = Math.min(1, cureT + dt / 9);
      clear(st, PAL.sky);
      const b = { x: 44, y: 22, w: st.w * 0.62 - 44, h: st.h - 54 };
      const f = plotFrame(c, b, [0, 240], [0, 200], { xl: 'min', yl: 'T [°C] · curado [%]', nx: 4 });
      const Tof = m => m < 70 ? 20 + 160 * m / 70 : m < 190 ? 180 : 180 - 150 * (m - 190) / 50;
      const pts = [], al = [], vis = []; let a = 0;
      for (let m = 0; m <= 240; m += 1) { const T = Tof(m) + 273; const k = 2e6 * Math.exp(-7600 / T); a = Math.min(0.995, a + k * (1 - a) * 1); pts.push([m, Tof(m)]); al.push([m, a * 200]); const eta = a < 0.58 ? Math.exp(-(Tof(m) - 20) / 40) / (1 - a / 0.6) ** 2 * 18 : 200; vis.push([m, clamp(eta, 0, 200)]); }
      const tNow = (cureT < 0 ? 0 : cureT) * 240;
      curve(c, pts, f.sx, f.sy, alpha(PAL.warm, 0.35), 2, [4, 4]); curve(c, al, f.sx, f.sy, alpha(PAL.good, 0.35), 2, [4, 4]);
      curve(c, pts.filter(p => p[0] <= tNow), f.sx, f.sy, PAL.warm, 2.6); curve(c, al.filter(p => p[0] <= tNow), f.sx, f.sy, PAL.good, 2.6); curve(c, vis.filter(p => p[0] <= tNow), f.sx, f.sy, PAL.accent, 1.8);
      const idx = Math.round(tNow); const aNow = al[idx][1] / 200, Tn = pts[idx][1];
      txt(c, 'temperatura', f.sx(80), f.sy(186), { size: 9.5, color: PAL.warm }); txt(c, 'grado de curado', f.sx(150), f.sy(al[150][1]) + 14, { size: 9.5, color: PAL.good }); txt(c, 'viscosidad', f.sx(20), f.sy(vis[20][1]) - 5, { size: 9.5, color: PAL.accent });
      // pieza
      const px = st.w * 0.68, pw = st.w * 0.28, py = st.h * 0.3, ph = st.h * 0.3;
      const liquid = aNow < 0.6;
      c.fillStyle = mix('#e8b64a', '#6b4a1c', clamp(aNow, 0, 1));
      if (liquid) { c.beginPath(); c.moveTo(px, py + ph); for (let i = 0; i <= 20; i++) { const xx = px + pw * i / 20; c.lineTo(xx, py + 6 * Math.sin(i * 0.9 + performance.now() / 300) * (1 - aNow)); } c.lineTo(px + pw, py + ph); c.closePath(); c.fill(); }
      else c.fillRect(px, py, pw, ph);
      c.strokeStyle = PAL.ink; c.lineWidth = 1; for (let k = 1; k < 5; k++) line(c, px + 4, py + ph * k / 5, px + pw - 4, py + ph * k / 5);
      txt(c, liquid ? 'resina líquida' : 'rígida', px + pw / 2, py + ph + 16, { align: 'center', weight: 700, size: 11 });
      txt(c, `${fmt(Tn, 0)} °C · ${fmt(aNow * 100, 0)} %`, px + pw / 2, py + ph + 32, { align: 'center', size: 10, color: PAL.muted });
      if (aNow > 0.55 && aNow < 0.7) txt(c, 'gelificación', px + pw / 2, py - 10, { align: 'center', size: 10, color: PAL.bad, weight: 700 });
      $('#cp-cure-go').disabled = cureT >= 0 && cureT < 1;
    }
    // filamento
    st = fil; c = st.ctx;
    if (st.w) {
      clear(st, PAL.sky);
      const T = val('cp-temp'), dT = T - 20, EX = 2500;
      const dL = -0.5e-6 * dT, dD = 10e-6 * dT;
      const L0 = st.w * 0.7, d0 = 12, Lx = L0 * (1 + dL * EX), dx = d0 * (1 + dD * EX * 0.25);
      const x0 = (st.w - L0) / 2, cy = st.h * 0.48;
      c.save(); c.strokeStyle = alpha(PAL.muted, 0.6); c.setLineDash([3, 3]); c.strokeRect(x0, cy - d0 / 2, L0, d0); c.restore();
      c.fillStyle = mix(PAL.ink, '#c0392b', clamp(dT / 400, 0, 0.6)); c.fillRect(x0, cy - dx / 2, Lx, dx);
      txt(c, dT < 1 ? 'a 20 °C: sin cambios' : `largo −${fmt(Math.abs(dL) * 1e6, 0)} µm/m (se acorta) · diámetro +${fmt(dD * 1e6, 0)} µm/m (engrosa)`, st.w / 2, cy + 30, { align: 'center', size: 10.5, weight: 600 });
      txt(c, 'línea punteada = filamento a 20 °C (deformación dibujada ×2500)', st.w / 2, st.h - 6, { align: 'center', size: 9.5, color: PAL.muted });
    }
  }
  /* ---------- Sándwich ---------- */
  const CORES = { nomex: 48, alhc: 83, foam: 110 };
  function sandwich() {
    const tc = val('sw-tc') / 1000, tf = val('sw-tf') / 1000, rc = CORES[seg('sw-core')], p = val('sw-p') * 1000;
    const E = 70e9, rf = 2700, Lb = 1;
    const mass = 2 * tf * rf + tc * rc, teq = mass / rf;
    const d = tc + tf, Ds = E * tf * d * d / 2 + 2 * E * tf ** 3 / 12, Dm = E * teq ** 3 / 12;
    const Mmax = p * Lb * Lb / 8;
    const dS = 5 * p * Lb ** 4 / (384 * Ds), dM = 5 * p * Lb ** 4 / (384 * Dm);
    const sS = Mmax / (tf * d) / 1e6, sM = 6 * Mmax / (teq * teq) / 1e6;
    return { tc, tf, rc, mass, teq, Ds, Dm, dS, dM, sS, sM, p };
  }
  function drawSand() {
    const k = sandwich();
    let st = swsec, c = st.ctx;
    if (st.w) {
      clear(st, PAL.sky);
      const scale = Math.min((st.h - 40) / Math.max(0.006, k.tc + 2 * k.tf), 9000);
      const H = (k.tc + 2 * k.tf) * scale, fH = Math.max(2, k.tf * scale), x0 = 20, x1 = st.w - 20, y0 = st.h / 2 - H / 2;
      c.fillStyle = PAL.metal; c.fillRect(x0, y0, x1 - x0, fH); c.fillRect(x0, y0 + H - fH, x1 - x0, fH);
      if (k.tc > 0.0005) {
        const ch = H - 2 * fH; c.save(); c.beginPath(); c.rect(x0, y0 + fH, x1 - x0, ch); c.clip();
        if (seg('sw-core') === 'foam') { c.fillStyle = alpha(PAL.warm, 0.3); c.fillRect(x0, y0 + fH, x1 - x0, ch); for (let i = 0; i < 160; i++) dot(c, x0 + ((i * 97) % (x1 - x0)), y0 + fH + ((i * 53) % Math.max(1, ch)), 1.5, alpha(PAL.warm, 0.6)); }
        else { c.strokeStyle = seg('sw-core') === 'nomex' ? '#c99a2e' : PAL.metal; c.lineWidth = 1.2; const r = Math.max(5, ch / 4); for (let x = x0 - r; x < x1 + r; x += r * 1.5) { line(c, x, y0 + fH, x, y0 + fH + ch); line(c, x + r * 0.75, y0 + fH, x + r * 0.75, y0 + fH + ch); } }
        c.restore();
      }
      txt(c, `chapa ${fmt(k.tf * 1000, 1)} mm`, x0 + 6, y0 - 4, { size: 10, weight: 600 });
      if (k.tc > 0.0005) txt(c, `núcleo ${fmt(k.tc * 1000, 0)} mm (${k.rc} kg/m³)`, (x0 + x1) / 2, st.h / 2 + 4, { align: 'center', weight: 700, size: 11, bg: alpha(PAL.surface, 0.85) });
      txt(c, 'Corte del panel (escala real ampliada)', st.w - 8, st.h - 6, { align: 'right', size: 9.5, color: PAL.muted });
    }
    st = swbeam; c = st.ctx;
    if (st.w) {
      clear(st, PAL.sky);
      const draw = (y, defl, label, fail, col) => {
        const x0 = 30, x1 = st.w - 30; const vis = Math.min(defl * 400, st.h * 0.22);
        c.strokeStyle = fail ? PAL.bad : col; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath();
        for (let i = 0; i <= 40; i++) { const u = i / 40; const yy = y + vis * 16 / 5 * (u - 2 * u ** 3 + u ** 4); if (!i) c.moveTo(x0 + u * (x1 - x0), yy); else c.lineTo(x0 + u * (x1 - x0), yy); }
        c.stroke();
        c.fillStyle = PAL.ink; [x0, x1].forEach(x => poly(c, [[x, y + 4], [x - 7, y + 15], [x + 7, y + 15]], true) || c.fill());
        txt(c, label, x0, y - 12, { size: 10.5, weight: 700, color: fail ? PAL.bad : PAL.ink });
      };
      draw(st.h * 0.25, k.dS, `Sándwich: flecha ${k.dS * 1000 < 0.1 ? '< 0,1' : fmt(k.dS * 1000, 1)} mm · σ chapas ${fmt(k.sS, 0)} MPa`, k.sS > 275, PAL.accent);
      draw(st.h * 0.7, k.dM, `Chapa maciza ${fmt(k.teq * 1000, 2)} mm: ${k.sM > 275 ? 'fluye y queda deformada' : 'flecha ' + fmt(k.dM * 1000, 0) + ' mm'} · σ ${fmt(k.sM, 0)} MPa`, k.sM > 275, PAL.muted);
      txt(c, 'Vigas de 1 m apoyadas, mismo peso por m², misma carga', st.w / 2, st.h - 6, { align: 'center', size: 9.5, color: PAL.muted });
    }
    $('#sw-w').textContent = fmt(k.mass, 2) + ' kg/m²'; $('#sw-teq').textContent = fmt(k.teq * 1000, 2) + ' mm'; $('#sw-ratio').textContent = '×' + fmt(k.Ds / k.Dm, k.Ds / k.Dm < 10 ? 1 : 0);
    const s = $('#sw-status');
    if (k.tc < 0.0005) { s.className = 'status warn'; s.textContent = 'Sin núcleo es solo una chapa del doble de espesor. Subí el espesor del núcleo.'; }
    else { s.className = 'status good'; s.textContent = `Con el mismo peso, el sándwich es ${fmt(k.Ds / k.Dm, 0)} veces más rígido que una chapa maciza de aluminio.`; }
  }
  return {
    init() {
      car = makeCanvas('st-carbon', 0.3); trs = makeCanvas('st-truss', 0.5); ttc = makeCanvas('tt-chart', 0.55); ttp = makeCanvas('tt-props', 0.3);
      alc = makeCanvas('al-chart', 0.75); alw = makeCanvas('al-wing', 0.48); lam = makeCanvas('cp-lam', 0.55); bars = makeCanvas('cp-bars', 0.45);
      cure = makeCanvas('cp-cure', 0.5); fil = makeCanvas('cp-fil', 0.25); swsec = makeCanvas('sw-sec', 0.32); swbeam = makeCanvas('sw-beam', 0.45);
      $('#st-code').addEventListener('change', decode); decode();
      $('#cp-cure-go').addEventListener('click', () => { cureT = 0; });
    },
    frame(dt) {
      const s = $('#p-mat').dataset.sub;
      if (s === 'acero') { drawCarbon(); drawTruss(); }
      else if (s === 'tt') drawTT();
      else if (s === 'alu') drawAlu();
      else if (s === 'comp') drawComp(dt);
      else drawSand();
    }
  };
})());
