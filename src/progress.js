import { readHistory, saveCheckIn, localDate, compareCheckIns } from './history.js';
const sourceNames = { manual: 'User-entered', visual: 'Visual estimate', formula: 'Formula estimate' };
const goalNames = { cut: 'Cut', maintain: 'Recomp', bulk: 'Bulk' };
const dateLabel = (value) => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const signed = (value, digits = 1) => `${value > 0 ? '+' : ''}${value.toFixed(digits)}`;

export function createProgress(getResult, editMeasurements) {
  const $ = (selector) => document.querySelector(selector);
  let checkins = [], failed = false;
  const status = (message) => { $('#checkinStatus').textContent = message; };
  $('#checkinDate').value = localDate();
  $('#checkinDate').max = localDate();
  function compare() {
    const before = checkins.find((row) => row.id === $('#compareFrom').value);
    const after = checkins.find((row) => row.id === $('#compareTo').value);
    if (!before || !after) return;
    const change = compareCheckIns(before, after);
    $('#comparisonSummary').textContent = `Changes from ${dateLabel(before.date)} to ${dateLabel(after.date)}. A plus means an increase; a minus means a decrease.`;
    $('#comparisonValues').innerHTML = [
      ['Weight', `${signed(change.weight)} kg`, `${before.weight} → ${after.weight} kg`],
      ['Body fat estimate', change.comparableBodyFat ? `${signed(change.bodyFat)} pp` : 'Different methods', `${before.bodyFat}% → ${after.bodyFat}%`],
      ['Calorie target', `${signed(change.calories, 0)} kcal`, `${before.calories} → ${after.calories} kcal/day`],
    ].map(([label, value, detail]) => `<li><span>${label}</span><b>${value}</b><em>${detail}</em></li>`).join('');
    $('#comparisonNote').textContent = change.comparableBodyFat
      ? 'Body fat is approximate; pp means percentage points. Calorie targets are planned intake, not recorded food consumption. Changes in your settings also affect targets.'
      : 'Body-fat methods or sex settings differ between these check-ins, so a body-fat change is not shown. Weight and calorie targets can still be compared.';
  }
  function render() {
    $('#checkinCount').textContent = `${checkins.length} saved check-in${checkins.length === 1 ? '' : 's'}`;
    $('#historyEmpty').hidden = checkins.length > 0;
    $('#historyRecords').hidden = !checkins.length;
    $('#comparison').hidden = checkins.length < 2;
    $('#oneCheckin').hidden = checkins.length !== 1;
    $('#backupCheckins').disabled = !checkins.length;
    $('#historyRows').replaceChildren();
    [...checkins].reverse().forEach((row) => {
      const tr = document.createElement('tr');
      [dateLabel(row.date), `${row.weight} kg`, `${row.bodyFat}% · ${sourceNames[row.source]}`, `${row.calories} kcal`, goalNames[row.goal]].forEach((value) => {
        const td = document.createElement('td'); td.textContent = value; tr.append(td);
      });
      $('#historyRows').append(tr);
    });
    for (const [selector, initial] of [['#compareFrom', 0], ['#compareTo', checkins.length - 1]]) {
      const select = $(selector), previous = select.value;
      select.replaceChildren();
      checkins.forEach((row, i) => {
        const option = document.createElement('option');
        option.value = row.id; option.textContent = `${dateLabel(row.date)} · ${row.weight} kg · check-in ${i + 1}`;
        select.append(option);
      });
      select.value = checkins.some((row) => row.id === previous) ? previous : checkins[initial]?.id || '';
    }
    compare();
  }
  function refresh() {
    try { checkins = readHistory(window.localStorage); failed = false; }
    catch { failed = true; status('Saved check-ins could not be read. Check browser storage permissions. Existing data has not been replaced.'); }
    $('#saveCheckin').disabled = !getResult() || failed;
    const result = getResult();
    $('#checkinPreview').textContent = result
      ? `Current plan: ${result.input.weight} kg · ${result.bodyFat}% body fat (${sourceNames[result.input.bodyFatSource] || 'estimate'}) · ${result.calories} kcal/day. Update your details and generate a plan before saving new measurements.`
      : 'Generate your first plan above, then save it as your starting check-in.';
    render();
  }
  $('#saveCheckin').addEventListener('click', () => {
    const result = getResult();
    if (!result || failed) return;
    const date = $('#checkinDate');
    date.max = localDate();
    if (!date.reportValidity()) return;
    try {
      const saved = saveCheckIn(window.localStorage, result, date.value);
      checkins = saved.checkins;
      render();
      if (!saved.duplicate) { $('#compareTo').value = saved.id; compare(); }
      status(saved.duplicate ? 'These values are already saved for that date. No duplicate was added.' : `Check-in saved for ${dateLabel(date.value)}. Your earlier check-ins are preserved.`);
    } catch { status('Check-in was not saved. Browser storage may be blocked or full, or the date may be invalid. Your earlier check-ins are unchanged.'); }
  });
  $('#compareFrom').addEventListener('change', compare);
  $('#compareTo').addEventListener('change', compare);
  $('#updateMeasurements').addEventListener('click', editMeasurements);
  $('#backupCheckins').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ version: 1, checkins }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `MacroForge-checkins-${localDate()}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status('Check-in data downloaded as JSON. Keep it as a personal record; in-app backup import is not available.');
  });
  window.addEventListener('storage', (event) => { if (event.key === 'macroforge:checkins:v1' || event.key === null) refresh(); });
  refresh();
  return { refresh };
}
