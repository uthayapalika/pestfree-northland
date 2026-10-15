"use strict";

startPage("user", async () => {
  const lines = await api("/trap-lines");
  const trapsPerLine = await Promise.all(lines.map((l) => api(`/trap-lines/${l.id}/traps`)));
  const traps = trapsPerLine.flatMap((list, i) => list.map((t) => ({ ...t, lineId: lines[i].id })));
  const checksPerTrap = await Promise.all(traps.map((t) => api(`/traps/${t.id}/checks`)));
  const checks = checksPerTrap.flatMap((list, i) => list.map((c) => ({ ...c, trap: traps[i] })));
  checks.sort((a, b) => b.checked_at.localeCompare(a.checked_at));
  const caught = checks.filter((c) => c.status === "caught").length;

  const stat = (label, value) => h("div", { class: "cd stat" }, h("small", {}, label), h("strong", {}, value));
  const firstName = (Auth.name || "").split(" ")[0] || "there";

  const lineCard = h("section", { class: "cd" },
    h("h2", {}, "Trap lines"),
    lines.length
      ? lines.map((l, i) =>
          h("a", { class: "ln", href: `traps.html?line=${l.id}` },
            h("b", {}, l.name),
            h("span", {}, `${l.general_area} \u00b7 ${trapsPerLine[i].length} ${trapsPerLine[i].length === 1 ? "trap" : "traps"}`)))
      : h("p", { class: "muted" }, "No trap lines yet."),
    h("a", { class: "btn small ghost", href: "lines.html" }, "View all trap lines"));

  const recent = checks.slice(0, 6);
  const recentCard = h("section", { class: "cd" },
    h("h2", {}, "Recent checks"),
    recent.length
      ? h("div", { class: "table-wrap in-card" }, h("table", {},
          h("thead", {}, h("tr", {}, ["Trap", "Type", "Status", "Date"].map((x) => h("th", {}, x)))),
          h("tbody", {}, recent.map((c) =>
            h("tr", {},
              h("td", {}, h("a", { href: `trap.html?line=${c.trap.lineId}&trap=${c.trap.id}` }, h("b", {}, c.trap.code))),
              h("td", {}, c.trap.trap_type),
              h("td", {}, badge(c.status)),
              h("td", {}, fmtDate(c.checked_at)))))))
      : h("p", { class: "muted" }, "No checks logged yet."));

  return h("div", {},
    h("h1", {}, `Kia ora, ${firstName}`),
    h("p", { class: "mu" }, "Here is what is happening on the trap lines."),
    h("div", { class: "stats" },
      stat("Trap lines", lines.length), stat("Traps", traps.length),
      stat("Checks logged", checks.length), stat("Caught checks", caught)),
    h("div", { class: "g2" }, lineCard, recentCard));
});
