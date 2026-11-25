import type { ItemRef } from '../data/types';
import { useStore } from '../store';
import { eraById, eventById, mainSpan, navOrder, people, personById, personYear, rabbinicById, rulerById } from './data';
import { LANES, xToYear, yearToX } from './timeScale';
import { personPlaceAt } from './places';

/** Select an item and fly the camera to it. */
export function focusItem(ref: ItemRef) {
  const st = useStore.getState();
  const mode = st.mode;
  st.select(ref);
  if (st.view === 'globe') {
    focusOnGlobe(ref);
    return;
  }
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
  } else if (ref.type === 'person') {
    const p = personById.get(ref.id);
    if (!p) return;
    if (!st.lanes.people) st.toggleLane('people');
    st.flyTo(yearToX(personYear(p)), { z: LANES.people + 3, dist: 44 });
  } else if (ref.type === 'rabbinic') {
    const r = rabbinicById.get(ref.id);
    if (!r) return;
    if (!st.lanes.rabbinic) st.toggleLane('rabbinic');
    const s = mainSpan(r.dating, mode);
    const x0 = yearToX(s.start), x1 = yearToX(s.end ?? s.start);
    st.flyTo((x0 + x1) / 2, { z: LANES.rabbinic + 4, dist: Math.min(170, Math.max(40, Math.abs(x1 - x0) * 1.3)) });
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

/** On the globe: move the year to the item and turn towards its place. */
function focusOnGlobe(ref: ItemRef) {
  const st = useStore.getState();
  const mode = st.mode;
  st.setPlaying(false);
  if (ref.type === 'event') {
    const e = eventById.get(ref.id);
    if (!e) return;
    st.setGlobeYear(mainSpan(e.dating, mode).start);
    if (e.places?.length) st.focusPlace(e.places[0]);
  } else if (ref.type === 'ruler') {
    const r = rulerById.get(ref.id);
    if (r) st.setGlobeYear(mainSpan(r.dating, mode).start);
    st.focusPlace('jerusalem');
  } else if (ref.type === 'era') {
    const era = eraById.get(ref.id);
    if (era) st.setGlobeYear(mainSpan(era.dating, mode).start);
  } else if (ref.type === 'person') {
    const p = personById.get(ref.id);
    if (!p) return;
    const y = Math.round(personYear(p));
    st.setGlobeYear(y);
    if (p.places?.length) st.focusPlace(personPlaceAt(p, y));
  } else if (ref.type === 'rabbinic') {
    const r = rabbinicById.get(ref.id);
    if (r) st.setGlobeYear(mainSpan(r.dating, mode).start);
  } else {
    st.setGlobeYear(ref.year);
  }
}

/** Switch between the timeline and the globe, keeping the selected item in view. */
export function switchView(view: 'timeline' | 'globe') {
  const st = useStore.getState();
  if (view === st.view) return;
  if (view === 'globe' && !st.selected) {
    // carry the timeline position over as the globe year
    const y = Math.round(xToYear(st.viewX));
    st.setGlobeYear(Math.max(-1900, y));
  }
  st.setViewKind(view);
  if (st.selected) setTimeout(() => focusItem(st.selected!), 50);
}

/** Step to the chronologically next / previous person. */
export function stepPerson(delta: 1 | -1) {
  const sel = useStore.getState().selected;
  const i = sel?.type === 'person' ? people.findIndex((p) => p.id === sel.id) : -1;
  const next = people[Math.max(0, Math.min(people.length - 1, i === -1 ? 0 : i + delta))];
  focusItem({ type: 'person', id: next.id });
}
