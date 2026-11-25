import * as THREE from 'three';
import placesJson from '../data/places.json';
import centersJson from '../data/centers.json';
import migrationsJson from '../data/migrations.json';
import type { Center, DateMode, HistoryEvent, Migration, Place } from '../data/types';
import { events, mainSpan } from './data';

export const places = placesJson as Place[];
export const centers = centersJson as Center[];
export const migrations = migrationsJson as Migration[];
export const placeById = new Map(places.map((p) => [p.id, p]));

export const GLOBE_R = 10;

/**
 * Lat/lon -> point on a sphere, matching three.js SphereGeometry UVs, so an
 * equirectangular texture (lon -180 at u = 0) lines up with the markers.
 */
export function latLonToVec3(lat: number, lon: number, r = GLOBE_R, target = new THREE.Vector3()) {
  const phi = ((lon + 180) * Math.PI) / 180;
  const theta = ((90 - lat) * Math.PI) / 180;
  return target.set(-r * Math.cos(phi) * Math.sin(theta), r * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta));
}

export function placeVec(id: string, r = GLOBE_R) {
  const p = placeById.get(id);
  return p ? latLonToVec3(p.lat, p.lon, r) : null;
}

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

/** Points along a great-circle arc lifted above the surface (height grows with distance). */
export function arcPoints(a: THREE.Vector3, b: THREE.Vector3, segments = 48): THREE.Vector3[] {
  const ua = a.clone().normalize(), ub = b.clone().normalize();
  const angle = ua.angleTo(ub);
  const lift = 0.15 + angle * 2.2;
  const pts: THREE.Vector3[] = [];
  const q = new THREE.Quaternion();
  const axis = new THREE.Vector3().crossVectors(ua, ub).normalize();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    q.setFromAxisAngle(axis, angle * t);
    const p = ua.clone().applyQuaternion(q);
    pts.push(p.multiplyScalar(GLOBE_R + 0.05 + Math.sin(Math.PI * t) * lift));
  }
  return pts;
}

/** Events that have places, in chronological order (for stepping on the globe). */
export function globeEventOrder(mode: DateMode) {
  return events
    .filter((e) => e.places?.length)
    .map((e) => ({ e, y: mainSpan(e.dating, mode).start }))
    .sort((a, b) => a.y - b.y);
}
