// Validate raw strings so an empty field never becomes an implicit zero.
export function bodyErrors(values, unit = 'cm') {
  const errors = {};
  const check = (id, min, max, label, integer = false) => {
    const raw = String(values[id] ?? '').trim();
    const n = Number(raw);
    if (!raw) errors[id] = `Enter ${label}.`;
    else if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
      errors[id] = `Enter ${label} ${integer ? 'as a whole number ' : ''}between ${min} and ${max}.`;
    }
    return n;
  };
  check('age', 18, 90, 'your age', true);
  check('weight', 30, 300, 'your weight in kg');
  if (unit === 'ft') {
    const ft = check('heightFt', 3, 7, 'feet', true);
    const inches = check('heightFtIn', 0, 11, 'inches (use 0 for whole feet)', true);
    if (!errors.heightFt && !errors.heightFtIn && ((ft * 12 + inches) * 2.54 < 120 || (ft * 12 + inches) * 2.54 > 230)) {
      errors.heightFt = 'Total height must be between 120 and 230 cm (about 3 ft 11 in to 7 ft 6 in).';
    }
  } else check('heightCm', 120, 230, 'your height in cm');
  return errors;
}
