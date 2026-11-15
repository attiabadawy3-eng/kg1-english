// Kids English KG1 — offline, no network, progress kept only in this browser (localStorage).
const $ = (s, el = document) => el.querySelector(s);
const app = $('#app');
const LS = 'kidsEnglishKG1';
const S = Object.assign({ done: {}, stars: {}, total: 0, srs: {}, vol: 0.35, music: true }, (() => { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch { return {}; } })());
const save = () => { try { localStorage.setItem(LS, JSON.stringify(S)); } catch { } };
const W = DATA.words, LET = DATA.letters, LES = DATA.lessons;
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a; };
const rand = a => a[Math.random() * a.length | 0];
const uniq = a => [...new Set(a)];
const img = id => W[id].emoji ? `<span class="emo" role="img" aria-label="${W[id].en}">${W[id].emoji}</span>` : `<img src="img/${id}.png" alt="${W[id].en}" draggable="false">`;
const wait = ms => new Promise(r => setTimeout(r, ms));

// ---------- sound ----------
let ac, master, musicGain, musicTimer, sayToken = 0, stopPrev = null;
const voice = new Audio();
function audioInit() {
  if (ac) return;
  ac = new (window.AudioContext || window.webkitAudioContext)();
  master = ac.createGain(); master.connect(ac.destination);
  musicGain = ac.createGain(); musicGain.connect(master);
  setVol(S.vol); if (S.music) startMusic();
}
function setVol(v) { S.vol = v; save(); if (musicGain) musicGain.gain.value = v * 0.12; }
const NOTES = [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3]; // calm pentatonic
function note(f, t, len, g = 0.5, type = 'sine') {
  const o = ac.createOscillator(), e = ac.createGain();
  o.type = type; o.frequency.value = f; e.gain.setValueAtTime(0, t);
  e.gain.linearRampToValueAtTime(g, t + 0.08); e.gain.exponentialRampToValueAtTime(0.001, t + len);
  o.connect(e); e.connect(musicGain); o.start(t); o.stop(t + len + 0.05);
}
function startMusic() {
  stopMusic(); let k = 0;
  musicTimer = setInterval(() => {
    const t = ac.currentTime + 0.05;
    note(rand(NOTES), t, 1.6, 0.5);
    if (k++ % 4 === 0) note(NOTES[k % 3] / 2, t, 3, 0.35, 'triangle');
  }, 700);
}
function stopMusic() { clearInterval(musicTimer); }
function sfx(kind) { // short effects, not affected by music volume slider
  if (!ac) return; const t = ac.currentTime, g = ac.createGain(); g.connect(master); g.gain.value = 0.25;
  const seq = kind === 'good' ? [523, 659, 784] : kind === 'star' ? [784, 988, 1175, 1568] : kind === 'meow' ? [700, 900, 600] : [300, 220];
  seq.forEach((f, i) => { const o = ac.createOscillator(); o.type = kind === 'bad' ? 'triangle' : 'sine'; o.frequency.value = f; o.connect(g); o.start(t + i * 0.1); o.stop(t + i * 0.1 + 0.12); });
}
// say(['w_cat','a_cat']) plays clips in order; a newer say() cancels the older one.
async function say(keys) {
  const my = ++sayToken;
  if (stopPrev) stopPrev(); // an interrupted say() must still resolve, or callers awaiting it would hang
  if (musicGain) musicGain.gain.value = S.vol * 0.04;
  for (const k of [].concat(keys)) {
    if (my !== sayToken) return;
    voice.src = `audio/${k}.${/^(a|na|i|p)_/.test(k) ? 'mp3' : 'wav'}`; // Arabic clips are mp3
    try { await Promise.race([voice.play().then(() => new Promise(r => { voice.onended = voice.onerror = r; })), new Promise(r => { stopPrev = r; })]); } catch { }
    await wait(150);
  }
  if (my === sayToken && musicGain) musicGain.gain.value = S.vol * 0.12;
}

// ---------- spaced repetition ----------
// Each item ('w:cat', 'L:C', 'N:3') has a box (how well known) and wrong count; mistakes make it come back more.
const rec = id => S.srs[id] || (S.srs[id] = { box: 0, wrong: 0 });
const weight = id => (1 + 2 * rec(id).wrong) / (1 + rec(id).box);
function mark(id, ok) { const r = rec(id); if (ok) { r.box++; r.wrong = Math.max(0, r.wrong - 0.5); } else { r.box = 0; r.wrong++; } save(); }
function pickWeighted(ids, n) {
  const pool = ids.slice(), out = [];
  while (out.length < n && pool.length) {
    const tot = pool.reduce((s, id) => s + weight(id), 0); let x = Math.random() * tot, i = 0;
    while ((x -= weight(pool[i])) > 0 && i < pool.length - 1) i++;
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}
// what was taught in lessons before index i
function learned(i) {
  const w = [], l = [], n = [];
  LES.slice(0, i).forEach(x => {
    if (x.type === 'words') w.push(...x.items);
    if (x.type === 'letter') { l.push(x.letter); w.push(...LET[x.letter].words); }
    if (x.type === 'numbers') n.push(...x.items);
  });
  return { w: uniq(w), l: uniq(l), n: uniq(n) };
}
// rounds: current items (each at least once) + ~30% review items, weighted toward mistakes
function targets(cur, review, n, prefix) {
  const nRev = review.length ? Math.max(1, Math.round(n * 0.3)) : 0;
  const now = []; while (now.length < n - nRev) now.push(...shuffle(cur));
  const rev = pickWeighted(review.map(x => prefix + x), nRev).map(x => x.slice(2));
  const out = shuffle(now.slice(0, n - nRev).concat(rev));
  for (let k = 1; k < out.length; k++) if (out[k] === out[k - 1]) { const j = out.findIndex((v, m) => m > k && v !== out[k]); if (j > 0)[out[k], out[j]] = [out[j], out[k]]; }
  return out;
}
const lessonTitle = l => l.type === 'letter' ? `حرف ${l.letter} ${LET[l.letter].lower}` : l.type === 'numbers' ? `رقم ${l.items[0]}` : l.titleAr;
const lessonPages = l => l.type === 'letter' ? LET[l.letter].pages : l.pages;
const unlocked = i => LES[i].bonus || i === 0 || !!S.done[LES[i - 1].id]; // optional word lessons are always open
const COUNT_IMGS = ['apple', 'crayon', 'pencil', 'box', 'chair', 'tree', 'sun', 'cat'];
const many = (k, id) => `<div class="many">${Array(k).fill(img(id)).join('')}</div>`;

// ---------- home ----------
function petHTML(big) {
  const lvl = Math.floor(S.total / 15) + 1;
  return `<button class="pet ${big ? 'big' : ''}" id="pet" aria-label="القطة"><img src="img/cat.png" style="width:${Math.min(70 + lvl * 12, 150)}px"><span class="lvl">مشمش ${'❤'.repeat(Math.min(lvl, 5))}</span></button>`;
}
function topBar(extra = '') {
  return `<header class="bar">${extra}<span class="star-count">⭐ ${S.total}</span><span class="grow"></span>
    <button class="ico" id="mus" aria-label="الموسيقى">${S.music ? '🎵' : '🔇'}</button>
    <input type="range" id="vol" min="0" max="1" step="0.05" value="${S.vol}" aria-label="صوت الموسيقى"></header>`;
}
function wireBar() {
  $('#mus').onclick = () => { audioInit(); S.music = !S.music; save(); S.music ? startMusic() : stopMusic(); $('#mus').textContent = S.music ? '🎵' : '🔇'; };
  $('#vol').oninput = e => { audioInit(); setVol(+e.target.value); };
  const p = $('#pet'); if (p) p.onclick = () => { audioInit(); sfx('meow'); p.classList.remove('hop'); void p.offsetWidth; p.classList.add('hop'); };
}
function home() {
  sayToken++;
  const sections = [['الحروف والأرقام', l => !l.bonus], ['كلمات المذكرة (الوحدة 1 و 2) — اختياري', l => l.bonus]];
  app.innerHTML = topBar() + `<main class="home">${petHTML(true)}` + sections.map(([title, pick]) => `
    <section><h2>${title}</h2><div class="tiles">` +
    LES.map((l, i) => [l, i]).filter(([l]) => pick(l)).map(([l, i]) => {
      const lock = !unlocked(i), st = S.stars[l.id] || 0;
      const icon = l.type === 'letter' ? `<b class="glyph">${l.letter}${LET[l.letter].lower}</b>` : l.type === 'numbers' ? `<b class="glyph num-glyph">${l.items[0]}</b>` : img(l.items[0]);
      const pg = lessonPages(l) ? `صفحة ${lessonPages(l)}` : 'إضافي (مش في الكتاب)';
      return `<button class="tile ${lock ? 'locked' : ''} ${S.done[l.id] ? 'done' : ''}" data-i="${i}">
        <span class="num">${i + 1}</span>${icon}<span class="t">${lessonTitle(l)}</span><span class="pg">${pg}</span>
        <span class="st">${lock ? '🔒' : '★'.repeat(st) + '☆'.repeat(3 - st)}</span></button>`;
    }).join('') + `</div></section>`).join('') + `</main>`;
  wireBar();
  app.querySelectorAll('.tile').forEach(b => b.onclick = () => { audioInit(); const i = +b.dataset.i; unlocked(i) ? runLesson(i) : say('i_locked'); });
}

// ---------- lesson runner ----------
let instrKey = null;
function stage(i, step, steps) {
  const l = LES[i];
  app.innerHTML = topBar(`<button class="ico" id="homeBtn" aria-label="الرئيسية">🏠</button>`) +
    `<div class="lesson-head"><span>${lessonTitle(l)}</span><span class="pg">${lessonPages(l) ? 'صفحة ' + lessonPages(l) : 'إضافي'}</span>
     <span class="dots">${Array.from({ length: steps }, (_, k) => `<i class="${k < step ? 'on' : k === step ? 'cur' : ''}"></i>`).join('')}</span>
     <button class="ico" id="again" aria-label="اسمع التعليمات تاني">🔊</button></div><main id="stage"></main>`;
  wireBar();
  $('#homeBtn').onclick = home;
  $('#again').onclick = () => instrKey && say(instrKey);
  return $('#stage');
}
function activities(i) {
  const l = LES[i], old = learned(i);
  if (l.type === 'words') return [
    el => cards(el, l.items.map(id => ({ html: img(id), text: W[id].en, sub: W[id].ar, keys: ['w_' + id, 'a_' + id, 'w_' + id] }))),
    el => quiz(el, 'i_touch', targets(l.items, old.w, 6, 'w:').map(id => pictureRound(id, uniq([...l.items, ...old.w])))),
    el => match(el, 'i_match_words', pairsFor(l.items, old.w, 'w:').map(id => ({ id: 'w:' + id, a: img(id), b: `<span class="word" dir="ltr">${W[id].en} 🔊</span>`, sayB: 'w_' + id }))),
  ];
  if (l.type === 'letter') {
    const L = l.letter, d = LET[L], lw = d.words;
    return [
      el => cards(el, [{ html: `<b class="glyph huge">${L}${d.lower}</b>${img(lw[0])}`, text: '', keys: ['lc_' + L] },
        ...lw.map(id => { const w = W[id].en, k = d.end ? w.toLowerCase().indexOf(d.lower) : 0; // colour the letter's own spot in the word
          return { html: img(id), text: `${w.slice(0, k)}<u>${w[k]}</u>${w.slice(k + 1)}`, sub: W[id].ar, keys: ['ls_' + L, 'w_' + id, 'a_' + id] }; })]),
      el => trace(el, [L, L, d.lower, d.lower]),
      el => quiz(el, 'i_touch_letter', targets([L], old.l, 5, 'L:').map(x => letterRound(x, old.l))),
      el => quiz(el, 'i_sound', targets([L], old.l, 4, 'L:').map(x => soundRound(x, old.w))),
      el => match(el, 'i_match_letters', pairsFor([L], old.l, 'L:', Object.keys(LET)).map(x => ({ id: 'L:' + x, a: `<b class="glyph">${x}</b>`, b: `<b class="glyph">${LET[x].lower}</b>`, sayA: 'l_' + x }))),
    ];
  }
  const nums = l.items;
  return [
    el => cards(el, nums.map(k => ({ html: `<b class="glyph huge">${k}</b>${many(k, COUNT_IMGS[k % COUNT_IMGS.length])}`, text: '', keys: ['n_' + k, 'na_' + k] }))),
    el => trace(el, nums.flatMap(k => [k, k, k])),
    el => quiz(el, 'i_touch_num', targets(nums, old.n, 5, 'N:').map(k => numRound(k, uniq([...nums, ...old.n]), false))),
    el => quiz(el, 'i_count', targets(nums, old.n, 4, 'N:').map(k => numRound(k, uniq([...nums, ...old.n]), true))),
    el => match(el, 'i_match_nums', pairsFor(nums, old.n, 'N:', [1, 2, 3, 4, 5]).map(k => ({ id: 'N:' + k, a: `<b class="glyph">${k}</b>`, b: many(k, 'apple'), sayA: 'n_' + k }))),
  ];
}
// 3–4 pairs: all current items, then review (weighted), then filler
function pairsFor(cur, review, prefix, filler = []) {
  let out = cur.slice(0, 4);
  out = out.concat(pickWeighted(review.filter(x => !out.includes(x)).map(x => prefix + x), Math.max(0, Math.min(2, 4 - out.length))).map(x => prefix === 'N:' ? +x.slice(2) : x.slice(2)));
  for (const f of filler) if (out.length < 3 && !out.includes(f)) out.push(f);
  return out;
}
const choices = (target, pool, n, ok = x => x !== target) => shuffle([target, ...shuffle(pool.filter(ok)).slice(0, n - 1)]);
function pictureRound(id, pool) {
  const extra = pool.length >= 3 ? pool : uniq([...pool, ...Object.keys(W)]);
  return { item: 'w:' + id, prompt: ['w_' + id], opts: choices(id, extra, 3).map(x => ({ html: img(x), ok: x === id, say: 'w_' + x })) };
}
function letterRound(L, old) {
  const pool = uniq([...old, ...Object.keys(LET)]);
  return { item: 'L:' + L, prompt: ['l_' + L], opts: choices(L, pool, 3).map(x => ({ html: `<b class="glyph">${Math.random() < 0.5 ? x : LET[x].lower}</b>`, ok: x === L, say: 'l_' + x })) };
}
function soundRound(L, oldWords) {
  const right = rand(LET[L].words), first = id => W[id].en[0].toUpperCase();
  const same = { C: 'CKQ', K: 'CKQ', Q: 'CKQ' }[L] || L; // letters that share the sound can't be wrong answers
  const pool = uniq([...oldWords, ...Object.keys(W)]).filter(id => !same.includes(first(id)) && !(LET[L].end && W[id].en.includes(LET[L].lower)));
  return { item: 'L:' + L, prompt: ['ls_' + L], opts: shuffle([right, ...shuffle(pool).slice(0, 2)]).map(x => ({ html: img(x), ok: x === right, say: 'w_' + x })) };
}
function numRound(k, pool, count) {
  const extra = uniq([...pool, ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(x => Math.abs(x - k) <= 3)]);
  return { item: 'N:' + k, prompt: count ? [] : ['n_' + k], show: count ? many(k, rand(COUNT_IMGS)) : '',
    opts: choices(k, extra, 3).map(x => ({ html: `<b class="glyph">${x}</b>`, ok: x === k, say: 'n_' + x })) };
}
async function runLesson(i) {
  const acts = activities(i); let starSum = 0;
  for (let k = 0; k < acts.length; k++) {
    const el = stage(i, k, acts.length);
    const mistakes = await acts[k](el);
    if (mistakes === null) return; // left the lesson
    const st = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
    starSum += st; S.total += st; save();
    await celebrate(el, st, 'p_done');
  }
  const l = LES[i], st = Math.round(starSum / acts.length);
  S.done[l.id] = true; S.stars[l.id] = Math.max(S.stars[l.id] || 0, st); save();
  const el = stage(i, acts.length, acts.length);
  el.innerHTML = `<div class="finish">${petHTML(true)}<div class="bigstars">${'⭐'.repeat(st)}</div>
    <button class="go" id="next">${i + 1 < LES.length ? 'الدرس اللي بعده ⬅' : '🏠'}</button><button class="go soft" id="h">🏠</button></div>`;
  wireBar(); sfx('star'); say('p_lesson');
  $('#next').onclick = () => i + 1 < LES.length ? runLesson(i + 1) : home();
  $('#h').onclick = home;
}
async function celebrate(el, st, key) {
  el.insertAdjacentHTML('beforeend', `<div class="burst">${'⭐'.repeat(st)}</div>`);
  sfx('star'); await say(key); await wait(300);
}
// resolves with mistakes, or null if the user leaves (home button replaces #stage)
const alive = el => document.body.contains(el);

// ---------- game 1: word / letter / number cards ----------
function cards(el, list) {
  instrKey = 'i_cards';
  return new Promise(async res => {
    let k = 0;
    const show = () => {
      const c = list[k];
      el.innerHTML = `<div class="card">${c.html}<div class="en" dir="ltr">${c.text}</div><div class="ar">${c.sub || ''}</div></div>
        <nav class="cardnav"><button class="go soft" id="prev" ${k ? '' : 'disabled'}>➡</button>
        <button class="go" id="play">🔊</button><button class="go" id="nx">⬅</button></nav>`;
      $('#play', el).onclick = () => say(c.keys);
      $('.card', el).onclick = () => say(c.keys);
      $('#prev', el).onclick = () => { k--; show(); };
      $('#nx', el).onclick = () => { if (++k < list.length) show(); else res(0); };
      say(c.keys);
    };
    await say('i_cards'); if (!alive(el)) return res(null);
    show();
    watchLeave(el, res);
  });
}
function watchLeave(el, res) { const t = setInterval(() => { if (!alive(el)) { clearInterval(t); res(null); } }, 500); }

// ---------- game 2: listen & touch (also used for sound and counting games) ----------
function quiz(el, instr, rounds) {
  instrKey = instr;
  return new Promise(async res => {
    let mistakes = 0, r = 0;
    watchLeave(el, res);
    await say(instr); if (!alive(el)) return;
    const show = () => {
      const q = rounds[r]; let first = true, busy = false;
      el.innerHTML = `<div class="prompt">${q.show || ''}${q.prompt.length ? '<button class="go" id="hear">🔊</button>' : ''}</div>
        <div class="opts">${q.opts.map((o, j) => `<button class="opt" data-j="${j}">${o.html}</button>`).join('')}</div>`;
      if (q.prompt.length) $('#hear', el).onclick = () => say(q.prompt);
      el.querySelectorAll('.opt').forEach(b => b.onclick = async () => {
        if (busy) return; const o = q.opts[+b.dataset.j];
        if (o.ok) {
          busy = true; mark(q.item, first); b.classList.add('right'); sfx('good');
          await say([o.say, rand(['p_good1', 'p_good2', 'p_good3'])]);
          if (!alive(el)) return;
          if (++r < rounds.length) show(); else res(mistakes);
        } else {
          if (first) mistakes++; first = false; b.classList.add('wrong'); sfx('bad');
          setTimeout(() => b.classList.remove('wrong'), 600);
          await say(['p_again', ...q.prompt]);
        }
      });
      say(q.prompt);
    };
    show();
  });
}

// ---------- game 3: match pairs (tap left, then its partner on the right) ----------
function match(el, instr, pairs) {
  instrKey = instr;
  return new Promise(async res => {
    let mistakes = 0, sel = null, left = pairs.length;
    const missed = new Set();
    watchLeave(el, res);
    el.innerHTML = `<div class="match"><div class="col">${shuffle(pairs).map(p => `<button class="m a" data-id="${p.id}">${p.a}</button>`).join('')}</div>
      <div class="col">${shuffle(pairs).map(p => `<button class="m b" data-id="${p.id}">${p.b}</button>`).join('')}</div></div>`;
    const P = id => pairs.find(p => p.id === id);
    el.querySelectorAll('.m.a').forEach(b => b.onclick = () => {
      if (b.classList.contains('ok')) return;
      el.querySelectorAll('.m.a').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); sel = b;
      const p = P(b.dataset.id); say(p.sayA || p.sayB);
    });
    el.querySelectorAll('.m.b').forEach(b => b.onclick = async () => {
      if (b.classList.contains('ok')) return;
      const p = P(b.dataset.id);
      if (!sel) { if (p.sayB) say(p.sayB); return; }
      if (sel.dataset.id === b.dataset.id) {
        sel.classList.remove('sel'); sel.classList.add('ok'); b.classList.add('ok'); sfx('good');
        mark(p.id, !missed.has(p.id)); sel = null;
        await say([p.sayB || p.sayA, rand(['p_good1', 'p_good2', 'p_good3'])]);
        if (--left === 0 && alive(el)) res(mistakes);
      } else {
        mistakes++; missed.add(sel.dataset.id); b.classList.add('wrong'); sfx('bad'); setTimeout(() => b.classList.remove('wrong'), 600); say('p_again');
      }
    });
    await say(instr);
  });
}

// ---------- game 4: finger tracing on 4 lines ----------
function trace(el, glyphs) {
  instrKey = 'i_trace';
  return new Promise(async res => {
    let k = 0, mistakes = 0;
    watchLeave(el, res);
    const isNum = typeof glyphs[0] === 'number';
    const show = () => {
      const g = glyphs[k];
      el.innerHTML = `<div class="trace-head"><b class="glyph">${g}</b><span class="count">${k + 1} / ${glyphs.length}</span></div><canvas class="tracer"></canvas>`;
      const cv = $('canvas', el);
      const t = makeTracer(cv, g, async () => {
        if (isNum) mark('N:' + g, true); else mark('L:' + g.toUpperCase(), true);
        sfx('good'); await say([isNum ? 'n_' + g : 'l_' + String(g).toUpperCase(), rand(['p_good1', 'p_good2', 'p_good3'])]);
        if (!alive(el)) return;
        if (++k < glyphs.length) show(); else { removeEventListener('resize', t.layout); res(Math.floor(mistakes / 3)); }
      }, why => { if (why === 'off') { mistakes++; sfx('bad'); } });
      addEventListener('resize', t.layout);
      window.__tracer = t;
      say(isNum ? 'n_' + g : 'l_' + String(g).toUpperCase());
    };
    await say('i_trace'); if (!alive(el)) return;
    show();
  });
}

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js');
home();
