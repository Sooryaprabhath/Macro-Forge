export const HEALTH_CONDITIONS = {
  fatty_liver: 'Fatty liver / MASLD',
  high_cholesterol: 'High cholesterol',
  diabetes: 'Diabetes / blood sugar treatment',
  hypertension: 'High blood pressure',
  kidney_disease: 'Kidney disease',
  liver_disease: 'Other liver disease',
  eating_disorder: 'Eating disorder history',
  medication: 'Medication affecting diet or exercise',
  other_medical: 'Other medical condition',
};

const GUIDANCE = {
  fatty_liver: 'Use gradual, sustainable changes. Avoid crash dieting, and review alcohol, medicines and supplements with your clinician.',
  high_cholesterol: 'Favor vegetables, fruit, whole grains, beans and other soluble-fiber foods. Replace saturated fats with unsaturated fats and follow your prescribed lipid treatment.',
  diabetes: 'Carbohydrate amount, meal timing and exercise can affect glucose and medication needs. Review this plan with your diabetes clinician.',
  hypertension: 'Sodium, hydration and exercise advice may need individual limits. Follow your clinician’s blood-pressure plan.',
  kidney_disease: 'Generic protein, sodium, potassium and fluid targets may be unsuitable for kidney disease. Use targets from your renal clinician or dietitian.',
  liver_disease: 'Protein, energy, alcohol and supplement advice can change with liver disease. Use a clinician-approved plan.',
  eating_disorder: 'Calorie or weight targets may be unsafe during recovery. Use this planner only with support from a qualified care team.',
  medication: 'Medicines can change appetite, glucose, hydration, blood pressure and exercise response. Confirm this plan with the prescriber.',
  other_medical: 'Your condition may change suitable calorie, nutrient or exercise targets. Review the plan with a qualified clinician.',
};

export const HEALTH_EVIDENCE = [
  { condition: 'fatty_liver', topic: 'Fatty liver / MASLD', citation: 'AASLD Practice Guidance', year: '2023', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10735173/' },
  { condition: 'high_cholesterol', topic: 'High cholesterol', citation: 'ACC/AHA Dyslipidemia Guideline', year: '2026', url: 'https://doi.org/10.1161/CIR.0000000000001423' },
  { condition: 'diabetes', topic: 'Diabetes', citation: 'ADA Standards of Care, Section 5', year: '2026', url: 'https://doi.org/10.2337/dc26-S005' },
  { condition: 'hypertension', topic: 'High blood pressure', citation: 'AHA/ACC High Blood Pressure Guideline', year: '2025', url: 'https://www.ahajournals.org/doi/full/10.1161/CIR.0000000000001356' },
  { condition: 'kidney_disease', topic: 'Kidney disease', citation: 'KDIGO CKD Guideline', year: '2024', url: 'https://kdigo.org/wp-content/uploads/2024/03/KDIGO-2024-CKD-Guideline.pdf' },
  { condition: 'liver_disease', topic: 'Other liver disease', citation: 'AASLD disease-specific guidelines', year: 'Current', url: 'https://www.aasld.org/practice-guidelines' },
  { condition: 'eating_disorder', topic: 'Eating-disorder history', citation: 'APA Eating Disorders Guideline', year: '2023', url: 'https://www.psychiatry.org/psychiatrists/practice/clinical-practice-guidelines/eating-disorders' },
  { condition: 'medication', topic: 'Medication and supplements', citation: 'FDA interaction guidance', year: 'Current', url: 'https://www.fda.gov/consumers/consumer-updates/mixing-medications-and-dietary-supplements-can-endanger-your-health' },
];

const SOURCES = Object.fromEntries(HEALTH_EVIDENCE.map(({ condition, citation, year, url }) => [condition, [`${citation} (${year})`, url]]));

const INDIVIDUAL_PLAN_REQUIRED = new Set(['kidney_disease', 'liver_disease', 'eating_disorder']);

export function normalizeHealthConditions(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value) => Object.hasOwn(HEALTH_CONDITIONS, value)))];
}

export function safePlanningPace(goal, pace, healthConditions) {
  return normalizeHealthConditions(healthConditions).length && goal !== 'maintain' && pace === 'aggressive'
    ? 'moderate'
    : pace;
}

export function medicalSafety(input = {}) {
  const conditions = normalizeHealthConditions(input.healthConditions);
  const sources = [...new Map(conditions.filter((condition) => SOURCES[condition]).map((condition) => SOURCES[condition]).map((source) => [source[1], source])).values()];
  return {
    conditions,
    labels: conditions.map((condition) => HEALTH_CONDITIONS[condition]),
    guidance: conditions.map((condition) => GUIDANCE[condition]),
    sources,
    requiresClinicalReview: conditions.length > 0,
    requiresIndividualPlan: conditions.some((condition) => INDIVIDUAL_PLAN_REQUIRED.has(condition)),
    supplementsAllowed: conditions.length === 0,
  };
}
