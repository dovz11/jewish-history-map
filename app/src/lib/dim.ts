/**
 * 2D / 3D display.
 *
 * Timeline: one poster scene (scene/Poster.tsx) for both. In 2D it lies flat and is seen from
 * straight above; in 3D its upper half (population chart and events) swings up like the page of a
 * pop-up book, the period rows rise from the floor as tiles, and the camera tilts. The change is
 * animated through `lift` (0 = flat, 1 = standing), which the scene reads every frame.
 *
 * Globe: 3D is the round globe, 2D an equirectangular world map (the globe canvas is rebuilt).
 */
export type Dim = '2d' | '3d';

export let FLAT = true;

/** Animated 0 (2D) … 1 (3D); `value` eases towards `target` (see useLiftDriver in Poster.tsx). */
export const lift = { value: 0, target: 0 };

/** Camera distance from its target, published every frame (used for level of detail). */
export const view = { dist: 100 };

export function setFlat(flat: boolean, animate = true) {
  FLAT = flat;
  lift.target = flat ? 0 : 1;
  if (!animate) lift.value = lift.target;
}

export function initialDim(): Dim {
  const fromHash = new URLSearchParams(location.hash.slice(1)).get('dim');
  if (fromHash === '2d' || fromHash === '3d') return fromHash;
  // 2D (the flat poster) is the default; a visitor's own choice is remembered
  return localStorage.getItem('jhm-dim') === '3d' ? '3d' : '2d';
}

/** Coarse pointer (phone / tablet): enables touch-only conveniences. */
export const isTouch = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
