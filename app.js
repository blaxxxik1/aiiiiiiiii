(function () {
  "use strict";

  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const fileMeta = document.getElementById("fileMeta");
  const fileName = document.getElementById("fileName");
  const fileInfo = document.getElementById("fileInfo");
  const clearFile = document.getElementById("clearFile");
  const query = document.getElementById("query");
  const caseSensitive = document.getElementById("caseSensitive");
  const wholeWord = document.getElementById("wholeWord");
  const contextLines = document.getElementById("contextLines");
  const results = document.getElementById("results");
  const resultsList = document.getElementById("resultsList");
  const resultCount = document.getElementById("resultCount");
  const emptyState = document.getElementById("emptyState");
  const navBar = document.getElementById("navBar");
  const navCounter = document.getElementById("navCounter");
  const prevMatch = document.getElementById("prevMatch");
  const nextMatch = document.getElementById("nextMatch");

  let lines = [];
  let hasFile = false;
  let matchEls = [];
  let activeIndex = -1;

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " Б";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " КБ";
    return (bytes / (1024 * 1024)).toFixed(1) + " МБ";
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function pluralMatches(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    let word = "совпадений";
    if (mod10 === 1 && mod100 !== 11) word = "совпадение";
    else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = "совпадения";
    return n + " " + word;
  }

  function loadFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      const text = String(e.target.result || "");
      lines = text.split(/\r\n|\r|\n/);
      hasFile = true;

      fileName.textContent = file.name;
      fileInfo.textContent = formatSize(file.size) + " · " + lines.length + " строк";
      fileMeta.hidden = false;
      dropzone.hidden = true;

      query.disabled = false;
      query.focus();
      runSearch();
    };
    reader.onerror = function () {
      alert("Не удалось прочитать файл.");
    };
    reader.readAsText(file);
  }

  function reset() {
    lines = [];
    hasFile = false;
    matchEls = [];
    activeIndex = -1;
    fileInput.value = "";
    fileMeta.hidden = true;
    dropzone.hidden = false;
    query.value = "";
    query.disabled = true;
    results.hidden = true;
    navBar.hidden = true;
    resultsList.innerHTML = "";
  }

  function highlight(line, regex) {
    let html = "";
    let lastIndex = 0;
    regex.lastIndex = 0;
    let m;
    while ((m = regex.exec(line)) !== null) {
      html += escapeHtml(line.slice(lastIndex, m.index));
      html += "<mark>" + escapeHtml(m[0]) + "</mark>";
      lastIndex = m.index + m[0].length;
      if (m.index === regex.lastIndex) regex.lastIndex++;
    }
    html += escapeHtml(line.slice(lastIndex));
    return html;
  }

  function buildRow(lineIndex, isMatch, regex) {
    const row = document.createElement("div");
    row.className = "result-row" + (isMatch ? " is-match" : " is-context");
    const no = document.createElement("span");
    no.className = "line-no";
    no.textContent = lineIndex + 1;
    const txt = document.createElement("span");
    txt.className = "line-text";
    if (isMatch) {
      txt.innerHTML = highlight(lines[lineIndex], regex);
    } else {
      txt.textContent = lines[lineIndex];
    }
    row.appendChild(no);
    row.appendChild(txt);
    return row;
  }

  function setActive(index) {
    if (!matchEls.length) return;
    if (index < 0) index = matchEls.length - 1;
    if (index >= matchEls.length) index = 0;
    if (activeIndex >= 0 && matchEls[activeIndex]) {
      matchEls[activeIndex].classList.remove("active");
    }
    activeIndex = index;
    const el = matchEls[activeIndex];
    el.classList.add("active");
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    navCounter.textContent = (activeIndex + 1) + " / " + matchEls.length;
  }

  function runSearch() {
    const term = query.value;
    if (!hasFile) return;

    matchEls = [];
    activeIndex = -1;

    if (!term) {
      results.hidden = true;
      navBar.hidden = true;
      resultsList.innerHTML = "";
      return;
    }

    let pattern = escapeRegex(term);
    if (wholeWord.checked) pattern = "\\b" + pattern + "\\b";
    const flags = "g" + (caseSensitive.checked ? "" : "i");
    let regex;
    try {
      regex = new RegExp(pattern, flags);
    } catch (err) {
      return;
    }

    const ctx = parseInt(contextLines.value, 10) || 0;

    // Collect matching line indices
    const matchLines = [];
    for (let i = 0; i < lines.length; i++) {
      regex.lastIndex = 0;
      if (regex.test(lines[i])) matchLines.push(i);
    }

    results.hidden = false;
    resultCount.textContent = pluralMatches(matchLines.length);

    if (matchLines.length === 0) {
      resultsList.innerHTML = "";
      emptyState.hidden = false;
      navBar.hidden = true;
      return;
    }
    emptyState.hidden = true;

    // Merge context windows into blocks
    const matchSet = new Set(matchLines);
    const blocks = [];
    for (const ml of matchLines) {
      const start = Math.max(0, ml - ctx);
      const end = Math.min(lines.length - 1, ml + ctx);
      const last = blocks[blocks.length - 1];
      if (last && start <= last.end + 1) {
        last.end = Math.max(last.end, end);
      } else {
        blocks.push({ start: start, end: end });
      }
    }

    const frag = document.createDocumentFragment();
    for (let b = 0; b < blocks.length; b++) {
      const block = blocks[b];
      const blockEl = document.createElement("div");
      blockEl.className = "result-block";
      for (let i = block.start; i <= block.end; i++) {
        const isMatch = matchSet.has(i);
        const row = buildRow(i, isMatch, regex);
        if (isMatch) matchEls.push(row);
        blockEl.appendChild(row);
      }
      frag.appendChild(blockEl);
    }
    resultsList.innerHTML = "";
    resultsList.appendChild(frag);

    navBar.hidden = false;
    setActive(0);
  }

  // File input
  fileInput.addEventListener("change", function () {
    if (fileInput.files && fileInput.files[0]) loadFile(fileInput.files[0]);
  });

  // Drag & drop
  ["dragenter", "dragover"].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add("dragover");
    });
  });
  ["dragleave", "drop"].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove("dragover");
    });
  });
  dropzone.addEventListener("drop", function (e) {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files[0]) loadFile(dt.files[0]);
  });
  dropzone.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });

  clearFile.addEventListener("click", reset);

  query.addEventListener("input", runSearch);
  caseSensitive.addEventListener("change", runSearch);
  wholeWord.addEventListener("change", runSearch);
  contextLines.addEventListener("change", runSearch);

  prevMatch.addEventListener("click", function () { setActive(activeIndex - 1); });
  nextMatch.addEventListener("click", function () { setActive(activeIndex + 1); });

  // Enter / Shift+Enter navigation while typing in the search box
  query.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && matchEls.length) {
      e.preventDefault();
      setActive(activeIndex + (e.shiftKey ? -1 : 1));
    }
  });
})();
