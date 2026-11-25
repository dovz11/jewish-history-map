import { popTotal, POP_FROM, POP_TO } from './data';

/**
 * Layout of the 2D poster (scene/Poster2D.tsx): z of each row's center; smaller z is higher on screen.
 * Shared with focus.ts, so the camera aims where things actually are.
 */
export const POSTER_Z = {
  axis: 12,
  era: 10,
  rabbinic: 7.2,
  trad: 5,
  rule1: 2.9,
  rule: 0.2,
  popBase: -1.8,
  /** first row of people, below the axis labels; further rows go down the sheet */
  peopleFrom: 17.5,
};

/** Scene units per million people in the population chart. */
export const POP_K = 1.4;

/** Top edge (z) of the population chart at a year (its baseline outside the data). */
export const chartTopAt = (year: number) =>
  year >= POP_FROM && year <= POP_TO ? POSTER_Z.popBase - POP_K * popTotal(year) : POSTER_Z.popBase;
