// pwa.js
// Offline support: registers the service worker, shows an offline bar,
// and uploads checks that were saved while there was no signal.
(function () {
  // Service workers need https (or localhost).
  const secure = location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname);
  if ("serviceWorker" in navigator && secure) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  // Remember the browser's "install app" offer (the Settings page shows the button).
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    window.deferredInstall = e;
    const b = document.getElementById("install");
    if (b) b.classList.remove("d-none");
  });

  // Offline bar.
  const bar = document.createElement("div");
  bar.className = "offbar d-none";
  bar.textContent = "You are offline. Checks are saved on this device and upload when you are back online.";
  document.body.appendChild(bar);
  const showNet = () => bar.classList.toggle("d-none", navigator.onLine);

  // "3 to sync" badge in the top bar.
  window.updatePending = function () {
    const el = document.getElementById("pending");
    if (!el) return;
    const n = typeof Outbox !== "undefined" ? Outbox.count() : 0;
    el.textContent = n + " to sync";
    el.classList.toggle("d-none", !n);
  };

  // Upload anything waiting, and say what happened.
  async function sync() {
    if (typeof Outbox === "undefined" || !Outbox.count()) return;
    const r = await Outbox.flush();
    updatePending();
    if (!window.Swal) return;
    if (r.sent) Swal.fire({ toast: true, position: "top-end", icon: "success", title: r.sent + " saved check" + (r.sent > 1 ? "s" : "") + " uploaded",
      showConfirmButton: false, timer: 3000, background: "#10201b", color: "#e8f0ec" });
    if (r.failed.length) Swal.fire({ icon: "error", title: "Some checks were refused", background: "#10201b", color: "#e8f0ec",
      text: r.failed.map((f) => f.label + ": " + f.error).join(" | ") });
  }

  window.addEventListener("online", () => { showNet(); sync(); });
  window.addEventListener("offline", showNet);
  window.addEventListener("outbox-changed", updatePending);
  window.addEventListener("load", () => { showNet(); setTimeout(() => { updatePending(); sync(); }, 800); });
  setInterval(updatePending, 3000); // the top bar is drawn after this script loads
})();
