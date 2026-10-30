import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, newRun, spin, upgrade, restore } from '../engine.mjs';

test('different symbols pay their base values', () => {
  assert.equal(evaluate(['coin', 'cherry', 'lemon']).total, 22);
});
test('pairs multiply only matching symbols; triples multiply the full line', () => {
  assert.equal(evaluate(['cherry', 'cherry', 'lemon']).total, 42);
  assert.equal(evaluate(['star', 'star', 'star']).total, 162);
});
test('diamonds boost adjacent non-diamonds after matches', () => {
  assert.equal(evaluate(['diamond', 'coin', 'coin']).total, 38);
  assert.equal(evaluate(['coin', 'diamond', 'coin']).total, 46);
  assert.equal(evaluate(['diamond', 'star', 'diamond']).total, 128);
  assert.equal(evaluate(['diamond', 'diamond', 'diamond']).total, 126);
});
test('clover bonuses require a match and are not multiplied', () => {
  assert.equal(evaluate(['clover', 'coin', 'lemon']).bonus, 0);
  assert.equal(evaluate(['clover', 'coin', 'coin']).total, 44);
  assert.equal(evaluate(['clover', 'clover', 'diamond']).total, 110);
});
test('magnets collect bonuses for each coin, including multiple magnets', () => {
  assert.equal(evaluate(['magnet', 'coin', 'coin']).total, 96);
  assert.equal(evaluate(['magnet', 'coin', 'magnet']).total, 108);
  assert.equal(evaluate(['magnet', 'diamond', 'coin']).total, 74);
});
test('all 343 possible lines have finite positive scores and do not mutate inputs', () => {
  const symbols = ['coin', 'cherry', 'lemon', 'star', 'diamond', 'clover', 'magnet'];
  for (const a of symbols) for (const b of symbols) for (const c of symbols) {
    const line = Object.freeze([a, b, c]);
    const result = evaluate(line);
    assert.ok(Number.isInteger(result.total) && result.total > 0);
    assert.equal(result.total, result.amounts.reduce((a, b) => a + b, 0) + result.bonus);
  }
});
test('a complete run offers exactly four upgrades, preserves recipe size, and ends at 20', () => {
  let state = newRun();
  const checkpoints = [];
  let accumulated = 0;
  for (let i = 1; i <= 20; i++) {
    state = spin(state, () => .25);
    accumulated += evaluate(state.line).total;
    assert.equal(state.score, accumulated);
    assert.equal(state.spins, i);
    if (state.phase === 'upgrade') {
      checkpoints.push(i);
      assert.equal(state.offers.length, 3);
      assert.equal(new Set(state.offers).size, 3);
      assert.throws(() => spin(state));
      const previous = state;
      state = upgrade(state, state.offers[0], 0);
      assert.equal(previous.phase, 'upgrade');
      assert.equal(state.recipe.length, 6);
      assert.equal(state.score, previous.score);
      assert.equal(state.phase, 'ready');
    }
  }
  assert.deepEqual(checkpoints, [4, 8, 12, 16]);
  assert.equal(state.phase, 'finished');
  assert.throws(() => spin(state));
});
test('upgrade rejects unoffered symbols and out-of-range slots', () => {
  let state = newRun();
  for (let i = 0; i < 4; i++) state = spin(state, () => 0);
  assert.throws(() => upgrade(state, 'coin', 0));
  assert.throws(() => upgrade(state, state.offers[0], 6));
  assert.throws(() => upgrade(state, state.offers[0], -1));
});
test('saved runs preserve pending offers and scores across reloads', () => {
  let state = newRun();
  assert.deepEqual(restore(JSON.stringify(state)), state);
  for (let i = 0; i < 4; i++) state = spin(state, () => .7);
  assert.deepEqual(restore(JSON.stringify(state)), state);
  assert.equal(restore(JSON.stringify(state)).phase, 'upgrade');
});
test('invalid or incompatible saves start safely instead of trapping the player', () => {
  for (const raw of ['', 'null', '{', '[]', '{}', JSON.stringify({ ...newRun(), recipe: ['bad'] }), JSON.stringify({ ...newRun(), phase: 'finished' }), JSON.stringify({ ...newRun(), spins: 21 }), JSON.stringify({ ...newRun(), score: -1 }), JSON.stringify({ ...newRun(), phase: 'upgrade' })]) assert.equal(restore(raw), null);
});
