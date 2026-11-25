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
