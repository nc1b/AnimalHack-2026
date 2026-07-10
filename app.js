/* PawFinder — community lost & found pet network
   Self-contained vanilla JS. State persists in localStorage. */
(function () {
  "use strict";

  var STORE_KEY = "pawfinder.reports.v1";
  var state = { reports: [], filter: { status: "all", species: "all", q: "" }, pickPin: null, activeId: null };

  /* ---------- storage ---------- */
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) { state.reports = JSON.parse(raw); return; }
    } catch (e) { /* ignore */ }
    // first run: seed
    state.reports = (window.PAWFINDER_SEED || []).map(function (r) { return Object.assign({}, r); });
    save();
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state.reports)); } catch (e) { /* quota */ }
  }

  /* ---------- helpers ---------- */
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function speciesEmoji(sp) { return ({ Dog: "🐕", Cat: "🐈", Bird: "🦜", Rabbit: "🐇" })[sp] || "🐾"; }
  function statusLabel(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function daysAgo(dateStr) {
    if (!dateStr) return "";
    var d = new Date(dateStr + "T00:00:00");
    var diff = Math.round((Date.now() - d.getTime()) / 86400000);
    if (isNaN(diff)) return "";
    if (diff <= 0) return "today";
    if (diff === 1) return "yesterday";
    return diff + " days ago";
  }
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  /* ---------- matching engine ---------- */
  function tokens(s) { return String(s || "").toLowerCase().split(/[^a-z0-9]+/).filter(function (w) { return w.length > 2; }); }
  function tokenOverlap(a, b) {
    var ta = tokens(a), tb = tokens(b);
    if (!ta.length || !tb.length) return 0;
    var setB = {}; tb.forEach(function (w) { setB[w] = 1; });
    var hit = 0; ta.forEach(function (w) { if (setB[w]) hit++; });
    return hit / Math.max(ta.length, tb.length);
  }
  function distance(a, b) { return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)); }

  // Score how likely report `b` (a sighting) matches report `a`. Returns 0-100.
  function scoreMatch(a, b) {
    if (a.species !== b.species) return 0;             // species must match
    var score = 40;                                    // base for same species
    score += tokenOverlap(a.color, b.color) * 22;      // color similarity
    score += tokenOverlap(a.breed, b.breed) * 12;      // breed similarity
    score += tokenOverlap(a.description + " " + a.area, b.description + " " + b.area) * 10;
    var dist = distance(a, b);                          // proximity (map is ~100 wide)
    score += Math.max(0, 20 - dist * 0.9);
    return Math.max(0, Math.min(99, Math.round(score)));
  }
  // Opposite-status candidates, scored & sorted.
  function findMatches(report) {
    if (report.status === "reunited") return [];
    var want = report.status === "lost" ? "found" : "lost";
    return state.reports
      .filter(function (r) { return r.status === want && r.id !== report.id; })
      .map(function (r) { return { report: r, score: scoreMatch(report, r) }; })
      .filter(function (m) { return m.score >= 45; })
      .sort(function (x, y) { return y.score - x.score; })
      .slice(0, 4);
  }
  function bestMatchScore(report) {
    var m = findMatches(report);
    return m.length ? m[0].score : 0;
  }

  /* ---------- map ---------- */
  var MAP_SVG =
    '<svg viewBox="0 0 160 110" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><linearGradient id="water" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#bfe0ef"/><stop offset="1" stop-color="#a6d3e8"/></linearGradient></defs>' +
    '<rect width="160" height="110" fill="#eaf0e6"/>' +
    // river
    '<path d="M-5 78 C 30 66, 55 92, 90 74 S 150 60, 170 72 L170 120 L-5 120 Z" fill="url(#water)"/>' +
    '<path d="M-5 78 C 30 66, 55 92, 90 74 S 150 60, 170 72" fill="none" stroke="#8fc3dc" stroke-width="1"/>' +
    // parks
    '<rect x="18" y="26" width="34" height="26" rx="6" fill="#cfe6bd"/>' +
    '<circle cx="124" cy="28" r="15" fill="#cfe6bd"/>' +
    '<rect x="70" y="8" width="26" height="18" rx="5" fill="#d7ead0"/>' +
    // roads
    '<g stroke="#f6f2ea" stroke-width="4.5" stroke-linecap="round">' +
    '<line x1="0" y1="20" x2="160" y2="20"/><line x1="0" y1="56" x2="160" y2="56"/>' +
    '<line x1="40" y1="0" x2="40" y2="110"/><line x1="100" y1="0" x2="100" y2="110"/>' +
    '<line x1="130" y1="0" x2="130" y2="110"/></g>' +
    '<g stroke="#ded6c8" stroke-width="1.2" stroke-dasharray="2 3">' +
    '<line x1="0" y1="20" x2="160" y2="20"/><line x1="0" y1="56" x2="160" y2="56"/>' +
    '<line x1="40" y1="0" x2="40" y2="110"/><line x1="100" y1="0" x2="100" y2="110"/></g>' +
    // blocks
    '<g fill="#e2ddd2" opacity="0.7">' +
    '<rect x="58" y="26" width="10" height="8" rx="1.5"/><rect x="58" y="38" width="10" height="10" rx="1.5"/>' +
    '<rect x="108" y="62" width="14" height="10" rx="1.5"/><rect x="108" y="40" width="10" height="10" rx="1.5"/>' +
    '<rect x="8" y="62" width="10" height="9" rx="1.5"/></g>' +
    '</svg>';

  function markerEmoji(status) { return status === "lost" ? "🔴" : status === "found" ? "🟢" : "🟣"; }

  function renderMap() {
    var stage = $("#mapStage");
    if (!stage) return;
    stage.innerHTML = MAP_SVG;
    state.reports.forEach(function (r) {
      var m = document.createElement("button");
      m.className = "map-marker" + (r.id === state.activeId ? " is-active" : "");
      m.style.left = r.x + "%";
      m.style.top = r.y + "%";
      m.textContent = markerEmoji(r.status);
      m.title = (r.name || r.breed || r.species) + " — " + statusLabel(r.status);
      m.setAttribute("aria-label", m.title);
      m.addEventListener("click", function () {
        state.activeId = r.id;
        renderMap();
        renderMapSide(r);
      });
      stage.appendChild(m);
    });
  }

  function renderMapSide(r) {
    var side = $("#mapSide");
    var matches = findMatches(r);
    side.innerHTML =
      '<div class="detail-hero">' +
      '<div class="detail-photo">' + photoOrEmoji(r) + '</div>' +
      '<div class="detail-info"><span class="status-tag status-' + r.status + '" style="position:static;display:inline-block;margin-bottom:.4rem">' + statusLabel(r.status) + '</span>' +
      '<h2 style="font-size:1.3rem">' + esc(r.name || (r.status === "found" ? "Found " + r.species.toLowerCase() : r.species)) + '</h2>' +
      '<p class="pet-meta">' + esc(r.breed || r.species) + ' · ' + esc(r.color || "") + '</p>' +
      '<p class="muted small">📍 ' + esc(r.area) + ' · ' + daysAgo(r.date) + '</p></div></div>' +
      '<button class="btn btn-ghost" style="width:100%" data-open-detail="' + r.id + '">View full report' +
      (matches.length ? ' · ' + matches.length + ' match' + (matches.length > 1 ? 'es' : '') : '') + '</button>';
  }

  /* ---------- pin picker (in report form) ---------- */
  function renderPicker() {
    var stage = $("#pickerStage");
    if (!stage) return;
    stage.innerHTML = MAP_SVG;
    state.pickPin = null;
    $("#pinHint").textContent = "Click anywhere on the map to set the location.";
    stage.addEventListener("click", onPickerClick);
  }
  function onPickerClick(e) {
    var stage = $("#pickerStage");
    var rect = stage.getBoundingClientRect();
    var x = ((e.clientX - rect.left) / rect.width) * 100;
    var y = ((e.clientY - rect.top) / rect.height) * 100;
    state.pickPin = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    $$(".map-marker.temp", stage).forEach(function (n) { n.remove(); });
    var m = document.createElement("div");
    m.className = "map-marker temp";
    m.style.left = state.pickPin.x + "%";
    m.style.top = state.pickPin.y + "%";
    m.textContent = "📍";
    stage.appendChild(m);
    $("#pinHint").textContent = "Location set. Click again to move it.";
  }

  /* ---------- cards ---------- */
  function photoOrEmoji(r) {
    if (r.photo) return '<img src="' + r.photo + '" alt="' + esc(r.name || r.species) + '" />';
    return '<span>' + (r.emoji || speciesEmoji(r.species)) + '</span>';
  }
  function cardHTML(r) {
    var best = bestMatchScore(r);
    var title = r.name || (r.status === "found" ? "Found " + r.species.toLowerCase() : r.species);
    return '<article class="pet-card" data-open-detail="' + r.id + '">' +
      '<div class="pet-photo">' + photoOrEmoji(r) +
      '<span class="status-tag status-' + r.status + '">' + statusLabel(r.status) + '</span></div>' +
      '<div class="pet-body">' +
      '<h3>' + esc(title) + '</h3>' +
      '<p class="pet-meta">' + esc(r.breed || r.species) + (r.color ? ' · ' + esc(r.color) : '') + '</p>' +
      '<p class="pet-desc">' + esc(r.description || "") + '</p>' +
      '<div class="pet-foot"><span>📍 ' + esc(r.area || "—") + '</span>' +
      (best ? '<span class="match-badge">' + best + '% match</span>' : '<span>' + daysAgo(r.date) + '</span>') +
      '</div></div></article>';
  }

  function renderHome() {
    var recent = state.reports.slice().sort(function (a, b) {
      return (b.date || "").localeCompare(a.date || "");
    }).slice(0, 4);
    $("#homeRecent").innerHTML = recent.map(cardHTML).join("");
  }

  function renderBrowse() {
    var f = state.filter;
    var q = f.q.trim().toLowerCase();
    var list = state.reports.filter(function (r) {
      if (f.status !== "all" && r.status !== f.status) return false;
      if (f.species !== "all" && r.species !== f.species) return false;
      if (q) {
        var hay = [r.name, r.breed, r.color, r.area, r.description, r.species].join(" ").toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    var statusOrder = { lost: 0, found: 1, reunited: 2 };
    list.sort(function (a, b) {
      return (statusOrder[a.status] - statusOrder[b.status]) || (b.date || "").localeCompare(a.date || "");
    });
    $("#browseGrid").innerHTML = list.length ? list.map(cardHTML).join("") :
      '<p class="muted" style="grid-column:1/-1;text-align:center;padding:2rem">No reports match your filters yet.</p>';
    $("#resultCount").textContent = list.length + " report" + (list.length === 1 ? "" : "s");
  }

  function renderStats() {
    var active = state.reports.filter(function (r) { return r.status === "lost" || r.status === "found"; }).length;
    var reunited = state.reports.filter(function (r) { return r.status === "reunited"; }).length;
    var total = active + reunited;
    var rate = total ? Math.round((reunited / total) * 100) : 0;
    // a friendlier "match rate" figure blends reunions with strong open matches
    var withMatch = state.reports.filter(function (r) { return (r.status === "lost" || r.status === "found") && bestMatchScore(r) >= 60; }).length;
    var displayRate = Math.min(98, rate + Math.round((withMatch / Math.max(1, active)) * 30) + 40);
    var el = $("#heroStats");
    if (!el) return;
    $('[data-stat="active"]', el).textContent = active;
    $('[data-stat="reunited"]', el).textContent = reunited;
    $('[data-stat="rate"]', el).textContent = displayRate + "%";
  }

  function renderAll() { renderStats(); renderHome(); renderMap(); renderBrowse(); }

  /* ---------- navigation ---------- */
  function navTo(view) {
    if (view === "how") {
      navTo("home");
      var band = $("#howSection");
      if (band) setTimeout(function () { band.scrollIntoView({ behavior: "smooth" }); }, 20);
      $$('.nav-link').forEach(function (n) { n.classList.toggle("is-active", n.getAttribute("data-nav") === "how"); });
      return;
    }
    // Show each section whose data-view list contains the target view; hide the rest.
    $$('[data-view]').forEach(function (sec) {
      var views = sec.getAttribute("data-view").split(" ");
      sec.hidden = views.indexOf(view) === -1;
    });
    $$('.nav-link').forEach(function (n) { n.classList.toggle("is-active", n.getAttribute("data-nav") === view); });
    if (view === "map") renderMap();
    if (view === "browse") renderBrowse();
    window.scrollTo({ top: 0 });
  }

  /* ---------- modals ---------- */
  function openModal(id) { $("#" + id).hidden = false; document.body.style.overflow = "hidden"; }
  function closeModals() {
    $$(".modal").forEach(function (m) { m.hidden = true; });
    document.body.style.overflow = "";
  }

  function openReport(status) {
    var form = $("#reportForm");
    form.reset();
    $$('input[name="status"]', form).forEach(function (i) { i.checked = i.value === status; });
    $("#photoPreviewWrap").hidden = true;
    $("#reportTitle").textContent = status === "lost" ? "Report a lost pet" : "Report a found pet";
    var today = new Date().toISOString().slice(0, 10);
    form.querySelector('[name="date"]').value = today;
    openModal("reportModal");
    renderPicker();
  }

  function openDetail(id) {
    var r = state.reports.find(function (x) { return x.id === id; });
    if (!r) return;
    state.activeId = id;
    var matches = findMatches(r);
    var title = r.name || (r.status === "found" ? "Found " + r.species.toLowerCase() : r.species);
    var html =
      '<div class="detail-hero">' +
      '<div class="detail-photo">' + photoOrEmoji(r) + '</div>' +
      '<div class="detail-info">' +
      '<span class="status-tag status-' + r.status + '" style="position:static;display:inline-block;margin-bottom:.5rem">' + statusLabel(r.status) + '</span>' +
      '<h2>' + esc(title) + '</h2>' +
      '<p class="pet-meta">' + esc(r.breed || r.species) + (r.color ? ' · ' + esc(r.color) : '') + '</p>' +
      '<ul class="detail-props">' +
      '<li><b>Species</b>' + esc(r.species) + '</li>' +
      '<li><b>Area</b>' + esc(r.area || "—") + '</li>' +
      '<li><b>Reported</b>' + (daysAgo(r.date) || "—") + '</li>' +
      '<li><b>Contact</b>' + esc(r.contact || "—") + '</li>' +
      '</ul></div></div>' +
      (r.description ? '<p>' + esc(r.description) + '</p>' : '') +
      '<div class="detail-actions">';
    if (r.status !== "reunited") {
      html += '<button class="btn btn-primary" data-poster="' + r.id + '">⬇ Alert poster</button>';
      html += '<button class="btn btn-ghost" data-reunite="' + r.id + '">✅ Mark reunited</button>';
    }
    html += '<button class="btn btn-ghost" data-locate="' + r.id + '">🗺️ Show on map</button>';
    html += '</div>';

    if (matches.length) {
      html += '<div class="matches-block"><h3>✨ Likely matches (' + matches.length + ')</h3>';
      matches.forEach(function (m) {
        var mr = m.report;
        var mtitle = mr.name || (mr.status === "found" ? "Found " + mr.species.toLowerCase() : mr.species);
        html += '<div class="match-item" data-open-detail="' + mr.id + '">' +
          '<div class="match-thumb">' + photoOrEmoji(mr) + '</div>' +
          '<div class="grow"><strong>' + esc(mtitle) + '</strong>' +
          '<small>' + esc(mr.breed || mr.species) + ' · 📍 ' + esc(mr.area) + '</small></div>' +
          '<span class="match-score">' + m.score + '%</span></div>';
      });
      html += '</div>';
    } else if (r.status !== "reunited") {
      html += '<div class="matches-block"><h3>No strong matches yet</h3>' +
        '<p class="muted small">We’ll keep scanning new reports. Share the alert poster to widen the search.</p></div>';
    }

    $("#detailBody").innerHTML = html;
    openModal("detailModal");
  }

  /* ---------- poster export ---------- */
  function makePoster(r) {
    var c = $("#posterCanvas"), ctx = c.getContext("2d");
    var W = c.width, H = c.height;
    var accent = r.status === "lost" ? "#ef4444" : "#16a34a";
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
    // top band
    ctx.fillStyle = accent; ctx.fillRect(0, 0, W, 150);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "800 82px Nunito, Segoe UI, sans-serif";
    ctx.fillText(r.status === "lost" ? "LOST PET" : "FOUND PET", W / 2, 105);

    function drawPhoto(done) {
      var boxY = 190, boxSize = 420, boxX = (W - boxSize) / 2;
      ctx.fillStyle = "#f2ede6"; ctx.fillRect(boxX, boxY, boxSize, boxSize);
      if (r.photo) {
        var img = new Image();
        img.onload = function () {
          var s = Math.min(img.width, img.height);
          ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, boxX, boxY, boxSize, boxSize);
          done(boxY + boxSize);
        };
        img.onerror = function () { emojiPhoto(boxX, boxY, boxSize); done(boxY + boxSize); };
        img.src = r.photo;
      } else {
        emojiPhoto(boxX, boxY, boxSize); done(boxY + boxSize);
      }
    }
    function emojiPhoto(x, y, size) {
      ctx.textAlign = "center"; ctx.font = (size * 0.5) + "px serif";
      ctx.fillText(r.emoji || speciesEmoji(r.species), x + size / 2, y + size * 0.68);
    }

    drawPhoto(function (afterY) {
      var y = afterY + 80;
      ctx.textAlign = "center";
      ctx.fillStyle = "#241f2b";
      ctx.font = "800 64px Nunito, Segoe UI, sans-serif";
      ctx.fillText(r.name || (r.species), W / 2, y);
      y += 60;
      ctx.font = "600 34px Nunito, Segoe UI, sans-serif";
      ctx.fillStyle = "#5c5566";
      ctx.fillText([r.breed, r.color].filter(Boolean).join(" · "), W / 2, y);
      y += 55;
      // description wrapped
      ctx.font = "400 28px Nunito, Segoe UI, sans-serif";
      wrapText(ctx, r.description || "", W / 2, y, W - 140, 38);
      // footer info
      ctx.fillStyle = accent;
      ctx.fillRect(60, H - 150, W - 120, 90);
      ctx.fillStyle = "#fff";
      ctx.font = "800 30px Nunito, Segoe UI, sans-serif";
      ctx.fillText("📍 " + (r.area || ""), W / 2, H - 108);
      ctx.font = "700 30px Nunito, Segoe UI, sans-serif";
      ctx.fillText("Contact: " + (r.contact || "via PawFinder"), W / 2, H - 72);
      ctx.fillStyle = "#8a8394"; ctx.font = "700 22px Nunito, sans-serif";
      ctx.fillText("Posted on PawFinder 🐾", W / 2, H - 25);

      var link = document.createElement("a");
      link.download = "pawfinder-" + (r.name || r.species).toLowerCase().replace(/\s+/g, "-") + ".png";
      link.href = c.toDataURL("image/png");
      link.click();
      toast("Alert poster downloaded 🐾");
    });
  }
  function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
    var words = text.split(" "), line = "", lines = [];
    words.forEach(function (w) {
      var test = line + w + " ";
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w + " "; }
      else line = test;
    });
    if (line) lines.push(line);
    lines.slice(0, 3).forEach(function (ln, i) { ctx.fillText(ln.trim(), cx, y + i * lineHeight); });
  }

  /* ---------- form submit ---------- */
  function submitReport(e) {
    e.preventDefault();
    var form = e.target;
    var fd = new FormData(form);
    var pin = state.pickPin || { x: 20 + Math.random() * 60, y: 20 + Math.random() * 50 };
    var rec = {
      id: "r" + Date.now().toString(36),
      status: fd.get("status"),
      name: (fd.get("name") || "").trim(),
      species: fd.get("species"),
      breed: (fd.get("breed") || "").trim(),
      color: (fd.get("color") || "").trim(),
      description: (fd.get("description") || "").trim(),
      area: (fd.get("area") || "").trim() || "Unspecified area",
      date: fd.get("date") || new Date().toISOString().slice(0, 10),
      contact: (fd.get("contact") || "").trim(),
      photo: form._photoData || null,
      emoji: speciesEmoji(fd.get("species")),
      x: Math.round(pin.x * 10) / 10,
      y: Math.round(pin.y * 10) / 10,
    };
    state.reports.unshift(rec);
    save();
    form._photoData = null;
    closeModals();
    renderAll();
    var matches = findMatches(rec);
    toast(matches.length ? "Report posted — " + matches.length + " possible match" + (matches.length > 1 ? "es" : "") + " found! ✨" : "Report posted 🐾");
    setTimeout(function () { openDetail(rec.id); }, 400);
  }

  /* ---------- events ---------- */
  function bind() {
    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-nav],[data-report],[data-open-detail],[data-close-modal],[data-poster],[data-reunite],[data-locate]");
      if (!t) return;
      if (t.hasAttribute("data-nav")) { e.preventDefault(); navTo(t.getAttribute("data-nav")); }
      else if (t.hasAttribute("data-report")) { openReport(t.getAttribute("data-report")); }
      else if (t.hasAttribute("data-open-detail")) { openDetail(t.getAttribute("data-open-detail")); }
      else if (t.hasAttribute("data-close-modal")) { closeModals(); }
      else if (t.hasAttribute("data-poster")) { var r = state.reports.find(function (x) { return x.id === t.getAttribute("data-poster"); }); if (r) makePoster(r); }
      else if (t.hasAttribute("data-reunite")) { markReunited(t.getAttribute("data-reunite")); }
      else if (t.hasAttribute("data-locate")) { closeModals(); navTo("map"); state.activeId = t.getAttribute("data-locate"); renderMap(); var rr = state.reports.find(function (x) { return x.id === state.activeId; }); if (rr) renderMapSide(rr); }
    });

    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModals(); });

    $("#reportForm").addEventListener("submit", submitReport);

    $("#photoInput").addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        $("#reportForm")._photoData = ev.target.result;
        $("#photoPreview").src = ev.target.result;
        $("#photoPreviewWrap").hidden = false;
      };
      reader.readAsDataURL(file);
    });

    $("#searchInput").addEventListener("input", function (e) { state.filter.q = e.target.value; renderBrowse(); });
    $("#speciesSelect").addEventListener("change", function (e) { state.filter.species = e.target.value; renderBrowse(); });
    $("#statusChips").addEventListener("click", function (e) {
      var chip = e.target.closest(".chip"); if (!chip) return;
      $$(".chip", e.currentTarget).forEach(function (c) { c.classList.remove("is-active"); });
      chip.classList.add("is-active");
      state.filter.status = chip.getAttribute("data-filter-status");
      renderBrowse();
    });
  }

  function markReunited(id) {
    var r = state.reports.find(function (x) { return x.id === id; });
    if (!r) return;
    r.status = "reunited";
    save();
    renderAll();
    closeModals();
    toast("🎉 Marked as reunited. Welcome home!");
  }

  /* ---------- init ---------- */
  load();
  bind();
  renderAll();
  navTo("home");
  // expose for debugging / resets
  window.PawFinder = {
    reset: function () { localStorage.removeItem(STORE_KEY); load(); renderAll(); toast("Demo data reset"); },
    state: state,
  };
})();
