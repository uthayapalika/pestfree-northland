"use strict";

startPage("user", async () => {
  const lines = await api("/trap-lines");
  const list = lines.length
    ? h("div", { class: "grid" }, lines.map((l) =>
        h("a", { class: "cd link", href: `traps.html?line=${l.id}` },
          h("h3", {}, l.name),
          h("p", {}, l.general_area),
          h("p", { class: "small muted" }, `Created ${fmtDate(l.created_at)}`))))
    : h("p", { class: "muted" }, "No trap lines yet.");

  const parts = [h("h1", {}, "Trap lines"), h("p", { class: "mu" }, "Choose a line to see its traps."), list];

  if (Auth.role === "coordinator") {
    const name = h("input", { type: "text", required: true, minlength: 2, maxlength: 80 });
    const area = h("input", { type: "text", required: true, minlength: 2, maxlength: 120 });
    const msg = h("div");
    parts.push(h("form", {
      class: "cd",
      onsubmit: handler(msg, async () => {
        await api("/trap-lines", { method: "POST", body: { name: name.value.trim(), general_area: area.value.trim() } });
        setFlash("Trap line created.");
        location.reload();
      }),
    },
      h("h2", {}, "New trap line"),
      msg,
      h("div", { class: "row" }, field("Name", name), field("General area", area)),
      h("button", { class: "btn", type: "submit" }, "Create trap line")));
  }
  return h("div", {}, parts);
});
