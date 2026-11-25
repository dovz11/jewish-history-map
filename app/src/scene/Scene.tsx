import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { DIR, U_MAX } from '../lib/timeScale';
import { useStore } from '../store';
import { CameraRig } from './CameraRig';
import { COLORS, POSTER } from './constants';
import { DemographyRiver } from './DemographyRiver';
import { EraBands } from './EraBands';
import { HistoryLane } from './HistoryLane';
import { LaneLabels } from './LaneLabels';
import { SovereigntyLane } from './SovereigntyLane';
import { TimeAxis } from './TimeAxis';
import { RabbinicArches } from './RabbinicArches';
import { PeopleLane } from './PeopleLane';
import { FLAT } from '../lib/dim';
import { Poster2D } from './Poster2D';
import { onCanvasMiss } from '../lib/focus';

export function Scene() {
  const lanes = useStore((s) => s.lanes);
  const cx = (DIR * U_MAX) / 2;
  return (
    <Canvas
      flat
      dpr={[1, 2]}
      // 2D is seen from far above: a larger near plane keeps depth precision for the flat layers
      camera={{ position: [0, 60, 90], fov: 45, near: FLAT ? 2 : 0.5, far: 3000 }}
      gl={{ antialias: true }}
      onPointerMissed={onCanvasMiss}
    >
      <color attach="background" args={[FLAT ? POSTER.paper : COLORS.background]} />
      {FLAT ? (
        // 2D: the poster, drawn flat (no lights or fog needed)
        <Suspense fallback={null}>
          <Poster2D />
        </Suspense>
      ) : (
        <>
          <fog attach="fog" args={[COLORS.background, 160, 700]} />
          <hemisphereLight args={['#fffaf0', '#c8b48a', 1.4]} />
          <directionalLight position={[-40, 80, 60]} intensity={1.6} />
          <mesh rotation-x={-Math.PI / 2} position={[cx, -0.01, 0]} raycast={() => null}>
            <planeGeometry args={[U_MAX + 400, 400]} />
            <meshStandardMaterial color={COLORS.ground} roughness={1} />
          </mesh>
          <Suspense fallback={null}>
            {lanes.eras && <EraBands />}
            <TimeAxis />
            <LaneLabels />
            {lanes.sovereignty && <SovereigntyLane />}
            {lanes.demography && <DemographyRiver />}
            {lanes.history && <HistoryLane />}
            {lanes.rabbinic && <RabbinicArches />}
            {lanes.people && <PeopleLane />}
          </Suspense>
        </>
      )}
      <CameraRig />
    </Canvas>
  );
}
