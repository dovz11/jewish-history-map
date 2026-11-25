import { create } from 'zustand';
import type { DateMode, ItemRef, Lang } from './data/types';
import { applyLang, lang as initialLang } from './i18n';

export type LaneKey = 'history' | 'demography' | 'sovereignty' | 'eras';
export type ViewKind = 'timeline' | 'globe';

export interface FlyRequest {
  /** scene x to center on */
  x: number;
  /** scene z to look at */
  z?: number;
  /** camera distance */
  dist?: number;
  nonce: number;
}

interface State {
  mode: DateMode;
  lanes: Record<LaneKey, boolean>;
  selected: ItemRef | null;
  hoverText: string | null;
  /** year at the center of the view, and the visible half-width in scene units */
  viewX: number;
  viewHalfWidth: number;
  fly: FlyRequest | null;
  listOpen: boolean;
  helpOpen: boolean;
  view: ViewKind;
  /** the year shown on the globe */
  globeYear: number;
  /** place the globe should turn towards */
  globeFocus: { place: string; nonce: number } | null;
  playing: boolean;
  lang: Lang;

  setMode(m: DateMode): void;
  toggleLane(l: LaneKey): void;
  select(ref: ItemRef | null): void;
  setHover(t: string | null): void;
  setView(x: number, halfWidth: number): void;
  flyTo(x: number, opts?: { z?: number; dist?: number }): void;
  setListOpen(v: boolean): void;
  setHelpOpen(v: boolean): void;
  setViewKind(v: ViewKind): void;
  setGlobeYear(y: number): void;
  focusPlace(place: string): void;
  setPlaying(v: boolean): void;
  /** switch language: flips the time direction and remounts the app */
  setLang(l: Lang): void;
}

let nonce = 0;

export const useStore = create<State>((set) => ({
  mode: 'both',
  lanes: { history: true, demography: true, sovereignty: true, eras: true },
  selected: null,
  hoverText: null,
  viewX: 0,
  viewHalfWidth: 100,
  fly: null,
  listOpen: false,
  helpOpen: false,
  view: 'timeline',
  globeYear: -586,
  globeFocus: null,
  playing: false,
  lang: initialLang,

  setMode: (mode) => set({ mode }),
  toggleLane: (l) => set((s) => ({ lanes: { ...s.lanes, [l]: !s.lanes[l] } })),
  select: (selected) => set({ selected }),
  setHover: (hoverText) => set({ hoverText }),
  setView: (viewX, viewHalfWidth) => set({ viewX, viewHalfWidth }),
  flyTo: (x, opts) => set({ fly: { x, ...opts, nonce: ++nonce } }),
  setListOpen: (listOpen) => set({ listOpen }),
  setHelpOpen: (helpOpen) => set({ helpOpen }),
  setViewKind: (view) => set({ view, playing: false }),
  setGlobeYear: (globeYear) => set({ globeYear }),
  focusPlace: (place) => set({ globeFocus: { place, nonce: ++nonce } }),
  setPlaying: (playing) => set({ playing }),
  setLang: (l) => {
    applyLang(l);
    set({ lang: l, hoverText: null, fly: null });
  },
}));

export const sameRef = (a: ItemRef | null, b: ItemRef | null) =>
  !!a && !!b && a.type === b.type && ('id' in a ? a.id === (b as { id: string }).id : a.year === (b as { year: number }).year);
