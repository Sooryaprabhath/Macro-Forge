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
