/**
 * Piecewise-linear time scale: maps a year to a distance `u` along the corridor.
 * Early millennia are compressed, recent centuries (dense with events) are expanded.
 *
 * Scene x = DIR * u. Hebrew reads right-to-left, so the past is on the right
 * and time flows leftwards (DIR = -1); in English DIR = +1.
 */
const BREAKS: [year: number, u: number][] = [
  [-3800, 0],
  [-2000, 50],
  [-1300, 100],
  [-1000, 132],
  [-500, 184],
  [0, 244],
  [500, 292],
  [1000, 340],
  [1500, 402],
  [1800, 462],
  [1880, 502],
  [1950, 566],
  [2030, 604],
];

export const YEAR_MIN = BREAKS[0][0];
export const YEAR_MAX = BREAKS[BREAKS.length - 1][0];
export const U_MAX = BREAKS[BREAKS.length - 1][1];

/** -1: time flows right-to-left (Hebrew); +1: left-to-right (English). Set by i18n before first render. */
export let DIR: 1 | -1 = -1;
export function setTimeDirection(d: 1 | -1) {
  DIR = d;
}

export function yearToU(year: number): number {
  if (year <= BREAKS[0][0]) return BREAKS[0][1];
  for (let i = 1; i < BREAKS.length; i++) {
    const [y1, u1] = BREAKS[i];
    if (year <= y1) {
      const [y0, u0] = BREAKS[i - 1];
      return u0 + ((year - y0) / (y1 - y0)) * (u1 - u0);
    }
  }
  return U_MAX;
}

export function uToYear(u: number): number {
  if (u <= 0) return YEAR_MIN;
  for (let i = 1; i < BREAKS.length; i++) {
    const [y1, u1] = BREAKS[i];
    if (u <= u1) {
      const [y0, u0] = BREAKS[i - 1];
      return y0 + ((u - u0) / (u1 - u0)) * (y1 - y0);
    }
  }
  return YEAR_MAX;
}

export const yearToX = (year: number) => DIR * yearToU(year);
export const xToYear = (x: number) => uToYear(x / DIR);

/** Scene z positions of the lanes (camera looks from +z towards -z). Spread further apart in 2D, see dim.ts. */
export const LANES = {
  axis: 13,
  tradStrip: 10.2,
  sovereignty: 7.5,
  sovereigntyRow1: 4.6,
  river: -3,
  history: -12,
  /** rabbinic-era arches, with the personalities standing beneath them */
  rabbinic: -20,
  people: -20,
  eraLabels: -30,
};

/** Nice tick years for the time axis, denser where the scale is expanded. */
export function tickYears(): number[] {
  const t: number[] = [];
  for (let y = -3500; y < -1000; y += 500) t.push(y);
  for (let y = -1000; y < 0; y += 100) t.push(y);
  for (let y = 100; y <= 1800; y += 100) t.push(y);
  for (let y = 1825; y <= 2025; y += 25) t.push(y);
  return t;
}
