"use strict";

startPage("user", async () => {
  const lines = await api("/trap-lines");
  const lists = await Promise.all(lines.map((l) => api(`/trap-lines/${l.id}/traps`)));

  // Combine every line's traps into one list, remembering which line each belongs to.
  const traps = [];
  lists.forEach((list, i) => {
    list.forEach((t) => {
      t._lineId = lines[i].id;
      t._lineName = lines[i].name;
      traps.push(t);
    });
  });

  const mapEl = h("div", { class: "trapmap" });
  const page = h("div", {},
    h("h1", {}, "Map"),
    h("p", { class: "muted" }, `${traps.length} traps across ${lines.length} trap lines. Click a pin for details.`),
    h("p", { class: "muted" }, "Red = caught, Green = empty, Orange = bait needed, Grey = sprung, Blue = no checks yet."),
    mapEl);

  if (window.PestMap) {
    PestMap.render(mapEl, traps, null, "600px");
  } else {
    mapEl.textContent = "Map file not loaded: check js/map.js exists and map.html loads it.";
  }
  return page;
});