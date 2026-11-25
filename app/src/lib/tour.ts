import { create } from 'zustand';
import { useStore } from '../store';
import { events, mainSpan } from './data';
import type { Dim } from './dim';
import { yearToX } from './timeScale';

/**
 * The guided tour: the camera flies along the timeline from the oldest events to today and stops
 * at the main ones, each shown on a card with its picture. The camera itself is moved by
 * scene/TourDriver.tsx; the card, the year counter and the controls are in ui/Tour.tsx.
 */

export type TourLength = 'short' | 'full';
export interface Stop { id: string; year: number; x: number }
export type TourPhase = 'travel' | 'stay' | 'end';

/** Seconds the camera stays at each stop (at 1× speed). */
export const STAY_SECONDS = 6.5;

/** Short: the pivotal events (importance 5). Full: also the major ones (4). In time order. */
export function buildStops(length: TourLength): Stop[] {
  const mode = useStore.getState().mode;
  const min = length === 'short' ? 5 : 4;
  return events
    .filter((e) => e.importance >= min)
    .map((e) => {
      const year = mainSpan(e.dating, mode).start;
      return { id: e.id, year, x: yearToX(year) };
    })
    .sort((a, b) => a.year - b.year);
}

interface TourState {
  active: boolean;
  paused: boolean;
  speed: 1 | 2;
  length: TourLength;
  stops: Stop[];
  /** the stop the camera is flying to or staying at */
  i: number;
  phase: TourPhase;
  /** the stop whose card is shown (it appears just before the camera arrives) */
  card: number | null;
  /** furthest stop reached, for the statistics */
  reached: number;
  /** bumped on every move the driver must start afresh (new leg, resume, jump) */
  seq: number;
  /** what to return to when the tour ends */
  prevDim: Dim | null;
}

export const useTour = create<TourState>(() => ({
  active: false,
  paused: false,
  speed: 1,
  length: 'short',
  stops: [],
  i: 0,
  phase: 'travel',
  card: null,
  reached: -1,
  seq: 0,
  prevDim: null,
}));

const bump = () => useTour.getState().seq + 1;

export function startTour(length: TourLength = useTour.getState().length) {
  const st = useStore.getState();
  const prevDim = useTour.getState().active ? useTour.getState().prevDim : st.dim;
  st.select(null);
  st.setHelpOpen(false);
  st.setListOpen(false);
  st.setChrome(true);
  if (st.view !== 'timeline') st.setViewKind('timeline');
  // the tour flies over the poster lifted up: the 3D view shows the most along the way
  if (st.dim !== '3d') {
    st.setDim('3d');
    // a tour is not a choice of view: keep the visitor's own preference for next time
    if (prevDim) localStorage.setItem('jhm-dim', prevDim);
  }
  useTour.setState({
    active: true, paused: false, length, stops: buildStops(length),
    i: 0, phase: 'travel', card: null, reached: -1, seq: bump(), prevDim,
  });
}

export function exitTour() {
  const { active, prevDim } = useTour.getState();
  if (!active) return;
  useTour.setState({ active: false, paused: false, card: null, seq: bump() });
  if (prevDim && prevDim !== useStore.getState().dim) useStore.getState().setDim(prevDim);
}

/** Fly to a stop (and stay there). */
export function goToStop(i: number) {
  const { stops } = useTour.getState();
  const n = Math.max(0, Math.min(stops.length - 1, i));
  useStore.getState().select(null);
  useTour.setState({ i: n, phase: 'travel', paused: false, card: null, seq: bump() });
}

export const nextStop = () => {
  const { i, stops, phase } = useTour.getState();
  if (phase === 'end') return;
  if (i >= stops.length - 1) finishTour();
  else goToStop(phase === 'travel' ? i : i + 1);
};
export const prevStop = () => {
  const { i, phase } = useTour.getState();
  goToStop(phase === 'end' ? i : i - 1);
};

export function pauseTour() {
  const s = useTour.getState();
  if (s.active && !s.paused) useTour.setState({ paused: true });
}

/** Carry on from where the tour was: fly back to the current stop if the viewer moved away. */
export function resumeTour() {
  const s = useTour.getState();
  if (!s.active) return;
  useStore.getState().select(null);
  if (s.phase === 'end') { startTour(); return; }
  useTour.setState({ paused: false, phase: 'travel', seq: bump() });
}

export const togglePause = () => (useTour.getState().paused ? resumeTour() : pauseTour());

/** Change between the short and the full tour, keeping the place in time. */
export function setTourLength(length: TourLength) {
  const s = useTour.getState();
  if (length === s.length) return;
  const stops = buildStops(length);
  const year = s.stops[s.i]?.year ?? stops[0].year;
  let i = stops.findIndex((st) => st.year >= year);
  if (i === -1) i = stops.length - 1;
  useTour.setState({ length, stops, i, phase: 'travel', card: null, paused: false, seq: bump() });
}

export const setTourSpeed = (speed: 1 | 2) => useTour.setState({ speed });

/** Called by the driver when the camera reaches the stop. */
export function arrive() {
  const s = useTour.getState();
  useTour.setState({ phase: 'stay', card: s.i, reached: Math.max(s.reached, s.i), seq: bump() });
}

/** Called by the driver when the stay is over. */
export function leaveStop() {
  const s = useTour.getState();
  if (s.i >= s.stops.length - 1) finishTour();
  else useTour.setState({ i: s.i + 1, phase: 'travel', card: null, seq: bump() });
}

function finishTour() {
  const s = useTour.getState();
  useTour.setState({ phase: 'end', card: null, reached: s.stops.length - 1, seq: bump() });
}

/** Where the camera is in time right now (written by the driver every frame, read by the year counter). */
export const tourClock = { x: 0 };
