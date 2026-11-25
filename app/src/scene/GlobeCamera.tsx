import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { FLAT } from '../lib/dim';
import { camRange, GLOBE_R, latLonToVec3, MAP_H, MAP_W, placeById, surface, toLatLon } from '../lib/globe';
import { DIR } from '../lib/timeScale';
import { attachGestures } from '../lib/touch';
import { useStore } from '../store';

/** Where the camera looked when the canvas last unmounted (a 2D/3D switch keeps the place). */
let lastLook: { lat: number; lon: number; range: number } | null = null;

const GLOBE_MIN = 13, GLOBE_MAX = 60;
const MAP_MIN_ALT = 2.5, MAP_MAX_ALT = 75;

/** Camera position and target looking at lat/lon from `range` (distance from the globe's center, or its 2D equivalent). */
function lookAt(lat: number, lon: number, range: number) {
  if (FLAT) {
    const target = surface(lat, lon, 0);
    return { target, pos: target.clone().setZ(THREE.MathUtils.clamp(range - GLOBE_R, MAP_MIN_ALT, MAP_MAX_ALT)) };
  }
  return { target: new THREE.Vector3(), pos: latLonToVec3(lat, lon, THREE.MathUtils.clamp(range, GLOBE_MIN, GLOBE_MAX)) };
}

/**
 * Globe (3D): orbit around the earth; one finger spins it, pinch zooms.
 * Map (2D): pan and zoom over the flat map, like an atlas.
 * Both: smooth flights to a requested place, plus double-tap, two-finger-tap and double-tap-drag zoom.
 */
export function GlobeCamera() {
  const ref = useRef<OrbitControlsImpl>(null);
  const focus = useStore((s) => s.globeFocus);
  const camCmd = useStore((s) => s.camCmd);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  // start over the Middle East, or where the other view was looking
  useEffect(() => {
    const look = lastLook ?? { lat: 28, lon: 38, range: 34 };
    const { pos, target } = lookAt(look.lat, look.lon, look.range);
    camera.position.copy(pos);
    const c = ref.current;
    if (c) { c.target.copy(target); c.update(); }
  }, [camera]);

  useEffect(() => {
    if (!focus) return;
    const p = placeById.get(focus.place);
    if (!p) return;
    const range = Math.min(camRange(camera), 26);
    // aim slightly south of the place so pins and labels sit in the upper-middle of the view
    goal.current = lookAt(p.lat - (FLAT ? 3 : 6), p.lon, range);
  }, [focus, camera]);

  // the overview button
  useEffect(() => {
    if (!camCmd || camCmd.kind !== 'home') return;
    const cam = camera as THREE.PerspectiveCamera;
    if (FLAT) {
      const fit = MAP_W / 2 / (Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect);
      goal.current = lookAt(25, 20, Math.min(fit * 0.75, MAP_MAX_ALT) + GLOBE_R);
    } else goal.current = lookAt(28, 30, 40);
  }, [camCmd, camera]);

  // when the info panel is open on a wide screen, shift the projection so the globe sits beside it
  const hasPanel = useStore((s) => s.selected !== null);
  const size = useThree((s) => s.size);
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const panelW = Math.min(440, size.width * 0.4);
    if (hasPanel && size.width > 760) cam.setViewOffset(size.width, size.height, (-DIR * panelW) / 2, 0, size.width, size.height);
    else cam.clearViewOffset();
    cam.updateProjectionMatrix();
  }, [hasPanel, size, camera]);

  // tap gestures (pinch and drag are OrbitControls' own)
  useEffect(() => {
    const el = gl.domElement;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const sphere = new THREE.Sphere(new THREE.Vector3(), GLOBE_R);
    const pick = (x: number, y: number) => {
      const r = el.getBoundingClientRect();
      ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return FLAT ? ray.ray.intersectPlane(plane, new THREE.Vector3()) : ray.ray.intersectSphere(sphere, new THREE.Vector3());
    };
    type Start = { pos: THREE.Vector3; target: THREE.Vector3; hit: THREE.Vector3 | null };
    /** zoom by `factor` (>1 = in) towards the point under the finger */
    const zoom = (factor: number, s: Start, animate: boolean) => {
      const c = ref.current;
      if (!c) return;
      let pos: THREE.Vector3, target: THREE.Vector3;
      if (FLAT) {
        const alt = THREE.MathUtils.clamp(s.pos.z / factor, MAP_MIN_ALT, MAP_MAX_ALT);
        const k = alt / s.pos.z;
        // a homothety about the touched point keeps it under the finger
        target = (s.hit ?? s.target).clone().lerp(s.target, k).setZ(0);
        pos = target.clone().setZ(alt);
      } else {
        const len = THREE.MathUtils.clamp(s.pos.length() / factor, GLOBE_MIN, GLOBE_MAX);
        const dir = s.pos.clone().normalize();
        // turn part of the way towards the touched point when zooming in
        if (s.hit && factor > 1) dir.lerp(s.hit.clone().normalize(), Math.min(0.6, 1 - 1 / factor)).normalize();
        pos = dir.multiplyScalar(len);
        target = new THREE.Vector3();
      }
      if (animate) goal.current = { pos, target };
      else {
        goal.current = null;
        camera.position.copy(pos);
        c.target.copy(target);
        c.update();
      }
    };
    const now = (x: number, y: number): Start => ({ pos: camera.position.clone(), target: ref.current!.target.clone(), hit: pick(x, y) });
    let qz: Start | null = null;
    return attachGestures(el, {
      lock: (l) => { if (ref.current) ref.current.enabled = !l; },
      doubleTap: (x, y) => zoom(2, now(x, y), true),
      twoFingerTap: (x, y) => zoom(0.5, now(x, y), true),
      quickZoom: (f, x, y, phase) => {
        if (phase === 'start') qz = now(x, y);
        else if (phase === 'move' && qz) zoom(f, qz, false);
        else qz = null;
      },
    });
  }, [gl, camera]);

  useFrame(({ camera }, dt) => {
    const c = ref.current;
    // remember the view every frame: by the time this canvas unmounts, the 2D/3D flag has already flipped
    if (c) lastLook = { ...toLatLon(FLAT ? c.target : camera.position), range: camRange(camera) };
    if (FLAT && c) {
      // keep the map in view
      const hx = MAP_W / 2, hy = MAP_H / 2;
      const cx = THREE.MathUtils.clamp(c.target.x, -hx, hx), cy = THREE.MathUtils.clamp(c.target.y, -hy, hy);
      if (cx !== c.target.x || cy !== c.target.y) {
        camera.position.x += cx - c.target.x;
        camera.position.y += cy - c.target.y;
        c.target.set(cx, cy, 0);
      }
    }
    const g = goal.current;
    if (!g) return;
    const a = Math.min(1, dt * 3);
    if (FLAT) {
      camera.position.lerp(g.pos, a);
      c?.target.lerp(g.target, a);
    } else {
      const cur = camera.position;
      const len = THREE.MathUtils.lerp(cur.length(), g.pos.length(), a);
      const dir = cur.clone().normalize().lerp(g.pos.clone().normalize(), a).normalize();
      cur.copy(dir.multiplyScalar(len));
    }
    c?.update();
    if (camera.position.distanceTo(g.pos) < 0.05) goal.current = null;
  });

  if (FLAT) {
    return (
      <OrbitControls
        ref={ref}
        makeDefault
        enableRotate={false}
        enablePan
        screenSpacePanning
        zoomToCursor
        enableDamping
        dampingFactor={0.1}
        minDistance={MAP_MIN_ALT}
        maxDistance={MAP_MAX_ALT}
        zoomSpeed={0.9}
        mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
        touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN }}
        onStart={() => (goal.current = null)}
      />
    );
  }
  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={GLOBE_MIN}
      maxDistance={GLOBE_MAX}
      rotateSpeed={0.5}
      zoomSpeed={0.8}
      onStart={() => (goal.current = null)}
    />
  );
}
