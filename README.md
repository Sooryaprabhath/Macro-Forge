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
