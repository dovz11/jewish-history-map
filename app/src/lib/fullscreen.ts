import { useSyncExternalStore } from 'react';

/**
 * Full screen: hides the browser's address bar and system bars, which on a phone held sideways
 * take a fifth of the height. iPhones don't allow it for web pages; there "Add to Home Screen"
 * (see manifest.webmanifest) opens the site without browser bars instead.
 */
export const canFullscreen = () => typeof document !== 'undefined' && !!document.fullscreenEnabled;

/**
 * Running as an installed app (already without browser bars).
 * Chrome also reports display-mode "fullscreen" while the page itself is in full screen through
 * the Fullscreen API, so that case doesn't count: the exit button must stay available then.
 */
export const isStandalone = () =>
  typeof matchMedia !== 'undefined' &&
  !document.fullscreenElement &&
  (matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches);

export const isIOS = () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);

export async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
  } catch {
    /* refused (no user gesture, or not allowed in this browser) */
  }
}

const subscribe = (cb: () => void) => {
  document.addEventListener('fullscreenchange', cb);
  return () => document.removeEventListener('fullscreenchange', cb);
};
export const useIsFullscreen = () => useSyncExternalStore(subscribe, () => !!document.fullscreenElement, () => false);

/** Phone held sideways: a touch screen that is short and wide. */
const LANDSCAPE_Q = '(orientation: landscape) and (max-height: 520px) and (pointer: coarse)';
const subscribeLandscape = (cb: () => void) => {
  const m = matchMedia(LANDSCAPE_Q);
  m.addEventListener('change', cb);
  return () => m.removeEventListener('change', cb);
};
export const usePhoneLandscape = () => useSyncExternalStore(subscribeLandscape, () => matchMedia(LANDSCAPE_Q).matches, () => false);
