import { jsPDF } from 'jspdf';
import { foodGuide, regionInfo, coachTips, supplements } from './foods.js';

// Built from the result snapshot, never animated DOM values or WebGL canvases.
const clean = (value) => String(value).replace(/[–—‑−]/g, '-').replace(/[‘’]/g, "'")
  .replace(/[“”]/g, '"').replace(/→/g, '->').replace(/≈/g, '~').replace(/×/g, 'x').replace(/[^\x20-\x7e\n]/g, ' ');
export function shoppingList(day) {
  const items = new Map();
  day.forEach((meal) => meal.items.forEach((item) => items.set(item.name, (items.get(item.name) || 0) + item.grams)));
  return [...items].sort(([a], [b]) => a.localeCompare(b));
}
export function createPlanPdf(r, day, date = new Date()) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: 'MacroForge nutrition blueprint', subject: 'Daily targets and regional sample meals', creator: 'MacroForge' });
  const left = 18, width = 174, bottom = 274;
  let y = 0;
  const ink = '#18202d', muted = '#546071', accent = '#5942b4';
  const text = (value, x, yy, size = 10, bold = false, color = ink, options = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size); doc.setTextColor(color);
    doc.text(clean(value), x, yy, options);
  };
  const pageHeader = (section) => {
    doc.setFillColor(ink); doc.rect(0, 0, 210, 29, 'F');
    text('MacroForge', left, 14, 18, true, '#ffffff');
    text(section, left, 22, 8, false, '#d7d0f4');
    text(date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), 192, 14, 9, false, '#ffffff', { align: 'right' });
    y = 41;
  };
  const newPage = (section) => { doc.addPage(); pageHeader(section); };
  const ensure = (height, section = 'Your blueprint / continued') => { if (y + height > bottom) newPage(section); };
  const heading = (title) => { ensure(17); text(title, left, y, 15, true); y += 9; };
  const paragraph = (value, { size = 10, color = muted, gap = 4 } = {}) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(size);
    const lines = doc.splitTextToSize(clean(value), width);
    const lineHeight = size * .46;
    for (const line of lines) { ensure(lineHeight); text(line, left, y, size, false, color); y += lineHeight; }
    y += gap;
  };
  const table = (headers, rows, columns) => {
    const row = (cells, header = false) => {
      doc.setFont('helvetica', header ? 'bold' : 'normal'); doc.setFontSize(9);
      const lines = cells.map((c, i) => doc.splitTextToSize(clean(c), columns[i] - 6));
      const height = Math.max(...lines.map((l) => l.length)) * 4.5 + 5;
      if (y + height > bottom) { newPage('Your blueprint / continued'); if (!header) row(headers, true); }
      doc.setFillColor(header ? '#eeeaf8' : '#f5f6f8'); doc.rect(left, y - 4, width, height, 'F');
      let x = left;
      lines.forEach((ls, i) => { ls.forEach((l, k) => text(l, x + 3, y + 1 + k * 4.5, 9, header)); x += columns[i]; });
      y += height + 1;
    };
    row(headers, true); rows.forEach((cells) => row(cells)); y += 5;
  };
  const goal = { cut: 'Cutting', maintain: 'Recomposition', bulk: 'Lean bulk' }[r.input.goal];
  const source = r.input.bodyFatSource === 'visual' ? 'rough visual estimate' : r.bfKnown ? 'user-entered value' : 'BMI-based formula estimate';
  pageHeader('YOUR NUTRITION BLUEPRINT');
  heading(`${goal} / daily targets`);
  paragraph(`${r.input.sex} | ${r.input.age} years | ${r.input.weight} kg | ${Math.round(r.input.height)} cm | ${r.input.days} training days per week`);
  paragraph(`${regionInfo(r.input.region).label} | ${r.input.diet} | ${r.input.meals} meals | ${r.input.carbStyle} | ${r.input.pace} pace`);
  doc.setFillColor('#eeeaf8'); doc.roundedRect(left, y - 2, width, 31, 3, 3, 'F');
  [[`${r.calories}`, 'kcal / day'], [`${r.protein} g`, 'protein'], [`${r.carbs} g`, 'carbs'], [`${r.fat} g`, 'fat']].forEach(([v, label], i) => {
    text(v, left + 8 + i * 43, y + 11, 20, true, accent);
    text(label, left + 8 + i * 43, y + 21, 9, false, muted);
  });
  y += 41;
  table(['Energy & body metrics', 'Estimate'], [
    ['Basal metabolic rate', `${r.bmr} kcal / day`], ['Maintenance energy', `${r.tdee} kcal / day`],
    ['Daily calorie adjustment', `${r.delta > 0 ? '+' : ''}${r.delta} kcal`],
    ['Body fat', `${r.bodyFat}% (${source})`], ['Lean mass / BMI / FFMI', `${r.lbm} kg / ${r.bmi} / ${r.ffmi}`],
  ], [85, 89]);
  heading('Daily essentials');
  paragraph(`Fiber ${r.fiber} g | Water ${r.water} L | Added sugar under ${r.sugarMax} g | Saturated fat under ${r.satFatMax} g | Sodium ${r.sodium} mg`);
  heading('Training & rest days');
  if (r.cycling) table(['Day', 'kcal', 'Protein', 'Carbs', 'Fat'], [
    [`Training (${r.input.days}x)`, ...['kcal', 'protein', 'carbs', 'fat'].map((k) => r.cycling.train[k])],
    [`Rest (${7 - r.input.days}x)`, ...['kcal', 'protein', 'carbs', 'fat'].map((k) => r.cycling.rest[k])],
  ], [54, 30, 30, 30, 30]);
  else paragraph('Use your daily targets every day.');
  paragraph('All macro quantities are grams. Rounded macros and meal targets may not add up exactly to the calorie target. Estimates are a starting point, not a guaranteed outcome.', { size: 9 });

  newPage('PROGRESS / ESTIMATED TRAJECTORY');
  heading('12-week projection');
  paragraph('Illustrative model only. Real weight change depends on intake, training, fluid balance and individual response. Body-fat values inherit the uncertainty of your starting estimate.');
  table(['Week', 'Weight (kg)', 'Body fat (%)'], r.projection.map((p) => [p.week, p.weight, p.bf]), [58, 58, 58]);
  paragraph(`Target pace: ${r.weeklyChange > 0 ? '+' : ''}${r.weeklyChange} kg / week.`);
  if (Number.isFinite(r.input.target)) paragraph(`Target weight: ${r.input.target} kg. ${r.eta === 'mismatch' ? 'This target does not match the selected goal.' : r.eta ? `Estimated time: ${r.eta} weeks.` : 'No weight-change timeline for this goal.'}`);

  newPage('MEALS / YOUR CURRENT SAMPLE DAY');
  heading('Your meal targets');
  table(['Meal', 'kcal', 'Protein', 'Carbs', 'Fat'], r.mealSplit.map((m) => [m.name, m.kcal, m.protein, m.carbs, m.fat]), [74, 25, 25, 25, 25]);
  heading('Sample day of eating');
  paragraph(`${regionInfo(r.input.region).label}. Food weights are cooked / ready-to-eat unless marked dry; protein powders are dry. Brand and recipe values vary.`, { size: 9 });
  day.forEach((meal) => {
    ensure(24 + meal.items.length * 10, 'MEALS / CONTINUED');
    text(meal.name, left, y, 12, true, accent); y += 7;
    table(['Food', 'Portion'], meal.items.map((it) => [it.name, `${it.grams} g`]), [140, 34]);
    paragraph(`${meal.total.kcal} kcal | P ${meal.total.p} g | C ${meal.total.c} g | F ${meal.total.f} g`, { size: 9, gap: 7 });
  });
  const total = day.reduce((sum, meal) => Object.fromEntries(Object.keys(sum).map((key) => [key, sum[key] + meal.total[key]])), { kcal: 0, p: 0, c: 0, f: 0 });
  ensure(28);
  heading('Sample day total');
  paragraph(`${total.kcal} kcal | P ${total.p} g | C ${total.c} g | F ${total.f} g`);
  paragraph(`Difference from daily target: ${total.kcal - r.calories} kcal, ${total.p - r.protein} g protein, ${total.c - r.carbs} g carbs, ${total.f - r.fat} g fat. Sample meals are approximate.`, { size: 9 });

  newPage('SHOPPING / ONE SAMPLE DAY');
  heading('Your shopping checklist');
  paragraph('Combined quantities for the displayed sample day. These are edible / prepared weights, not raw shopping weights. Convert for cooking yield and pack sizes.');
  table(['Food', 'Total needed'], shoppingList(day).map(([name, grams]) => [name, `${grams} g`]), [140, 34]);

  newPage('FOOD GUIDE / NEXT STEPS');
  heading('Food choices near you');
  const guide = foodGuide(r.input.goal, r.input.diet, r.input.region);
  guide.eat.forEach(([title, body]) => { ensure(28); text(title, left, y, 11, true, accent); y += 6; paragraph(body, { size: 9 }); });
  for (const [key, label] of [['limit', 'Foods to limit'], ['avoid', 'Foods to minimise']]) {
    heading(label);
    guide[key].forEach(([title, body]) => paragraph(`${title}: ${body}`, { size: 9 }));
  }
  heading('Build consistency');
  coachTips(r).forEach((tip) => paragraph(tip, { size: 9 }));
  heading('Supplement notes');
  supplements(r).forEach(([title, body]) => paragraph(`${title}: ${body}`, { size: 9 }));
  heading('About your estimates');
  paragraph(`Body fat: ${r.bodyFat}% (${source}). The body-shape guide is an AI-generated illustration, not a validated measurement tool. Appearance alone cannot determine body fat.`, { size: 9 });
  paragraph('Body composition measurement information: health.clevelandclinic.org/bmi-for-men', { size: 9 });
  doc.link(left, y - 14, width, 12, { url: 'https://health.clevelandclinic.org/bmi-for-men' });
  paragraph('Nutrition estimates only, not medical advice. Re-check progress every 2-3 weeks. Use trends in weight, strength and measurements to review your plan.', { size: 9 });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setDrawColor('#dce0e7'); doc.line(left, 282, 192, 282);
    text('MacroForge | Personal nutrition blueprint', left, 288, 8, false, muted);
    text(`${page} / ${pages}`, 192, 288, 8, false, muted, { align: 'right' });
  }
  return doc;
}
