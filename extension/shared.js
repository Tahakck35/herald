// Izole dunyada calisir. Adaptorlerden once yuklenir.

globalThis.HeraldMS = { data: null };
globalThis.HeraldSite = { data: null };

window.addEventListener("message", (e) => {
  if (e.source !== window) return;
  if (!e.data || typeof e.data !== "object" || !("__herald_ms" in e.data)) return;
  globalThis.HeraldMS.data = e.data.__herald_ms;
  globalThis.HeraldSite.data = e.data.__herald_site || null;
});

globalThis.HeraldUtil = {
  // "12:34" veya "1:02:03" -> saniye
  parseTime(text) {
    if (!text) return 0;

    const parts = String(text).trim().split(":").map((n) => parseInt(n, 10));
    if (parts.some(isNaN)) return 0;

    return parts.reduce((acc, n) => acc * 60 + n, 0);
  },

  text(selector, root) {
    const el = (root || document).querySelector(selector);
    return el ? el.textContent.trim() : "";
  },

  video() {
    const list = [...document.querySelectorAll("video")];
    return list.find((v) => v.src || v.currentSrc) || list[0] || null;
  }
};