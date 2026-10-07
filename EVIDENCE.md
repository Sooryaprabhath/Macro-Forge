# MacroForge evidence map

Last reviewed: 2026-10-08. MacroForge is an educational planning tool for generally healthy adults aged 18–90. It is not clinically validated and does not calculate targets for pregnancy, breastfeeding, childhood, or medical nutrition therapy.

| Feature | Implemented rule | Evidence or dataset | Status and limitation |
|---|---|---|---|
| Resting energy | `10 × kg + 6.25 × cm − 5 × years + 5` for males or `−161` for females | Mifflin et al. 1990, PMID 2305711 | Implemented for adults. It predicts resting energy, not TDEE. Individual error remains. |
| Equation limitations | Results are labelled estimates | Frankenfield et al. 2005, PMID 15883556 | Supports using Mifflin as a reasonable population equation; does not guarantee individual accuracy. |
| TDEE | REE × selected activity factor plus an app-specific training increment | App assumption | Not supplied by Mifflin. Must be adjusted against measured weight trends. |
| Goal calories | Percentage-of-body-weight pace converted with 7,700 kcal/kg and a calorie floor | App assumption | A planning heuristic, not a physiological model. |
| Projection | Fixed weekly change and assumed lean/fat partition | Compared with Hall et al. 2011 | Hall's dynamic model is not implemented. The projection is explicitly illustrative because energy requirements adapt over time. |
| Food composition | Per-100-g edible-food records with stored energy, macros, fibre, available micronutrients, preparation state, serving weight, source ID/version/date, and missing values as `null` | USDA FoodData Central Foundation Foods 2025-12-18 and SR Legacy 2018-04 | 33 curated records imported. Foundation and legacy records remain distinguishable. SR Legacy values may be analytical, calculated, imputed, or literature-derived. |
| Indian foods | Intended primary source: Longvah et al., IFCT 2017 | ICMR–NIN IFCT 2017 | PDF obtained but no values imported: table extraction could not be independently verified in this environment. Paneer, dosa, biryani and other Indian recipes are therefore not claimed as verified. |
| Recipes | Edible ingredient weights, nutrient-specific retention, final cooked weight, per-100-g and per-serving output | FAO/INFOODS recipe method; USDA Retention Factors Release 6 | Calculation engine implemented. No standardized dish is published until ingredient records, measured yield, and applicable retention factors are verified. |
| Balanced meals | Dietary filters, allergies, exclusions, fruit/vegetable inclusion, food-derived fibre totals | ICMR–NIN Dietary Guidelines for Indians 2024 | Partial. Variety cues are implemented; micronutrient adequacy targets are not yet scored. |

## Reproducible USDA import

Download the official Foundation Foods and SR Legacy JSON archives, then run:

```sh
node scripts/import-food-data.mjs path/to/Foundation.json path/to/SRLegacy.json > src/food-data.js
npm test
```

The importer selects explicit FDC IDs, requires energy/protein/carbohydrate/fat, preserves unavailable nutrients as `null`, and emits record-level provenance. Missing selected IDs or required nutrients fail the import.
