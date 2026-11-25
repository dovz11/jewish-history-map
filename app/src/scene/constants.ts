import type { HistoryEvent, Person } from '../data/types';

// Absolute URLs: troika parses fonts in a web worker, where relative URLs would not resolve.
const abs = (p: string) => new URL(`${import.meta.env.BASE_URL}${p}`, location.href).href;
export const FONT_REGULAR = abs('fonts/Heebo-Regular.ttf');
export const FONT_BOLD = abs('fonts/Heebo-Bold.ttf');
export const FONT_BLACK = abs('fonts/Heebo-Black.ttf');

export const COLORS = {
  ground: '#efe6d2',
  background: '#f4eee0',
  ink: '#2b2418',
  inkSoft: '#6b5d45',
  card: '#fffaf0',
  selected: '#e0a526',
  trad: '#9a7b4f',
  river: '#3d78b8',
  riverIsrael: '#e0b13a',
  riverRange: '#9cc0e6',
};

/** The 2D poster: a clean print look (see Poster2D.tsx). */
export const POSTER = {
  paper: '#fdfcf8',
  ink: '#1e1e22',
  inkSoft: '#6a6a72',
  rule: '#45454d',
  grid: '#dedcd6',
  leader: '#b9b7b0',
  highlight: '#ffe58a',
  selected: '#d6452f',
  trad: '#9a6b2f',
  world: '#f3a43b',
  worldRange: '#fbd9a8',
  israel: '#2f6fd6',
  kind: {
    biblical: '#a0612f', political: '#2f6fd6', catastrophe: '#d6452f', religious: '#8a4fbf',
    migration: '#12a38a', cultural: '#e88a1a', war: '#5f6b78', zionism: '#1c8fd6',
  } as Record<HistoryEvent['kind'], string>,
  category: {
    sage: '#3f9a45', rabbi: '#3566cc', thinker: '#1f97ab', poet: '#e7802a', mystic: '#9150c4', leader: '#cf3d33', writer: '#b98a12',
  } as Record<Person['category'], string>,
  /** pastel cells for the rule row, poster style */
  power: {
    egypt: '#f7d38c', israel: '#9dbcf2', mesopotamia: '#e9bf9b', persia: '#a8dcc8', greek: '#bcd5f2',
    rome: '#b7deb2', arab: '#f6df8f', crusader: '#f4b3a8', ottoman: '#f8c690', british: '#cfd0dc',
  } as Record<string, string>,
};

