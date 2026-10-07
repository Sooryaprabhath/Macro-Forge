export const HISTORY_KEY = 'macroforge:checkins:v1';
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function validDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = date.split('-').map(Number);
  const parsed = new Date(y, m - 1, d);
  return parsed.getFullYear() === y && parsed.getMonth() === m - 1 && parsed.getDate() === d;
}
export function validCheckIn(row) {
  return row && typeof row.id === 'string' && validDate(row.date) && Number.isFinite(Date.parse(row.createdAt)) &&
    Number.isFinite(row.weight) && row.weight >= 30 && row.weight <= 300 &&
    Number.isFinite(row.bodyFat) && row.bodyFat >= 0 && row.bodyFat <= 100 &&
    Number.isFinite(row.calories) && row.calories > 0 &&
    ['manual', 'visual', 'formula'].includes(row.source) && ['male', 'female'].includes(row.sex) &&
    ['cut', 'maintain', 'bulk'].includes(row.goal);
}
export function readHistory(storage) {
  const raw = storage.getItem(HISTORY_KEY);
  if (!raw) return [];
  const data = JSON.parse(raw);
  if (data.version !== 1 || !Array.isArray(data.checkins) || !data.checkins.every(validCheckIn)) {
    throw new Error('Invalid saved check-ins');
  }
  return data.checkins.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
}
export function saveCheckIn(storage, result, date, now = new Date()) {
  if (!validDate(date) || date > localDate(now)) throw new Error('Choose today or an earlier check-in date.');
  const checkins = readHistory(storage);
  const row = {
    id: crypto.randomUUID(), date, createdAt: now.toISOString(),
    weight: result.input.weight, bodyFat: result.bodyFat, calories: result.calories,
    source: result.input.bodyFatSource || (result.bfKnown ? 'manual' : 'formula'),
    sex: result.input.sex, goal: result.input.goal,
  };
  if (!validCheckIn(row)) throw new Error('Generate a valid plan before saving a check-in.');
  const same = checkins.find((old) => ['date', 'weight', 'bodyFat', 'calories', 'source', 'sex', 'goal'].every((k) => old[k] === row[k]));
  if (same) return { checkins, duplicate: true, id: same.id };
  const next = [...checkins, row].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  // Write before reporting success. An unavailable/full store must never look saved.
  storage.setItem(HISTORY_KEY, JSON.stringify({ version: 1, checkins: next }));
  return { checkins: next, duplicate: false, id: row.id };
}
export function compareCheckIns(before, after) {
  return {
    weight: Math.round((after.weight - before.weight) * 10) / 10,
    bodyFat: Math.round((after.bodyFat - before.bodyFat) * 10) / 10,
    calories: after.calories - before.calories,
    comparableBodyFat: before.source === after.source && before.sex === after.sex,
  };
}
