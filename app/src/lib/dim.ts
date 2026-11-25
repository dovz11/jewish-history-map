import { LANES } from './timeScale';

/**
 * 2D / 3D display. Like DIR, the flag lives in a module variable that the scenes read
 * while building; switching remounts the 3D canvas (see App).
 *
 * 3D: the tilted landscape and the round globe.
 * 2D: a flat map seen from straight above (heights flattened, cards laid out in depth),
 *     and an equirectangular world map instead of the globe.
 */
export type Dim = '2d' | '3d';

export let FLAT = false;

const LANES_3D = { ...LANES };
/**
 * 2D is drawn as a poster (scene/Poster2D.tsx), with its own rows; these values aim the camera
 * at them when an item is focused (see focus.ts) and bound the panning.
 */
const LANES_2D = { ...LANES, axis: 12, tradStrip: 5, sovereignty: 0.2, sovereigntyRow1: 2.9, river: -10, history: -22, rabbinic: 3.2, people: 19, eraLabels: -70 };

export function setFlat(flat: boolean) {
  FLAT = flat;
  Object.assign(LANES, flat ? LANES_2D : LANES_3D);
}

export function initialDim(): Dim {
  const fromHash = new URLSearchParams(location.hash.slice(1)).get('dim');
  if (fromHash === '2d' || fromHash === '3d') return fromHash;
  return localStorage.getItem('jhm-dim') === '2d' ? '2d' : '3d';
}

/** Coarse pointer (phone / tablet): enables touch-only conveniences. */
export const isTouch = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
