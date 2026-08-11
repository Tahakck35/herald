globalThis.__HeraldAdapter = {
  id: "youtube",
  name: "YouTube",
  activityType: 3,
  poll: 1000,

  getState() {
    if (!location.pathname.startsWith("/watch")) return null;

    const v = HeraldUtil.video();
    if (!v) return null;

    let title = HeraldUtil.text(
      "ytd-watch-metadata h1 yt-formatted-string, #above-the-fold #title h1 yt-formatted-string, h1.title.ytd-video-primary-info-renderer"
    );

    if (!title) {
      const dt = document.title.replace(/^\(\d+\)\s*/, "").replace(/\s*-\s*YouTube$/, "").trim();
      if (dt && dt !== "YouTube") title = dt;
    }
    if (!title) return null;

    const videoId = new URLSearchParams(location.search).get("v");

    return {
      title,
      subtitle: HeraldUtil.text(
        "ytd-watch-metadata #owner ytd-channel-name a, #above-the-fold #owner ytd-channel-name a, ytd-video-owner-renderer ytd-channel-name a"
      ),
      isPlaying: !v.paused && !v.ended,
      muted: v.muted || v.volume === 0,
      currentTime: v.currentTime,
      duration: isFinite(v.duration) ? v.duration : 0,
      isLive: !isFinite(v.duration) || v.duration === Infinity,
      imageUrl: videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : "",
      url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : location.href
    };
  }
};
