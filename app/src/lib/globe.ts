import * as THREE from 'three';
import { placeById } from './places';
import { FLAT } from './dim';
export * from './places';

export const GLOBE_R = 10;
/** 2D map: equirectangular, as wide as the globe's equator (so zoom distances feel alike). */
export const MAP_W = 2 * Math.PI * GLOBE_R;
export const MAP_H = MAP_W / 2;

/**
 * Lat/lon -> point on a sphere, matching three.js SphereGeometry UVs, so an
 * equirectangular texture (lon -180 at u = 0) lines up with the markers.
 */
export function latLonToVec3(lat: number, lon: number, r = GLOBE_R, target = new THREE.Vector3()) {
  const phi = ((lon + 180) * Math.PI) / 180;
  const theta = ((90 - lat) * Math.PI) / 180;
  return target.set(-r * Math.cos(phi) * Math.sin(theta), r * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta));
}

/** Point `h` above the surface: on the globe (3D) or on the flat map (2D, z up). */
export function surface(lat: number, lon: number, h = 0, target = new THREE.Vector3()) {
  if (FLAT) return target.set((lon / 360) * MAP_W, (lat / 180) * MAP_H, h);
  return latLonToVec3(lat, lon, GLOBE_R + h, target);
}

/** The "up" direction at a surface point. */
export function upAt(p: THREE.Vector3) {
  return FLAT ? new THREE.Vector3(0, 0, 1) : p.clone().normalize();
}

/** Move a surface point `h` further up. */
export function lift(p: THREE.Vector3, h: number) {
  return p.clone().addScaledVector(upAt(p), h);
}

/** Inverse of `surface`, for remembering where the camera looks. */
export function toLatLon(p: THREE.Vector3): { lat: number; lon: number } {
  if (FLAT) return { lat: (p.y / MAP_H) * 180, lon: (p.x / MAP_W) * 360 };
  const r = p.length();
  const lat = 90 - THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(p.y / r, -1, 1)));
  const lon = THREE.MathUtils.radToDeg(Math.atan2(p.z, -p.x)) - 180;
  return { lat, lon: lon < -180 ? lon + 360 : lon };
}

export function placeVec(id: string, h = 0) {
  const p = placeById.get(id);
  return p ? surface(p.lat, p.lon, h) : null;
}

/** Points along a great-circle arc (or, on the flat map, a straight path) lifted above the surface. */
export function arcPoints(a: THREE.Vector3, b: THREE.Vector3, segments = 48): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  if (FLAT) {
    const lift = 0.3 + a.distanceTo(b) * 0.12;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      pts.push(a.clone().lerp(b, t).setZ(0.05 + Math.sin(Math.PI * t) * lift));
    }
    return pts;
  }
  const ua = a.clone().normalize(), ub = b.clone().normalize();
  const angle = ua.angleTo(ub);
  const liftH = 0.15 + angle * 2.2;
  const q = new THREE.Quaternion();
  const axis = new THREE.Vector3().crossVectors(ua, ub).normalize();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    q.setFromAxisAngle(axis, angle * t);
    const p = ua.clone().applyQuaternion(q);
    pts.push(p.multiplyScalar(GLOBE_R + 0.05 + Math.sin(Math.PI * t) * liftH));
  }
  return pts;
}

/**
 * How far the camera is from the globe's center, or the equivalent on the flat map
 * (height above the map plus a globe radius), so label thresholds work for both.
 */
export function camRange(camera: THREE.Camera) {
  return FLAT ? camera.position.z + GLOBE_R : camera.position.length();
}
