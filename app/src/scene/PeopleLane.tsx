import { Billboard, Line, Text } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { memo, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Person } from '../data/types';
import { L } from '../i18n';
import { CATEGORY_COLORS, layoutLevels, people, personYear } from '../lib/data';
import { formatSpan } from '../lib/dates';
import { focusItem } from '../lib/focus';
import { LANES, yearToU, yearToX } from '../lib/timeScale';
import { sameRef, useStore } from '../store';
import { COLORS, FONT_BOLD, FONT_REGULAR } from './constants';
import { FLAT } from '../lib/dim';

/** Distance beyond which a person of the given importance hides their name card. */
const LOD_DIST: Record<number, number> = { 1: 45, 2: 70, 3: 120, 4: 200, 5: 10000 };

export function PeopleLane() {
  const levels = useMemo(() => layoutLevels(people.map((p) => ({ id: p.id, u: yearToU(personYear(p)) })), 5.5, 6), []);
  return (
    <group>
      {people.map((p) => (
        <Figure key={p.id} person={p} level={levels.get(p.id) ?? 0} />
      ))}
    </group>
  );
}

const tmp = new THREE.Vector3();

const Figure = memo(function Figure({ person, level }: { person: Person; level: number }) {
  const span = person.dating.acad!;
  const x = yearToX(personYear(person));
  // stagger figures in depth by level, so crowded periods stay readable
  const z = LANES.people + 1.6 - (level % 3) * 1.4;
  const cardY = 3.1 + level * 1.75;
  // 2D: cards step back along the lane instead of up
  const card: [number, number, number] = FLAT ? [x, 2 + level * 0.5, z - 1.2 - level * 1.55] : [x, cardY, z];
  const color = CATEGORY_COLORS[person.category];
  const scale = 0.8 + person.importance * 0.08;
  const selected = useStore((s) => sameRef(s.selected, { type: 'person', id: person.id }));
  const [hover, setHover] = useState(false);
  const cardRef = useRef<THREE.Group>(null);
  const [bounds, setBounds] = useState<[number, number]>([3, 1.2]);

  useFrame(({ camera }) => {
    if (!cardRef.current) return;
    tmp.set(card[0], FLAT ? 0 : cardY, card[2]);
    cardRef.current.visible = selected || hover || camera.position.distanceTo(tmp) < LOD_DIST[person.importance];
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    focusItem({ type: 'person', id: person.id });
  };
  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHover(true);
    document.body.style.cursor = 'pointer';
  };
  const out = () => {
    setHover(false);
    document.body.style.cursor = '';
  };

  const x0 = yearToX(span.start), x1 = yearToX(span.end ?? span.start);
  const head = selected || hover ? COLORS.selected : color;
  return (
    <group>
      {/* lifespan on the ground */}
      <mesh position={[(x0 + x1) / 2, 0.04, z]} rotation-x={-Math.PI / 2} raycast={() => null}>
        <planeGeometry args={[Math.max(0.25, Math.abs(x1 - x0)), 0.28]} />
        <meshBasicMaterial color={color} transparent opacity={selected ? 0.9 : 0.5} />
      </mesh>
      {/* the figure: body and head */}
      <group position={[x, 0, z]} scale={scale} onClick={onClick} onPointerOver={over} onPointerOut={out}>
        <mesh position={[0, 0.65, 0]}>
          <coneGeometry args={[0.42, 1.3, 12]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.55, 0]}>
          <sphereGeometry args={[0.27, 16, 12]} />
          <meshStandardMaterial color={head} emissive={selected ? COLORS.selected : '#000'} emissiveIntensity={0.4} roughness={0.5} />
        </mesh>
      </group>
      <group ref={cardRef}>
        {!FLAT && <Line points={[[x, 1.95 * scale, z], [x, cardY - 0.15, z]]} color={color} lineWidth={1} transparent opacity={0.6} />}
        <Billboard position={card}>
          <group onClick={onClick} onPointerOver={over} onPointerOut={out}>
            <mesh position={[0, bounds[1] / 2 - 0.12, -0.02]}>
              <planeGeometry args={[bounds[0] + 0.45, bounds[1] + 0.2]} />
              <meshBasicMaterial color={selected ? '#fff3cf' : '#fdf8ee'} transparent opacity={0.93} />
            </mesh>
            <mesh position={[0, -0.22, -0.015]}>
              <planeGeometry args={[bounds[0] + 0.45, 0.07]} />
              <meshBasicMaterial color={color} />
            </mesh>
            <Text
              font={FONT_BOLD}
              fontSize={0.48}
              maxWidth={5}
              textAlign="center"
              anchorX="center"
              anchorY="bottom"
              position={[0, 0.3, 0]}
              color={COLORS.ink}
              direction="auto"
              onSync={(t) => {
                const info = (t as unknown as { textRenderInfo?: { blockBounds: number[] } }).textRenderInfo;
                if (info) {
                  const [bx0, by0, bx1, by1] = info.blockBounds;
                  const w = Math.max(bx1 - bx0, 2), hh = by1 - by0 + 0.45;
                  if (Math.abs(w - bounds[0]) > 0.01 || Math.abs(hh - bounds[1]) > 0.01) setBounds([w, hh]);
                }
              }}
            >
              {L(person.name)}
            </Text>
            <Text font={FONT_REGULAR} fontSize={0.3} anchorX="center" anchorY="bottom" position={[0, -0.05, 0]} color={COLORS.inkSoft} direction="auto">
              {formatSpan(span)}
            </Text>
          </group>
        </Billboard>
      </group>
    </group>
  );
});
