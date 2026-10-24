// SUNNY 魔法數學・遊戲共用：音效、出題（先定答案再出算式）、設定面板、動物跳舞慶祝
const $ = id => document.getElementById(id);
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const gcd = (a, b) => b ? gcd(b, a % b) : a;
const coprimes = d => { const r = []; for (let n = 1; n < d; n++) if (gcd(n, d) === 1) r.push(n); return r; }; // 最簡分數的分子

// ================= 音效（iPhone 靜音鍵也出聲） =================
let soundOn = localStorage.getItem('sunny_sound') !== '0';
let AC = null;
function ac() { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); return AC; }
try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (_) {}
let silentEl = null;
function silentWav() {
  const n = 4410, b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 44100, true); v.setUint32(28, 88200, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
}
function unlockAudio() {
  const a = ac(); const s = a.createBufferSource(); s.buffer = a.createBuffer(1, 1, 22050); s.connect(a.destination); s.start(0);
  if (!silentEl) { silentEl = new Audio(silentWav()); silentEl.loop = true; silentEl.setAttribute('playsinline', ''); }
  silentEl.play().catch(() => {});
}
['pointerdown', 'touchend', 'keydown'].forEach(ev => document.addEventListener(ev, unlockAudio, { capture: true, passive: true }));
document.addEventListener('visibilitychange', () => { if (!document.hidden && AC) { AC.resume(); if (silentEl) silentEl.play().catch(() => {}); } });
function tone(f, d, type = 'sine', v = .3, when = 0, slideTo) {
  if (!soundOn) return; const a = ac(), t = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + .02);
}
function noise(d, v = .5, filt = 'lowpass', f0 = 1200, f1 = 80) {
  if (!soundOn) return; const a = ac(), t = a.currentTime, n = a.sampleRate * d, b = a.createBuffer(1, n, a.sampleRate), x = b.getChannelData(0);
  for (let i = 0; i < n; i++) x[i] = Math.random() * 2 - 1;
  const s = a.createBufferSource(); s.buffer = b; const F = a.createBiquadFilter(); F.type = filt;
  F.frequency.setValueAtTime(f0, t); F.frequency.exponentialRampToValueAtTime(f1, t + d);
  const g = a.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); s.connect(F).connect(g).connect(a.destination); s.start(t);
}
const SFX = {
  key: () => tone(900, .04, 'square', .05),
  flip: () => { noise(.18, .3, 'highpass', 800, 5000); tone(600, .08, 'triangle', .12); },
  ding: () => { tone(880, .25, 'triangle', .25); tone(1320, .35, 'triangle', .2, .1); },
  bad: () => { tone(220, .18, 'square', .12); tone(180, .25, 'square', .12, .15); },
  tick: () => tone(1200, .03, 'square', .06),
  slap: () => { noise(.25, .9, 'lowpass', 3000, 200); tone(150, .15, 'sine', .5, 0, 60); },
  place: () => { tone(523, .12, 'triangle', .25); tone(784, .2, 'triangle', .25, .08); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .35, 'triangle', .25, i * .14)),
};
function toggleSound(btn) { soundOn = !soundOn; localStorage.setItem('sunny_sound', soundOn ? '1' : '0'); if (btn) btn.textContent = soundOn ? '🔊' : '🔇'; }
function setupTopButtons() {
  const sb = $('soundBtn'); if (sb) { sb.textContent = soundOn ? '🔊' : '🔇'; sb.onclick = () => toggleSound(sb); }
  const fb = $('fsBtn'); if (fb) fb.onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); };
}

// ================= 出題：先決定答案 a，再出「兩個數字」的加減乘除 =================
const OPS = { add: '➕ 加', sub: '➖ 減', mul: '✖️ 乘', div: '➗ 除' };
const ALL_OPS = ['add', 'sub', 'mul', 'div'];
const BUILD = {
  add(a) { if (a < 2) return null; const x = rnd(1, a - 1); return `${x} + ${a - x}`; },
  sub(a) { if (a > 98) return null; const y = rnd(1, 99 - a); return `${a + y} − ${y}`; },
  mul(a) { const ps = []; for (let p = 2; p <= 9; p++) if (a % p === 0 && a / p >= 2 && a / p <= 9) ps.push(p); if (!ps.length) return null; const p = pick(ps); return `${p} × ${a / p}`; },
  div(a) { if (a > 9) return null; const d = rnd(2, 9); return `${a * d} ÷ ${d}`; }, // 只出九九乘法反過來
};
// 算式字串 → HTML
function exprHTML(s) { return '<span class="expr">' + s + '</span>'; }
function exprText(s) { return s; }
// 給答案 a 出一題；ops 是要用的運算（選的運算出不了這個答案，就換別的運算）
function makeQ(a, ops) {
  for (const t of shuffle(ops.slice())) { const e = BUILD[t](a); if (e) return { expr: e, answer: a, op: t }; }
  for (const t of shuffle(ALL_OPS.slice())) { const e = BUILD[t](a); if (e) return { expr: e, answer: a, op: t }; }
  return { expr: `${a + 1} − 1`, answer: a, op: 'sub' };
}
function cleanOps(o) { const r = (o || []).filter(x => ALL_OPS.includes(x)); return r.length ? r : ALL_OPS.slice(); }
function opsTag(ops) { return ops.map(t => OPS[t].split(' ')[1]).join('、'); }

// ================= 設定面板（年級＋單元） =================
// segRow(容器id, 選項[[值,文字]], 目前值, 選了之後)
function segRow(id, opts, cur, onPick, multi) {
  const el = $(id); el.innerHTML = '';
  opts.forEach(([v, lab]) => {
    const b = document.createElement('button'); b.textContent = lab;
    b.className = (multi ? cur.includes(v) : cur === v) ? 'on' : '';
    b.onclick = () => onPick(v); el.appendChild(b);
  });
}
function loadSettings(key, def) { try { return Object.assign({}, def, JSON.parse(localStorage.getItem(key) || '{}')); } catch (_) { return Object.assign({}, def); } }
function saveSettings(key, s) { localStorage.setItem(key, JSON.stringify(s)); }

// ================= 動物跳舞慶祝 =================
const ANIMALS = ['monkey', 'panda', 'frog', 'chick'];
let danceT = null, musicT = null;
function celebrate(title, sub, btnText = '再玩一次 ▶') {
  let ov = $('celebrateOv');
  if (!ov) { ov = document.createElement('div'); ov.id = 'celebrateOv'; ov.className = 'ov celebrate';
    ov.innerHTML = '<div class="t1" id="celT1"></div><div class="dancers" id="celDancers"></div><div class="t2" id="celT2"></div><button class="big-btn" id="celBtn"></button>';
    document.body.appendChild(ov); }
  $('celT1').innerHTML = title; $('celT2').innerHTML = sub || ''; $('celBtn').textContent = btnText;
  const box = $('celDancers'); box.innerHTML = '';
  ANIMALS.forEach(k => { const d = document.createElement('div'); d.className = 'dancer'; d.innerHTML = `<img src="../shared/img/dance_${k}_1.png" alt="">`; box.appendChild(d); });
  let f = 1; clearInterval(danceT);
  danceT = setInterval(() => { f = 3 - f; box.querySelectorAll('img').forEach(im => im.src = im.src.replace(/_[12]\.png$/, `_${f}.png`)); }, 500);
  const mel = [523, 659, 784, 659, 587, 698, 880, 698]; let n = 0; clearInterval(musicT); SFX.win();
  musicT = setInterval(() => { tone(mel[n % 8], .22, 'triangle', .14); if (n % 2 === 0) tone(131, .12, 'sine', .4); n++; }, 250);
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div'); p.className = 'confetti'; p.textContent = ['🎉', '🎊', '⭐', '✨', '🎈'][i % 5];
    p.style.left = Math.random() * 100 + 'vw'; p.style.animationDuration = (2.2 + Math.random() * 2) + 's'; p.style.animationDelay = Math.random() * 1.2 + 's';
    p.style.setProperty('--x', (Math.random() * 200 - 100) + 'px'); p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
    ov.appendChild(p); setTimeout(() => p.remove(), 5000);
  }
  ov.classList.add('show');
  return new Promise(res => { $('celBtn').onclick = () => { ov.classList.remove('show'); clearInterval(danceT); clearInterval(musicT); res(); }; });
}
