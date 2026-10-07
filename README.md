# MacroForge

A browser-based macro and nutrition planner built with vanilla JavaScript, Three.js, and Vite.

## Features

- Calorie and macro estimates for cutting, maintenance/recomposition, and bulking
- Diet-aware sample meals with adjustable portions and shuffle
- Meal splits, training/rest-day macros, and 12-week projections
- Interactive 3D macro visualization
- Local browser storage and printable plans

## Development

```sh
npm ci
npm run dev
```

## Production build

```sh
npm run build
npm run preview
```

Vite generates deployment files in `dist/`.

## Source layout

- `src/calc.js`: nutrition calculations and projections
- `src/foods.js`: food database, sample-day solver, and guides
- `src/main.js`: UI events, rendering, and local storage
- `src/scene.js`: Three.js background
- `src/ring3d.js`: 3D macro ring
- `src/style.css`: styles

Plans use formula-based estimates and fixed projection assumptions. All calculations run in the browser; no backend is required.

## Regional meals, body-fat guide and PDF export

- Choose a shopping region in the Diet step. It filters sample meals and food suggestions while preserving the selected diet. Global / other keeps the full food selection. Region and the generated plan are saved locally.
- Open the optional body-fat visual guide in Body stats. Reference-inspired character illustrations offer rough adult ranges for each sex; selecting one enables the slider. These are schematic references, not validated measurements. Switching sex clears a visual estimate.
- Generate a plan, optionally shuffle the sample meals, then select **Download PDF**. The PDF exports the last generated result and currently displayed meals, including targets, projections, a shopping checklist, food guidance and estimate notes. It uses selectable text and paginated tables; no print dialog or WebGL capture is required.
- `npm test` checks region/diet compatibility across meal counts, finite meal quantities, shopping aggregation and PDF generation. `npm run build` verifies the production bundle.

The body-fat artwork is bundled at `public/images/bodyfat-reference-sheet.png`. It was generated with the built-in image-generation tool, using the supplied poster as a style reference. Prompt: a regular six-column, two-row sheet of consistent adult male and female anime-style characters, progressively fuller body shapes, neutral front-facing poses, black gym clothing, flat cool-gray background, no text or labels. The guide labels these images as illustrative and not clinically validated.

Fresh profiles require age, weight and height before Next becomes available. Errors are shown inline; feet/inches mode requires both fields (0 inches is valid). Body fat and target weight remain optional. Saved valid profiles can be reused.

## Progress check-ins

After generating a plan, use **Save a check-in or compare progress** to open the progress section. Choose the measurement date and save. Update your measurements and generate a new plan before saving the next check-in. Any two saved records can be compared for weight, estimated body fat (percentage points) and daily calorie target.

History uses a separate versioned browser-storage key (`macroforge:checkins:v1`); it does not overwrite older check-ins or add records on reload. Identical values on the same date are deduplicated, while changed values are retained as separate records. Body-fat changes are flagged when methods or sex settings differ. No historical date is inferred from a previously saved plan.

Records stay on that browser/device and are lost if its storage is cleared. **Download check-in data** exports JSON for personal recordkeeping; import/sync is not implemented. Storage errors are shown without replacing existing history.

## How the estimates work and where food data comes from

The header info icon opens [the user-facing explanation](public/readme.html), served as `readme.html`. It covers energy equations, app-specific adjustments, macros, regional filtering, meal generation, projection assumptions and local storage.

Calculations are implemented in `src/calc.js`: the published Mifflin–St Jeor adult resting-energy equation, a separately documented lifestyle/training assumption, and a goal adjustment using a fixed 7,700 kcal/kg heuristic. Macro rules and projections remain app-specific estimates. Pregnancy, breastfeeding, users under 18 and medical nutrition management are outside the calculator's supported scope.

`src/food-data.js` contains 33 curated records imported from USDA FoodData Central Foundation Foods 2025-12-18 and SR Legacy 2018-04. Each record carries its FDC ID, dataset/version, retrieval date, preparation state, serving weight, energy, macros, fibre and available micronutrients; unavailable values remain `null`. Regenerate it from official JSON downloads with `scripts/import-food-data.mjs`. The IFCT 2017 PDF was obtained but no Indian values were imported because extraction could not be independently verified.

`src/recipes.js` implements edible-weight, nutrient-retention and final-yield recipe calculations following FAO/INFOODS structure. Standardized Indian dishes are not published until their ingredient records, measured yields and applicable retention factors are verified. See [EVIDENCE.md](EVIDENCE.md) and `data/import-manifest.json` for the rule-to-source map and exact import status.
