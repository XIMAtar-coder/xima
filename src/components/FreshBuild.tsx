import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * A tab left open keeps running the bundle it loaded, whatever has been
 * published since: after a Publish one person was in the new video room and
 * the other, on a tab opened earlier, still in the old one. Nothing here
 * interrupts a page: we look at the published index.html now and then, and
 * when its entry script is no longer ours, the next navigation becomes a
 * full load.
 */
const ENTRY = /\/assets\/index-[\w-]+\.js/;
const CHECK_EVERY_MS = 2 * 60 * 1000;

const loadedEntry = (): string | null => {
  const script = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]');
  return script ? (script.getAttribute('src') || '').match(ENTRY)?.[0] ?? null : null;
};

export const FreshBuild = () => {
  const { pathname } = useLocation();
  const stale = useRef(false);
  const lastCheck = useRef(0);
  const firstPath = useRef(pathname);

  useEffect(() => {
    const mine = loadedEntry();
    if (!mine) return; // dev server, or a build without a hashed entry

    const check = async () => {
      if (stale.current || Date.now() - lastCheck.current < CHECK_EVERY_MS) return;
      lastCheck.current = Date.now();
      try {
        const res = await fetch('/index.html', { cache: 'no-store' });
        if (!res.ok) return;
        const published = (await res.text()).match(ENTRY)?.[0];
        if (published && published !== mine) stale.current = true;
      } catch {
        // offline, or the native app with its bundled files: nothing to compare
      }
    };

    check();
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    return () => { document.removeEventListener('visibilitychange', onVisible); window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (pathname === firstPath.current) return;
    firstPath.current = pathname;
    // Between two pages, with nothing half-typed on screen: take the new build.
    if (stale.current) window.location.reload();
  }, [pathname]);

  return null;
};

export default FreshBuild;
