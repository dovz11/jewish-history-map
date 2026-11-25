import { useEffect } from 'react';
import { formatYear, gematria, toAnnoMundi } from '../lib/dates';
import { activeCenters, globeEventOrder } from '../lib/globe';
import { U_MAX, uToYear, yearToU, YEAR_MAX } from '../lib/timeScale';
import { useStore } from '../store';

/** Units of the (non-linear) time scale advanced per second while playing. */
const PLAY_SPEED = 9;

/** Year display, play/pause and stepping for the globe view. */
export function GlobeControls() {
  const year = useStore((s) => s.globeYear);
  const playing = useStore((s) => s.playing);
  const mode = useStore((s) => s.mode);

  useEffect(() => {
    if (!playing) return;
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const st = useStore.getState();
      const u = yearToU(st.globeYear) + dt * PLAY_SPEED;
      if (u >= yearToU(2026)) {
        st.setGlobeYear(2026);
        st.setPlaying(false);
        return;
      }
      st.setGlobeYear(uToYear(u));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const step = (dir: 1 | -1) => {
    const st = useStore.getState();
    st.setPlaying(false);
    const order = globeEventOrder(mode);
    const y = st.globeYear;
    const next = dir === 1 ? order.find((o) => o.y > y + 0.5) : [...order].reverse().find((o) => o.y < y - 0.5);
    if (!next) return;
    st.setGlobeYear(next.y);
    st.select({ type: 'event', id: next.e.id });
    st.focusPlace(next.e.places![0]);
  };

  const y = Math.round(year);
  const centersNow = activeCenters(year).length;
  return (
    <div className="globe-controls" role="group" aria-label="שליטה בזמן בגלובוס">
      <button onClick={() => step(-1)} title="האירוע הקודם" aria-label="האירוע הקודם">→</button>
      <button
        className="play"
        onClick={() => {
          const st = useStore.getState();
          if (!playing && st.globeYear >= YEAR_MAX - 5) st.setGlobeYear(-1900);
          st.setPlaying(!playing);
        }}
        aria-label={playing ? 'עצירה' : 'הפעלה'}
        title={playing ? 'עצירה' : 'נסיעה בזמן'}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <button onClick={() => step(1)} title="האירוע הבא" aria-label="האירוע הבא">←</button>
      <div className="globe-year">
        <strong>{formatYear(y)}</strong>
        <span>{gematria(toAnnoMundi(y))}</span>
      </div>
      <input
        type="range"
        min={0}
        max={U_MAX}
        step={0.1}
        // in RTL the range minimum sits on the right, matching the past-on-the-right timeline
        value={yearToU(year)}
        aria-label="שנה"
        onChange={(e) => {
          useStore.getState().setPlaying(false);
          useStore.getState().setGlobeYear(Math.round(uToYear(+e.target.value)));
        }}
      />
      <small className="muted">{centersNow} מרכזים יהודיים פעילים</small>
    </div>
  );
}
