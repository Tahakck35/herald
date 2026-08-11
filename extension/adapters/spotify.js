globalThis.__HeraldAdapter = {
  id: "spotify",
  name: "Spotify",
  activityType: 2,
  poll: 1000,

  // sekme arka plandayken Spotify'in ilerleme metni donuyor.
  // son degisimi capa alip aradaki sureyi kendimiz sayiyoruz.
  _anchor: { text: "", seconds: 0, at: 0, key: "" },

  getState() {
    const ms = HeraldMS.data;

    const title = (ms && ms.title) || HeraldUtil.text('[data-testid="context-item-link"]');
    if (!title) return null;

    const artist =
      (ms && ms.artist) ||
      HeraldUtil.text('[data-testid="context-item-info-artist"]') ||
      HeraldUtil.text('[data-testid="now-playing-widget"] a[href^="/artist"]');

    const posText = HeraldUtil.text('[data-testid="playback-position"]');
    const duration = HeraldUtil.parseTime(HeraldUtil.text('[data-testid="playback-duration"]'));

    const key = `${title}|${artist}`;
    const a = this._anchor;

    if (posText && (posText !== a.text || key !== a.key)) {
      a.text = posText;
      a.key = key;
      a.seconds = HeraldUtil.parseTime(posText);
      a.at = Date.now();
    }

    // Spotify playbackState ayarlamiyor, buton etiketi dile bagli.
    // Sekme onde: sure metni ilerliyor mu? Arka planda: sekme basligi sarki mi?
    let isPlaying;
    if (!document.hidden) {
      isPlaying = !!a.at && Date.now() - a.at < 2500;
    } else {
      isPlaying = !/^spotify/i.test(document.title.trim());
    }

    let currentTime = a.seconds;
    if (isPlaying && a.at) currentTime += (Date.now() - a.at) / 1000;
    if (duration) currentTime = Math.min(currentTime, duration);

    let image = (ms && ms.artwork) || "";
    if (!image) {
      const img = document.querySelector('[data-testid="cover-art-image"], [data-testid="now-playing-widget"] img');
      if (img && img.src) image = img.src;
    }

    return {
      title,
      subtitle: artist,
      isPlaying,
      muted: false,
      currentTime,
      duration,
      imageUrl: image,
      url: location.href
    };
  }
};