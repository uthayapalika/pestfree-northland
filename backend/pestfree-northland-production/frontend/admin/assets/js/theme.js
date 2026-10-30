// theme.js — light / dark colour theme, remembered in localStorage.
(function () {
  const KEY = "pfn-theme";
  const root = document.documentElement;

  function current() {
    return localStorage.getItem(KEY) === "light" ? "light" : "dark";
  }

  function apply(theme) {
    const t = theme === "light" ? "light" : "dark";
    root.setAttribute("data-theme", t);
    root.setAttribute("data-bs-theme", t);
    localStorage.setItem(KEY, t);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = t === "light" ? "#f3f7f4" : "#08110F";
    document.querySelectorAll("[data-theme-set]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.themeSet === t);
    });
    document.dispatchEvent(new CustomEvent("themechange", { detail: t }));
  }

  apply(current());

  document.addEventListener("click", (e) => {
    const toggle = e.target.closest("[data-theme-toggle]");
    if (toggle) {
      apply(current() === "dark" ? "light" : "dark");
      return;
    }
    const set = e.target.closest("[data-theme-set]");
    if (set) apply(set.dataset.themeSet);
  });

  window.PFNTheme = { get: current, set: apply, toggle: () => apply(current() === "dark" ? "light" : "dark") };
})();
