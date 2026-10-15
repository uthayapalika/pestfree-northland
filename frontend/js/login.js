"use strict";

startPage("public", () => {
  const email = h("input", { type: "email", id: "email", required: true, autocomplete: "username", placeholder: "you@example.com" });
  const pw = h("input", { type: "password", id: "pw", required: true, autocomplete: "current-password", placeholder: "Password" });
  const msg = h("div");
  return h("div", {},
    h("h1", {}, "Welcome back"),
    h("p", { class: "sub" }, "Please enter your login info"),
    msg,
    h("form", {
      onsubmit: handler(msg, async () => {
        const data = await api("/auth/login", {
          method: "POST",
          body: { email: email.value.trim(), password: pw.value },
        });
        Auth.save(data.access_token, data.role);
        Auth.setName((await api("/auth/me")).name);
        location.href = "dashboard.html";
      }),
    },
      h("label", { class: "field" }, h("span", {}, "Email"), email),
      h("label", { class: "field" }, h("span", {}, "Password"), pw),
      h("div", { class: "authrow" },
        h("a", { class: "btn b2", href: "register.html" }, "Register"),
        h("button", { class: "btn", type: "submit" }, "Log in"))),
    h("p", { class: "alt" }, "Don't have an account? ", h("a", { href: "register.html" }, "Sign up here")),
    h("p", { class: "alt small" }, "Demo: coordinator@example.com / Coord1234, volunteer@example.com / Volun1234")
  );
});
