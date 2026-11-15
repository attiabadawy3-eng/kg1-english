// Stroke paths for finger tracing on 4 lines. y: 0 = top line, 1 = middle (dashed), 2 = base line, 3 = bottom line.
// Each glyph = list of strokes in the order taught; each stroke = list of [x,y] points (direction matters).
// Order/start points follow the booklet arrows where it has them (C p19, T p31); others follow the usual school order.
const STEP = 0.04;
function L(...p) { // polyline through points, resampled
  const out = [];
  for (let i = 0; i < p.length - 2; i += 2) {
    const [x0, y0, x1, y1] = [p[i], p[i + 1], p[i + 2], p[i + 3]];
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / STEP));
    for (let k = i ? 1 : 0; k <= n; k++) out.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]);
  }
  return out;
}
function Arc(cx, cy, rx, ry, a0, a1) { // degrees, screen coords (y down): increasing angle = clockwise on screen
  const n = Math.max(2, Math.round(Math.abs(a1 - a0) * Math.PI / 180 * Math.max(rx, ry) / STEP));
  const out = [];
  for (let k = 0; k <= n; k++) { const a = (a0 + (a1 - a0) * k / n) * Math.PI / 180; out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
  return out;
}
const join = (...parts) => parts.flat();
const shift = (strokes, dx) => strokes.map(s => s.map(([x, y]) => [x + dx, y]));

const GLYPHS = {
  C: [Arc(0.8, 1, 0.75, 1, -40, -320)],
  c: [Arc(0.5, 1.5, 0.45, 0.5, -40, -320)],
  T: [L(0.8, 0, 0.8, 2), L(0, 0, 1.6, 0)],
  t: [join(L(0.4, 0.3, 0.4, 1.8), Arc(0.65, 1.8, 0.25, 0.2, 180, 90)), L(0, 1, 0.85, 1)],
  S: [join(Arc(0.75, 0.5, 0.65, 0.5, -20, -270), Arc(0.75, 1.5, 0.65, 0.5, -90, 160))],
  s: [join(Arc(0.45, 1.25, 0.4, 0.25, -20, -270), Arc(0.45, 1.75, 0.4, 0.25, -90, 160))],
  A: [L(0.8, 0, 0, 2), L(0.8, 0, 1.6, 2), L(0.32, 1.2, 1.28, 1.2)],
  a: [Arc(0.5, 1.5, 0.45, 0.5, -30, -390), L(0.95, 1, 0.95, 2)],
  P: [L(0, 0, 0, 2), join(L(0, 0, 0.5, 0), Arc(0.5, 0.5, 0.6, 0.5, -90, 90), L(0.5, 1, 0, 1))],
  p: [L(0, 1, 0, 3), Arc(0.45, 1.5, 0.45, 0.5, 180, 540)],
  I: [L(0.6, 0, 0.6, 2), L(0, 0, 1.2, 0), L(0, 2, 1.2, 2)],
  i: [L(0.2, 1, 0.2, 2), [[0.2, 0.55]]],
  B: [L(0, 0, 0, 2), join(L(0, 0, 0.5, 0), Arc(0.5, 0.5, 0.55, 0.5, -90, 90), L(0.5, 1, 0.6, 1), Arc(0.6, 1.5, 0.6, 0.5, -90, 90), L(0.6, 2, 0, 2))],
  b: [L(0, 0, 0, 2), Arc(0.45, 1.5, 0.45, 0.5, 180, 540)],
  D: [L(0, 0, 0, 2), join(L(0, 0, 0.4, 0), Arc(0.4, 1, 0.9, 1, -90, 90), L(0.4, 2, 0, 2))],
  d: [Arc(0.5, 1.5, 0.45, 0.5, -30, -390), L(0.95, 0, 0.95, 2)],
  E: [L(0, 0, 0, 2), L(0, 0, 1.1, 0), L(0, 1, 0.9, 1), L(0, 2, 1.1, 2)],
  e: [join(L(0.05, 1.5, 0.95, 1.5), Arc(0.5, 1.5, 0.45, 0.5, 0, -310))],
  F: [L(0, 0, 0, 2), L(0, 0, 1.1, 0), L(0, 1, 0.9, 1)],
  f: [join(Arc(0.6, 0.35, 0.3, 0.35, -30, -180), L(0.3, 0.35, 0.3, 2)), L(0, 1, 0.75, 1)],
  G: [join(Arc(0.8, 1, 0.75, 1, -40, -360), L(1.55, 1, 0.95, 1))],
  g: [Arc(0.5, 1.5, 0.45, 0.5, -30, -390), join(L(0.95, 1, 0.95, 2.6), Arc(0.5, 2.6, 0.45, 0.4, 0, 150))],
  H: [L(0, 0, 0, 2), L(1.2, 0, 1.2, 2), L(0, 1, 1.2, 1)],
  h: [L(0, 0, 0, 2), join(Arc(0.45, 1.4, 0.45, 0.4, 180, 360), L(0.9, 1.4, 0.9, 2))],
  J: [join(L(0.9, 0, 0.9, 1.5), Arc(0.5, 1.5, 0.4, 0.5, 0, 180))],
  j: [join(L(0.6, 1, 0.6, 2.6), Arc(0.25, 2.6, 0.35, 0.4, 0, 150)), [[0.6, 0.55]]],
  K: [L(0, 0, 0, 2), L(1.1, 0, 0, 1.1), L(0.35, 0.8, 1.2, 2)],
  k: [L(0, 0, 0, 2), L(0.8, 1, 0, 1.6), L(0.3, 1.4, 0.85, 2)],
  L: [L(0, 0, 0, 2), L(0, 2, 1.1, 2)],
  l: [L(0.2, 0, 0.2, 2)],
  M: [L(0, 0, 0, 2), L(0, 0, 0.7, 1.3, 1.4, 0), L(1.4, 0, 1.4, 2)],
  m: [L(0, 1, 0, 2), join(Arc(0.35, 1.4, 0.35, 0.4, 180, 360), L(0.7, 1.4, 0.7, 2)), join(Arc(1.05, 1.4, 0.35, 0.4, 180, 360), L(1.4, 1.4, 1.4, 2))],
  N: [L(0, 0, 0, 2), L(0, 0, 1.2, 2), L(1.2, 2, 1.2, 0)],
  n: [L(0, 1, 0, 2), join(Arc(0.45, 1.4, 0.45, 0.4, 180, 360), L(0.9, 1.4, 0.9, 2))],
  O: [Arc(0.8, 1, 0.8, 1, -90, -450)],
  o: [Arc(0.5, 1.5, 0.45, 0.5, -90, -450)],
  Q: [Arc(0.8, 1, 0.8, 1, -90, -450), L(0.95, 1.45, 1.55, 2.1)],
  q: [Arc(0.5, 1.5, 0.45, 0.5, -30, -390), L(0.95, 1, 0.95, 3)],
  R: [L(0, 0, 0, 2), join(L(0, 0, 0.5, 0), Arc(0.5, 0.5, 0.6, 0.5, -90, 90), L(0.5, 1, 0, 1)), L(0.45, 1, 1.2, 2)],
  r: [L(0, 1, 0, 2), Arc(0.45, 1.4, 0.45, 0.4, 180, 320)],
  U: [join(L(0, 0, 0, 1.4), Arc(0.6, 1.4, 0.6, 0.6, 180, 0), L(1.2, 1.4, 1.2, 0))],
  u: [join(L(0, 1, 0, 1.6), Arc(0.45, 1.6, 0.45, 0.4, 180, 0), L(0.9, 1.6, 0.9, 1)), L(0.9, 1, 0.9, 2)],
  V: [L(0, 0, 0.65, 2, 1.3, 0)],
  v: [L(0, 1, 0.5, 2, 1, 1)],
  W: [L(0, 0, 0.4, 2, 0.8, 0.6, 1.2, 2, 1.6, 0)],
  w: [L(0, 1, 0.3, 2, 0.6, 1.3, 0.9, 2, 1.2, 1)],
  X: [L(0, 0, 1.2, 2), L(1.2, 0, 0, 2)],
  x: [L(0, 1, 0.9, 2), L(0.9, 1, 0, 2)],
  Y: [L(0, 0, 0.6, 1), L(1.2, 0, 0.6, 1, 0.6, 2)],
  y: [L(0, 1, 0.45, 2), L(0.9, 1, 0.2, 3)],
  Z: [L(0, 0, 1.2, 0, 0, 2, 1.2, 2)],
  z: [L(0, 1, 0.9, 1, 0, 2, 0.9, 2)],
  1: [L(0.6, 0, 0.6, 2)],
  2: [join(Arc(0.6, 0.55, 0.55, 0.55, -160, 20), L(1.12, 0.74, 0, 2, 1.2, 2))],
  3: [join(Arc(0.55, 0.5, 0.5, 0.5, -160, 90), Arc(0.55, 1.5, 0.55, 0.5, -90, 160))],
  4: [L(0.2, 0, 0.1, 1.3, 1.2, 1.3), L(0.9, 0, 0.9, 2)],
  5: [join(L(0.2, 0, 0.2, 0.85), Arc(0.55, 1.35, 0.55, 0.62, -125, 145)), L(0.2, 0, 1.1, 0)],
  6: [join(Arc(0.6, 1.5, 0.55, 1.5, -60, -180), Arc(0.6, 1.5, 0.55, 0.5, 180, -180))],
  7: [L(0, 0, 1.2, 0, 0.4, 2)],
  8: [join(Arc(0.6, 0.5, 0.5, 0.5, -20, -270), Arc(0.6, 1.5, 0.55, 0.5, -90, 270), Arc(0.6, 0.5, 0.5, 0.5, 90, -20))],
  9: [Arc(0.6, 0.5, 0.55, 0.5, -10, -370), L(1.15, 0.5, 1.15, 2)],
  0: [Arc(0.6, 1, 0.55, 1, -90, -450)],
};
GLYPHS[10] = [...GLYPHS[1], ...shift(GLYPHS[0], 1.1)];

// Tracer: draws the 4 lines + glyph, follows the finger along the current stroke from its start point.
// tipImg (optional): her photo, drawn as a round face at the finger's spot along the stroke
function makeTracer(canvas, glyph, onDone, onSlip, tipImg) {
  const strokes = GLYPHS[glyph];
  const ctx = canvas.getContext('2d');
  let si = 0, idx = -1, active = false;
  let u, ox, oy;
  const xs = strokes.flat().map(p => p[0]);
  const minx = Math.min(...xs), w = Math.max(...xs) - minx;
  function layout() {
    const r = canvas.getBoundingClientRect(), dpr = devicePixelRatio || 1;
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    u = Math.min(r.height / 3.6, (r.width - 40) / (w + 0.6));
    oy = (r.height - 3 * u) / 2; ox = (r.width - w * u) / 2 - minx * u;
    draw();
  }
  const P = ([x, y]) => [ox + x * u, oy + y * u];
  const R = () => Math.max(26, u * 0.28); // finger tolerance in px
  function path(pts, n) { ctx.beginPath(); pts.slice(0, n).forEach((p, k) => { const [x, y] = P(p); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); }
  function draw() {
    const r = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);
    ctx.lineCap = ctx.lineJoin = 'round';
    [0, 1, 2, 3].forEach(k => { // the 4 lines
      ctx.setLineDash(k === 1 ? [10, 10] : []); ctx.lineWidth = k === 2 ? 3 : 2;
      ctx.strokeStyle = k === 2 ? '#e58f8f' : '#9db7d6';
      ctx.beginPath(); ctx.moveTo(10, oy + k * u); ctx.lineTo(r.width - 10, oy + k * u); ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.lineWidth = u * 0.22; ctx.strokeStyle = '#e6e1d8'; // letter shape
    strokes.forEach(s => s.length === 1 ? dot(s[0], '#e6e1d8') : path(s, s.length));
    ctx.strokeStyle = '#6aa9d8'; // finished strokes
    strokes.slice(0, si).forEach(s => s.length === 1 ? dot(s[0], '#6aa9d8') : path(s, s.length));
    if (si >= strokes.length) return;
    const s = strokes[si];
    if (idx > 0) { ctx.strokeStyle = '#f2a65a'; path(s, idx + 1); }
    if (idx >= 0 && tipImg && tipImg.complete && tipImg.naturalWidth) { // her face walks along the letter
      const [fx, fy] = P(s[idx]), fr = Math.max(26, u * 0.24);
      ctx.save(); ctx.beginPath(); ctx.arc(fx, fy, fr, 0, 7); ctx.clip(); ctx.drawImage(tipImg, fx - fr, fy - fr, fr * 2, fr * 2); ctx.restore();
      ctx.lineWidth = 4; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(fx, fy, fr, 0, 7); ctx.stroke();
    }
    // guide for current stroke: number, direction arrows, green start dot
    ctx.lineWidth = 3; ctx.strokeStyle = '#7a6f62'; ctx.setLineDash([6, 8]); if (s.length > 1) path(s, s.length); ctx.setLineDash([]);
    for (let k = Math.floor(s.length / 3); k < s.length - 3 && s.length > 6; k += Math.floor(s.length / 3)) arrow(s[k], s[k + 3]);
    const [sx, sy] = P(s[0]);
    ctx.fillStyle = '#4caf6a'; ctx.beginPath(); ctx.arc(sx, sy, Math.max(14, u * 0.13), 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.max(14, u * 0.15)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(si + 1, sx, sy);
  }
  function dot(p, c) { const [x, y] = P(p); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, u * 0.12, 0, 7); ctx.fill(); }
  function arrow(a, b) {
    const [x0, y0] = P(a), [x1, y1] = P(b), ang = Math.atan2(y1 - y0, x1 - x0), h = Math.max(12, u * 0.12);
    ctx.fillStyle = '#7a6f62'; ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - h * Math.cos(ang - 0.5), y1 - h * Math.sin(ang - 0.5)); ctx.lineTo(x1 - h * Math.cos(ang + 0.5), y1 - h * Math.sin(ang + 0.5)); ctx.fill();
  }
  const near = (e, p) => { const r = canvas.getBoundingClientRect(), [x, y] = P(p); return Math.hypot(e.clientX - r.left - x, e.clientY - r.top - y); };
  function finishStroke() { si++; idx = -1; active = false; draw(); if (si >= strokes.length) onDone(); }
  function down(e) {
    if (si >= strokes.length) return;
    const s = strokes[si];
    if (near(e, s[0]) < R() * 1.4) { active = true; idx = 0; try { canvas.setPointerCapture(e.pointerId); } catch { } if (s.length === 1) finishStroke(); else draw(); }
    else onSlip && onSlip('start');
  }
  function move(e) {
    if (!active) return;
    const s = strokes[si];
    let best = -1;
    for (let j = idx + 1; j < Math.min(s.length, idx + 10); j++) if (near(e, s[j]) < R()) best = j;
    if (best > idx) idx = best;
    else if (near(e, s[idx]) > R() * 2.6) { active = false; idx = -1; draw(); onSlip && onSlip('off'); return; }
    if (idx >= s.length - 2) finishStroke(); else draw();
  }
  function up() { if (active) { active = false; idx = -1; draw(); onSlip && onSlip('lift'); } }
  canvas.onpointerdown = down; canvas.onpointermove = move; canvas.onpointerup = canvas.onpointercancel = up;
  layout();
  return { layout, test: { strokes, P, state: () => ({ si, idx }) } };
}
