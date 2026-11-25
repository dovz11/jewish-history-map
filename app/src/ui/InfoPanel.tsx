import type { Dating, ItemRef, WikiRef } from '../data/types';
import {
  datingsDiffer, eraById, eventById, events, isTradOnly, KIND_COLORS, KIND_LABELS, mainSpan, nearestPopPoint,
  popIsrael, popTotal, POP_FROM, POP_TO, population, POWER_COLORS, rulerById, rulers, wikiCache, wikiUrl,
} from '../lib/data';
import { formatAM, formatMillions, formatSpan, formatYear } from '../lib/dates';
import { focusItem, stepEvent } from '../lib/focus';
import { useStore } from '../store';
import { useWikiSummary } from './useWiki';

export function InfoPanel() {
  const selected = useStore((s) => s.selected);
  if (!selected) return null;
  return (
    <aside className="panel" aria-live="polite">
      <button className="panel-close" onClick={() => useStore.getState().select(null)} aria-label="סגירה">×</button>
      <PanelBody item={selected} />
    </aside>
  );
}

function PanelBody({ item }: { item: ItemRef }) {
  const mode = useStore((s) => s.mode);
  if (item.type === 'event') {
    const e = eventById.get(item.id);
    if (!e) return <p>הפריט לא נמצא.</p>;
    const year = mainSpan(e.dating, mode).start;
    return (
      <>
        <span className="badge" style={{ background: KIND_COLORS[e.kind] }}>{KIND_LABELS[e.kind]}</span>
        <h2>{e.title.he}</h2>
        <DatingBlock dating={e.dating} />
        <p className="summary">{e.summary.he}</p>
        <WikiBlock wiki={e.wiki} />
        <Context year={year} />
        <div className="nav-row">
          <button onClick={() => stepEvent(-1)}>→ האירוע הקודם</button>
          <button onClick={() => stepEvent(1)}>האירוע הבא ←</button>
        </div>
      </>
    );
  }
  if (item.type === 'ruler') {
    const r = rulerById.get(item.id);
    if (!r) return <p>הפריט לא נמצא.</p>;
    const s = mainSpan(r.dating, mode);
    const during = events.filter((e) => {
      const y = mainSpan(e.dating, mode).start;
      return y >= s.start && y <= (s.end ?? s.start);
    });
    return (
      <>
        <span className="badge" style={{ background: POWER_COLORS[r.power] }}>{r.jewish ? 'ריבונות או שלטון עצמי יהודי' : 'שלטון בארץ ישראל'}</span>
        <h2>{r.title.he}</h2>
        <DatingBlock dating={r.dating} />
        <p className="summary">{r.summary.he}</p>
        <WikiBlock wiki={r.wiki} />
        {during.length > 0 && (
          <section>
            <h3>אירועים בתקופה זו</h3>
            <ul className="links">
              {during.map((e) => (
                <li key={e.id}><button className="link" onClick={() => focusItem({ type: 'event', id: e.id })}>{e.title.he}</button> <small>{formatSpan(mainSpan(e.dating, mode))}</small></li>
              ))}
            </ul>
          </section>
        )}
      </>
    );
  }
  if (item.type === 'era') {
    const era = eraById.get(item.id);
    if (!era) return <p>הפריט לא נמצא.</p>;
    const s = mainSpan(era.dating, mode);
    const during = events.filter((e) => {
      const y = mainSpan(e.dating, mode).start;
      return y >= s.start && y < s.end!;
    });
    return (
      <>
        <span className="badge" style={{ background: '#7a6a4a' }}>תקופה</span>
        <h2>{era.title.he}</h2>
        <DatingBlock dating={era.dating} />
        <WikiBlock wiki={era.wiki} />
        <section>
          <h3>אירועים בתקופה</h3>
          <ul className="links">
            {during.map((e) => (
              <li key={e.id}><button className="link" onClick={() => focusItem({ type: 'event', id: e.id })}>{e.title.he}</button></li>
            ))}
          </ul>
        </section>
      </>
    );
  }
  // population point
  const p = population.find((x) => x.year === item.year) ?? nearestPopPoint(item.year);
  const idx = population.indexOf(p);
  return (
    <>
      <span className="badge" style={{ background: '#3d78b8' }}>דמוגרפיה</span>
      <h2>האוכלוסייה היהודית בשנת {formatYear(p.year)}</h2>
      <p className="big-number">כ-{formatMillions(p.total)}</p>
      {p.min !== undefined && p.max !== undefined && (
        <p>טווח ההערכות: {formatMillions(p.min)} – {formatMillions(p.max)}</p>
      )}
      {p.israel !== undefined && (
        <p>בארץ ישראל: כ-{formatMillions(p.israel)} ({Math.round((p.israel / p.total) * 100)}%)</p>
      )}
      {p.note && <p className="summary">{p.note.he}</p>}
      {p.source && <p className="muted">מקור: {p.source}</p>}
      <p className="muted">
        ההערכות לעת העתיקה ולימי הביניים הן גסות מאוד, והחוקרים חלוקים בהן. הנתונים מהמאה ה-19 ואילך מבוססים על מפקדים ועל הערכות דמוגרפיות (רופין, דלה־פרגולה).
      </p>
      <div className="wiki-links">
        <a className="wiki-link" href={wikiUrl('he', 'יהודים')} target="_blank" rel="noreferrer">הערך „יהודים” בוויקיפדיה ↗</a>
        <a className="wiki-link en" href={wikiUrl('en', 'Historical Jewish population')} target="_blank" rel="noreferrer" lang="en" dir="ltr">Historical Jewish population ↗</a>
      </div>
      <Context year={p.year} hidePop />
      <div className="nav-row">
        <button disabled={idx <= 0} onClick={() => focusItem({ type: 'pop', year: population[idx - 1].year })}>→ נקודה קודמת</button>
        <button disabled={idx >= population.length - 1} onClick={() => focusItem({ type: 'pop', year: population[idx + 1].year })}>נקודה הבאה ←</button>
      </div>
    </>
  );
}

function DatingBlock({ dating }: { dating: Dating }) {
  const tradOnly = isTradOnly(dating);
  const differ = datingsDiffer(dating);
  return (
    <div className="dating">
      {dating.acad && (
        <div className="date-row">
          <span className="date-label">{differ ? 'תיארוך מחקרי' : 'תאריך'}</span>
          <span className="date-value">{formatSpan(dating.acad)}</span>
          <span className="date-am">{formatAM(dating.acad)}</span>
        </div>
      )}
      {(differ || tradOnly) && dating.trad && (
        <div className="date-row trad">
          <span className="date-label">לפי המסורת</span>
          <span className="date-value">{formatSpan(dating.trad)}</span>
          <span className="date-am">{formatAM(dating.trad)}</span>
        </div>
      )}
      {tradOnly && <div className="muted">אין תיארוך מחקרי לאירוע זה.</div>}
      {dating.note && <p className="date-note">{dating.note.he}</p>}
    </div>
  );
}

function WikiBlock({ wiki }: { wiki: WikiRef }) {
  const summary = useWikiSummary(wiki.he);
  const en = wiki.en ?? (wiki.he ? wikiCache[wiki.he]?.en : undefined);
  return (
    <section className="wiki">
      {summary?.thumbnail && <img src={summary.thumbnail} alt={summary.title} loading="lazy" />}
      {summary?.extract && (
        <blockquote>
          {summary.extract}
          <footer>מתוך ויקיפדיה, הערך „{summary.title}”, ברישיון CC BY-SA</footer>
        </blockquote>
      )}
      <div className="wiki-links">
        {wiki.he && <a className="wiki-link" href={summary?.url ?? wikiUrl('he', wiki.he)} target="_blank" rel="noreferrer">לערך בוויקיפדיה ↗</a>}
        {en && <a className="wiki-link en" href={wikiUrl('en', en)} target="_blank" rel="noreferrer" lang="en" dir="ltr">English Wikipedia ↗</a>}
      </div>
    </section>
  );
}

/** Cross-lane context: who ruled the land and how many Jews lived at that time. */
function Context({ year, hidePop = false }: { year: number; hidePop?: boolean }) {
  const mode = useStore((s) => s.mode);
  const ruler = rulers.find((r) => {
    const s = mainSpan(r.dating, mode);
    return (r.row ?? 0) === 0 && year >= s.start && year < (s.end ?? s.start + 1);
  });
  const showPop = !hidePop && year >= POP_FROM && year <= POP_TO;
  if (!ruler && !showPop) return null;
  return (
    <section className="context">
      <h3>באותה עת</h3>
      {ruler && (
        <p>
          השלטון בארץ ישראל:{' '}
          <button className="link" onClick={() => focusItem({ type: 'ruler', id: ruler.id })}>{ruler.title.he}</button>
        </p>
      )}
      {showPop && (
        <p>
          יהודים בעולם:{' '}
          <button className="link" onClick={() => focusItem({ type: 'pop', year: nearestPopPoint(year).year })}>
            כ-{formatMillions(popTotal(year))}
          </button>
          {popIsrael(year) > 0.005 && <> · בארץ ישראל כ-{formatMillions(popIsrael(year))}</>}
        </p>
      )}
    </section>
  );
}
