/**
 * safeDate.js — Utility crash-proof per date nell'app
 * REGOLA: nessun new Date(value) o format(parseISO(value)) diretto.
 * Usare sempre queste funzioni.
 */

import { format, parseISO, isToday, isTomorrow, isValid } from 'date-fns';
import { it, enUS } from 'date-fns/locale';

export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^\d{1,2}:\d{2}$/;

/** Ritorna Date solo se ISO valida, altrimenti null */
export function safeDate(value) {
  if (!value) return null;
  try {
    if (value instanceof Date) return isValid(value) ? value : null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (ISO_DATE_RE.test(trimmed)) {
        const d = parseISO(trimmed);
        return isValid(d) ? d : null;
      }
    }
    return null;
  } catch { return null; }
}

/** Ritorna Date da qualsiasi stringa timestamp/ISO, altrimenti null */
export function safeTimestamp(value) {
  if (!value) return null;
  try {
    const d = new Date(value);
    return !isNaN(d.getTime()) && isValid(d) ? d : null;
  } catch { return null; }
}

/** Formatta data ISO in modo sicuro */
export function formatSafeDate(value, fmt = 'd MMM', locale = 'it', fallback = '—') {
  const d = safeDate(value);
  if (!d) return fallback;
  try { return format(d, fmt, { locale: locale === 'en' ? enUS : it }); }
  catch { return fallback; }
}

/** Formatta timestamp completo (created_date, updated_date) in modo sicuro */
export function formatSafeTimestamp(value, fmt = 'dd/MM HH:mm', fallback = '') {
  if (!value) return fallback;
  try {
    const d = new Date(value);
    if (isNaN(d.getTime()) || !isValid(d)) return fallback;
    return format(d, fmt);
  } catch { return fallback; }
}

/** Etichetta leggibile: Oggi / Domani / dd MMM */
export function safeDateLabel(value, lang = 'it', todayLabel = 'Oggi', tomorrowLabel = 'Domani', fallback = 'Da confermare') {
  const d = safeDate(value);
  if (!d) return fallback;
  try {
    if (isToday(d)) return todayLabel;
    if (isTomorrow(d)) return tomorrowLabel;
    return format(d, 'd MMM', { locale: lang === 'en' ? enUS : it });
  } catch { return fallback; }
}

/** Sanitizza data per DB: solo yyyy-MM-dd, altrimenti null */
export function sanitizeDateForDB(value) {
  if (!value) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!ISO_DATE_RE.test(trimmed)) return null;
  try {
    return !isNaN(new Date(trimmed).getTime()) ? trimmed : null;
  } catch { return null; }
}

/** Sanitizza ora per DB: solo HH:MM, altrimenti null */
export function sanitizeTimeForDB(value) {
  if (!value) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return TIME_RE.test(trimmed) ? trimmed : null;
}

/** Formatta data relativa in modo sicuro, es. "2 giorni fa" */
export function timeAgo(value, lang = 'it') {
  const d = safeTimestamp(value);
  if (!d) return '';
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  const min = Math.floor(diff / 60);
  const hrs = Math.floor(min / 60);
  const days = Math.floor(hrs / 24);
  if (lang === 'en') {
    if (diff < 60) return 'just now';
    if (min < 60) return `${min}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    return `${days}d ago`;
  }
  if (diff < 60) return 'adesso';
  if (min < 60) return `${min}m fa`;
  if (hrs < 24) return `${hrs}h fa`;
  return `${days}g fa`;
}