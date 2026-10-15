"use strict";

startPage("coordinator", async () => {
  const [byLine, byMonth] = await Promise.all([
    api("/reports/catches?group=line"),
    api("/reports/catches?group=month"),
  ]);

  const empty = h("p", { class: "muted" }, "No catches recorded yet.");

  const lineMax = Math.max(1, ...byLine.rows.map((r) => r.catches));
  const lineCard = h("section", { class: "cd" },
    h("h2", {}, "Catches by trap line"),
    byLine.rows.length
      ? h("div", { class: "bars" }, byLine.rows.map((row) =>
          h("div", { class: "bar-row" },
            h("span", {}, row.label),
            h("div", { class: "bar-track" }, h("div", { class: "bar", style: `width:${((row.catches / lineMax) * 100).toFixed(1)}%` })),
            h("span", {}, row.catches))))
      : empty.cloneNode(true));

  const monthMax = Math.max(1, ...byMonth.rows.map((r) => r.catches));
  const monthCard = h("section", { class: "cd" },
    h("h2", {}, "Catches by month"),
    byMonth.rows.length
      ? h("div", {},
          h("div", { class: "cols" }, byMonth.rows.map((row) =>
            h("div", { class: "mcol" },
              h("b", {}, row.catches),
              h("div", { class: "mbar", style: `height:${Math.max(6, (row.catches / monthMax) * 170)}px` })))),
          h("div", { class: "labels" }, byMonth.rows.map((row) => h("span", {}, row.label))))
      : empty.cloneNode(true));

  const buttons = {};
  const modes = [["all", "All"], ["line", "By trap line"], ["month", "By month"]];
  function setMode(mode) {
    lineCard.hidden = mode === "month";
    monthCard.hidden = mode === "line";
    for (const [key, btn] of Object.entries(buttons)) {
      btn.classList.toggle("on", key === mode);
      btn.setAttribute("aria-pressed", String(key === mode));
    }
  }
  const tabs = h("div", { class: "tabs" }, modes.map(([key, label]) => {
    buttons[key] = h("button", { class: "tp", type: "button", onclick: () => setMode(key) }, label);
    return buttons[key];
  }));
  setMode("all");

  return h("div", {},
    h("h1", {}, "Catch report"),
    h("p", { class: "mu" }, "See where and when pests are being caught."),
    tabs,
    h("div", { class: "cd" }, h("div", { class: "total" }, h("strong", {}, byLine.total), h("span", {}, "catches in total"))),
    h("div", { class: "g2 even" }, lineCard, monthCard));
});
