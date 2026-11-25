import placesJson from '../data/places.json';
import centersJson from '../data/centers.json';
import migrationsJson from '../data/migrations.json';
import type { Center, DateMode, HistoryEvent, Migration, Place } from '../data/types';
import { events, mainSpan } from './data';

/** Places, centers and migrations for the globe (no three.js here, so the UI can import it cheaply). */
export const places = placesJson as Place[];
export const centers = centersJson as Center[];
export const migrations = migrationsJson as Migration[];
export const placeById = new Map(places.map((p) => [p.id, p]));

/** How many years around the current globe year count as "now" (wider in sparse eras). */
export function yearWindow(y: number) {
  if (y < -1000) return 160;
  if (y < 1500) return 45;
  if (y < 1900) return 20;
  return 6;
}

const overlaps = (s: { start: number; end?: number }, y: number, w: number) => (s.end ?? s.start) >= y - w && s.start <= y + w;

export function activeCenters(y: number) {
  return centers.filter((c) => y >= c.from && y <= c.to);
}

export function activeEvents(y: number, mode: DateMode): HistoryEvent[] {
  const w = yearWindow(y);
  return events.filter((e) => e.places?.length && overlaps(mainSpan(e.dating, mode), y, w));
}

export function activeMigrations(y: number, mode: DateMode): Migration[] {
  const w = yearWindow(y) * 1.5;
  return migrations.filter((m) => overlaps(mainSpan(m.dating, mode), y, w));
}

/** Events that have places, in chronological order (for stepping on the globe). */
export function globeEventOrder(mode: DateMode) {
  return events
    .filter((e) => e.places?.length)
    .map((e) => ({ e, y: mainSpan(e.dating, mode).start }))
    .sort((a, b) => a.y - b.y);
}
