const NUTRIENTS = ['energy', 'protein', 'carbs', 'fat', 'fibre', 'calcium', 'iron', 'magnesium', 'potassium', 'sodium', 'vitaminC', 'vitaminB12', 'vitaminD'];

// FAO/INFOODS-style recipe calculation: edible ingredient weights, nutrient-specific
// retention where available, and measured final cooked weight determine final density.
export function calculateRecipe(recipe, foodRecords) {
  if (!recipe?.ingredients?.length || !(recipe.finalCookedWeight > 0) || !(recipe.servings > 0)) {
    throw new Error('Recipe requires ingredients, final cooked weight, and servings.');
  }
  const totals = Object.fromEntries(NUTRIENTS.map((key) => [key, 0]));
  const known = Object.fromEntries(NUTRIENTS.map((key) => [key, true]));
  const ingredients = recipe.ingredients.map((ingredient) => {
    const food = foodRecords.find((row) => row.id === ingredient.foodId);
    if (!food) throw new Error(`Unknown recipe food record: ${ingredient.foodId}`);
    if (!(ingredient.grams > 0)) throw new Error(`Invalid ingredient weight: ${ingredient.foodId}`);
    const edibleGrams = ingredient.grams * (ingredient.ediblePortion ?? food.ediblePortion ?? 1);
    for (const key of NUTRIENTS) {
      const value = food.nutrients[key];
      if (!Number.isFinite(value)) { known[key] = false; continue; }
      const retention = ingredient.retention?.[key] ?? 1;
      if (!(retention >= 0 && retention <= 1)) throw new Error(`Invalid retention factor for ${key}`);
      totals[key] += value * edibleGrams / 100 * retention;
    }
    return { foodId: food.id, grams: ingredient.grams, edibleGrams };
  });
  const scale = (grams) => Object.fromEntries(NUTRIENTS.map((key) => [key, known[key] ? totals[key] * grams / recipe.finalCookedWeight : null]));
  return {
    id: recipe.id, name: recipe.name, type: 'recipe-calculated', preparation: recipe.preparation,
    assumptions: recipe.assumptions || [], ingredients, finalCookedWeight: recipe.finalCookedWeight,
    servings: recipe.servings, servingGrams: recipe.finalCookedWeight / recipe.servings,
    nutrientsPer100g: scale(100), nutrientsPerServing: scale(recipe.finalCookedWeight / recipe.servings),
    source: { name: 'Calculated recipe', method: 'FAO/INFOODS recipe calculation', version: 1 },
  };
}

export function validateFoodRecords(records) {
  const ids = new Set();
  return records.flatMap((food) => {
    const errors = [];
    if (ids.has(food.id)) errors.push(`${food.id}: duplicate ID`); else ids.add(food.id);
    if (!(food.servingGrams > 0)) errors.push(`${food.id}: invalid serving weight`);
    if (!['raw', 'cooked', 'dry'].includes(food.state)) errors.push(`${food.id}: invalid preparation state`);
    if (!food.source?.foodId || !food.source?.version || !food.source?.retrievalDate) errors.push(`${food.id}: incomplete provenance`);
    for (const key of ['energy', 'protein', 'carbs', 'fat']) if (!Number.isFinite(food.nutrients?.[key])) errors.push(`${food.id}: missing ${key}`);
    for (const [key, value] of Object.entries(food.nutrients || {})) if (value !== null && (!Number.isFinite(value) || value < 0)) errors.push(`${food.id}: invalid ${key}`);
    return errors;
  });
}
