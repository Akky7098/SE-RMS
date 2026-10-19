// Production only: keep development hot reload free of service worker caches.
export function registerServiceWorker() {
  if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
  const register = () => {
    const base = new URL(`${process.env.PUBLIC_URL || ''}/`, window.location.origin);
    if (base.origin !== window.location.origin) return;
    navigator.serviceWorker.register(new URL('service-worker.js', base).href, {
      scope: base.pathname,
      updateViaCache: 'none'
    }).catch(error => console.error('[SE-ERP] Service worker registration failed:', error));
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
