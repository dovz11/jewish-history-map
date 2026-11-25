import { useMemo, useState } from 'react';
import type { DateMode, ItemRef } from '../data/types';
import { L, lang, t, type StringKey } from '../i18n';
import { eras, events, mainSpan, people, rabbinicEras, rulers } from '../lib/data';
import { formatSpan } from '../lib/dates';
import { focusItem, switchView } from '../lib/focus';
import { type LaneKey, useStore } from '../store';

const MODES: { key: DateMode; label: StringKey; title: StringKey }[] = [
  { key: 'acad', label: 'modeAcad', title: 'modeAcadTip' },
  { key: 'trad', label: 'modeTrad', title: 'modeTradTip' },
  { key: 'both', label: 'modeBoth', title: 'modeBothTip' },
];

const LANES: { key: LaneKey; label: StringKey }[] = [
  { key: 'history', label: 'laneHistory' },
  { key: 'demography', label: 'laneDemography' },
  { key: 'sovereignty', label: 'laneSovereignty' },
  { key: 'eras', label: 'laneEras' },
  { key: 'rabbinic', label: 'laneRabbinic' },
  { key: 'people', label: 'lanePeople' },
];

export function Toolbar() {
  const mode = useStore((s) => s.mode);
  const lanes = useStore((s) => s.lanes);
  const view = useStore((s) => s.view);
  const st = useStore.getState();
  return (
    <header className="toolbar">
      <h1>
        {t('appTitle')} <span className="sub">{t('appSub')}</span>
      </h1>
      <Search />
      <div className="seg view-seg" role="radiogroup" aria-label={t('viewLabel')}>
        <button role="radio" aria-checked={view === 'timeline'} className={view === 'timeline' ? 'on' : ''} onClick={() => switchView('timeline')} title={t('viewTimelineTip')}>{t('viewTimeline')}</button>
        <button role="radio" aria-checked={view === 'globe'} className={view === 'globe' ? 'on' : ''} onClick={() => switchView('globe')} title={t('viewGlobeTip')}>{t('viewGlobe')}</button>
      </div>
      <div className="seg" role="radiogroup" aria-label={t('datingLabel')}>
        {MODES.map((m) => (
          <button key={m.key} role="radio" aria-checked={mode === m.key} className={mode === m.key ? 'on' : ''} title={t(m.title)} onClick={() => st.setMode(m.key)}>
            {t(m.label)}
          </button>
        ))}
      </div>
      <div className="lanes" aria-label={t('layers')} hidden={view === 'globe'}>
        {LANES.map((l) => (
          <label key={l.key} className={lanes[l.key] ? 'on' : ''}>
            <input type="checkbox" checked={lanes[l.key]} onChange={() => st.toggleLane(l.key)} />
            {t(l.label)}
          </label>
        ))}
      </div>
      <div className="tools">
        <button onClick={() => st.setLang(lang === 'he' ? 'en' : 'he')} title={t('langSwitchTip')} lang={lang === 'he' ? 'en' : 'he'}>{t('langSwitch')}</button>
        <button onClick={() => st.setListOpen(true)} title={t('listTip')}>{t('list')}</button>
        <button onClick={() => st.setHelpOpen(true)} title={t('help')} aria-label={t('help')}>?</button>
      </div>
    </header>
  );
}

interface Hit { ref: ItemRef; label: string; alt: string; sub: string }

function Search() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const mode = useStore((s) => s.mode);
  const all = useMemo<Hit[]>(
    () => [
      ...events.map((e) => ({ ref: { type: 'event', id: e.id } as ItemRef, label: L(e.title), alt: `${e.title.he} ${e.title.en ?? ''}`, sub: formatSpan(mainSpan(e.dating, mode)) })),
      ...rulers.map((r) => ({ ref: { type: 'ruler', id: r.id } as ItemRef, label: L(r.title), alt: `${r.title.he} ${r.title.en ?? ''}`, sub: `${t('laneSovereignty')} · ${formatSpan(mainSpan(r.dating, mode))}` })),
      ...people.map((p) => ({ ref: { type: 'person', id: p.id } as ItemRef, label: L(p.name), alt: `${p.name.he} ${p.name.en ?? ''}`, sub: `${t('lanePeople')} · ${formatSpan(p.dating.acad!)}` })),
      ...rabbinicEras.map((r) => ({ ref: { type: 'rabbinic', id: r.id } as ItemRef, label: L(r.title), alt: `${r.title.he} ${r.title.en ?? ''}`, sub: `${t('rabbinicEra')} · ${formatSpan(mainSpan(r.dating, mode))}` })),
      ...eras.map((r) => ({ ref: { type: 'era', id: r.id } as ItemRef, label: L(r.title), alt: `${r.title.he} ${r.title.en ?? ''}`, sub: t('era') })),
    ],
    [mode],
  );
  const norm = (s: string) => s.replace(/["'״׳\-–]/g, '').toLowerCase();
  const nq = norm(q.trim());
  // search both languages, so either script finds the item
  const hits = nq ? all.filter((h) => norm(h.alt).includes(nq) || h.sub.includes(q.trim())).slice(0, 10) : [];
  const choose = (h: Hit) => {
    focusItem(h.ref);
    setQ('');
    setOpen(false);
  };
  return (
    <div className="search">
      <input
        type="search"
        placeholder={t('search')}
        value={q}
        aria-label={t('searchLabel')}
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
