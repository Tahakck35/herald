globalThis.__HeraldAdapter = {
  id: "netflix",
  name: "Netflix",
  activityType: 3,
  poll: 1000,

  // kontroller gizlenince bolum bilgisi DOM'dan siliniyor, son dolu degeri sakla
  _cache: { path: "", title: "", subtitle: "" },

  getState() {
    if (!location.pathname.startsWith("/watch")) return null;

    const v = HeraldUtil.video();
    if (!v) return null;

    // <div data-uia="video-title"><h4>Dizi</h4><span>S3:B7</span><span>Bolum adi</span></div>
    const box = document.querySelector('[data-uia="video-title"]');

    let title = "";
    let subtitle = "";

    if (box) {
      const h4 = box.querySelector("h4");
      const spans = [...box.querySelectorAll("span")].map((s) => s.textContent.trim()).filter(Boolean);

      title = h4 ? h4.textContent.trim() : box.textContent.trim();
      subtitle = spans.join(" ");
    }

    const site = HeraldSite.data;

    // Netflix'in kendi state'i onceliklidir: tutarli ve kontroller gizlenince kaybolmaz.
    // DOM sadece state okunamazsa devreye girer.
    if (site && site.title) title = site.title;
    if (site && site.subtitle) subtitle = site.subtitle;

    if (!title) {
      const dt = document.title.replace(/\s*[-|]\s*Netflix.*$/i, "").trim();
      if (dt && dt.toLowerCase() !== "netflix") title = dt;
    }
    if (!title) return null;

    const c = this._cache;

    if (c.path !== location.pathname) {
      c.path = location.pathname;
      c.title = "";
      c.subtitle = "";
    }

    if (title) c.title = title;
    if (subtitle) c.subtitle = subtitle;

    return {
      title: title || c.title,
      subtitle: subtitle || c.subtitle,
      isPlaying: !v.paused && !v.ended,
      muted: v.muted || v.volume === 0,
      currentTime: v.currentTime,
      duration: isFinite(v.duration) ? v.duration : 0,
      imageUrl: (site && site.image) || "",
      url: location.href
    };
  }
};