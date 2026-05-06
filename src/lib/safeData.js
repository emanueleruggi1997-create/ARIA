/**
 * safeData.js — Utility crash-proof per accesso sicuro a dati potenzialmente nulli/corrotti.
 * Usare queste funzioni in tutti i componenti al posto di accessi diretti non sicuri.
 */

/** Accesso sicuro a proprietà annidate: safeGet(obj, 'a.b.c', fallback) */
export function safeGet(obj, path, fallback = null) {
  if (obj == null) return fallback;
  try {
    const parts = typeof path === 'string' ? path.split('.') : path;
    let current = obj;
    for (const part of parts) {
      if (current == null) return fallback;
      current = current[part];
    }
    return current ?? fallback;
  } catch { return fallback; }
}

/** Garantisce un array: se il valore non è un array, ritorna [] */
export function safeArray(value) {
  if (Array.isArray(value)) return value;
  return [];
}

/** Garantisce una stringa: se null/undefined/non-stringa, ritorna fallback */
export function safeString(value, fallback = '') {
  if (value == null) return fallback;
  if (typeof value === 'string') return value;
  try { return String(value); } catch { return fallback; }
}

/** Garantisce un numero: se NaN/null/non-numerico, ritorna fallback */
export function safeNumber(value, fallback = 0) {
  if (value == null) return fallback;
  const n = Number(value);
  return isNaN(n) ? fallback : n;
}

/** Garantisce un booleano */
export function safeBool(value, fallback = false) {
  if (value == null) return fallback;
  return !!value;
}

/** Parse JSON sicuro: ritorna fallback se il parse fallisce */
export function safeJSON(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

/** Tronca stringa in modo sicuro */
export function safeTruncate(value, maxLength = 200, fallback = '') {
  const s = safeString(value, fallback);
  return s.length > maxLength ? s.slice(0, maxLength) : s;
}

/** Iniziali sicure da un nome */
export function safeInitials(nome, fallback = '?') {
  if (!nome || typeof nome !== 'string') return fallback;
  return nome.trim().split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || fallback;
}

/** Formatta numero come valuta EUR */
export function safeEur(value, fallback = '—') {
  const n = safeNumber(value, null);
  if (n == null) return fallback;
  return `€${n.toLocaleString('it-IT')}`;
}

/** Valida stringa non vuota */
export function isNonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}