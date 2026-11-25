import { lazy, Suspense, useEffect, useState } from 'react';
import type { DateMode, ItemRef } from './data/types';
import { eraById, eventById, personById, rabbinicById, rulerById } from './lib/data';
import { focusItem, stepEvent } from './lib/focus';
import { useStore } from './store';
import { lang, t } from './i18n';
import { DIR } from './lib/timeScale';
import { InfoPanel } from './ui/InfoPanel';
import { Minimap } from './ui/Minimap';
import { Help, ListView, Tooltip } from './ui/Overlays';
import { Toolbar } from './ui/Toolbar';
import { GlobeControls } from './ui/GlobeControls';
import { LandscapeHint, MapButtons } from './ui/MapButtons';
import type { Dim } from './lib/dim';

const Scene = lazy(() => import('./scene/Scene').then((m) => ({ default: m.Scene })));
const GlobeScene = lazy(() => import('./scene/GlobeScene').then((m) => ({ default: m.GlobeScene })));

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Parse "#event=expulsion-spain&mode=acad" */
function parseHash(): { ref: ItemRef | null; mode: DateMode | null; globe: boolean } {
  const p = new URLSearchParams(location.hash.slice(1));
  const m = p.get('mode');
  const mode = m === 'acad' || m === 'trad' || m === 'both' ? m : null;
  let ref: ItemRef | null = null;
  const ev = p.get('event'), ru = p.get('ruler'), er = p.get('era'), pop = p.get('pop');
  const pe = p.get('person'), rb = p.get('rabbinic');
  if (ev && eventById.has(ev)) ref = { type: 'event', id: ev };
  else if (ru && rulerById.has(ru)) ref = { type: 'ruler', id: ru };
  else if (er && eraById.has(er)) ref = { type: 'era', id: er };
  else if (pe && personById.has(pe)) ref = { type: 'person', id: pe };
  else if (rb && rabbinicById.has(rb)) ref = { type: 'rabbinic', id: rb };
  else if (pop && !isNaN(+pop)) ref = { type: 'pop', year: +pop };
  return { ref, mode, globe: p.get('view') === 'globe' };
}

function writeHash(ref: ItemRef | null, mode: DateMode, globe: boolean) {
  const p = new URLSearchParams();
  if (globe) p.set('view', 'globe');
  if (useStore.getState().dim === '2d') p.set('dim', '2d');
  if (lang !== 'he') p.set('lang', lang);
  if (ref?.type === 'pop') p.set('pop', String(ref.year));
  else if (ref) p.set(ref.type, ref.id);
  if (mode !== 'both') p.set('mode', mode);
  const h = p.toString();
  history.replaceState(null, '', h ? `#${h}` : location.pathname + location.search);
}

/** Remount everything when the language changes: text, time direction and 3D layout all depend on it. */
export default function Root() {
  const lang = useStore((s) => s.lang);
  return <App key={lang} />;
}

function App() {
  const [webgl] = useState(hasWebGL);
  const view = useStore((s) => s.view);
  const dim = useStore((s) => s.dim);
  const chrome = useStore((s) => s.chrome);

  // deep link in, then keep the hash in sync
  useEffect(() => {
    const { ref, mode, globe } = parseHash();
    writeHash(ref, mode ?? useStore.getState().mode, globe || useStore.getState().view === 'globe');
    if (mode) useStore.getState().setMode(mode);
    if (globe) useStore.getState().setViewKind('globe');
    if (ref) setTimeout(() => focusItem(ref), 300);
    else if (!localStorage.getItem('jhm-help-seen')) useStore.getState().setHelpOpen(true);
    const unsub = useStore.subscribe((s, prev) => {
      if (s.selected !== prev.selected || s.mode !== prev.mode || s.view !== prev.view || s.dim !== prev.dim) writeHash(s.selected, s.mode, s.view === 'globe');
      // the selected item moves when the dating system changes: follow it
      if (s.mode !== prev.mode && s.selected) focusItem(s.selected);
    });
    const onHash = () => {
      // a pasted link may ask for another language: switching remounts the app, which re-reads the hash
      const wanted = new URLSearchParams(location.hash.slice(1)).get('lang') ?? 'he';
      if ((wanted === 'he' || wanted === 'en') && wanted !== lang) {
        useStore.getState().setLang(wanted);
        return;
      }
      const dim = new URLSearchParams(location.hash.slice(1)).get('dim') as Dim | null;
      if ((dim === '2d' || dim === '3d') && dim !== useStore.getState().dim) useStore.getState().setDim(dim);
      const { ref } = parseHash();
      if (ref) focusItem(ref);
    };
    window.addEventListener('hashchange', onHash);
    return () => { unsub(); window.removeEventListener('hashchange', onHash); };
  }, []);

  // keyboard: arrows step through events in the reading direction, Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const st = useStore.getState();
      if (e.key === 'Escape') {
        if (st.listOpen) st.setListOpen(false);
        else if (st.helpOpen) st.setHelpOpen(false);
        else st.select(null);
      } else if (st.selected && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        // the future lies to the left in Hebrew and to the right in English
        const toFuture = (e.key === 'ArrowLeft') === (DIR < 0);
        stepEvent(toFuture ? 1 : -1);
      } else if (e.key === 'n' || e.key === 'מ') stepEvent(1);
      else if (e.key === 'p' || e.key === 'פ') stepEvent(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!webgl) {
    return (
      <div className="app no-webgl">
        <Toolbar />
        <p className="notice">{t('noWebgl')}</p>
        <ListView standalone />
        <InfoPanel />
      </div>
    );
  }

  return (
    <div className={`app view-${view} dim-${dim}${chrome ? '' : ' chrome-off'}`}>
      <div className="canvas-wrap">
        <Suspense fallback={<div className="loading">{t('loading')}</div>}>
          {/* a 2D/3D switch rebuilds the scene (positions depend on it); the cameras resume where they were */}
          {view === 'globe' ? <GlobeScene key={dim} /> : <Scene key={dim} />}
        </Suspense>
      </div>
      <Toolbar />
      <InfoPanel />
      <Minimap />
      {view === 'globe' ? <GlobeControls /> : <Legend />}
      <MapButtons />
      <LandscapeHint />
      <Tooltip />
      <ListView />
      <Help />
    </div>
  );
}

/** Colors of the 2D poster (kept here, not imported, so the legend doesn't pull the 3D bundle in). */
const POSTER_LEGEND = { world: '#f3a43b', israel: '#2f6fd6', rule: '#9dbcf2' };

function Legend() {
  const mode = useStore((s) => s.mode);
  const flat = useStore((s) => s.dim) === '2d';
  return (
    <div className="legend" aria-hidden>
      <span><i style={{ background: flat ? POSTER_LEGEND.world : '#3d78b8' }} /> {t('legendWorld')}</span>
      <span><i style={{ background: flat ? POSTER_LEGEND.israel : '#e0b13a' }} /> {t('legendIsrael')}</span>
      <span><i style={{ background: flat ? POSTER_LEGEND.rule : '#2f62b5', boxShadow: flat ? 'inset 0 -3px #e3b12f' : 'inset 0 3px #f2d27a' }} /> {t('legendJewishRule')}</span>
      {mode === 'both' && <span><i className="dashed" /> {t('legendTrad')}</span>}
    </div>
  );
}
