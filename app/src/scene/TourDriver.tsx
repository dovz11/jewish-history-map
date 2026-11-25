import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type CameraControlsImpl from 'camera-controls';
import { arrive, leaveStop, pauseTour, STAY_SECONDS, tourClock, useTour } from '../lib/tour';
import { boardPoint, chartTopAt, eventAnchorZ } from '../lib/poster';
import { DIR } from '../lib/timeScale';

/**
 * Moves the camera during the guided tour. Each leg eases from where the camera is to the next
 * stop, rising in the middle of long legs (like Google Earth's flights), then stays a few
 * seconds while the stop's card is shown. Any touch, drag or wheel on the map pauses the tour.
 */

/** A lower, more sweeping angle than the normal 3D view: from in front, slightly from the past side. */
const tourDir = () => new THREE.Vector3(-0.3 * DIR, 0.5, 1).normalize();
const STOP_DIST = 34;

const nearer = () => THREE.MathUtils.clamp(window.innerHeight / 700, 0.72, 1);
const ease = (s: number) => (s < 0.5 ? 4 * s * s * s : 1 - Math.pow(-2 * s + 2, 3) / 2);

interface View { x: number; y: number; z: number; dist: number }

/** Where to look for a stop: the event's label on the standing board. */
function stopView(id: string, year: number, x: number): View {
  const p = boardPoint((eventAnchorZ.get(id) ?? chartTopAt(year) - 3) - 1);
  return { x, y: p.y, z: p.z, dist: STOP_DIST * nearer() };
}

export function TourDriver() {
  const controls = useThree((s) => s.controls) as CameraControlsImpl | null;
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const run = useRef({ seq: -1, t: 0, from: { x: 0, y: 0, z: 0, dist: 0 } as View, dur: 1, active: false });

  // the viewer takes over: pause, so they can look around
  useEffect(() => {
    const el = gl.domElement;
    const onInput = () => { if (useTour.getState().active) pauseTour(); };
    el.addEventListener('pointerdown', onInput);
    el.addEventListener('wheel', onInput, { passive: true });
    return () => {
      el.removeEventListener('pointerdown', onInput);
      el.removeEventListener('wheel', onInput);
    };
  }, [gl]);

  useFrame((_, delta) => {
    const c = controls;
    const T = useTour.getState();
    const r = run.current;
    if (!c) return;
    if (!T.active) {
      if (r.active) { r.active = false; c.setFocalOffset(0, 0, 0, true); }
      return;
    }
    r.active = true;
    if (T.paused) return;

    if (r.seq !== T.seq) {
      // a new leg: start from wherever the camera is now
      r.seq = T.seq;
      r.t = 0;
      const tg = c.getTarget(new THREE.Vector3());
      r.from = { x: tg.x, y: tg.y, z: tg.z, dist: c.distance };
      const s = T.stops[T.i];
      // longer legs take longer, within limits; a short hop back after a pause is quick
      r.dur = s ? THREE.MathUtils.clamp(1.6 + Math.abs(s.x - tg.x) * 0.045, 1.6, 6) : 1;
    }
    r.t += Math.min(delta, 0.1) * T.speed;

    const stop = T.stops[T.i];
    if (!stop) return;
    const to = stopView(stop.id, stop.year, stop.x);
    let v: View;
    if (T.phase === 'travel') {
      const s = Math.min(1, r.t / r.dur);
      const e = ease(s);
      // rise over long legs, so the stretch of time between stops is seen passing below
      const hop = Math.min(70, Math.abs(to.x - r.from.x) * 0.55) * Math.sin(Math.PI * s);
      v = {
        x: THREE.MathUtils.lerp(r.from.x, to.x, e),
        y: THREE.MathUtils.lerp(r.from.y, to.y, e),
        z: THREE.MathUtils.lerp(r.from.z, to.z, e),
        dist: THREE.MathUtils.lerp(r.from.dist, to.dist, e) + hop,
      };
      if (s > 0.78 && T.card !== T.i) useTour.setState({ card: T.i });
      if (s >= 1) arrive();
    } else if (T.phase === 'stay') {
      // drift in slowly while the card is read
      const s = Math.min(1, r.t / STAY_SECONDS);
      v = { ...to, dist: to.dist * (1 - 0.12 * s) };
      if (r.t >= STAY_SECONDS) leaveStop();
    } else {
      // the end: pull back to see the last stretch of time
      const s = Math.min(1, r.t / 3);
      v = { ...to, dist: THREE.MathUtils.lerp(r.from.dist, 75 * nearer(), ease(s)) };
    }
    tourClock.x = v.x;

    // keep the stop clear of its card: beside it on wide screens, above it on narrow ones
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * v.dist;
    if (T.card !== null) {
      if (window.innerWidth > 760) {
        const frac = Math.min(400, window.innerWidth * 0.38) / window.innerWidth;
        c.setFocalOffset(-DIR * halfH * camera.aspect * frac, 0, 0, true);
      } else c.setFocalOffset(0, halfH * 0.4, 0, true);
    } else c.setFocalOffset(0, 0, 0, true);

    const p = new THREE.Vector3(v.x, v.y, v.z).addScaledVector(tourDir(), v.dist);
    c.setLookAt(p.x, p.y, p.z, v.x, v.y, v.z, true);
  });

  return null;
}
