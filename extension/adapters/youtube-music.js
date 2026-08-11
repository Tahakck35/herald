globalThis.__HeraldAdapter = {
  id: "youtube-music",
  name: "YouTube Music",
  activityType: 2,
  poll: 1000,

  getState() {
    const v = HeraldUtil.video();
    if (!v) return null;

    const ms = HeraldMS.data;

    const title = (ms && ms.title) || HeraldUtil.text("ytmusic-player-bar .title");
    if (!title) return null;

    const artist =
      (ms && ms.artist) ||
      HeraldUtil.text("ytmusic-player-bar .byline yt-formatted-string a") ||
      HeraldUtil.text("ytmusic-player-bar .byline");

    let image = (ms && ms.artwork) || "";
    if (!image) {
      const img = document.querySelector("ytmusic-player-bar img.image, #song-image img");
      if (img && img.src) image = img.src;
    }

    return {
      title,
      subtitle: artist,
      isPlaying: !v.paused && !v.ended,
      muted: v.muted || v.volume === 0,
      currentTime: v.currentTime,
      duration: isFinite(v.duration) ? v.duration : 0,
      imageUrl: image,
      url: location.href
    };
  }
};
