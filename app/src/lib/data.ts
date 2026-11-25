import eventsJson from '../data/events.json';
import rulersJson from '../data/rulers.json';
import erasJson from '../data/eras.json';
import populationJson from '../data/population.json';
import peopleJson from '../data/people.json';
import rabbinicJson from '../data/rabbinic-eras.json';
import type { DateMode, Dating, Era, HistoryEvent, ItemRef, Person, PersonCategory, PopulationPoint, RabbinicEra, Ruler, Span, WikiSummary } from '../data/types';
import { yearToU } from './timeScale';

export const events = (eventsJson as HistoryEvent[]).slice().sort((a, b) => primaryStart(a.dating) - primaryStart(b.dating));
export const rulers = rulersJson as Ruler[];
export const eras = erasJson as Era[];
export const population = (populationJson as PopulationPoint[]).slice().sort((a, b) => a.year - b.year);

/** Wikipedia summaries cached at build time; one lazily loaded file per language. */
const wikiCaches: Partial<Record<'he' | 'en', Record<string, WikiSummary>>> = {};
export function loadWikiCache(lang: 'he' | 'en'): Promise<Record<string, WikiSummary>> {
  if (wikiCaches[lang]) return Promise.resolve(wikiCaches[lang]!);
  const p = lang === 'he' ? import('../data/wiki-cache.he.json') : import('../data/wiki-cache.en.json');
  return p.then((m) => (wikiCaches[lang] = m.default as Record<string, WikiSummary>));
}
export const getWikiCache = (lang: 'he' | 'en') => wikiCaches[lang];

export const people = (peopleJson as Person[]).slice().sort((a, b) => a.dating.acad!.start - b.dating.acad!.start);
export const rabbinicEras = rabbinicJson as RabbinicEra[];

export const eventById = new Map(events.map((e) => [e.id, e]));
export const personById = new Map(people.map((p) => [p.id, p]));
export const rabbinicById = new Map(rabbinicEras.map((r) => [r.id, r]));
export const rulerById = new Map(rulers.map((r) => [r.id, r]));
export const eraById = new Map(eras.map((e) => [e.id, e]));

function primaryStart(d: Dating) {
  return (d.acad ?? d.trad)!.start;
}

/** True when the item is dated only by tradition (no academic date). */
export const isTradOnly = (d: Dating) => d.acad === null;
/** True when tradition and scholarship give different dates. */
export const datingsDiffer = (d: Dating) =>
  !!d.trad && !!d.acad && (d.trad.start !== d.acad.start || d.trad.end !== d.acad.end);

/** The span to draw as the main position under the given mode. */
export function mainSpan(d: Dating, mode: DateMode): Span {
  if (mode === 'trad') return d.trad ?? d.acad!;
  return d.acad ?? d.trad!;
}

/** In "both" mode, the extra traditional position to draw as a ghost. */
export function ghostSpan(d: Dating, mode: DateMode): Span | null {
  return mode === 'both' && datingsDiffer(d) ? d.trad! : null;
}

/**
 * Assign each event a stacking level so that labels close together in time
 * stand at different heights instead of overlapping.
 */
export function layoutLevels(items: { id: string; u: number }[], minGap = 7, maxLevels = 5): Map<string, number> {
  const sorted = items.slice().sort((a, b) => a.u - b.u);
  const lastU: number[] = [];
  const out = new Map<string, number>();
  for (const it of sorted) {
    let level = lastU.findIndex((u) => it.u - u >= minGap);
    if (level === -1) {
      if (lastU.length < maxLevels) level = lastU.length;
      else level = lastU.indexOf(Math.min(...lastU));
    }
    lastU[level] = it.u;
    out.set(it.id, level);
  }
  return out;
}

export function eventU(e: HistoryEvent, mode: DateMode) {
  return yearToU(mainSpan(e.dating, mode).start);
}

/** Monotone cubic (Fritsch–Carlson) interpolation of population — no overshoot. */
function monotone(xs: number[], ys: number[]) {
  const n = xs.length;
  const d: number[] = [];
  const m: number[] = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

const py = population.map((p) => p.year);
export const popTotal = monotone(py, population.map((p) => p.total));
export const popMax = monotone(py, population.map((p) => p.max ?? p.total));
export const popMin = monotone(py, population.map((p) => p.min ?? p.total));
const withIsrael = population.filter((p) => p.israel !== undefined);
const israelInterp = monotone(withIsrael.map((p) => p.year), withIsrael.map((p) => p.israel!));
export const ISRAEL_FROM = withIsrael[0].year;
export const popIsrael = (y: number) => (y < ISRAEL_FROM ? 0 : israelInterp(y));
export const POP_FROM = population[0].year;
export const POP_TO = population[population.length - 1].year;

export function nearestPopPoint(year: number): PopulationPoint {
  return population.reduce((best, p) => (Math.abs(p.year - year) < Math.abs(best.year - year) ? p : best));
}

/** Chronological list of navigable items (events and rulers) for prev/next. */
export function navOrder(mode: DateMode): ItemRef[] {
  return events
    .map((e) => ({ ref: { type: 'event', id: e.id } as ItemRef, y: mainSpan(e.dating, mode).start }))
    .sort((a, b) => a.y - b.y)
    .map((x) => x.ref);
}

export function wikiUrl(lang: 'he' | 'en', title: string) {
  return `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
}

export const KIND_COLORS: Record<HistoryEvent['kind'], string> = {
  biblical: '#8a6d3b',
  political: '#3f5f8f',
  catastrophe: '#9b2f2f',
  religious: '#6a4c93',
  migration: '#2f7f6f',
  cultural: '#b07a1f',
  war: '#6b5b4b',
  zionism: '#1f6fb0',
};

export const KIND_LABELS: Record<HistoryEvent['kind'], { he: string; en: string }> = {
  biblical: { he: 'מקרא', en: 'Bible' },
  political: { he: 'מדיני', en: 'Politics' },
  catastrophe: { he: 'אסון ורדיפות', en: 'Catastrophe & persecution' },
  religious: { he: 'דת והלכה', en: 'Religion & law' },
  migration: { he: 'הגירה ועלייה', en: 'Migration & aliyah' },
  cultural: { he: 'תרבות והגות', en: 'Culture & thought' },
  war: { he: 'מלחמה ומרד', en: 'War & revolt' },
  zionism: { he: 'ציונות ומדינה', en: 'Zionism & the State' },
};

export const POWER_COLORS: Record<string, string> = {
  egypt: '#c9a227',
  israel: '#2f62b5',
  mesopotamia: '#8c5a3c',
  persia: '#3e8e7e',
  greek: '#6c8fb3',
  rome: '#9a3b3b',
  arab: '#3f7f47',
  crusader: '#b0453a',
  ottoman: '#a33a5a',
  british: '#5a5f73',
};

/** Year a person is placed at on the timeline: the middle of their life. */
export const personYear = (p: Person) => {
  const s = p.dating.acad!;
  return (s.start + (s.end ?? s.start)) / 2;
};

/** The rabbinic era that contains a year (under the given dating mode). */
export function rabbinicEraAt(year: number, mode: DateMode) {
  return rabbinicEras.find((r) => {
    const s = mainSpan(r.dating, mode);
    return year >= s.start && year < (s.end ?? s.start);
  });
}

export const CATEGORY_COLORS: Record<PersonCategory, string> = {
  sage: '#5b7f4a',
  rabbi: '#6a4c93',
  thinker: '#2f6f8f',
  poet: '#b0582f',
  mystic: '#8a5a9e',
  leader: '#1f5fa8',
  writer: '#8a6d3b',
};

export const CATEGORY_LABELS: Record<PersonCategory, { he: string; en: string }> = {
  sage: { he: 'חכם', en: 'Sage' },
  rabbi: { he: 'רב ופוסק', en: 'Rabbi & halakhist' },
  thinker: { he: 'הוגה', en: 'Thinker' },
  poet: { he: 'משורר', en: 'Poet' },
  mystic: { he: 'מקובל', en: 'Mystic' },
  leader: { he: 'מנהיג ועסקן', en: 'Leader' },
  writer: { he: 'סופר והיסטוריון', en: 'Writer & historian' },
};
