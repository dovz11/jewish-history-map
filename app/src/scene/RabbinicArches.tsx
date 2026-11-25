import { Billboard, Text } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { memo, useMemo, useState } from 'react';
import * as THREE from 'three';
import type { RabbinicEra, Span } from '../data/types';
import { L } from '../i18n';
import { mainSpan, rabbinicEras } from '../lib/data';
import { formatSpan } from '../lib/dates';
import { focusItem } from '../lib/focus';
import { LANES, yearToX } from '../lib/timeScale';
import { sameRef, useStore } from '../store';
import { FONT_BLACK, FONT_REGULAR } from './constants';
import { FLAT } from '../lib/dim';

/** The rabbinic periods as an arcade of arches behind the events; personalities stand beneath them. */
export function RabbinicArches() {
  const mode = useStore((s) => s.mode);
  return (
    <group>
      {rabbinicEras.map((r) => (
        <Arch key={r.id} era={r} span={mainSpan(r.dating, mode)} />
      ))}
    </group>
  );
}

const Arch = memo(function Arch({ era, span }: { era: RabbinicEra; span: Span }) {
  const selected = useStore((s) => sameRef(s.selected, { type: 'rabbinic', id: era.id }));
  const [hover, setHover] = useState(false);
  const x0 = yearToX(span.start), x1 = yearToX(span.end ?? span.start);
  const len = Math.abs(x1 - x0);
  const cx = (x0 + x1) / 2;
  const h = THREE.MathUtils.clamp(len * 0.42, 6, 17);
  const z = LANES.rabbinic;

  const tube = useMemo(() => {
    // half-ellipse from one pillar to the other, slightly inset so neighbours don't touch
    const a = Math.max(0.5, len / 2 - 0.35);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 48; i++) {
      const t = Math.PI - (Math.PI * i) / 48;
      pts.push(new THREE.Vector3(cx + a * Math.cos(t), h * Math.sin(t), z));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 96, selected || hover ? 0.42 : 0.3, 8, false);
  }, [cx, len, h, z, selected, hover]);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    focusItem({ type: 'rabbinic', id: era.id });
  };
  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHover(true);
    document.body.style.cursor = 'pointer';
    useStore.getState().setHover(`${L(era.title)} · ${formatSpan(span)}`);
  };
  const out = () => {
    setHover(false);
    document.body.style.cursor = '';
    useStore.getState().setHover(null);
  };

  const fs = THREE.MathUtils.clamp(len / (L(era.title).length * 0.75), 0.8, 2.2);
  return (
    <group>
      <mesh geometry={tube} onClick={onClick} onPointerOver={over} onPointerOut={out}>
        <meshStandardMaterial color={era.color} emissive={era.color} emissiveIntensity={selected ? 0.5 : hover ? 0.3 : 0.08} roughness={0.6} />
      </mesh>
      {/* the period's span marked on the ground */}
      <mesh position={[cx, 0.02, z]} rotation-x={-Math.PI / 2} raycast={() => null}>
        <planeGeometry args={[Math.max(0.2, len - 0.7), 3.2]} />
        <meshBasicMaterial color={era.color} transparent opacity={selected ? 0.55 : 0.3} depthWrite={false} />
      </mesh>
      {/* 2D: the arch is seen edge-on from above, so its name sits just in front of it */}
      <Billboard position={FLAT ? [cx, 1, z + 2.6] : [cx, h + 0.6, z]}>
        <group onClick={onClick} onPointerOver={over} onPointerOut={out}>
          <Text font={FONT_BLACK} fontSize={fs} color={era.color} outlineWidth={0.05} outlineColor="#5a4a2e" outlineOpacity={0.55} anchorX="center" anchorY="bottom" direction="auto">
            {L(era.title)}
          </Text>
          <Text font={FONT_REGULAR} fontSize={fs * 0.42} color="#6b5d45" anchorX="center" anchorY="top" position={[0, -0.05, 0]} direction="auto">
            {formatSpan(span)}
          </Text>
        </group>
      </Billboard>
    </group>
  );
});
