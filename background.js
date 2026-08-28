chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "snrOpenIncognito" && msg.url) {
    chrome.windows.create({ url: msg.url, incognito: true });
  }
  // Paralel arama işçileri için: her işçi kendi sekmesinde çalışır.
  if (msg && msg.type === "snrOpenTab" && msg.url) {
    chrome.tabs.create({ url: msg.url, active: false });
  }
  // İşi biten arka plan/gizli sekmeler kendini kapatır; kaynak/sekme
  // birikmesini önler. Kullanıcının orijinal (tetikleyen) sekmesi bu
  // mesajı hiç göndermez, bu yüzden yanlışlıkla kapanmaz.
  if (msg && msg.type === "snrCloseTab" && sender.tab && sender.tab.id) {
    chrome.tabs.remove(sender.tab.id);
  }
});
