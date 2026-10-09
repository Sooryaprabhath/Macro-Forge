// A practical, general-population training template. It adapts to the plan's
// goal, preferred training style and available weekly training days.

const GOAL = {
  cut: {
    name: 'Cut strength-first routine',
    prescription: 'Keep 1–3 reps in reserve on most sets. Preserve good technique and load; reduce one accessory set if recovery drops.',
    main: '3–4 sets × 5–8 reps', accessory: '2–3 sets × 8–15 reps', rest: '2–3 min on main lifts · 60–90 sec on accessories',
  },
  maintain: {
    name: 'Recomp balanced routine',
    prescription: 'Aim for steady, repeatable progress. Finish most sets with 1–3 reps in reserve.',
    main: '3–4 sets × 6–10 reps', accessory: '2–3 sets × 8–15 reps', rest: '2–3 min on main lifts · 60–90 sec on accessories',
  },
  bulk: {
    name: 'Lean-gain volume routine',
    prescription: 'Use controlled reps and add volume gradually. Finish most sets with 1–3 reps in reserve.',
    main: '3–4 sets × 6–10 reps', accessory: '3 sets × 10–15 reps', rest: '2–3 min on main lifts · 60–90 sec on accessories',
  },
};

const DAYS = {
  fullA: { label: 'Full body A', main: ['Squat or leg press', 'Bench press or push-up', 'Row'], accessory: ['Romanian deadlift', 'Lat pulldown', 'Plank'] },
  fullB: { label: 'Full body B', main: ['Deadlift variation or hip thrust', 'Overhead press', 'Pulldown or assisted pull-up'], accessory: ['Split squat', 'Incline dumbbell press', 'Farmer carry'] },
  fullC: { label: 'Full body C', main: ['Goblet squat or front squat', 'Incline press', 'Chest-supported row'], accessory: ['Leg curl', 'Lateral raise', 'Dead bug'] },
  upperA: { label: 'Upper A', main: ['Bench press or dumbbell press', 'Row', 'Overhead press'], accessory: ['Lat pulldown', 'Lateral raise', 'Triceps pressdown'] },
  upperB: { label: 'Upper B', main: ['Incline press', 'Pulldown or assisted pull-up', 'Chest-supported row'], accessory: ['Rear-delt fly', 'Biceps curl', 'Push-up'] },
  lowerA: { label: 'Lower A', main: ['Squat or leg press', 'Romanian deadlift', 'Split squat'], accessory: ['Leg curl', 'Calf raise', 'Plank'] },
  lowerB: { label: 'Lower B', main: ['Hip thrust or deadlift variation', 'Front squat or goblet squat', 'Step-up'], accessory: ['Leg extension', 'Calf raise', 'Dead bug'] },
  push: { label: 'Push', main: ['Bench press or dumbbell press', 'Overhead press', 'Incline dumbbell press'], accessory: ['Lateral raise', 'Triceps pressdown', 'Push-up'] },
  pull: { label: 'Pull', main: ['Row', 'Pulldown or assisted pull-up', 'Romanian deadlift'], accessory: ['Rear-delt fly', 'Biceps curl', 'Farmer carry'] },
  legs: { label: 'Legs', main: ['Squat or leg press', 'Hip thrust or Romanian deadlift', 'Split squat'], accessory: ['Leg curl', 'Calf raise', 'Plank'] },
};

export const EQUIPMENT_LABELS = { home: 'home / bodyweight', basicGym: 'basic gym', fullGym: 'full gym' };
const EXERCISE_OPTIONS = {
  'Squat or leg press': ['Bodyweight or goblet squat', 'Leg press', 'Barbell back squat'],
  'Bench press or push-up': ['Push-up', 'Dumbbell bench press', 'Barbell bench press'],
  Row: ['Backpack row', 'Seated cable row', 'Barbell row'],
  'Romanian deadlift': ['Single-leg hip hinge', 'Dumbbell Romanian deadlift', 'Barbell Romanian deadlift'],
  'Lat pulldown': ['Towel row', 'Lat pulldown', 'Lat pulldown'],
  'Deadlift variation or hip thrust': ['Glute bridge', 'Dumbbell hip thrust', 'Barbell hip thrust'],
  'Overhead press': ['Pike push-up', 'Dumbbell overhead press', 'Barbell overhead press'],
  'Pulldown or assisted pull-up': ['Doorframe row', 'Assisted pull-up', 'Pull-up or lat pulldown'],
  'Split squat': ['Split squat', 'Dumbbell split squat', 'Barbell split squat'],
  'Incline dumbbell press': ['Feet-elevated push-up', 'Incline dumbbell press', 'Incline dumbbell press'],
  'Farmer carry': ['Suitcase carry', 'Dumbbell farmer carry', 'Farmer carry'],
  'Goblet squat or front squat': ['Tempo bodyweight squat', 'Goblet squat', 'Front squat'],
  'Incline press': ['Feet-elevated push-up', 'Incline dumbbell press', 'Incline barbell press'],
  'Chest-supported row': ['Backpack row', 'Chest-supported dumbbell row', 'Chest-supported row'],
  'Leg curl': ['Sliding hamstring curl', 'Seated leg curl', 'Lying leg curl'],
  'Lateral raise': ['Wall slide', 'Dumbbell lateral raise', 'Cable lateral raise'],
  'Bench press or dumbbell press': ['Push-up', 'Dumbbell bench press', 'Barbell bench press'],
  'Triceps pressdown': ['Close-grip push-up', 'Dumbbell triceps extension', 'Cable pressdown'],
  'Rear-delt fly': ['Prone Y raise', 'Dumbbell rear-delt fly', 'Cable rear-delt fly'],
  'Biceps curl': ['Backpack curl', 'Dumbbell curl', 'Cable or barbell curl'],
  'Hip thrust or deadlift variation': ['Glute bridge', 'Dumbbell hip thrust', 'Barbell hip thrust'],
  'Front squat or goblet squat': ['Tempo bodyweight squat', 'Goblet squat', 'Front squat'],
  'Step-up': ['Step-up', 'Dumbbell step-up', 'Barbell step-up'],
  'Leg extension': ['Wall sit', 'Leg extension', 'Leg extension'],
  'Incline dumbbell press': ['Feet-elevated push-up', 'Incline dumbbell press', 'Incline dumbbell press'],
  'Push-up': ['Push-up', 'Push-up', 'Push-up'],
  'Plank': ['Plank', 'Plank', 'Plank'],
  'Calf raise': ['Single-leg calf raise', 'Standing calf raise', 'Standing calf raise'],
  'Dead bug': ['Dead bug', 'Dead bug', 'Dead bug'],
};
const EQUIPMENT_INDEX = { home: 0, basicGym: 1, fullGym: 2 };

const scheduleForDays = (days) => {
  if (days <= 0) return [];
  if (days === 1) return ['fullA'];
  if (days === 2) return ['upperA', 'lowerA'];
  if (days === 3) return ['fullA', 'fullB', 'fullC'];
  if (days === 4) return ['upperA', 'lowerA', 'upperB', 'lowerB'];
  if (days === 5) return ['upperA', 'lowerA', 'push', 'pull', 'legs'];
  return ['push', 'pull', 'legs', 'upperB', 'lowerB', 'fullA', 'fullB'].slice(0, days);
};

function trainingItem(exercise, equipment, prescription, endurance = false) {
  const options = EXERCISE_OPTIONS[exercise] || [exercise, exercise, exercise];
  const selected = options[EQUIPMENT_INDEX[equipment] ?? 2];
  return { exercise: endurance ? `${selected} · controlled circuit` : selected, options: endurance ? options.map((x) => `${x} · controlled circuit`) : [...new Set(options)], prescription };
}
function adaptForStyle(day, style, equipment, plan) {
  const endurance = style === 'endurance';
  return {
    ...day,
    main: day.main.map((exercise) => trainingItem(exercise, equipment, plan.main, endurance)),
    accessory: endurance
      ? [...day.accessory.slice(0, 2).map((exercise) => trainingItem(exercise, equipment, plan.accessory)), { exercise: 'Easy conditioning', options: [], prescription: '15–25 min' }]
      : day.accessory.map((exercise) => trainingItem(exercise, equipment, plan.accessory)),
  };
}

export function buildWorkout(result) {
  const { goal, style, days, equipment = 'fullGym' } = result.input;
  const plan = GOAL[goal] || GOAL.maintain;
  const activeDays = Math.max(0, Math.min(7, Math.round(Number(days) || 0)));
  if (!activeDays) return {
    title: 'Build the movement habit',
    days: [],
    prescription: 'Start with 20–30 minutes of easy walking, mobility, or a beginner session 2–3 times weekly before choosing a higher training target.',
    progression: 'When this feels easy for two weeks, update your plan with the number of training days you can repeat consistently.',
    rest: 'Keep intensity conversational.',
  };
  const daysPlan = scheduleForDays(activeDays).map((key, index) => {
    const template = adaptForStyle(DAYS[key], style, equipment, plan);
    return {
      day: `Session ${index + 1}`,
      label: template.label,
      main: template.main,
      accessory: template.accessory,
    };
  });
  const conditioning = style === 'endurance'
    ? 'Make one or two sessions easy aerobic work; avoid turning every day into a hard interval session.'
    : goal === 'cut'
      ? 'Add 2–3 easy walks or low-intensity cardio sessions weekly if recovery remains good.'
      : 'Use optional easy cardio for health and recovery; keep it away from demanding lower-body sessions.';
  return {
    title: plan.name,
    days: daysPlan,
    prescription: plan.prescription,
    progression: 'When every prescribed set reaches the top of its rep range with clean form, add the smallest available load next session. If performance declines for two weeks, reduce accessory work and review sleep, food and stress.',
    rest: plan.rest,
    conditioning,
    safety: 'General training guidance only. Stop for sharp pain, dizziness, chest pain or unusual shortness of breath, and seek qualified help for injury, medical conditions or exercise clearance.',
  };
}
