import type { Dating, ItemRef, WikiRef } from '../data/types';
import { L, lang, t } from '../i18n';
import {
  CATEGORY_COLORS, CATEGORY_LABELS, datingsDiffer, eraById, eventById, events, getWikiCache, isTradOnly, KIND_COLORS, KIND_LABELS,
  mainSpan, nearestPopPoint, people, personById, personYear, popIsrael, popTotal, POP_FROM, POP_TO, population, POWER_COLORS,
  rabbinicById, rabbinicEraAt, rulerById, rulers, wikiUrl,
} from '../lib/data';
import { formatAM, formatMillions, formatSpan, formatYear } from '../lib/dates';
import { focusItem, stepEvent, stepPerson, switchView } from '../lib/focus';
import { placeById } from '../lib/places';
import { DIR } from '../lib/timeScale';
import { useStore } from '../store';
import { useWikiSummary } from './useWiki';

/** Arrow glyphs pointing towards the past / the future in the current reading direction. */
export const ARROW_PAST = () => (DIR < 0 ? '→' : '←');
export const ARROW_FUTURE = () => (DIR < 0 ? '←' : '→');

export function InfoPanel() {
  const selected = useStore((s) => s.selected);
  if (!selected) return null;
  return (
    <aside className="panel" aria-live="polite">
      <button className="panel-close" onClick={() => useStore.getState().select(null)} aria-label={t('close')}>×</button>
      <PanelBody item={selected} />
    </aside>
  );
}

function PanelBody({ item }: { item: ItemRef }) {
  const mode = useStore((s) => s.mode);
  if (item.type === 'event') {
    const e = eventById.get(item.id);
    if (!e) return <p>{t('notFound')}</p>;
    const year = mainSpan(e.dating, mode).start;
    return (
      <>
        <span className="badge" style={{ background: KIND_COLORS[e.kind] }}>{KIND_LABELS[e.kind][lang]}</span>
        <h2>{L(e.title)}</h2>
        <DatingBlock dating={e.dating} />
        <p className="summary">{L(e.summary)}</p>
        <ViewSwitch places={e.places} />
        <WikiBlock wiki={e.wiki} />
        <Context year={year} />
        <div className="nav-row">
          <button onClick={() => stepEvent(-1)}>{ARROW_PAST()} {t('prevEvent')}</button>
          <button onClick={() => stepEvent(1)}>{t('nextEvent')} {ARROW_FUTURE()}</button>
        </div>
      </>
    );
  }
  if (item.type === 'ruler') {
    const r = rulerById.get(item.id);
    if (!r) return <p>{t('notFound')}</p>;
    const s = mainSpan(r.dating, mode);
    const during = events.filter((e) => {
      const y = mainSpan(e.dating, mode).start;
      return y >= s.start && y <= (s.end ?? s.start);
    });
    return (
      <>
        <span className="badge" style={{ background: POWER_COLORS[r.power] }}>{r.jewish ? t('jewishRule') : t('ruleOfLand')}</span>
        <h2>{L(r.title)}</h2>
        <DatingBlock dating={r.dating} />
        <p className="summary">{L(r.summary)}</p>
        <WikiBlock wiki={r.wiki} />
        {during.length > 0 && (
          <section>
            <h3>{t('eventsInPeriod')}</h3>
            <ul className="links">
              {during.map((e) => (
                <li key={e.id}><button className="link" onClick={() => focusItem({ type: 'event', id: e.id })}>{L(e.title)}</button> <small>{formatSpan(mainSpan(e.dating, mode))}</small></li>
              ))}
            </ul>
          </section>
        )}
      </>
    );
  }
  if (item.type === 'era') {
    const era = eraById.get(item.id);
    if (!era) return <p>{t('notFound')}</p>;
    const s = mainSpan(era.dating, mode);
    const during = events.filter((e) => {
      const y = mainSpan(e.dating, mode).start;
      return y >= s.start && y < s.end!;
    });
    return (
      <>
        <span className="badge" style={{ background: '#7a6a4a' }}>{t('era')}</span>
        <h2>{L(era.title)}</h2>
        <DatingBlock dating={era.dating} />
        <WikiBlock wiki={era.wiki} />
        <section>
          <h3>{t('eventsInPeriod')}</h3>
          <ul className="links">
            {during.map((e) => (
              <li key={e.id}><button className="link" onClick={() => focusItem({ type: 'event', id: e.id })}>{L(e.title)}</button></li>
            ))}
          </ul>
        </section>
      </>
    );
  }
  if (item.type === 'person') {
    const p = personById.get(item.id);
    if (!p) return <p>{t('notFound')}</p>;
    const idx = people.indexOf(p);
    return (
      <>
        <span className="badge" style={{ background: CATEGORY_COLORS[p.category] }}>{CATEGORY_LABELS[p.category][lang]}</span>
        <h2>{L(p.name)}</h2>
        <div className="dating">
          <div className="date-row">
            <span className="date-label">{t('lifespan')}</span>
            <span className="date-value">{formatSpan(p.dating.acad!)}</span>
            <span className="date-am">{formatAM(p.dating.acad!)}</span>
          </div>
        </div>
        <p className="summary">{L(p.summary)}</p>
        <ViewSwitch places={p.places} />
        <WikiBlock wiki={p.wiki} />
        <Context year={personYear(p)} />
        <div className="nav-row">
          <button disabled={idx <= 0} onClick={() => stepPerson(-1)}>{ARROW_PAST()} {t('prevPerson')}</button>
          <button disabled={idx >= people.length - 1} onClick={() => stepPerson(1)}>{t('nextPerson')} {ARROW_FUTURE()}</button>
        </div>
      </>
    );
  }
  if (item.type === 'rabbinic') {
    const r = rabbinicById.get(item.id);
    if (!r) return <p>{t('notFound')}</p>;
    const s = mainSpan(r.dating, mode);
    const who = people.filter((p) => { const y = personYear(p); return y >= s.start && y < (s.end ?? s.start); });
    return (
      <>
        <span className="badge" style={{ background: '#7a6a4a' }}>{t('rabbinicEra')}</span>
        <h2>{L(r.title)}</h2>
        <DatingBlock dating={r.dating} />
        <p className="summary">{L(r.summary)}</p>
        <WikiBlock wiki={r.wiki} />
        {who.length > 0 && (
          <section>
            <h3>{t('peopleInEra')}</h3>
            <ul className="links">
              {who.map((p) => (
                <li key={p.id}><button className="link" onClick={() => focusItem({ type: 'person', id: p.id })}>{L(p.name)}</button> <small>{formatSpan(p.dating.acad!)}</small></li>
              ))}
            </ul>
          </section>
        )}
      </>
    );
  }
  // population point
  const p = population.find((x) => x.year === item.year) ?? nearestPopPoint(item.year);
  const idx = population.indexOf(p);
  const approx = t('approxShort');
  return (
    <>
      <span className="badge" style={{ background: '#3d78b8' }}>{t('demography')}</span>
      <h2>{t('popTitle')} {formatYear(p.year)}</h2>
      <p className="big-number">{approx}{formatMillions(p.total)}</p>
      {p.min !== undefined && p.max !== undefined && (
        <p>{t('popRange')}: {formatMillions(p.min)} – {formatMillions(p.max)}</p>
      )}
      {p.israel !== undefined && (
        <p>{t('inIsrael')}: {approx}{formatMillions(p.israel)} ({Math.round((p.israel / p.total) * 100)}%)</p>
      )}
      {p.note && <p className="summary">{L(p.note)}</p>}
      {p.source && <p className="muted">{t('source')}: {p.source}</p>}
      <p className="muted">{t('popCaveat')}</p>
      <div className="wiki-links">
        {lang === 'he' && <a className="wiki-link" href={wikiUrl('he', 'יהודים')} target="_blank" rel="noreferrer">הערך „יהודים” בוויקיפדיה ↗</a>}
        <a className="wiki-link en" href={wikiUrl('en', 'Historical Jewish population')} target="_blank" rel="noreferrer" lang="en" dir="ltr">Historical Jewish population ↗</a>
      </div>
      <Context year={p.year} hidePop />
      <div className="nav-row">
        <button disabled={idx <= 0} onClick={() => focusItem({ type: 'pop', year: population[idx - 1].year })}>{ARROW_PAST()} {t('prevPoint')}</button>
        <button disabled={idx >= population.length - 1} onClick={() => focusItem({ type: 'pop', year: population[idx + 1].year })}>{t('nextPoint')} {ARROW_FUTURE()}</button>
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
          <span className="date-label">{differ ? t('dateAcad') : t('date')}</span>
          <span className="date-value">{formatSpan(dating.acad)}</span>
          <span className="date-am">{formatAM(dating.acad)}</span>
        </div>
      )}
      {(differ || tradOnly) && dating.trad && (
        <div className="date-row trad">
          <span className="date-label">{t('dateTrad')}</span>
          <span className="date-value">{formatSpan(dating.trad)}</span>
          <span className="date-am">{formatAM(dating.trad)}</span>
        </div>
      )}
      {tradOnly && <div className="muted">{t('noAcadDate')}</div>}
      {dating.note && <p className="date-note">{L(dating.note)}</p>}
    </div>
  );
}

function WikiBlock({ wiki }: { wiki: WikiRef }) {
  const other = lang === 'he' ? 'en' : 'he';
  // English mode falls back to the Hebrew article when there is no English one
  const primaryLang = wiki[lang] ? lang : 'he';
  const title = wiki[primaryLang];
  const summary = useWikiSummary(primaryLang, title);
  const otherTitle = wiki[other] ?? (wiki.he ? getWikiCache('he')?.[wiki.he]?.en : undefined);
  return (
    <section className="wiki">
      {summary?.thumbnail && <img src={summary.thumbnail} alt={summary.title} loading="lazy" />}
      {summary?.extract && (
        <blockquote lang={primaryLang} dir={primaryLang === 'he' ? 'rtl' : 'ltr'}>
          {summary.extract}
          <footer>{t('fromWikipedia')} „{summary.title}”, {t('license')}</footer>
        </blockquote>
      )}
      <div className="wiki-links">
        {title && <a className="wiki-link" href={summary?.url ?? wikiUrl(primaryLang, title)} target="_blank" rel="noreferrer">{t('toWikipedia')}</a>}
        {otherTitle && other !== primaryLang && (
          <a className="wiki-link alt" href={wikiUrl(other, otherTitle)} target="_blank" rel="noreferrer" lang={other} dir={other === 'he' ? 'rtl' : 'ltr'}>{t('otherWikipedia')}</a>
        )}
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
  const rabbinic = rabbinicEraAt(year, mode);
  if (!ruler && !showPop && !rabbinic) return null;
  const approx = t('approxShort');
  return (
    <section className="context">
      <h3>{t('atThatTime')}</h3>
      {ruler && (
        <p>
          {t('rulerThen')}:{' '}
          <button className="link" onClick={() => focusItem({ type: 'ruler', id: ruler.id })}>{L(ruler.title)}</button>
        </p>
      )}
      {rabbinic && (
        <p>
          {t('rabbinicThen')}:{' '}
          <button className="link" onClick={() => focusItem({ type: 'rabbinic', id: rabbinic.id })}>{L(rabbinic.title)}</button>
        </p>
      )}
      {showPop && (
        <p>
          {t('jewsWorld')}:{' '}
          <button className="link" onClick={() => focusItem({ type: 'pop', year: nearestPopPoint(year).year })}>
            {approx}{formatMillions(popTotal(year))}
          </button>
          {popIsrael(year) > 0.005 && <> · {t('inIsrael')} {approx}{formatMillions(popIsrael(year))}</>}
        </p>
      )}
    </section>
  );
}

/** Jump between the timeline and the globe for the same item; lists the item's places. */
function ViewSwitch({ places }: { places?: string[] }) {
  const view = useStore((s) => s.view);
  if (!places?.length && view === 'timeline') return null;
  return (
    <div className="view-switch">
      {view === 'timeline' ? (
        <button onClick={() => switchView('globe')}>{t('showGlobe')}</button>
      ) : (
        <button onClick={() => switchView('timeline')}>{t('showTimeline')}</button>
      )}
      {places?.length ? (
        <span className="places">
          {places.map((p) => (
            <button key={p} className="chip" onClick={() => { if (useStore.getState().view !== 'globe') switchView('globe'); setTimeout(() => useStore.getState().focusPlace(p), 80); }}>
              📍 {L(placeById.get(p)?.name) || p}
            </button>
          ))}
        </span>
      ) : null}
    </div>
  );
}
