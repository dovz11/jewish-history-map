import { useEffect, useRef } from 'react';
import { L, lang, t } from '../i18n';
import { CATEGORY_COLORS, CATEGORY_LABELS, eras, events, mainSpan, people, rabbinicEras, rulers, KIND_COLORS, KIND_LABELS, POWER_COLORS } from '../lib/data';
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
    <div className={standalone ? 'listview standalone' : 'modal'} role="dialog" aria-label={t('chronoList')} onClick={standalone ? undefined : close}>
      <div className="modal-body list" onClick={(e) => e.stopPropagation()}>
        {!standalone && <button className="panel-close" onClick={close} aria-label={t('close')}>×</button>}
        <h2>{t('chronoList')}</h2>
        {eras.map((era) => {
          const s = mainSpan(era.dating, mode);
          const evs = events.filter((e) => { const y = mainSpan(e.dating, mode).start; return y >= s.start && y < s.end!; });
          return (
            <section key={era.id}>
              <h3 style={{ borderColor: era.color }}>
                <button className="link" onClick={go(() => focusItem({ type: 'era', id: era.id }))}>{L(era.title)}</button>
                <small> {formatSpan(s)}</small>
              </h3>
              <ul>
                {evs.map((e) => (
                  <li key={e.id}>
                    <span className="dot" style={{ background: KIND_COLORS[e.kind] }} title={KIND_LABELS[e.kind][lang]} />
                    <button className="link" onClick={go(() => focusItem({ type: 'event', id: e.id }))}>{L(e.title)}</button>
                    <small> {formatSpan(mainSpan(e.dating, mode))}</small>
                    {standalone && <p>{L(e.summary)}</p>}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        <section>
          <h3>{t('laneRabbinic')}</h3>
          <ul>
            {rabbinicEras.map((r) => (
              <li key={r.id}>
                <span className="dot" style={{ background: r.color }} />
                <button className="link" onClick={go(() => focusItem({ type: 'rabbinic', id: r.id }))}>{L(r.title)}</button>
                <small> {formatSpan(mainSpan(r.dating, mode))}</small>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3>{t('peopleSection')}</h3>
          <ul>
            {people.map((p) => (
              <li key={p.id}>
                <span className="dot" style={{ background: CATEGORY_COLORS[p.category] }} title={CATEGORY_LABELS[p.category][lang]} />
                <button className="link" onClick={go(() => focusItem({ type: 'person', id: p.id }))}>{L(p.name)}</button>
                <small> {formatSpan(p.dating.acad!)}</small>
                {standalone && <p>{L(p.summary)}</p>}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3>{t('laneTitleRule')}</h3>
          <ul>
            {rulers.map((r) => (
              <li key={r.id}>
                <span className="dot" style={{ background: POWER_COLORS[r.power] }} />
                <button className="link" onClick={go(() => focusItem({ type: 'ruler', id: r.id }))}>{L(r.title)}</button>
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
    <div className="modal" role="dialog" aria-label={t('help')} onClick={close}>
      <div className="modal-body help" onClick={(e) => e.stopPropagation()}>
        <button className="panel-close" onClick={close} aria-label={t('close')}>×</button>
        {lang === 'he' ? <HelpHe /> : <HelpEn />}
        <button className="primary" onClick={close}>{t('start')}</button>
      </div>
    </div>
  );
}

function HelpHe() {
  return (
    <>
      <h2>ברוכים הבאים לציר הזמן היהודי</h2>
      <p>
        ההיסטוריה של העם היהודי פרושה לפניכם כנוף. הזמן זורם <b>מימין לשמאל</b>: העבר הרחוק בימין, וההווה בשמאל.
      </p>
      <ul>
        <li><b>גרירה</b> (לחצן שמאלי, או אצבע אחת): תזוזה לאורך הזמן ובין השכבות</li>
        <li><b>גלגלת</b> (או צביטה בשתי אצבעות): התקרבות והתרחקות</li>
        <li><b>לחצן ימני</b> (או סיבוב של שתי אצבעות): סיבוב המבט</li>
        <li><b>החלקה של שתי אצבעות למעלה או למטה</b>: הטיית המבט</li>
        <li><b>הקשה כפולה</b>: התקרבות · <b>הקשה בשתי אצבעות</b>: התרחקות · <b>הקשה כפולה וגרירה</b>: זום באצבע אחת</li>
        <li><b>לחיצה</b> על פריט: פרטים, תמונה וקישורים לוויקיפדיה. בטלפון החלון נפתח מלמטה, ואפשר לגרור אותו למעלה או לסגור אותו בהחלקה למטה.</li>
        <li><b>המצפן</b> מחזיר את המבט לכיוון ההתחלתי, <b>◎</b> מציג את הכול, <b>⛶</b> עובר למסך מלא (מומלץ כשמחזיקים את הטלפון לרוחב), ו-<b>2D / 3D</b> עובר בין נוף תלת־ממדי למבט מלמעלה כמו במפה</li>
        <li>בטלפון, הקשה על מקום ריק מסתירה את הכפתורים ומחזירה אותם</li>
        <li><b>← →</b> במקלדת: מעבר לאירוע הבא או הקודם · <b>Esc</b>: סגירה</li>
        <li>פס הזמן התחתון: לחיצה או גרירה מעבירה אתכם לכל נקודה בזמן</li>
      </ul>
      <h3>השכבות</h3>
      <ul>
        <li>הציר בנוי כמו פוסטר. בתלת־ממד חציו העליון מתרומם ועומד כמו לוח, והשורות שלפניו עולות מהרצפה.</li>
        <li><b>דמוגרפיה</b>: גרף שטח של מספר היהודים בעולם (כתום). החלק הכחול הוא היהודים בארץ ישראל, והרצועה הבהירה היא טווח ההערכות.</li>
        <li><b>אירועים</b>: נקודה צבעונית, שם ותאריך, ממש מעל הגרף. קו מקווקו מוביל לגרף. אירועים חשובים מודגשים.</li>
        <li><b>שלטון</b>: מי שלט בארץ ישראל בכל תקופה. ריבונות או שלטון עצמי יהודי גבוהים יותר ומסומנים בפס זהוב.</li>
        <li><b>תקופות ההלכה</b> ו<b>תקופות</b>: שורות של תאים מעל ציר השנים, ורקע צבעוני עדין לכל תקופה.</li>
        <li><b>אישים</b>: מתחת לציר השנים, פס צבעוני לשנות החיים של כל אחד. בגלובוס הם מופיעים במקום שבו חיו באותה שנה.</li>
      </ul>
      <h3>הגלובוס</h3>
      <p>
        הכפתור <b>🌍 גלובוס</b> מציג את מפת העולם בשנה נבחרת. עיגולים זהובים מסמנים מרכזים של חיים יהודיים שהתקיימו באותה עת,
        סיכות מסמנות אירועים, וקשתות אדומות נעות מראות גלויות ונדידות. כפתור ▶ מריץ את הזמן, והחיצים קופצים לאירוע הבא.
        בחלון הפרטים אפשר לעבור בין ציר הזמן לגלובוס ולהגיע לכל מקום שקשור לאירוע.
      </p>
      <h3>שתי שיטות תיארוך</h3>
      <p>
        עד התקופה ההלניסטית המסורת (סדר עולם) והמחקר נותנים תאריכים שונים. למשל, חורבן הבית הראשון חל לפי המסורת בשנת 423 לפנה״ס, ולפי המחקר בשנת 586 לפנה״ס.
        במצב <b>שניהם</b>, האירוע עומד במקומו לפי המחקר, וקשת מקווקוות מובילה למקומו לפי המסורת. אירועים שידועים רק מהמסורת מסומנים בגוון חום.
        נתוני הדמוגרפיה מבוססים על המחקר בלבד, ולכן אינם משתנים בין שיטות התיארוך.
      </p>
      <h3>שימוש חופשי, בלי אחריות</h3>
      <p>
        מותר להעתיק, לשנות ולהשתמש בקוד, בתקצירים ובנתונים של האתר לכל מטרה, גם בלי לציין מקור (רישיון MIT No Attribution).
        האתר והמידע שבו ניתנים „כמות שהם” (AS IS), בלי אחריות מכל סוג. ייתכנו בהם טעויות בתאריכים, במספרים ובתיאורים,
        ואין להסתמך עליהם כמקור מוסמך.
      </p>
      <p className="muted">
        חומרים של אחרים נשארים ברישיון שלהם: קטעי הטקסט מוויקיפדיה ברישיון CC BY-SA 4.0 (שם הערך מצוין מתחת לכל קטע),
        התמונות נטענות מוויקישיתוף ולכל אחת מהן רישיון משלה, הגופן Heebo ברישיון SIL OFL 1.1, וקווי החוף מ-Natural Earth (נחלת הכלל).
        הרעיון של ציר זמן בצורת פוסטר קיבל השראה מהפוסטר „ציר זמן יהודי” באתר odyeda.com, אבל שום טקסט, נתון או גרפיקה לא הועתקו ממנו,
        ואין קשר בין האתרים. <LicenseLinks />
      </p>
    </>
  );
}

function HelpEn() {
  return (
    <>
      <h2>Welcome to Jewish History in 3D</h2>
      <p>
        The history of the Jewish people is laid out as a landscape. Time flows <b>from left to right</b>: the distant past on the left, the present on the right.
      </p>
      <ul>
        <li><b>Drag</b> (left button, or one finger): move along time and across the layers</li>
        <li><b>Wheel</b> (or pinch with two fingers): zoom in and out</li>
        <li><b>Right button</b> (or twist two fingers): turn the view</li>
        <li><b>Slide two fingers up or down</b>: tilt the view</li>
        <li><b>Double tap</b>: zoom in · <b>two-finger tap</b>: zoom out · <b>double tap and drag</b>: one-finger zoom</li>
        <li><b>Click</b> an item: details, a picture and links to Wikipedia. On a phone the card slides up from the bottom; drag it up for more, or swipe it down to close.</li>
        <li><b>The compass</b> turns the view back, <b>◎</b> shows everything, <b>⛶</b> goes full screen (best with the phone held sideways), and <b>2D / 3D</b> switches between the landscape and a flat, map-like view from above</li>
        <li>On a phone, tap an empty spot to hide or show the buttons</li>
        <li><b>← →</b> keys: previous or next event · <b>Esc</b>: close</li>
        <li>The bar at the bottom: click or drag to jump anywhere in time</li>
      </ul>
      <h3>The layers</h3>
      <ul>
        <li>The timeline is laid out like a poster. In 3D its upper half stands up like a board, and the rows in front rise from the floor.</li>
        <li><b>Demography</b>: an area chart of the world Jewish population (orange). The blue part is Jews in the Land of Israel, and the pale band is the range of estimates.</li>
        <li><b>Events</b>: a colored dot, name and date just above the chart, with a dotted line down to it. Important events are in bold.</li>
        <li><b>Rule</b>: who ruled the Land of Israel in each period. Jewish sovereignty or self-rule stands taller, with a gold stripe.</li>
        <li><b>Rabbinic eras</b> and <b>Eras</b>: rows of cells above the year axis, and a light tint for each period.</li>
        <li><b>People</b>: below the year axis, a colored bar for each lifespan. On the globe they appear where they lived in that year.</li>
      </ul>
      <h3>The globe</h3>
      <p>
        <b>🌍 Globe</b> shows the world in a chosen year. Gold dots mark the centers of Jewish life at that time,
        pins mark events, and moving red arcs show exiles and migrations. ▶ plays through time and the arrows jump to the next event.
        From the details panel you can switch between the timeline and the globe and visit every place linked to an event.
      </p>
      <h3>Two dating systems</h3>
      <p>
        Until the Hellenistic period, tradition (Seder Olam) and scholarship give different dates. For example, the First Temple was destroyed in 423 BCE by tradition, and in 586 BCE according to scholarship.
        In <b>Both</b> mode an item stands at its academic date, and a dashed arc leads to its traditional date. Items known only from tradition are shown in brown.
        Population figures come from scholarship only, so they don't change between dating systems.
      </p>
      <h3>Free to use, no warranty</h3>
      <p>
        You may copy, change and use this site's code, summaries and data for any purpose, without even giving credit (MIT No Attribution license).
        The site and its information are provided “as is”, without warranty of any kind. They may contain mistakes in dates, numbers and descriptions,
        and should not be relied on as an authoritative source.
      </p>
      <p className="muted">
        Material by others keeps its own license: the Wikipedia excerpts are under CC BY-SA 4.0 (the article is named under each excerpt),
        the images load from Wikimedia Commons and each has its own license, the Heebo font is under the SIL OFL 1.1, and the coastlines come from Natural Earth (public domain).
        The idea of a poster-style timeline was inspired by the “Jewish Timeline” poster on odyeda.com, but no text, data or graphics were copied from it,
        and the sites are not affiliated. <LicenseLinks />
      </p>
    </>
  );
}

const REPO = 'https://github.com/dovz11/jewish-history-map/blob/main/';

function LicenseLinks() {
  return (
    <>
      <a href={`${REPO}LICENSE`} target="_blank" rel="noreferrer">{t('licenseLink')}</a>
      {' · '}
      <a href={`${REPO}THIRD_PARTY_NOTICES.md`} target="_blank" rel="noreferrer">{t('noticesLink')}</a>
    </>
  );
}
