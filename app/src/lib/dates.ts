import type { Span } from '../data/types';
import { lang } from '../i18n';

/** Gregorian year (negative = BCE) -> Anno Mundi (Hebrew year), approximate (the Hebrew year starts in autumn). */
export function toAnnoMundi(year: number): number {
  return year < 0 ? 3761 + year + 1 : 3760 + year;
}

const ONES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
const TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
const HUNDREDS = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק'];

/** Hebrew numerals (gematria), e.g. 5252 -> ה'רנ"ב, 15 -> ט"ו */
export function gematria(n: number): string {
  if (n <= 0) return String(n);
  const thousands = Math.floor(n / 1000);
  let rest = n % 1000;
  let s = HUNDREDS[Math.floor(rest / 100)];
  rest %= 100;
  if (rest === 15) s += 'טו';
  else if (rest === 16) s += 'טז';
  else s += TENS[Math.floor(rest / 10)] + ONES[rest % 10];
  if (s.length > 1) s = s.slice(0, -1) + '"' + s.slice(-1);
  else if (s.length === 1) s += "'";
  const prefix = thousands ? ONES[thousands] + "'" : '';
  return prefix + s;
}

/** The Hebrew year as shown in the current language: gematria in Hebrew, "AM 5252" in English. */
export function hebrewYear(year: number): string {
  const am = toAnnoMundi(year);
  return lang === 'he' ? gematria(am) : `AM ${am}`;
}

const BCE = () => (lang === 'he' ? 'לפנה״ס' : 'BCE');
const CE = () => (lang === 'he' ? 'לסה״נ' : 'CE');
const APPROX = () => (lang === 'he' ? 'בערך ' : 'c. ');

/** "586 לפנה״ס" / "586 BCE" / "1492" */
export function formatYear(year: number): string {
  const y = Math.round(year);
  return y < 0 ? `${-y} ${BCE()}` : `${y}`;
}

/** Axis label: marks CE explicitly for the first millennium. */
export function formatYearShort(year: number): string {
  const y = Math.round(year);
  if (y < 0) return `${-y} ${BCE()}`;
  if (y < 1000) return `${y} ${CE()}`;
  return `${y}`;
}

export function formatSpan(span: Span): string {
  const a = span.approx ? APPROX() : '';
  if (span.end === undefined || span.end === span.start) return a + formatYear(span.start);
  if (span.start < 0 && span.end < 0) return `${a}${-span.start}–${-span.end} ${BCE()}`;
  if (span.start < 0 && span.end > 0) return `${a}${-span.start} ${BCE()} – ${span.end} ${CE()}`;
  return `${a}${span.start}–${span.end}`;
}

export function formatAM(span: Span): string {
  if (lang === 'en') {
    const s = toAnnoMundi(span.start);
    return span.end === undefined || span.end === span.start ? `AM ${s}` : `AM ${s}–${toAnnoMundi(span.end)}`;
  }
  const s = gematria(toAnnoMundi(span.start));
  if (span.end === undefined || span.end === span.start) return `שנת ${s} לבריאה`;
  return `${s}–${gematria(toAnnoMundi(span.end))}`;
}

export function formatMillions(m: number): string {
  if (lang === 'en') {
    if (m >= 1) return `${m.toLocaleString('en-US', { maximumFractionDigits: 2 })} million`;
    return `${(Math.round(m * 1000) * 1000).toLocaleString('en-US')}`;
  }
  if (m >= 1) return `${m.toLocaleString('he-IL', { maximumFractionDigits: 2 })} מיליון`;
  return `${Math.round(m * 1000).toLocaleString('he-IL')} אלף`;
}
