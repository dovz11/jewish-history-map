import { CameraControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import CameraControlsImpl from 'camera-controls';
import { useStore } from '../store';
import { DIR, U_MAX, yearToX } from '../lib/timeScale';

const ACTION = CameraControlsImpl.ACTION;

/** Default viewing offset: camera stands in front of (and above) its target. */
/** Looking slightly from the past side, so later times recede into the distance (depends on reading direction). */
const viewDir = () => new THREE.Vector3(-0.38 * DIR, 0.62, 1).normalize();

export function CameraRig() {
  const ref = useRef<CameraControlsImpl>(null);
  const fly = useStore((s) => s.fly);
  const camera = useThree((s) => s.camera);
  const last = useRef({ x: Infinity, w: Infinity });
  const hasPanel = useStore((s) => s.selected !== null);

  // keep the focused item visible beside the info panel (desktop: panel on the right)
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const wide = window.innerWidth > 760;
    if (!hasPanel) {
      c.setFocalOffset(0, 0, 0, true);
      return;
    }
    const cam = camera as THREE.PerspectiveCamera;
    // use the distance the camera is flying to, not the one it is leaving
    const dist = fly?.dist ?? c.distance;
    const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * dist;
    if (!wide) {
      // narrow screens: the panel is a bottom sheet, so lift the item into the upper half
      c.setFocalOffset(0, -halfH * 0.5, 0, true);
      return;
    }
    const halfW = halfH * cam.aspect;
    const frac = Math.min(440, window.innerWidth * 0.4) / window.innerWidth;
    // the panel sits on the reading-start side (right in Hebrew, left in English): push the target the other way
    c.setFocalOffset(-DIR * halfW * frac, 0, 0, true);
  }, [hasPanel, fly, camera]);

  // initial framing: overview of the whole corridor, then a gentle move to the start
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const minX = Math.min(0, DIR * U_MAX) - 20, maxX = Math.max(0, DIR * U_MAX) + 20;
    c.setBoundary(new THREE.Box3(new THREE.Vector3(minX, -2, -40), new THREE.Vector3(maxX, 40, 30)));
    c.boundaryEnclosesCamera = false;
    const hasDeepLink = location.hash.length > 1;
    if (!hasDeepLink) {
      const sx = yearToX(-2600);
      const p0 = new THREE.Vector3(sx, 2, -4).addScaledVector(viewDir(), 190);
      c.setLookAt(p0.x, p0.y, p0.z, sx, 2, -4, false);
      const tx = yearToX(-1450);
      const t = setTimeout(() => {
        const p = new THREE.Vector3(tx, 2, -2).addScaledVector(viewDir(), 80);
        c.setLookAt(p.x, p.y, p.z, tx, 2, -2, true);
      }, 1400);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    const c = ref.current;
    if (!c || !fly) return;
    const z = fly.z ?? -2;
    const dist = fly.dist ?? 45;
    const p = new THREE.Vector3(fly.x, 2, z).addScaledVector(viewDir(), dist);
    c.setLookAt(p.x, p.y, p.z, fly.x, 2, z, true);
  }, [fly]);

  // publish the visible window for the minimap
  useFrame(({ scene }) => {
    const c = ref.current;
    if (!c) return;
    // fog follows the zoom level, so both close-ups and overviews keep depth cues
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.near = c.distance * 1.6 + 40;
      scene.fog.far = c.distance * 5 + 200;
    }
    const target = c.getTarget(new THREE.Vector3());
    const dist = camera.position.distanceTo(target);
    const fov = (camera as THREE.PerspectiveCamera).fov ?? 50;
    const aspect = (camera as THREE.PerspectiveCamera).aspect ?? 1.5;
    const halfW = Math.tan(THREE.MathUtils.degToRad(fov / 2)) * dist * aspect;
    if (Math.abs(target.x - last.current.x) > 0.2 || Math.abs(halfW - last.current.w) > 0.5) {
      last.current = { x: target.x, w: halfW };
      useStore.getState().setView(target.x, halfW);
    }
  });

  // keyboard panning (when no item is selected arrows pan; see App for item navigation)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const c = ref.current;
      if (!c || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      const step = 0.08 * camera.position.distanceTo(c.getTarget(new THREE.Vector3()));
      if (useStore.getState().selected) return;
      if (e.key === 'ArrowLeft') c.truck(-step, 0, true);
      else if (e.key === 'ArrowRight') c.truck(step, 0, true);
      else if (e.key === 'ArrowUp') c.dolly(step, true);
      else if (e.key === 'ArrowDown') c.dolly(-step, true);
      else if (e.key === '+' || e.key === '=') c.dolly(step * 2, true);
      else if (e.key === '-') c.dolly(-step * 2, true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [camera]);

  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={6}
      maxDistance={520}
      minPolarAngle={0.15}
      maxPolarAngle={1.42}
      dollyToCursor
      smoothTime={0.45}
      draggingSmoothTime={0.12}
      // TRUCK pans over the ground plane (map-like) in camera-controls v3
      mouseButtons={{ left: ACTION.TRUCK, middle: ACTION.DOLLY, right: ACTION.ROTATE, wheel: ACTION.DOLLY }}
      touches={{ one: ACTION.TOUCH_TRUCK, two: ACTION.TOUCH_DOLLY_TRUCK, three: ACTION.TOUCH_ROTATE }}
    />
  );
}
