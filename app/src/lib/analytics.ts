import { useStore } from '../store';

/**
 * Visitor statistics through Umami Cloud (https://umami.is): no cookies and no personal data,
 * so no consent banner is needed. The dashboard shows visits, unique visitors, visit time,
 * countries, devices, referrers, and the custom events sent below.
 *
 * UMAMI_ID is the "Website ID" from the Umami dashboard (Settings → Websites). It is public by
 * design (it appears in every page that uses it). Leave it empty to turn statistics off.
 */
const UMAMI_ID = '19fb6905-8da5-4b3c-a737-6aa7ada644b5';
const LIVE_HOST = 'dovz11.github.io';
/** Whether visits are counted (the Help window mentions it only then). */
export const analyticsOn = !!UMAMI_ID;

type Umami = { track: (name?: string | object, data?: Record<string, string | number>) => void };
declare global {
  interface Window {
    umami?: Umami;
  }
}

const queue: Array<(u: Umami) => void> = [];
const send = (fn: (u: Umami) => void) => {
  if (window.umami) fn(window.umami);
  else queue.push(fn);
};
const event = (name: string, data?: Record<string, string | number>) => send((u) => u.track(name, data));

export function startAnalytics() {
  if (!UMAMI_ID || location.hostname !== LIVE_HOST) return;

  const s = document.createElement('script');
  s.defer = true;
  s.src = 'https://cloud.umami.is/script.js';
  s.dataset.websiteId = UMAMI_ID;
  // The app rewrites the URL hash as you move around; counting each change as a page view would
  // flood the numbers, so the one page view is sent by hand.
  s.dataset.autoTrack = 'false';
  s.onload = () => {
    const u = window.umami;
    if (!u) return;
    u.track();
    queue.splice(0).forEach((fn) => fn(u));
  };
  document.head.appendChild(s);

  // What people use. Umami lists these under Events, with their values.
  useStore.subscribe((st, prev) => {
    if (st.selected && st.selected !== prev.selected) {
      const r = st.selected;
      event('open-item', { type: r.type, item: 'id' in r ? r.id : String(r.year) });
    }
    if (st.dim !== prev.dim) event('switch-dim', { dim: st.dim });
    if (st.view !== prev.view) event('switch-view', { view: st.view });
    if (st.lang !== prev.lang) event('switch-lang', { lang: st.lang });
    if (st.helpOpen && !prev.helpOpen) event('open-help');
  });

  // Time on site: Umami measures a visit from its first to its last event, so a visitor who just
  // looks around would show 0 seconds. These marks count only time with the tab in view, and also
  // show directly how many visitors stayed 1, 3, 10 and 30 minutes.
  const marks = [1, 3, 10, 30];
  let seen = 0;
  let last = performance.now();
  let visible = document.visibilityState === 'visible';
  const tick = () => {
    const now = performance.now();
    if (visible) seen += now - last;
    last = now;
    visible = document.visibilityState === 'visible';
    while (marks.length && seen >= marks[0] * 60_000) event('time-on-site', { minutes: marks.shift()! });
    if (!marks.length) clearInterval(timer);
  };
  const timer = setInterval(tick, 10_000);
  document.addEventListener('visibilitychange', tick);
}
