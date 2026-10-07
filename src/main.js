import './style.css';
import { createBackground } from './scene.js';
import { createMacroRing, MACRO_COLORS } from './ring3d.js';
import { calculate, paceHint } from './calc.js';
import { allowedFoods, buildSampleDay, coachTips, foodGuide, supplements, REGIONS, regionInfo, FOOD_GUIDE_SECTIONS } from './foods.js';

import { createProgress } from './progress.js';
import { bodyErrors } from './validation.js';
import { renderBodyFatCards } from './bodyfat.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const STORE = 'macroforge:v1';

const bg = createBackground($('#bg'));
let ring = null;
let progress = null;

const state = {
  hUnit: 'cm',
  step: 0,
  sex: 'male',
  activity: '1.55',
  style: 'strength',
  goal: 'maintain',
  pace: 'moderate',
  diet: 'omnivore',
  carbStyle: 'balanced',
  seed: 1,
  bodyFatSource: 'manual',
  sampleDay: null,
  result: null,
};

// ---------- Segmented controls ----------
function setSeg(name, value) {
  const wrap = $(`[data-name="${name}"]`);
  if (!wrap) return;
  $$('button', wrap).forEach((b) => b.classList.toggle('on', b.dataset.v === value));
  state[name] = value;
  if (name === 'sex') {
    renderBodyFatCards($('#bodyFatCards'), value);
    if (state.bodyFatSource === 'visual') {
      $('#bodyFatOn').checked = false;
      $('#bodyFat').disabled = true;
      state.bodyFatSource = 'manual';
      updateBf();
      $('#bodyFatSelection').textContent = 'Guide updated. Select a new range or leave body fat off.';
    }
  }
  if (name === 'goal') onGoal();
  if (name === 'pace') updatePaceHint();
}
$$('[data-name]').forEach((wrap) =>
  wrap.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (btn) setSeg(wrap.dataset.name, btn.dataset.v);
  })
);

function onGoal() {
  document.body.dataset.goal = state.goal;
  bg.setGoal(state.goal);
  $('.pace-field').classList.toggle('disabled', state.goal === 'maintain');
  updatePaceHint();
}
const updatePaceHint = () => ($('#paceHint').textContent = paceHint(state.goal, state.pace));

// ---------- Ranges ----------
const bindRange = (id, fmt = (v) => v) => {
  const input = $(`#${id}`), out = $(`#${id}Out`);
  const update = () => {
    out.textContent = input.disabled ? '—' : fmt(input.value);
    input.style.setProperty('--fill', `${((input.value - input.min) / (input.max - input.min)) * 100}%`);
  };
  input.addEventListener('input', update);
  update();
  return update;
};
bindRange('days');
bindRange('meals');
const updateBf = bindRange('bodyFat', (v) => `${v}%`);
$('#bodyFatOn').addEventListener('change', (e) => {
  $('#bodyFat').disabled = !e.target.checked;
  state.bodyFatSource = 'manual';
  syncBodyFatSelection();
  updateBf();
});

// ---------- Region and approximate visual body-fat guide ----------
$('#region').innerHTML = Object.entries(REGIONS).map(([value, r]) => `<option value="${value}">${r.label}</option>`).join('');
const updateRegion = () => { $('#regionHint').textContent = regionInfo($('#region').value).note; };
$('#region').addEventListener('change', updateRegion);
updateRegion();
renderBodyFatCards($('#bodyFatCards'), state.sex);
function syncBodyFatSelection() {
  $$('#bodyFatCards button').forEach((b) => b.setAttribute('aria-pressed', String(
    $('#bodyFatOn').checked && state.bodyFatSource === 'visual' && b.dataset.bf === $('#bodyFat').value
  )));
  $('#bodyFatSelection').textContent = !$('#bodyFatOn').checked ? 'Body fat is off. The planner will use a formula estimate.'
    : state.bodyFatSource === 'visual' ? `Using an approximate visual estimate of ${$('#bodyFat').value}%. You can fine-tune the slider.`
    : `Using your entered value of ${$('#bodyFat').value}%.`;
}
$('#bodyFatCards').addEventListener('click', (e) => {
  const button = e.target.closest('[data-bf]');
  if (!button) return;
  $('#bodyFatOn').checked = true;
  $('#bodyFat').disabled = false;
  $('#bodyFat').value = button.dataset.bf;
  state.bodyFatSource = 'visual';
  updateBf();
  syncBodyFatSelection();
});
$('#bodyFat').addEventListener('input', syncBodyFatSelection);

// ---------- Units ----------
function heightCm() {
  const num = (id) => parseFloat($(`#${id}`).value);
  if (state.hUnit === 'ft') return (num('heightFt') * 12 + num('heightFtIn')) * 2.54;
  return num('heightCm');
}
const formatHeight = (cm) => {
  if (state.hUnit === 'ft') {
    const t = Math.round(cm / 2.54);
    return `${Math.floor(t / 12)}′${t % 12}″`;
  }
  return `${Math.round(cm)} cm`;
};

function syncUnitUI() {
  document.body.dataset.hunit = state.hUnit;
  $$('.u-height').forEach((e) => (e.textContent = state.hUnit === 'ft' ? 'ft / in' : 'cm'));
  $$('[data-unit="height"] button').forEach((b) => b.classList.toggle('on', b.dataset.v === state.hUnit));
}

function setHeightUnit(unit, convert = true) {
  const prev = state.hUnit;
  const cm = heightCm();
  state.hUnit = unit === 'ft' ? 'ft' : 'cm';
  const changed = convert && prev !== state.hUnit;
  if (changed && Number.isFinite(cm)) {
    const totalIn = cm / 2.54;
    if (state.hUnit === 'cm') $('#heightCm').value = Math.round(cm);
    if (state.hUnit === 'ft') {
      const rounded = Math.round(totalIn);
      $('#heightFt').value = Math.floor(rounded / 12);
      $('#heightFtIn').value = rounded % 12;
    }
  }
  if (changed && !Number.isFinite(cm)) {
    ['heightCm', 'heightFt', 'heightFtIn'].forEach((id) => { $(`#${id}`).value = ''; });
  }
  syncUnitUI();
  if (convert) updateWizardValidation();
}
$('[data-unit="height"]').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) setHeightUnit(b.dataset.v);
});

// ---------- Wizard ----------
const steps = $$('.step');
function scrollToPlanner() {
  const heading = $('.step.active legend');
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
  // Wait for the new fieldset to affect layout, including a shorter next step.
  requestAnimationFrame(() => {
    const headerBottom = $('.nav').getBoundingClientRect().bottom;
    const top = $('#form').getBoundingClientRect().top + window.scrollY - headerBottom - 12;
    window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
  });
}
function showStep(i, scroll = true) {
  state.step = i;
  steps.forEach((s, k) => s.classList.toggle('active', k === i));
  $$('#stepsNav li').forEach((li, k) => {
    li.classList.toggle('active', k === i);
    li.classList.toggle('done', k < i);
    if (k === i) li.setAttribute('aria-current', 'step');
    else li.removeAttribute('aria-current');
  });
  $('#progressBar').style.width = `${((i + 1) / steps.length) * 100}%`;
  $('#prevBtn').disabled = i === 0;
  $('#nextBtn').innerHTML = i === steps.length - 1 ? 'Generate plan <i>⚡</i>' : 'Next <i>→</i>';
  updateWizardValidation();
  if (scroll) scrollToPlanner();
}
$$('#stepsNav li').forEach((li, k) =>
  li.addEventListener('click', () => {
    if (k <= state.step) showStep(k);
    else if (validate()) {
      if (k === state.step + 1) showStep(k);
      else toast('Complete each step in order');
    }
  })
);
$('#prevBtn').addEventListener('click', () => showStep(Math.max(0, state.step - 1)));
$('#nextBtn').addEventListener('click', () => {
  if (!validate()) return;
  if (state.step < steps.length - 1) showStep(state.step + 1);
  else generate(true);
});

function readInput() {
  const num = (id) => parseFloat($(`#${id}`).value);
  const height = heightCm();
  const target = num('target');
  return {
    sex: state.sex,
    age: num('age'),
    weight: num('weight'),
    height,
    bodyFat: $('#bodyFatOn').checked ? num('bodyFat') : NaN,
    activity: parseFloat(state.activity),
    days: num('days'),
    style: state.style,
    goal: state.goal,
    pace: state.pace,
    target: Number.isFinite(target) ? target : NaN,
    diet: state.diet,
    region: $('#region').value,
    bodyFatSource: $('#bodyFatOn').checked ? state.bodyFatSource : 'formula',
    meals: num('meals'),
    carbStyle: state.carbStyle,
  };
}

const bodyFields = ['age', 'weight', 'heightCm', 'heightFt', 'heightFtIn'];
const touched = new Set();
function currentErrors() {
  return bodyErrors(Object.fromEntries(bodyFields.map((id) => [id, $(`#${id}`).value])), state.hUnit);
}
function updateWizardValidation(reveal = false) {
  const errors = currentErrors();
  bodyFields.forEach((id) => {
    const input = $(`#${id}`);
    const message = (reveal || touched.has(id)) ? errors[id] || '' : '';
    input.classList.toggle('err', !!message);
    input.setAttribute('aria-invalid', String(!!message));
    $(`#${id}Error`).textContent = message;
  });
  const targetInvalid = state.step >= 2 && !$('#target').validity.valid;
  $('#nextBtn').disabled = !!Object.keys(errors).length || targetInvalid;
  $('#wizardStatus').textContent = Object.keys(errors).length ? 'Enter a valid age, weight and height to continue. Body fat is optional.'
    : targetInvalid ? 'Enter a target weight between 30 and 300 kg, or leave it empty.' : '';
  return !$('#nextBtn').disabled;
}
$('#form').addEventListener('submit', (e) => e.preventDefault());
$('#form').addEventListener('input', (e) => {
  touched.add(e.target.id);
  updateWizardValidation();
});
$('#form').addEventListener('focusout', (e) => {
  touched.add(e.target.id);
  updateWizardValidation();
});
function validate() {
  const valid = updateWizardValidation(true);
  if (!valid) {
    if (Object.keys(currentErrors()).length) showStep(0);
    toast('Please complete the required details with valid values');
  }
  return valid;
}

function toast(msg) {
  let t = $('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 2400);
}

// ---------- Rendering ----------
const fmtW = (kg, d = 1) => `${kg.toFixed(d)} kg`;

function countUp(el, to, dur = 1200) {
  const from = parseFloat(el.dataset.v || 0);
  el.dataset.v = to;
  const start = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - start) / dur);
    const e = 1 - Math.pow(1 - p, 4);
    el.textContent = Math.round(from + (to - from) * e).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function generate(scroll) {
  if (!validate()) return;
  const input = readInput();
  const r = calculate(input);
  state.result = r;
  try {
    localStorage.setItem(STORE, JSON.stringify({ ...state, result: null, sampleDay: null, inputs: snapshotInputs() }));
  } catch { /* Storage may be unavailable in private browsing. */ }

  $('#results').classList.remove('hidden');
  $('.nav-results').classList.remove('hidden');
  if (!ring) ring = createMacroRing($('#ring3d'));
  ring.set(r);
  bg.pulse();

  const goalName = { cut: 'Cutting', maintain: 'Recomp', bulk: 'Lean bulk' }[input.goal];
  $('#resultsTitle').innerHTML = `${goalName} blueprint`;
  $('#resultsSub').textContent = `${input.sex === 'male' ? 'Male' : 'Female'} · ${input.age} y · ${fmtW(input.weight)} · ${formatHeight(input.height)} · ${input.days} training days`;

  countUp($('#kcal'), r.calories);
  $('#bmr').textContent = `${r.bmr.toLocaleString()} kcal`;
  $('#tdee').textContent = `${r.tdee.toLocaleString()} kcal`;
  $('#deltaLabel').textContent = r.delta < 0 ? 'Deficit' : r.delta > 0 ? 'Surplus' : 'Adjustment';
  $('#delta').textContent = `${r.delta > 0 ? '+' : ''}${r.delta} kcal`;

  ['protein', 'carbs', 'fat'].forEach((k) => {
    countUp($(`#${k}`), r[k]);
    const kcal = r[k] * (k === 'fat' ? 9 : 4);
    $(`#${k}Meta`).textContent = `${r.perKg[k]} g/kg · ${kcal.toLocaleString()} kcal · ${Math.round(r.pct[k] * 100)}%`;
    requestAnimationFrame(() => ($(`#${k}Bar`).style.width = `${r.pct[k] * 100}%`));
  });

  $('#legend').innerHTML = ['protein', 'carbs', 'fat']
    .map((k) => `<li><i style="background:${MACRO_COLORS[k]}"></i>${k}<b>${Math.round(r.pct[k] * 100)}%</b></li>`)
    .join('');

  $('#extras').innerHTML = [
    ['Fiber', `${r.fiber} g`, 'min / day'],
    ['Water', `${r.water} L`, 'baseline + training'],
    ['Added sugar', `< ${r.sugarMax} g`, '10% kcal cap'],
    ['Saturated fat', `< ${r.satFatMax} g`, '10% kcal cap'],
    ['Sodium', `${r.sodium.toLocaleString()} mg`, 'upper target'],
    ['Veg & fruit', '5–8', 'servings / day'],
  ]
    .map(([a, b, c]) => `<li><span>${a}</span><b>${b}</b><em>${c}</em></li>`)
    .join('');

  const bmiCat = r.bmi < 18.5 ? 'Under' : r.bmi < 25 ? 'Normal' : r.bmi < 30 ? 'Over' : 'Obese';
  $('#metrics').innerHTML = [
    ['Body fat', `${r.bodyFat}%`, r.input.bodyFatSource === 'visual' ? 'visual estimate' : r.bfKnown ? 'your input' : 'formula estimate'],
    ['Lean mass', fmtW(r.lbm), 'fat-free mass'],
    ['BMI', r.bmi, bmiCat],
    ['FFMI', r.ffmi, r.ffmi > 23 ? 'very muscular' : r.ffmi > 20 ? 'above avg' : 'room to grow'],
    ['Weekly change', `${r.weeklyChange > 0 ? '+' : ''}${fmtW(r.weeklyChange, 2)}`, 'target pace'],
    ['Protein / meal', `${Math.round(r.protein / input.meals)} g`, `${input.meals} meals`],
  ]
    .map(([a, b, c]) => `<li><span>${a}</span><b>${b}</b><em>${c}</em></li>`)
    .join('');

  renderChart(r);
  renderCycle(r);
  renderMeals(r);
  renderFoods(r, $('#foodTabs .on').dataset.t);
  renderSample(r);
  $('#tips').innerHTML = coachTips(r).map((t) => `<li>${t}</li>`).join('');
  $('#supps').innerHTML = supplements(r).map(([a, b]) => `<li><b>${a}</b>${b}</li>`).join('');

  progress?.refresh();
  revealAll();
  if (scroll) setTimeout(() => $('#results').scrollIntoView({ behavior: 'smooth' }), 60);
}

function renderChart(r) {
  const W = 640, H = 230, P = { l: 44, r: 16, t: 18, b: 30 };
  const conv = (kg) => kg;
  const pts = r.projection.map((p) => ({ ...p, w: conv(p.weight) }));
  const target = Number.isFinite(r.input.target) ? conv(r.input.target) : null;
  let min = Math.min(...pts.map((p) => p.w)), max = Math.max(...pts.map((p) => p.w));
  if (target && Math.abs(target - pts[0].w) < (max - min) * 3 + 3) {
    min = Math.min(min, target);
    max = Math.max(max, target);
  }
  const pad = Math.max(0.6, (max - min) * 0.25);
  min -= pad;
  max += pad;
  const x = (i) => P.l + (i / 12) * (W - P.l - P.r);
  const y = (v) => P.t + (1 - (v - min) / (max - min)) * (H - P.t - P.b);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.w).toFixed(1)}`).join(' ');
  const area = `${line} L${x(12)},${H - P.b} L${x(0)},${H - P.b} Z`;
  const yTicks = Array.from({ length: 4 }, (_, i) => min + ((max - min) * (i + 0.5)) / 4);
  const last = pts[12];

  $('#chart').innerHTML = `
  <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <defs>
    </defs>
    ${yTicks.map((v) => `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" class="gridl"/><text x="${P.l - 8}" y="${y(v) + 4}" class="axis" text-anchor="end">${v.toFixed(1)}</text>`).join('')}
    ${[0, 2, 4, 6, 8, 10, 12].map((i) => `<text x="${x(i)}" y="${H - 8}" class="axis" text-anchor="middle">W${i}</text>`).join('')}
    ${target ? `<line x1="${P.l}" x2="${W - P.r}" y1="${y(target)}" y2="${y(target)}" class="target"/><text x="${W - P.r}" y="${y(target) - 6}" class="axis tgt" text-anchor="end">target ${target.toFixed(1)}</text>` : ''}
    <path d="${area}" fill="var(--b)" fill-opacity=".18" class="area"/>
    <path d="${line}" fill="none" stroke="var(--a)" stroke-width="3" stroke-linecap="round" class="line"/>
    ${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.w)}" r="${i % 4 === 0 ? 4.5 : 2.5}" class="pt"><title>Week ${i}: ${p.w.toFixed(1)} · ~${p.bf}% BF</title></circle>`).join('')}
  </svg>
  <div class="chart-foot">
    <span>Start <b>${pts[0].w.toFixed(1)}</b></span>
    <span>Week 12 <b>${last.w.toFixed(1)}</b> kg</span>
    <span>Body fat <b>${pts[0].bf}% → ${last.bf}%</b></span>
  </div>`;

  const pill = $('#etaPill');
  if (r.eta === 'mismatch') pill.textContent = 'Target doesn’t match goal';
  else if (r.eta) pill.textContent = `Target in ~${r.eta} weeks`;
  else pill.textContent = r.input.goal === 'maintain' ? 'Stable weight · body recomposition' : `${r.weeklyChange > 0 ? '+' : ''}${fmtW(r.weeklyChange, 2)} / week`;
}

const macroChips = (m) =>
  `<span class="mc p">P ${m.protein ?? m.p}g</span><span class="mc c">C ${m.carbs ?? m.c}g</span><span class="mc f">F ${m.fat ?? m.f}g</span>`;

function renderCycle(r) {
  if (!r.cycling) {
    $('#cycle').innerHTML = `<p class="muted">${r.input.days === 7 ? 'You train daily — keep the same macros every day.' : 'No training days set — use the same macros every day.'}</p>`;
    return;
  }
  const col = (label, d, n, cls) => `
    <div class="cyc ${cls}">
      <span class="cyc-label">${label}<em>${n}× / week</em></span>
      <b>${d.kcal.toLocaleString()}<small> kcal</small></b>
      <div class="chips">${macroChips(d)}</div>
    </div>`;
  $('#cycle').innerHTML = col('Training day', r.cycling.train, r.input.days, 'tr') + col('Rest day', r.cycling.rest, 7 - r.input.days, 'rs');
}

function renderMeals(r) {
  $('#mealSplit').innerHTML = r.mealSplit
    .map(
      (m, i) => `
    <div class="meal" style="--i:${i}">
      <span class="meal-n">${String(i + 1).padStart(2, '0')}</span>
      <div class="meal-b"><b>${m.name}</b><div class="chips">${macroChips(m)}</div></div>
      <span class="meal-k">${m.kcal}<small>kcal</small></span>
    </div>`
    )
    .join('');
}

function renderFoods(r, tab) {
  const guide = foodGuide(r.input.goal, r.input.diet, r.input.region);
  const g = guide[tab];
  // Browser Print / Save as PDF must include every category, not just this tab.
  $('#printFoodGuide').innerHTML = FOOD_GUIDE_SECTIONS.map(([key, label]) =>
    `<section class="print-food-section"><h3>${label}</h3>${guide[key].map(([title, body]) =>
      `<div class="print-food-entry"><h4>${title}</h4><p>${body}</p></div>`).join('')}</section>`
  ).join('');
  let html = g.map(([a, b]) => `<div class="food ${tab}"><b>${a}</b><p>${b}</p></div>`).join('');
  if (tab === 'eat') {
    const top = allowedFoods(r.input.diet, r.input.region)
      .filter((f) => f.role === 'protein')
      .map((f) => ({ ...f, density: (f.p * 4) / (f.p * 4 + f.c * 4 + f.f * 9) }))
      .sort((a, b) => b.density - a.density);
    html += `<div class="food wide"><b>Best protein sources for your diet</b><div class="tags">${top
      .map((f) => `<span>${f.name}<em>${f.p}g P / 100g</em></span>`)
      .join('')}</div></div>`;
  }
  $('#foodGrid').innerHTML = html;
}
$('#foodTabs').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || !state.result) return;
  $$('#foodTabs button').forEach((x) => x.classList.toggle('on', x === b));
  renderFoods(state.result, b.dataset.t);
});

function renderSample(r) {
  const day = buildSampleDay(r, state.seed);
  state.sampleDay = day;
  $('#sampleRegion').textContent = `${regionInfo(r.input.region).label} · ${r.input.diet} · Weights are cooked / ready-to-eat, except oats and powders (dry). Approximate portions; totals may differ from targets.`;
  const tot = day.reduce((a, m) => ({ p: a.p + m.total.p, c: a.c + m.total.c, f: a.f + m.total.f, kcal: a.kcal + m.total.kcal }), { p: 0, c: 0, f: 0, kcal: 0 });
  $('#sampleDay').innerHTML =
    day
      .map(
        (m) => `
      <div class="sd-meal">
        <div class="sd-head"><b>${m.name}</b><span>${m.total.kcal} kcal</span></div>
        <ul>${m.items.map((it) => `<li><span>${it.name}</span><em>${it.grams} g</em></li>`).join('')}</ul>
        <div class="chips">${macroChips(m.total)}</div>
      </div>`
      )
      .join('') +
    `<div class="sd-total"><span>Day total</span><b>${tot.kcal.toLocaleString()} kcal</b><div class="chips">${macroChips(tot)}</div><em>Target ${r.calories.toLocaleString()} kcal · P${r.protein} C${r.carbs} F${r.fat}</em></div>`;
}
$('#shuffleBtn').addEventListener('click', () => {
  if (!state.result) return;
  state.seed = Math.floor(Math.random() * 1e9);
  renderSample(state.result);
  try {
    const saved = JSON.parse(localStorage.getItem(STORE));
    if (saved) localStorage.setItem(STORE, JSON.stringify({ ...saved, seed: state.seed }));
  } catch { /* The current plan and export still work if storage is unavailable. */ }
});

$('#editBtn').addEventListener('click', () => showStep(0));
$('#printBtn').addEventListener('click', async () => {
  if (!state.result || !state.sampleDay) return;
  const button = $('#printBtn');
  const result = state.result;
  const day = state.sampleDay;
  button.disabled = true;
  button.textContent = 'Preparing PDF…';
  $('#exportStatus').textContent = 'Preparing your current plan and sample meals…';
  try {
    const { createPlanPdf } = await import('./pdf.js');
    const doc = createPlanPdf(result, day);
    doc.save(`MacroForge-${result.input.goal}-${result.input.region}-${new Date().toISOString().slice(0, 10)}.pdf`);
    $('#exportStatus').textContent = 'PDF download started. It contains your last generated plan and displayed sample day.';
  } catch (error) {
    console.error('PDF export failed', error);
    $('#exportStatus').textContent = 'Could not create the PDF. Please try downloading again.';
  } finally {
    button.disabled = false;
    button.textContent = 'Download PDF';
  }
});

// ---------- Persistence ----------
const INPUT_IDS = ['age', 'weight', 'heightCm', 'heightFt', 'heightFtIn', 'bodyFat', 'days', 'target', 'meals', 'region'];
function snapshotInputs() {
  return Object.fromEntries([...INPUT_IDS.map((id) => [id, $(`#${id}`).value]), ['bodyFatOn', $('#bodyFatOn').checked]]);
}
function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE));
    if (!saved) return false;
    if (saved.wUnit && saved.wUnit !== 'kg') return false;
    setHeightUnit(saved.hUnit, false);
    state.seed = Number.isInteger(saved.seed) ? saved.seed : 1;
    Object.entries(saved.inputs || {}).forEach(([id, v]) => {
      const el = $(`#${id}`);
      if (!el) return;
      if (el.type === 'checkbox') el.checked = v;
      else el.value = v;
    });
    $('#bodyFat').disabled = !$('#bodyFatOn').checked;
    ['sex', 'activity', 'style', 'goal', 'pace', 'diet', 'carbStyle'].forEach((k) => saved[k] && setSeg(k, saved[k]));
    updateRegion();
    $$('input[type=range]').forEach((el) => el.dispatchEvent(new Event('input')));
    state.bodyFatSource = saved.bodyFatSource === 'visual' ? 'visual' : 'manual';
    syncBodyFatSelection();
    return true;
  } catch {
    return false;
  }
}

// ---------- Micro-interactions ----------
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('in')),
  { threshold: 0.12 }
);
function revealAll() {
  $$('.glass, .section-head').forEach((el) => io.observe(el));
}
revealAll();

document.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const el = e.target.closest('.tilt, .tile');
  $$('.tilting').forEach((x) => x !== el && (x.classList.remove('tilting'), (x.style.transform = '')));
  if (!el) return;
  const b = el.getBoundingClientRect();
  const px = (e.clientX - b.left) / b.width - 0.5, py = (e.clientY - b.top) / b.height - 0.5;
  el.classList.add('tilting');
  el.style.setProperty('--mx', `${(px + 0.5) * 100}%`);
  el.style.setProperty('--my', `${(py + 0.5) * 100}%`);
  if (el.classList.contains('tilt')) el.style.transform = `perspective(900px) rotateX(${-py * 8}deg) rotateY(${px * 10}deg) translateY(-4px)`;
});

// ---------- Init ----------
progress = createProgress(() => state.result, () => showStep(0));
syncUnitUI();
const hadSaved = restore();
onGoal();
showStep(0, false);
if (hadSaved) generate(false);
