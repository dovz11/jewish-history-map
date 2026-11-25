import * as THREE from 'three';
import { placeById } from './places';
export * from './places';

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

