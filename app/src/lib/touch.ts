/**
 * Google Earth–style touch gestures on top of the regular camera controls.
 *
 *  - one finger drag ............. pan (handled by the camera controls themselves)
 *  - two fingers: pinch .......... zoom around the fingers
 *  - two fingers: twist .......... turn the view
 *  - two fingers: slide up/down .. tilt
 *  - double tap .................. zoom in on that point
 *  - double tap, hold and drag ... drag down to zoom in, up to zoom out
 *  - two-finger tap .............. zoom out
 *
 * The recogniser only reports gestures; each scene decides what they do to its camera.
 */
export interface TwoFingerMove {
  /** centroid, client pixels */
  x: number;
  y: number;
  /** incremental: ratio of finger distance (>1 = spreading), rotation in radians (screen, clockwise positive), centroid shift */
  scale: number;
  rotate: number;
  dx: number;
  dy: number;
}

export interface GestureHandlers {
  /** called when a gesture takes over, so the scene can pause its own controls */
  lock?(locked: boolean): void;
  twoStart?(x: number, y: number): void;
  /** pinch / twist / pan */
  twoMove?(m: TwoFingerMove): void;
  /** two fingers sliding together vertically: dy in pixels (negative = up) */
  tilt?(dy: number): void;
  twoEnd?(): void;
  doubleTap?(x: number, y: number): void;
  twoFingerTap?(x: number, y: number): void;
  /** total zoom factor since the drag began (>1 = zoom in), anchored where the second tap landed */
  quickZoom?(factor: number, x: number, y: number, phase: 'start' | 'move' | 'end'): void;
}

const TAP_MS = 260;
const DOUBLE_MS = 320;
const TAP_SLOP = 12;

interface P { x: number; y: number; x0: number; y0: number; t0: number }

/** Last time a double tap or quick zoom happened (lets single-tap actions wait and cancel). */
export let lastMultiTapAt = 0;

export function attachGestures(el: HTMLElement, h: GestureHandlers): () => void {
  const pts = new Map<number, P>();
  let lastTap: { x: number; y: number; t: number } | null = null;
  // quick zoom (double tap + drag)
  let qz: { id: number; x: number; y: number; moved: boolean } | null = null;
  // two-finger gesture
  let two: { mode: 'undecided' | 'map' | 'tilt'; t0: number; moved: boolean; prev: { x: number; y: number; d: number; a: number }; acc: number } | null = null;
  let multi = false; // more than one finger has been down since the first touch
  let lastTouchAt = -1e9;

  const geom = () => {
    const [a, b] = [...pts.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(b.x - a.x, b.y - a.y), a: Math.atan2(b.y - a.y, b.x - a.x) };
  };

  const down = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    lastTouchAt = e.timeStamp;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: e.timeStamp });
    if (pts.size === 1) {
      multi = false;
      if (lastTap && e.timeStamp - lastTap.t < DOUBLE_MS && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 40) {
        // second tap of a double tap: hold the camera still until we know whether it drags
        qz = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
        lastMultiTapAt = e.timeStamp;
        h.lock?.(true);
      }
    } else if (pts.size === 2) {
      multi = true;
      if (qz) { h.quickZoom?.(1, qz.x, qz.y, 'end'); qz = null; }
      const g = geom();
      two = { mode: 'undecided', t0: e.timeStamp, moved: false, prev: g, acc: 0 };
      // scenes that leave pinching to their own controls only want to hear about two-finger taps
      if (h.twoMove) h.lock?.(true);
      h.twoStart?.(g.x, g.y);
    } else if (two) {
      // a third finger: leave it to the controls
      h.twoEnd?.();
      two = null;
    }
  };

  const move = (e: PointerEvent) => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;
    if (qz && qz.id === e.pointerId) {
      const dy = e.clientY - qz.y;
      if (!qz.moved && Math.abs(dy) > TAP_SLOP) { qz.moved = true; h.quickZoom?.(1, qz.x, qz.y, 'start'); }
      if (qz.moved) h.quickZoom?.(Math.exp(dy * 0.012), qz.x, qz.y, 'move');
      return;
    }
    if (two && pts.size === 2) {
      const g = geom();
      const m: TwoFingerMove = { x: g.x, y: g.y, scale: g.d / Math.max(1, two.prev.d), rotate: angleDiff(g.a, two.prev.a), dx: g.x - two.prev.x, dy: g.y - two.prev.y };
      two.acc += Math.hypot(m.dx, m.dy) + Math.abs(g.d - two.prev.d);
      if (two.acc > TAP_SLOP) two.moved = true;
      if (two.mode === 'undecided' && two.acc > 14) {
        // tilt when both fingers slide the same way vertically while keeping their distance
        const [a, b] = [...pts.values()];
        const dyA = a.y - a.y0, dyB = b.y - b.y0, dxA = a.x - a.x0, dxB = b.x - b.x0;
        const parallel = Math.sign(dyA) === Math.sign(dyB) && Math.abs(dyA) > Math.abs(dxA) * 1.4 && Math.abs(dyB) > Math.abs(dxB) * 1.4;
        const spread = Math.abs(g.d - Math.hypot(b.x0 - a.x0, b.y0 - a.y0));
        two.mode = parallel && spread < 18 && h.tilt ? 'tilt' : 'map';
      }
      if (two.mode === 'tilt') h.tilt?.(m.dy);
      else if (two.mode === 'map') h.twoMove?.(m);
      two.prev = g;
    }
  };

  const up = (e: PointerEvent) => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    const wasTwo = two;
    if (qz && qz.id === e.pointerId) {
      if (qz.moved) h.quickZoom?.(1, qz.x, qz.y, 'end');
      else h.doubleTap?.(e.clientX, e.clientY);
      h.lock?.(false);
      qz = null;
      lastTap = null;
    } else if (!multi && pts.size === 1 && e.timeStamp - p.t0 < TAP_MS && Math.hypot(p.x - p.x0, p.y - p.y0) < TAP_SLOP) {
      lastTap = { x: p.x, y: p.y, t: e.timeStamp };
    } else lastTap = null;
    if (wasTwo) {
      if (!wasTwo.moved && e.timeStamp - wasTwo.t0 < TAP_MS + 80 && pts.size === 2) {
        const g = geom();
        lastMultiTapAt = e.timeStamp;
        h.twoFingerTap?.(g.x, g.y);
      }
      h.twoEnd?.();
      if (h.twoMove) h.lock?.(false);
      two = null;
    }
    pts.delete(e.pointerId);
  };

  // mouse: a double click zooms in, as on Google Earth on the web
  const dbl = (e: MouseEvent) => {
    // some mobile browsers also synthesize dblclick from a double tap: that one is handled above
    if (e.timeStamp - lastTouchAt < 1000) return;
    lastMultiTapAt = e.timeStamp;
    h.doubleTap?.(e.clientX, e.clientY);
  };

  el.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
  el.addEventListener('dblclick', dbl);
  return () => {
    el.removeEventListener('pointerdown', down);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    el.removeEventListener('dblclick', dbl);
  };
}

function angleDiff(a: number, b: number) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}
