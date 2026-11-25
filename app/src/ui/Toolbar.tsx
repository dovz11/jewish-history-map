import { useMemo, useState } from 'react';
import type { DateMode, ItemRef } from '../data/types';
import { eras, events, mainSpan, rulers } from '../lib/data';
import { formatSpan } from '../lib/dates';
import { focusItem, switchView } from '../lib/focus';
import { type LaneKey, useStore } from '../store';

const MODES: { key: DateMode; label: string; title: string }[] = [
  { key: 'acad', label: 'מחקרי', title: 'תיארוך לפי המחקר ההיסטורי והארכאולוגי' },
  { key: 'trad', label: 'מסורתי', title: 'תיארוך לפי המסורת (סדר עולם והלוח העברי)' },
  { key: 'both', label: 'שניהם', title: 'מחקרי, ולצידו הגרסה המסורתית כצל מקווקו' },
];

const LANES: { key: LaneKey; label: string }[] = [
  { key: 'history', label: 'אירועים' },
  { key: 'demography', label: 'דמוגרפיה' },
  { key: 'sovereignty', label: 'שלטון' },
  { key: 'eras', label: 'תקופות' },
];

export function Toolbar() {
  const mode = useStore((s) => s.mode);
  const lanes = useStore((s) => s.lanes);
  const view = useStore((s) => s.view);
  const st = useStore.getState();
  return (
    <header className="toolbar">
      <h1>
        ציר הזמן היהודי <span className="sub">בתלת־ממד</span>
      </h1>
      <Search />
      <div className="seg view-seg" role="radiogroup" aria-label="תצוגה">
        <button role="radio" aria-checked={view === 'timeline'} className={view === 'timeline' ? 'on' : ''} onClick={() => switchView('timeline')} title="ציר הזמן התלת־ממדי">ציר זמן</button>
        <button role="radio" aria-checked={view === 'globe'} className={view === 'globe' ? 'on' : ''} onClick={() => switchView('globe')} title="מפת העולם: קהילות ונדידות לאורך הזמן">🌍 גלובוס</button>
      </div>
      <div className="seg" role="radiogroup" aria-label="שיטת תיארוך">
        {MODES.map((m) => (
          <button key={m.key} role="radio" aria-checked={mode === m.key} className={mode === m.key ? 'on' : ''} title={m.title} onClick={() => st.setMode(m.key)}>
            {m.label}
          </button>
        ))}
      </div>
      <div className="lanes" aria-label="שכבות" hidden={view === 'globe'}>
        {LANES.map((l) => (
          <label key={l.key} className={lanes[l.key] ? 'on' : ''}>
            <input type="checkbox" checked={lanes[l.key]} onChange={() => st.toggleLane(l.key)} />
            {l.label}
          </label>
        ))}
      </div>
      <div className="tools">
        <button onClick={() => st.setListOpen(true)} title="רשימה כרונולוגית של כל הפריטים">☰ רשימה</button>
        <button onClick={() => st.setHelpOpen(true)} title="עזרה וניווט" aria-label="עזרה">?</button>
      </div>
    </header>
  );
}

interface Hit { ref: ItemRef; label: string; sub: string }

function Search() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const mode = useStore((s) => s.mode);
  const all = useMemo<Hit[]>(
    () => [
      ...events.map((e) => ({ ref: { type: 'event', id: e.id } as ItemRef, label: e.title.he, sub: formatSpan(mainSpan(e.dating, mode)) })),
      ...rulers.map((r) => ({ ref: { type: 'ruler', id: r.id } as ItemRef, label: r.title.he, sub: 'שלטון · ' + formatSpan(mainSpan(r.dating, mode)) })),
      ...eras.map((r) => ({ ref: { type: 'era', id: r.id } as ItemRef, label: r.title.he, sub: 'תקופה' })),
    ],
    [mode],
  );
  const norm = (s: string) => s.replace(/["'״׳\-–]/g, '').toLowerCase();
  const hits = q.trim()
    ? all.filter((h) => norm(h.label).includes(norm(q.trim())) || h.sub.includes(q.trim())).slice(0, 10)
    : [];
  const choose = (h: Hit) => {
    focusItem(h.ref);
    setQ('');
    setOpen(false);
  };
  return (
    <div className="search">
      <input
        type="search"
        placeholder="חיפוש אירוע, שלטון או שנה…"
        value={q}
        aria-label="חיפוש"
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { setActive((a) => Math.min(hits.length - 1, a + 1)); e.preventDefault(); }
          else if (e.key === 'ArrowUp') { setActive((a) => Math.max(0, a - 1)); e.preventDefault(); }
          else if (e.key === 'Enter' && hits[active]) choose(hits[active]);
          else if (e.key === 'Escape') { setQ(''); (e.target as HTMLInputElement).blur(); }
          e.stopPropagation();
        }}
      />
      {open && hits.length > 0 && (
        <ul className="hits" role="listbox">
          {hits.map((h, i) => (
            <li key={h.ref.type + ('id' in h.ref ? h.ref.id : '')} role="option" aria-selected={i === active} className={i === active ? 'active' : ''} onMouseDown={() => choose(h)}>
              <span>{h.label}</span>
              <small>{h.sub}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
