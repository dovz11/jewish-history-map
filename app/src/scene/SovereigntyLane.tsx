import { L, t } from '../i18n';
import { Text } from '@react-three/drei';
import { type ThreeEvent } from '@react-three/fiber';
import { memo, useState } from 'react';
import { datingsDiffer, mainSpan, POWER_COLORS, rulers } from '../lib/data';
import { formatSpan } from '../lib/dates';
import { LANES, yearToX } from '../lib/timeScale';
import { FLAT } from '../lib/dim';
import type { DateMode, Ruler, Span } from '../data/types';
import { sameRef, useStore } from '../store';
import { COLORS, FONT_BOLD, FONT_REGULAR } from './constants';

const DEPTH = 2.6;

export function SovereigntyLane() {
  const mode = useStore((s) => s.mode);
  return (
    <group>
      {rulers.map((r) => (
        <RulerBlock key={r.id} ruler={r} span={mainSpan(r.dating, mode)} />
      ))}
      {mode === 'both' &&
        rulers.filter((r) => datingsDiffer(r.dating)).map((r) => <RulerBlock key={r.id + '-t'} ruler={r} span={r.dating.trad!} ghost />)}
    </group>
  );
}

const RulerBlock = memo(function RulerBlock({ ruler, span, ghost = false }: { ruler: Ruler; span: Span; ghost?: boolean; mode?: DateMode }) {
  const selected = useStore((s) => !ghost && sameRef(s.selected, { type: 'ruler', id: ruler.id }));
  const [hover, setHover] = useState(false);
  const x0 = yearToX(span.start), x1 = yearToX(span.end ?? span.start + 1);
  const len = Math.abs(x1 - x0);
  const cx = (x0 + x1) / 2;
  const z = ghost ? LANES.tradStrip : ruler.row === 1 ? LANES.sovereigntyRow1 : LANES.sovereignty;
  const height = ghost ? 0.18 : ruler.jewish ? 1.6 : 0.9;
  const depth = ghost ? 1.4 : DEPTH;
  const color = POWER_COLORS[ruler.power] ?? '#888';

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const st = useStore.getState();
    st.select({ type: 'ruler', id: ruler.id });
    st.flyTo(cx, { z: LANES.sovereignty, dist: Math.min(140, Math.max(28, len * 1.1)) });
  };
  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHover(true);
    document.body.style.cursor = 'pointer';
    useStore.getState().setHover(`${ghost ? `${t('tradDatingPrefix')} · ` : ''}${L(ruler.title)} · ${formatSpan(span)}`);
  };
  const out = () => {
    setHover(false);
    document.body.style.cursor = '';
    useStore.getState().setHover(null);
  };

  const fs = Math.min(1.0, Math.max(0.35, len / (L(ruler.title).length * 0.62)));
  const showLabel = len > 2.2;

  return (
    <group>
      <mesh position={[cx, height / 2, z]} onClick={onClick} onPointerOver={over} onPointerOut={out}>
        <boxGeometry args={[Math.max(0.05, len - 0.12), height, depth]} />
        <meshStandardMaterial
          color={selected ? COLORS.selected : color}
          transparent={ghost}
          opacity={ghost ? 0.45 : 1}
          emissive={hover || selected ? color : '#000'}
          emissiveIntensity={hover || selected ? 0.35 : 0}
        />
      </mesh>
      {ruler.jewish && !ghost && (
        <mesh position={[cx, height + 0.02, z]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[Math.max(0.05, len - 0.12), 0.25]} />
          <meshBasicMaterial color="#f2d27a" />
        </mesh>
      )}
      {showLabel && (
        <group>
          {/* front face label */}
          <Text
            font={FONT_BOLD}
            fontSize={ghost ? Math.min(fs, 0.5) : fs}
            maxWidth={len - 0.4}
            textAlign="center"
            anchorX="center"
            anchorY="middle"
            // 3D: on the front face; 2D (seen from above): on the top
            position={ghost ? [cx, height + 0.02, z] : FLAT ? [cx, height + 0.04, z - 0.35] : [cx, height / 2, z + depth / 2 + 0.01]}
            rotation={ghost || FLAT ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}
            color={ghost ? COLORS.trad : '#fff'}
            direction="auto"
            raycast={() => null}
          >
            {L(ruler.title)}
          </Text>
          {!ghost && len > 6 && (
            <Text
              font={FONT_REGULAR}
              fontSize={Math.min(0.42, fs * 0.6)}
              anchorX="center"
              anchorY="middle"
              position={[cx, height + 0.03, z + 0.5]}
              rotation={[-Math.PI / 2, 0, 0]}
              color={COLORS.ink}
              direction="auto"
              raycast={() => null}
            >
              {formatSpan(span)}
            </Text>
          )}
        </group>
      )}
    </group>
  );
});
