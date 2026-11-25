import { popTotal, POP_FROM, POP_TO } from './data';
import { FLAT } from './dim';

/**
 * Layout of the poster (scene/Poster.tsx): z of each row's center; smaller z is higher on the
 * sheet. Shared with focus.ts and the camera, so they aim where things actually are.
 */
export const POSTER_Z = {
  axis: 12,
  era: 10,
  rabbinic: 7.2,
  trad: 5,
  rule1: 2.9,
  rule: 0.2,
  /** the hinge: the population chart's baseline. Everything above it is on the board. */
  popBase: -1.8,
  /** first row of people, below the axis labels; further rows go down the sheet */
  peopleFrom: 17.5,
  /** far edge of the board (2D z) */
  boardTop: -45,
};

/** Scene units per million people in the population chart. */
export const POP_K = 1.4;

/** Top edge (z, flat layout) of the population chart at a year (its baseline outside the data). */
export const chartTopAt = (year: number) =>
  year >= POP_FROM && year <= POP_TO ? POSTER_Z.popBase - POP_K * popTotal(year) : POSTER_Z.popBase;

/** How far the board swings up in 3D: not quite upright, leaning back like a poster on an easel. */
export const BOARD_TILT = Math.PI * 0.42;

/** Where each event label was placed on the board (flat-layout z), filled in by the poster. */
export const eventAnchorZ = new Map<string, number>();

/**
 * A point on the board, given by its flat-layout z: in 2D it lies on the floor; in 3D the board
 * stands up at the hinge, so the same point is that far up.
 */
export function boardPoint(z: number): { y: number; z: number } {
  if (FLAT) return { y: 0, z };
  const v = POSTER_Z.popBase - z; // distance up the board from the hinge
  return { y: Math.max(2, v * Math.sin(BOARD_TILT)), z: POSTER_Z.popBase - v * Math.cos(BOARD_TILT) + 0.5 };
}

/** Inverse of boardPoint in 3D: the flat-layout z of a point on the standing board at height y. */
export const boardZAtHeight = (y: number) => POSTER_Z.popBase - y / Math.sin(BOARD_TILT);
