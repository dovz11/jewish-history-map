import { useEffect, useRef } from 'react';
import { eras, events, mainSpan, rulers, KIND_COLORS, KIND_LABELS, POWER_COLORS } from '../lib/data';
import { formatSpan } from '../lib/dates';
import { focusItem } from '../lib/focus';
import { useStore } from '../store';

/** Hover tooltip that follows the pointer. */
export function Tooltip() {
  const text = useStore((s) => s.hoverText);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (ref.current) ref.current.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 16}px)`;
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, []);
  return <div ref={ref} className="tooltip" hidden={!text}>{text}</div>;
}

/** Accessible chronological list of everything on the map, also used when WebGL is unavailable. */
export function ListView({ standalone = false }: { standalone?: boolean }) {
  const open = useStore((s) => s.listOpen);
  const mode = useStore((s) => s.mode);
  if (!open && !standalone) return null;
  const close = () => useStore.getState().setListOpen(false);
  const go = (fn: () => void) => () => { fn(); if (!standalone) close(); };
  return (
    <div className={standalone ? 'listview standalone' : 'modal'} role="dialog" aria-label="רשימה כרונולוגית" onClick={standalone ? undefined : close}>
      <div className="modal-body list" onClick={(e) => e.stopPropagation()}>
        {!standalone && <button className="panel-close" onClick={close} aria-label="סגירה">×</button>}
        <h2>רשימה כרונולוגית</h2>
        {eras.map((era) => {
          const s = mainSpan(era.dating, mode);
          const evs = events.filter((e) => { const y = mainSpan(e.dating, mode).start; return y >= s.start && y < s.end!; });
          return (
            <section key={era.id}>
              <h3 style={{ borderColor: era.color }}>
                <button className="link" onClick={go(() => focusItem({ type: 'era', id: era.id }))}>{era.title.he}</button>
                <small> {formatSpan(s)}</small>
              </h3>
              <ul>
                {evs.map((e) => (
                  <li key={e.id}>
                    <span className="dot" style={{ background: KIND_COLORS[e.kind] }} title={KIND_LABELS[e.kind]} />
                    <button className="link" onClick={go(() => focusItem({ type: 'event', id: e.id }))}>{e.title.he}</button>
                    <small> {formatSpan(mainSpan(e.dating, mode))}</small>
                    {standalone && <p>{e.summary.he}</p>}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        <section>
          <h3>שלטון בארץ ישראל</h3>
          <ul>
            {rulers.map((r) => (
              <li key={r.id}>
                <span className="dot" style={{ background: POWER_COLORS[r.power] }} />
                <button className="link" onClick={go(() => focusItem({ type: 'ruler', id: r.id }))}>{r.title.he}</button>
                <small> {formatSpan(mainSpan(r.dating, mode))}</small>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

export function Help() {
  const open = useStore((s) => s.helpOpen);
  if (!open) return null;
  const close = () => {
    useStore.getState().setHelpOpen(false);
    localStorage.setItem('jhm-help-seen', '1');
  };
  return (
    <div className="modal" role="dialog" aria-label="עזרה" onClick={close}>
      <div className="modal-body help" onClick={(e) => e.stopPropagation()}>
        <button className="panel-close" onClick={close} aria-label="סגירה">×</button>
        <h2>ברוכים הבאים לציר הזמן היהודי</h2>
        <p>
          ההיסטוריה של העם היהודי פרושה לפניכם כנוף. הזמן זורם <b>מימין לשמאל</b>: העבר הרחוק בימין, וההווה בשמאל.
        </p>
        <ul>
          <li><b>גרירה</b> (לחצן שמאלי, או אצבע אחת): תזוזה לאורך הזמן ובין השכבות</li>
          <li><b>גלגלת</b> (או צביטה): התקרבות והתרחקות</li>
          <li><b>לחצן ימני</b> (או שלוש אצבעות): סיבוב המבט</li>
          <li><b>לחיצה</b> על פריט: פרטים, תמונה וקישורים לוויקיפדיה</li>
          <li><b>← →</b> במקלדת: מעבר לאירוע הבא או הקודם · <b>Esc</b>: סגירה</li>
          <li>פס הזמן התחתון: לחיצה או גרירה מעבירה אתכם לכל נקודה בזמן</li>
        </ul>
        <h3>השכבות</h3>
        <ul>
          <li><b>אירועים</b>: עמודים עם כרטיסים. ככל שהאירוע חשוב יותר, הכרטיס גדול יותר.</li>
          <li><b>דמוגרפיה</b>: „נהר” שרוחבו וגובהו הם מספר היהודים בעולם. החלק הזהוב הוא היהודים בארץ ישראל, והרצועה הבהירה סביבו היא טווח ההערכות.</li>
          <li><b>שלטון</b>: מי שלט בארץ ישראל בכל תקופה. גושים גבוהים עם פס זהוב מסמנים ריבונות או שלטון עצמי יהודי.</li>
          <li><b>תקופות</b>: רקע צבעוני לתקופות הגדולות.</li>
        </ul>
        <h3>שתי שיטות תיארוך</h3>
        <p>
          עד התקופה ההלניסטית המסורת (סדר עולם) והמחקר נותנים תאריכים שונים. למשל, חורבן הבית הראשון חל לפי המסורת בשנת 423 לפנה״ס, ולפי המחקר בשנת 586 לפנה״ס.
          במצב <b>שניהם</b>, האירוע עומד במקומו לפי המחקר, וקשת מקווקוות מובילה למקומו לפי המסורת. אירועים שידועים רק מהמסורת מסומנים בגוון חום.
        </p>
        <p className="muted">
          התקצירים נכתבו לאתר זה. קטעי הטקסט והתמונות שבחלון הפרטים לקוחים מוויקיפדיה ומוויקישיתוף, ברישיונות CC BY-SA.
          השראה: הפוסטר „ציר זמן יהודי” באתר odyeda.com.
        </p>
        <button className="primary" onClick={close}>יוצאים לדרך</button>
      </div>
    </div>
  );
}
