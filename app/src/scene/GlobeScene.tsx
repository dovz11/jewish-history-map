import { L } from '../i18n';
import { DIR } from '../lib/timeScale';
import { Billboard, Line, OrbitControls, Text } from '@react-three/drei';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { Center, HistoryEvent, Migration } from '../data/types';
import { KIND_COLORS, mainSpan } from '../lib/data';
import { formatSpan } from '../lib/dates';
import {
  activeCenters, activeEvents, activeMigrations, arcPoints, GLOBE_R, latLonToVec3, placeById, placeVec,
} from '../lib/globe';
import { sameRef, useStore } from '../store';
import { COLORS, FONT_BOLD, FONT_REGULAR } from './constants';

const base = import.meta.env.BASE_URL;

export function GlobeScene() {
  return (
    <Canvas flat dpr={[1, 2]} camera={{ position: [0, 0, 34], fov: 40, near: 0.1, far: 500 }} onPointerMissed={() => useStore.getState().select(null)}>
      <color attach="background" args={['#1d2a3a']} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[30, 20, 30]} intensity={1.2} />
      <Stars />
      <Earth />
      <Centers />
      <EventPins />
      <Migrations />
      <GlobeCamera />
    </Canvas>
  );
}

/** Equirectangular parchment map drawn from Natural Earth land outlines. */
function useEarthTexture() {
  const [tex, setTex] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`${base}geo/land.json`)
      .then((r) => r.json())
      .then((rings: [number, number][][]) => {
        if (cancelled) return;
        const W = 4096, H = 2048;
        const c = document.createElement('canvas');
        c.width = W; c.height = H;
        const g = c.getContext('2d')!;
        g.fillStyle = '#a9c3cf';
        g.fillRect(0, 0, W, H);
        // graticule
        g.strokeStyle = 'rgba(255,255,255,0.25)';
        g.lineWidth = 1.5;
        for (let lon = -180; lon <= 180; lon += 15) { const x = ((lon + 180) / 360) * W; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
        for (let lat = -75; lat <= 75; lat += 15) { const y = ((90 - lat) / 180) * H; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
        const path = new Path2D();
        for (const ring of rings) {
          ring.forEach(([lon, lat], i) => {
            const x = ((lon + 180) / 360) * W, y = ((90 - lat) / 180) * H;
            if (i === 0) path.moveTo(x, y); else path.lineTo(x, y);
          });
          path.closePath();
        }
        g.fillStyle = '#efe3c4';
        g.fill(path, 'evenodd');
        g.strokeStyle = '#9c8a64';
        g.lineWidth = 2;
        g.stroke(path);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        setTex(t);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return tex;
}

function Earth() {
  const tex = useEarthTexture();
  return (
    <group>
      <mesh raycast={() => null}>
        <sphereGeometry args={[GLOBE_R, 128, 96]} />
        {/* remount when the texture arrives; an explicit white keeps the map's true colors */}
        <meshStandardMaterial key={tex ? 'map' : 'plain'} map={tex} color={tex ? '#ffffff' : '#a9c3cf'} roughness={0.95} />
      </mesh>
      {/* soft atmosphere */}
      <mesh raycast={() => null} scale={1.06}>
        <sphereGeometry args={[GLOBE_R, 64, 48]} />
        <meshBasicMaterial color="#9fc4ff" transparent opacity={0.08} side={THREE.BackSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Deterministic star field (seeded, so it is identical on every render). */
function makeStars() {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pts: number[] = [];
  for (let i = 0; i < 1500; i++) {
    const z = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = 180 + rnd() * 120, s = Math.sqrt(1 - z * z);
    pts.push(r * s * Math.cos(a), r * z, r * s * Math.sin(a));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return g;
}
const STAR_GEO = makeStars();

function Stars() {
  const geo = STAR_GEO;
  return (
    <points geometry={geo} raycast={() => null}>
      <pointsMaterial color="#ffffff" size={0.7} sizeAttenuation transparent opacity={0.7} />
    </points>
  );
}

/** Hide objects on the far side of the globe and labels that are too small to read. */
function useFacing(pos: THREE.Vector3, maxDist = Infinity) {
  const ref = useRef<THREE.Group>(null);
  const n = useMemo(() => pos.clone().normalize(), [pos]);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera }) => {
    if (!ref.current) return;
    tmp.copy(camera.position).normalize();
    ref.current.visible = tmp.dot(n) > 0.15 && camera.position.length() < maxDist;
  });
  return ref;
}

function Centers() {
  const year = useStore((s) => s.globeYear);
  const list = activeCenters(year);
  return <group>{list.map((c) => <CenterMarker key={c.id} center={c} />)}</group>;
}

const CenterMarker = memo(function CenterMarker({ center }: { center: Center }) {
  const p = placeById.get(center.place)!;
  const pos = useMemo(() => latLonToVec3(p.lat, p.lon, GLOBE_R + 0.02), [p]);
  const labelRef = useFacing(pos, center.weight === 3 ? Infinity : center.weight === 2 ? 23 : 17);
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize()), [pos]);
  const ringRef = useRef<THREE.Mesh>(null);
  const r = 0.09 + center.weight * 0.07;
  useFrame(({ clock }) => {
    if (ringRef.current) {
      const t = (clock.elapsedTime * 0.6 + center.weight) % 1;
      ringRef.current.scale.setScalar(1 + t * 1.8);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - t);
    }
  });
  return (
    <group>
      <group position={pos} quaternion={quat}>
        <mesh
          onPointerOver={(e) => { e.stopPropagation(); useStore.getState().setHover(`${L(center.title)} · ${L(p.name)} · ${formatSpan({ start: center.from, end: center.to })}`); }}
          onPointerOut={() => useStore.getState().setHover(null)}
        >
          <circleGeometry args={[r, 24]} />
          <meshBasicMaterial color="#e0b13a" />
        </mesh>
        <mesh ref={ringRef} raycast={() => null}>
          <ringGeometry args={[r * 1.05, r * 1.35, 32]} />
          <meshBasicMaterial color="#e0b13a" transparent depthWrite={false} />
        </mesh>
      </group>
      <group ref={labelRef}>
        <Billboard position={pos.clone().multiplyScalar(1.012)}>
          <Text font={FONT_BOLD} fontSize={0.15 + center.weight * 0.045} color="#3b2f12" outlineWidth={0.025} outlineColor="#fff8e6" anchorX="center" anchorY="top" position={[0, -r - 0.05, 0]} direction="auto" raycast={() => null}>
            {L(center.title)}
          </Text>
        </Billboard>
      </group>
    </group>
  );
});

function EventPins() {
  const year = useStore((s) => s.globeYear);
  const mode = useStore((s) => s.mode);
  const list = activeEvents(year, mode);
  return (
    <group>
      {list.flatMap((e) => e.places!.map((pid, i) => <EventPin key={e.id + pid} event={e} place={pid} primary={i === 0} />))}
    </group>
  );
}

const EventPin = memo(function EventPin({ event, place, primary }: { event: HistoryEvent; place: string; primary: boolean }) {
  const mode = useStore((s) => s.mode);
  const selected = useStore((s) => sameRef(s.selected, { type: 'event', id: event.id }));
  const surface = useMemo(() => placeVec(place, GLOBE_R)!, [place]);
  const h = 0.6 + event.importance * 0.18;
  const top = useMemo(() => surface.clone().multiplyScalar((GLOBE_R + h) / GLOBE_R), [surface, h]);
  const groupRef = useFacing(surface);
  const labelRef = useRef<THREE.Group>(null);
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), surface.clone().normalize()), [surface]);
  const color = KIND_COLORS[event.kind];
  useFrame(({ camera }) => {
    if (labelRef.current) labelRef.current.visible = primary && (selected || camera.position.length() < 26 || event.importance >= 4);
  });
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    useStore.getState().select({ type: 'event', id: event.id });
    useStore.getState().focusPlace(place);
  };
  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
    useStore.getState().setHover(`${L(event.title)} · ${L(placeById.get(place)?.name)} · ${formatSpan(mainSpan(event.dating, mode))}`);
  };
  const out = () => { document.body.style.cursor = ''; useStore.getState().setHover(null); };
  return (
    <group ref={groupRef}>
      <group position={surface} quaternion={quat}>
        <mesh position={[0, h / 2, 0]} onClick={onClick} onPointerOver={over} onPointerOut={out}>
          <cylinderGeometry args={[0.025, 0.04, h, 6]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh position={[0, h + 0.1, 0]} onClick={onClick} onPointerOver={over} onPointerOut={out}>
          <octahedronGeometry args={[selected ? 0.2 : 0.14, 0]} />
          <meshStandardMaterial color={selected ? COLORS.selected : color} emissive={selected ? COLORS.selected : '#000'} emissiveIntensity={0.4} flatShading />
        </mesh>
      </group>
      <group ref={labelRef}>
        <Billboard position={top.clone().multiplyScalar(1.03)}>
          <group onClick={onClick} onPointerOver={over} onPointerOut={out}>
            <Text font={FONT_BOLD} fontSize={0.3} maxWidth={4} textAlign="center" color={COLORS.ink} outlineWidth={0.03} outlineColor="#fffaf0" anchorX="center" anchorY="bottom" direction="auto">
              {L(event.title)}
            </Text>
            <Text font={FONT_REGULAR} fontSize={0.18} color={COLORS.inkSoft} outlineWidth={0.02} outlineColor="#fffaf0" anchorX="center" anchorY="top" position={[0, -0.02, 0]} direction="auto">
              {formatSpan(mainSpan(event.dating, mode))}
            </Text>
          </group>
        </Billboard>
      </group>
    </group>
  );
});

function Migrations() {
  const year = useStore((s) => s.globeYear);
  const mode = useStore((s) => s.mode);
  const list = activeMigrations(year, mode);
  return <group>{list.map((m) => <MigrationArcs key={m.id} migration={m} />)}</group>;
}

const MigrationArcs = memo(function MigrationArcs({ migration }: { migration: Migration }) {
  const arcs = useMemo(() => {
    const out: THREE.Vector3[][] = [];
    // chain for multi-stop journeys (Ur -> Haran -> Hebron) only for the first leg ordering; otherwise fan out
    const fan = migration.to.length > 2 || migration.id === 'm-spain';
    let from = placeVec(migration.from)!;
    for (const t of migration.to) {
      const to = placeVec(t)!;
      out.push(arcPoints(from, to));
      if (!fan) from = to;
    }
    return out;
  }, [migration]);
  const lines = useRef<({ material: { dashOffset: number } } | null)[]>([]);
  useFrame((_, dt) => {
    lines.current.forEach((l) => { if (l) l.material.dashOffset -= dt * 0.6; });
  });
  // label the longest leg, so labels don't pile up at the shared origin
  const longest = arcs.reduce((a, b) => (b[0].distanceTo(b[b.length - 1]) > a[0].distanceTo(a[a.length - 1]) ? b : a));
  const mid = longest[Math.floor(longest.length / 2)];
  const labelRef = useFacing(mid);
  return (
    <group>
      {arcs.map((pts, i) => (
        <group key={i}>
          <Line
            ref={(l) => { lines.current[i] = l as unknown as { material: { dashOffset: number } }; }}
            points={pts}
            color="#c0392b"
            lineWidth={2.2}
            dashed
            dashSize={0.35}
            gapSize={0.2}
            onPointerOver={(e) => { e.stopPropagation(); useStore.getState().setHover(`${L(migration.title)} · ${formatSpan(mainSpan(migration.dating, useStore.getState().mode))}`); }}
            onPointerOut={() => useStore.getState().setHover(null)}
          />
          <ArrowHead pts={pts} />
        </group>
      ))}
      <group ref={labelRef}>
        <Billboard position={mid.clone().multiplyScalar(1.02)}>
          <Text font={FONT_BOLD} fontSize={0.24} color="#8e2a1f" outlineWidth={0.025} outlineColor="#fff" anchorX="center" anchorY="bottom" direction="auto" raycast={() => null}>
            {L(migration.title)}
          </Text>
        </Billboard>
      </group>
    </group>
  );
});

function ArrowHead({ pts }: { pts: THREE.Vector3[] }) {
  const end = pts[pts.length - 1], prev = pts[pts.length - 4];
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(prev).normalize()), [end, prev]);
  return (
    <mesh position={end} quaternion={quat} raycast={() => null}>
      <coneGeometry args={[0.09, 0.28, 10]} />
      <meshBasicMaterial color="#c0392b" />
    </mesh>
  );
}

/** Orbit controls plus smooth turning towards a requested place. */
function GlobeCamera() {
  const ref = useRef<OrbitControlsImpl>(null);
  const focus = useStore((s) => s.globeFocus);
  const camera = useThree((s) => s.camera);
  const goal = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    // start over the Middle East
    if (!focus) camera.position.copy(latLonToVec3(28, 38, 34));
  }, [camera, focus]);

  useEffect(() => {
    if (!focus) return;
    const p = placeById.get(focus.place);
    if (!p) return;
    const dist = Math.min(camera.position.length(), 26);
    // aim slightly south of the place so pins and labels sit in the upper-middle of the view
    goal.current = latLonToVec3(p.lat - 6, p.lon, dist);
  }, [focus, camera]);

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

  useFrame((_, dt) => {
    if (!goal.current) return;
    const cur = camera.position;
    const len = THREE.MathUtils.lerp(cur.length(), goal.current.length(), Math.min(1, dt * 3));
    const dir = cur.clone().normalize().lerp(goal.current.clone().normalize(), Math.min(1, dt * 3)).normalize();
    cur.copy(dir.multiplyScalar(len));
    ref.current?.update();
    if (cur.distanceTo(goal.current) < 0.05) goal.current = null;
  });

  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={13}
      maxDistance={60}
      rotateSpeed={0.5}
      zoomSpeed={0.8}
      onStart={() => (goal.current = null)}
    />
  );
}
