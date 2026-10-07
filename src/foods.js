import { FOOD_RECORDS } from './food-data.js';

// Compatibility aliases keep the solver compact while every displayed value
// remains traceable to the full record and its per-100-g nutrient definition.
export const FOODS = FOOD_RECORDS.map((food) => ({
  ...food,
  p: food.nutrients.protein,
  c: food.nutrients.carbs,
  f: food.nutrients.fat,
  fibre: food.nutrients.fibre,
  kcal: food.nutrients.energy,
  max: Math.max(food.servingGrams * 2, food.role === 'fat' ? 40 : 300),
}));

const ALLOWED = {
  omnivore: ['meat', 'egg', 'vegetarian', 'vegan'],
  eggetarian: ['egg', 'vegetarian', 'vegan'],
  vegetarian: ['vegetarian', 'vegan'],
  vegan: ['vegan'],
};

// User-selected shopping region, not nationality or an inferred dietary restriction.
export const REGIONS = {
  global: { label: 'Global / other', note: 'A broad selection. Choose the foods available in your local shops.' },
  southAsia: { label: 'South Asia (India & neighbours)', note: 'Rice, dal, roti, soy chunks and paneer, matched to your diet.', foods: /chicken|prawns|eggs|paneer|tofu|soy chunks|protein|rice|oats|roti|lentils|banana|almonds|peanut|spinach|green beans|peppers/i },
  eastAsia: { label: 'East & Southeast Asia', note: 'Rice, tofu, tempeh, fish and greens, matched to your diet.', foods: /chicken|salmon|tuna|prawns|eggs|tofu|tempeh|protein|rice|oats|sweet potato|banana|peanut|spinach|green beans|peppers/i },
  middleEast: { label: 'Middle East & North Africa', note: 'Lentils, rice, yogurt, olive oil and fresh vegetables.', foods: /chicken|beef|tuna|eggs|yogurt|cottage|tofu|protein|rice|oats|roti|lentils|banana|olive|almonds|walnuts|spinach|salad|peppers/i },
  europe: { label: 'Europe', note: 'Potatoes, oats, pasta, dairy, beans and seasonal vegetables.', foods: /chicken|beef|salmon|tuna|turkey|eggs|yogurt|cottage|tofu|seitan|protein|oats|potatoes|pasta|lentils|berries|banana|olive|walnuts|broccoli|spinach|salad|green beans/i },
  americas: { label: 'North America & Oceania', note: 'Oats, potatoes, lean proteins, tofu, fruit and vegetables.', foods: /chicken|beef|salmon|tuna|turkey|eggs|yogurt|cottage|tofu|tempeh|protein|rice|oats|potato|pasta|quinoa|banana|berries|olive|peanut|avocado|chia|broccoli|salad|peppers/i },
  latinAmerica: { label: 'Latin America & Caribbean', note: 'Rice, potatoes, lentils, avocado and locally available proteins.', foods: /chicken|beef|tuna|prawns|eggs|cottage|tofu|protein|rice|oats|potato|quinoa|lentils|banana|peanut|avocado|olive|spinach|salad|peppers/i },
  africa: { label: 'Sub-Saharan Africa', note: 'Rice, sweet potato, lentils, peanuts, greens and familiar proteins.', foods: /chicken|beef|tuna|eggs|yogurt|tofu|soy chunks|protein|rice|oats|potato|lentils|banana|peanut|avocado|spinach|green beans|peppers/i },
};

export const regionInfo = (region) => REGIONS[region] || REGIONS.global;
export const allowedFoods = (diet, region = 'global', constraints = {}) => {
  const local = regionInfo(region).foods;
  const allergens = new Set(constraints.allergens || []);
  const excluded = (constraints.excluded || []).map((value) => value.trim().toLowerCase()).filter(Boolean);
  return FOODS.filter((f) => (ALLOWED[diet] || ALLOWED.omnivore).includes(f.diet) && (!local || local.test(f.name))
    && !(f.allergens || []).some((allergen) => allergens.has(allergen))
    && !excluded.some((term) => f.name.toLowerCase().includes(term) || f.description.toLowerCase().includes(term)));
};

const kcalOf = (f) => f.kcal;

const shuffle = (arr, rnd) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Builds a sample day that hits each meal's macro target with real foods.
// Solves grams for a protein, carb and fat source (Gauss-Seidel), respecting portion caps;
// when a food hits its cap, it is locked and a second food of the same role is added.
export function buildSampleDay(result, seed = 1) {
  const rnd = mulberry32(seed);
  const constraints = { allergens: result.input.allergens || [], excluded: result.input.excludedFoods || [] };
  const foods = allowedFoods(result.input.diet, result.input.region, constraints);
  const isShake = (f) => f.name === 'Whey protein' || f.name === 'Pea protein';
  const pick = (role, filter = () => true) => shuffle(foods.filter((f) => f.role === role && !isShake(f) && filter(f)), rnd);
  const lists = {
    protein: pick('protein'),
    carb: pick('carb'),
    snackCarb: pick('carb', (f) => /oats|bread/i.test(f.name)),
    fat: pick('fat'),
    veg: pick('veg'),
    fruit: pick('fruit'),
  };
  const missingRoles = ['protein', 'carb', 'fat', 'veg', 'fruit'].filter((role) => !lists[role]?.length);
  if (missingRoles.length) throw new Error(`No verified ${missingRoles.join(', ')} foods satisfy all selected constraints.`);
  const shake = foods.find(isShake);
  const KEY = { protein: 'p', carb: 'c', fat: 'f' };

  return result.mealSplit.map((meal, i) => {
    const light = /snack|bed|pre-workout$/i.test(meal.name);
    const noVeg = light || /breakfast/i.test(meal.name);
    const fixed = [];
    if (!noVeg) fixed.push({ food: lists.veg[i % lists.veg.length], g: 120 });
    if (/breakfast|snack|pre-workout/i.test(meal.name) && lists.fruit.length) fixed.push({ food: lists.fruit[i % lists.fruit.length], g: 120 });

    const carbList = light && lists.snackCarb.length ? lists.snackCarb : lists.carb;
    const shakeMeal = shake && /post-workout$|snack|bed/i.test(meal.name);
    const vars = [
      { role: 'protein', list: shakeMeal ? [shake, ...lists.protein] : lists.protein, idx: 0, off: shakeMeal ? 0 : i },
      { role: 'carb', list: carbList, idx: 0, off: i },
      { role: 'fat', list: lists.fat, idx: 0, off: i },
    ].map((v) => ({ ...v, food: v.list[v.off % v.list.length], g: 0 }));

    for (let round = 0; round < 4; round++) {
      for (let it = 0; it < 12; it++) {
        vars.forEach((v) => {
          const k = KEY[v.role];
          const target = { p: meal.protein, c: meal.carbs, f: meal.fat }[k];
          const other = [...fixed, ...vars.filter((o) => o !== v)].reduce((a, o) => a + (o.food[k] * o.g) / 100, 0);
          v.g = Math.max(0, ((target - other) / v.food[k]) * 100);
        });
      }
      const over = vars.find((v) => v.g > v.food.max);
      if (!over) break;
      fixed.push({ food: over.food, g: over.food.max });
      over.idx += 1;
      over.food = over.list[(over.off + over.idx) % over.list.length];
      over.g = 0;
    }

    const merged = [];
    [...fixed, ...vars].forEach(({ food, g }) => {
      const grams = Math.round(Math.min(g, food.max ?? 1000) / 5) * 5;
      if (grams < 5) return;
      const ex = merged.find((m) => m.food === food);
      if (ex) ex.grams += grams;
      else merged.push({ food, grams });
    });
    const items = merged.map(({ food, grams }) => ({
      name: food.name, grams, kcal: Math.round((kcalOf(food) * grams) / 100),
      p: (food.p * grams) / 100, c: (food.c * grams) / 100, f: (food.f * grams) / 100,
      fibre: Number.isFinite(food.fibre) ? (food.fibre * grams) / 100 : null,
      state: food.state, sourceId: food.source.foodId, sourceName: food.source.name,
    }));
    const tot = items.reduce((a, it) => ({ p: a.p + it.p, c: a.c + it.c, f: a.f + it.f, kcal: a.kcal + it.kcal, fibre: a.fibre + (it.fibre || 0) }), { p: 0, c: 0, f: 0, kcal: 0, fibre: 0 });
    return { name: meal.name, items, total: { p: Math.round(tot.p), c: Math.round(tot.c), f: Math.round(tot.f), kcal: Math.round(tot.kcal), fibre: Math.round(tot.fibre) } };
  });
}

const GUIDE = {
  cut: {
    eat: [
      ['Lean proteins', 'Chicken, fish, egg whites, Greek yogurt, tofu — highest satiety per calorie, protects muscle.'],
      ['High-volume veg', 'Leafy greens, broccoli, cucumber, peppers — huge plates for few calories.'],
      ['Potatoes & oats', 'Among the most filling carbs per kcal. Keep carbs around training.'],
      ['Berries & fruit', 'Sweetness with fiber and water — kills sugar cravings.'],
      ['Soups & broths', 'Pre-meal broth lowers total intake at the meal.'],
      ['Zero-cal drinks', 'Black coffee, tea, sparkling water — appetite control & pre-workout boost.'],
    ],
    limit: [
      ['Nuts & nut butters', 'Healthy but extremely calorie-dense — weigh them, don\u2019t eyeball.'],
      ['Cooking oils', 'One tablespoon = 120 kcal. Use spray or measure.'],
      ['Dried fruit & juice', 'Concentrated sugar with low satiety.'],
      ['Cheese', 'Great protein but high in fat; pick low-fat versions.'],
      ['Sauces & dressings', 'Hidden 200–400 kcal per meal. Go for mustard, salsa, hot sauce.'],
    ],
    avoid: [
      ['Liquid calories', 'Soda, sweet coffees, smoothies — zero satiety.'],
      ['Alcohol', '7 kcal/g, blunts fat oxidation and muscle protein synthesis.'],
      ['Deep-fried foods', 'Massive calories, low protein.'],
      ['Pastries & sweets', 'Hyper-palatable sugar + fat combo that drives overeating.'],
      ['Ultra-processed snacks', 'Chips, crackers, cereal bars — easy to overeat.'],
    ],
  },
  maintain: {
    eat: [
      ['Protein every meal', '30–50 g per meal to drive recomposition.'],
      ['Whole-food carbs', 'Rice, oats, potatoes, fruit — fuel quality training sessions.'],
      ['Omega-3 fats', 'Salmon, walnuts, chia, flax — recovery & joint health.'],
      ['Colourful veg', '5+ servings for micronutrients and fiber.'],
      ['Fermented dairy / soy', 'Yogurt, kefir, tempeh — gut health + protein.'],
    ],
    limit: [
      ['Added sugar', `Keep under ~10% of calories.`],
      ['Refined grains', 'Fine around workouts, otherwise choose whole grains.'],
      ['Restaurant meals', 'Usually 30–50% more calories than you think.'],
      ['Weekend overshoot', 'A 2-day binge can erase a week of maintenance.'],
    ],
    avoid: [
      ['Heavy alcohol', 'Impairs sleep, recovery and protein synthesis.'],
      ['Trans fats', 'Partially hydrogenated oils, some margarines and fried fast food.'],
      ['Processed meats daily', 'Sausages, salami — high sodium, linked to health risks.'],
      ['Skipping protein', 'Recomp fails without consistently high protein.'],
    ],
  },
  bulk: {
    eat: [
      ['Calorie-dense carbs', 'Rice, pasta, bagels, granola, oats — easy calories that fuel volume.'],
      ['Healthy fats', 'Nut butters, olive oil, avocado, whole eggs — 9 kcal/g.'],
      ['Liquid calories', 'Milk, mass shakes (oats + banana + PB + whey) when appetite is low.'],
      ['Red meat & salmon', 'Creatine, iron, zinc, B12 and omega-3 for growth.'],
      ['Dried fruit', 'Dates, raisins — compact carbs for pre-workout.'],
      ['4–6 meals', 'Spread intake so you\u2019re never forcing giant plates.'],
    ],
    limit: [
      ['Huge fiber loads', 'Too much fiber kills appetite — balance with refined carbs.'],
      ['Excessive cardio', 'Keep it light (walking, 2–3 short sessions) to protect your surplus.'],
      ['Water before meals', 'Fills your stomach — drink between meals instead.'],
      ['Diet / "light" foods', 'You need the calories.'],
    ],
    avoid: [
      ['Dirty bulking', 'Junk-food surpluses add fat, not muscle. Keep 80% whole foods.'],
      ['Alcohol', 'Suppresses testosterone & protein synthesis.'],
      ['Skipping meals', 'Missing one meal = missing your surplus for the day.'],
      ['Sugary soda', 'Empty calories that wreck appetite regulation and teeth.'],
    ],
  },
};

export const foodGuide = (goal, diet = 'omnivore', region = 'global', constraints = {}) => {
  const foods = allowedFoods(diet, region, constraints);
  const names = (roles) => foods.filter((f) => roles.includes(f.role) && !/protein$/i.test(f.name)).map((f) => f.name).join(', ');
  return { ...GUIDE[goal], eat: [
    ['Protein near you', names(['protein']) + '.'],
    ['Everyday carb sources', names(['carb']) + '.'],
    ['Fats & extras', names(['fat']) + '. Measure portions to suit your target.'],
    ['Fruit & vegetables', names(['fruit', 'veg']) + '. Choose seasonal alternatives when available.'],
    ['Your shopping region', regionInfo(region).label + '. Suggestions above follow your selected diet. Availability varies by town and shop; this is a starting point.'],
    ['Verified records', 'Displayed meal calculations resolve to USDA FoodData Central records with preparation state and source ID. Cross-contact remains unknown.'],
    ['Make it yours', 'Use the sample portions as a guide. Brands, recipes and cooking methods change nutrition values.'],
  ] };
};

export function coachTips(r) {
  const { goal, days, pace, sex } = r.input;
  const tips = [];
  if (goal === 'cut') {
    tips.push(`Aim to lose ~${Math.abs(r.weeklyChange)} kg per week. Use a 7-day average of morning weigh-ins, not single days.`);
    tips.push('Keep lifting heavy — the signal to keep muscle comes from load, not high reps.');
    tips.push('Take a 1–2 week diet break at maintenance every 8–12 weeks.');
    tips.push('Target 8–12k daily steps; it burns more than most cardio sessions without hurting recovery.');
    if (pace === 'aggressive') tips.push('Aggressive pace: prioritise sleep (7–9 h) and consider refeeds 1×/week.');
  } else if (goal === 'bulk') {
    tips.push(`Gain ~${r.weeklyChange} kg per week. If the scale doesn\u2019t move for 2 weeks, add 150 kcal.`);
    tips.push('Progressive overload is non-negotiable — log your lifts and beat them.');
    tips.push('If waist grows faster than ~1 cm per kg gained, reduce surplus slightly.');
    tips.push('Run the bulk for 4–8 months before cutting — short bulks waste time.');
  } else {
    tips.push('Recomposition works best for beginners, returning lifters and those at higher body fat.');
    tips.push('Track waist, photos and strength — the scale may barely move.');
    tips.push('Keep protein high every single day; it\u2019s the main driver of a recomp.');
  }
  if (days < 3) tips.push('Train at least 3×/week with full-body sessions to make the most of these macros.');
  if (r.bodyFat > (sex === 'male' ? 25 : 32) && goal === 'bulk') tips.push('Your body fat is on the higher side — a cut or recomp first will make the bulk more productive.');
  if (r.bodyFat < (sex === 'male' ? 10 : 18) && goal === 'cut') tips.push('You\u2019re already lean — keep the pace slow to avoid muscle loss and hormonal disruption.');
  tips.push(`Eat ${Math.round(r.protein / r.input.meals)} g protein per meal, every 3–5 hours.`);
  return tips;
}

export function supplements(r) {
  const w = r.input.weight;
  const list = [
    ['Creatine monohydrate', `${w > 90 ? 5 : 3}–5 g daily, any time. The most proven strength & size supplement.`],
    ['Protein powder', 'Only to fill gaps when whole food can\u2019t hit your protein target.'],
    ['Caffeine', `${Math.round(w * 3)}–${Math.round(w * 6)} mg ~45 min pre-workout. Avoid after 2 pm.`],
    ['Vitamin D3', '1000–2000 IU/day, especially with low sun exposure.'],
    ['Omega-3 (EPA/DHA)', '1–2 g/day if you eat fish less than twice a week.'],
  ];
  if (r.input.diet === 'vegan') list.push(['B12 + Iron check', 'Essential on a vegan diet — supplement B12 and test iron yearly.']);
  if (r.input.style === 'endurance') list.push(['Electrolytes', 'Sodium & potassium during long sessions (>60 min).']);
  return list;
}

// Shared section order for complete PDF and browser-print exports.
export const FOOD_GUIDE_SECTIONS = [['eat', 'Eat more'], ['limit', 'Limit'], ['avoid', 'Avoid']];
