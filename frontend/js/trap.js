"use strict";

startPage("user", async () => {
  const lineId = Number(param("line"));
  const trapId = Number(param("trap"));
  if (!lineId || !trapId) throw new Error("No trap chosen. Go back to the trap lines list.");

  const [traps, checks] = await Promise.all([api(`/trap-lines/${lineId}/traps`), api(`/traps/${trapId}/checks`)]);
  const trap = traps.find((t) => t.id === trapId);
  if (!trap) throw new Error("Trap not found.");

  const status = select(Object.entries(STATUS_LABELS), "empty");
  const species = select(
    SPECIES.map((s) => [s, s[0].toUpperCase() + s.slice(1)]),
    SPECIES.includes(trap.trap_type) ? trap.trap_type : "other");
  const speciesField = field("Species caught", species);
  speciesField.hidden = true;
  status.addEventListener("change", () => { speciesField.hidden = status.value !== "caught"; });
  const notes = h("textarea", { rows: 3, maxlength: 500, placeholder: "Optional notes" });
  const msg = h("div");

  const form = h("form", {
    class: "cd",
    onsubmit: handler(msg, async () => {
      const check = await api(`/traps/${trapId}/checks`, {
        method: "POST",
        body: { status: status.value, notes: notes.value.trim() },
      });
      if (status.value === "caught") {
        await api(`/checks/${check.id}/catches`, { method: "POST", body: { species: species.value } });
        setFlash("Check and catch recorded. Thank you!");
      } else {
        setFlash("Check recorded. Thank you!");
      }
      location.reload();
    }),
  },
    h("h2", {}, "Log a check"),
    msg,
    field("Trap status", status),
    speciesField,
    field("Notes", notes),
    h("button", { class: "btn", type: "submit" }, "Save check"));

  const history = checks.length
    ? h("div", { class: "table-wrap" }, h("table", {},
        h("thead", {}, h("tr", {}, ["Date", "Status", "Notes"].map((x) => h("th", {}, x)))),
        h("tbody", {}, checks.map((c) =>
          h("tr", {}, h("td", {}, fmtDate(c.checked_at)), h("td", {}, badge(c.status)), h("td", {}, c.notes || "-"))))))
    : h("p", { class: "muted" }, "No checks logged yet.");

  return h("div", {},
    h("p", { class: "crumbs" },
      h("a", { href: "lines.html" }, "Trap lines"), " / ",
      h("a", { href: `traps.html?line=${lineId}` }, "Back to line"), " / ", trap.code),
    h("h1", {}, `Trap ${trap.code}`),
    h("div", { class: "cd" },
      h("p", {}, h("strong", {}, "Type: "), trap.trap_type, "  ", h("strong", {}, "Bait: "), trap.recommended_bait),
      h("div", {}, h("strong", {}, "Location: "), locationCell(trap)),
      h("p", {}, h("strong", {}, "Last status: "), badge(trap.last_status))),
    form,
    h("h2", {}, "Check history"),
    history);
});
