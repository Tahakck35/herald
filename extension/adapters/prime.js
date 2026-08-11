globalThis.__HeraldAdapter = {
  id: "prime-video",
  name: "Prime Video",
  activityType: 3,
  poll: 1000,

  getState() {
    const v = HeraldUtil.video();
    if (!v || (!v.src && !v.currentSrc)) return null;

    const ms = HeraldMS.data;

    // class adlari degisebiliyor, "icerir" eslesmesi kullan
    const titleEl = document.querySelector('[class*="atvwebplayersdk-title-text"]');
    let title = titleEl ? titleEl.textContent.trim() : "";
    if (!title && ms && ms.title) title = ms.title;
    if (!title) return null;

    // alt bilgi: bilinen class'lar, olmazsa oynaticidaki diger metinler
    let subtitle =
      HeraldUtil.text('[class*="atvwebplayersdk-episode-info"]') ||
      HeraldUtil.text('[class*="atvwebplayersdk-subtitle-text"]');

    if (!subtitle) {
      subtitle = [...document.querySelectorAll('[class*="atvwebplayersdk"]')]
        .filter((el) => el.children.length === 0)
        .map((el) => el.textContent.trim())
        .filter((t) => t && t !== title && t.length < 120)
        .slice(0, 1)
        .join(" ");
    }

    if (!subtitle && ms && ms.artist) subtitle = ms.artist;

    // gorsel: mediaSession -> og:image
    let image = (ms && ms.artwork) || "";
    if (!image) {
      const og = document.querySelector('meta[property="og:image"], link[rel="image_src"]');
      if (og) image = og.content || og.href || "";
    }
    if (image && !/^https:\/\//.test(image)) image = "";

    return {
      title,
      subtitle,
      isPlaying: !v.paused && !v.ended,
      muted: v.muted || v.volume === 0,
      currentTime: v.currentTime,
      duration: isFinite(v.duration) ? v.duration : 0,
      imageUrl: image,
      url: location.href
    };
  }
};