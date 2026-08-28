chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "snrOpenIncognito" && msg.url) {
    chrome.windows.create({ url: msg.url, incognito: true });
  }
  // Paralel arama işçileri için: her işçi kendi sekmesinde çalışır.
  if (msg && msg.type === "snrOpenTab" && msg.url) {
    chrome.tabs.create({ url: msg.url, active: false });
  }
});
