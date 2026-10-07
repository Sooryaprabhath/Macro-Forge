import { jsPDF } from 'jspdf';
import { foodGuide, regionInfo, coachTips, supplements, FOOD_GUIDE_SECTIONS } from './foods.js';

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
  const left = 18, width = 174, bottom = 273;
  let y = 0, currentSection = '', sectionNumber = 0;
  const pageSections = [];
  const ink = '#19202e', muted = '#596575', accent = '#6550b4';
  const colors = { eat: '#28704e', limit: '#906016', avoid: '#a24250' };
  const tints = { eat: '#edf6ef', limit: '#fff5df', avoid: '#fbedef' };
  const text = (value, x, yy, size = 10, bold = false, color = ink, options = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size); doc.setTextColor(color);
    doc.text(clean(value), x, yy, options);
  };
  const wrap = (value, maxWidth = width, size = 10) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(size);
    return doc.splitTextToSize(clean(value), maxWidth);
  };
  const box = (x, yy, w, h, fill, radius = 3) => {
    doc.setFillColor(fill); doc.roundedRect(x, yy, w, h, radius, radius, 'F');
  };
  const pageHeader = (section, continued = false) => {
    currentSection = section;
    pageSections.push(section);
    doc.setFillColor('#c8ed65'); doc.rect(0, 0, 210, 2, 'F');
    box(left, 12, 7, 7, accent, 2);
    text('M', left + 1.65, 17, 9, true, '#ffffff');
    text('MacroForge', left + 10, 17.5, 13, true);
    text(date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), 192, 17, 8.5, false, muted, { align: 'right' });
    doc.setDrawColor('#e0e4e9'); doc.setLineWidth(.25); doc.line(left, 24, 192, 24);
    text(`${String(sectionNumber).padStart(2, '0')}  /  ${section}${continued ? ' / CONTINUED' : ''}`, left, 32, 8, true, accent);
    y = 43;
  };
  const newPage = (section = currentSection, continued = false) => {
    if (!continued) sectionNumber++;
    doc.addPage(); pageHeader(section, continued);
  };
  const ensure = (height) => { if (y + height > bottom) newPage(currentSection, true); };
  const heading = (title, color = accent, tint = '#f1eef9') => {
    ensure(40);
    box(left, y - 4, width, 12, tint);
    doc.setFillColor(color); doc.rect(left, y - 2, 1, 8, 'F');
    text(title, left + 5, y + 3.5, 12, true, color); y += 16;
  };
  const paragraph = (value, { size = 10, color = muted, gap = 4 } = {}) => {
    const lines = wrap(value, width, size), lineHeight = size * .46;
    for (const line of lines) { ensure(lineHeight); text(line, left, y, size, false, color); y += lineHeight; }
    y += gap;
  };
  const note = (value) => {
    const lines = wrap(value, width - 12, 9), height = lines.length * 4.3 + 10;
    ensure(height + 4);
    box(left, y - 3, width, height, '#f3f5f7');
    lines.forEach((line, i) => text(line, left + 6, y + 3 + i * 4.3, 9, false, muted));
    y += height + 4;
  };
  const table = (headers, rows, columns, { checklist = false, compact = false } = {}) => {
    let stripe = 0;
    const row = (cells, header = false) => {
      doc.setFont('helvetica', header ? 'bold' : 'normal'); doc.setFontSize(9);
      const lines = cells.map((c, i) => doc.splitTextToSize(clean(c), columns[i] - (checklist && i === 0 ? 15 : 8)));
      const height = Math.max(...lines.map((l) => l.length)) * 4.3 + (compact ? 2 : 4);
      if (y + height > bottom) { newPage(currentSection, true); if (!header) row(headers, true); }
      doc.setFillColor(header ? ink : stripe++ % 2 ? '#f5f6f9' : '#ffffff');
      doc.rect(left, y - 4, width, height, 'F');
      let x = left;
      if (checklist && !header) { doc.setDrawColor('#a8afba'); doc.setLineWidth(.25); doc.roundedRect(left + 4, y - 1.6, 3, 3, .5, .5, 'S'); }
      lines.forEach((ls, i) => {
        const rightAligned = i > 0 && columns.length > 2;
        ls.forEach((l, k) => text(l, rightAligned ? x + columns[i] - 4 : x + (checklist && !header && i === 0 ? 11 : 4), y + 1 + k * 4.3, 9, header, header ? '#ffffff' : ink, rightAligned ? { align: 'right' } : {}));
        x += columns[i];
      });
      y += height;
    };
    ensure(20); row(headers, true); rows.forEach((cells) => row(cells)); y += 7;
  };
  const guideEntry = (title, body, color = accent) => {
    const lines = wrap(body, width - 8, 9.5);
    ensure(9 + lines.length * 4.4 + 5);
    text(title, left + 4, y, 10.5, true, color); y += 6;
    lines.forEach((line) => { text(line, left + 4, y, 9.5, false, muted); y += 4.4; });
    y += 5;
  };
  const goal = { cut: 'Cutting', maintain: 'Recomposition', bulk: 'Lean bulk' }[r.input.goal];
  const source = r.input.bodyFatSource === 'visual' ? 'rough visual estimate' : r.bfKnown ? 'user-entered value' : 'BMI-based formula estimate';
  sectionNumber = 1;
  pageHeader('YOUR DAILY BLUEPRINT');
  text('A plan built around you.', left, y + 2, 25, true); y += 13;
  paragraph(`${goal} / ${r.input.meals} meals / ${r.input.days} training days per week`, { size: 11 });
  paragraph(`${r.input.sex} | ${r.input.age} years | ${r.input.weight} kg | ${Math.round(r.input.height)} cm`, { size: 9.5, gap: 2 });
  paragraph(`${regionInfo(r.input.region).label} | ${r.input.diet} | ${r.input.carbStyle} | ${r.input.pace} pace`, { size: 9.5, gap: 7 });
  box(left, y - 2, width, 38, ink);
  text('DAILY ENERGY', left + 7, y + 7, 8, true, '#d0c8ed');
  text(r.calories.toLocaleString('en-US'), left + 7, y + 25, 32, true, '#d6f58e');
  text('kcal / day', left + 67, y + 24, 10, false, '#ffffff');
  text(goal, left + width - 7, y + 12, 13, true, '#ffffff', { align: 'right' });
  text('Your starting target', left + width - 7, y + 21, 9, false, '#c1c8d5', { align: 'right' });
  y += 43;
  const cards = [['Protein', r.protein, '#28704e', '#edf6ef'], ['Carbs', r.carbs, accent, '#f1eef9'], ['Fat', r.fat, '#906016', '#fff5df']];
  cards.forEach(([label, value, color, tint], i) => {
    const x = left + i * 59;
    box(x, y, 56, 25, tint);
    text(label.toUpperCase(), x + 5, y + 7, 8, true, color);
    text(`${value} g`, x + 5, y + 19, 20, true, color);
  });
  y += 34;
  table(['Energy & body metrics', 'Estimate'], [
    ['Basal metabolic rate', `${r.bmr} kcal / day`], ['Maintenance energy', `${r.tdee} kcal / day`],
    ['Daily calorie adjustment', `${r.delta > 0 ? '+' : ''}${r.delta} kcal`],
    ['Body fat', `${r.bodyFat}% (${source})`], ['Lean mass / BMI / FFMI', `${r.lbm} kg / ${r.bmi} / ${r.ffmi}`],
  ], [85, 89]);
  heading('Daily essentials');
  paragraph(`Fiber ${r.fiber} g | Water ${r.water} L | Added sugar under ${r.sugarMax} g | Saturated fat under ${r.satFatMax} g | Sodium ${r.sodium} mg`);
  note('Macro quantities are in grams. Rounding can cause small differences between calories and macro totals. Start here and review your real-world progress.');

  newPage('PROGRESS / ESTIMATED TRAJECTORY');
  heading('12-week projection');
  paragraph('Illustrative model only. Real weight change depends on intake, training, fluid balance and individual response. Body-fat values inherit the uncertainty of your starting estimate.');
  const plotTop = y + 4, plotHeight = 42, plotLeft = left + 14, plotWidth = width - 22;
  box(left, y - 2, width, 65, '#f5f6f9');
  const weights = r.projection.map((p) => p.weight);
  const low = Math.min(...weights) - .5, high = Math.max(...weights) + .5;
  const point = (p, i) => [plotLeft + i / (r.projection.length - 1) * plotWidth, plotTop + (high - p.weight) / (high - low) * plotHeight];
  [0, .5, 1].forEach((fraction) => {
    const yy = plotTop + fraction * plotHeight;
    doc.setDrawColor('#dce0e7'); doc.setLineWidth(.2); doc.line(plotLeft, yy, plotLeft + plotWidth, yy);
    text((high - fraction * (high - low)).toFixed(1), plotLeft - 3, yy + 1, 7, false, muted, { align: 'right' });
  });
  doc.setDrawColor(accent); doc.setLineWidth(.8);
  r.projection.forEach((p, i) => {
    const [x, yy] = point(p, i);
    if (i) { const [px, py] = point(r.projection[i - 1], i - 1); doc.line(px, py, x, yy); }
    doc.setFillColor(accent); doc.circle(x, yy, .9, 'F');
    if (i % 4 === 0) text(`Week ${p.week}`, x, plotTop + plotHeight + 8, 8, false, muted, { align: 'center' });
  });
  text('Projected weight (kg)', left + 6, y + 59, 8, true, muted);
  y += 74;
  table(['Week', 'Weight (kg)', 'Body fat (%)'], r.projection.map((p) => [p.week, p.weight, p.bf]), [58, 58, 58], { compact: true });
  paragraph(`Target pace: ${r.weeklyChange > 0 ? '+' : ''}${r.weeklyChange} kg / week.`);
  if (Number.isFinite(r.input.target)) paragraph(`Target weight: ${r.input.target} kg. ${r.eta === 'mismatch' ? 'This target does not match the selected goal.' : r.eta ? `Estimated time: ${r.eta} weeks.` : 'No weight-change timeline for this goal.'}`);

  newPage('MEALS / YOUR SAMPLE DAY');
  heading('Training & rest days');
  if (r.cycling) table(['Day', 'kcal', 'P (g)', 'C (g)', 'F (g)'], [
    [`Training (${r.input.days}x)`, ...['kcal', 'protein', 'carbs', 'fat'].map((k) => r.cycling.train[k])],
    [`Rest (${7 - r.input.days}x)`, ...['kcal', 'protein', 'carbs', 'fat'].map((k) => r.cycling.rest[k])],
  ], [54, 30, 30, 30, 30]);
  else paragraph('Use your daily targets every day.');
  heading('Your meal targets');
  table(['Meal', 'kcal', 'P (g)', 'C (g)', 'F (g)'], r.mealSplit.map((m) => [m.name, m.kcal, m.protein, m.carbs, m.fat]), [74, 25, 25, 25, 25]);
  heading('Sample day of eating');
  paragraph(`${regionInfo(r.input.region).label}. Food weights are cooked / ready-to-eat unless marked dry; protein powders are dry. Brand and recipe values vary.`, { size: 9 });
  day.forEach((meal, index) => {
    ensure(34 + (meal.items.length + 1) * 6.3);
    box(left, y - 4, 8, 8, '#eeeaf8', 2);
    text(String(index + 1).padStart(2, '0'), left + 4, y + 1.5, 9, true, accent, { align: 'center' });
    text(meal.name, left + 12, y + 1.5, 12, true);
    text(`${meal.total.kcal} kcal`, left + width, y + 1.5, 10, true, accent, { align: 'right' }); y += 12;
    table(['Food · preparation · source', 'Portion'], meal.items.map((it) => [`${it.name} · ${it.state || 'unknown'} · ${it.sourceName || 'unknown source'} ${it.sourceId || ''}`, `${it.grams} g`]), [140, 34], { compact: true });
    paragraph(`Protein ${meal.total.p} g | Carbs ${meal.total.c} g | Fat ${meal.total.f} g`, { size: 9, gap: 4 });
  });
  const total = day.reduce((sum, meal) => Object.fromEntries(Object.keys(sum).map((key) => [key, sum[key] + meal.total[key]])), { kcal: 0, p: 0, c: 0, f: 0 });
  ensure(28);
  heading('Sample day total');
  paragraph(`${total.kcal} kcal | P ${total.p} g | C ${total.c} g | F ${total.f} g`);
  paragraph(`Difference from daily target: ${total.kcal - r.calories} kcal, ${total.p - r.protein} g protein, ${total.c - r.carbs} g carbs, ${total.f - r.fat} g fat. Sample meals are approximate.`, { size: 9 });

  newPage('SHOPPING / ONE SAMPLE DAY');
  heading('Your shopping checklist');
  paragraph('Combined quantities for the displayed sample day. These are edible / prepared weights, not raw shopping weights. Convert for cooking yield and pack sizes.');
  table(['Food', 'Total needed'], shoppingList(day).map(([name, grams]) => [name, `${grams} g`]), [140, 34], { checklist: true });
  note('Tip: tick off each item as you shop. Choose equivalent local foods that fit your diet, and check the nutrition label when you change brands.');

  newPage('FOOD GUIDE / NEXT STEPS');
  const guide = foodGuide(r.input.goal, r.input.diet, r.input.region);
  // Export the complete guide, independently of the selected UI tab.
  for (const [key, label] of FOOD_GUIDE_SECTIONS) {
    heading(label, colors[key], tints[key]);
    guide[key].forEach(([title, body]) => guideEntry(title, body, colors[key]));
  }
  newPage('COACH NOTES / PUT IT INTO PRACTICE');
  heading('Build consistency');
  coachTips(r).forEach((tip, i) => {
    const lines = wrap(tip, width - 12, 10); ensure(lines.length * 4.6 + 9);
    text(String(i + 1).padStart(2, '0'), left, y, 9, true, accent);
    lines.forEach((line) => { text(line, left + 10, y, 10, false, muted); y += 4.6; });
    y += 6;
  });
  heading('Supplement notes');
  supplements(r).forEach(([title, body]) => guideEntry(title, body));
  heading('About your estimates');
  paragraph(`Body fat: ${r.bodyFat}% (${source}). The body-shape guide is an AI-generated illustration, not a validated measurement tool. Appearance alone cannot determine body fat.`, { size: 9 });
  paragraph('Body composition measurement information: health.clevelandclinic.org/bmi-for-men', { size: 9 });
  doc.link(left, y - 14, width, 12, { url: 'https://health.clevelandclinic.org/bmi-for-men' });
  paragraph('Nutrition estimates only, not medical advice. Re-check progress every 2-3 weeks. Use trends in weight, strength and measurements to review your plan.', { size: 9 });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setDrawColor('#dce0e7'); doc.line(left, 282, 192, 282);
    text('MacroForge / Your personal nutrition plan', left, 288, 8, false, muted);
    text(pageSections[page - 1].split(' / ')[0], 139, 288, 7, true, accent, { align: 'right' });
    text(`${page} / ${pages}`, 192, 288, 8, false, muted, { align: 'right' });
  }
  return doc;
}
