import { L } from '../i18n';
import { Text } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { eras, mainSpan } from '../lib/data';
import { LANES, yearToX } from '../lib/timeScale';
import { sameRef, useStore } from '../store';
import { FONT_BLACK } from './constants';
import { FLAT } from '../lib/dim';

/** Large tinted floor sections marking the historical periods, with names standing at the back. */
export function EraBands() {
  const mode = useStore((s) => s.mode);
  const selected = useStore((s) => s.selected);
  // read at render time: the lanes move apart in 2D
  const Z_FRONT = LANES.axis - 1;
  const Z_BACK = LANES.eraLabels + 2;
  return (
    <group>
      {eras.map((era, i) => {
        // in academic mode an era with no academic date (Patriarchs) falls back to tradition
        const span = mainSpan(era.dating, mode);
        const x0 = yearToX(span.start), x1 = yearToX(span.end!);
        const len = Math.abs(x1 - x0);
        const cx = (x0 + x1) / 2;
        const isSel = sameRef(selected, { type: 'era', id: era.id });
        const onClick = (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          useStore.getState().select({ type: 'era', id: era.id });
          useStore.getState().flyTo(cx, { z: -6, dist: Math.min(230, Math.max(50, len * 1.0)) });
        };
        return (
          <group key={era.id}>
            <mesh position={[cx, 0.005 + (i % 2) * 0.002, (Z_FRONT + Z_BACK) / 2]} rotation-x={-Math.PI / 2} raycast={() => null}>
              <planeGeometry args={[len, Z_FRONT - Z_BACK]} />
              <meshBasicMaterial color={era.color} transparent opacity={isSel ? 0.75 : 0.42} depthWrite={false} />
            </mesh>
            <Text
              font={FONT_BLACK}
              fontSize={Math.min(5, Math.max(1.6, len / (L(era.title).length * 0.7)))}
              maxWidth={len}
              anchorX="center"
              anchorY="bottom"
              textAlign="center"
              position={[cx, 0.2, LANES.eraLabels]}
              // standing names in 3D; lying on the ground (readable from above) in 2D
              rotation={FLAT ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}
              color={era.color}
              outlineWidth={0.06}
              outlineColor="#7a6a4a"
              outlineOpacity={0.5}
              direction="auto"
              onClick={onClick}
              onPointerOver={() => (document.body.style.cursor = 'pointer')}
              onPointerOut={() => (document.body.style.cursor = '')}
            >
              {L(era.title)}
            </Text>
          </group>
        );
      })}
    </group>
  );
}
