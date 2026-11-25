import { Billboard, QuadraticBezierLine, Text } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { memo, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { events, eventU, ghostSpan, isTradOnly, KIND_COLORS, layoutLevels, mainSpan } from '../lib/data';
import { formatSpan } from '../lib/dates';
import { LANES, yearToX } from '../lib/timeScale';
import type { DateMode, HistoryEvent } from '../data/types';
import { sameRef, useStore } from '../store';
import { COLORS, FONT_BOLD, FONT_REGULAR } from './constants';

const LEVEL_H = 2.7;
const BASE_H = 2.4;

/** Distance beyond which an event of the given importance hides its card. */
const LOD_DIST: Record<number, number> = { 1: 55, 2: 85, 3: 140, 4: 240, 5: 10000 };

export function HistoryLane() {
  const mode = useStore((s) => s.mode);
  const levels = useMemo(
    () => layoutLevels(events.map((e) => ({ id: e.id, u: eventU(e, mode) })), 6.5, 6),
    [mode],
  );
  return (
    <group>
      {events.map((e) => (
        <EventMarker key={e.id} event={e} mode={mode} level={levels.get(e.id) ?? 0} />
      ))}
    </group>
  );
}

const tmp = new THREE.Vector3();

const EventMarker = memo(function EventMarker({ event, mode, level }: { event: HistoryEvent; mode: DateMode; level: number }) {
  const span = mainSpan(event.dating, mode);
  const ghost = ghostSpan(event.dating, mode);
  const tradOnly = isTradOnly(event.dating);
  const x = yearToX(span.start);
  const z = LANES.history;
  const h = BASE_H + level * LEVEL_H;
  const scale = 0.75 + event.importance * 0.1;
  const color = tradOnly ? COLORS.trad : KIND_COLORS[event.kind];

  const selected = useStore((s) => sameRef(s.selected, { type: 'event', id: event.id }));
  const [hover, setHover] = useState(false);
  const cardRef = useRef<THREE.Group>(null);
  const gemRef = useRef<THREE.Mesh>(null);
  const ghostLabelRef = useRef<THREE.Group>(null);
  const [bounds, setBounds] = useState<[number, number]>([4, 1.6]);

  useFrame(({ camera, clock }) => {
    const g = cardRef.current;
    if (g) {
      tmp.set(x, h, z);
      const d = camera.position.distanceTo(tmp);
      g.visible = selected || hover || d < LOD_DIST[event.importance];
    }
    if (ghostLabelRef.current) {
      tmp.set(ghostX ?? x, 1, z);
      ghostLabelRef.current.visible = selected || hover || camera.position.distanceTo(tmp) < 45;
    }
    if (gemRef.current) {
      gemRef.current.rotation.y = clock.elapsedTime * (selected ? 2 : 0.4);
      const s = selected ? 1.35 + Math.sin(clock.elapsedTime * 4) * 0.1 : hover ? 1.2 : 1;
      gemRef.current.scale.setScalar(s * scale);
    }
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const st = useStore.getState();
    st.select({ type: 'event', id: event.id });
    st.flyTo(x, { z: z + 4, dist: 34 });
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

  const endX = span.end !== undefined ? yearToX(span.end) : null;
  const ghostX = ghost ? yearToX(ghost.start) : null;

  return (
    <group>
      {/* post */}
      <mesh position={[x, h / 2, z]} onClick={onClick} onPointerOver={over} onPointerOut={out}>
        <cylinderGeometry args={[0.07, 0.11, h, 6]} />
        <meshStandardMaterial color={color} transparent opacity={tradOnly ? 0.55 : 0.9} />
      </mesh>
      {/* base disc */}
      <mesh position={[x, 0.03, z]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.45 * scale, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} />
      </mesh>
      {/* gem */}
      <mesh ref={gemRef} position={[x, h + 0.35, z]} onClick={onClick} onPointerOver={over} onPointerOut={out}>
        <octahedronGeometry args={[0.42, 0]} />
        <meshStandardMaterial color={selected ? COLORS.selected : color} emissive={selected ? COLORS.selected : '#000'} emissiveIntensity={selected ? 0.5 : 0} flatShading />
      </mesh>
      {/* duration bar on the ground */}
      {endX !== null && (
        <mesh position={[(x + endX) / 2, 0.05, z + 1.1]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[Math.max(0.3, Math.abs(endX - x)), 0.35]} />
          <meshBasicMaterial color={color} transparent opacity={0.55} />
        </mesh>
      )}
      {/* traditional dating ghost + arc (in "both" mode) */}
      {ghostX !== null && (
        <group>
          <mesh position={[ghostX, 0.5, z + 2.2]}>
            <octahedronGeometry args={[0.38, 0]} />
            <meshStandardMaterial color={COLORS.trad} transparent opacity={0.6} flatShading />
          </mesh>
          <QuadraticBezierLine
            start={[ghostX, 0.5, z + 2.2]}
            end={[x, 0.15, z + 0.4]}
            mid={[(ghostX + x) / 2, 1.5 + Math.min(10, Math.abs(ghostX - x) * 0.25), z + 1.6]}
            color={COLORS.trad}
            lineWidth={1.4}
            dashed
            dashSize={0.5}
            gapSize={0.35}
          />
          <Billboard ref={ghostLabelRef} position={[ghostX, 1.45, z + 2.2]}>
            <Text font={FONT_REGULAR} fontSize={0.42} color={COLORS.trad} anchorX="center" anchorY="bottom" direction="rtl">
              {`מסורת: ${formatSpan(ghost!)}`}
            </Text>
          </Billboard>
        </group>
      )}
      {/* card */}
      <group ref={cardRef}>
        <Billboard position={[x, h + 1.0, z]}>
          <group scale={scale} onClick={onClick} onPointerOver={over} onPointerOut={out}>
            <mesh position={[0, bounds[1] / 2 - 0.1, -0.02]}>
              <planeGeometry args={[bounds[0] + 0.6, bounds[1] + 0.35]} />
              <meshBasicMaterial color={selected ? '#fff3cf' : COLORS.card} transparent opacity={tradOnly ? 0.8 : 0.94} />
            </mesh>
            <mesh position={[0, -0.27, -0.015]}>
              <planeGeometry args={[bounds[0] + 0.6, 0.09]} />
              <meshBasicMaterial color={selected ? COLORS.selected : color} />
            </mesh>
            <Text
              font={FONT_BOLD}
              fontSize={0.62}
              maxWidth={7}
              textAlign="center"
              anchorX="center"
              anchorY="bottom"
              position={[0, 0.42, 0]}
              color={COLORS.ink}
              direction="rtl"
              lineHeight={1.1}
              onSync={(t) => {
                const info = (t as unknown as { textRenderInfo?: { blockBounds: number[] } }).textRenderInfo;
                if (info) {
                  const [x0, y0, x1, y1] = info.blockBounds;
                  const w = Math.max(x1 - x0, 2.6), hh = y1 - y0 + 0.62;
                  if (Math.abs(w - bounds[0]) > 0.01 || Math.abs(hh - bounds[1]) > 0.01) setBounds([w, hh]);
                }
              }}
            >
              {event.title.he}
            </Text>
            <Text font={FONT_REGULAR} fontSize={0.4} anchorX="center" anchorY="bottom" position={[0, -0.05, 0]} color={COLORS.inkSoft} direction="rtl">
              {(tradOnly ? 'לפי המסורת · ' : '') + formatSpan(span)}
            </Text>
          </group>
        </Billboard>
      </group>
    </group>
  );
});

