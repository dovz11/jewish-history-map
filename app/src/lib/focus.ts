import type { ItemRef } from '../data/types';
import { useStore } from '../store';
import { eraById, eventById, mainSpan, navOrder, rulerById } from './data';
import { LANES, yearToX } from './timeScale';

/** Select an item and fly the camera to it. */
export function focusItem(ref: ItemRef) {
  const st = useStore.getState();
  const mode = st.mode;
  st.select(ref);
  if (ref.type === 'event') {
    const e = eventById.get(ref.id);
    if (!e) return;
    if (!st.lanes.history) st.toggleLane('history');
    st.flyTo(yearToX(mainSpan(e.dating, mode).start), { z: LANES.history + 4, dist: 34 });
  } else if (ref.type === 'ruler') {
    const r = rulerById.get(ref.id);
    if (!r) return;
    if (!st.lanes.sovereignty) st.toggleLane('sovereignty');
    const s = mainSpan(r.dating, mode);
    const x0 = yearToX(s.start), x1 = yearToX(s.end ?? s.start);
    st.flyTo((x0 + x1) / 2, { z: LANES.sovereignty, dist: Math.min(140, Math.max(28, Math.abs(x1 - x0) * 1.1)) });
  } else if (ref.type === 'era') {
    const era = eraById.get(ref.id);
    if (!era) return;
    const s = mainSpan(era.dating, mode);
    const x0 = yearToX(s.start), x1 = yearToX(s.end!);
    st.flyTo((x0 + x1) / 2, { z: -6, dist: Math.min(230, Math.max(50, Math.abs(x1 - x0))) });
  } else {
    if (!st.lanes.demography) st.toggleLane('demography');
    st.flyTo(yearToX(ref.year), { z: LANES.river, dist: 30 });
  }
}

/** Step to the chronologically next / previous event. */
export function stepEvent(delta: 1 | -1) {
  const st = useStore.getState();
  const order = navOrder(st.mode);
  const sel = st.selected;
  let i = sel?.type === 'event' ? order.findIndex((r) => r.type === 'event' && r.id === sel.id) : -1;
  if (i === -1) {
    // start from the event nearest the current view center
    const viewX = st.viewX;
    let best = 0, bestD = Infinity;
    order.forEach((r, k) => {
      const e = eventById.get((r as { id: string }).id)!;
      const d = Math.abs(yearToX(mainSpan(e.dating, st.mode).start) - viewX);
      if (d < bestD) { bestD = d; best = k; }
    });
    i = best - delta;
  }
  const next = order[Math.max(0, Math.min(order.length - 1, i + delta))];
  focusItem(next);
}
