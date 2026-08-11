// Adaptoru calistirir, normalize eder, service worker'a gonderir.

(() => {
  const adapter = globalThis.__HeraldAdapter;
  if (!adapter) return;

  const DEBUG = true;
  const POLL_MS = adapter.poll || 1000;

  function push() {
    let payload = null;

    try {
      payload = adapter.getState();
    } catch (e) {
      payload = null;
      if (DEBUG) console.warn("[Herald]", adapter.id, "getState hatasi", e);
    }

    if (payload && payload.title) {
      payload.site = adapter.id;
      payload.siteName = adapter.name;
      payload.activityType = payload.activityType || adapter.activityType || 3;
      payload.sampledAt = Date.now();
      payload.currentTime = payload.currentTime || 0;
      payload.duration = payload.duration || 0;
      payload.muted = !!payload.muted;
      payload.isLive = !!payload.isLive;
    } else {
      payload = null;
    }

    if (DEBUG) console.debug("[Herald]", adapter.id, payload);

    try {
      const p = chrome.runtime.sendMessage({ type: "herald:state", payload });
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch (e) {
      // uzanti yeniden yuklendiyse sekmeyi yenile
    }
  }

  setInterval(push, POLL_MS);
  push();
})();
