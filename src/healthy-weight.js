// Adult BMI screening range: BMI 18.5–24.9 kg/m².
// It describes a height-relative reference range, not an individual's ideal weight.
export function healthyWeightRange(heightCm) {
  const cm = Number(heightCm);
  if (!Number.isFinite(cm) || cm < 91.44 || cm > 274.32) return null;
  const square = (cm / 100) ** 2;
  const minKg = 18.5 * square;
  const maxKg = 24.9 * square;
  return {
    heightCm: cm,
    minKg: Math.round(minKg * 10) / 10,
    maxKg: Math.round(maxKg * 10) / 10,
    minLb: Math.round(minKg * 2.20462),
    maxLb: Math.round(maxKg * 2.20462),
  };
}
