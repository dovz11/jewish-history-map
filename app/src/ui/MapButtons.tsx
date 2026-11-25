import { t } from '../i18n';
import { useStore } from '../store';

/**
 * Floating map buttons, as in Google Earth: a compass (shows the heading; tap to face forward
 * and untilt), "show everything", and the 2D / 3D switch.
 */
export function MapButtons() {
  const dim = useStore((s) => s.dim);
  const view = useStore((s) => s.view);
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
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="fab dim-toggle" role="radiogroup" aria-label={t('dimLabel')}>
        <button role="radio" aria-checked={dim === '3d'} className={dim === '3d' ? 'on' : ''} onClick={() => st.setDim('3d')} title={t('dim3dTip')}>{t('dim3d')}</button>
        <button role="radio" aria-checked={dim === '2d'} className={dim === '2d' ? 'on' : ''} onClick={() => st.setDim('2d')} title={t('dim2dTip')}>{t('dim2d')}</button>
      </div>
    </div>
  );
}
