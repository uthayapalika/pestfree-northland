"use strict";

startPage("user", async () => {
  const lineId = Number(param("line"));
  if (!lineId) throw new Error("No trap line chosen. Go back to the trap lines list.");

  const [lines, traps] = await Promise.all([api("/trap-lines"), api(`/trap-lines/${lineId}/traps`)]);
  const line = lines.find((l) => l.id === lineId);

  const table = traps.length
    ? h("div", { class: "table-wrap" }, h("table", {},
        h("thead", {}, h("tr", {}, ["Code", "Type", "Bait", "Location", "Last check", "Status", ""].map((x) => h("th", {}, x)))),
        h("tbody", {}, traps.map((t) =>
          h("tr", {},
            h("td", {}, h("strong", {}, t.code)),
            h("td", {}, t.trap_type),
            h("td", {}, t.recommended_bait),
            h("td", {}, locationCell(t)),
            h("td", {}, fmtDate(t.last_checked_at)),
            h("td", {}, badge(t.last_status)),
            h("td", {}, h("a", { class: "btn small", href: `trap.html?line=${lineId}&trap=${t.id}` }, "Open")))))))
    : h("p", { class: "muted" }, "No traps on this line yet.");

  const parts = [
    h("p", { class: "crumbs" }, h("a", { href: "lines.html" }, "Trap lines"), " / ", line ? line.name : `Line ${lineId}`),
    h("h1", {}, line ? line.name : "Trap line"),
    line ? h("p", { class: "muted" }, line.general_area) : null,
    table,
  ];

  if (Auth.role === "coordinator") {
    const code = h("input", { type: "text", required: true, maxlength: 30 });
    const type = select([["possum", "Possum"], ["rat", "Rat"], ["stoat", "Stoat"]], "possum");
    const area = h("input", { type: "text", required: true, minlength: 2, maxlength: 120 });
    const lat = h("input", { type: "text", inputmode: "decimal", placeholder: "-35.8393" });
    const lng = h("input", { type: "text", inputmode: "decimal", placeholder: "174.5590" });
    const sensitive = h("input", { type: "checkbox" });
    const msg = h("div");
    parts.push(h("form", {
      class: "cd",
      onsubmit: handler(msg, async () => {
        await api(`/trap-lines/${lineId}/traps`, {
          method: "POST",
          body: {
            code: code.value.trim(),
            trap_type: type.value,
            general_area: area.value.trim(),
            exact_lat: toNumber(lat.value, "Latitude"),
            exact_lng: toNumber(lng.value, "Longitude"),
            is_sensitive: sensitive.checked,
          },
        });
        setFlash("Trap added.");
        location.reload();
      }),
    },
      h("h2", {}, "Add a trap"),
      msg,
      h("div", { class: "row" }, field("Trap code", code), field("Trap type", type)),
      field("General area (shown to everyone)", area),
      h("div", { class: "row" }, field("Exact latitude", lat), field("Exact longitude", lng)),
      h("label", { class: "check" }, sensitive, " Sensitive location (hide exact coordinates from unapproved volunteers)"),
      h("button", { class: "btn", type: "submit" }, "Add trap")));
  }
  return h("div", {}, parts);
});
