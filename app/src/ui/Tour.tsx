import { useEffect, useRef, useState } from 'react';
import { L, lang, t } from '../i18n';
import { datingsDiffer, eras, eventById, getWikiCache, isTradOnly, loadWikiCache, mainSpan } from '../lib/data';
import { formatAM, formatSpan, formatYear } from '../lib/dates';
import { focusItem } from '../lib/focus';
import { xToYear } from '../lib/timeScale';
import {
  exitTour, goToStop, nextStop, pauseTour, prevStop, setTourLength, setTourSpeed, startTour,
  togglePause, tourClock, useTour,
} from '../lib/tour';
import { useStore } from '../store';
import { useWikiSummary } from './useWiki';

/** A larger version of a Wikimedia thumbnail (they are served at any width through the URL). */
const bigger = (src: string) => src.replace(/\/(\d+)px-/, '/640px-');

/** Everything shown on screen during the tour. */
export function TourOverlay() {
  const active = useTour((s) => s.active);
  // keyboard: Space pauses, arrows step through the stops, Esc leaves (ahead of the app's own keys)
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const toFuture = (e.key === 'ArrowLeft') === (lang === 'he');
      if (e.key === ' ') togglePause();
      else if (e.key === 'Escape') exitTour();
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') (toFuture ? nextStop : prevStop)();
      else return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [active]);
  if (!active) return null;
  return (
    <div className="tour">
      <YearCounter />
      <TourCard />
      <TourEnd />
      <TourBar />
    </div>
  );
}

/** The year the camera is over, and a title card for each era it enters. */
function YearCounter() {
  const yearRef = useRef<HTMLDivElement>(null);
  const [era, setEra] = useState<string | null>(null);
  const mode = useStore((s) => s.mode);
  useEffect(() => {
    let id = 0;
    let shown = '';
    let eraId: string | null = null;
    const loop = () => {
      const y = Math.round(xToYear(tourClock.x));
      const text = formatYear(y);
      if (text !== shown && yearRef.current) { yearRef.current.textContent = text; shown = text; }
      const e = eras.find((er) => { const s = mainSpan(er.dating, mode); return y >= s.start && y < (s.end ?? s.start); });
      if (e && e.id !== eraId) { eraId = e.id; setEra(e.id); }
      id = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(id);
  }, [mode]);
  const e = era ? eras.find((x) => x.id === era) : null;
  return (
    <div className="tour-top" aria-hidden>
      <div className="tour-year" ref={yearRef} />
      {e && (
        <div className="tour-era" key={e.id}>
          <b>{L(e.title)}</b>
          <span>{formatSpan(mainSpan(e.dating, mode))}</span>
        </div>
      )}
    </div>
  );
}

function TourCard() {
  const card = useTour((s) => s.card);
  const stops = useTour((s) => s.stops);
  const stop = card !== null ? stops[card] : null;
  const ev = stop ? eventById.get(stop.id) : undefined;
  const title = ev ? ev.wiki[lang] ?? (lang === 'he' ? undefined : ev.wiki.he) : undefined;
  const wiki = useWikiSummary(lang, title);
  const [imgFailed, setImgFailed] = useState<string | null>(null);

  // load the next stop's picture ahead of time
  useEffect(() => {
    if (card === null) return;
    const next = eventById.get(stops[card + 1]?.id ?? '');
    const nt = next?.wiki[lang];
    if (!nt) return;
    loadWikiCache(lang).then((c) => {
      const src = c[nt]?.thumbnail;
      if (src) new Image().src = bigger(src);
    });
  }, [card, stops]);

  if (!ev || card === null) return null;
  const d = ev.dating;
  const thumb = wiki?.thumbnail ?? getWikiCache(lang)?.[title ?? '']?.thumbnail;
  const src = thumb ? (imgFailed === thumb ? thumb : bigger(thumb)) : null;
  const open = () => {
    pauseTour();
    focusItem({ type: 'event', id: ev.id });
  };
  return (
    <article className="tour-card" key={ev.id} aria-live="polite">
      {src ? (
        <figure className="tour-pic">
          <img src={src} alt="" onError={() => setImgFailed(thumb!)} />
          {wiki?.url && (
            <figcaption>
              <a href={wiki.url} target="_blank" rel="noreferrer">{t('tourCredit')}</a>
            </figcaption>
          )}
        </figure>
      ) : (
        <div className={`tour-pic none kind-${ev.kind}`} />
      )}
      <div className="tour-text">
        <div className="tour-count">{card + 1} / {stops.length}</div>
        <h2>{L(ev.title)}</h2>
        <div className="tour-dates">
          {d.acad && <span>{formatSpan(d.acad)}</span>}
          {(isTradOnly(d) || datingsDiffer(d)) && d.trad && (
            <span className="trad">{t('dateTrad')}: {formatSpan(d.trad)} · {formatAM(d.trad)}</span>
          )}
        </div>
        <p>{L(ev.summary)}</p>
        <button className="link" onClick={open}>{t('tourMore')}</button>
      </div>
    </article>
  );
}

function TourEnd() {
  const phase = useTour((s) => s.phase);
  if (phase !== 'end') return null;
  return (
    <div className="tour-end" role="dialog" aria-label={t('tourEnd')}>
      <h2>{t('tourEnd')}</h2>
      <p>{t('tourEndText')}</p>
      <div className="tour-end-buttons">
        <button className="primary" onClick={() => startTour()}>{t('tourAgain')}</button>
        <button onClick={exitTour}>{t('tourExplore')}</button>
      </div>
    </div>
  );
}

function TourBar() {
  const { paused, speed, length, stops, i, phase } = useTour();
  const done = phase === 'end' ? stops.length : phase === 'stay' ? i + 1 : i;
  return (
    <div className="tour-bar" role="toolbar" aria-label={t('tour')}>
      {paused && <div className="tour-paused">{t('tourPaused')}</div>}
      <div className="tour-progress">
        {stops.map((s, k) => {
          const ev = eventById.get(s.id);
          return (
            <button
              key={s.id}
              className={`tick${k < done ? ' done' : ''}${k === i && phase !== 'end' ? ' now' : ''}`}
              style={{ insetInlineStart: `${(k / Math.max(1, stops.length - 1)) * 100}%` }}
              onClick={() => goToStop(k)}
              title={ev ? L(ev.title) : ''}
              aria-label={ev ? L(ev.title) : ''}
            />
          );
        })}
        <div className="fill" style={{ width: `${(Math.max(0, done - 1) / Math.max(1, stops.length - 1)) * 100}%` }} />
      </div>
      <div className="tour-buttons">
        <button onClick={prevStop} title={t('tourPrev')} aria-label={t('tourPrev')}>{lang === 'he' ? '⏭' : '⏮'}</button>
        <button className={`play${paused ? ' pulse' : ''}`} onClick={togglePause} title={t(paused ? 'tourPlay' : 'tourPause')} aria-label={t(paused ? 'tourPlay' : 'tourPause')}>
          {paused ? '▶' : '❚❚'}
        </button>
        <button onClick={nextStop} title={t('tourNext')} aria-label={t('tourNext')}>{lang === 'he' ? '⏮' : '⏭'}</button>
        <button className="speed" onClick={() => setTourSpeed(speed === 1 ? 2 : 1)} title={t('tourSpeed')} aria-label={t('tourSpeed')}>{speed}×</button>
        <div className="seg" role="radiogroup" aria-label={t('tourLength')}>
          <button role="radio" aria-checked={length === 'short'} className={length === 'short' ? 'on' : ''} onClick={() => setTourLength('short')}>{t('tourShort')}</button>
          <button role="radio" aria-checked={length === 'full'} className={length === 'full' ? 'on' : ''} onClick={() => setTourLength('full')}>{t('tourFull')}</button>
        </div>
        <button className="exit" onClick={exitTour} title={t('tourExit')} aria-label={t('tourExit')}>✕</button>
      </div>
    </div>
  );
}
