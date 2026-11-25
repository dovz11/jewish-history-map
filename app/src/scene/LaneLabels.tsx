import { Text } from '@react-three/drei';
import { LANES, yearToX } from '../lib/timeScale';
import { useStore } from '../store';
import { COLORS, FONT_BLACK } from './constants';

/** Lane titles repeated at a few points along the corridor. */
const AT = [-3780, -1050, 600, 1790];

export function LaneLabels() {
  const lanes = useStore((s) => s.lanes);
  const mode = useStore((s) => s.mode);
  const items: { z: number; text: string; show: boolean; color: string }[] = [
    { z: LANES.history + 1.5, text: 'אירועים', show: lanes.history, color: COLORS.ink },
    { z: LANES.river + 5.5, text: 'אוכלוסיית העם היהודי', show: lanes.demography, color: COLORS.river },
    { z: LANES.sovereignty + 2.2, text: 'שלטון בארץ ישראל', show: lanes.sovereignty, color: COLORS.ink },
    { z: LANES.tradStrip + 1.2, text: 'שלטון — לפי התיארוך המסורתי', show: lanes.sovereignty && mode === 'both', color: COLORS.trad },
  ];
  return (
    <group>
      {AT.map((y) =>
        items.filter((i) => i.show).map((i) => (
          <Text
            key={`${y}-${i.text}`}
            font={FONT_BLACK}
            fontSize={0.8}
            color={i.color}
            fillOpacity={0.75}
            anchorX="right"
            anchorY="middle"
            position={[yearToX(y), 0.04, i.z]}
            rotation={[-Math.PI / 2, 0, 0]}
            direction="rtl"
            raycast={() => null}
          >
            {i.text}
          </Text>
        )),
      )}
    </group>
  );
}
