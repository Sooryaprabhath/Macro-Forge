import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate } from '../src/calc.js';
import { allowedFoods, buildSampleDay, foodGuide, REGIONS } from '../src/foods.js';
import { createPlanPdf, shoppingList } from '../src/pdf.js';

const input = { sex: 'male', age: 25, weight: 75, height: 175, bodyFat: NaN, activity: 1.55, days: 4, style: 'strength', goal: 'maintain', pace: 'moderate', target: NaN, diet: 'omnivore', meals: 4, carbStyle: 'balanced', region: 'global' };

test('every region and diet generates finite meals using only permitted local foods', () => {
  for (const region of Object.keys(REGIONS)) for (const diet of ['omnivore', 'eggetarian', 'vegetarian', 'vegan']) {
    const foods = allowedFoods(diet, region);
    for (const role of ['protein', 'carb', 'fat', 'veg', 'fruit']) assert.ok(foods.some((f) => f.role === role), `${region}/${diet}: ${role}`);
    if (diet === 'vegan') assert.ok(foods.every((f) => f.diet === 'vegan'));
    if (diet === 'vegetarian') assert.ok(foods.every((f) => ['vegan', 'vegetarian'].includes(f.diet)));
    if (diet === 'eggetarian') assert.ok(foods.every((f) => f.diet !== 'meat'));
    for (const meals of [2, 3, 4, 5, 6]) for (const seed of [1, 17, 987]) {
      const r = calculate({ ...input, region, diet, meals });
      const day = buildSampleDay(r, seed);
      assert.equal(day.length, meals);
      for (const meal of day) {
        assert.ok(Object.values(meal.total).every((n) => Number.isFinite(n) && n >= 0));
        for (const item of meal.items) {
          assert.ok(foods.some((f) => f.name === item.name));
          assert.ok(Number.isFinite(item.grams) && item.grams > 0);
        }
      }
    }
  }
});

test('regions change recommendations; unknown regions safely fall back to global', () => {
  assert.notDeepEqual(allowedFoods('omnivore', 'southAsia'), allowedFoods('omnivore', 'europe'));
  assert.deepEqual(allowedFoods('vegan', 'unknown'), allowedFoods('vegan'));
  const veganGuide = foodGuide('bulk', 'vegan', 'southAsia').eat.map((x) => x.join(' ')).join(' ');
  assert.ok(!/chicken|eggs|whey/i.test(veganGuide));
});

test('PDF and shopping list use the supplied shuffled day without regenerating it', () => {
  const r = calculate({ ...input, region: 'southAsia', diet: 'vegan', meals: 6, bodyFat: 22, bodyFatSource: 'visual' });
  const day = buildSampleDay(r, 987);
  const list = shoppingList(day);
  assert.equal(list.reduce((sum, [, grams]) => sum + grams, 0), day.flatMap((m) => m.items).reduce((sum, it) => sum + it.grams, 0));
  const before = JSON.stringify(day);
  const pdf = createPlanPdf(r, day, new Date('2026-10-05T12:00:00Z'));
  assert.ok(pdf.getNumberOfPages() >= 5);
  assert.match(pdf.output(), /^%PDF-/);
  assert.equal(JSON.stringify(day), before);
});

import { bodyErrors } from '../src/validation.js';
test('required body details reject blanks, invalid numbers and incomplete feet/inches', () => {
  assert.equal(Object.keys(bodyErrors({})).length, 3);
  const valid = { age: '25', weight: '75.5', heightCm: '175' };
  assert.deepEqual(bodyErrors(valid), {});
  assert.ok(bodyErrors({ ...valid, age: '25.5' }).age);
  assert.ok(bodyErrors({ ...valid, weight: '' }).weight);
  assert.ok(bodyErrors({ ...valid, weight: 'Infinity' }).weight);
  assert.ok(bodyErrors({ ...valid, heightCm: '0' }).heightCm);
  assert.ok(bodyErrors({ ...valid, heightFt: '5', heightFtIn: '' }, 'ft').heightFtIn);
  assert.ok(bodyErrors({ ...valid, heightFt: '5', heightFtIn: '12' }, 'ft').heightFtIn);
  assert.deepEqual(bodyErrors({ ...valid, heightFt: '5', heightFtIn: '0' }, 'ft'), {});
});
