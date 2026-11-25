import { useEffect, useMemo, useRef, useState } from 'react';
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

/**
 * Desktop: one bar with everything. Phones: a floating search pill (Google Earth style) with a
 * menu button and a layers button; the other controls open as drop-down sheets only when asked for.
 */
export function Toolbar() {
  const mode = useStore((s) => s.mode);
  const lanes = useStore((s) => s.lanes);
  const view = useStore((s) => s.view);
  const st = useStore.getState();
  const [open, setOpen] = useState<'menu' | 'layers' | null>(null);
  const ref = useRef<HTMLElement>(null);
  const toggle = (which: 'menu' | 'layers') => setOpen((o) => (o === which ? null : which));

  // a touch anywhere else (the map, the panel) folds the sheets away
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(null); };
    window.addEventListener('pointerdown', away);
    return () => window.removeEventListener('pointerdown', away);
  }, [open]);

  const then = (fn: () => void) => () => { fn(); setOpen(null); };
  const canFullscreen = typeof document !== 'undefined' && document.fullscreenEnabled;
  return (
    <header className="toolbar" ref={ref}>
      <button className="icon-btn mobile-only" aria-label={t('menu')} aria-expanded={open === 'menu'} onClick={() => toggle('menu')}>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </button>
      <h1>
        {t('appTitle')} <span className="sub">{t('appSub')}</span>
      </h1>
      <div className="search-wrap" onFocusCapture={() => setOpen(null)}>
        <Search />
      </div>
      {view === 'timeline' && (
        <button className="icon-btn mobile-only" aria-label={t('layers')} aria-expanded={open === 'layers'} onClick={() => toggle('layers')}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden><path d="M12 3 2 8.5 12 14l10-5.5L12 3Zm-7.6 9.3L2 13.6 12 19l10-5.4-2.4-1.3L12 16.5l-7.6-4.2Z" fill="currentColor" /></svg>
        </button>
      )}
      <div className={`drawer${open === 'menu' ? ' open' : ''}`}>
        <h2 className="mobile-only">{t('appTitle')} <span className="sub">{t('appSub')}</span></h2>
        <div className="seg view-seg" role="radiogroup" aria-label={t('viewLabel')}>
          <button role="radio" aria-checked={view === 'timeline'} className={view === 'timeline' ? 'on' : ''} onClick={then(() => switchView('timeline'))} title={t('viewTimelineTip')}>{t('viewTimeline')}</button>
          <button role="radio" aria-checked={view === 'globe'} className={view === 'globe' ? 'on' : ''} onClick={then(() => switchView('globe'))} title={t('viewGlobeTip')}>{t('viewGlobe')}</button>
        </div>
        <div className="seg" role="radiogroup" aria-label={t('datingLabel')}>
          {MODES.map((m) => (
            <button key={m.key} role="radio" aria-checked={mode === m.key} className={mode === m.key ? 'on' : ''} title={t(m.title)} onClick={() => st.setMode(m.key)}>
              {t(m.label)}
            </button>
          ))}
        </div>
        <div className="tools">
          <button onClick={then(() => st.setLang(lang === 'he' ? 'en' : 'he'))} title={t('langSwitchTip')} lang={lang === 'he' ? 'en' : 'he'}>{t('langSwitch')}</button>
          <button onClick={then(() => st.setListOpen(true))} title={t('listTip')}>{t('list')}</button>
          {canFullscreen && (
            <button className="mobile-only" onClick={then(() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {}))}>
              ⛶ {t('fullscreen')}
            </button>
          )}
          <button onClick={then(() => st.setHelpOpen(true))} title={t('help')} aria-label={t('help')}>?</button>
        </div>
      </div>
      <div className={`lanes${open === 'layers' ? ' open' : ''}`} aria-label={t('layers')} hidden={view === 'globe'}>
        {LANES.map((l) => (
          <label key={l.key} className={lanes[l.key] ? 'on' : ''}>
            <input type="checkbox" checked={lanes[l.key]} onChange={() => st.toggleLane(l.key)} />
            {t(l.label)}
          </label>
        ))}
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
