(function () {
  // bellayazilim.com'dan alınan açık mavi/turkuaz tema.
  const THEME = {
    teal: "#1fae96",
    tealDark: "#158a76",
    navy: "#16213a",
    bgLight: "#eafbfa",
    bgWhite: "#ffffff",
    border: "#bfe9e3",
    text: "#16213a",
    danger: "#d64545",
  };

  function isInsideAdBlock(el) {
    return !!el.closest(
      '#tads, #tadsb, #bottomads, [data-text-ad], [aria-label="Ads"], div[data-rw]'
    );
  }

  function isVisible(el) {
    return !!el.offsetParent || el.getClientRects().length > 0;
  }

  // Her organik sonuç için TEK link seçiyoruz: h3 başlıklarından yola çıkıp
  // en yakın sonuç kutusunu (div.g / data-hveid vb.) bulup tekilleştiriyoruz,
  // böylece sitelinks / gizli alt öğeler yüzünden sıra numarası şaşmıyor.
  function getResultLinks() {
    const container = document.querySelector("#search") || document.body;
    const h3s = Array.from(container.querySelectorAll("h3"));
    const seenBlocks = new Set();
    const links = [];

    for (const h3 of h3s) {
      if (isInsideAdBlock(h3)) continue;
      if (!isVisible(h3)) continue;

      const link = h3.closest("a");
      if (!link || !link.href) continue;
      if (link.href.startsWith("https://www.google.com/search")) continue;

      const block =
        h3.closest("div.g, div[data-hveid], div.MjjYud, div.Ww4FFb") || h3;
      if (seenBlocks.has(block)) continue;
      seenBlocks.add(block);

      links.push(link);
    }
    return links;
  }

  function getStartIndex() {
    const params = new URLSearchParams(location.search);
    const start = parseInt(params.get("start"), 10);
    return Number.isFinite(start) ? start : 0;
  }

  function getQueryKey() {
    const params = new URLSearchParams(location.search);
    return "snr:" + (params.get("q") || "");
  }

  function loadPageCounts(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "{}");
    } catch {
      return {};
    }
  }

  function savePageCounts(key, counts) {
    try {
      localStorage.setItem(key, JSON.stringify(counts));
    } catch {}
  }

  function getBaseNumber(key, start) {
    if (start === 0) return 0;
    const counts = loadPageCounts(key);
    return counts[start] !== undefined ? counts[start] : start;
  }

  function makeBadge(n) {
    const badge = document.createElement("span");
    badge.className = "snr-badge";
    badge.textContent = String(n);
    badge.style.cssText = [
      "all: initial !important",
      "box-sizing: content-box !important",
      "direction: ltr !important",
      "unicode-bidi: bidi-override !important",
      "writing-mode: horizontal-tb !important",
      "white-space: nowrap !important",
      "display: inline-flex !important",
      "align-items: center !important",
      "justify-content: center !important",
      "min-width: 22px !important",
      "width: auto !important",
      "height: 22px !important",
      "padding: 0 6px !important",
      "margin-right: 8px !important",
      "border-radius: 11px !important",
      `background: ${THEME.teal} !important`,
      "color: #fff !important",
      "font-size: 12px !important",
      "line-height: 22px !important",
      "font-weight: 700 !important",
      "font-style: normal !important",
      "font-variant: normal !important",
      "font-family: Arial, Helvetica, sans-serif !important",
      "vertical-align: middle !important",
    ].join(";");
    return badge;
  }

  // Üst öğelerden miras kalan bir dikey/yatay ayna (transform: scaleX/scaleY(-1))
  // varsa, rozeti kendi üzerinde ters yönde aynalayarak görsel olarak düzeltir.
  // Badge DOM'a eklendikten SONRA çağrılmalı (aksi halde ataları görünmez).
  function fixMirroring(badge) {
    let flipX = false;
    let flipY = false;
    let ancestor = badge.parentElement;
    while (ancestor) {
      const t = getComputedStyle(ancestor).transform;
      if (t && t !== "none") {
        const m = new DOMMatrix(t);
        if (m.a < 0) flipX = !flipX;
        if (m.d < 0) flipY = !flipY;
      }
      ancestor = ancestor.parentElement;
    }
    if (flipX || flipY) {
      badge.style.setProperty(
        "transform",
        `scale(${flipX ? -1 : 1}, ${flipY ? -1 : 1})`,
        "important"
      );
    }
  }

  // Reklam olmayan her organik sonucun soluna, sayfalar boyunca devam eden
  // bir sıra numarası ekler (4. sayfada 31,32,33... gibi).
  function numberResults() {
    document.querySelectorAll(".snr-badge").forEach((b) => b.remove());

    const links = getResultLinks();
    const key = getQueryKey();
    const start = getStartIndex();
    let n = getBaseNumber(key, start);

    links.forEach((link) => {
      n += 1;
      const badge = makeBadge(n);
      link.insertBefore(badge, link.firstChild);
      fixMirroring(badge);
    });

    const counts = loadPageCounts(key);
    counts[start + 10] = n;
    savePageCounts(key, counts);
  }

  function normalizeSite(raw) {
    return (raw || "")
      .trim()
      .toLocaleLowerCase("tr")
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "");
  }

  // Sağ üstte sabit, sürüklenebilir/boyutlandırılabilir panel: sayfa
  // gezinme + sıra takip kutusu.
  function ensurePanel() {
    if (document.getElementById("snr-pagenav")) return;

    const bar = document.createElement("div");
    bar.id = "snr-pagenav";

    let savedPos = null;
    try {
      savedPos = JSON.parse(localStorage.getItem("snrPanelPos") || "null");
    } catch {}

    bar.style.cssText = [
      "all: initial !important",
      "position: fixed !important",
      savedPos ? `top: ${savedPos.top}px !important` : "top: 90px !important",
      savedPos
        ? `left: ${savedPos.left}px !important`
        : "right: 24px !important",
      "z-index: 2147483647 !important",
      "display: flex !important",
      "flex-direction: column !important",
      "font-family: 'Segoe UI', Arial, Helvetica, sans-serif !important",
      "overflow: auto !important",
      "min-width: 200px !important",
      "min-height: 120px !important",
      "max-width: 90vw !important",
      "max-height: 90vh !important",
      savedPos
        ? `width: ${savedPos.width}px !important`
        : "width: 240px !important",
      savedPos ? `height: ${savedPos.height}px !important` : "",
      "padding: 0 !important",
      "box-sizing: border-box !important",
      `background: ${THEME.bgWhite} !important`,
      `border: 1px solid ${THEME.border} !important`,
      "border-radius: 18px !important",
      "box-shadow: 0 8px 24px rgba(22,33,58,.18), 0 2px 6px rgba(22,33,58,.10) !important",
    ].join(";");

    // Turkuaz üst şerit: marka rengi + sürükleyerek taşıma tutamacı.
    const headerBar = document.createElement("div");
    headerBar.style.cssText = [
      "all: initial !important",
      "display: flex !important",
      "align-items: center !important",
      "justify-content: space-between !important",
      "gap: 8px !important",
      "padding: 8px 12px !important",
      `background: linear-gradient(135deg, ${THEME.teal}, ${THEME.tealDark}) !important`,
      "border-radius: 17px 17px 0 0 !important",
      "cursor: grab !important",
      "user-select: none !important",
    ].join(";");

    const brandLabel = document.createElement("div");
    brandLabel.textContent = "🔷 Sıra Takip";
    brandLabel.style.cssText = [
      "all: initial !important",
      "color: #fff !important",
      "font-size: 13px !important",
      "font-weight: 700 !important",
      "font-family: 'Segoe UI', Arial, Helvetica, sans-serif !important",
      "letter-spacing: .2px !important",
    ].join(";");

    const dragHandle = document.createElement("div");
    dragHandle.textContent = "☰";
    dragHandle.title = "Sürükleyerek taşı";
    dragHandle.style.cssText = [
      "all: initial !important",
      "color: #fff !important",
      "font-size: 14px !important",
      "opacity: .9 !important",
    ].join(";");

    headerBar.appendChild(brandLabel);
    headerBar.appendChild(dragHandle);
    bar.appendChild(headerBar);

    const contentWrap = document.createElement("div");
    contentWrap.style.cssText = [
      "all: initial !important",
      "display: flex !important",
      "flex-direction: column !important",
      "gap: 10px !important",
      "padding: 10px !important",
      "box-sizing: border-box !important",
    ].join(";");
    bar.appendChild(contentWrap);

    function savePos() {
      const rect = bar.getBoundingClientRect();
      try {
        localStorage.setItem(
          "snrPanelPos",
          JSON.stringify({
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          })
        );
      } catch {}
    }

    headerBar.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const rect = bar.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      headerBar.style.setProperty("cursor", "grabbing", "important");

      function onMove(ev) {
        const left = Math.max(0, Math.min(window.innerWidth - 40, ev.clientX - offsetX));
        const top = Math.max(0, Math.min(window.innerHeight - 40, ev.clientY - offsetY));
        bar.style.setProperty("left", left + "px", "important");
        bar.style.setProperty("top", top + "px", "important");
        bar.style.removeProperty("right");
      }
      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        headerBar.style.setProperty("cursor", "grab", "important");
        savePos();
      }
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });

    // CSS'in doğal resize tutamacı Google sayfasının stilleriyle güvenilir
    // çalışmadığı için kendi JS tabanlı boyutlandırma tutamacımızı ekliyoruz.
    const resizeHandle = document.createElement("div");
    resizeHandle.title = "Sürükleyerek boyutlandır";
    resizeHandle.style.cssText = [
      "all: initial !important",
      "position: absolute !important",
      "right: 0 !important",
      "bottom: 0 !important",
      "width: 16px !important",
      "height: 16px !important",
      "cursor: nwse-resize !important",
      `background: linear-gradient(135deg, transparent 0%, transparent 50%, ${THEME.teal} 50%, ${THEME.teal} 60%, transparent 60%, transparent 70%, ${THEME.teal} 70%, ${THEME.teal} 80%, transparent 80%) !important`,
      "z-index: 2147483647 !important",
    ].join(";");
    bar.style.setProperty("position", "fixed", "important");
    bar.appendChild(resizeHandle);

    resizeHandle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = bar.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const startW = rect.width;
      const startH = rect.height;

      function onMove(ev) {
        const w = Math.max(200, Math.min(window.innerWidth * 0.9, startW + (ev.clientX - startX)));
        const h = Math.max(120, Math.min(window.innerHeight * 0.9, startH + (ev.clientY - startY)));
        bar.style.setProperty("width", w + "px", "important");
        bar.style.setProperty("height", h + "px", "important");
      }
      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        savePos();
      }
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });

    function makeNavButton(label, id) {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.style.cssText = [
        "all: initial !important",
        "cursor: pointer !important",
        "padding: 10px 16px !important",
        "border-radius: 20px !important",
        `background: linear-gradient(135deg, ${THEME.teal}, ${THEME.tealDark}) !important`,
        "color: #fff !important",
        "font-size: 14px !important",
        "font-weight: 700 !important",
        "font-family: Arial, Helvetica, sans-serif !important",
        "box-shadow: 0 3px 8px rgba(31,174,150,.35) !important",
        "white-space: nowrap !important",
        "text-align: center !important",
      ].join(";");
      btn.addEventListener("click", () => {
        const link = document.getElementById(id);
        if (link && link.href) location.href = link.href;
      });
      return btn;
    }

    const prevLink = document.getElementById("pnprev");
    if (prevLink) contentWrap.appendChild(makeNavButton("← Önceki Sayfa", "pnprev"));

    const pageLabel = document.createElement("div");
    pageLabel.textContent = "Sayfa " + (Math.floor(getStartIndex() / 10) + 1);
    pageLabel.style.cssText = [
      "all: initial !important",
      "display: block !important",
      "text-align: center !important",
      "padding: 6px 0 !important",
      `color: ${THEME.navy} !important`,
      `background: ${THEME.bgLight} !important`,
      `border: 1px solid ${THEME.border} !important`,
      "border-radius: 14px !important",
      "font-size: 13px !important",
      "font-weight: 700 !important",
      "font-family: Arial, Helvetica, sans-serif !important",
    ].join(";");
    contentWrap.appendChild(pageLabel);

    const nextLink = document.getElementById("pnnext");
    if (nextLink) contentWrap.appendChild(makeNavButton("Sonraki Sayfa →", "pnnext"));

    contentWrap.appendChild(makeSearchBox());

    document.body.appendChild(bar);
  }

  // Sıra takibi kutusu: her SİTE kendi ayrı kelime listesine sahiptir.
  // Açılır menüden site seçilir, Ekle/Kaydet/Sil ile liste yönetilir.
  // "Seçili Siteyi Ara" sadece o sitenin kelimelerini, "Tüm Siteleri Ara"
  // menüdeki bütün siteleri (her biri kendi kelimeleriyle) sırayla tarar.
  function makeSearchBox() {
    const wrap = document.createElement("div");
    wrap.style.cssText = [
      "all: initial !important",
      "display: flex !important",
      "flex-direction: column !important",
      "gap: 6px !important",
      "margin-top: 4px !important",
      "width: 100% !important",
      "box-sizing: border-box !important",
    ].join(";");

    const inputStyle = [
      "all: revert !important",
      "box-sizing: border-box !important",
      "font-size: 12px !important",
      "font-family: Arial, Helvetica, sans-serif !important",
      `border: 1px solid ${THEME.border} !important`,
      "border-radius: 8px !important",
      "background: #ffffff !important",
      `color: ${THEME.text} !important`,
      "outline: none !important",
    ].join(";");

    const smallBtnStyle = [
      "all: initial !important",
      "cursor: pointer !important",
      "padding: 5px 8px !important",
      "border-radius: 8px !important",
      `background: ${THEME.teal} !important`,
      "color: #fff !important",
      "font-size: 11px !important",
      "font-weight: 700 !important",
      "font-family: Arial, Helvetica, sans-serif !important",
    ].join(";");

    const siteRow = document.createElement("div");
    siteRow.style.cssText = [
      "all: initial !important",
      "display: flex !important",
      "gap: 4px !important",
      "flex-wrap: wrap !important",
    ].join(";");

    const siteSelect = document.createElement("select");
    siteSelect.style.cssText = inputStyle + "flex: 1 1 auto !important; padding: 6px !important; min-width: 90px !important;";

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Kaydet";
    saveBtn.style.cssText = smallBtnStyle + `background: ${THEME.navy} !important;`;

    const delBtn = document.createElement("button");
    delBtn.textContent = "Sil";
    delBtn.style.cssText = smallBtnStyle + `background: ${THEME.danger} !important;`;

    siteRow.appendChild(siteSelect);
    siteRow.appendChild(saveBtn);
    siteRow.appendChild(delBtn);

    // window.prompt() Chrome tarafından "bu sayfa ek pencere açmasın"
    // seçilince sessizce engellenebiliyor; bunun yerine kalıcı bir metin
    // kutusuyla site ekliyoruz.
    const newSiteRow = document.createElement("div");
    newSiteRow.style.cssText = [
      "all: initial !important",
      "display: flex !important",
      "gap: 4px !important",
    ].join(";");
    const newSiteInput = document.createElement("input");
    newSiteInput.type = "text";
    newSiteInput.placeholder = "Yeni site adresi...";
    newSiteInput.style.cssText = inputStyle + "flex: 1 1 auto !important; padding: 6px !important; min-width: 0 !important;";
    const addBtn = document.createElement("button");
    addBtn.textContent = "+ Ekle";
    addBtn.style.cssText = smallBtnStyle;
    newSiteRow.appendChild(newSiteInput);
    newSiteRow.appendChild(addBtn);

    const textarea = document.createElement("textarea");
    textarea.placeholder = "Seçili sitenin kelimeleri (her satıra bir tane)...";
    textarea.rows = 6;
    textarea.style.cssText = inputStyle + "width: 100% !important; padding: 8px !important; resize: vertical !important;";

    const pagesRow = document.createElement("div");
    pagesRow.style.cssText = [
      "all: initial !important",
      "display: flex !important",
      "align-items: center !important",
      "gap: 6px !important",
      "font-family: Arial, Helvetica, sans-serif !important",
      "font-size: 12px !important",
      "color: #333 !important",
    ].join(";");
    const pagesLabel = document.createElement("span");
    pagesLabel.textContent = "Kaç sayfa taransın:";
    pagesLabel.style.cssText = "all: revert !important; font-size: 12px !important;";
    const pagesInput = document.createElement("input");
    pagesInput.type = "number";
    pagesInput.min = "1";
    pagesInput.max = "100";
    pagesInput.value = "5";
    pagesInput.style.cssText = inputStyle + "width: 48px !important; padding: 4px !important;";
    pagesRow.appendChild(pagesLabel);
    pagesRow.appendChild(pagesInput);

    const parallelRow = document.createElement("div");
    parallelRow.style.cssText = [
      "all: initial !important",
      "display: flex !important",
      "align-items: center !important",
      "gap: 6px !important",
      "font-family: Arial, Helvetica, sans-serif !important",
      "font-size: 12px !important",
      "color: #333 !important",
    ].join(";");
    const parallelLabel = document.createElement("span");
    parallelLabel.textContent = "Aynı anda kaç kelime:";
    parallelLabel.style.cssText = "all: revert !important; font-size: 12px !important;";
    const parallelInput = document.createElement("input");
    parallelInput.type = "number";
    parallelInput.min = "1";
    parallelInput.value = "1";
    parallelInput.title = "1 = sıralı (güvenli). Artırmak captcha riskini yükseltir.";
    parallelInput.style.cssText = inputStyle + "width: 48px !important; padding: 4px !important;";
    parallelRow.appendChild(parallelLabel);
    parallelRow.appendChild(parallelInput);
    const parallelWarn = document.createElement("span");
    parallelWarn.textContent = "⚠ 1'den fazlası riski artırır";
    parallelWarn.style.cssText = "all: revert !important; font-size: 11px !important; color: #b6402f !important;";
    parallelRow.appendChild(parallelWarn);

    const slowRow = document.createElement("label");
    slowRow.style.cssText = [
      "all: initial !important",
      "display: flex !important",
      "align-items: center !important",
      "gap: 6px !important",
      "font-family: Arial, Helvetica, sans-serif !important",
      "font-size: 12px !important",
      "color: #333 !important",
      "cursor: pointer !important",
    ].join(";");
    const slowCheckbox = document.createElement("input");
    slowCheckbox.type = "checkbox";
    slowCheckbox.style.cssText = "all: revert !important;";
    const slowLabel = document.createElement("span");
    slowLabel.textContent = "Rastgele bekleme ekle (daha güvenli)";
    slowLabel.style.cssText = "all: revert !important; font-size: 12px !important;";
    slowRow.appendChild(slowCheckbox);
    slowRow.appendChild(slowLabel);

    const searchSelectedBtn = document.createElement("button");
    searchSelectedBtn.textContent = "Seçili Siteyi Ara";
    searchSelectedBtn.style.cssText = [
      "all: initial !important",
      "cursor: pointer !important",
      "padding: 9px 10px !important",
      "border-radius: 16px !important",
      `background: linear-gradient(135deg, ${THEME.teal}, ${THEME.tealDark}) !important`,
      "color: #fff !important",
      "font-size: 13px !important",
      "font-weight: 700 !important",
      "font-family: Arial, Helvetica, sans-serif !important",
      "box-shadow: 0 3px 8px rgba(31,174,150,.35) !important",
      "text-align: center !important",
    ].join(";");

    const searchAllBtn = document.createElement("button");
    searchAllBtn.textContent = "Tüm Siteleri Ara";
    searchAllBtn.style.cssText = [
      "all: initial !important",
      "cursor: pointer !important",
      "padding: 9px 10px !important",
      "border-radius: 16px !important",
      `background: linear-gradient(135deg, ${THEME.navy}, #223154) !important`,
      "color: #fff !important",
      "font-size: 13px !important",
      "font-weight: 700 !important",
      "font-family: Arial, Helvetica, sans-serif !important",
      "box-shadow: 0 3px 8px rgba(22,33,58,.35) !important",
      "text-align: center !important",
    ].join(";");

    function makeIncognitoBtn(label) {
      const b = document.createElement("button");
      b.textContent = label;
      b.style.cssText = [
        "all: initial !important",
        "cursor: pointer !important",
        "padding: 7px 10px !important",
        "border-radius: 14px !important",
        `background: ${THEME.bgWhite} !important`,
        `color: ${THEME.tealDark} !important`,
        `border: 1.5px solid ${THEME.teal} !important`,
        "font-size: 12px !important",
        "font-weight: 700 !important",
        "font-family: Arial, Helvetica, sans-serif !important",
        "text-align: center !important",
      ].join(";");
      return b;
    }
    const searchSelectedIncognitoBtn = makeIncognitoBtn(
      "🕶 Seçili Siteyi Ara (Gizli Sekme)"
    );
    const searchAllIncognitoBtn = makeIncognitoBtn(
      "🕶 Tüm Siteleri Ara (Gizli Sekme)"
    );

    const stopBtn = document.createElement("button");
    stopBtn.textContent = "⏹ Aramayı Durdur";
    stopBtn.style.cssText = [
      "all: initial !important",
      "display: none !important",
      "cursor: pointer !important",
      "padding: 8px 10px !important",
      "border-radius: 16px !important",
      `background: ${THEME.danger} !important`,
      "color: #fff !important",
      "font-size: 13px !important",
      "font-weight: 700 !important",
      "font-family: Arial, Helvetica, sans-serif !important",
      "text-align: center !important",
    ].join(";");
    stopBtn.addEventListener("click", () => {
      if (!chrome?.storage?.local) return;
      chrome.storage.local.get("snrRankJob", ({ snrRankJob: job }) => {
        if (!job) return;
        job.active = false;
        chrome.storage.local.set({ snrRankJob: job }, () => {
          stopBtn.style.setProperty("display", "none", "important");
          renderResults(job);
        });
      });
    });

    const copyBtn = document.createElement("button");
    copyBtn.textContent = "Sonuçları İndir (Excel)";
    copyBtn.style.cssText = [
      "all: initial !important",
      "display: none !important",
      "cursor: pointer !important",
      "padding: 7px 10px !important",
      "border-radius: 14px !important",
      `background: ${THEME.navy} !important`,
      "color: #fff !important",
      "font-size: 12px !important",
      "font-weight: 700 !important",
      "font-family: Arial, Helvetica, sans-serif !important",
      "text-align: center !important",
    ].join(";");

    const resultsBox = document.createElement("div");
    resultsBox.style.cssText = [
      "all: initial !important",
      "display: none !important",
      "flex-direction: column !important",
      "gap: 4px !important",
      "font-family: Arial, Helvetica, sans-serif !important",
      "font-size: 12px !important",
      `background: ${THEME.bgLight} !important`,
      `color: ${THEME.navy} !important`,
      `border: 1px solid ${THEME.border} !important`,
      "padding: 8px !important",
      "border-radius: 10px !important",
      "max-height: 260px !important",
      "overflow-y: auto !important",
      "white-space: pre-wrap !important",
    ].join(";");

    // sitesData = { [site]: string[] kelimeler } — chrome.storage.local'da kalıcı.
    let sitesData = {};
    let selectedSite = "";

    function populateSelect() {
      siteSelect.innerHTML = "";
      Object.keys(sitesData)
        .sort()
        .forEach((site) => {
          const opt = document.createElement("option");
          opt.value = site;
          opt.textContent = site;
          siteSelect.appendChild(opt);
        });
      if (selectedSite && sitesData[selectedSite] !== undefined) {
        siteSelect.value = selectedSite;
      } else {
        selectedSite = siteSelect.value || "";
      }
      textarea.value = (sitesData[selectedSite] || []).join("\n");
    }

    function persistSitesData(cb) {
      chrome.storage.local.set(
        { snrSitesData: sitesData, snrSelectedSite: selectedSite },
        cb
      );
    }

    if (chrome?.storage?.local) {
      chrome.storage.local.get(
        ["snrSitesData", "snrSelectedSite", "snrRankJob"],
        ({ snrSitesData, snrSelectedSite, snrRankJob: job }) => {
          sitesData = snrSitesData || {};
          selectedSite = snrSelectedSite || "";
          populateSelect();
          if (job) renderResults(job);
        }
      );
    }

    siteSelect.addEventListener("change", () => {
      selectedSite = siteSelect.value;
      textarea.value = (sitesData[selectedSite] || []).join("\n");
      if (chrome?.storage?.local) {
        chrome.storage.local.set({ snrSelectedSite: selectedSite });
      }
    });

    // Yazarken otomatik (kısa gecikmeli) kaydet: F5 / kapat-aç sonrası
    // "Kaydet"e basılmamış olsa da hiçbir kelime kaybolmaz.
    let autoSaveTimer = null;
    textarea.addEventListener("input", () => {
      if (!selectedSite) return;
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => {
        sitesData[selectedSite] = textarea.value
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        persistSitesData();
      }, 500);
    });

    function addSite() {
      const site = normalizeSite(newSiteInput.value);
      if (!site) return;
      if (sitesData[site] === undefined) sitesData[site] = [];
      selectedSite = site;
      newSiteInput.value = "";
      persistSitesData(() => populateSelect());
    }
    addBtn.addEventListener("click", addSite);
    newSiteInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") addSite();
    });

    saveBtn.addEventListener("click", () => {
      if (!selectedSite) {
        alert("Önce '+ Ekle' ile bir site oluştur.");
        return;
      }
      const keywords = textarea.value
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      sitesData[selectedSite] = keywords;
      persistSitesData(() => {
        saveBtn.textContent = "Kaydedildi ✓";
        setTimeout(() => (saveBtn.textContent = "Kaydet"), 1200);
      });
    });

    delBtn.addEventListener("click", () => {
      if (!selectedSite) return;
      if (!confirm(`"${selectedSite}" silinsin mi?`)) return;
      delete sitesData[selectedSite];
      selectedSite = Object.keys(sitesData)[0] || "";
      persistSitesData(() => populateSelect());
    });

    function csvEscape(value) {
      const s = String(value);
      return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }

    // Bir (site, kelime) çiftinin durumunu, o grubu işleyen İŞÇİYE bakarak
    // hesaplar: bulunduysa sonucu, bulunamadıysa/sıradaysa durumunu döner.
    function ownerWorker(job, groupIndex) {
      return job.workers.find((w) => w.queueIdx.includes(groupIndex));
    }

    function pairStatus(job, groupIndex, keyword, site) {
      const found = job.results.find(
        (r) => r.site === site && r.keyword === keyword && !r.notfound
      );
      if (found) return { state: "found", found };
      const notfound = job.results.some(
        (r) => r.site === site && r.keyword === keyword && r.notfound
      );
      if (notfound) return { state: "notfound" };

      const worker = ownerWorker(job, groupIndex);
      if (!worker) return { state: "pending" };
      const posInWorker = worker.queueIdx.indexOf(groupIndex);
      if (
        !worker.done &&
        posInWorker === worker.cursor &&
        worker.pendingSites.includes(site)
      ) {
        return { state: "current", page: worker.pagesScanned + 1 };
      }
      if (worker.done || posInWorker < worker.cursor) return { state: "notfound" };
      return { state: "pending" };
    }

    copyBtn.addEventListener("click", () => {
      const job = JSON.parse(copyBtn.dataset.job || "{}");
      if (!job.groups) return;

      const rows = [["Site", "Kelime", "Sayfa", "Sıra", "Durum"]];
      job.groups.forEach((group, gi) => {
        group.sites.forEach((site) => {
          const st = pairStatus(job, gi, group.keyword, site);
          if (st.state === "found") {
            rows.push([site, group.keyword, st.found.page, st.found.index, "Bulundu"]);
          } else if (st.state === "notfound") {
            rows.push([site, group.keyword, "", "", "Bulunamadı"]);
          } else if (st.state === "current") {
            rows.push([site, group.keyword, "", "", "Aranıyor"]);
          } else {
            rows.push([site, group.keyword, "", "", "Sırada"]);
          }
        });
      });

      const csv = "﻿" + rows.map((r) => r.map(csvEscape).join(";")).join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sira-sonuclari.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

    function renderResults(job) {
      stopBtn.style.setProperty("display", job.active ? "block" : "none", "important");
      resultsBox.innerHTML = "";
      resultsBox.style.setProperty("display", "flex", "important");

      const bySite = new Map();
      job.groups.forEach((group, gi) => {
        group.sites.forEach((site) => {
          if (!bySite.has(site)) bySite.set(site, []);
          const st = pairStatus(job, gi, group.keyword, site);
          let line;
          if (st.state === "found") {
            line = `✓ ${group.keyword} — ${st.found.page}. sayfa, ${st.found.index}. sıra`;
          } else if (st.state === "current") {
            line = `… ${group.keyword} (${st.page}. sayfa)`;
          } else if (st.state === "notfound") {
            line = `✗ ${group.keyword} — bulunamadı`;
          } else {
            line = `${group.keyword} — sırada`;
          }
          bySite.get(site).push(line);
        });
      });

      bySite.forEach((lines, site) => {
        const header = document.createElement("div");
        header.style.cssText = "all: revert !important; font-weight: 700 !important; margin-top: 6px !important;";
        header.textContent = site;
        resultsBox.appendChild(header);
        lines.forEach((line) => {
          const row = document.createElement("div");
          row.style.cssText = "all: revert !important; padding-left: 8px !important;";
          row.textContent = line;
          resultsBox.appendChild(row);
        });
      });

      copyBtn.style.setProperty("display", "block", "important");
      copyBtn.dataset.job = JSON.stringify(job);
    }

    // groups: [{keyword, sites:[...]}] — AYNI kelimeyi arayan birden fazla
    // site varsa tek bir Google araması içinde birlikte kontrol edilir.
    // Bu, "Tüm Siteleri Ara"da ortak kelimeler için gereksiz tekrar aramayı
    // önler (10 site x 20 kelime = 200 yerine, ortak kelimeler kadar az arama).
    // Grupları N işçiye (paralel sekmeye) round-robin dağıtır. İşçi 0 mevcut
    // sekmede devam eder, diğerleri (incognito ise ayrı gizli pencerede,
    // değilse arka planda yeni sekmede) kendi ilk kelimesiyle açılır.
    function startJob(groups, incognito) {
      if (groups.length === 0 || !chrome?.storage?.local) return;
      const parallelism = Math.max(1, parseInt(parallelInput.value, 10) || 1);

      const workers = [];
      for (let w = 0; w < parallelism; w++) {
        const queueIdx = [];
        for (let i = w; i < groups.length; i += parallelism) queueIdx.push(i);
        workers.push({
          queueIdx,
          cursor: 0,
          pendingSites: queueIdx.length ? groups[queueIdx[0]].sites.slice() : [],
          pagesScanned: 0,
          done: queueIdx.length === 0,
        });
      }

      chrome.storage.local.set(
        {
          snrRankJob: {
            groups,
            workers,
            maxPages: Math.max(1, parseInt(pagesInput.value, 10) || 5),
            slow: slowCheckbox.checked,
            results: [],
            active: workers.some((w) => !w.done),
          },
        },
        () => {
          workers.forEach((worker, i) => {
            if (worker.done) return;
            const url = new URL("https://www.google.com/search");
            url.searchParams.set("q", groups[worker.queueIdx[0]].keyword);
            if (incognito) {
              chrome.runtime.sendMessage({
                type: "snrOpenIncognito",
                url: url.toString(),
              });
            } else if (i === 0) {
              location.href = url.toString();
            } else {
              chrome.runtime.sendMessage({
                type: "snrOpenTab",
                url: url.toString(),
              });
            }
          });
        }
      );
    }

    function getSelectedGroups() {
      if (!selectedSite) {
        alert("Önce bir site seç veya '+ Ekle' ile oluştur.");
        return null;
      }
      const keywords = Array.from(
        new Set(
          textarea.value
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
        )
      );
      if (keywords.length === 0) {
        alert("Kelime listesi boş.");
        return null;
      }
      sitesData[selectedSite] = keywords;
      return keywords.map((keyword) => ({ keyword, sites: [selectedSite] }));
    }

    function getAllGroups() {
      const sites = Object.keys(sitesData);
      if (sites.length === 0) {
        alert("Önce '+ Ekle' ile en az bir site oluştur.");
        return null;
      }
      // Aynı kelimeyi isteyen tüm siteleri tek grupta topla.
      const byKeyword = new Map();
      sites.forEach((site) => {
        (sitesData[site] || []).forEach((keyword) => {
          if (!byKeyword.has(keyword)) byKeyword.set(keyword, []);
          byKeyword.get(keyword).push(site);
        });
      });
      if (byKeyword.size === 0) {
        alert("Hiçbir sitede kelime listesi yok.");
        return null;
      }
      return Array.from(byKeyword, ([keyword, sites]) => ({ keyword, sites }));
    }

    searchSelectedBtn.addEventListener("click", () => {
      const groups = getSelectedGroups();
      if (!groups) return;
      // Aramayı başlatmadan önce kutudaki kelimeleri sessizce kaydediyoruz,
      // böylece "Kaydet"e basılmasa bile otomatik sayfa geçişlerinde liste
      // kaybolmaz.
      persistSitesData(() => startJob(groups, false));
    });

    searchAllBtn.addEventListener("click", () => {
      const groups = getAllGroups();
      if (groups) startJob(groups, false);
    });

    searchSelectedIncognitoBtn.addEventListener("click", () => {
      const groups = getSelectedGroups();
      if (!groups) return;
      persistSitesData(() => startJob(groups, true));
    });

    searchAllIncognitoBtn.addEventListener("click", () => {
      const groups = getAllGroups();
      if (groups) startJob(groups, true);
    });

    wrap.appendChild(siteRow);
    wrap.appendChild(newSiteRow);
    wrap.appendChild(textarea);
    wrap.appendChild(pagesRow);
    wrap.appendChild(parallelRow);
    wrap.appendChild(slowRow);
    wrap.appendChild(searchSelectedBtn);
    wrap.appendChild(searchAllBtn);
    wrap.appendChild(searchSelectedIncognitoBtn);
    wrap.appendChild(searchAllIncognitoBtn);
    wrap.appendChild(stopBtn);
    wrap.appendChild(resultsBox);
    wrap.appendChild(copyBtn);
    return wrap;
  }

  // job.workers = paralel çalışan işçiler; her biri kendi sekmesinde,
  // job.groups içindeki kendine ait bir alt kümeyi sırayla işler. Bu sayfa
  // hangi işçinin "şu an aradığı kelime"sine denk geliyorsa o işçi
  // ilerletilir (diğer sekmelerdeki işçilere dokunulmaz).
  // Not: chrome.storage.local üzerinde get→set atomik değildir; birden
  // fazla sekme TAM olarak aynı anda yazarsa nadiren bir sonuç kaybolabilir
  // (bir sonraki turda kendiliğinden fark edilmez, ama ölümcül değildir).
  let searchJobHandled = false;
  function runSearchJobOnce() {
    if (searchJobHandled) return;
    if (!chrome?.storage?.local) return;

    chrome.storage.local.get("snrRankJob", ({ snrRankJob: job }) => {
      if (!job || !job.active) return;

      const params = new URLSearchParams(location.search);
      const q = params.get("q");
      const workerIndex = job.workers.findIndex((w) => {
        if (w.done) return false;
        const gi = w.queueIdx[w.cursor];
        const g = job.groups[gi];
        return g && g.keyword === q;
      });
      if (workerIndex === -1) return;

      searchJobHandled = true;

      const worker = job.workers[workerIndex];
      const groupIndex = worker.queueIdx[worker.cursor];
      const group = job.groups[groupIndex];

      const links = getResultLinks();
      const currentPage = Math.floor(getStartIndex() / 10) + 1;

      function hostOf(link) {
        try {
          return new URL(link.href).hostname
            .toLocaleLowerCase("tr")
            .replace(/^www\./, "");
        } catch {
          return "";
        }
      }

      const stillPending = [];
      worker.pendingSites.forEach((site) => {
        const matchIndex = links.findIndex((link) => {
          const host = hostOf(link);
          return host === site || host.endsWith("." + site);
        });
        if (matchIndex >= 0) {
          const match = links[matchIndex];
          match.style.setProperty("outline", `3px solid ${THEME.teal}`, "important");
          match.style.setProperty("outline-offset", "3px", "important");
          job.results.push({
            site,
            keyword: group.keyword,
            page: currentPage,
            index: matchIndex + 1,
          });
        } else {
          stillPending.push(site);
        }
      });
      worker.pendingSites = stillPending;

      function navigateTo(href) {
        if (job.slow) {
          const delay = 2000 + Math.random() * 4000;
          setTimeout(() => (location.href = href), delay);
        } else {
          location.href = href;
        }
      }

      function goToKeyword(keyword) {
        const url = new URL("https://www.google.com/search");
        url.searchParams.set("q", keyword);
        navigateTo(url.toString());
      }

      function advance() {
        // Bu grupta hâlâ bulunamayan siteler varsa "bulunamadı" olarak kapat.
        worker.pendingSites.forEach((site) => {
          job.results.push({ site, keyword: group.keyword, notfound: true });
        });

        const nextCursor = worker.cursor + 1;
        if (nextCursor >= worker.queueIdx.length) {
          worker.done = true;
          job.active = job.workers.some((w) => !w.done);
          chrome.storage.local.set({ snrRankJob: job });
          return;
        }
        worker.cursor = nextCursor;
        worker.pagesScanned = 0;
        const nextGi = worker.queueIdx[nextCursor];
        worker.pendingSites = job.groups[nextGi].sites.slice();
        chrome.storage.local.set({ snrRankJob: job }, () =>
          goToKeyword(job.groups[nextGi].keyword)
        );
      }

      if (worker.pendingSites.length === 0) {
        advance();
        return;
      }

      worker.pagesScanned += 1;
      const nextLink = document.getElementById("pnnext");

      if (worker.pagesScanned < job.maxPages && nextLink && nextLink.href) {
        const nextHref = nextLink.href;
        chrome.storage.local.set({ snrRankJob: job }, () => {
          navigateTo(nextHref);
        });
      } else {
        advance();
      }
    });
  }

  numberResults();
  ensurePanel();
  runSearchJobOnce();

  const observer = new MutationObserver(() => {
    clearTimeout(window.__snrTimeout);
    window.__snrTimeout = setTimeout(() => {
      numberResults();
      ensurePanel();
      runSearchJobOnce();
    }, 300);
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
