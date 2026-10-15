"use strict";

startPage("coordinator", async () => {
  const users = await api("/users");
  return h("div", {},
    h("h1", {}, "Users and location access"),
    h("p", { class: "muted" }, "Approved volunteers can see exact coordinates of sensitive traps. Coordinators always can."),
    h("div", { class: "table-wrap" }, h("table", {},
      h("thead", {}, h("tr", {}, ["Name", "Email", "Role", "Exact locations", ""].map((x) => h("th", {}, x)))),
      h("tbody", {}, users.map((u) =>
        h("tr", {},
          h("td", {}, u.name),
          h("td", {}, u.email),
          h("td", {}, u.role),
          h("td", {}, u.role === "coordinator" ? "Always" : u.can_view_exact_location ? "Allowed" : "Hidden"),
          h("td", {}, u.role === "coordinator" ? "" : h("button", {
            class: "btn small",
            type: "button",
            onclick: async (ev) => {
              ev.currentTarget.disabled = true;
              try {
                await api(`/users/${u.id}/location-access`, {
                  method: "PATCH",
                  body: { can_view_exact_location: !u.can_view_exact_location },
                });
                setFlash(`Updated access for ${u.name}.`);
              } catch (e) {
                setFlash(e.message, "error");
              }
              location.reload();
            },
          }, u.can_view_exact_location ? "Revoke access" : "Allow access")))))))
  );
});
