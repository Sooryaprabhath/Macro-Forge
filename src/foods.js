// Per 100 g (cooked/ready-to-eat where relevant). diet: meat | egg | vegetarian | vegan
export const FOODS = [
  // Protein
  { name: 'Chicken breast', max: 300, role: 'protein', diet: 'meat', p: 31, c: 0, f: 3.6 },
  { name: 'Lean beef (5% fat)', max: 280, role: 'protein', diet: 'meat', p: 26, c: 0, f: 6 },
  { name: 'Salmon', max: 250, role: 'protein', diet: 'meat', p: 22, c: 0, f: 12 },
  { name: 'Tuna (in water)', max: 250, role: 'protein', diet: 'meat', p: 25, c: 0, f: 1 },
  { name: 'Turkey mince', max: 280, role: 'protein', diet: 'meat', p: 27, c: 0, f: 7 },
  { name: 'Shrimp / prawns', max: 300, role: 'protein', diet: 'meat', p: 24, c: 0.2, f: 0.3 },
  { name: 'Whole eggs + whites', max: 300, role: 'protein', diet: 'egg', p: 12.5, c: 0.8, f: 6 },
  { name: 'Greek yogurt (0%)', max: 400, role: 'protein', diet: 'vegetarian', p: 10, c: 3.6, f: 0.4 },
  { name: 'Cottage cheese', max: 300, role: 'protein', diet: 'vegetarian', p: 11, c: 3.4, f: 4.3 },
  { name: 'Paneer (low fat)', max: 200, role: 'protein', diet: 'vegetarian', p: 20, c: 3, f: 13 },
  { name: 'Whey protein', max: 60, role: 'protein', diet: 'vegetarian', p: 78, c: 8, f: 6 },
  { name: 'Firm tofu', max: 300, role: 'protein', diet: 'vegan', p: 15, c: 2.5, f: 8 },
  { name: 'Tempeh', max: 200, role: 'protein', diet: 'vegan', p: 19, c: 9, f: 11 },
  { name: 'Seitan', max: 200, role: 'protein', diet: 'vegan', p: 25, c: 14, f: 2 },
  { name: 'Soy chunks (cooked)', max: 250, role: 'protein', diet: 'vegan', p: 17, c: 11, f: 0.5 },
  { name: 'Pea protein', max: 60, role: 'protein', diet: 'vegan', p: 80, c: 4, f: 7 },
  // Carbs
  { name: 'White / basmati rice', max: 400, role: 'carb', diet: 'vegan', p: 2.7, c: 28, f: 0.3 },
  { name: 'Rolled oats (dry)', max: 120, role: 'carb', diet: 'vegan', p: 13, c: 67, f: 7 },
  { name: 'Potatoes', max: 500, role: 'carb', diet: 'vegan', p: 2, c: 17, f: 0.1 },
  { name: 'Sweet potato', max: 400, role: 'carb', diet: 'vegan', p: 1.6, c: 20, f: 0.1 },
  { name: 'Wholegrain pasta', max: 350, role: 'carb', diet: 'vegan', p: 5.5, c: 27, f: 1 },
  { name: 'Quinoa', max: 350, role: 'carb', diet: 'vegan', p: 4.4, c: 21, f: 1.9 },
  { name: 'Wholewheat roti / bread', max: 180, role: 'carb', diet: 'vegan', p: 9, c: 45, f: 3 },
  { name: 'Lentils / dal', max: 300, role: 'carb', diet: 'vegan', p: 9, c: 20, f: 0.4 },
  { name: 'Banana', max: 150, role: 'fruit', diet: 'vegan', p: 1.1, c: 23, f: 0.3 },
  { name: 'Mixed berries', max: 150, role: 'fruit', diet: 'vegan', p: 0.8, c: 12, f: 0.4 },
  // Fats
  { name: 'Extra-virgin olive oil', max: 20, role: 'fat', diet: 'vegan', p: 0, c: 0, f: 100 },
  { name: 'Almonds', max: 40, role: 'fat', diet: 'vegan', p: 21, c: 22, f: 50 },
  { name: 'Peanut butter', max: 40, role: 'fat', diet: 'vegan', p: 25, c: 20, f: 50 },
  { name: 'Avocado', max: 150, role: 'fat', diet: 'vegan', p: 2, c: 9, f: 15 },
  { name: 'Walnuts', max: 40, role: 'fat', diet: 'vegan', p: 15, c: 14, f: 65 },
  { name: 'Chia seeds', max: 30, role: 'fat', diet: 'vegan', p: 17, c: 42, f: 31 },
  // Veg (fixed portions)
  { name: 'Broccoli', role: 'veg', diet: 'vegan', p: 2.8, c: 7, f: 0.4 },
  { name: 'Spinach', role: 'veg', diet: 'vegan', p: 2.9, c: 3.6, f: 0.4 },
  { name: 'Mixed salad', role: 'veg', diet: 'vegan', p: 1.5, c: 4, f: 0.2 },
  { name: 'Green beans', role: 'veg', diet: 'vegan', p: 1.8, c: 7, f: 0.2 },
  { name: 'Bell peppers', role: 'veg', diet: 'vegan', p: 1, c: 6, f: 0.3 },
];

const ALLOWED = {
  omnivore: ['meat', 'egg', 'vegetarian', 'vegan'],
  eggetarian: ['egg', 'vegetarian', 'vegan'],
  vegetarian: ['vegetarian', 'vegan'],
  vegan: ['vegan'],
};

export const allowedFoods = (diet) => FOODS.filter((f) => ALLOWED[diet].includes(f.diet));

const kcalOf = (f) => f.p * 4 + f.c * 4 + f.f * 9;

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
  const foods = allowedFoods(result.input.diet);
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
  const shake = foods.find(isShake);
  const KEY = { protein: 'p', carb: 'c', fat: 'f' };

  return result.mealSplit.map((meal, i) => {
    const light = /snack|bed|pre-workout$/i.test(meal.name);
    const noVeg = light || /breakfast/i.test(meal.name);
    const fixed = [];
    if (!noVeg) fixed.push({ food: lists.veg[i % lists.veg.length], g: 120 });
    if (/breakfast|snack|pre-workout/i.test(meal.name) && lists.fruit.length) fixed.push({ food: lists.fruit[i % lists.fruit.length], g: 120 });

    const carbList = light ? lists.snackCarb : lists.carb;
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
    }));
    const tot = items.reduce((a, it) => ({ p: a.p + it.p, c: a.c + it.c, f: a.f + it.f, kcal: a.kcal + it.kcal }), { p: 0, c: 0, f: 0, kcal: 0 });
    return { name: meal.name, items, total: { p: Math.round(tot.p), c: Math.round(tot.c), f: Math.round(tot.f), kcal: Math.round(tot.kcal) } };
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

export const foodGuide = (goal) => GUIDE[goal];

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
