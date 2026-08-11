globalThis.__HeraldAdapter = {
  id: "disney-plus",
  name: "Disney+",
  activityType: 3,
  poll: 1000,

  getState() {
    const v = HeraldUtil.video();
    if (!v || (!v.src && !v.currentSrc)) return null;

    const ms = HeraldMS.data;

    let title = HeraldUtil.text(".title-field") || (ms && ms.title) || "";
    const subtitle = HeraldUtil.text(".subtitle-field") || (ms && ms.artist) || "";

    if (!title) {
      const dt = document.title.replace(/\s*[-|]\s*Disney\+.*$/i, "").trim();
      if (dt && !/^disney/i.test(dt)) title = dt;
    }
    if (!title) return null;

    return {
      title,
      subtitle,
      isPlaying: !v.paused && !v.ended,
      muted: v.muted || v.volume === 0,
      currentTime: v.currentTime,
      duration: isFinite(v.duration) ? v.duration : 0,
      imageUrl: (ms && ms.artwork) || "",
      url: location.href
    };
  }
};
