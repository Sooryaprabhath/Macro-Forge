import test from 'node:test';
import assert from 'node:assert/strict';
import { HISTORY_KEY, readHistory, saveCheckIn, compareCheckIns } from '../src/history.js';
const now = new Date('2026-10-05T12:00:00Z');
const result = (weight = 75, bodyFat = 22, calories = 2400, source = 'visual') => ({ input: { weight, sex: 'male', goal: 'cut', bodyFatSource: source }, bodyFat, calories });
const storage = () => {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
};
test('dated snapshots persist independently and compare actual saved values', () => {
  const store = storage();
  const original = result();
  saveCheckIn(store, original, '2026-09-01', now);
  original.input.weight = 100;
  saveCheckIn(store, result(72, 20, 2300), '2026-10-05', now);
  const rows = readHistory(store);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].weight, 75);
  assert.deepEqual(compareCheckIns(rows[0], rows[1]), { weight: -3, bodyFat: -2, calories: -100, comparableBodyFat: true });
});
test('identical check-ins deduplicate, changed same-day records are preserved, and backdating sorts', () => {
  const store = storage();
  saveCheckIn(store, result(), '2026-10-05', now);
  assert.equal(saveCheckIn(store, result(), '2026-10-05', now).duplicate, true);
  saveCheckIn(store, result(74), '2026-10-05', now);
  saveCheckIn(store, result(76), '2026-09-01', now);
  const rows = readHistory(store);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].weight, 76);
  assert.equal(new Set(rows.map((row) => row.id)).size, 3);
});
test('changed methods are flagged and invalid dates or values cannot be saved', () => {
  const store = storage();
  const a = saveCheckIn(store, result(), '2026-09-01', now).checkins[0];
  const b = saveCheckIn(store, result(74, 20, 2300, 'formula'), '2026-10-05', now).checkins[1];
  assert.equal(compareCheckIns(a, b).comparableBodyFat, false);
  for (const date of ['', '2026-02-30', '2027-01-01']) assert.throws(() => saveCheckIn(store, result(), date, now));
  assert.throws(() => saveCheckIn(store, result(NaN), '2026-10-05', now));
});
test('storage failures and corrupt data never masquerade as successful saves or erase old data', () => {
  const store = storage();
  store.setItem(HISTORY_KEY, '{bad JSON');
  assert.throws(() => saveCheckIn(store, result(), '2026-10-05', now));
  assert.equal(store.getItem(HISTORY_KEY), '{bad JSON');
  assert.throws(() => saveCheckIn({ getItem: () => null, setItem: () => { throw new Error('Quota'); } }, result(), '2026-10-05', now));
});
