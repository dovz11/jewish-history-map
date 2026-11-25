import { lazy, Suspense, useEffect, useState } from 'react';
import type { DateMode, ItemRef } from './data/types';
import { eraById, eventById, rulerById } from './lib/data';
import { focusItem, stepEvent } from './lib/focus';
import { useStore } from './store';
import { InfoPanel } from './ui/InfoPanel';
import { Minimap } from './ui/Minimap';
import { Help, ListView, Tooltip } from './ui/Overlays';
import { Toolbar } from './ui/Toolbar';

const Scene = lazy(() => import('./scene/Scene').then((m) => ({ default: m.Scene })));

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Parse "#event=expulsion-spain&mode=acad" */
function parseHash(): { ref: ItemRef | null; mode: DateMode | null } {
  const p = new URLSearchParams(location.hash.slice(1));
  const m = p.get('mode');
  const mode = m === 'acad' || m === 'trad' || m === 'both' ? m : null;
  let ref: ItemRef | null = null;
  const ev = p.get('event'), ru = p.get('ruler'), er = p.get('era'), pop = p.get('pop');
  if (ev && eventById.has(ev)) ref = { type: 'event', id: ev };
  else if (ru && rulerById.has(ru)) ref = { type: 'ruler', id: ru };
  else if (er && eraById.has(er)) ref = { type: 'era', id: er };
  else if (pop && !isNaN(+pop)) ref = { type: 'pop', year: +pop };
  return { ref, mode };
}

function writeHash(ref: ItemRef | null, mode: DateMode) {
  const p = new URLSearchParams();
  if (ref?.type === 'pop') p.set('pop', String(ref.year));
  else if (ref) p.set(ref.type, ref.id);
  if (mode !== 'both') p.set('mode', mode);
  const h = p.toString();
  history.replaceState(null, '', h ? `#${h}` : location.pathname + location.search);
}

export default function App() {
  const [webgl] = useState(hasWebGL);

  // deep link in, then keep the hash in sync
  useEffect(() => {
    const { ref, mode } = parseHash();
    if (mode) useStore.getState().setMode(mode);
    if (ref) setTimeout(() => focusItem(ref), 300);
    else if (!localStorage.getItem('jhm-help-seen')) useStore.getState().setHelpOpen(true);
    const unsub = useStore.subscribe((s, prev) => {
      if (s.selected !== prev.selected || s.mode !== prev.mode) writeHash(s.selected, s.mode);
      // the selected item moves when the dating system changes: follow it
      if (s.mode !== prev.mode && s.selected) focusItem(s.selected);
    });
    const onHash = () => {
      const { ref } = parseHash();
      if (ref) focusItem(ref);
    };
    window.addEventListener('hashchange', onHash);
    return () => { unsub(); window.removeEventListener('hashchange', onHash); };
  }, []);

  // keyboard: arrows step through events (time flows right-to-left), Esc closes
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
        stepEvent(e.key === 'ArrowLeft' ? 1 : -1);
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
        <p className="notice">הדפדפן שלכם אינו תומך בתלת־ממד (WebGL), ולכן מוצגת רשימה כרונולוגית.</p>
        <ListView standalone />
        <InfoPanel />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="canvas-wrap">
        <Suspense fallback={<div className="loading">טוען את ציר הזמן…</div>}>
          <Scene />
        </Suspense>
      </div>
      <Toolbar />
      <InfoPanel />
      <Minimap />
      <Legend />
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
      <span><i style={{ background: '#3d78b8' }} /> יהודים בעולם</span>
      <span><i style={{ background: '#e0b13a' }} /> בארץ ישראל</span>
      <span><i style={{ background: '#2f62b5', boxShadow: 'inset 0 3px #f2d27a' }} /> שלטון יהודי</span>
      {mode === 'both' && <span><i className="dashed" /> תיארוך מסורתי</span>}
    </div>
  );
}
