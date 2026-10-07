import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate } from '../src/calc.js';
import { allowedFoods, buildSampleDay, foodGuide, REGIONS } from '../src/foods.js';
import { createPlanPdf, shoppingList } from '../src/pdf.js';
import { FOOD_RECORDS } from '../src/food-data.js';
import { calculateRecipe, validateFoodRecords } from '../src/recipes.js';

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

test('downloaded PDF contains every food-guide category and entry for all goals', () => {
  for (const goal of ['cut', 'maintain', 'bulk']) {
    const r = calculate({ ...input, goal, region: 'southAsia', diet: 'vegan' });
    const pdf = createPlanPdf(r, buildSampleDay(r, 1));
    const text = pdf.internal.pages.flat().join('\n');
    for (const heading of ['Eat more', 'Limit', 'Avoid']) assert.ok(text.includes(`(${heading})`), `${goal}: missing ${heading}`);
    const guide = foodGuide(goal, 'vegan', 'southAsia');
    for (const entries of Object.values(guide)) for (const [title] of entries) {
      // PDF string literals escape parentheses.
      const escaped = title.replace(/[()\\]/g, '\\$&');
      assert.ok(text.includes(`(${escaped})`), `${goal}: missing ${title}`);
    }
  }
});

test('imported foods retain provenance, preparation state, serving weights, and unknown nutrients', () => {
  assert.deepEqual(validateFoodRecords(FOOD_RECORDS), []);
  assert.ok(FOOD_RECORDS.every((food) => food.source.name === 'USDA FoodData Central'));
  assert.ok(FOOD_RECORDS.every((food) => /^\d+$/.test(food.source.foodId)));
  assert.ok(FOOD_RECORDS.some((food) => food.nutrients.vitaminD === null));
  assert.ok(FOOD_RECORDS.every((food) => food.nutrients.vitaminD === null || Number.isFinite(food.nutrients.vitaminD)));
  const chicken = FOOD_RECORDS.find((food) => food.source.foodId === '331960');
  assert.deepEqual([chicken.nutrients.energy, chicken.nutrients.protein, chicken.nutrients.fat], [166, 32.1, 3.24]);
  const broccoli = FOOD_RECORDS.find((food) => food.source.foodId === '169967');
  assert.deepEqual([broccoli.nutrients.energy, broccoli.nutrients.fibre, broccoli.nutrients.vitaminC], [35, 3.3, 64.9]);
});

test('recipe calculation uses edible weights, retention, cooked yield, and preserves unknowns', () => {
  const broccoli = FOOD_RECORDS.find((food) => food.name === 'Broccoli');
  const recipe = calculateRecipe({ id: 'test', name: 'Test', servings: 2, finalCookedWeight: 160,
    ingredients: [{ foodId: broccoli.id, grams: 200, ediblePortion: 0.8, retention: { vitaminC: 0.5 } }] }, FOOD_RECORDS);
  assert.equal(recipe.servingGrams, 80);
  assert.equal(recipe.nutrientsPer100g.protein, broccoli.nutrients.protein);
  assert.equal(recipe.nutrientsPer100g.vitaminC, broccoli.nutrients.vitaminC * 0.5);
  if (broccoli.nutrients.vitaminD === null) assert.equal(recipe.nutrientsPer100g.vitaminD, null);
});

test('allergens and explicit exclusions are never selected', () => {
  const foods = allowedFoods('omnivore', 'global', { allergens: ['milk', 'fish'], excluded: ['banana'] });
  assert.ok(foods.every((food) => !food.allergens.includes('milk') && !food.allergens.includes('fish')));
  assert.ok(foods.every((food) => !/banana/i.test(food.name)));
  const r = calculate({ ...input, allergens: ['milk', 'fish'], excludedFoods: ['banana'] });
  const day = buildSampleDay(r, 17);
  assert.ok(day.flatMap((meal) => meal.items).every((item) => foods.some((food) => food.name === item.name)));
});
