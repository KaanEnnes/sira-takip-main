chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "snrOpenIncognito" && msg.url) {
    chrome.windows.create({ url: msg.url, incognito: true });
  }
});
