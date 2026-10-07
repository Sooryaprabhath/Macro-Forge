import fs from 'node:fs';

const [foundationPath, legacyPath] = process.argv.slice(2);
if (!foundationPath || !legacyPath) {
  console.error('Usage: node scripts/import-food-data.mjs <Foundation JSON> <SR Legacy JSON>');
  process.exit(1);
}

const readCollection = (path) => {
  const json = JSON.parse(fs.readFileSync(path, 'utf8'));
  return json.FoundationFoods || json.SRLegacyFoods || [];
};
const foods = [...readCollection(foundationPath), ...readCollection(legacyPath)];

const selections = [
  ['Chicken breast', 331960, 'protein', 'meat', 150, ['poultry']],
  ['Lean beef', 746758, 'protein', 'meat', 150, ['beef']],
  ['Salmon', 171998, 'protein', 'meat', 140, ['fish']],
  ['Tuna (in water)', 334194, 'protein', 'meat', 140, ['fish']],
  ['Turkey mince', 746785, 'protein', 'meat', 150, ['poultry']],
  ['Shrimp / prawns', 171971, 'protein', 'meat', 140, ['shellfish']],
  ['Whole eggs', 173424, 'protein', 'egg', 100, ['egg']],
  ['Greek yogurt (0%)', 330137, 'protein', 'vegetarian', 170, ['milk']],
  ['Cottage cheese', 2346384, 'protein', 'vegetarian', 110, ['milk']],
  ['Firm tofu', 172448, 'protein', 'vegan', 120, ['soy']],
  ['Tempeh', 172467, 'protein', 'vegan', 100, ['soy']],
  ['Seitan', 168147, 'protein', 'vegan', 100, ['wheat']],
  ['Lentils / dal', 172421, 'protein', 'vegan', 150, []],
  ['Chickpeas', 2644288, 'protein', 'vegan', 130, []],
  ['White rice', 169757, 'carb', 'vegan', 160, []],
  ['Rolled oats (dry)', 2346396, 'carb', 'vegan', 40, ['oats']],
  ['Potatoes', 170440, 'carb', 'vegan', 180, []],
  ['Sweet potato', 168484, 'carb', 'vegan', 160, []],
  ['Wholegrain pasta', 168910, 'carb', 'vegan', 140, ['wheat']],
  ['Quinoa', 168917, 'carb', 'vegan', 140, []],
  ['Wholewheat bread', 335240, 'carb', 'vegan', 60, ['wheat']],
  ['Banana', 1105314, 'fruit', 'vegan', 118, []],
  ['Strawberries', 2346409, 'fruit', 'vegan', 150, []],
  ['Olive oil', 171413, 'fat', 'vegan', 14, []],
  ['Almonds', 2346393, 'fat', 'vegan', 28, ['tree_nut']],
  ['Peanut butter', 2262072, 'fat', 'vegan', 32, ['peanut']],
  ['Avocado', 2710824, 'fat', 'vegan', 100, []],
  ['Walnuts', 2346394, 'fat', 'vegan', 28, ['tree_nut']],
  ['Chia seeds', 2710819, 'fat', 'vegan', 28, []],
  ['Broccoli', 169967, 'veg', 'vegan', 100, []],
  ['Spinach', 168463, 'veg', 'vegan', 100, []],
  ['Green beans', 169141, 'veg', 'vegan', 100, []],
  ['Bell peppers', 170108, 'veg', 'vegan', 100, []],
];

const nutrientNames = {
  energy: ['Energy', 'Energy (Atwater General Factors)', 'Energy (Atwater Specific Factors)'], protein: ['Protein'], carbs: ['Carbohydrate, by difference'], fat: ['Total lipid (fat)'],
  fibre: ['Fiber, total dietary'], calcium: ['Calcium, Ca'], iron: ['Iron, Fe'], magnesium: ['Magnesium, Mg'],
  potassium: ['Potassium, K'], sodium: ['Sodium, Na'], vitaminC: ['Vitamin C, total ascorbic acid'],
  vitaminB12: ['Vitamin B-12'], vitaminD: ['Vitamin D (D2 + D3)', 'Vitamin D (D2 + D3), International Units'],
};
const amount = (food, names, unit) => {
  const row = food.foodNutrients.find((n) => names.includes(n.nutrient.name) && (!unit || n.nutrient.unitName === unit));
  return row?.amount ?? null;
};
const derivation = (food, names, unit) => {
  const row = food.foodNutrients.find((n) => names.includes(n.nutrient.name) && (!unit || n.nutrient.unitName === unit));
  return row?.foodNutrientDerivation?.description || 'not reported';
};
const stateOf = (description) => /cooked|boiled|braised|roasted|drained|canned|hard-boiled|pan-broiled/i.test(description) ? 'cooked'
  : /dry|dried|rolled oats/i.test(description) ? 'dry' : 'raw';

const records = selections.map(([name, fdcId, role, diet, servingGrams, allergens]) => {
  const food = foods.find((row) => row.fdcId === fdcId);
  if (!food) throw new Error(`Missing selected FDC record ${fdcId} (${name})`);
  const sourceVersion = food.dataType === 'Foundation' ? 'Foundation Foods 2025-12-18' : 'SR Legacy 2018-04';
  const nutrients = Object.fromEntries(Object.entries(nutrientNames).map(([key, names]) => [key,
    key === 'energy' ? amount(food, names, 'kcal') : amount(food, names)
  ]));
  const nutrientDerivations = Object.fromEntries(Object.entries(nutrientNames).map(([key, names]) => [key,
    key === 'energy' ? derivation(food, names, 'kcal') : derivation(food, names)
  ]));
  for (const key of ['energy', 'protein', 'carbs', 'fat']) if (!Number.isFinite(nutrients[key])) {
    throw new Error(`${name} lacks required ${key}`);
  }
  return {
    id: `usda-${fdcId}`, name, description: food.description, role, diet, servingGrams,
    state: stateOf(food.description), preparation: food.description, ediblePortion: 1,
    allergens, allergenStatus: 'reviewed', nutrients, nutrientDerivations,
    source: { name: 'USDA FoodData Central', foodId: String(fdcId), dataType: food.dataType,
      derivation: 'See nutrientDerivations; derivation is retained per nutrient',
      version: sourceVersion, publicationDate: food.publicationDate, retrievalDate: '2026-10-08',
      url: `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${fdcId}/nutrients` },
  };
});

const out = `// Generated by scripts/import-food-data.mjs. Do not hand-edit nutrient values.\n` +
  `export const FOOD_DATA_VERSION = 'usda-foundation-2025-12-18+sr-legacy-2018-04';\n` +
  `export const FOOD_RECORDS = ${JSON.stringify(records, null, 2)};\n`;
process.stdout.write(out);
