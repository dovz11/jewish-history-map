import { Billboard, Text } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { nearestPopPoint, population, popIsrael, popMax, popTotal, POP_FROM, POP_TO } from '../lib/data';
import { formatMillions, formatYear } from '../lib/dates';
import { LANES, uToYear, yearToU, yearToX, xToYear, DIR } from '../lib/timeScale';
import { useStore } from '../store';
import { COLORS, FONT_BOLD, FONT_REGULAR } from './constants';

export const W_SCALE = 0.62;
const N = 28;

const heightOf = (total: number) => 0.3 + 0.16 * total;
/** cross-section profile: 0..1 across the width -> 0..1 height */
const profile = (t: number) => Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.7);

function buildMound(sample: (year: number) => { w: number; h: number; from: number; to: number }, step = 0.6) {
  const u0 = yearToU(POP_FROM), u1 = yearToU(POP_TO);
  const rows = Math.ceil((u1 - u0) / step) + 1;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let r = 0; r < rows; r++) {
    const u = Math.min(u1, u0 + r * step);
    const year = uToYear(u);
    const { w, h, from, to } = sample(year);
    const x = DIR * u;
    for (let k = 0; k <= N; k++) {
      // the slice [from, to] of the full width (0..1) is drawn; height follows the full profile
      const t = from + ((to - from) * k) / N;
      const z = LANES.river - w / 2 + w * t;
      pos.push(x, h * profile(t) + 0.01, z);
    }
  }
  for (let r = 0; r < rows - 1; r++) {
    for (let k = 0; k < N; k++) {
      const a = r * (N + 1) + k, b = a + N + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function DemographyRiver() {
  const { main, israel, range } = useMemo(() => {
    const main = buildMound((y) => ({ w: W_SCALE * popTotal(y), h: heightOf(popTotal(y)), from: 0, to: 1 }));
    // the share living in the Land of Israel: the central slice of the main mound, lifted slightly
    const israel = buildMound((y) => {
      const tot = popTotal(y), share = Math.min(1, popIsrael(y) / tot);
      return { w: W_SCALE * tot, h: heightOf(tot) + 0.04, from: 0.5 - share / 2, to: 0.5 + share / 2 };
    }, 0.5);
    const range = buildMound((y) => ({ w: W_SCALE * popMax(y), h: 0.06, from: 0, to: 1 }), 1.2);
    return { main, israel, range };
  }, []);

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const year = xToYear(e.point.x);
    const tot = popTotal(year), isr = popIsrael(year);
    let t = `${formatYear(year)}: כ-${formatMillions(tot)} יהודים בעולם`;
    if (isr > 0.005) t += ` · בארץ ישראל: ${formatMillions(isr)} (${Math.round((isr / tot) * 100)}%)`;
    useStore.getState().setHover(t);
    document.body.style.cursor = 'pointer';
  };
  const onOut = () => {
    useStore.getState().setHover(null);
    document.body.style.cursor = '';
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const p = nearestPopPoint(xToYear(e.point.x));
    useStore.getState().select({ type: 'pop', year: p.year });
    useStore.getState().flyTo(yearToX(p.year), { z: LANES.river, dist: 30 });
  };

  return (
    <group>
      <mesh geometry={main} onPointerMove={onMove} onPointerOut={onOut} onClick={onClick}>
        <meshStandardMaterial color={COLORS.river} roughness={0.55} metalness={0.05} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={israel} raycast={() => null}>
        <meshStandardMaterial color={COLORS.riverIsrael} roughness={0.5} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
      <mesh geometry={range} raycast={() => null}>
        <meshBasicMaterial color={COLORS.riverRange} transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <PopLabels />
    </group>
  );
}

const LABEL_YEARS = new Set([-1000, -734, 1, 136, 1000, 1490, 1800, 1880, 1939, 1945, 1970, 2025]);

function PopLabels() {
  const refs = useRef<(THREE.Group | null)[]>([]);
  const pts = population.filter((p) => LABEL_YEARS.has(p.year));
  const v = new THREE.Vector3();
  useFrame(({ camera }) => {
    refs.current.forEach((g, i) => {
      if (!g) return;
      v.set(yearToX(pts[i].year), 0, LANES.river);
      g.visible = camera.position.distanceTo(v) < (pts[i].year === 1939 || pts[i].year === 2025 ? 400 : 130);
    });
  });
  return (
    <>
      {pts.map((p, i) => (
        <group key={p.year} ref={(g) => { refs.current[i] = g; }}>
          <Billboard position={[yearToX(p.year), heightOf(p.total) + 0.9, LANES.river]}>
            <Text font={FONT_BOLD} fontSize={0.6} color={COLORS.river} anchorX="center" anchorY="bottom" direction="rtl" outlineWidth={0.04} outlineColor="#fff">
              {formatMillions(p.total)}
            </Text>
            <Text font={FONT_REGULAR} fontSize={0.36} color={COLORS.inkSoft} anchorX="center" anchorY="top" position={[0, -0.02, 0]} direction="rtl">
              {formatYear(p.year)}
            </Text>
          </Billboard>
        </group>
      ))}
    </>
  );
}
