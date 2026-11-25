import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { DIR } from '../lib/timeScale';
import { onCanvasMiss } from '../lib/focus';
import { CameraRig } from './CameraRig';
import { POSTER } from './constants';
import { Poster } from './Poster';

/**
 * The timeline: one poster for both 2D and 3D (see Poster.tsx). Switching only animates it and
 * the camera, so the scene is never rebuilt.
 */
export function Scene() {
  return (
    <Canvas
      flat
      dpr={[1, 2]}
      camera={{ position: [0, 60, 90], fov: 45, near: 1, far: 3000 }}
      gl={{ antialias: true }}
      onPointerMissed={onCanvasMiss}
    >
      <color attach="background" args={[POSTER.paper]} />
      {/* fog only in 3D: CameraRig pushes it out of the way in 2D */}
      <fog attach="fog" args={[POSTER.paper, 200, 900]} />
      {/* soft, even light: the tiles' tops keep their true colors and their sides shade gently */}
      <ambientLight intensity={1.7} />
      <directionalLight position={[-30 * DIR, 80, 50]} intensity={1.5} />
      <Suspense fallback={null}>
        <Poster />
      </Suspense>
      <CameraRig />
    </Canvas>
  );
}
