import { useEffect, useState } from 'react';
import { t } from '../i18n';
import { canFullscreen, isIOS, isStandalone, toggleFullscreen, useIsFullscreen, usePhoneLandscape } from '../lib/fullscreen';
import { useStore } from '../store';

/**
 * Floating map buttons, as in Google Earth: a compass (shows the heading; tap to face forward
 * and untilt), "show everything", full screen, and the 2D / 3D switch.
 */
export function MapButtons() {
  const dim = useStore((s) => s.dim);
  const view = useStore((s) => s.view);
  const full = useIsFullscreen();
  const st = useStore.getState();
  return (
    <div className="map-buttons">
      {view === 'timeline' && dim === '3d' && (
        <button className="fab compass" onClick={() => st.cameraCommand('north')} title={t('compass')} aria-label={t('compass')}>
          <svg viewBox="0 0 40 40" width="30" height="30" aria-hidden>
            <g className="needle">
              <path d="M20 4 26 20H14Z" fill="#c0392b" />
              <path d="M20 36 14 20h12Z" fill="#9c8a64" />
              <circle cx="20" cy="20" r="2.4" fill="#fffaf0" />
            </g>
          </svg>
        </button>
      )}
      <button className="fab" onClick={() => st.cameraCommand('home')} title={t('home')} aria-label={t('home')}>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {canFullscreen() && !isStandalone() && (
        <button className={`fab${full ? ' on' : ''}`} onClick={toggleFullscreen} title={t(full ? 'exitFullscreen' : 'fullscreen')} aria-label={t(full ? 'exitFullscreen' : 'fullscreen')} aria-pressed={full}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <path
              d={full ? 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5' : 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'}
              stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
      <div className="fab dim-toggle" role="radiogroup" aria-label={t('dimLabel')}>
        <button role="radio" aria-checked={dim === '3d'} className={dim === '3d' ? 'on' : ''} onClick={() => st.setDim('3d')} title={t('dim3dTip')}>{t('dim3d')}</button>
        <button role="radio" aria-checked={dim === '2d'} className={dim === '2d' ? 'on' : ''} onClick={() => st.setDim('2d')} title={t('dim2dTip')}>{t('dim2d')}</button>
      </div>
    </div>
  );
}

/**
 * When a phone is turned sideways, offer full screen once per visit: in landscape the browser's
 * bars eat a big share of the height. On iPhone (no full-screen API) explain "Add to Home Screen".
 */
export function LandscapeHint() {
  const landscape = usePhoneLandscape();
  const full = useIsFullscreen();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('jhm-landscape-hint') === '1');
  const show = landscape && !full && !dismissed && !isStandalone() && (canFullscreen() || isIOS());
  const dismiss = () => { sessionStorage.setItem('jhm-landscape-hint', '1'); setDismissed(true); };
  useEffect(() => {
    if (!show) return;
    const id = setTimeout(dismiss, 9000);
    return () => clearTimeout(id);
  }, [show]);
  if (!show) return null;
  return (
    <div className="landscape-hint" role="status">
      {canFullscreen() ? (
        <button className="primary" onClick={() => { toggleFullscreen(); dismiss(); }}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {t('landscapeFull')}
        </button>
      ) : (
        <span>{t('landscapeIOS')}</span>
      )}
      <button className="close" onClick={dismiss} aria-label={t('dismiss')}>×</button>
    </div>
  );
}
