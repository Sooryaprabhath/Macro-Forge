// AI-generated illustrative artwork, not measured physiques or a validated estimator.
export const BODY_FAT_RANGES = {
  male: [[10, 14], [15, 19], [20, 24], [25, 29], [30, 34], [35, 40]],
  female: [[18, 22], [23, 27], [28, 32], [33, 37], [38, 42], [43, 45]],
};

// One locally bundled sheet keeps all twelve figures consistent and cacheable.
const sheetUrl = `${import.meta.env?.BASE_URL || '/'}images/bodyfat-reference-sheet.png`;
export function bodyIllustration(sex, index) {
  return `<span class="bf-art" aria-hidden="true"><img src="${sheetUrl}" alt="" loading="lazy" decoding="async" style="left:${-index * 100}%;top:${sex === 'female' ? -100 : 0}%" /></span>`;
}

export function renderBodyFatCards(container, sex) {
  container.innerHTML = BODY_FAT_RANGES[sex].map(([low, high], index) => `
    <button type="button" class="bf-card" data-bf="${Math.round((low + high) / 2)}" data-range="${low}-${high}" aria-pressed="false" aria-label="Use approximate ${low} to ${high} percent body fat, ${sex} illustration">
      <span class="bf-card-top">REFERENCE ${String(index + 1).padStart(2, '0')}<span class="bf-check" aria-hidden="true">✓</span></span>
      ${bodyIllustration(sex, index)}<strong>${low}–${high}%</strong><span>Approximate range</span>
    </button>`).join('');
}
