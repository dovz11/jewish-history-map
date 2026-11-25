/**
 * Data model for the 3D Jewish history map.
 *
 * Years use the historical convention: negative = BCE (לפנה"ס), positive = CE.
 * Every dated item may carry two datings:
 *   - `acad`: the academic / archaeological estimate (null when scholarship gives no date)
 *   - `trad`: the traditional dating (Seder Olam / Hebrew calendar), when it differs
 * When `trad` is missing, both systems agree. When `acad` is null, the item is
 * known from tradition only (e.g. the Flood).
 */

export type Lang = 'he' | 'en';
export type Localized = { he: string; en?: string };

export interface Span {
  start: number;
  /** omitted for a single-year item */
  end?: number;
  /** the date is approximate ("בערך") */
  approx?: boolean;
}

export interface Dating {
  acad: Span | null;
  trad?: Span;
  /** free-text note on the dating debate */
  note?: Localized;
}

export interface WikiRef {
  /** Hebrew Wikipedia article title */
  he?: string;
  /** English Wikipedia article title */
  en?: string;
}

export interface HistoryEvent {
  id: string;
  title: Localized;
  dating: Dating;
  /** 1 (minor) .. 5 (pivotal) — drives marker size and level-of-detail */
  importance: 1 | 2 | 3 | 4 | 5;
  kind: 'biblical' | 'political' | 'catastrophe' | 'religious' | 'migration' | 'cultural' | 'war' | 'zionism';
  summary: Localized;
  wiki: WikiRef;
  /** place ids (see places.json) for the globe view */
  places?: string[];
}

export interface Ruler {
  id: string;
  title: Localized;
  dating: Dating;
  /** palette key, groups similar powers */
  power: string;
  /** row inside the sovereignty lane (0 = main, 1 = parallel kingdom) */
  row?: 0 | 1;
  /** Jewish sovereignty / self-rule */
  jewish?: boolean;
  summary: Localized;
  wiki: WikiRef;
}

export interface PopulationPoint {
  year: number;
  /** world Jewish population, millions (central estimate) */
  total: number;
  /** plausible range, millions */
  min?: number;
  max?: number;
  /** Jews living in the Land of Israel, millions (when known) */
  israel?: number;
  note?: Localized;
  source?: string;
}

export interface Era {
  id: string;
  title: Localized;
  dating: Dating;
  color: string;
  wiki: WikiRef;
}

export interface Place {
  id: string;
  name: Localized;
  lat: number;
  lon: number;
  wiki?: WikiRef;
}

export interface Migration {
  id: string;
  title: Localized;
  dating: Dating;
  from: string;
  to: string[];
  /** related history event */
  event?: string;
}

/** Wikipedia summary cached at build time by scripts/enrich-wiki.mjs */
export interface WikiSummary {
  title: string;
  extract: string;
  thumbnail?: string;
  url: string;
  wikidata?: string;
  /** English page title from interlanguage links */
  en?: string;
}

export type DateMode = 'acad' | 'trad' | 'both';

export type ItemRef =
  | { type: 'event'; id: string }
  | { type: 'ruler'; id: string }
  | { type: 'era'; id: string }
  | { type: 'pop'; year: number };

/** A center of Jewish life, shown on the globe while active. */
export interface Center {
  id: string;
  place: string;
  title: Localized;
  from: number;
  to: number;
  /** 1..3 relative size */
  weight: 1 | 2 | 3;
}
