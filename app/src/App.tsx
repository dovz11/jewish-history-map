import { lazy, Suspense, useEffect, useState } from 'react';
import type { DateMode, ItemRef } from './data/types';
import { eraById, eventById, rulerById } from './lib/data';
import { focusItem, stepEvent } from './lib/focus';
import { useStore } from './store';
import { lang, t } from './i18n';
import { DIR } from './lib/timeScale';
import { InfoPanel } from './ui/InfoPanel';
import { Minimap } from './ui/Minimap';
import { Help, ListView, Tooltip } from './ui/Overlays';
import { Toolbar } from './ui/Toolbar';
import { GlobeControls } from './ui/GlobeControls';

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
  if (ev && eventById.has(ev)) ref = { type: 'event', id: ev };
  else if (ru && rulerById.has(ru)) ref = { type: 'ruler', id: ru };
  else if (er && eraById.has(er)) ref = { type: 'era', id: er };
  else if (pop && !isNaN(+pop)) ref = { type: 'pop', year: +pop };
  return { ref, mode, globe: p.get('view') === 'globe' };
}

function writeHash(ref: ItemRef | null, mode: DateMode, globe: boolean) {
  const p = new URLSearchParams();
  if (globe) p.set('view', 'globe');
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

  // deep link in, then keep the hash in sync
  useEffect(() => {
    const { ref, mode, globe } = parseHash();
    writeHash(ref, mode ?? useStore.getState().mode, globe || useStore.getState().view === 'globe');
    if (mode) useStore.getState().setMode(mode);
    if (globe) useStore.getState().setViewKind('globe');
    if (ref) setTimeout(() => focusItem(ref), 300);
    else if (!localStorage.getItem('jhm-help-seen')) useStore.getState().setHelpOpen(true);
    const unsub = useStore.subscribe((s, prev) => {
      if (s.selected !== prev.selected || s.mode !== prev.mode || s.view !== prev.view) writeHash(s.selected, s.mode, s.view === 'globe');
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
    <div className={`app view-${view}`}>
      <div className="canvas-wrap">
        <Suspense fallback={<div className="loading">{t('loading')}</div>}>
          {view === 'globe' ? <GlobeScene /> : <Scene />}
        </Suspense>
      </div>
      <Toolbar />
      <InfoPanel />
      <Minimap />
      {view === 'globe' ? <GlobeControls /> : <Legend />}
      <Tooltip />
      <ListView />
      <Help />
    </div>
  );
}

function Legend() {
  const mode = useStore((s) => s.mode);
  return (
    <div className="legend" aria-hidden>
      <span><i style={{ background: '#3d78b8' }} /> {t('legendWorld')}</span>
      <span><i style={{ background: '#e0b13a' }} /> {t('legendIsrael')}</span>
      <span><i style={{ background: '#2f62b5', boxShadow: 'inset 0 3px #f2d27a' }} /> {t('legendJewishRule')}</span>
      {mode === 'both' && <span><i className="dashed" /> {t('legendTrad')}</span>}
    </div>
  );
}
