globalThis.__HeraldAdapter = {
  id: "max",
  name: "Max",
  activityType: 3,
  poll: 1000,

  getState() {
    const v = HeraldUtil.video();
    if (!v || (!v.src && !v.currentSrc)) return null;

    const ms = HeraldMS.data;

    let title = (ms && ms.title) || HeraldUtil.text('[data-testid="player-ux-asset-title"]');
    let subtitle = (ms && ms.artist) || HeraldUtil.text('[data-testid="player-ux-asset-subtitle"]');

    if (!title) {
      const dt = document.title.replace(/\s*[-|]\s*Max.*$/i, "").trim();
      if (dt && dt.toLowerCase() !== "max") title = dt;
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
