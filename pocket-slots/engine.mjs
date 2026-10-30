export const TOTAL_SPINS = 20;
export const TARGET = 1000;
export const SYMBOLS = Object.freeze({
  coin: { name: 'Coin', value: 4, color: '#f5cd4b', description: 'Small, shiny, and a magnet’s best friend.' },
  cherry: { name: 'Cherries', value: 8, color: '#f58daa', description: 'A classic. Even sweeter in a matching pair.' },
  lemon: { name: 'Lemon', value: 10, color: '#e4e970', description: 'A little zest. A reliable 10 points.' },
  star: { name: 'Star', value: 18, color: '#f7c767', description: '18 points. A triple is worth 162.' },
  diamond: { name: 'Diamond', value: 14, color: '#a6dcf2', description: 'Doubles the payout of adjacent non-diamonds.' },
  clover: { name: 'Clover', value: 10, color: '#a5ddb5', description: 'Adds 18 bonus points whenever the line has a match.' },
  magnet: { name: 'Magnet', value: 8, color: '#c6b5f1', description: 'Adds 36 bonus points for every coin on the line.' },
});

export function evaluate(line) {
  if (!Array.isArray(line) || line.length !== 3 || line.some(id => !SYMBOLS[id])) throw new Error('Invalid line');
  const counts = Object.fromEntries(Object.keys(SYMBOLS).map(id => [id, line.filter(s => s === id).length]));
  const matched = Math.max(...Object.values(counts));
  const amounts = line.map((id, i) => {
    let amount = SYMBOLS[id].value * Math.max(1, counts[id]);
    if (id !== 'diamond') {
      if (line[i - 1] === 'diamond') amount *= 2;
      if (line[i + 1] === 'diamond') amount *= 2;
    }
    return amount;
  });
  const cloverBonus = matched >= 2 ? counts.clover * 18 : 0;
  const magnetBonus = counts.magnet * counts.coin * 36;
  const bonus = cloverBonus + magnetBonus;
  const total = amounts.reduce((sum, n) => sum + n, 0) + bonus;
  const notes = [];
  if (matched === 3) notes.push('Triple! Matching symbols pay ×3');
  else if (matched === 2) notes.push('Pair! Matching symbols pay ×2');
  if (counts.diamond && counts.diamond < 3) notes.push('Diamond boosted its neighbors');
  if (cloverBonus) notes.push(`Clover +${cloverBonus}`);
  if (magnetBonus) notes.push(`Magnet +${magnetBonus}`);
  return { total, amounts, bonus, matched, notes };
}

export function newRun() {
  return { version: 1, recipe: ['coin', 'coin', 'coin', 'cherry', 'cherry', 'lemon'], spins: 0, score: 0, phase: 'ready', line: null, offers: [] };
}

export function spin(state, random = Math.random) {
  if (state.phase !== 'ready' || state.spins >= TOTAL_SPINS) throw new Error('Cannot spin now');
  const line = Array.from({ length: 3 }, () => state.recipe[Math.floor(random() * state.recipe.length)]);
  const spins = state.spins + 1;
  const phase = spins === TOTAL_SPINS ? 'finished' : spins % 4 === 0 ? 'upgrade' : 'ready';
  const pool = ['star', 'diamond', 'clover', 'magnet'];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return { ...state, spins, line, score: state.score + evaluate(line).total, phase, offers: phase === 'upgrade' ? pool.slice(0, 3) : [] };
}

export function upgrade(state, symbol, index) {
  if (state.phase !== 'upgrade' || !state.offers.includes(symbol) || !Number.isInteger(index) || index < 0 || index >= 6) throw new Error('Invalid upgrade');
  const recipe = [...state.recipe];
  recipe[index] = symbol;
  return { ...state, recipe, phase: 'ready', offers: [] };
}

export function restore(raw) {
  try {
    const s = JSON.parse(raw);
    if (!s || s.version !== 1 || !Array.isArray(s.recipe) || s.recipe.length !== 6 || s.recipe.some(id => !Object.hasOwn(SYMBOLS, id))) return null;
    if (!Number.isInteger(s.spins) || s.spins < 0 || s.spins > TOTAL_SPINS || !Number.isInteger(s.score) || s.score < 0 || s.score > 100000) return null;
    if (!['ready', 'upgrade', 'finished'].includes(s.phase)) return null;
    if ((s.spins === TOTAL_SPINS) !== (s.phase === 'finished')) return null;
    if (s.phase === 'upgrade' && (s.spins === 0 || s.spins % 4 !== 0)) return null;
    if (!Array.isArray(s.offers) || (s.phase === 'upgrade' ? s.offers.length !== 3 || new Set(s.offers).size !== 3 || s.offers.some(id => !['star', 'diamond', 'clover', 'magnet'].includes(id)) : s.offers.length !== 0)) return null;
    if (s.spins === 0 ? s.line !== null || s.score !== 0 : !Array.isArray(s.line) || s.line.length !== 3 || s.line.some(id => !Object.hasOwn(SYMBOLS, id))) return null;
    return { version: 1, recipe: s.recipe, spins: s.spins, score: s.score, phase: s.phase, line: s.line, offers: s.offers };
  } catch { return null; }
}
