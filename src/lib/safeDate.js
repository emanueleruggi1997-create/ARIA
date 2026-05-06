/**
 * safeDate.js — Utility crash-proof per date nell'app
 *
 * REGOLA: nessun new Date(value) o format(parseISO(value)) diretto.
 * Usare sempre queste funzioni che gestiscono null/undefined/stringhe invalide.
 */

import { format, parseISO, isToday, isTomorrow, isValid } from 'date-fns';
import { it, enUS } from 'date-fns/locale';

// Regex per date ISO valide yyyy-MM-dd
export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Regex per ora HH:MM
export const TIME_RE = /^\d{1,2}:\d{2}$/;

/**
 * Ritorna un oggetto Date solo se il valore è una data ISO valida.
 * Altrimenti null.
 */
export function safeDate(value) {
  if (!value) return null;
  try {
    if (typeof value === 'string' && ISO_DATE_RE.test(value)) {
      const d = parseISO(value);
      return isValid(d) ? d : null;
    }
    if (value instanceof Date) {
      return isValid(value) ? value : null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Formatta una data in modo sicuro.
 * Se la data non è valida, ritorna fallback (default: '—').
 */
export function formatSafeDate(value, fmt = 'd MMM', locale = 'it', fallback = '—') {
  const d = safeDate(value);
  if (!d) return fallback;
  try {
    return format(d, fmt, { locale: locale === 'en' ? enUS : it });
  } catch {
    return fallback;
  }
}

/**
 * Formatta un timestamp (created_date, updated_date) in modo sicuro.
 * Accetta ISO 8601 completo (con T e Z).
 */
export function formatSafeTimestamp(value, fmt = 'dd/MM HH:mm', fallback = '') {
  if (!value) return fallback;
  try {
    const d = new Date(value);
    if (!isValid(d) || isNaN(d.getTime())) return fallback;
    return format(d, fmt);
  } catch {
    return fallback;
  }
}

/**
 * Ritorna etichetta leggibile per una data (Oggi / Domani / dd MMM).
 */
export function safeDateLabel(value, lang = 'it', todayLabel = 'Oggi', tomorrowLabel = 'Domani', fallback = 'Da confermare') {
  const d = safeDate(value);
  if (!d) return fallback;
  try {
    if (isToday(d)) return todayLabel;
    if (isTomorrow(d)) return tomorrowLabel;
    return format(d, 'd MMM', { locale: lang === 'en' ? enUS : it });
  } catch {
    return fallback;
  }
}

/**
 * Sanitizza un valore data prima di salvarlo nel DB.
 * Accetta solo stringhe ISO yyyy-MM-dd.
 * Qualsiasi altra stringa ("domani", "martedì") → null.
 */
export function sanitizeDateForDB(value) {
  if (!value) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!ISO_DATE_RE.test(trimmed)) return null;
  try {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : trimmed;
  } catch {
    return null;
  }
}

/**
 * Sanitizza un valore ora prima di salvarlo nel DB.
 * Accetta solo stringhe HH:MM.
 */
export function sanitizeTimeForDB(value) {
  if (!value) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return TIME_RE.test(trimmed) ? trimmed : null;
}