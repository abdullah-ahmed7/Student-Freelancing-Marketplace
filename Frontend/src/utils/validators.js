const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(v) { return EMAIL_RE.test(String(v).trim()); }

// University addresses end in .edu or .edu.pk (e.g. l232606@lhr.nu.edu.pk)
export function isUniversityEmail(v) {
  return isEmail(v) && /\.edu(\.[a-z]{2})?$/i.test(String(v).trim());
}

export function isHttpUrl(v) { return isUrl(String(v || '').trim()); }

export function isUrl(v) {
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isPositiveInt(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0;
}

export function validateRegister(f) {
  const e = {};
  if (!f.fullName.trim()) e.fullName = 'Enter your full name.';
  if (!f.email.trim()) e.email = 'Enter your university email.';
  else if (!isUniversityEmail(f.email)) e.email = 'Use your university email (ending in .edu or .edu.pk).';
  if (!f.degree) e.degree = 'Select your degree.';
  if (!f.program.trim()) e.program = 'Enter your program (e.g. Computer Science).';
  if (!f.department.trim()) e.department = 'Enter your department.';
  if (!f.semester) e.semester = 'Select your semester.';
  if (f.password.length < 8) e.password = 'Password must be at least 8 characters.';
  if (f.confirm !== f.password) e.confirm = 'Passwords do not match.';
  return e;
}

export function validateService(f) {
  const e = {};
  if (f.title.trim().length < 8) e.title = 'Title must be at least 8 characters.';
  if (!f.categoryId) e.category = 'Choose a category.';
  if (f.description.trim().length < 30) e.description = 'Describe your service in at least 30 characters.';
  if (!isPositiveInt(f.price)) e.price = 'Enter a valid whole-number price.';
  const d = Number(f.deliveryDays);
  if (!Number.isInteger(d) || d < 1 || d > 365) e.deliveryDays = 'Delivery must be between 1 and 365 days.';
  const urls = f.images.filter((u) => u.trim());
  if (urls.length > 4) e.images = 'You can add up to 4 images.';
  else if (urls.some((u) => !isUrl(u.trim()))) e.images = 'Each image must be a valid http(s) URL.';
  return e;
}
