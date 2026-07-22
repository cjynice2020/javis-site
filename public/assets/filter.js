// Javis index — 탭 필터 (전체/위클리/데일리).
// URL query: ?kind=weekly|daily (없으면 전체)
(function () {
  'use strict';

  var tabs  = document.querySelectorAll('.tab[data-kind]');
  var items = document.querySelectorAll('.item[data-kind]');
  var sections = document.querySelectorAll('.date-section');
  var emptyNote = document.getElementById('filter-empty');

  if (!tabs.length) return;

  var active = 'all';

  function apply() {
    var visible = 0;
    items.forEach(function (item) {
      var show = active === 'all' || item.dataset.kind === active;
      item.hidden = !show;
      if (show) visible++;
    });
    sections.forEach(function (sec) {
      var hasVisible = false;
      sec.querySelectorAll('.item').forEach(function (item) {
        if (!item.hidden) hasVisible = true;
      });
      sec.hidden = !hasVisible;
    });
    tabs.forEach(function (tab) {
      var on = tab.dataset.kind === active;
      tab.classList.toggle('is-active', on);
    });
    if (emptyNote) emptyNote.hidden = visible !== 0;
  }

  function setKind(kind) {
    active = kind;
    apply();
    var p = new URLSearchParams(window.location.search);
    if (active === 'all') p.delete('kind'); else p.set('kind', active);
    var qs = p.toString();
    try { history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '')); } catch (e) {}
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () { setKind(tab.dataset.kind); });
  });

  // Init from URL
  var p = new URLSearchParams(window.location.search);
  var k = p.get('kind');
  if (k === 'weekly' || k === 'daily') active = k;
  apply();
})();
