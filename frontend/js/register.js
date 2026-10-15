"use strict";

startPage("public", () => {
  const name = h("input", { type: "text", required: true, minlength: 2, maxlength: 80, autocomplete: "name", placeholder: "Your full name" });
  const email = h("input", { type: "email", required: true, autocomplete: "username", placeholder: "you@example.com" });
  const pw = h("input", { type: "password", required: true, minlength: 8, maxlength: 64, autocomplete: "new-password", placeholder: "Password" });
  const role = select([["volunteer", "Volunteer"], ["coordinator", "Coordinator"]], "volunteer");
  const msg = h("div");
  return h("div", {},
    h("h1", {}, "Create your account"),
    h("p", { class: "sub" }, "It only takes a minute"),
    msg,
    h("form", {
      onsubmit: handler(msg, async () => {
        await api("/auth/register", {
          method: "POST",
          body: { name: name.value.trim(), email: email.value.trim(), password: pw.value, role: role.value },
        });
        const data = await api("/auth/login", {
          method: "POST",
          body: { email: email.value.trim(), password: pw.value },
        });
        Auth.save(data.access_token, data.role);
        Auth.setName(name.value.trim());
        setFlash("Account created. Welcome!");
        location.href = "dashboard.html";
      }),
    },
      field("Name", name),
      field("Email", email),
      field("Password (8 or more characters)", pw),
      field("Role", role),
      h("div", { class: "authrow" },
        h("a", { class: "btn b2", href: "login.html" }, "Back to login"),
        h("button", { class: "btn", type: "submit" }, "Create account"))),
    h("p", { class: "alt" }, "Already registered? ", h("a", { href: "login.html" }, "Log in"))
  );
});
