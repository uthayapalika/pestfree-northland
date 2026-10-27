
/* pwa.js
   Pest-Free Northland Tracker
   - Offline support
   - Android installation prompt
   - iPhone/iPad installation instructions
   - Pending checks and automatic sync
*/

(function () {
  // ----------------------------------------
  // 1. Service worker registration
  // ----------------------------------------
  const secure =
    location.protocol === "https:" ||
    ["localhost", "127.0.0.1"].includes(location.hostname);

  if ("serviceWorker" in navigator && secure) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch((err) => {
        console.error("Offline support could not start:", err);
      });
    });
  }

  // ----------------------------------------
  // 2. Request persistent offline storage
  // ----------------------------------------
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().then((granted) => {
      if (!granted) {
        console.warn(
          "The browser may clear offline data when device storage is low."
        );
      }
    }).catch((err) => {
      console.warn("Could not request persistent storage:", err);
    });
  }

  // ----------------------------------------
  // 3. Detect iPhone/iPad and app mode
  // ----------------------------------------
  const isIOS =
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" &&
      navigator.maxTouchPoints > 1);

  function isInstalled() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      navigator.standalone === true
    );
  }

  // ----------------------------------------
  // 4. Installation button
  // ----------------------------------------
  function setupInstallButton() {
    const button = document.getElementById("install");
    if (!button) return;

    // Do not show installation options inside the installed app.
    if (isInstalled()) {
      button.classList.add("d-none");
      return;
    }

    if (isIOS) {
      // iPhone Safari does not support beforeinstallprompt.
      button.classList.remove("d-none");
      button.textContent = "How to Install App";
      button.onclick = () => {
        const message =
          "Install Pest-Free on your iPhone:\n\n" +
          "1. Open this website in Safari.\n" +
          "2. Tap the Share button.\n" +
          "3. Choose Add to Home Screen.\n" +
          "4. Enable Open as Web App if available.\n" +
          "5. Tap Add.\n\n" +
          "If you cannot find this option, check that you are " +
          "using Safari and that your website is accessible.";

        if (window.Swal) {
          Swal.fire({
            title: "Install Pest-Free",
            text: message,
            icon: "info",
            confirmButtonText: "Got it",
            background: "#10201b",
            color: "#e8f0ec"
          });
        } else {
          alert(message);
        }
      };
    }

    // On other browsers, keep the button hidden until
    // beforeinstallprompt confirms installation is available.
  }

  // Support scripts loaded before or after DOMContentLoaded.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupInstallButton);
  } else {
    setupInstallButton();
  }

  // Android Chrome and other supporting browsers.
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    window.deferredInstall = e;

    const button = document.getElementById("install");
    if (button && !isInstalled()) {
      button.textContent = "Install App";
      button.classList.remove("d-none");

      button.onclick = async () => {
        const installEvent = window.deferredInstall;
        if (!installEvent) return;

        installEvent.prompt();

        try {
          const choice = await installEvent.userChoice;

          if (choice.outcome === "accepted") {
            button.classList.add("d-none");
          }
        } catch (err) {
          console.warn("Installation prompt failed:", err);
        }

        window.deferredInstall = null;
      };
    }
  });

  // Hide the button after installation.
  window.addEventListener("appinstalled", () => {
    window.deferredInstall = null;

    const button = document.getElementById("install");
    if (button) button.classList.add("d-none");
  });

  // ----------------------------------------
  // 5. Offline status bar
  // ----------------------------------------
  const bar = document.createElement("div");
  bar.className = "offbar d-none";
  bar.textContent =
    "You are offline. Checks are saved on this device " +
    "and upload when you are back online.";

  function addOfflineBar() {
    if (!bar.isConnected) {
      document.body.appendChild(bar);
    }
    showNet();
  }

  function showNet() {
    bar.classList.toggle("d-none", navigator.onLine);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addOfflineBar);
  } else {
    addOfflineBar();
  }

  // ----------------------------------------
  // 6. Pending sync badge
  // ----------------------------------------
  window.updatePending = function () {
    const el = document.getElementById("pending");
    if (!el) return;

    const n =
      typeof Outbox !== "undefined" ? Outbox.count() : 0;

    el.textContent = n + " to sync";
    el.classList.toggle("d-none", !n);
  };

  // ----------------------------------------
  // 7. Upload saved offline checks
  // ----------------------------------------
  async function sync() {
    if (
      typeof Outbox === "undefined" ||
      !navigator.onLine ||
      !Outbox.count()
    ) {
      return;
    }

    try {
      const r = await Outbox.flush();
      window.updatePending();

      if (!window.Swal) return;

      if (r.sent) {
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title:
            r.sent + " saved check" +
            (r.sent > 1 ? "s" : "") + " uploaded",
          showConfirmButton: false,
          timer: 3000,
          background: "#10201b",
          color: "#e8f0ec"
        });
      }

      if (r.failed && r.failed.length) {
        Swal.fire({
          icon: "error",
          title: "Some checks were refused",
          background: "#10201b",
          color: "#e8f0ec",
          text: r.failed
            .map((f) => f.label + ": " + f.error)
            .join(" | ")
        });
      }

      if (r.blocked) {
        Swal.fire({
          icon: "warning",
          title: "Some checks are for another account",
          background: "#10201b",
          color: "#e8f0ec",
          text:
            r.blocked + " queued check" +
            (r.blocked === 1 ? " is" : "s are") +
            " kept on this device and will only sync when that account signs in."
        });
      }

      if (r.unassigned) {
        Swal.fire({
          icon: "warning",
          title: "Older checks need review",
          background: "#10201b",
          color: "#e8f0ec",
          text:
            r.unassigned + " check" +
            (r.unassigned === 1 ? " was" : "s were") +
            " saved before account-specific syncing. Open Field check " +
            "and choose Sync now to review before uploading."
        });
      }
    } catch (err) {
      console.error("Offline check sync failed:", err);
    }
  }

  // ----------------------------------------
  // 8. Online/offline events
  // ----------------------------------------
  window.addEventListener("online", () => {
    showNet();
    sync();
  });

  window.addEventListener("offline", showNet);
  window.addEventListener("outbox-changed", window.updatePending);

  window.addEventListener("load", () => {
    showNet();

    setTimeout(() => {
      window.updatePending();
      sync();
    }, 800);
  });

  // Keep the pending badge updated.
  setInterval(window.updatePending, 3000);
})();
