import { SYMBOLS, TOTAL_SPINS, TARGET, newRun, spin, upgrade, evaluate, restore } from './engine.mjs';

const $ = selector => document.querySelector(selector);
const STORE = 'pocket-slots.run.v1';
const STATS = 'pocket-slots.stats.v1';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const format = number => number.toLocaleString('en-US');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* The game also works without storage. */ } };
let state = restore(read(STORE)) || newRun();
let stats;
try { stats = JSON.parse(read(STATS)) || {}; } catch { stats = {}; }
if (!stats || typeof stats !== 'object') stats = {};
let best = Number.isInteger(stats.best) && stats.best >= 0 && stats.best <= 100000 ? stats.best : 0;
let runs = Number.isInteger(stats.runs) && stats.runs > 0 && stats.runs < 1000000 ? stats.runs : 1;
let sound = stats.sound === true;
let busy = false;
let selection = null;
let audio;
const save = () => write(STORE, state);
const saveStats = () => write(STATS, { best, runs, sound });
const random = () => { const values = new Uint32Array(1); crypto.getRandomValues(values); return values[0] / 4294967296; };

const artwork = {
  coin: '<circle cx="40" cy="42" r="27" fill="#c39331"/><circle cx="40" cy="37" r="27" fill="#f4cc55" stroke="#b78527" stroke-width="1.5"/><circle cx="40" cy="37" r="20" fill="none" stroke="#d4a63e" stroke-width="2"/><path d="m40 23 4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1Z" fill="#fff0a5"/><path d="M24 19a23 23 0 0 1 18-5" fill="none" stroke="#fff2ac" stroke-width="3" stroke-linecap="round"/>',
  cherry: '<path d="M23 46c3-18 23-18 22-34m1 1c-2 18 12 17 12 35" fill="none" stroke="#54845c" stroke-width="4" stroke-linecap="round"/><path d="M45 15c8-13 22-8 22-8-1 12-13 16-22 8" fill="#80ad71"/><circle cx="23" cy="52" r="16" fill="#ce4769"/><circle cx="55" cy="55" r="17" fill="#df5277"/><path d="M15 46q3-5 7-5m23 8q3-5 7-5" fill="none" stroke="#ffb4bc" stroke-width="4" stroke-linecap="round"/><path d="M22 68a16 16 0 0 0 16-15M56 72a17 17 0 0 0 16-17" fill="none" stroke="#a13655" stroke-width="1.5"/>',
  lemon: '<path d="M18 21C35 9 57 16 64 33c3 6 2 14 0 22l2 9-9 1C39 77 17 62 14 45c-1-7 1-13 3-17l-1-6Z" fill="#ecd65a" stroke="#b6a53a" stroke-width="1.5"/><path d="M18 25c7 1 16-4 18-15-10-2-17 4-18 15" fill="#85a96b"/><path d="M23 33q-6 15 5 23" fill="none" stroke="#fff5a5" stroke-width="4" stroke-linecap="round"/><g fill="#d2b63f"><circle cx="45" cy="52" r="1.2"/><circle cx="51" cy="42" r="1.2"/><circle cx="42" cy="60" r="1.2"/></g>',
  star: '<path d="m40 8 10 20 22 4-16 17 3 23-19-11-20 11 4-23L8 32l22-4Z" fill="#d39b37"/><path d="m40 4 10 20 22 4-16 17 3 23-19-11-20 11 4-23L8 28l22-4Z" fill="#f4ca63" stroke="#c69a40" stroke-width="1.5"/><path d="m40 13 3 18 19-1-22 10-13 18 6-21-15-6 19 1Z" fill="#ffe7a3"/><path d="m40 40 16 5 3 23Z" fill="#e6b449"/>',
  diamond: '<path d="m9 29 16-18h30l16 18-31 43Z" fill="#a9dbed" stroke="#639db6" stroke-width="1.5"/><path d="m9 29 31 43-13-43Zm62 0L40 72l13-43Z" fill="#79b6d0"/><path d="m25 11 2 18 13-18 13 18 2-18ZM27 29l13 43 13-43Z" fill="#d4f4ff"/><path d="M9 29h62M27 29l13-18 13 18" fill="none" stroke="#85bfd7" stroke-width="1.3"/><path d="M62 5v12m-6-6h12" stroke="#83b5d3" stroke-width="2" stroke-linecap="round"/>',
  clover: '<path d="M40 43q13 19 7 31" stroke="#4b8c61" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M40 39C4 41 5 8 23 11c11-6 20 7 17 28Z" fill="#83be86"/><path d="M40 39C39 3 71 7 69 24c7 11-6 21-29 15Z" fill="#9bd19a"/><path d="M40 39C77 39 72 70 56 68c-10 7-23-9-16-29Z" fill="#70ab78"/><path d="M40 39C40 75 8 70 12 54c-7-11 7-21 28-15Z" fill="#92c98c"/><path d="m25 23 15 16 14-15M24 54l16-15 15 15" stroke="#4b8c61" stroke-width="1.5" fill="none" opacity=".6"/>',
  magnet: '<path d="M15 15v32a25 25 0 0 0 50 0V15H49v32a9 9 0 0 1-18 0V15Z" fill="#b79adc" stroke="#84649d" stroke-width="1.5"/><path d="M15 15h16v16H15Zm34 0h16v16H49Z" fill="#e8e1f4" stroke="#84649d" stroke-width="1.5"/><path d="M22 36v11c0 11 8 18 18 18" fill="none" stroke="#d8c4ed" stroke-width="3" stroke-linecap="round"/><path d="m6 6 5 5m61-5-5 5M39 7v7" stroke="#b49acb" stroke-width="2" stroke-linecap="round"/>',
};
function icon(id) { return `<svg class="symbol-art" viewBox="0 0 80 80" aria-hidden="true">${artwork[id]}</svg>`; }
function recipeSlot(id, index, replacement = false) {
  const s = SYMBOLS[id];
  const disabled = replacement && id === selection;
  return `<button class="recipe-slot" ${replacement ? `data-replace="${index}"` : `data-symbol="${id}"`} aria-label="Slot ${index + 1}: ${s.name}, ${s.value} base points${replacement ? ', replace with ' + SYMBOLS[selection].name : ', view symbol guide'}" ${disabled ? 'disabled title="This slot already has that symbol"' : ''}><span class="slot-number">0${index + 1}</span>${icon(id)}<span class="slot-name">${s.name}</span><span class="slot-value">${s.value} pts</span></button>`;
}
function paintReel(i, id) { $(`#reel-${i}`).innerHTML = icon(id) + `<span class="reel-label">${SYMBOLS[id].name.toUpperCase()}</span>`; $(`#reel-${i}`).setAttribute('aria-label', SYMBOLS[id].name); }
function openDialog(id) { const d = $(`#${id}`); if (!d.open) d.showModal(); }
function closeDialogs() { document.querySelectorAll('dialog[open]').forEach(d => d.close()); }

function unlockAudio() {
  if (!sound) return;
  try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); audio.resume().catch(() => {}); } catch { /* Sound is optional. */ }
}
function tone(frequency, duration = .09, delay = 0, volume = .035) {
  if (!sound || !audio || audio.state !== 'running') return;
  const start = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = 'sine'; oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(volume, start + .008); gain.gain.exponentialRampToValueAtTime(.001, start + duration);
  oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(start); oscillator.stop(start + duration);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
}
function updateSound() {
  $('#sound-toggle').setAttribute('aria-pressed', String(sound));
  $('#sound-toggle').setAttribute('aria-label', sound ? 'Turn sound off' : 'Turn sound on');
  $('#sound-toggle').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4 5 9H2v6h3l6 5Z"/>${sound ? '<path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>' : '<path d="m16 9 6 6m0-6-6 6"/>'}</svg>`;
}

function render() {
  $('#score').textContent = format(state.score);
  $('#best-score').textContent = best ? format(best) : '—';
  $('#goal-fill').style.width = Math.min(state.score / TARGET * 100, 100) + '%';
  $('#goal-track').setAttribute('aria-valuenow', String(Math.min(state.score, TARGET)));
  document.body.classList.toggle('goal-reached', state.score >= TARGET);
  $('#goal-caption').textContent = state.score >= TARGET ? 'Goal reached. Keep climbing!' : state.spins === TOTAL_SPINS ? `${format(TARGET - state.score)} points away.` : 'Let’s make it happen.';
  $('#spins-left').textContent = TOTAL_SPINS - state.spins;
  $('#run-number').textContent = 'RUN ' + String(runs).padStart(2, '0');
  $('#spin-button').disabled = busy;
  $('#spin-label').textContent = busy ? 'SPINNING' : state.phase === 'upgrade' ? 'REMIX YOUR REELS' : state.phase === 'finished' ? 'SEE YOUR SCORE' : state.spins === 0 ? 'LET’S SPIN' : 'SPIN AGAIN';
  $('#machine-status').textContent = busy ? 'A LITTLE SUSPENSE' : state.phase === 'upgrade' ? 'REMIX TIME' : state.phase === 'finished' ? 'RUN COMPLETE' : 'READY TO ROLL';
  $('#recipe-grid').innerHTML = state.recipe.map((id, i) => recipeSlot(id, i)).join('');
  if (!busy) {
    const line = state.line || ['cherry', 'coin', 'lemon'];
    line.forEach((id, i) => paintReel(i, id));
    const outcome = state.line ? evaluate(state.line) : null;
    document.querySelectorAll('.reel').forEach((el, i) => el.classList.toggle('matched', !!outcome && line.filter(id => id === line[i]).length > 1));
    if (outcome) {
      $('#result-title').textContent = outcome.matched === 3 ? `Three of a kind. +${outcome.total}!` : outcome.total >= 100 ? `That clicked. +${outcome.total}!` : `A little more in your pocket. +${outcome.total}`;
      $('#result-detail').textContent = outcome.notes.length ? outcome.notes.join(' · ') : `${outcome.amounts.join(' + ')} points. Every symbol counts.`;
    } else {
      $('#result-title').textContent = 'Your next good idea starts here.';
      $('#result-detail').textContent = '20 spins. 4 upgrades. One beautiful little experiment.';
    }
  }
  const spinsToUpgrade = 4 - state.spins % 4;
  $('#upgrade-title').textContent = state.phase === 'finished' ? 'That’s your recipe.' : state.phase === 'upgrade' ? 'Time for a little remix' : state.spins >= 16 ? 'The home stretch' : 'Make it yours';
  $('#upgrade-caption').textContent = state.phase === 'finished' ? '20 spins, made your way' : state.phase === 'upgrade' ? 'Pick a new symbol to keep playing' : state.spins >= 16 ? `${20 - state.spins} spins to make it count` : `A new symbol in ${spinsToUpgrade} spin${spinsToUpgrade === 1 ? '' : 's'}`;
  document.querySelectorAll('.upgrade-dots i').forEach((el, i) => el.classList.toggle('filled', state.phase === 'upgrade' || state.phase === 'finished' || i < state.spins % 4));
}

async function roll() {
  if (busy) return;
  if (state.phase === 'upgrade') return showUpgrade();
  if (state.phase === 'finished') return showEnd();
  unlockAudio();
  busy = true;
  const previousScore = state.score;
  state = spin(state, random);
  save(); // Save the outcome before animation so refreshing cannot reroll it.
  $('#spin-button').disabled = true;
  $('#spin-label').textContent = 'SPINNING';
  $('#machine-status').textContent = 'A LITTLE SUSPENSE';
  $('#result-title').textContent = 'A little chance. A little choice.';
  $('#result-detail').textContent = 'Let’s see what comes around.';
  $('#score-gain').classList.remove('show');
  $('#machine').classList.remove('celebrate');
  const reels = [...document.querySelectorAll('.reel')];
  reels.forEach(el => { el.classList.remove('matched', 'landed'); if (!reducedMotion) el.classList.add('spinning'); });
  tone(180, .12);
  await Promise.all(reels.map(async (el, i) => {
    const interval = reducedMotion ? null : setInterval(() => paintReel(i, state.recipe[Math.floor(Math.random() * 6)]), 80);
    await wait(reducedMotion ? 40 : 520 + i * 240);
    clearInterval(interval);
    paintReel(i, state.line[i]);
    el.classList.remove('spinning'); el.classList.add('landed');
    tone([330, 440, 550][i], .1);
  }));
  busy = false;
  if (state.phase === 'finished') { best = Math.max(best, state.score); saveStats(); }
  render();
  const outcome = evaluate(state.line);
  $('#score-gain').textContent = '+' + outcome.total;
  void $('#score-gain').offsetWidth;
  $('#score-gain').classList.add('show');
  if (outcome.matched === 3 || (previousScore < TARGET && state.score >= TARGET)) {
    $('#machine').classList.add('celebrate');
    [523, 659, 784, 1047].forEach((frequency, i) => tone(frequency, .22, i * .08));
  } else tone(660, .12, .08);
  const completedSpin = state.spins;
  await wait(reducedMotion ? 30 : 850);
  if (busy || state.spins !== completedSpin || document.querySelector('dialog[open]')) return;
  if (state.phase === 'upgrade') showUpgrade();
  else if (state.phase === 'finished') showEnd();
}

function showUpgrade() {
  selection = null;
  $('#upgrade-round').textContent = String(state.spins / 4).padStart(2, '0') + ' / 04';
  $('#upgrade-instruction').textContent = 'Pick a new symbol for your recipe.';
  $('#replacement-step').hidden = true;
  $('#upgrade-choices').hidden = false;
  $('#upgrade-choices').innerHTML = state.offers.map(id => `<button class="upgrade-card" data-offer="${id}">${icon(id)}<div><strong>${SYMBOLS[id].name}<span class="card-value">${SYMBOLS[id].value} pts</span></strong><p>${SYMBOLS[id].description}</p></div><span class="card-arrow" aria-hidden="true"><svg class="arrow-icon" viewBox="0 0 24 24"><path d="M5 19 19 5M5 5h14v14"/></svg></span></button>`).join('');
  openDialog('upgrade-dialog');
}

function chooseOffer(id) {
  if (!state.offers.includes(id)) return;
  selection = id;
  $('#upgrade-choices').hidden = true;
  $('#replacement-step').hidden = false;
  $('#upgrade-instruction').textContent = 'Out with the old. In with the possibility.';
  $('#selected-symbol').innerHTML = `${icon(id)}<div><strong>${SYMBOLS[id].name}</strong><p>${SYMBOLS[id].description}</p></div>`;
  $('#replacement-grid').innerHTML = state.recipe.map((symbol, i) => recipeSlot(symbol, i, true)).join('');
  $('#replacement-grid button:not(:disabled)')?.focus();
}

function replaceSlot(index) {
  if (!selection || state.phase !== 'upgrade') return;
  const chosen = selection;
  state = upgrade(state, chosen, index);
  save();
  $('#upgrade-dialog').close();
  render();
  $('#result-title').textContent = `${SYMBOLS[chosen].name} joined the mix.`;
  $('#result-detail').textContent = 'New recipe. New possibilities. Give it a spin.';
  tone(440, .16); tone(660, .16, .1);
  $('#spin-button').focus({ preventScroll: true });
}

function showEnd() {
  best = Math.max(best, state.score); saveStats();
  $('#end-score').textContent = format(state.score);
  $('#end-eyebrow').textContent = state.score >= best && best > 0 ? 'YOUR PERSONAL BEST' : '20 SPINS. YOUR OWN LITTLE EXPERIMENT.';
  $('#end-title').innerHTML = state.score >= TARGET ? 'Look what<br>you made.' : 'That’s a wrap.';
  $('#end-description').textContent = state.score >= TARGET ? `Goal cleared by ${format(state.score - TARGET)} points. A little luck, a recipe all your own.` : `${format(TARGET - state.score)} points short of the goal. Try stacking matching symbols or pairing coins with magnets next time.`;
  $('#end-recipe').innerHTML = state.recipe.map(icon).join('');
  $('#share-status').textContent = '';
  openDialog('end-dialog');
}

function startFresh() {
  if (busy) return;
  closeDialogs();
  state = newRun(); runs++; selection = null;
  save(); saveStats();
  $('#restart-confirm').hidden = true;
  $('#restart-button').hidden = false;
  $('#score-gain').classList.remove('show');
  $('#machine').classList.remove('celebrate');
  render();
  $('#spin-button').focus({ preventScroll: true });
}

$('#spin-button').addEventListener('click', roll);
$('#sound-toggle').addEventListener('click', () => { sound = !sound; unlockAudio(); updateSound(); saveStats(); tone(523, .12); });
$('#help-toggle').addEventListener('click', () => { $('#restart-button').disabled = busy; openDialog('help-dialog'); });
$('#paytable-toggle').addEventListener('click', () => openDialog('paytable-dialog'));
$('#recipe-grid').addEventListener('click', event => { if (event.target.closest('[data-symbol]')) openDialog('paytable-dialog'); });
$('#upgrade-choices').addEventListener('click', event => { const button = event.target.closest('[data-offer]'); if (button) chooseOffer(button.dataset.offer); });
$('#replacement-grid').addEventListener('click', event => { const button = event.target.closest('[data-replace]'); if (button && !button.disabled) replaceSlot(Number(button.dataset.replace)); });
$('#change-choice').addEventListener('click', showUpgrade);
$('#upgrade-later').addEventListener('click', () => $('#upgrade-dialog').close());
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(`#${button.dataset.close}`).close()));
$('#restart-button').addEventListener('click', () => { if (busy) return; $('#restart-confirm').hidden = false; $('#restart-button').hidden = true; $('#cancel-restart').focus(); });
$('#cancel-restart').addEventListener('click', () => { $('#restart-confirm').hidden = true; $('#restart-button').hidden = false; });
$('#confirm-restart').addEventListener('click', startFresh);
$('#play-again').addEventListener('click', startFresh);
$('#share-button').addEventListener('click', async () => {
  const url = new URL('./', location.href).href;
  const text = `I made ${format(state.score)} points in 20 spins on Pocket Slots. My recipe, my luck.\n${url}`;
  try {
    if (navigator.share) { await navigator.share({ title: 'Pocket Slots', text }); }
    else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); $('#share-status').textContent = 'Score and game link copied.'; }
    else $('#share-status').textContent = text;
  } catch (error) { if (error.name !== 'AbortError') $('#share-status').textContent = text; }
});
addEventListener('keydown', event => {
  if (event.code !== 'Space' || event.repeat || event.altKey || event.ctrlKey || event.metaKey || document.querySelector('dialog[open]') || event.target.closest('button,a,input,textarea,select,[contenteditable]')) return;
  event.preventDefault(); roll();
});
$('#paytable').innerHTML = Object.entries(SYMBOLS).map(([id, s]) => `<div class="paytable-row">${icon(id)}<div><strong>${s.name}<span>${s.value} base points</span></strong><p>${s.description}</p></div></div>`).join('');
updateSound();
if (state.phase === 'finished') { best = Math.max(best, state.score); saveStats(); }
render();
save();
