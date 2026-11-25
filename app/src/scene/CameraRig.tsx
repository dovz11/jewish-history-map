import { CameraControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import CameraControlsImpl from 'camera-controls';
import { useStore } from '../store';
import { DIR, U_MAX, yearToX } from '../lib/timeScale';
import { FLAT, view } from '../lib/dim';
import { boardPoint, boardZAtHeight, POSTER_Z } from '../lib/poster';
import { attachGestures } from '../lib/touch';

const ACTION = CameraControlsImpl.ACTION;

/**
 * Default viewing direction (from the target towards the camera).
 * 3D: in front of and above the target, looking slightly from the past side, so later times recede into the distance.
 * 2D: straight down (a hair towards the viewer keeps "up" on screen pointing back along the lanes).
 */
const viewDir = () => (FLAT ? new THREE.Vector3(0, 1, 0.001).normalize() : new THREE.Vector3(-0.22 * DIR, 0.72, 1).normalize());
const defaultAzimuth = () => Math.atan2(viewDir().x, viewDir().z);

const MAX_DIST = 900;

/** Polar-angle limits: 2D is locked looking straight down and unrotated, like a paper map. */
function applyLimits(c: CameraControlsImpl) {
  const polar = Math.acos(viewDir().y);
  c.minPolarAngle = FLAT ? polar : 0.15;
  c.maxPolarAngle = FLAT ? polar : 1.42;
  c.minAzimuthAngle = FLAT ? 0 : -Infinity;
  c.maxAzimuthAngle = FLAT ? 0 : Infinity;
}

/** Default point to look at: the middle of the flat sheet (2D), or between the standing board and the rows (3D). */
const homeY = () => (FLAT ? 0 : 7);
const homeZ = () => (FLAT ? -6 : POSTER_Z.popBase + 5);

/**
 * Short screens (a phone held sideways) show the same width of time from nearer, so labels stay
 * readable: shrink flight distances with the screen height.
 */
const nearer = () => THREE.MathUtils.clamp(window.innerHeight / 700, 0.72, 1);

/** Where the camera was when the canvas last unmounted (coming back from the globe keeps the place in time). */
let lastView: { x: number; y: number; z: number; dist: number } | null = null;

export function CameraRig() {
  const ref = useRef<CameraControlsImpl>(null);
  const fly = useStore((s) => s.fly);
  const camCmd = useStore((s) => s.camCmd);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const last = useRef({ x: Infinity, w: Infinity, heading: Infinity });
  const hasPanel = useStore((s) => s.selected !== null);
  const dim = useStore((s) => s.dim);

  // keep the focused item visible beside the info panel (desktop: panel on the side)
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
      // narrow screens: the panel is a bottom sheet, so lift the item into the upper part
      // (seen from straight above the offset's vertical axis runs the other way)
      c.setFocalOffset(0, (FLAT ? 1 : -1) * halfH * 0.45, 0, true);
      return;
    }
    const halfW = halfH * cam.aspect;
    const frac = Math.min(440, window.innerWidth * 0.4) / window.innerWidth;
    // the panel sits on the reading-start side (right in Hebrew, left in English): push the target the other way
    c.setFocalOffset(-DIR * halfW * frac, 0, 0, true);
  }, [hasPanel, fly, camera, dim]);

  // initial framing: resume after a 2D/3D switch, or an overview of the whole corridor and a gentle move to the start
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const minX = Math.min(0, DIR * U_MAX) - 20, maxX = Math.max(0, DIR * U_MAX) + 20;
    c.setBoundary(new THREE.Box3(new THREE.Vector3(minX, -2, POSTER_Z.boardTop - 30), new THREE.Vector3(maxX, 60, 48)));
    c.boundaryEnclosesCamera = false;
    applyLimits(c);
    const resume = lastView;
    if (resume) {
      const p = new THREE.Vector3(resume.x, resume.y, resume.z).addScaledVector(viewDir(), resume.dist);
      c.setLookAt(p.x, p.y, p.z, resume.x, resume.y, resume.z, false);
      return;
    }
    const hasDeepLink = location.hash.length > 1 && /event|ruler|era|pop|person|rabbinic/.test(location.hash);
    if (!hasDeepLink) {
      const sx = yearToX(-2600);
      const p0 = new THREE.Vector3(sx, homeY(), homeZ()).addScaledVector(viewDir(), 190);
      c.setLookAt(p0.x, p0.y, p0.z, sx, homeY(), homeZ(), false);
      const tx = yearToX(-1450);
      const t = setTimeout(() => {
        const p = new THREE.Vector3(tx, homeY(), homeZ()).addScaledVector(viewDir(), (FLAT ? 95 : 85) * nearer());
        c.setLookAt(p.x, p.y, p.z, tx, homeY(), homeZ(), true);
      }, 1400);
      return () => clearTimeout(t);
    }
  }, []);

  // 2D <-> 3D: tilt the camera while the poster folds up or down, keeping the same place in view
  const firstDim = useRef(true);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    if (firstDim.current) { firstDim.current = false; return; }
    c.minPolarAngle = 0; c.maxPolarAngle = 1.42; c.minAzimuthAngle = -Infinity; c.maxAzimuthAngle = Infinity;
    const t = c.getTarget(new THREE.Vector3());
    // a point on the board moves between "far back on the floor" (2D) and "up on the standing board" (3D)
    if (FLAT) {
      if (t.y > 2.5) t.z = boardZAtHeight(t.y);
      t.y = 0;
    } else if (t.z < POSTER_Z.popBase) {
      const b = boardPoint(t.z);
      t.y = b.y;
      t.z = b.z;
    } else t.y = 2;
    const p = t.clone().addScaledVector(viewDir(), c.distance);
    c.setLookAt(p.x, p.y, p.z, t.x, t.y, t.z, true).then(() => applyLimits(c));
  }, [dim]);

  // remember the view for the next mount
  useEffect(() => () => {
    const c = ref.current;
    if (!c) return;
    const t = c.getTarget(new THREE.Vector3());
    lastView = { x: t.x, y: t.y, z: t.z, dist: c.distance };
  }, []);

  useEffect(() => {
    const c = ref.current;
    if (!c || !fly) return;
    const z = fly.z ?? homeZ();
    const y = fly.y ?? (FLAT ? 0 : 2);
    const dist = (fly.dist ?? 45) * (FLAT ? 1.15 : 1) * nearer();
    const p = new THREE.Vector3(fly.x, y, z).addScaledVector(viewDir(), dist);
    c.setLookAt(p.x, p.y, p.z, fly.x, y, z, true);
  }, [fly]);

  // compass and overview buttons
  useEffect(() => {
    const c = ref.current;
    if (!c || !camCmd) return;
    if (camCmd.kind === 'north') {
      const t = c.getTarget(new THREE.Vector3());
      const p = t.clone().addScaledVector(viewDir(), c.distance);
      c.setLookAt(p.x, p.y, p.z, t.x, t.y, t.z, true);
    } else {
      const cam = camera as THREE.PerspectiveCamera;
      const cx = (DIR * U_MAX) / 2, cy = FLAT ? 0 : 12, cz = FLAT ? -4 : POSTER_Z.popBase + 6;
      const fit = (U_MAX / 2 + 10) / (Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect);
      const dist = Math.min(MAX_DIST, fit * (FLAT ? 1 : 0.8));
      const p = new THREE.Vector3(cx, cy, cz).addScaledVector(viewDir(), dist);
      c.setLookAt(p.x, p.y, p.z, cx, cy, cz, true);
    }
  }, [camCmd, camera]);

  // Google Earth–style touch gestures
  useEffect(() => {
    const el = gl.domElement;
    const ray = new THREE.Raycaster();
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const ndc = new THREE.Vector2();
    /** the point on the ground under a screen position */
    const pick = (x: number, y: number, out = new THREE.Vector3()) => {
      const r = el.getBoundingClientRect();
      ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
      camera.updateMatrixWorld();
      ray.setFromCamera(ndc, camera);
      return ray.ray.intersectPlane(ground, out) ?? ref.current!.getTarget(out);
    };
    /** after zooming/turning, slide the view so `anchor` sits under the screen point again */
    const pin = (anchor: THREE.Vector3, x: number, y: number) => {
      const c = ref.current!;
      c.update(0);
      const now = pick(x, y);
      const t = c.getTarget(new THREE.Vector3());
      c.moveTo(t.x + anchor.x - now.x, t.y, t.z + anchor.z - now.z, false);
      c.update(0);
    };
    /** animated zoom about a ground point (a homothety keeps that point fixed on screen) */
    const zoomAbout = (x: number, y: number, factor: number) => {
      const c = ref.current!;
      const g = pick(x, y);
      const k = 1 / factor;
      const target = Math.min(MAX_DIST, Math.max(6, c.distance * k));
      const kk = target / c.distance;
      const t = c.getTarget(new THREE.Vector3()), p = c.getPosition(new THREE.Vector3());
      const t2 = g.clone().lerp(t, kk), p2 = g.clone().lerp(p, kk);
      c.setLookAt(p2.x, p2.y, p2.z, t2.x, t2.y, t2.z, true);
    };

    let anchor = new THREE.Vector3();
    let qzStart = 0;
    return attachGestures(el, {
      lock: (l) => { if (ref.current) ref.current.enabled = !l; },
      twoStart: (x, y) => { anchor = pick(x, y); },
      twoMove: (m) => {
        const c = ref.current!;
        c.dollyTo(THREE.MathUtils.clamp(c.distance / m.scale, 6, MAX_DIST), false);
        // the map turns with the fingers
        if (!FLAT) c.rotate(m.rotate, 0, false);
        pin(anchor, m.x, m.y);
      },
      tilt: (dy) => { if (!FLAT) ref.current!.rotate(0, -dy * 0.006, false); },
      doubleTap: (x, y) => zoomAbout(x, y, 2),
      twoFingerTap: (x, y) => zoomAbout(x, y, 0.5),
      quickZoom: (f, x, y, phase) => {
        const c = ref.current!;
        if (phase === 'start') { anchor = pick(x, y); qzStart = c.distance; return; }
        if (phase === 'end') return;
        c.dollyTo(THREE.MathUtils.clamp(qzStart / f, 6, MAX_DIST), false);
        pin(anchor, x, y);
      },
    });
  }, [gl, camera]);

  // publish the visible window for the minimap, and the heading for the compass
  useFrame(({ scene }) => {
    const c = ref.current;
    if (!c) return;
    // fog follows the zoom level, so both close-ups and overviews keep depth cues
    if (scene.fog instanceof THREE.Fog) {
      // 3D: a light haze gives depth; 2D: none (a map has no distance)
      scene.fog.near = FLAT ? 1e5 : c.distance * 1.8 + 60;
      scene.fog.far = FLAT ? 2e5 : c.distance * 6 + 300;
    }
    view.dist = c.distance;
    const target = c.getTarget(new THREE.Vector3());
    const dist = camera.position.distanceTo(target);
    const fov = (camera as THREE.PerspectiveCamera).fov ?? 50;
    const aspect = (camera as THREE.PerspectiveCamera).aspect ?? 1.5;
    const halfW = Math.tan(THREE.MathUtils.degToRad(fov / 2)) * dist * aspect;
    if (Math.abs(target.x - last.current.x) > 0.2 || Math.abs(halfW - last.current.w) > 0.5) {
      last.current.x = target.x;
      last.current.w = halfW;
      useStore.getState().setView(target.x, halfW);
    }
    const heading = THREE.MathUtils.radToDeg(c.azimuthAngle - defaultAzimuth());
    if (Math.abs(heading - last.current.heading) > 0.5) {
      last.current.heading = heading;
      document.documentElement.style.setProperty('--heading', `${heading.toFixed(1)}deg`);
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
      maxDistance={MAX_DIST}
      // polar and azimuth limits are set imperatively (applyLimits), so a 2D/3D switch can animate
      dollyToCursor
      smoothTime={0.45}
      draggingSmoothTime={0.12}
      // TRUCK pans over the ground plane (map-like) in camera-controls v3
      mouseButtons={{ left: ACTION.TRUCK, middle: ACTION.DOLLY, right: FLAT ? ACTION.TRUCK : ACTION.ROTATE, wheel: ACTION.DOLLY }}
      // one finger pans; two-finger pinch / twist / tilt are handled by attachGestures above
      touches={{ one: ACTION.TOUCH_TRUCK, two: ACTION.NONE, three: ACTION.NONE }}
    />
  );
}
