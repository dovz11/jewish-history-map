#!/usr/bin/env node
/**
 * Generates docs/content-review.md: a checklist for a subject-matter reviewer,
 * built from the data files so it always matches what the site shows.
 *
 * Usage:  node scripts/review-sheet.mjs
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const data = path.join(root, '..', 'src', 'data');
const outDir = path.join(root, '..', '..', 'docs');
const load = async (f) => JSON.parse(await readFile(path.join(data, f), 'utf8'));

const [events, rulers, population, eras] = await Promise.all(['events.json', 'rulers.json', 'population.json', 'eras.json'].map(load));
const REPO = 'https://github.com/dovz11/jewish-history-map';
const SITE = 'https://dovz11.github.io/jewish-history-map/';

const yr = (y) => (y < 0 ? `${-y} לפנה״ס` : `${y}`);
const span = (s) => (s ? `${s.approx ? 'בערך ' : ''}${yr(s.start)}${s.end !== undefined && s.end !== s.start ? `–${yr(s.end)}` : ''}` : '—');
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const wiki = (w) => (w?.he ? `[ויקיפדיה](https://he.wikipedia.org/wiki/${encodeURIComponent(w.he.replace(/ /g, '_'))})` : '');
const sorted = (arr) => arr.slice().sort((a, b) => (a.dating.acad ?? a.dating.trad).start - (b.dating.acad ?? b.dating.trad).start);

let md = `<div dir="rtl">

# בדיקת תוכן: ציר הזמן היהודי בתלת־ממד

גיליון זה נוצר אוטומטית מקובצי הנתונים (\`node scripts/review-sheet.mjs\`), ולכן הוא תמיד תואם את מה שמוצג [באתר](${SITE}).

## איך לבדוק

1. עברו על הטבלאות. לכל פריט בדקו את **התאריך המחקרי**, את **התאריך המסורתי** (כשהוא קיים), את **התקציר** ואת **הקישור לוויקיפדיה**.
2. פריט שהכול בו תקין: סמנו ☑ בעמודה הראשונה.
3. פריט שצריך תיקון: פתחו [דיווח על תיקון תוכן](${REPO}/issues/new?template=content-correction.yml), או ערכו את הקובץ ב-\`app/src/data/\` ישירות ב-GitHub.
4. לכל פריט יש קישור „באתר” שמראה אותו בתלת־ממד.

## נקודות שמבקשות תשומת לב מיוחדת

- **תיארוך מסורתי** (תקופת המקרא עד אלכסנדר): חושב לפי סדר עולם, ולפיו שנת 1 לבריאה היא 3761 לפנה״ס. האם ההמרות נכונות? האם יש מסורות חלופיות שראוי לציין?
- **תיארוך מחקרי לתקופת המקרא**: יציאת מצרים, הכניסה לארץ והממלכה המאוחדת מסומנים כ„בערך” או כשנויים במחלוקת. האם הניסוח מאוזן?
- **דמוגרפיה לפני 1800**: הערכות גסות מאוד. האם הטווחים (min–max) סבירים? האם המקורות מצוטטים נכון?
- **אירועים מהזמן האחרון** (1967, 1973, 7 באוקטובר): האם הניסוח עובדתי ומאוזן?
- **בחירת האירועים**: אילו אירועים חסרים? לדוגמה גניזת קהיר, הכוזרים, ליל הבדולח, הבריגדה היהודית, מבצע אנטבה. אילו כדאי להוריד?
- **ייצוג**: האם יש ייצוג הולם לתולדות יהדות ספרד והמזרח, לנשים ולתפוצות אחרי 1948?
- **השלטון בארץ ישראל**: גבולות התקופות והחפיפות (למשל הצלבנים, האיובים והממלוכים בשנים 1187–1291).

`;

md += `## אירועים (${events.length})\n\n| ✓ | אירוע | מחקרי | מסורתי | תקציר | קישורים |\n|---|---|---|---|---|---|\n`;
for (const e of sorted(events)) {
  md += `| ☐ | **${cell(e.title.he)}** | ${span(e.dating.acad)} | ${e.dating.trad ? span(e.dating.trad) : ''} | ${cell(e.summary.he)}${e.dating.note ? `<br><small>הערת תיארוך: ${cell(e.dating.note.he)}</small>` : ''} | ${wiki(e.wiki)} · [באתר](${SITE}#event=${e.id}) |\n`;
}

md += `\n## השלטון בארץ ישראל (${rulers.length})\n\n| ✓ | שלטון | מחקרי | מסורתי | תקציר | קישורים |\n|---|---|---|---|---|---|\n`;
for (const r of sorted(rulers)) {
  md += `| ☐ | **${cell(r.title.he)}**${r.jewish ? ' ✡' : ''} | ${span(r.dating.acad)} | ${r.dating.trad ? span(r.dating.trad) : ''} | ${cell(r.summary.he)} | ${wiki(r.wiki)} · [באתר](${SITE}#ruler=${r.id}) |\n`;
}

md += `\n## דמוגרפיה (${population.length} נקודות, במיליונים)\n\n| ✓ | שנה | יהודים בעולם | טווח | בארץ ישראל | הערה ומקור |\n|---|---|---|---|---|---|\n`;
for (const p of population) {
  md += `| ☐ | ${yr(p.year)} | ${p.total} | ${p.min !== undefined ? `${p.min}–${p.max}` : ''} | ${p.israel ?? ''} | ${cell(p.note?.he)}${p.source ? ` <small>(${cell(p.source)})</small>` : ''} |\n`;
}

md += `\n## תקופות (${eras.length})\n\n| ✓ | תקופה | מחקרי | מסורתי | קישור |\n|---|---|---|---|---|\n`;
for (const e of eras) md += `| ☐ | **${cell(e.title.he)}** | ${span(e.dating.acad)} | ${e.dating.trad ? span(e.dating.trad) : ''} | ${wiki(e.wiki)} |\n`;

md += `\n</div>\n`;
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'content-review.md'), md);
console.log(`docs/content-review.md: ${events.length} events, ${rulers.length} rulers, ${population.length} population points, ${eras.length} eras`);
