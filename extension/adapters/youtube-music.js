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

    // Kuyruk tek bir <video> elementinde calindigi icin duration bazen
    // tum kuyrugu gosteriyor. Oynatici cubugundaki "0:34 / 2:53" metni
    // her zaman gecerli parcayi verir; once ondan oku.
    let currentTime = v.currentTime;
    let duration = isFinite(v.duration) ? v.duration : 0;

    const info = HeraldUtil.text("ytmusic-player-bar .time-info");
    const parts = info.split("/");

    if (parts.length === 2) {
      const shownNow = HeraldUtil.parseTime(parts[0]);
      const shownTotal = HeraldUtil.parseTime(parts[1]);

      if (shownTotal > 0) {
        duration = shownTotal;
        currentTime = Math.min(shownNow, shownTotal);
      }
    }

    // metin okunamadiysa en azindan tutarsiz veri gonderme
    if (duration > 0 && currentTime > duration) currentTime = duration;

    return {
      title,
      subtitle: artist,
      isPlaying: !v.paused && !v.ended,
      muted: v.muted || v.volume === 0,
      currentTime,
      duration,
      imageUrl: image,
      url: location.href
    };
  }
};