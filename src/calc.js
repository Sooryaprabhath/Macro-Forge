// Core nutrition engine. All inputs metric (kg, cm).

const KCAL_PER_KG = 7700;

const RATES = {
  // % of body weight per week
  cut: { slow: 0.005, moderate: 0.0075, aggressive: 0.01 },
  maintain: { slow: 0, moderate: 0, aggressive: 0 },
  bulk: { slow: 0.0015, moderate: 0.0025, aggressive: 0.005 },
};

const PACE_HINTS = {
  cut: {
    slow: '≈0.5% body weight / week — maximum muscle retention, easiest to sustain.',
    moderate: '≈0.75% body weight / week — the sweet spot for most lifters.',
    aggressive: '≈1% body weight / week — fast, but hunger and strength take a hit.',
  },
  maintain: {
    slow: 'Calories at maintenance — build muscle & lose fat slowly (recomp).',
    moderate: 'Calories at maintenance — build muscle & lose fat slowly (recomp).',
    aggressive: 'Calories at maintenance — build muscle & lose fat slowly (recomp).',
  },
  bulk: {
    slow: '≈0.15% body weight / week — ultra-lean gain, minimal fat.',
    moderate: '≈0.25% body weight / week — classic lean bulk.',
    aggressive: '≈0.5% body weight / week — faster gains, more fat. Best for beginners/hardgainers.',
  },
};

export const paceHint = (goal, pace) => PACE_HINTS[goal][pace];

const r5 = (n) => Math.round(n / 5) * 5;
const r1 = (n) => Math.round(n * 10) / 10;

export function estimateBodyFat({ sex, age, weight, height }) {
  // Deurenberg BMI-based estimate
  const bmi = weight / (height / 100) ** 2;
  const bf = 1.2 * bmi + 0.23 * age - 10.8 * (sex === 'male' ? 1 : 0) - 5.4;
  return Math.min(50, Math.max(5, bf));
}

export function calculate(input) {
  const { sex, age, weight, height, activity, days, style, goal, pace, carbStyle, meals } = input;
  const bfKnown = Number.isFinite(input.bodyFat);
  const bodyFat = bfKnown ? input.bodyFat : estimateBodyFat(input);
  const lbm = weight * (1 - bodyFat / 100);
  const bmi = weight / (height / 100) ** 2;
  const ffmi = lbm / (height / 100) ** 2 + 6.1 * (1.8 - height / 100);

  const mifflin = 10 * weight + 6.25 * height - 5 * age + (sex === 'male' ? 5 : -161);
  const katch = 370 + 21.6 * lbm;
  const bmr = bfKnown ? (mifflin + katch) / 2 : mifflin;

  // Training volume nudges activity a bit beyond the lifestyle multiplier
  const styleBoost = { strength: 0.012, hybrid: 0.018, endurance: 0.025 }[style];
  const tdee = bmr * (activity + days * styleBoost);

  const rate = RATES[goal][pace];
  const sign = goal === 'cut' ? -1 : 1;
  let delta = (sign * rate * weight * KCAL_PER_KG) / 7;
  const floor = Math.max(bmr * 1.05, sex === 'male' ? 1500 : 1200);
  let calories = tdee + delta;
  if (goal === 'cut' && calories < floor) {
    calories = floor;
    delta = calories - tdee;
  }
  calories = Math.round(calories / 10) * 10;
  delta = calories - Math.round(tdee);

  // Protein: anchored to lean mass so it scales correctly for higher body fat
  const proteinPerLbm = { cut: 2.7, maintain: 2.45, bulk: 2.3 }[goal] + (goal === 'cut' && pace === 'aggressive' ? 0.2 : 0);
  let protein = Math.min(lbm * proteinPerLbm, weight * 2.6);
  protein = Math.max(protein, weight * 1.4);

  // Fat
  const fatPerKg = { cut: 0.75, maintain: 0.9, bulk: 0.95 }[goal] * { balanced: 1, lowcarb: 1.4, highcarb: 0.8 }[carbStyle];
  let fat = weight * fatPerKg;
  const fatMinPct = 0.2,
    fatMaxPct = carbStyle === 'lowcarb' ? 0.45 : 0.35;
  fat = Math.min(Math.max(fat, (calories * fatMinPct) / 9), (calories * fatMaxPct) / 9);

  // Carbs fill the rest
  let carbs = (calories - protein * 4 - fat * 9) / 4;
  if (carbs < 50) {
    carbs = 50;
    fat = Math.max((calories * fatMinPct) / 9, (calories - protein * 4 - carbs * 4) / 9);
  }

  protein = r5(protein);
  fat = r5(fat);
  carbs = r5(carbs);
  const macroKcal = protein * 4 + carbs * 4 + fat * 9;

  const fiber = Math.round((calories / 1000) * 14);
  const water = r1((weight * 35 + days * 0.6 * 1000 / 7 + (style === 'endurance' ? 400 : 0)) / 1000);
  const sugarMax = Math.round((calories * 0.1) / 4);
  const satFatMax = Math.round((calories * 0.1) / 9);

  // Carb cycling: training days get +20% carbs, rest days absorb the difference
  let cycling = null;
  if (days > 0 && days < 7) {
    const trainC = r5(carbs * 1.2);
    const restC = r5((7 * carbs - days * trainC) / (7 - days));
    const trainF = r5(fat * 0.92);
    const restF = r5((7 * fat - days * trainF) / (7 - days));
    cycling = {
      train: { protein, carbs: trainC, fat: trainF, kcal: protein * 4 + trainC * 4 + trainF * 9 },
      rest: { protein, carbs: restC, fat: restF, kcal: protein * 4 + restC * 4 + restF * 9 },
    };
  }

  // Meal split (protein even, carbs biased toward pre/post workout meals)
  const mealNames = {
    2: ['Meal 1', 'Post-workout feast'],
    3: ['Breakfast', 'Lunch · pre-workout', 'Dinner · post-workout'],
    4: ['Breakfast', 'Lunch', 'Pre-workout', 'Post-workout dinner'],
    5: ['Breakfast', 'Snack', 'Lunch', 'Pre-workout', 'Post-workout dinner'],
    6: ['Breakfast', 'Snack', 'Lunch', 'Pre-workout', 'Post-workout', 'Before bed'],
  }[meals];
  const carbWeights = mealNames.map((n) => (/workout/i.test(n) ? 1.4 : /bed|snack/i.test(n) ? 0.6 : 1));
  const fatWeights = mealNames.map((n) => (/pre-workout|post-workout/i.test(n) && !/dinner|feast/i.test(n) ? 0.5 : /bed/i.test(n) ? 1.3 : 1));
  const norm = (arr) => {
    const s = arr.reduce((a, b) => a + b, 0);
    return arr.map((v) => v / s);
  };
  const cw = norm(carbWeights),
    fw = norm(fatWeights);
  const mealSplit = mealNames.map((name, i) => {
    const p = r5(protein / meals),
      c = r5(carbs * cw[i]),
      f = Math.max(5, r5(fat * fw[i]));
    return { name, protein: p, carbs: c, fat: f, kcal: p * 4 + c * 4 + f * 9 };
  });

  // 12-week projection
  const projection = [];
  let w = weight;
  let fatMass = weight - lbm;
  let lean = lbm;
  for (let wk = 0; wk <= 12; wk++) {
    projection.push({ week: wk, weight: r1(w), bf: r1((fatMass / w) * 100) });
    const change = sign * rate * w;
    if (goal === 'cut') {
      fatMass += change * 0.85;
      lean += change * 0.15;
    } else if (goal === 'bulk') {
      const leanShare = pace === 'slow' ? 0.6 : pace === 'moderate' ? 0.5 : 0.35;
      lean += change * leanShare;
      fatMass += change * (1 - leanShare);
    } else {
      // recomp: tiny fat loss + lean gain at stable weight
      lean += 0.05;
      fatMass -= 0.05;
    }
    w = lean + fatMass;
  }

  // Time to target
  let eta = null;
  if (Number.isFinite(input.target) && input.target > 0 && rate > 0) {
    const diff = input.target - weight;
    if ((goal === 'cut' && diff < 0) || (goal === 'bulk' && diff > 0)) {
      eta = Math.ceil(Math.abs(Math.log(input.target / weight) / Math.log(1 + sign * rate)));
    } else {
      eta = 'mismatch';
    }
  }

  return {
    input,
    bodyFat: r1(bodyFat),
    bfKnown,
    lbm: r1(lbm),
    bmi: r1(bmi),
    ffmi: r1(ffmi),
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calories,
    delta,
    protein,
    carbs,
    fat,
    macroKcal,
    pct: {
      protein: (protein * 4) / macroKcal,
      carbs: (carbs * 4) / macroKcal,
      fat: (fat * 9) / macroKcal,
    },
    perKg: { protein: r1(protein / weight), carbs: r1(carbs / weight), fat: r1(fat / weight) },
    fiber,
    water,
    sugarMax,
    satFatMax,
    sodium: style === 'endurance' ? 3000 : 2300,
    cycling,
    mealSplit,
    projection,
    eta,
    weeklyChange: Math.round(sign * rate * weight * 100) / 100,
  };
}
