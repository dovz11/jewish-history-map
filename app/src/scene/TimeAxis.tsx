import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { gematria, toAnnoMundi, formatYearShort } from '../lib/dates';
import { LANES, tickYears, yearToX, YEAR_MAX, YEAR_MIN } from '../lib/timeScale';
import { COLORS, FONT_BOLD, FONT_REGULAR } from './constants';

/** Ticks whose label stays visible from far away. */
const MAJOR = (y: number) => y % 500 === 0 || y === 1900 || y === 1950 || y === 2000;

export function TimeAxis() {
  const ticks = useMemo(() => tickYears(), []);
  const refs = useRef<(THREE.Group | null)[]>([]);
  const v = new THREE.Vector3();
  useFrame(({ camera }) => {
    refs.current.forEach((g, i) => {
      if (!g) return;
      v.set(yearToX(ticks[i]), 0, LANES.axis);
      g.visible = camera.position.distanceTo(v) < (MAJOR(ticks[i]) ? 600 : 150);
    });
  });
  const x0 = yearToX(YEAR_MIN), x1 = yearToX(YEAR_MAX);
  return (
    <group>
      <mesh position={[(x0 + x1) / 2, 0.03, LANES.axis]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[Math.abs(x1 - x0), 0.12]} />
        <meshBasicMaterial color={COLORS.ink} />
      </mesh>
      {ticks.map((y, i) => {
        const x = yearToX(y);
        const major = MAJOR(y);
        return (
          <group key={y} ref={(g) => { refs.current[i] = g; }} position={[x, 0, LANES.axis]}>
            <mesh position={[0, 0.035, 0]} rotation-x={-Math.PI / 2}>
              <planeGeometry args={[major ? 0.12 : 0.07, major ? 1.6 : 0.9]} />
              <meshBasicMaterial color={COLORS.ink} />
            </mesh>
            {/* labels lie in front of the axis, tilted up towards the camera; Hebrew year below, CE above */}
            <group position={[0, 0.05, major ? 3.2 : 2.6]} rotation-x={-1.15}>
              <Text font={FONT_REGULAR} fontSize={major ? 0.6 : 0.42} color={COLORS.trad} anchorX="center" anchorY="bottom" position={[0, 0, 0]} direction="rtl">
                {gematria(toAnnoMundi(y))}
              </Text>
              <Text font={major ? FONT_BOLD : FONT_REGULAR} fontSize={major ? 0.85 : 0.6} color={COLORS.ink} anchorX="center" anchorY="bottom" position={[0, major ? 0.75 : 0.55, 0]} direction="rtl">
                {formatYearShort(y)}
              </Text>
            </group>
          </group>
        );
      })}
    </group>
  );
}
