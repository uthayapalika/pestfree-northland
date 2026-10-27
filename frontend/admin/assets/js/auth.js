// auth.js
// Handles the login form, the register form,
// and keeps logged-out people away from the admin pages.
// Needs config.js and api.js loaded first.

(function () {
  const page = document.body.dataset.page;

  // Show a message in the red/green box on the form.
  function showMessage(text, type) {
    // Use a SweetAlert pop-up when it is loaded.
    if (window.Swal) {
      const s = getComputedStyle(document.documentElement);
      Swal.fire({
        icon: type === "success" ? "success" : "error", text,
        background: s.getPropertyValue("--card-bg").trim() || "#10201b",
        color: s.getPropertyValue("--text").trim() || "#e8f0ec",
        timer: type === "success" ? 1500 : undefined, showConfirmButton: type !== "success",
      });
      return;
    }
    const box = document.getElementById("ae");
    box.className = "alert alert-" + type;
    box.textContent = text;
  }

  // ---------- Protect admin pages ----------
  // Not logged in? Go to the login page.
  if (page !== "login" && page !== "register" && !getToken()) {
    window.location.href = "login.html";
    return;
  }

  // Already logged in but opened login/register? Send field workers to field checks.
  if ((page === "login" || page === "register") && getToken()) {
    window.location.href = getUser().role === "field_worker" ? "check.html" : "dashboard.html";
    return;
  }

  if (page === "login" || page === "register") {
    apiRequest("/auth/registration-status").then(({ enabled }) => {
      if (enabled) return;
      document.querySelectorAll('a[href="register.html"]').forEach((link) => link.remove());
      if (page === "register") {
        document.getElementById("af").innerHTML =
          '<div class="card-body"><h1 class="h2">Registration is closed</h1>' +
          '<p class="text-secondary">Ask a coordinator to create your account.</p>' +
          '<a href="login.html">Return to sign in</a></div>';
      }
    }).catch((err) => {
      if (page === "register") showMessage(err.message, "danger");
    });
  }

  // ---------- Login form ----------
  if (page === "login") {
    document.getElementById("af").addEventListener("submit", async function (e) {
      e.preventDefault(); // stop the page from reloading
      try {
        await api.login(
          document.getElementById("email").value.trim(),
          document.getElementById("password").value
        );
        window.location.href = getUser().role === "field_worker" ? "check.html" : "dashboard.html";
      } catch (err) {
        showMessage(err.message, "danger"); // wrong password, server down, etc.
      }
    });
  }

  // ---------- Register form ----------
  if (page === "register") {
    document.getElementById("af").addEventListener("submit", async function (e) {
      e.preventDefault();
      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const confirm = document.getElementById("confirm").value;

      // Basic checks before calling the API.
      if (!name || !email || !password) return showMessage("Please fill in every field.", "danger");
      if (password !== confirm) return showMessage("Passwords do not match.", "danger");

      try {
        await api.register(name, email, password);
        showMessage("Account created! Redirecting to sign in...", "success");
        setTimeout(() => (window.location.href = "login.html"), 1200);
      } catch (err) {
        showMessage(err.message, "danger");
      }
    });
  }
})();
