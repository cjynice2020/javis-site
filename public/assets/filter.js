// Javis index — multi-axis filter (kind chips × date range × region × search keyword).
// URL query persists state: ?kind=daily,weekly&from=YYYY-MM-DD&to=YYYY-MM-DD&region=domestic&q=keyword
// Vanilla JS, no deps. Filter is intersection of all axes.
(function () {
  'use strict';

  var REGION_VALUES = ['all', 'domestic', 'international', 'mixed'];

  // --- State ---
  var state = {
    kinds: new Set(['weekly', 'daily']),  // multi: empty = none, full = all
    rangePreset: 'all',                   // 'all' | 'week' | 'month' | 'custom'
    from: null,                           // 'YYYY-MM-DD' or null
    to: null,
    region: 'all',                        // 'all' | 'domestic' | 'international' | 'mixed'
    q: '',
  };

  // --- Selectors ---
  var els = {
    kindChips:   document.querySelectorAll('.chip[data-kind]'),
    rangeChips:  document.querySelectorAll('.chip[data-range]'),
    regionChips: document.querySelectorAll('.chip[data-region]'),
    dateFrom:    document.getElementById('date-from'),
    dateTo:      document.getElementById('date-to'),
    searchQ:     document.getElementById('search-q'),
    reset:       document.getElementById('filter-reset'),
    visibleCnt:  document.getElementById('visible-count'),
    emptyNote:   document.getElementById('filter-empty'),
    cards:       document.querySelectorAll('.report-card'),
    sections:    document.querySelectorAll('[data-section]'),
    lists:       document.querySelectorAll('.report-list'),
  };

  // Bail if not on index page (no cards).
  if (!els.cards.length) return;

  // --- URL ↔ state ---
  function readUrl() {
    var p = new URLSearchParams(window.location.search);
    if (p.has('kind')) {
      var k = p.get('kind').split(',').map(function (s) { return s.trim(); })
        .filter(function (s) { return s === 'weekly' || s === 'daily'; });
      state.kinds = new Set(k);
    }
    if (p.has('range')) {
      var r = p.get('range');
      if (['all', 'week', 'month', 'custom'].indexOf(r) !== -1) state.rangePreset = r;
    }
    if (p.has('from')) state.from = p.get('from') || null;
    if (p.has('to'))   state.to   = p.get('to') || null;
    if (state.from || state.to) state.rangePreset = 'custom';
    if (p.has('region')) {
      var rg = p.get('region');
      if (REGION_VALUES.indexOf(rg) !== -1) state.region = rg;
    }
    if (p.has('q')) state.q = (p.get('q') || '').trim();
  }

  function writeUrl() {
    var p = new URLSearchParams();
    var ks = Array.from(state.kinds).sort();
    // Both selected = default = omit; one selected = explicit
    if (ks.length && ks.length < 2) p.set('kind', ks.join(','));
    if (state.rangePreset !== 'all' && state.rangePreset !== 'custom') {
      p.set('range', state.rangePreset);
    }
    if (state.rangePreset === 'custom') {
      if (state.from) p.set('from', state.from);
      if (state.to)   p.set('to', state.to);
    }
    if (state.region && state.region !== 'all') p.set('region', state.region);
    if (state.q) p.set('q', state.q);
    var qs = p.toString();
    var newUrl = window.location.pathname + (qs ? '?' + qs : '');
    try { history.replaceState(null, '', newUrl); } catch (e) {}
  }

  // --- Date utilities ---
  function pad(n) { return String(n).padStart(2, '0'); }
  function isoDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  function presetRange(preset) {
    var now = new Date();
    if (preset === 'week') {
      // ISO week: Monday → Sunday
      var day = now.getDay() || 7;  // Sun=0 → 7
      var monday = new Date(now); monday.setDate(now.getDate() - (day - 1));
      var sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
      return { from: isoDate(monday), to: isoDate(sunday) };
    }
    if (preset === 'month') {
      var first = new Date(now.getFullYear(), now.getMonth(), 1);
      var last  = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: isoDate(first), to: isoDate(last) };
    }
    return { from: null, to: null };
  }

  function activeRange() {
    if (state.rangePreset === 'custom') return { from: state.from, to: state.to };
    return presetRange(state.rangePreset);
  }

  // --- Highlight helpers ---
  function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // tokens: lowercased trimmed strings. Empty → strip marks, restore text.
  function highlightCard(card, tokens) {
    ['.title', '.summary'].forEach(function (sel) {
      var el = card.querySelector(sel);
      if (!el) return;
      if (el.dataset.origText === undefined) el.dataset.origText = el.textContent;
      var text = el.dataset.origText;
      if (!tokens.length) { el.textContent = text; return; }
      var pattern = tokens.map(escapeRegex).join('|');
      var re = new RegExp('(' + pattern + ')', 'gi');
      el.innerHTML = escapeHtml(text).replace(re, '<mark class="search-hit">$1</mark>');
    });
  }

  // --- Filter ---
  function apply() {
    var range = activeRange();
    // Multi-keyword: space-split → tokens. All tokens must match blob (AND).
    var tokens = state.q
      ? state.q.toLowerCase().split(/\s+/).filter(Boolean)
      : [];
    var visible = 0;

    els.cards.forEach(function (card) {
      var kind = card.dataset.kind;
      var date = card.dataset.date;
      var region = card.dataset.region || 'unknown';
      var blob = card.dataset.search || '';
      var ok = true;
      if (!state.kinds.has(kind)) ok = false;
      if (ok && range.from && date < range.from) ok = false;
      if (ok && range.to   && date > range.to)   ok = false;
      if (ok && state.region !== 'all' && region !== state.region) ok = false;
      if (ok && tokens.length) {
        for (var i = 0; i < tokens.length; i++) {
          if (blob.indexOf(tokens[i]) === -1) { ok = false; break; }
        }
      }
      card.hidden = !ok;
      if (ok) visible++;
      highlightCard(card, ok ? tokens : []);
    });

    // Section/list visibility follows kind selection (independent of card-level filter).
    els.sections.forEach(function (sec) {
      sec.hidden = !state.kinds.has(sec.dataset.section);
    });
    els.lists.forEach(function (ul) {
      ul.hidden = !state.kinds.has(ul.dataset.kind);
    });

    if (els.visibleCnt) els.visibleCnt.textContent = visible;
    if (els.emptyNote)  els.emptyNote.hidden = visible !== 0;
  }

  // --- Render state to UI ---
  function syncUI() {
    els.kindChips.forEach(function (c) {
      var on = state.kinds.has(c.dataset.kind);
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    els.rangeChips.forEach(function (c) {
      var on = state.rangePreset === c.dataset.range;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    els.regionChips.forEach(function (c) {
      var on = state.region === c.dataset.region;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var r = activeRange();
    if (els.dateFrom) els.dateFrom.value = r.from || '';
    if (els.dateTo)   els.dateTo.value   = r.to   || '';
    if (els.searchQ)  els.searchQ.value  = state.q;
  }

  function commit() {
    syncUI();
    apply();
    writeUrl();
  }

  // --- Event wiring ---
  els.kindChips.forEach(function (c) {
    c.addEventListener('click', function () {
      var k = c.dataset.kind;
      if (state.kinds.has(k)) state.kinds.delete(k); else state.kinds.add(k);
      // Prevent empty selection (silent UI) — re-add all if user deselected last chip.
      if (state.kinds.size === 0) state.kinds = new Set(['weekly', 'daily']);
      commit();
    });
  });

  els.rangeChips.forEach(function (c) {
    c.addEventListener('click', function () {
      state.rangePreset = c.dataset.range;
      state.from = null; state.to = null;
      commit();
    });
  });

  els.regionChips.forEach(function (c) {
    c.addEventListener('click', function () {
      state.region = c.dataset.region || 'all';
      commit();
    });
  });

  if (els.dateFrom) {
    els.dateFrom.addEventListener('change', function () {
      state.rangePreset = 'custom';
      state.from = els.dateFrom.value || null;
      commit();
    });
  }
  if (els.dateTo) {
    els.dateTo.addEventListener('change', function () {
      state.rangePreset = 'custom';
      state.to = els.dateTo.value || null;
      commit();
    });
  }

  if (els.searchQ) {
    var t;
    els.searchQ.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () { state.q = els.searchQ.value.trim(); commit(); }, 300);
    });
  }

  if (els.reset) {
    els.reset.addEventListener('click', function () {
      state = { kinds: new Set(['weekly', 'daily']), rangePreset: 'all', from: null, to: null, region: 'all', q: '' };
      commit();
    });
  }

  // --- Init ---
  readUrl();
  commit();
})();
