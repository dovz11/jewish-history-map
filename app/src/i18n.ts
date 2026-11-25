import type { Lang, Localized } from './data/types';
import { setTimeDirection } from './lib/timeScale';

/**
 * Minimal i18n. The current language lives in a module variable; switching
 * language remounts the whole app (see main.tsx), so pure helpers can read it
 * directly without subscribing.
 */
export let lang: Lang = initialLang();

function initialLang(): Lang {
  const fromHash = new URLSearchParams(location.hash.slice(1)).get('lang');
  if (fromHash === 'en' || fromHash === 'he') return fromHash;
  const saved = localStorage.getItem('jhm-lang');
  if (saved === 'en' || saved === 'he') return saved;
  return 'he';
}

export function applyLang(l: Lang) {
  lang = l;
  localStorage.setItem('jhm-lang', l);
  document.documentElement.lang = l;
  document.documentElement.dir = l === 'he' ? 'rtl' : 'ltr';
  document.title = t('docTitle');
  // Hebrew reads right-to-left: the past sits on the right. English: on the left.
  setTimeDirection(l === 'he' ? -1 : 1);
}

/** Pick the text for the current language, falling back to Hebrew. */
export const L = (x: Localized | undefined) => (x ? (lang === 'en' ? x.en ?? x.he : x.he) : '');

const STRINGS = {
  docTitle: { he: 'ציר הזמן היהודי בתלת־ממד', en: 'Jewish History in 3D' },
  appTitle: { he: 'ציר הזמן היהודי', en: 'Jewish History' },
  appSub: { he: 'בתלת־ממד', en: 'in 3D' },
  search: { he: 'חיפוש אירוע, שלטון או שנה…', en: 'Search events, rulers, years…' },
  searchLabel: { he: 'חיפוש', en: 'Search' },
  viewLabel: { he: 'תצוגה', en: 'View' },
  viewTimeline: { he: 'ציר זמן', en: 'Timeline' },
  viewTimelineTip: { he: 'ציר הזמן התלת־ממדי', en: 'The 3D timeline' },
  viewGlobe: { he: '🌍 גלובוס', en: '🌍 Globe' },
  viewGlobeTip: { he: 'מפת העולם: קהילות ונדידות לאורך הזמן', en: 'World map: communities and migrations through time' },
  datingLabel: { he: 'שיטת תיארוך', en: 'Dating system' },
  modeAcad: { he: 'מחקרי', en: 'Academic' },
  modeAcadTip: { he: 'תיארוך לפי המחקר ההיסטורי והארכאולוגי', en: 'Dates according to historical and archaeological scholarship' },
  modeTrad: { he: 'מסורתי', en: 'Traditional' },
  modeTradTip: { he: 'תיארוך לפי המסורת (סדר עולם והלוח העברי)', en: 'Dates according to tradition (Seder Olam and the Hebrew calendar)' },
  modeBoth: { he: 'שניהם', en: 'Both' },
  modeBothTip: { he: 'מחקרי, ולצידו הגרסה המסורתית כצל מקווקו', en: 'Academic, with the traditional date shown as a dashed ghost' },
  layers: { he: 'שכבות', en: 'Layers' },
  laneHistory: { he: 'אירועים', en: 'Events' },
  laneDemography: { he: 'דמוגרפיה', en: 'Demography' },
  laneSovereignty: { he: 'שלטון', en: 'Rule' },
  laneEras: { he: 'תקופות', en: 'Eras' },
  laneRabbinic: { he: 'תקופות ההלכה', en: 'Rabbinic eras' },
  lanePeople: { he: 'אישים', en: 'People' },
  laneTitlePeople: { he: 'אישים ותקופות ההלכה', en: 'People and rabbinic eras' },
  rabbinicEra: { he: 'תקופת ההלכה', en: 'Rabbinic era' },
  rabbinicThen: { he: 'תקופת ההלכה', en: 'Rabbinic era' },
  peopleInEra: { he: 'אישים בתקופה זו', en: 'People of this period' },
  lifespan: { he: 'שנות חיים', en: 'Lived' },
  prevPerson: { he: 'האישיות הקודמת', en: 'Previous person' },
  nextPerson: { he: 'האישיות הבאה', en: 'Next person' },
  peopleSection: { he: 'אישים', en: 'People' },
  list: { he: '☰ רשימה', en: '☰ List' },
  listTip: { he: 'רשימה כרונולוגית של כל הפריטים', en: 'Chronological list of all items' },
  help: { he: 'עזרה', en: 'Help' },
  close: { he: 'סגירה', en: 'Close' },
  loading: { he: 'טוען…', en: 'Loading…' },
  noWebgl: { he: 'הדפדפן שלכם אינו תומך בתלת־ממד (WebGL), ולכן מוצגת רשימה כרונולוגית.', en: 'Your browser does not support 3D (WebGL), so a chronological list is shown instead.' },
  notFound: { he: 'הפריט לא נמצא.', en: 'Item not found.' },
  // panel
  jewishRule: { he: 'ריבונות או שלטון עצמי יהודי', en: 'Jewish sovereignty or self-rule' },
  ruleOfLand: { he: 'שלטון בארץ ישראל', en: 'Rule over the Land of Israel' },
  eventsInPeriod: { he: 'אירועים בתקופה זו', en: 'Events in this period' },
  era: { he: 'תקופה', en: 'Era' },
  demography: { he: 'דמוגרפיה', en: 'Demography' },
  popTitle: { he: 'האוכלוסייה היהודית בשנת', en: 'Jewish population in' },
  popRange: { he: 'טווח ההערכות', en: 'Range of estimates' },
  inIsrael: { he: 'בארץ ישראל', en: 'In the Land of Israel' },
  source: { he: 'מקור', en: 'Source' },
  popCaveat: {
    he: 'ההערכות לעת העתיקה ולימי הביניים הן גסות מאוד, והחוקרים חלוקים בהן. הנתונים מהמאה ה-19 ואילך מבוססים על מפקדים ועל הערכות דמוגרפיות (רופין, דלה־פרגולה).',
    en: 'Ancient and medieval figures are rough estimates and scholars differ widely. Figures from the 19th century on rest on censuses and demographic estimates (Ruppin, DellaPergola).',
  },
  prevPoint: { he: 'נקודה קודמת', en: 'Previous point' },
  nextPoint: { he: 'נקודה הבאה', en: 'Next point' },
  prevEvent: { he: 'האירוע הקודם', en: 'Previous event' },
  nextEvent: { he: 'האירוע הבא', en: 'Next event' },
  dateAcad: { he: 'תיארוך מחקרי', en: 'Academic date' },
  date: { he: 'תאריך', en: 'Date' },
  dateTrad: { he: 'לפי המסורת', en: 'By tradition' },
  noAcadDate: { he: 'אין תיארוך מחקרי לאירוע זה.', en: 'There is no academic date for this event.' },
  fromWikipedia: { he: 'מתוך ויקיפדיה, הערך', en: 'From Wikipedia, the article' },
  license: { he: 'ברישיון CC BY-SA', en: 'licensed CC BY-SA' },
  toWikipedia: { he: 'לערך בוויקיפדיה ↗', en: 'Read on Wikipedia ↗' },
  otherWikipedia: { he: 'English Wikipedia ↗', en: 'ויקיפדיה בעברית ↗' },
  atThatTime: { he: 'באותה עת', en: 'At that time' },
  rulerThen: { he: 'השלטון בארץ ישראל', en: 'Ruling the Land of Israel' },
  jewsWorld: { he: 'יהודים בעולם', en: 'Jews worldwide' },
  showGlobe: { he: '🌍 הצגה על הגלובוס', en: '🌍 Show on the globe' },
  showTimeline: { he: '↔ הצגה בציר הזמן', en: '↔ Show on the timeline' },
  approxShort: { he: 'כ-', en: 'c. ' },
  // legend & lanes
  legendWorld: { he: 'יהודים בעולם', en: 'Jews worldwide' },
  legendIsrael: { he: 'בארץ ישראל', en: 'In the Land of Israel' },
  legendJewishRule: { he: 'שלטון יהודי', en: 'Jewish rule' },
  legendTrad: { he: 'תיארוך מסורתי', en: 'Traditional dating' },
  laneTitleHistory: { he: 'אירועים', en: 'Events' },
  laneTitlePop: { he: 'אוכלוסיית העם היהודי', en: 'Jewish population' },
  laneTitleRule: { he: 'שלטון בארץ ישראל', en: 'Rule over the Land of Israel' },
  laneTitleRuleTrad: { he: 'שלטון — לפי התיארוך המסורתי', en: 'Rule — traditional dating' },
  tradPrefix: { he: 'מסורת', en: 'Tradition' },
  tradOnly: { he: 'לפי המסורת', en: 'By tradition' },
  tradDatingPrefix: { he: 'תיארוך מסורתי', en: 'Traditional dating' },
  jewsInWorld: { he: 'יהודים בעולם', en: 'Jews worldwide' },
  // list
  chronoList: { he: 'רשימה כרונולוגית', en: 'Chronological list' },
  // globe
  globeTime: { he: 'שליטה בזמן בגלובוס', en: 'Globe time controls' },
  play: { he: 'נסיעה בזמן', en: 'Travel through time' },
  pause: { he: 'עצירה', en: 'Pause' },
  year: { he: 'שנה', en: 'Year' },
  activeCenters: { he: 'מרכזים יהודיים פעילים', en: 'active Jewish centers' },
  minimap: { he: 'מפת ציר הזמן', en: 'Timeline overview' },
  langSwitch: { he: 'English', en: 'עברית' },
  langSwitchTip: { he: 'Switch to English', en: 'מעבר לעברית' },
  start: { he: 'יוצאים לדרך', en: "Let's go" },
  // mobile & map buttons
  menu: { he: 'תפריט', en: 'Menu' },
  dimLabel: { he: 'דו־ממד או תלת־ממד', en: '2D or 3D' },
  dim2d: { he: '2D', en: '2D' },
  dim3d: { he: '3D', en: '3D' },
  dim2dTip: { he: 'מבט מלמעלה, כמו מפה', en: 'Flat, seen from above like a map' },
  dim3dTip: { he: 'נוף תלת־ממדי', en: '3D landscape' },
  compass: { he: 'איפוס הכיוון וההטיה', en: 'Reset heading and tilt' },
  home: { he: 'מבט על הכול', en: 'Show everything' },
  fullscreen: { he: 'מסך מלא', en: 'Full screen' },
  sheetHandle: { he: 'גררו כדי להגדיל או להקטין', en: 'Drag to resize' },
  dating: { he: 'תיארוך', en: 'Dating' },
} satisfies Record<string, { he: string; en: string }>;

export type StringKey = keyof typeof STRINGS;
export const t = (k: StringKey) => STRINGS[k][lang];

// apply the initial language (needs the string table above)
applyLang(lang);
