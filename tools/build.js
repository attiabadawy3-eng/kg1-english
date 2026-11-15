// Generates tools/audio_src.json (for tts.ps1) and the offline file list in sw.js from data.js.
// Usage: node tools/build.js   then   powershell -File tools/tts.ps1   then   node tools/build.js (again, to list the audio files)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const D = require(path.join(root, 'data.js'));
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const en = s => `<prosody rate="-20%">${s}</prosody>`;
const ph = ipa => `<phoneme alphabet="ipa" ph="${ipa === 'sss' ? 'sːː' : ipa}">x</phoneme>`;
const ch = L => `<say-as interpret-as="characters">${L}</say-as>`;
const items = [];
const add = (key, lang, ssml) => items.push({ key, lang, ssml });

for (const [id, w] of Object.entries(D.words)) {
  add('w_' + id, 'en', en(esc(w.say || w.en)));
  add('a_' + id, 'ar', esc(w.ar));
}
for (const [L, l] of Object.entries(D.letters)) {
  add('l_' + L, 'en', en(ch(L)));
  const w = D.words[l.words[0]].en;
  // Egyptian-classroom chant: "C, C, k k k, cat"
  add('lc_' + L, 'en', en(`${ch(L)}. ${ch(L)}. <break time="300ms"/>${ph(l.ipa)}, ${ph(l.ipa)}, ${ph(l.ipa)}. <break time="300ms"/>${esc(w)}!`));
  add('ls_' + L, 'en', en(`${ph(l.ipa)}, ${ph(l.ipa)}`));
}
for (let k = 1; k <= 10; k++) {
  add('n_' + k, 'en', en(D.numbersEn[k]));
  add('na_' + k, 'ar', D.numbersAr[k]);
}
for (const [k, t] of Object.entries(D.instr)) add(k, 'ar', esc(t));
fs.writeFileSync(path.join(__dirname, 'audio_src.json'), JSON.stringify(items, null, 1));

// offline file list for the service worker
const list = ['./', 'index.html', 'app.js', 'trace.js', 'data.js', 'style.css', 'manifest.json', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png']
  .concat(fs.readdirSync(path.join(root, 'img')).map(f => 'img/' + f))
  .concat(fs.readdirSync(path.join(root, 'audio')).map(f => 'audio/' + f));
const sw = path.join(root, 'sw.js');
const src = fs.readFileSync(sw, 'utf8').replace(/const FILES = \[[\s\S]*?\];/, 'const FILES = ' + JSON.stringify(list) + ';')
  .replace(/const VERSION = '[^']*'/, `const VERSION = 'v${Date.now()}'`);
fs.writeFileSync(sw, src);
console.log(items.length, 'audio items;', list.length, 'offline files');
