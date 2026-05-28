// Javis index — filter tabs (전체 / 위클리 / 데일리).
// Toggles body[data-filter]; CSS rules hide the off-target sections.
// Persists choice in localStorage so reload keeps the view.
(function () {
  var STORAGE_KEY = "javis.indexFilter";
  var validFilters = ["all", "weekly", "daily"];

  var tabs = document.querySelectorAll(".filter-tabs .tab");
  if (!tabs.length) return;
  var body = document.body;

  function apply(filter) {
    if (validFilters.indexOf(filter) === -1) filter = "all";
    body.setAttribute("data-filter", filter);
    tabs.forEach(function (t) {
      var on = t.getAttribute("data-filter") === filter;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    try { localStorage.setItem(STORAGE_KEY, filter); } catch (e) {}
  }

  var stored = null;
  try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) {}
  if (stored) apply(stored);

  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      apply(t.getAttribute("data-filter"));
    });
  });
})();
