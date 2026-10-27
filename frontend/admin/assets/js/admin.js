// admin.js
// Builds every admin page (the HTML files only have an empty #content box).
// Needs config.js, api.js, utils.js and auth.js loaded first.

const PAGE = document.body.dataset.page;          // which page we are on
const content = document.getElementById("content"); // where we draw the page
let me = getUser();                                // logged-in user (refreshed from the API at the bottom)
const isCoord = () => me.role === "coordinator";   // volunteers get a smaller menu and no edit buttons
const isFieldWorker = () => me.role === "field_worker";

// Menu links: [page name, label, icon, coordinator only?]
const NAV = [
  ["dashboard", "Dashboard", "speedometer2"], ["check", "Field check", "clipboard-check"],
  ["tasks", "Field tasks", "clipboard2-check"], ["sync", "Sync status", "arrow-repeat"],
  ["map", "Map", "map"], ["traps", "Traps", "geo-alt"], ["lines", "Trap lines", "diagram-3"],
  ["catches", "Catches", "bug"], ["reports", "Reports", "bar-chart", true],
  ["qr", "QR codes", "qr-code", true], ["audit", "Audit history", "journal-text", true],
  ["users", "Users", "people", true], ["settings", "Settings", "gear"],
];
const COORD_ONLY = NAV.filter((n) => n[3]).map((n) => n[0]);

// The API may reply with [..] or {data:[..]} - this accepts both.
const list = (r) => (Array.isArray(r) ? r : (r && r.data) || []);

// Make text safe to put inside HTML.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function exportPDF(title, sections) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    fail(new Error("The PDF window was blocked. Allow pop-ups for this site and try again."));
    return;
  }
  const content = sections.map(({ title: heading, columns, rows }) => `
    <section>
      ${heading ? `<h2>${esc(heading)}</h2>` : ""}
      <table>
        <thead><tr>${columns.map((column) => `<th>${esc(column.label)}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((row) => `<tr>${columns.map((column) => `<td>${esc(row[column.key])}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </section>`).join("");
  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
    <html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title>
    <style>
      @page { size: landscape; margin: 16mm; }
      body { color: #17211b; font: 12px Arial, sans-serif; }
      h1 { margin: 0 0 4px; font-size: 22px; }
      h2 { margin: 20px 0 8px; font-size: 16px; }
      p { color: #52635a; margin: 0 0 18px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
      th, td { border: 1px solid #cbd5ce; padding: 7px; text-align: left; }
      th { background: #edf3ee; }
      tr { break-inside: avoid; }
      section { break-inside: auto; }
      @media screen { body { max-width: 1100px; margin: 32px auto; } }
    </style></head><body>
    <h1>${esc(title)}</h1><p>Generated ${esc(new Date().toLocaleString("en-NZ", { dateStyle: "medium", timeStyle: "short" }))}. Choose “Save as PDF” in the print dialog.</p>
    ${content}</body></html>`);
  printWindow.document.close();
  printWindow.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 500);
}

// Show an error message at the top of the page.
function showError(err) {
  const box = document.getElementById("err");
  box.textContent = err.message;
  box.classList.remove("d-none");
}

const LOGO = `<span class="bi-logo"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l5 6h-3l4 5h-4l3 4H7l3-4H6l4-5H7z"/><path d="M12 18v3"/></svg></span>`;
const themeToggle = () =>
  `<button type="button" class="icon-btn" data-theme-toggle aria-label="Toggle light or dark mode" title="Light / dark">
     <i class="bi bi-sun-fill theme-icon-light"></i><i class="bi bi-moon-stars-fill theme-icon-dark"></i>
   </button>`;

function closeSidebar() {
  document.getElementById("sb")?.classList.remove("open");
  document.getElementById("sbOverlay")?.classList.remove("open");
}

// Draw the sidebar + top bar, and put `inner` HTML underneath.
function shell(title, inner) {
  const links = NAV.filter((n) => isFieldWorker()
    ? ["check", "tasks", "sync"].includes(n[0])
    : (!n[3] || isCoord())).map(([id, label, icon]) =>
    `<a class="nav-link ${id === PAGE ? "active" : ""}" href="${id}.html"><i class="bi bi-${icon}"></i> ${label}</a>`
  ).join("");
  const initial = esc((me.name || me.email || "?").trim().charAt(0).toUpperCase());
  content.innerHTML = `
    <div class="app">
      <div class="sb-overlay" id="sbOverlay"></div>
      <aside class="sb" id="sb">
        <a class="brand sb-brand" href="../index.html">${LOGO}<span>Pest-Free<small>Admin panel</small></span></a>
        <nav class="sb-nav">${links}</nav>
        <div class="sb-foot">
          <div class="user-chip">
            <div class="user-avatar">${initial}</div>
            <div class="meta">
              <div class="name">${esc(me.name || me.email)}</div>
              <div class="role">${esc(me.role || "")}</div>
            </div>
          </div>
          <button id="out" class="btn btn-sm btn-outline-secondary w-100">Log out</button>
        </div>
      </aside>
      <div class="app-main">
        <header class="top">
          <button type="button" class="icon-btn menu-btn" id="menuBtn" aria-label="Open menu"><i class="bi bi-list"></i></button>
          <h1 class="page-title">${title}</h1>
          <div class="top-actions">
            <span id="pending" class="badge text-bg-warning d-none"></span>
            ${themeToggle()}
          </div>
        </header>
        <main class="page-body">
          <div id="err" class="alert alert-danger d-none" role="alert" aria-live="assertive"></div>${inner}
        </main>
      </div>
    </div>`;
  document.getElementById("out").onclick = logout;
  document.getElementById("menuBtn").onclick = () => {
    document.getElementById("sb").classList.toggle("open");
    document.getElementById("sbOverlay").classList.toggle("open");
  };
  document.getElementById("sbOverlay").onclick = closeSidebar;
  if (window.updatePending) updatePending();
}

// A small statistic card. `tone` = optional text colour class.
const card = (label, value, tone = "") =>
  `<div class="col-6 col-md-4 col-lg"><div class="card stat h-100"><div class="card-body">
   <div class="stat-label">${label}</div><div class="stat-value ${tone}">${value}</div></div></div></div>`;

// Count how many times each value appears. e.g. count(catches, "species")
function count(items, field) {
  const result = {};
  items.forEach((i) => { const k = i[field] || "Unknown"; result[k] = (result[k] || 0) + 1; });
  return result;
}

// Make a table from an object like {Rat: 5, Stoat: 2}.
function countTable(obj, heading) {
  const rows = Object.entries(obj).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join("");
  return `<table class="table"><thead><tr><th>${heading}</th><th>Total</th></tr></thead><tbody>${rows || "<tr><td colspan=2>No data</td></tr>"}</tbody></table>`;
}


// ================= DASHBOARD =================
// Gets every trap check (this API lists checks per trap).
async function loadChecks(traps) {
  const all = await Promise.all(traps.map((t) => api.getTrapChecks(t.id).catch(() => [])));
  return all.flatMap(list);
}

// Draw one Chart.js chart inside <canvas id=...>. Shows a note instead if there is nothing to draw.
const CHART_COLORS = ["#3fb27f", "#4dabf7", "#e0a526", "#e5534b", "#9b7be0", "#e07bb5", "#8b9a93"];
const charts = Object.create(null);
function drawChart(id, type, labels, values, colors, horizontal) {
  const el = document.getElementById(id);
  if (!el) return;
  const note = (t) => { el.parentElement.innerHTML = `<p class="text-secondary small">${t}</p>`; };
  if (!window.Chart) return note("Charts could not load (are you offline?).");
  if (!values.some((v) => v > 0)) return note("No data yet.");
  const theme = getComputedStyle(document.documentElement);
  Chart.defaults.color = theme.getPropertyValue("--muted").trim() || "#9db3a8";
  Chart.defaults.borderColor = theme.getPropertyValue("--chart-grid").trim() || "rgba(255,255,255,.08)";
  const round = type === "doughnut";
  const axis = { beginAtZero: true, ticks: { precision: 0 } };
  charts[id] = new Chart(el, {
    type,
    data: {
      labels: labels.map((label) => window.pfnTranslate ? window.pfnTranslate(label) : label),
      datasets: [{ data: values, backgroundColor: colors || CHART_COLORS[0], borderWidth: 0, borderRadius: round ? 0 : 6 }],
    },
    options: {
      maintainAspectRatio: false, indexAxis: horizontal ? "y" : "x",
      plugins: { legend: { display: round, position: "bottom" } },
      scales: round ? {} : horizontal ? { x: axis } : { y: axis },
    },
  });
  charts[id].sourceLabels = labels;
}
document.addEventListener("pfn-language-change", (event) => {
  Object.values(charts).forEach((chart) => {
    chart.data.labels = chart.labelForLanguage
      ? chart.labelForLanguage(event.detail.language)
      : chart.sourceLabels.map((label) => window.pfnTranslate ? window.pfnTranslate(label) : label);
    chart.update();
  });
});

const chartCard = (title, id, cols = "col-lg-6") =>
  `<div class="${cols}"><div class="card h-100"><div class="card-body"><h2 class="h6 mb-3">${title}</h2>
   <div class="chart-box"><canvas id="${id}"></canvas></div></div></div></div>`;

async function dashboardPage() {
  shell("Dashboard", "<div id='body'>Loading...</div>");
  try {
    const [traps, lines] = await Promise.all([api.getTraps(), api.getLines()]).then((r) => r.map(list));
    const checks = await loadChecks(traps);
    let catches = [], users = [];
    try { catches = list(await api.getCatches()); } catch (e) { catches = checks.filter((c) => c.status === "caught"); }
    if (isCoord()) { try { users = list(await api.getUsers()); } catch (e) {} } // volunteers may not see users

    const code = Object.fromEntries(traps.map((t) => [t.id, t.code]));
    const lineName = Object.fromEntries(lines.map((l) => [l.id, l.name]));

    // ----- Overdue alerts -----
    const states = traps.map((t) => ({ t, s: trapState(t) }));
    const overdueCount = states.filter(({ s }) => s.key === "overdue" || s.key === "never").length;
    const alerts = states
      .filter(({ t, s }) => s.key === "overdue" || s.key === "never" || needsAttention(t))
      .sort((a, b) => (b.s.days ?? 9999) - (a.s.days ?? 9999));
    const alertRows = alerts.slice(0, 10).map(({ t }) => `<tr>
      <td><b>${esc(t.code)}</b></td><td>${esc(lineName[t.trap_line_id] || "")}</td><td>${stateBadge(t)}</td>
      <td>${needsAttention(t) ? `<span class="badge text-bg-warning">${esc(t.last_status.replace("_", " "))}</span>` : esc(t.last_status || "-")}</td>
      <td class="text-end"><a class="btn btn-sm btn-primary" href="check.html?trap=${esc(t.id)}">Log check</a></td></tr>`).join("");

    // Newest 5 checks.
    const recent = [...checks].sort((a, b) => String(b.checked_at).localeCompare(String(a.checked_at))).slice(0, 5)
      .map((c) => `<tr><td>${esc(code[c.trap_id] ?? c.trap_id)}</td><td>${esc(c.status)}</td><td>${esc(String(c.checked_at).replace("T", " ").slice(0, 16))}</td></tr>`).join("");

    document.getElementById("body").innerHTML = `
      <div class="row g-3 mb-4">${card("Traps", traps.length)}${card("Trap lines", lines.length)}
        ${card("Checks", checks.length)}${card("Catches", catches.length)}
        ${card("Overdue traps", overdueCount, overdueCount ? "text-danger" : "")}${users.length ? card("Users", users.length) : ""}</div>

      <div class="card mb-4"><div class="card-body">
        <h2 class="h5 mb-3"><i class="bi bi-exclamation-triangle text-warning"></i> Needs a visit
          <span class="badge text-bg-secondary">${alerts.length}</span></h2>
        ${alerts.length ? `<div class="table-responsive"><table class="table align-middle mb-0"><thead><tr><th>Trap</th><th>Line</th><th>Check status</th><th>Last result</th><th></th></tr></thead>
          <tbody>${alertRows}</tbody></table></div>${alerts.length > 10 ? `<p class="small text-secondary mt-2 mb-0">Showing 10 of ${alerts.length}. See the Traps page for all.</p>` : ""}`
          : "<p class='text-secondary mb-0'>All traps are up to date.</p>"}
      </div></div>

      <div class="row g-3 mb-4">
        ${chartCard("Catches per month (last 12 months)", "cMonth", "col-lg-8")}
        ${chartCard("Trap check status", "cHealth", "col-lg-4")}
        ${chartCard("Catches by species", "cSpecies", "col-lg-5")}
        ${chartCard("Catches by trap line", "cLine", "col-lg-7")}
      </div>

      <h2 class="h5">Recent checks</h2>
      <table class="table"><thead><tr><th>Trap</th><th>Status</th><th>Checked at</th></tr></thead>
      <tbody>${recent || "<tr><td colspan=3>No checks yet</td></tr>"}</tbody></table>`;

    // ----- Charts -----
    const pad = (n) => String(n).padStart(2, "0");
    const now = new Date(), months = [];
    for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push(d.getFullYear() + "-" + pad(d.getMonth() + 1)); }
    const perMonth = Object.fromEntries(months.map((m) => [m, 0]));
    catches.forEach((c) => { const d = parseDate(c.recorded_at); if (!d) return; const k = d.getFullYear() + "-" + pad(d.getMonth() + 1); if (k in perMonth) perMonth[k]++; });
    const monthLabels = (lang) => months.map((k) => {
      const [y, m] = k.split("-");
      const locale = lang === "mi" ? "mi-NZ" : undefined;
      return new Date(+y, +m - 1, 1).toLocaleDateString(locale, { month: "short", year: "2-digit" });
    });
    drawChart("cMonth", "bar", monthLabels(document.documentElement.lang), months.map((m) => perMonth[m]));
    if (charts.cMonth) charts.cMonth.labelForLanguage = monthLabels;

    const bySpecies = count(catches, "species");
    drawChart("cSpecies", "doughnut", Object.keys(bySpecies), Object.values(bySpecies), CHART_COLORS);

    const trapLine = Object.fromEntries(traps.map((t) => [t.id, lineName[t.trap_line_id] || "Unknown"]));
    const byLine = count(catches.map((c) => ({ l: trapLine[c.trap_id] })), "l");
    drawChart("cLine", "bar", Object.keys(byLine), Object.values(byLine), CHART_COLORS[0], true);

    const health = { ok: 0, due: 0, overdue: 0, never: 0 };
    states.forEach(({ s }) => health[s.key]++);
    drawChart("cHealth", "doughnut", ["Up to date", "Due soon", "Overdue", "Never checked"], [health.ok, health.due, health.overdue, health.never], ["#3fb27f", "#e0a526", "#e5534b", "#8b9a93"]);
  } catch (err) { showError(err); }
}


// ================= MESSAGE BOXES (SweetAlert2) =================
// Common look for every pop-up (dark theme, same buttons as the site).
function boxColors() {
  const s = getComputedStyle(document.documentElement);
  return { background: s.getPropertyValue("--card-bg").trim() || "#10201b", color: s.getPropertyValue("--text").trim() || "#e8f0ec" };
}
const Box = Swal.mixin({
  ...boxColors(), buttonsStyling: false,
  customClass: { confirmButton: "btn btn-primary mx-1", cancelButton: "btn btn-outline-secondary mx-1" },
});
// Small message in the corner that disappears by itself.
const Toast = Box.mixin({ toast: true, position: "top-end", showConfirmButton: false, timer: 2500, timerProgressBar: true });

const success = (text) => Toast.fire({ icon: "success", title: text });
const fail = (err) => Box.fire({ icon: "error", title: "Something went wrong", text: err.message });
// Asks "are you sure?" and gives back true or false.
const confirmDelete = () => Box.fire({
  icon: "warning", title: "Delete this item?", text: "This cannot be undone.",
  showCancelButton: true, confirmButtonText: "Yes, delete", cancelButtonText: "Cancel",
}).then((r) => r.isConfirmed);

async function flushOutboxWithConfirmation() {
  let result = await Outbox.flush();
  if (!result.unassigned) return result;
  const confirmation = await Box.fire({
    icon: "warning",
    title: "Older queued checks",
    text: `${result.unassigned} check${result.unassigned === 1 ? " was" : "s were"} saved before account-specific syncing. If uploaded now, they will be recorded under ${me.name || me.email}.`,
    showCancelButton: true,
    confirmButtonText: "Upload as my account",
    cancelButtonText: "Keep on this device",
  });
  if (confirmation.isConfirmed) result = await Outbox.flush({ includeUnassigned: true });
  return result;
}


// ================= ADD / EDIT FORM (centered modal) =================
// Shows ONE form with every field.
//   title  = heading, fields = list of field names, values = current values (for edit)
//   save   = async function that gets the typed data and sends it to the API
// The form stays open (with the error shown) if save() fails, so nothing typed is lost.
// Gives back true if saved, false if the user cancelled.
function openForm(title, fields, values = {}, save, choices = {}) {
  return new Promise((resolve) => {
    const lists = {}; // the dropdown options actually shown, per field
    const hasLocationPicker = fields.includes("exact_lat") && fields.includes("exact_lng");
    const hasLocation = values.exact_lat !== null && values.exact_lat !== undefined && values.exact_lat !== "" &&
      values.exact_lng !== null && values.exact_lng !== undefined && values.exact_lng !== "" &&
      Number.isFinite(Number(values.exact_lat)) && Number.isFinite(Number(values.exact_lng));
    const autoLocate = hasLocationPicker && !hasLocation && title.toLowerCase().startsWith("add ");
    // Pick the input type from the field name / current value.
    const typeOf = (f, v) => (typeof v === "number" || /^(lat|lng)$|_id$|_lat$|_lng$/.test(f)) ? "number"
                           : /email/.test(f) ? "email" : /password/.test(f) ? "password" : /_at$/.test(f) ? "datetime-local" : /date/.test(f) ? "date" : "text";

    // One input per field (everything is required except description/notes).
    const inputs = fields.map((f) => {
      const label = LABELS[f] || f.replace(/_/g, " ");

      if (hasLocationPicker && f === "exact_lat") {
        return `<div class="mb-3">
          <label class="form-label small text-secondary">Trap location</label>
          <div id="trap-location-map" class="trap-location-map rounded"></div>
          <div id="trap-location-status" class="form-text">${hasLocation
            ? `Pinned at ${esc(Number(values.exact_lat).toFixed(6))}, ${esc(Number(values.exact_lng).toFixed(6))}`
            : autoLocate
              ? "Finding your location... Allow location access when your browser asks."
              : "Click the map to place a pin. A location is required."}</div>
          <input type="hidden" name="exact_lat" value="${hasLocation ? esc(values.exact_lat) : ""}">
          <input type="hidden" name="exact_lng" value="${hasLocation ? esc(values.exact_lng) : ""}">
        </div>`;
      }
      if (hasLocationPicker && f === "exact_lng") return "";

      // Dropdown field: the user picks from a list instead of typing.
      if (choices[f]) {
        const cur = String(values[f] ?? "");
        let opts = choices[f];
        // Keep the current value on Edit even if it is not in the list.
        if (cur !== "" && !opts.some((o) => String(o.value) === cur)) opts = [...opts, { value: values[f], label: String(values[f]) }];
        lists[f] = opts;
        const options = opts.map((o) => `<option value="${esc(o.value)}" ${String(o.value) === cur ? "selected" : ""}>${esc(o.label)}</option>`).join("");
        return `<div class="mb-3"><label class="form-label small text-secondary text-capitalize">${esc(label)}</label>
          <select class="form-select" name="${esc(f)}" required>
            <option value="" disabled ${cur === "" ? "selected" : ""}>Choose...</option>${options}</select></div>`;
      }

      const type = typeOf(f, values[f]);
      const v = type === "date" ? String(values[f] ?? "").slice(0, 10)
              : type === "datetime-local" ? String(values[f] ?? "").slice(0, 16) : (values[f] ?? "");
      return `<div class="mb-3"><label class="form-label small text-secondary text-capitalize">${esc(label)}</label>
        <input class="form-control" name="${esc(f)}" type="${type}" ${type === "number" ? 'step="any"' : ""}
        value="${esc(v)}" ${/description|notes|checked_at|performed_at/.test(f) ? "" : "required"}></div>`;
    }).join("");

    // The modal itself (Bootstrap). focus:false lets the SweetAlert error box work on top of it.
    const el = document.createElement("div");
    el.className = "modal fade";
    el.tabIndex = -1;
    el.innerHTML = `<div class="modal-dialog modal-dialog-centered"><form class="modal-content">
      <div class="modal-header"><h5 class="modal-title">${esc(title)}</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
      <div class="modal-body">${inputs}</div>
      <div class="modal-footer">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button></div>
    </form></div>`;
    document.body.appendChild(el);
    const modal = new bootstrap.Modal(el, { focus: false });
    const form = el.querySelector("form");
    let saved = false;
    let locationMap;

    // Save pressed: check the fields, read them, call save().
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      form.classList.add("was-validated");
      if (hasLocationPicker && (!form.elements.exact_lat.value || !form.elements.exact_lng.value)) {
        const status = form.querySelector("#trap-location-status");
        status.textContent = "Please click the map to place a pin before saving.";
        status.classList.add("text-danger");
        return;
      }
      if (!form.checkValidity()) return; // browser highlights the missing field

      const data = {};
      fields.forEach((f) => {
        const input = form.elements[f];
        if (lists[f]) { // dropdown: give back the original value (number / true / false / text)
          data[f] = lists[f].find((o) => String(o.value) === input.value).value;
          return;
        }
        data[f] = input.type === "number" || f === "exact_lat" || f === "exact_lng"
          ? (input.value === "" ? null : Number(input.value)) : input.value.trim();
      });

      // Show a spinner and block double clicks while saving.
      const btn = form.querySelector("[type=submit]");
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';
      try {
        await save(data);
        saved = true;
        modal.hide();
      } catch (err) {
        btn.disabled = false;
        btn.textContent = "Save";
        fail(err); // error box - the form stays open
      }
    });

    // When the modal has closed: clean up and report what happened.
    el.addEventListener("hidden.bs.modal", () => {
      if (locationMap) locationMap.remove();
      el.remove();
      resolve(saved);
    });
    el.addEventListener("shown.bs.modal", () => {
      el.querySelector('input:not([type="hidden"]), select')?.focus();
      if (!hasLocationPicker) return;
      if (!window.L) {
        fail(new Error("The map could not load. Check your internet connection and try again."));
        return;
      }
      let locationSelected = hasLocation;
      const lat = hasLocation ? Number(values.exact_lat) : -35.725;
      const lng = hasLocation ? Number(values.exact_lng) : 174.32;
      locationMap = L.map("trap-location-map").setView([lat, lng], hasLocation ? 15 : 10);
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 19, attribution: "Tiles &copy; Esri",
      }).addTo(locationMap);
      let marker;
      const setLocation = (point) => {
        locationSelected = true;
        const exactLat = Number(point.lat.toFixed(6));
        const exactLng = Number(point.lng.toFixed(6));
        form.elements.exact_lat.value = exactLat;
        form.elements.exact_lng.value = exactLng;
        const status = form.querySelector("#trap-location-status");
        status.textContent = `Pinned at ${exactLat.toFixed(6)}, ${exactLng.toFixed(6)}`;
        status.classList.remove("text-danger");
        if (!marker) {
          marker = L.marker(point, { draggable: true }).addTo(locationMap);
          marker.on("dragend", () => setLocation(marker.getLatLng()));
        } else {
          marker.setLatLng(point);
        }
      };
      if (hasLocation) {
        marker = L.marker([lat, lng], { draggable: true }).addTo(locationMap);
        marker.on("dragend", () => setLocation(marker.getLatLng()));
      }
      locationMap.on("click", (event) => setLocation(event.latlng));
      locationMap.invalidateSize();
      if (autoLocate) {
        const status = form.querySelector("#trap-location-status");
        if (!navigator.geolocation) {
          status.textContent = "Location isn't available in this browser. Click the map to place a pin.";
          return;
        }
        navigator.geolocation.getCurrentPosition((position) => {
          if (!el.isConnected || locationSelected) return;
          const point = { lat: position.coords.latitude, lng: position.coords.longitude };
          locationMap.setView(point, 17);
          setLocation(point);
          status.textContent = "Your current location is pinned. Drag the pin if needed.";
        }, (error) => {
          if (!el.isConnected || locationSelected) return;
          status.textContent = error.code === error.PERMISSION_DENIED
            ? "Location access was denied. Allow access in your browser settings or click the map to place a pin."
            : "Couldn't find your location. Check your device location settings or click the map to place a pin.";
        }, { enableHighAccuracy: true, maximumAge: 60000, timeout: 12000 });
      }
    });
    modal.show();
  });
}


// ================= MAP =================
async function mapPage() {
  shell("Map", `
    <div class="d-flex flex-wrap gap-3 align-items-center mb-3">
      <input id="trapSearch" type="search" class="form-control form-control-sm w-auto" placeholder="Search trap, type, or area" aria-label="Search traps on map">
      <select id="lineFilter" class="form-select form-select-sm w-auto"><option value="">All trap lines</option></select>
      <select id="trapStatusFilter" class="form-select form-select-sm w-auto" aria-label="Filter by trap status">
        <option value="">All trap statuses</option>
        <option value="active">Active</option><option value="needs_bait">Needs bait</option>
        <option value="damaged">Damaged</option><option value="missing">Missing</option>
        <option value="under_maintenance">Under maintenance</option>
      </select>
      <div class="form-check form-switch mb-0"><input class="form-check-input" type="checkbox" id="onlyDue">
        <label class="form-check-label small" for="onlyDue">Only overdue / needs attention</label></div>
      <button id="fitTraps" class="btn btn-sm btn-outline-secondary">Fit visible traps</button>
      <button id="myLocation" class="btn btn-sm btn-outline-secondary">My location</button>
      <span id="mapCount" class="text-secondary small" aria-live="polite"></span>
      <span class="text-secondary small">${isCoord() ? "Click the map to add a trap there." : "Tap a marker for details."}</span>
    </div>
    <div id='map' style='height:70vh;border-radius:18px;overflow:hidden'></div>`);

  // Create the map, centred on Whangarei.
  const map = L.map("map").setView([-35.725, 174.32], 10);
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19, attribution: "Tiles &copy; Esri",
  }).addTo(map);

  let traps = [], lines = [];
  try { [traps, lines] = (await Promise.all([api.getTraps(), api.getLines()])).map(list); } catch (err) { showError(err); }
  const lineName = Object.fromEntries(lines.map((l) => [l.id, l.name]));
  document.getElementById("lineFilter").insertAdjacentHTML("beforeend",
    lines.map((l) => `<option value="${esc(l.id)}">${esc(l.name)}</option>`).join(""));

  // Colour key.
  const legend = L.control({ position: "bottomright" });
  legend.onAdd = () => {
    const d = L.DomUtil.create("div", "map-legend");
    d.innerHTML = [["#3fb27f", "Checked in last " + dueDays() + " days"], ["#e0a526", dueDays() + "-" + (overdueDays() - 1) + " days ago"],
      ["#e5534b", overdueDays() + "+ days ago"], ["#8b9a93", "Never checked"]]
      .map(([c, l]) => `<div><span class="legend-dot" style="background:${c}"></span>${l}</div>`).join("") +
      `<div><span class="legend-dot" style="border:3px solid #6f2dbd"></span>Bait needed / sprung</div>`;
    return d;
  };
  legend.addTo(map);

  // One coloured dot per trap. Traps without an exact location (hidden for this user) are skipped.
  const layer = L.layerGroup().addTo(map);
  let visiblePoints = [];
  let userLocationMarker = null;
  let fitted = false;
  function draw() {
    layer.clearLayers();
    const line = document.getElementById("lineFilter").value;
    const trapStatus = document.getElementById("trapStatusFilter").value;
    const query = document.getElementById("trapSearch").value.trim().toLowerCase();
    const only = document.getElementById("onlyDue").checked;
    const points = [];
    traps.forEach((t) => {
      if (t.exact_lat == null || t.exact_lng == null) return;
      if (line && String(t.trap_line_id) !== line) return;
      if (trapStatus && (t.status || "active") !== trapStatus) return;
      const locationText = [t.code, t.trap_type, t.general_area, lineName[t.trap_line_id]]
        .join(" ").toLowerCase();
      if (query && !locationText.includes(query)) return;
      const s = trapState(t), warn = needsAttention(t);
      if (only && !(s.key === "overdue" || s.key === "never" || warn)) return;
      L.circleMarker([t.exact_lat, t.exact_lng], {
        radius: warn ? 12 : 10, color: warn ? "#6f2dbd" : "#0b1512", weight: warn ? 4 : 2, fillColor: s.color, fillOpacity: 0.95,
      }).addTo(layer).bindPopup(
        `<b>${esc(t.code)}</b> (${esc(t.trap_type)})<br>${esc(lineName[t.trap_line_id] || "")} - ${esc(t.general_area)}<br>
         Trap status: ${esc((t.status || "active").replaceAll("_", " "))}<br>${stateBadge(t)}<br>
         Last check: ${esc(ago(t.last_checked_at))}<br>Result: ${esc((t.last_status || "none").replaceAll("_", " "))}<br>
         <a href="check.html?trap=${esc(t.id)}">Log a check</a>`);
      points.push([t.exact_lat, t.exact_lng]);
    });
    visiblePoints = points;
    document.getElementById("mapCount").textContent =
      `Showing ${points.length} of ${traps.filter((t) => t.exact_lat != null && t.exact_lng != null).length} mapped traps`;
    if (!fitted && points.length) { map.fitBounds(points, { padding: [40, 40], maxZoom: 15 }); fitted = true; }
  }
  document.getElementById("lineFilter").onchange = draw;
  document.getElementById("trapStatusFilter").onchange = draw;
  document.getElementById("trapSearch").oninput = draw;
  document.getElementById("onlyDue").onchange = draw;
  document.getElementById("fitTraps").onclick = () => {
    if (visiblePoints.length) map.fitBounds(visiblePoints, { padding: [40, 40], maxZoom: 15 });
    else fail(new Error("No mapped traps match the current filters."));
  };
  document.getElementById("myLocation").onclick = () => {
    if (!navigator.geolocation) return fail(new Error("This device does not provide location."));
    navigator.geolocation.getCurrentPosition((position) => {
      const point = [position.coords.latitude, position.coords.longitude];
      if (userLocationMarker) map.removeLayer(userLocationMarker);
      userLocationMarker = L.circleMarker(point, {
        radius: 8, color: "#fff", weight: 3, fillColor: "#1677ff", fillOpacity: 1,
      }).addTo(map).bindPopup("Your current location");
      map.setView(point, 15);
      userLocationMarker.openPopup();
    }, (error) => {
      const message = error.code === error.PERMISSION_DENIED
        ? "Location access is blocked. Allow it in your browser settings."
        : "Your current location is unavailable. Check your device location settings.";
      fail(new Error(message));
    }, { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 });
  };
  draw();

  // Coordinators: clicking the map opens the Add trap form with the clicked position filled in.
  if (isCoord()) map.on("click", async (e) => {
    const fields = CRUD.traps.addFields;
    let choices;
    try { choices = await loadChoices(fields); } catch (err) { return fail(err); }
    const saved = await openForm("Add trap", fields, {
      is_sensitive: false,
      status: "active",
      exact_lat: Number(e.latlng.lat.toFixed(6)), exact_lng: Number(e.latlng.lng.toFixed(6)),
    }, async (data) => { await api.addTrap(data); success("Trap added"); }, choices);
    if (saved) mapPage();
  });
}


// ================= DROPDOWN CHOICES =================
// Friendlier labels for some fields.
const LABELS = { trap_line_id: "Trap line", trap_id: "Trap", trap_code: "Trap", trap_line: "Trap line", trap_type: "Trap type", recorded_by: "Recorded by", recorded_at: "Recorded at", performed_at: "Maintenance date (optional)", is_sensitive: "Sensitive location?", species: "Species caught", notes: "Notes (optional)", checked_at: "Checked at (optional)", can_view_exact_location: "Can see exact locations?", status: "Trap status" };

// Fixed lists. Add or remove words here to change what users can pick.
const opt = (arr) => arr.map((v) => ({ value: v, label: v }));
const FIXED = {
  species:      opt(["possum", "rat", "stoat", "mouse", "hedgehog", "other"]),
  trap_type:    opt(["possum", "rat", "stoat", "mouse", "hedgehog", "other"]),
  last_status:  opt(["caught", "empty", "bait_needed", "sprung"]),
  status: [
    { value: "active", label: "Active" },
    { value: "needs_bait", label: "Needs bait" },
    { value: "damaged", label: "Damaged" },
    { value: "missing", label: "Missing" },
    { value: "under_maintenance", label: "Under maintenance" },
  ],
  is_sensitive: [{ value: true, label: "Yes" }, { value: false, label: "No" }],
  can_view_exact_location: [{ value: true, label: "Yes" }, { value: false, label: "No" }],
  role:         [{ value: "volunteer", label: "Volunteer" }, { value: "field_worker", label: "Field Worker" }, { value: "coordinator", label: "Coordinator" }],
};

// Builds the dropdown lists for the fields on this form.
// Trap line / trap lists come live from the API, so they are always up to date.
async function loadChoices(fields) {
  const out = {};
  fields.forEach((f) => { if (FIXED[f]) out[f] = FIXED[f]; });
  if (fields.includes("trap_line_id")) {
    out.trap_line_id = list(await api.getLines()).map((l) => ({ value: l.id, label: (l.name || l.code || "Trap line") + " (ID " + l.id + ")" }));
  }
  if (fields.includes("trap_id")) {
    out.trap_id = list(await api.getTraps()).map((t) => ({ value: t.id, label: (t.code || t.name || "Trap") + " (ID " + t.id + ")" }));
  }
  return out;
}


// ================= TABLE PAGES (traps, lines, catches, users) =================
// Each one lists: title, a single name, the columns, and which API functions to use.
// volunteerCan = what a volunteer may do here (coordinators may do everything).
const lineNames = async () => Object.fromEntries(list(await api.getLines()).map((l) => [l.id, l.name]));

const CRUD = {
  traps:   { title: "Traps",      one: "trap",      fields: ["code"], editFields: ["trap_type", "status", "is_sensitive", "exact_lat", "exact_lng"], addFields: ["trap_line_id", "trap_type", "status", "is_sensitive", "exact_lat", "exact_lng"],  load: api.getTraps,   add: api.addTrap,   update: api.updateTrap,   remove: api.deleteTrap,
             // extra read-only columns: line name + overdue status
             decorate: async (rows) => { const ln = await lineNames(); rows.forEach((r) => { r.trap_line = ln[r.trap_line_id] || ""; r.check_state = trapState(r).label; }); } },
  lines:   { title: "Trap lines", one: "trap line", fields: ["name", "general_area"],          load: api.getLines,   add: api.addLine,   update: api.updateLine,   remove: api.deleteLine },
  catches: { title: "Catches",    one: "catch",     fields: ["trap_id", "species"], tableFields: ["trap_code", "trap_line", "species", "recorded_at", "recorded_by"], hideId: true, editFields: ["species"], addFields: ["trap_id", "species", "notes", "checked_at"], load: api.getCatches, add: api.addCatch, update: api.updateCatch, remove: api.deleteCatch,
             volunteerCan: ["add"] },
  users:   { title: "Users",      one: "user",      fields: ["name", "email", "role"], addFields: ["name", "email", "password", "role"], load: api.getUsers, add: api.addUser, update: api.updateUser, remove: api.deleteUser },
};

function parseCsvText(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index++;
      } else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"' && !cell) quoted = true;
    else if (character === ",") { row.push(cell); cell = ""; }
    else if (character === "\n" || character === "\r") {
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
      if (character === "\r" && text[index + 1] === "\n") index++;
    } else cell += character;
  }
  if (quoted) throw new Error("The CSV has an unclosed quoted field.");
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function setupTrapCsvImport() {
  const fileInput = document.getElementById("csv-file");
  document.getElementById("import-csv").onclick = () => fileInput.click();
  document.getElementById("csv-template").onclick = () => downloadCSV(
    "trap-import-template.csv",
    [{
      trap_line: "North line",
      code: "N-01",
      trap_type: "rat",
      general_area: "Northland",
      exact_lat: "",
      exact_lng: "",
      is_sensitive: "false",
      status: "active",
    }],
    ["trap_line", "code", "trap_type", "general_area", "exact_lat", "exact_lng", "is_sensitive", "status"]
  );
  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    fileInput.value = "";
    if (!file) return;
    try {
      const parsed = parseCsvText((await file.text()).replace(/^\uFEFF/, ""));
      if (parsed.length < 2) throw new Error("The CSV must include headers and at least one trap row.");
      const headers = parsed[0].map((header) => header.trim().toLowerCase());
      const required = ["trap_line", "trap_type"];
      const allowed = new Set(["trap_line", "code", "trap_type", "general_area", "exact_lat", "exact_lng", "is_sensitive", "status"]);
      const duplicates = headers.filter((header, index) => headers.indexOf(header) !== index);
      if (duplicates.length) throw new Error("Duplicate CSV column(s): " + [...new Set(duplicates)].join(", "));
      const unknown = headers.filter((header) => !allowed.has(header));
      if (unknown.length) throw new Error("Unknown CSV column(s): " + [...new Set(unknown)].join(", "));
      const missing = required.filter((header) => !headers.includes(header));
      if (missing.length) throw new Error("Missing required columns: " + missing.join(", "));
      const rows = parsed.slice(1).map((cells, rowIndex) => {
        if (cells.length !== headers.length) {
          throw new Error(`Row ${rowIndex + 2} has ${cells.length} values; expected ${headers.length}.`);
        }
        const row = Object.fromEntries(headers.map((header, index) => [header, cells[index].trim()]));
        if (!row.trap_line || !row.trap_type) {
          throw new Error(`Row ${rowIndex + 2} needs a trap_line and trap_type.`);
        }
        for (const field of ["exact_lat", "exact_lng"]) {
          if (row[field] === undefined || row[field] === "") row[field] = null;
          else if (!Number.isFinite(Number(row[field]))) {
            throw new Error(`Row ${rowIndex + 2}: ${field} must be a number.`);
          } else row[field] = Number(row[field]);
        }
        if (row.is_sensitive === undefined || row.is_sensitive === "") row.is_sensitive = false;
        else if (["true", "yes", "1"].includes(row.is_sensitive.toLowerCase())) row.is_sensitive = true;
        else if (["false", "no", "0"].includes(row.is_sensitive.toLowerCase())) row.is_sensitive = false;
        else throw new Error(`Row ${rowIndex + 2}: is_sensitive must be true or false.`);
        if (row.is_sensitive && (row.exact_lat === null || row.exact_lng === null)) {
          throw new Error(`Row ${rowIndex + 2}: sensitive traps need both exact_lat and exact_lng.`);
        }
        if (row.status === "") delete row.status;
        return row;
      });
      const confirmation = await Box.fire({
        title: "Import trap CSV?",
        text: `${rows.length} row(s) will be validated. Existing codes are rejected unless update mode is enabled.`,
        input: "checkbox",
        inputPlaceholder: "Update existing traps with matching trap line and code",
        showCancelButton: true,
        confirmButtonText: "Validate and import",
        cancelButtonText: "Cancel",
      });
      if (!confirmation.isConfirmed) return;
      const updateExisting = confirmation.value === 1 || confirmation.value === true;
      const result = await api.importTraps(rows, updateExisting);
      if (result.errors.length) {
        await Box.fire({
          icon: "error",
          title: "No traps imported",
          html: `<p>Fix these CSV issues and try again:</p><ul class="text-start">${result.errors.map((error) => `<li>${esc(error)}</li>`).join("")}</ul>`,
        });
        return;
      }
      await Box.fire({
        icon: "success",
        title: "Import complete",
        text: `${result.created} created, ${result.updated} updated.`,
      });
      tablePage();
    } catch (error) {
      fail(error);
    }
  };
}

async function tablePage() {
  const cfg = CRUD[PAGE];
  const can = (action) => isCoord() || (cfg.volunteerCan || []).includes(action);
  const addButton = cfg.add && can("add")
    ? `<button id="add" class="btn btn-primary mb-3"><i class="bi bi-plus-lg"></i> Add ${cfg.one}</button>`
    : "";
  const importButton = PAGE === "traps" && isCoord()
    ? `<button id="import-csv" class="btn btn-outline-primary mb-3 ms-2"><i class="bi bi-upload"></i> Import CSV</button>
       <button id="csv-template" class="btn btn-outline-secondary mb-3 ms-2">CSV template</button>
       <input id="csv-file" type="file" accept=".csv,text/csv" class="d-none" aria-label="Choose trap CSV file">`
    : "";
  const exportButtons = `<button id="csv" class="btn btn-outline-secondary mb-3 ${addButton ? "ms-2" : ""}"><i class="bi bi-download"></i> Export CSV</button>
    <button id="pdf" class="btn btn-outline-secondary mb-3 ms-2"><i class="bi bi-file-earmark-pdf"></i> Export PDF</button>`;
  shell(cfg.title, addButton + importButton + exportButtons + "<div id='body'>Loading...</div>");

  try {
    const rows = list(await cfg.load());
    if (cfg.decorate) { try { await cfg.decorate(rows); } catch (e) {} }
    if (PAGE === "traps" && isCoord()) setupTrapCsvImport();

    // Use the columns the API really sends (skips id, dates added by the server, and nested objects).
    const skip = ["id", "created_at", "updated_at"];
    const fields = cfg.tableFields || (rows.length
      ? Object.keys(rows[0]).filter((k) => !skip.includes(k) && typeof rows[0][k] !== "object")
      : cfg.fields);

    // Build the table.
    const formatRecordedAt = (value) => {
      const date = parseDate(value);
      return date ? date.toLocaleString("en-NZ", {
        day: "numeric", month: "short", year: "numeric",
        hour: "numeric", minute: "2-digit", hour12: true,
      }) : value;
    };
    const cell = (f, r) => {
      if (f === "check_state") return stateBadge(r);
      if (f === "recorded_at") return esc(formatRecordedAt(r[f]));
      if (f === "status") return esc(String(r[f] || "active").replace(/_/g, " "));
      return esc(r[f]);
    };
    const pretty = (f) => LABELS[f] || f.replace(/_/g, " ");
    const filterableFields = ["trap_line", "trap_type", "species", "role", "status", "last_status", "check_state"]
      .filter((field) => fields.includes(field) && new Set(rows.map((row) => String(row[field] ?? ""))).size > 1);
    const filterLabel = (field) => ({
      trap_line: "Trap line", trap_type: "Trap type", species: "Species",
      role: "Role", status: "Trap status", last_status: "Last result",
      check_state: "Check status",
    })[field] || pretty(field);
    const filterValue = (field, value) => field === "status" ? String(value).replace(/_/g, " ") : String(value ?? "");
    const filterControls = `<div class="table-filterbar row g-2 align-items-end mb-3">
      <div class="col-12 col-lg-5">
        <label class="form-label small text-secondary" for="table-search">Search ${esc(cfg.title.toLowerCase())}</label>
        <input id="table-search" class="form-control" type="search" placeholder="Search by name, code, type..." autocomplete="off">
      </div>
      ${filterableFields.map((field) => {
        const values = [...new Set(rows.map((row) => String(row[field] ?? "")).filter(Boolean))].sort();
        return `<div class="col-6 col-lg-2"><label class="form-label small text-secondary" for="filter-${esc(field)}">${esc(filterLabel(field))}</label>
          <select class="form-select" id="filter-${esc(field)}" data-filter-field="${esc(field)}">
            <option value="">All</option>${values.map((value) => `<option value="${esc(value)}">${esc(filterValue(field, value))}</option>`).join("")}
          </select></div>`;
      }).join("")}
      <div class="col-12 col-lg-auto"><button id="clear-table-filters" class="btn btn-outline-secondary w-100">Clear filters</button></div>
      <div class="col-12"><span id="table-result-count" class="small text-secondary"></span></div>
    </div>`;
    const columns = cfg.hideId ? fields : ["id", ...fields];
    const head = columns.map((f) => `<th>${esc(pretty(f))}</th>`).join("") + "<th></th>";
    const body = rows.map((r, index) => `<tr data-row-index="${index}">` + columns.map((f) => `<td>${cell(f, r)}</td>`).join("") +
      `<td class="text-end text-nowrap">
        ${PAGE === "traps" ? `<button class="btn btn-sm btn-outline-secondary" data-history="${esc(r.id)}" title="Trap history"><i class="bi bi-clock-history"></i> History</button>` : ""}
        ${PAGE === "traps" ? `<button class="btn btn-sm btn-outline-secondary" data-maintenance="${esc(r.id)}" title="Maintenance log"><i class="bi bi-wrench-adjustable"></i> Maintenance</button>` : ""}
        ${PAGE === "traps" && isCoord() ? `<button class="btn btn-sm btn-outline-secondary" data-qr="${esc(r.id)}" title="QR code"><i class="bi bi-qr-code"></i></button>` : ""}
        ${cfg.update && can("edit") ? `<button class="btn btn-sm btn-outline-primary" data-edit="${esc(r.id)}"><i class="bi bi-pencil"></i> Edit</button>` : ""}
        ${cfg.remove && can("delete") ? `<button class="btn btn-sm btn-outline-danger" data-del="${esc(r.id)}"><i class="bi bi-trash"></i> Delete</button>` : ""}</td></tr>`).join("");
    document.getElementById("body").innerHTML = filterControls +
      `<div class="card"><div class="card-body table-responsive"><table id="tbl" class="table mb-0"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
      <p id="table-no-results" class="text-secondary text-center my-3 d-none">No records match these filters.</p></div></div>`;

    const dataTable = window.jQuery && jQuery.fn.DataTable && rows.length
      ? jQuery("#tbl").DataTable({ dom: "rtip" })
      : null;
    let filteredRows = rows;
    const searchInput = document.getElementById("table-search");
    const filterInputs = [...document.querySelectorAll("[data-filter-field]")];
    const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const applyFilters = () => {
      const query = searchInput.value.trim().toLowerCase();
      const selected = Object.fromEntries(filterInputs.map((input) => [input.dataset.filterField, input.value]));
      filteredRows = rows.filter((row) =>
        (!query || Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(query))) &&
        filterableFields.every((field) => !selected[field] || String(row[field] ?? "") === selected[field])
      );
      if (dataTable) {
        dataTable.search(query);
        filterInputs.forEach((input) => {
          const field = input.dataset.filterField;
          const columnIndex = columns.indexOf(field);
          const selectedValue = selected[field];
          const searchValue = selectedValue ? escapeRegex(filterValue(field, selectedValue)) : "";
          dataTable.column(columnIndex).search(searchValue ? "^" + searchValue + "$" : "", true, false);
        });
        dataTable.draw();
      } else {
        document.querySelectorAll("#tbl tbody tr[data-row-index]").forEach((row) => {
          row.classList.toggle("d-none", !filteredRows.includes(rows[Number(row.dataset.rowIndex)]));
        });
      }
      document.getElementById("table-no-results").classList.toggle("d-none", filteredRows.length !== 0);
      document.getElementById("table-result-count").textContent =
        `Showing ${filteredRows.length} of ${rows.length} ${cfg.title.toLowerCase()}.`;
    };
    searchInput.addEventListener("input", applyFilters);
    filterInputs.forEach((input) => input.addEventListener("change", applyFilters));
    document.getElementById("clear-table-filters").onclick = () => {
      searchInput.value = "";
      filterInputs.forEach((input) => { input.value = ""; });
      applyFilters();
    };
    applyFilters();

    // Export every row to a CSV file.
    const formattedRows = (items) => PAGE === "catches"
      ? items.map((r) => ({ ...r, recorded_at: formatRecordedAt(r.recorded_at) }))
      : items;
    document.getElementById("csv").onclick = () => {
      const exportRows = formattedRows(filteredRows);
      if (!exportRows.length) return fail(new Error("There is nothing matching the current filters to export."));
      downloadCSV(PAGE + "-" + new Date().toISOString().slice(0, 10) + ".csv", exportRows, columns);
    };
    document.getElementById("pdf").onclick = () => {
      const exportRows = formattedRows(filteredRows);
      if (!exportRows.length) return fail(new Error("There is nothing matching the current filters to export."));
      exportPDF(cfg.title, [{
        columns: columns.map((key) => ({ key, label: pretty(key) })),
        rows: exportRows,
      }]);
    };

    // QR button -> show this trap's QR code.
    document.querySelectorAll("[data-qr]").forEach((b) => b.onclick = () =>
      showQR(rows.find((r) => String(r.id) === b.dataset.qr)));

    document.querySelectorAll("[data-history]").forEach((b) => b.onclick = async () => {
      const trap = rows.find((r) => String(r.id) === b.dataset.history);
      if (!trap) return;
      try {
        const history = list(await api.getTrapHistory(trap.id));
        const formatDate = (value) => {
          const date = parseDate(value);
          return date ? date.toLocaleString("en-NZ", {
            day: "numeric", month: "short", year: "numeric",
            hour: "numeric", minute: "2-digit", hour12: true,
          }) : value;
        };
        const historyRows = history.map((entry) => `<tr>
          <td>${esc(formatDate(entry.checked_at))}</td>
          <td>${esc(entry.status.replace(/_/g, " "))}</td>
          <td>${esc(entry.species.length ? entry.species.join(", ") : "-")}</td>
          <td>${esc(entry.recorded_by)}</td>
          <td>${esc(entry.notes || "-")}</td>
        </tr>`).join("");
        const html = history.length
          ? `<div class="table-responsive"><table class="table text-start align-middle">
              <thead><tr><th>Checked at</th><th>Status</th><th>Species caught</th><th>Recorded by</th><th>Notes</th></tr></thead>
              <tbody>${historyRows}</tbody></table></div>`
          : "<p class='text-secondary mb-0'>No activity recorded for this trap yet.</p>";
        await Box.fire({ title: "History — " + esc(trap.code), html, width: "min(1000px, 95vw)" });
      } catch (err) {
        fail(err);
      }
    });

    document.querySelectorAll("[data-maintenance]").forEach((b) => b.onclick = async () => {
      const trap = rows.find((r) => String(r.id) === b.dataset.maintenance);
      if (!trap) return;
      try {
        const records = list(await api.getTrapMaintenance(trap.id));
        const formatDate = (value) => {
          const date = parseDate(value);
          return date ? date.toLocaleString("en-NZ", {
            day: "numeric", month: "short", year: "numeric",
            hour: "numeric", minute: "2-digit", hour12: true,
          }) : value;
        };
        const rowsHtml = records.map((record) => `<tr>
          <td>${esc(formatDate(record.performed_at))}</td>
          <td>${esc(record.notes)}</td>
          <td>${esc(record.recorded_by)}</td>
        </tr>`).join("");
        const html = records.length
          ? `<div class="table-responsive"><table class="table text-start align-middle">
              <thead><tr><th>Date</th><th>Work completed</th><th>Recorded by</th></tr></thead>
              <tbody>${rowsHtml}</tbody></table></div>`
          : "<p class='text-secondary mb-0'>No maintenance recorded for this trap yet.</p>";
        const result = await Box.fire({
          title: "Maintenance — " + esc(trap.code),
          html,
          width: "min(900px, 95vw)",
          showCancelButton: true,
          cancelButtonText: "Close",
          showConfirmButton: isCoord(),
          confirmButtonText: "Add maintenance record",
        });
        if (!result.isConfirmed || !isCoord()) return;
        const saved = await openForm(
          "Add maintenance record",
          ["notes", "performed_at"],
          { performed_at: new Date().toISOString().slice(0, 16) },
          async (data) => {
            await api.addTrapMaintenance(trap.id, data);
            success("Maintenance recorded");
          },
        );
        if (saved) tablePage();
      } catch (err) {
        fail(err);
      }
    });

    // Add button -> open the form.
    if (addButton) document.getElementById("add").onclick = async () => {
      const addFields = cfg.addFields || fields;
      let choices;
      try { choices = await loadChoices(addFields); } catch (err) { return fail(err); }
      const saved = await openForm("Add " + cfg.one, addFields,
        cfg.addFields ? { is_sensitive: false, status: "active" } : PAGE === "catches" ? { checked_at: new Date().toISOString().slice(0, 16) } : {},
        async (data) => { await cfg.add(data); success("Added successfully"); }, choices);
      if (saved) tablePage(); // reload the table
    };

    // Edit buttons -> open the form with current values.
    document.querySelectorAll("[data-edit]").forEach((b) => b.onclick = async () => {
      const row = rows.find((r) => String(r.id) === b.dataset.edit);
      const editFields = cfg.editFields || fields;
      let choices;
      try { choices = await loadChoices(editFields); } catch (err) { return fail(err); }
      const saved = await openForm("Edit " + cfg.one, editFields, row,
        async (data) => { await cfg.update(row.id, data); success("Changes saved"); }, choices);
      if (saved) tablePage();
    });

    // Delete buttons -> ask first, then delete.
    document.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => {
      if (!(await confirmDelete())) return;
      try { await cfg.remove(b.dataset.del); success("Deleted"); tablePage(); } catch (err) { fail(err); }
    });
  } catch (err) { showError(err); }
}


// ================= QR CODES =================
// A trap's QR code opens check.html?trap=ID. The base address must be reachable from phones.
const qrBase = () => {
  const b = localStorage.getItem("qr_base") || new URL(".", location.href).href;
  return b.replace(/\/?$/, "/");
};
const qrUrl = (id) => qrBase() + "check.html?trap=" + id;

function showQR(t) {
  if (!window.QRCode) return fail(new Error("The QR code library could not load."));
  Box.fire({
    title: t.code, confirmButtonText: "Close",
    html: `<div id="qrbox" class="d-flex justify-content-center bg-white p-3 rounded"></div>
           <p class="small text-secondary mt-3 mb-0" style="word-break:break-all">${esc(qrUrl(t.id))}</p>
           <p class="small text-secondary">Print many at once on the QR codes page.</p>`,
    didOpen: () => new QRCode(document.getElementById("qrbox"), { text: qrUrl(t.id), width: 220, height: 220, correctLevel: QRCode.CorrectLevel.M }),
  });
}

async function qrPage() {
  shell("QR codes", `
    <div class="no-print row g-3 mb-4 align-items-end">
      <div class="col-md-6"><label class="form-label small text-secondary">Address the codes open (must work on a phone, e.g. https://traps.example.nz/)</label>
        <input id="base" class="form-control" value="${esc(qrBase())}"></div>
      <div class="col-md-3"><label class="form-label small text-secondary">Trap line</label>
        <select id="lf" class="form-select"><option value="">All trap lines</option></select></div>
      <div class="col-md-3"><button id="print" class="btn btn-primary w-100"><i class="bi bi-printer"></i> Print labels</button></div>
    </div>
    <div id="grid" class="qr-grid">Loading...</div>`);
  if (!window.QRCode) return showError(new Error("The QR code library could not load."));
  let traps = [], lines = [];
  try { [traps, lines] = (await Promise.all([api.getTraps(), api.getLines()])).map(list); } catch (err) { return showError(err); }
  const lineName = Object.fromEntries(lines.map((l) => [l.id, l.name]));
  document.getElementById("lf").insertAdjacentHTML("beforeend", lines.map((l) => `<option value="${esc(l.id)}">${esc(l.name)}</option>`).join(""));

  function draw() {
    localStorage.setItem("qr_base", document.getElementById("base").value.trim());
    const line = document.getElementById("lf").value;
    const shown = traps.filter((t) => !line || String(t.trap_line_id) === line);
    document.getElementById("grid").innerHTML = shown.map((t) => `<div class="qr-label"><div class="qr-img" id="qr-${esc(t.id)}"></div>
      <div class="fw-bold">${esc(t.code)}</div><small>${esc(lineName[t.trap_line_id] || "")} - ${esc(t.trap_type)}</small></div>`).join("") || "<p class='text-secondary'>No traps yet.</p>";
    shown.forEach((t) => new QRCode(document.getElementById("qr-" + t.id), { text: qrUrl(t.id), width: 130, height: 130, correctLevel: QRCode.CorrectLevel.M }));
  }
  document.getElementById("base").onchange = draw;
  document.getElementById("lf").onchange = draw;
  document.getElementById("print").onclick = () => window.print();
  draw();
}

async function tasksPage() {
  shell("Field tasks", `<p class="text-secondary">Tasks assigned to your account and trap lines you are responsible for appear here.</p>
    <div id="task-tools"></div><div id="task-body" aria-live="polite">Loading tasks...</div>`);
  const body = document.getElementById("task-body");
  const tools = document.getElementById("task-tools");
  try {
    const [tasks, assignments, fieldLines] = await Promise.all([
      api.getTasks(),
      isCoord() ? Promise.resolve([]) : api.getMyLineAssignments(),
      isCoord() ? Promise.resolve([]) : api.getLines(),
    ]);
    const fieldLineNames = Object.fromEntries(fieldLines.map((line) => [line.id, line.name]));
    let markup = "";
    if (!isCoord()) {
      markup += `<section class="card mb-3"><div class="card-body">
        <h2 class="h5">Assigned trap lines</h2>
        ${assignments.length
          ? `<ul class="mb-0">${assignments.map((item) => `<li>${esc(fieldLineNames[item.trap_line_id] || `Trap line #${item.trap_line_id}`)}</li>`).join("")}</ul>`
          : `<p class="mb-0 text-secondary">No trap lines are assigned to you yet.</p>`}
      </div></section>`;
    }
    markup += `<section class="card"><div class="card-body">
      <h2 class="h5">Your field tasks</h2>
      ${tasks.length ? `<div class="list-group">${tasks.map((task) => `
        <article class="list-group-item">
          <div class="d-flex flex-wrap justify-content-between gap-2">
            <div><h3 class="h6 mb-1">${esc(task.title)}</h3>
              <p class="mb-1">${esc(task.trap_line || "Trap line")}${task.trap_code ? ` · Trap ${esc(task.trap_code)}` : ""}</p>
              ${task.notes ? `<p class="mb-1">${esc(task.notes)}</p>` : ""}
              <small class="text-secondary">${task.due_at ? `Due ${esc(new Date(task.due_at).toLocaleDateString())} · ` : ""}${esc(task.status)}${isCoord() ? ` · Assigned to ${esc(task.assigned_name)}` : ""}</small>
            </div>
            ${task.status === "open" && (isCoord() || String(task.assigned_to) === String(me.id))
              ? `<button type="button" class="btn btn-success task-complete" data-id="${esc(task.id)}">Mark complete</button>`
              : ""}
          </div>
        </article>`).join("")}</div>` : `<p class="mb-0 text-secondary">No field tasks yet.</p>`}
    </div></section>`;
    if (isCoord()) {
      const [lines, users, traps] = await Promise.all([api.getLines(), api.getUsers(), api.getTraps()]);
      const eligible = users.filter((user) => ["volunteer", "field_worker"].includes(user.role));
      tools.innerHTML = `
        <section class="card mb-3"><div class="card-body">
          <h2 class="h5">Create a field task</h2>
          <form id="task-form" class="row g-3">
            <div class="col-md-6"><label class="form-label" for="task-title">Task</label><input id="task-title" class="form-control" required maxlength="120"></div>
            <div class="col-md-6"><label class="form-label" for="task-assignee">Assign to</label>
              <select id="task-assignee" class="form-select" required><option value="">Choose a volunteer or field worker</option>${eligible.map((u) => `<option value="${esc(u.id)}">${esc(u.name)} (${esc(u.role)})</option>`).join("")}</select></div>
            <div class="col-md-6"><label class="form-label" for="task-target">Trap line</label>
              <select id="task-target" class="form-select" required><option value="">Choose a trap line</option>${lines.map((l) => `<option value="${esc(l.id)}">${esc(l.name)}</option>`).join("")}</select></div>
            <div class="col-md-6"><label class="form-label" for="task-trap">Specific trap (optional)</label>
              <select id="task-trap" class="form-select"><option value="">Any trap on the line</option>${traps.map((t) => `<option value="${esc(t.id)}">${esc(t.code || `Trap ${t.id}`)}</option>`).join("")}</select></div>
            <div class="col-md-6"><label class="form-label" for="task-due">Due date (optional)</label><input id="task-due" type="date" class="form-control"></div>
            <div class="col-md-6"><label class="form-label" for="task-notes">Notes (optional)</label><input id="task-notes" maxlength="500" class="form-control"></div>
            <div class="col-12"><button class="btn btn-primary" type="submit">Assign task</button></div>
          </form>
        </div></section>
        <section class="card mb-3"><div class="card-body">
          <h2 class="h5">Assign trap lines</h2>
          <form id="assignment-form" class="row g-3">
            <div class="col-md-5"><label class="form-label" for="assignment-line">Trap line</label><select id="assignment-line" class="form-select" required><option value="">Choose a line</option>${lines.map((l) => `<option value="${esc(l.id)}">${esc(l.name)}</option>`).join("")}</select></div>
            <div class="col-md-5"><label class="form-label" for="assignment-user">Volunteer or field worker</label><select id="assignment-user" class="form-select" required><option value="">Choose a user</option>${eligible.map((u) => `<option value="${esc(u.id)}">${esc(u.name)} (${esc(u.role)})</option>`).join("")}</select></div>
            <div class="col-md-2 d-flex align-items-end"><button class="btn btn-outline-primary" type="submit">Assign line</button></div>
          </form>
          <div id="assignment-list" class="mt-3"></div>
        </div></section>`;
      const trapSelect = document.getElementById("task-trap");
      trapSelect.disabled = true;
      document.getElementById("task-target").onchange = () => {
        const selectedLine = document.getElementById("task-target").value;
        trapSelect.value = "";
        trapSelect.disabled = !selectedLine;
        Array.from(trapSelect.options).forEach((option) => {
          if (option.value) option.hidden = String(traps.find((trap) => String(trap.id) === option.value)?.trap_line_id) !== selectedLine;
        });
      };
      document.getElementById("task-form").onsubmit = async (event) => {
        event.preventDefault();
        try {
          const trapId = document.getElementById("task-trap").value;
          const due = document.getElementById("task-due").value;
          await api.addTask({
            title: document.getElementById("task-title").value.trim(),
            assigned_to: Number(document.getElementById("task-assignee").value),
            trap_line_id: Number(document.getElementById("task-target").value),
            trap_id: trapId ? Number(trapId) : null,
            due_at: due ? new Date(due + "T23:59:59").toISOString() : null,
            notes: document.getElementById("task-notes").value.trim(),
          });
          success("Task assigned");
          tasksPage();
        } catch (error) { fail(error); }
      };
      document.getElementById("assignment-form").onsubmit = async (event) => {
        event.preventDefault();
        try {
          await api.assignLine(Number(document.getElementById("assignment-line").value), Number(document.getElementById("assignment-user").value));
          await refreshAssignments();
          success("Trap line assigned");
        } catch (error) { fail(error); }
      };
      async function refreshAssignments() {
        const entries = await Promise.all(lines.map(async (line) => ({
          line, items: await api.getLineAssignments(line.id),
        })));
        const assignmentList = document.getElementById("assignment-list");
        if (!assignmentList) return;
        assignmentList.innerHTML = entries
          .filter((entry) => entry.items.length)
          .map(({ line, items }) => `<h3 class="h6 mt-3">${esc(line.name)}</h3><ul>${items.map((item) => `
            <li>${esc(item.user_name)}
              <button type="button" class="btn btn-sm btn-outline-danger ms-2 assignment-remove" data-id="${esc(item.id)}" aria-label="Remove ${esc(item.user_name)} from ${esc(line.name)}">Remove</button>
            </li>`).join("")}</ul>`).join("") || `<p class="text-secondary mb-0">No line assignments yet.</p>`;
        document.querySelectorAll(".assignment-remove").forEach((button) => {
          button.onclick = async () => {
            try {
              await api.removeLineAssignment(Number(button.dataset.id));
              await refreshAssignments();
              success("Assignment removed");
            } catch (error) { fail(error); }
          };
        });
      }
      await refreshAssignments();
    } else {
      tools.innerHTML = `<section class="card mb-3"><div class="card-body">
        <h2 class="h5">Personal task notifications</h2>
        <p>Optional: choose a private ntfy topic to receive assignment and reminder alerts. Subscribe to the same topic in the ntfy app, and keep its name private.</p>
        <form id="topic-form" class="row g-2">
          <div class="col-md-8"><label for="topic-name" class="form-label">Private ntfy topic name</label>
            <input id="topic-name" class="form-control" minlength="16" maxlength="100" pattern="[A-Za-z0-9_-]{16,100}" autocomplete="off" placeholder="At least 16 letters, numbers, _ or -"></div>
          <div class="col-md-4 d-flex align-items-end gap-2"><button class="btn btn-primary" type="submit">Save topic</button><button id="clear-topic" class="btn btn-outline-secondary" type="button">Clear</button></div>
        </form>
        <small class="text-secondary">${me.has_notification_topic ? "A personal topic is configured; the existing value is hidden." : "No personal topic is configured."}</small>
      </div></section>`;
      document.getElementById("topic-form").onsubmit = async (event) => {
        event.preventDefault();
        try {
          const topic = document.getElementById("topic-name").value.trim();
          if (!topic) throw new Error("Enter a topic name, or choose Clear to remove it.");
          await api.setNotificationTopic(topic);
          me.has_notification_topic = true;
          localStorage.setItem("user", JSON.stringify(me));
          success("Personal notification topic saved");
          tasksPage();
        } catch (error) { fail(error); }
      };
      document.getElementById("clear-topic").onclick = async () => {
        try {
          await api.setNotificationTopic(null);
          me.has_notification_topic = false;
          localStorage.setItem("user", JSON.stringify(me));
          success("Personal notification topic cleared");
          tasksPage();
        } catch (error) { fail(error); }
      };
    }
    body.innerHTML = markup;
    body.querySelectorAll(".task-complete").forEach((button) => {
      button.onclick = async () => {
        try {
          await api.setTaskStatus(Number(button.dataset.id), "completed");
          success("Task marked complete");
          tasksPage();
        } catch (error) { fail(error); }
      };
    });
  } catch (error) { fail(error); }
}

async function auditPage() {
  shell("Audit history", `<p class="text-secondary">Coordinator-only record of changes to traps, users, catches and assignments.</p>
    <div class="row g-2 mb-3">
      <div class="col-sm-4"><label class="form-label" for="audit-entity">Filter by record</label>
        <select id="audit-entity" class="form-select"><option value="">All changes</option><option value="trap">Traps</option><option value="user">Users</option><option value="catch">Catches</option><option value="trap_line">Trap lines</option></select></div>
      <div class="col-sm-4"><label class="form-label" for="audit-id">Record ID (optional)</label><input id="audit-id" type="number" min="1" class="form-control"></div>
      <div class="col-sm-4 d-flex align-items-end"><button id="audit-filter" class="btn btn-primary">Apply filter</button></div>
    </div><div id="audit-body" aria-live="polite">Loading audit history...</div>`);
  const render = async () => {
    const entity = document.getElementById("audit-entity").value;
    const id = document.getElementById("audit-id").value;
    const params = new URLSearchParams();
    if (entity) params.set("entity_type", entity);
    if (id) params.set("entity_id", id);
    try {
      const events = await api.getAudit(params.toString() ? "?" + params : "");
      document.getElementById("audit-body").innerHTML = events.length
        ? `<div class="table-responsive"><table class="table table-striped align-middle"><thead><tr><th>When</th><th>Who</th><th>Change</th><th>Record</th><th>Details</th></tr></thead><tbody>${events.map((event) => `
          <tr><td>${esc(new Date(event.changed_at).toLocaleString())}</td><td>${esc(event.actor_name)}</td>
          <td>${esc(event.action)}</td><td>${esc(event.entity_type)} #${esc(event.entity_id)}</td>
          <td><details><summary>View change</summary><pre class="small text-wrap mt-2">${esc(JSON.stringify({ before: event.before, after: event.after }, null, 2))}</pre></details></td></tr>`).join("")}</tbody></table></div>`
        : `<p class="text-secondary">No audit records matched this filter.</p>`;
    } catch (error) { fail(error); }
  };
  document.getElementById("audit-filter").onclick = render;
  await render();
}

async function syncPage() {
  shell("Offline sync status", `<p class="text-secondary">Failed checks remain on this device until they upload successfully. Queued records are private to the account that created them.</p>
    <div id="sync-summary" class="mb-3" aria-live="polite"></div><div id="sync-body"></div>`);
  const render = () => {
    const queue = Outbox.all();
    const history = Outbox.history().filter((entry) => !entry.owner_id || String(entry.owner_id) === String(me.id));
    const ownQueue = queue.filter((job) => String(job.owner_id || "") === String(me.id));
    const blockedQueue = queue.filter((job) => String(job.owner_id || "") !== String(me.id));
    document.getElementById("sync-summary").innerHTML = `
      <div class="row g-2">
        <div class="col-md-4"><div class="card card-body"><strong>${ownQueue.length}</strong><span>Checks waiting for this account</span></div></div>
        <div class="col-md-4"><div class="card card-body"><strong>${blockedQueue.length}</strong><span>Checks queued by another or unavailable account</span></div></div>
        <div class="col-md-4"><div class="card card-body"><strong>${history.filter((entry) => entry.status === "uploaded").length}</strong><span>Recent successful uploads on this device</span></div></div>
      </div>`;
    document.getElementById("sync-body").innerHTML = `
      <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
        <button id="retry-sync" type="button" class="btn btn-primary" ${ownQueue.length ? "" : "disabled"}>Retry my queued checks</button>
        <span>${navigator.onLine ? "Online" : "Offline — reconnect to retry."}</span>
      </div>
      <h2 class="h5">Queued checks</h2>
      ${queue.length ? `<div class="table-responsive"><table class="table table-striped"><thead><tr><th>Check</th><th>Owner</th><th>Queued</th><th>Status</th></tr></thead><tbody>${queue.map((job) => `
        <tr><td>${esc(job.label || "Field check")}</td><td>${esc(job.owner_id || "Unassigned")}</td><td>${esc(job.queued_at ? new Date(job.queued_at).toLocaleString() : "Unknown")}</td><td>${String(job.owner_id) === String(me.id) ? "Waiting for upload" : "Not available to this account"}</td></tr>`).join("")}</tbody></table></div>`
        : `<p class="text-secondary">No checks are queued.</p>`}
      <h2 class="h5 mt-4">Recent sync activity</h2>
      ${history.length ? `<div class="table-responsive"><table class="table table-striped"><thead><tr><th>When</th><th>Check</th><th>Status</th><th>Details</th></tr></thead><tbody>${history.map((entry) => `
        <tr><td>${esc(new Date(entry.changed_at).toLocaleString())}</td><td>${esc(entry.label)}</td>
        <td>${entry.status === "uploaded" ? "Uploaded" : "Failed; retained for retry"}</td><td>${esc(entry.error || "")}</td></tr>`).join("")}</tbody></table></div>`
        : `<p class="text-secondary">No sync activity recorded on this device yet.</p>`}`;
    const button = document.getElementById("retry-sync");
    if (button) button.onclick = async () => {
      button.disabled = true;
      try {
        const result = await Outbox.flush();
        await render();
        if (result.failed.length) fail(new Error(`${result.failed.length} check(s) still need attention. See sync activity for details.`));
        else if (result.sent) success(`${result.sent} check(s) uploaded successfully`);
        else if (!navigator.onLine) fail(new Error("You are offline. Reconnect and retry."));
        else success("No queued checks were uploaded.");
      } catch (error) { fail(error); }
    };
  };
  render();
  window.addEventListener("outbox-changed", render);
  window.addEventListener("sync-history-changed", render);
}


// ================= FIELD CHECK (phone friendly) =================
// Pick a trap (search, nearest by GPS, or arrive from its QR code), tap the result, save.
// With no signal the check is stored on the device and uploaded later.
async function checkPage() {
  shell("Field check", "<div id='body'>Loading...</div>");
  let traps = [], lines = [];
  try { [traps, lines] = (await Promise.all([api.getTraps(), api.getLines()])).map(list); } catch (err) { return showError(err); }
  const lineName = Object.fromEntries(lines.map((l) => [l.id, l.name]));
  const STATUS = [["empty", "Empty", "check-circle"], ["caught", "Caught", "bug-fill"], ["bait_needed", "Bait needed", "basket"], ["sprung", "Sprung", "exclamation-triangle"]];
  const S = {
    trap: null, status: "", species: "", notes: "", q: "", near: false, saving: false,
    nearMap: false, nearMessage: "", userPoint: null,
  };
  const preset = new URLSearchParams(location.search).get("trap"); // from a QR code
  if (preset) S.trap = traps.find((t) => String(t.id) === preset) || null;
  const box = document.getElementById("body");
  let nearbyMap;

  function listHtml() {
    const q = S.q.toLowerCase();
    let items = traps.filter((t) => (t.code + " " + (lineName[t.trap_line_id] || "") + " " + (t.general_area || "")).toLowerCase().includes(q));
    if (S.near) items.sort((a, b) => (a._d ?? Infinity) - (b._d ?? Infinity));
    return items.slice(0, 12).map((t) => `<button class="tile list" data-act="pick" data-id="${esc(t.id)}">
      <div class="d-flex justify-content-between align-items-center"><b>${esc(t.code)}</b>${stateBadge(t)}</div>
      <small class="text-secondary">${esc(lineName[t.trap_line_id] || "")} - ${esc(t.trap_type)}${S.near && t._d != null ? " - " + fmtDist(t._d) : ""}</small></button>`).join("")
      || "<p class='text-secondary'>No trap matches.</p>";
  }

  function drawNearbyMap() {
    if (!S.nearMap) return;
    const mapElement = document.getElementById("nearby-trap-map");
    if (!mapElement) return;
    if (!window.L) {
      mapElement.innerHTML = "<p class='p-3 text-secondary'>The map could not load. Search by trap code or line instead.</p>";
      return;
    }
    const points = traps.filter((t) => t.exact_lat != null && t.exact_lng != null);
    const center = S.userPoint || (points.length
      ? [points[0].exact_lat, points[0].exact_lng]
      : [-35.725, 174.32]);
    nearbyMap = L.map(mapElement).setView(center, S.userPoint ? 14 : 10);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19, attribution: "Tiles &copy; Esri",
    }).addTo(nearbyMap);
    if (S.userPoint) {
      L.marker(S.userPoint, { title: "Your selected location" }).addTo(nearbyMap)
        .bindPopup("<b>Your location</b>");
    }
    points.forEach((t) => {
      const distance = t._d == null ? "" : `<br>${esc(fmtDist(t._d))} away`;
      L.marker([t.exact_lat, t.exact_lng]).addTo(nearbyMap).bindPopup(
        `<b>${esc(t.code)}</b><br>${esc(lineName[t.trap_line_id] || "")} - ${esc(t.trap_type)}<br>${esc(t.general_area || "")}${distance}
         <br><button class="btn btn-sm btn-primary mt-2" data-act="pick" data-id="${esc(t.id)}">View trap details</button>`);
    });
    nearbyMap.on("click", (event) => {
      S.userPoint = [event.latlng.lat, event.latlng.lng];
      traps.forEach((t) => {
        t._d = t.exact_lat == null || t.exact_lng == null
          ? null : distanceM(S.userPoint[0], S.userPoint[1], t.exact_lat, t.exact_lng);
      });
      S.near = true;
      S.nearMessage = "Location selected. Nearby traps are shown first; tap a marker or trap to view its details.";
      render();
    });
    if (S.userPoint) {
      const nearest = points.filter((t) => t._d != null)
        .sort((a, b) => a._d - b._d)
        .slice(0, 5)
        .map((t) => [t.exact_lat, t.exact_lng]);
      if (nearest.length) {
        nearbyMap.fitBounds([S.userPoint, ...nearest], { padding: [24, 24], maxZoom: 15 });
      }
    } else if (points.length > 1) {
      nearbyMap.fitBounds(points.map((t) => [t.exact_lat, t.exact_lng]), { padding: [24, 24] });
    }
  }

  function render() {
    if (nearbyMap) {
      nearbyMap.remove();
      nearbyMap = null;
    }
    const pending = Outbox.count();
    let html = pending ? `<div class="alert alert-warning d-flex justify-content-between align-items-center">
      <span>${pending} check${pending > 1 ? "s" : ""} waiting to upload</span><button class="btn btn-sm btn-warning" data-act="sync">Sync now</button></div>` : "";
    if (!S.trap) {
      html += `<div class="d-grid gap-2 mb-3">
          <button class="btn btn-primary btn-lg py-3" data-act="near"><i class="bi bi-crosshair"></i> Find nearest traps</button>
          <input id="q" class="form-control form-control-lg" placeholder="Search by trap code or line" value="${esc(S.q)}"></div>
        ${S.nearMessage ? `<p class="small text-secondary">${esc(S.nearMessage)}</p>` : ""}
        ${S.nearMap ? `<div id="nearby-trap-map" class="nearby-trap-map rounded mb-3"></div>` : ""}
        <div id="list">${listHtml()}</div>`;
    } else {
      const t = S.trap, ready = S.status && (S.status !== "caught" || S.species);
      html += `<button class="btn btn-sm btn-outline-secondary mb-3" data-act="back"><i class="bi bi-arrow-left"></i> Choose another trap</button>
        <div class="card mb-3"><div class="card-body">
          <div class="d-flex justify-content-between align-items-start"><div><div class="h3 mb-0">${esc(t.code)}</div>
            <div class="text-secondary small">${esc(lineName[t.trap_line_id] || "")} - ${esc(t.trap_type)} - ${esc(t.general_area)}${t._d != null ? " - " + esc(fmtDist(t._d)) + " away" : ""}</div></div>${stateBadge(t)}</div>
          <div class="small mt-2">Last check: ${esc(ago(t.last_checked_at))}${t.last_status ? " (" + esc(t.last_status.replace("_", " ")) + ")" : ""}</div>
          <div class="small text-secondary">Suggested bait: ${esc(t.recommended_bait)}</div></div></div>
        <h2 class="h6">What did you find?</h2>
        <div class="row g-2 mb-3">${STATUS.map(([v, l, i]) => `<div class="col-6"><button class="tile ${S.status === v ? "active" : ""}" data-act="status" data-v="${v}"><i class="bi bi-${i}"></i><br>${l}</button></div>`).join("")}</div>
        ${S.status === "caught" ? `<h2 class="h6">What was caught?</h2><div class="row g-2 mb-3">${FIXED.species.map((o) =>
          `<div class="col-4"><button class="tile ${S.species === o.value ? "active" : ""}" style="min-height:60px;padding:.6rem" data-act="species" data-v="${esc(o.value)}">${esc(o.label)}</button></div>`).join("")}</div>` : ""}
        <textarea id="notes" class="form-control mb-3" rows="2" maxlength="500" placeholder="Notes (optional)">${esc(S.notes)}</textarea>
        <button class="btn btn-primary btn-lg w-100 py-3" data-act="save" ${ready && !S.saving ? "" : "disabled"}>Save check</button>`;
    }
    box.innerHTML = html;
    drawNearbyMap();
  }

  async function save() {
    const t = S.trap, when = new Date().toISOString();
    // A catch is created together with its check by POST /catches; anything else is a plain check.
    const job = S.status === "caught"
      ? { path: "/catches", body: { trap_id: t.id, species: S.species, notes: S.notes, checked_at: when } }
      : { path: "/traps/" + t.id + "/checks", body: { status: S.status, notes: S.notes, checked_at: when } };
    job.label = t.code + " - " + S.status.replace("_", " ");
    S.saving = true; render();
    try {
      if (!navigator.onLine) throw new TypeError("offline");
      await apiRequest(job.path, "POST", job.body);
      success("Check saved");
    } catch (err) {
      S.saving = false;
      if (!(err instanceof TypeError)) { render(); return fail(err); } // the server said no: show why
      try {
        Outbox.add(job);
      } catch (queueError) {
        render();
        return fail(queueError);
      }
      Box.fire({ icon: "info", title: "Saved on this device", text: "No signal right now. It will upload by itself when you are back online." });
    }
    t.last_status = S.status; t.last_checked_at = when;   // update the list on screen
    Object.assign(S, { trap: null, status: "", species: "", notes: "", saving: false });
    if (preset) history.replaceState(null, "", "check.html");
    render();
  }

  box.onclick = (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const act = b.dataset.act;
    if (act === "pick") { S.trap = traps.find((t) => String(t.id) === b.dataset.id); render(); }
    else if (act === "back") { Object.assign(S, { trap: null, status: "", species: "" }); render(); }
    else if (act === "status") { S.status = b.dataset.v; if (S.status !== "caught") S.species = ""; render(); }
    else if (act === "species") { S.species = b.dataset.v; render(); }
    else if (act === "save") save();
    else if (act === "sync") flushOutboxWithConfirmation().then((r) => {
      if (r.sent) success(r.sent + " uploaded");
      r.failed.forEach((f) => fail(new Error(f.label + ": " + f.error)));
      if (r.blocked) fail(new Error(`${r.blocked} queued check${r.blocked === 1 ? " belongs" : "s belong"} to another account. Sign in with that account to sync it.`));
      render();
    });
    else if (act === "near") {
      const showMapFallback = (message) => {
        S.near = false;
        S.nearMap = true;
        S.userPoint = null;
        S.nearMessage = message + " Click the map to choose your location and see nearby traps.";
        traps.forEach((t) => { t._d = null; });
        render();
      };
      if (!navigator.geolocation) return showMapFallback("This device cannot provide GPS location.");
      b.disabled = true; b.textContent = "Finding you...";
      const stop = (msg) => showMapFallback(msg);
      navigator.geolocation.getCurrentPosition((p) => {
        S.userPoint = [p.coords.latitude, p.coords.longitude];
        traps.forEach((t) => { t._d = t.exact_lat == null || t.exact_lng == null ? null : distanceM(p.coords.latitude, p.coords.longitude, t.exact_lat, t.exact_lng); });
        if (!traps.some((t) => t._d != null)) {
          S.nearMap = false;
          return stop("Your account cannot see exact trap locations. Search by code or scan the trap's QR code instead.");
        }
        S.near = true;
        S.nearMap = true;
        S.nearMessage = "Nearby traps are shown on the map and sorted by distance. Tap a marker or trap to view its details.";
        render();
      }, (err) => {
        stop(err.code === 1
          ? "Location access is blocked."
          : err.code === 3 ? "Finding your location took too long."
          : "Your location is not available right now.");
      }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
    }
  };
  box.oninput = (e) => {
    if (e.target.id === "q") { S.q = e.target.value; document.getElementById("list").innerHTML = listHtml(); }
    else if (e.target.id === "notes") S.notes = e.target.value;
  };
  render();
}


// ================= REPORTS =================
async function reportsPage(group = "line") {
  shell("Reports", `
    <div class="d-flex flex-wrap gap-3 align-items-end mb-4">
      <div><label class="form-label small text-secondary" for="reportFrom">From</label><input id="reportFrom" type="date" class="form-control form-control-sm"></div>
      <div><label class="form-label small text-secondary" for="reportTo">To</label><input id="reportTo" type="date" class="form-control form-control-sm"></div>
      <div><label class="form-label small text-secondary" for="reportLine">Area / trap line</label><select id="reportLine" class="form-select form-select-sm"><option value="">All areas</option></select></div>
      <div><label class="form-label small text-secondary" for="grp">Group catches by</label><select id="grp" class="form-select form-select-sm"><option value="line">Trap line</option><option value="month">Month</option></select></div>
      <button id="csvRep" class="btn btn-sm btn-outline-secondary"><i class="bi bi-download"></i> Export filtered catches CSV</button>
      <button id="pdfRep" class="btn btn-sm btn-outline-secondary"><i class="bi bi-file-earmark-pdf"></i> Export report PDF</button>
      <button id="csvTraps" class="btn btn-sm btn-outline-secondary"><i class="bi bi-download"></i> Export filtered traps CSV</button>
      <button id="pdfTraps" class="btn btn-sm btn-outline-secondary"><i class="bi bi-file-earmark-pdf"></i> Export filtered traps PDF</button>
    </div>
    <div id="reportResults" aria-live="polite">Loading report...</div>`);
  try {
    const [traps, lines, catches] = (await Promise.all([
      api.getTraps(), api.getLines(), api.getCatches(),
    ])).map(list);
    const lineName = Object.fromEntries(lines.map((line) => [line.id, line.name]));
    const lineArea = Object.fromEntries(lines.map((line) => [line.id, line.general_area]));
    document.getElementById("reportLine").insertAdjacentHTML("beforeend",
      lines.map((line) => `<option value="${esc(line.id)}">${esc(line.name)} — ${esc(line.general_area)}</option>`).join(""));

    const localDate = (value) => {
      const date = parseDate(value);
      if (!date) return "";
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    };
    const grouped = (items, keyFor) => {
      const totals = {};
      items.forEach((item) => {
        const key = keyFor(item);
        totals[key] = (totals[key] || 0) + 1;
      });
      return totals;
    };
    const filterData = () => {
      const from = document.getElementById("reportFrom").value;
      const to = document.getElementById("reportTo").value;
      const lineId = document.getElementById("reportLine").value;
      const selectedTraps = traps.filter((trap) => !lineId || String(trap.trap_line_id) === lineId);
      const selectedCatches = catches.filter((item) => {
        const day = localDate(item.recorded_at);
        return (!lineId || String(item.trap_line_id) === lineId)
          && (!from || day >= from) && (!to || day <= to);
      });
      return { from, to, selectedTraps, selectedCatches };
    };
    const dateTime = (value) => {
      const date = parseDate(value);
      return date ? date.toLocaleString("en-NZ", {
        day: "numeric", month: "short", year: "numeric",
        hour: "numeric", minute: "2-digit", hour12: true,
      }) : "";
    };
    const trapColumns = [
      { key: "code", label: "Trap" }, { key: "trap_line", label: "Trap line" },
      { key: "type", label: "Type" }, { key: "area", label: "General area" },
      { key: "trap_status", label: "Trap status" }, { key: "last_status", label: "Last check result" },
      { key: "last_checked_at", label: "Last checked" }, { key: "check_state", label: "Check status" },
    ];
    const render = () => {
      const { from, to, selectedTraps, selectedCatches } = filterData();
      if (from && to && from > to) {
        document.getElementById("reportResults").innerHTML =
          "<div class='alert alert-warning'>The start date must be on or before the end date.</div>";
        ["csvRep", "pdfRep", "csvTraps", "pdfTraps"].forEach((id) => {
          document.getElementById(id).disabled = true;
        });
        return;
      }
      ["csvRep", "pdfRep", "csvTraps", "pdfTraps"].forEach((id) => {
        document.getElementById(id).disabled = false;
      });

      const groupBy = document.getElementById("grp").value;
      const catchGroups = grouped(selectedCatches, (item) => groupBy === "month"
        ? localDate(item.recorded_at).slice(0, 7)
        : (lineName[item.trap_line_id] || item.trap_line || "Unknown"));
      const species = grouped(selectedCatches, (item) => item.species || "Unknown");
      const lastStatus = grouped(selectedTraps, (trap) => trap.last_status || "not checked yet");
      const checkStatus = grouped(selectedTraps, (trap) => trapState(trap).label);
      const overdue = selectedTraps.filter((trap) => trapState(trap).key === "overdue").length;
      const neverChecked = selectedTraps.filter((trap) => trapState(trap).key === "never").length;
      const maintenanceTraps = selectedTraps.filter((trap) =>
        (trap.status || "active") !== "active" || needsAttention(trap));
      const maintenanceRows = maintenanceTraps.map((trap) => `
        <tr><td>${esc(trap.code)}</td><td>${esc(lineName[trap.trap_line_id] || "")}</td>
        <td>${esc(trap.general_area || lineArea[trap.trap_line_id] || "")}</td>
        <td>${esc((trap.status || "active").replace(/_/g, " "))}</td>
        <td>${esc((trap.last_status || "none").replace(/_/g, " "))}</td>
        <td>${esc(ago(trap.last_checked_at))}</td></tr>`).join("");
      const trapRows = selectedTraps.map((trap) => ({
        code: trap.code,
        trap_line: lineName[trap.trap_line_id] || "",
        type: trap.trap_type,
        area: trap.general_area || lineArea[trap.trap_line_id] || "",
        trap_status: (trap.status || "active").replace(/_/g, " "),
        last_status: (trap.last_status || "").replace(/_/g, " "),
        last_checked_at: dateTime(trap.last_checked_at),
        check_state: trapState(trap).label,
      }));
      const maintenanceExportRows = maintenanceTraps.map((trap) => ({
        code: trap.code,
        trap_line: lineName[trap.trap_line_id] || "",
        type: trap.trap_type,
        area: trap.general_area || lineArea[trap.trap_line_id] || "",
        trap_status: (trap.status || "active").replace(/_/g, " "),
        last_status: (trap.last_status || "").replace(/_/g, " "),
        last_checked_at: dateTime(trap.last_checked_at),
        check_state: trapState(trap).label,
      }));
      const catchRows = selectedCatches.map((item) => ({
        recorded_at: dateTime(item.recorded_at),
        trap_line: lineName[item.trap_line_id] || item.trap_line || "",
        trap: item.trap_code,
        species: item.species,
        recorded_by: item.recorded_by,
      }));
      const period = from || to
        ? `Date range: ${from || "earliest"} to ${to || "latest"}`
        : "Date range: all recorded data";
      document.getElementById("reportResults").innerHTML = `
        <p class="small text-secondary">${esc(period)} · ${selectedCatches.length} catches · ${selectedTraps.length} traps</p>
        <div class="row g-3 mb-4">
          ${card("Catches in range", selectedCatches.length)}
          ${card("Overdue traps", overdue, "text-danger")}
          ${card("Never checked", neverChecked)}
          ${card("Maintenance needs", maintenanceTraps.length, "text-warning")}
        </div>
        <div class="row g-4">
          <div class="col-lg-6"><h2 class="h5">Catches by ${groupBy === "line" ? "trap line" : "month"}</h2>${countTable(catchGroups, groupBy === "line" ? "Trap line" : "Month")}</div>
          <div class="col-lg-6"><h2 class="h5">Catches by species</h2>${countTable(species, "Species")}</div>
          <div class="col-lg-6"><h2 class="h5">Traps by last check result</h2>${countTable(lastStatus, "Result")}</div>
          <div class="col-lg-6"><h2 class="h5">Traps by check schedule</h2>${countTable(checkStatus, "Schedule")}</div>
          <div class="col-12"><h2 class="h5">Maintenance and follow-up</h2>
            <div class="table-responsive"><table class="table"><thead><tr><th>Trap</th><th>Trap line</th><th>Area</th><th>Trap status</th><th>Last result</th><th>Last checked</th></tr></thead>
            <tbody>${maintenanceRows || "<tr><td colspan='6'>No maintenance needs found.</td></tr>"}</tbody></table></div>
          </div>
        </div>`;

      const catchGroupRows = Object.entries(catchGroups).map(([label, total]) => ({
        label, catches: total,
      }));
      const countRows = (items) => Object.entries(items).map(([label, total]) => ({
        label, total,
      }));
      document.getElementById("csvRep").onclick = () => catchRows.length
        ? downloadCSV("filtered-catches.csv", catchRows)
        : fail(new Error("There are no catches in this filter."));
      document.getElementById("pdfRep").onclick = () => exportPDF(`Pest-Free field report — ${period}`, [
        { title: `Catches by ${groupBy}`, columns: [{ key: "label", label: groupBy === "line" ? "Trap line" : "Month" }, { key: "catches", label: "Catches" }], rows: catchGroupRows },
        { title: "Catches by species", columns: [{ key: "label", label: "Species" }, { key: "total", label: "Total" }], rows: countRows(species) },
        { title: "Traps by last check result", columns: [{ key: "label", label: "Result" }, { key: "total", label: "Total" }], rows: countRows(lastStatus) },
        { title: "Traps by check schedule", columns: [{ key: "label", label: "Schedule" }, { key: "total", label: "Total" }], rows: countRows(checkStatus) },
        { title: "Maintenance and follow-up", columns: trapColumns, rows: maintenanceExportRows },
      ]);
      document.getElementById("csvTraps").onclick = () => trapRows.length
        ? downloadCSV("filtered-traps.csv", trapRows, trapColumns.map((column) => column.key))
        : fail(new Error("There are no traps in this filter."));
      document.getElementById("pdfTraps").onclick = () => trapRows.length
        ? exportPDF("Filtered traps", [{ columns: trapColumns, rows: trapRows }])
        : fail(new Error("There are no traps in this filter."));
    };
    document.getElementById("grp").value = group;
    ["reportFrom", "reportTo", "reportLine", "grp"].forEach((id) => {
      document.getElementById(id).onchange = render;
    });
    render();
  } catch (err) { showError(err); }
}


// ================= SETTINGS =================
async function settingsPage() {
  shell("Settings", `
    <div class="row g-4" style="max-width:720px">
      <div class="col-md-6"><div class="card h-100"><div class="card-body">
        <p class="text-uppercase small fw-bold mb-3" style="letter-spacing:.12em;color:var(--accent)">Appearance</p>
        <p class="text-secondary small">Matches the Pest-Free public site. Your choice is saved on this device.</p>
        <div class="theme-picks">
          <button type="button" class="theme-pick" data-theme-set="dark"><i class="bi bi-moon-stars me-1"></i> Dark</button>
          <button type="button" class="theme-pick" data-theme-set="light"><i class="bi bi-sun me-1"></i> Light</button>
        </div>
      </div></div></div>
      <div class="col-md-6"><div class="card h-100"><div class="card-body">
        <p class="text-uppercase small fw-bold mb-3" style="letter-spacing:.12em;color:var(--accent)">Account</p>
        <p><b>Name:</b> ${esc(me.name)}</p>
        <p><b>Email:</b> ${esc(me.email)}</p>
        <p><b>Role:</b> ${esc(me.role)}</p>
        <p><b>Exact trap locations:</b> ${isCoord() || me.can_view_exact_location ? "Yes" : "No"}</p>
        <p><b>API address:</b> ${esc(API_URL)}</p>
        <p><b>Overdue rules:</b> amber after ${dueDays()} days, red after ${overdueDays()} days (change them in config.js)</p>
        <p class="mb-3"><b>Waiting to upload:</b> <span id="qn">${Outbox.count()}</span> <button id="sync" class="btn btn-sm btn-outline-primary ms-2">Sync now</button></p>
        <button id="install" class="btn btn-outline-primary mb-3 d-none"><i class="bi bi-phone"></i> Install app on this device</button>
        <button id="out2" class="btn btn-outline-danger">Log out</button>
      </div></div></div>
      <div class="col-md-6"><div class="card h-100"><div class="card-body">
        <p class="text-uppercase small fw-bold mb-3" style="letter-spacing:.12em;color:var(--accent)">Alerts</p>
        <p class="text-secondary small">Get trap alerts on your phone with the free ntfy app.</p>
        <button id="ntfy-info" class="btn btn-primary me-2 mb-2"><i class="bi bi-bell"></i> Get alerts</button>
        ${isCoord() ? '<button id="ntfy-test" class="btn btn-outline-primary mb-2">Send test alert</button>' : ""}
      </div></div></div>
    </div>`);
  if (window.PFNTheme) PFNTheme.set(PFNTheme.get());
  document.getElementById("out2").onclick = logout;
  document.getElementById("sync").onclick = async () => {
    const r = await flushOutboxWithConfirmation();
    document.getElementById("qn").textContent = Outbox.count();
    if (r.sent) success(r.sent + " uploaded");
    else if (!r.blocked && !r.failed.length) success("Nothing to upload");
    r.failed.forEach((f) => fail(new Error(f.label + ": " + f.error)));
    if (r.blocked) fail(new Error(`${r.blocked} queued check${r.blocked === 1 ? " belongs" : "s belong"} to another account. Sign in with that account to sync it.`));
  };
  const inst = document.getElementById("install");
  if (window.deferredInstall) inst.classList.remove("d-none");
  inst.onclick = () => { window.deferredInstall.prompt(); };

  // "Get alerts": show how to subscribe to the ntfy topic.
  document.getElementById("ntfy-info").onclick = async () => {
    try {
      const i = await apiRequest("/notifications/info");
      Box.fire({
        icon: "info", title: "Get alerts on your phone", width: 480,
        html: `<ol class="text-start small">
          <li>Install the free <b>ntfy</b> app (Android or iPhone).</li>
          <li>Tap <b>+</b> and enter this topic name:<br><code>${esc(i.topic)}</code></li>
          <li>Or open it in a browser: <a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.url)}</a></li>
        </ol><p class="small text-secondary mb-0">Keep this topic name private - anyone who has it can read the alerts.</p>`,
        confirmButtonText: "Done",
      });
    } catch (err) { fail(err); }
  };

  // "Send test alert" (coordinators only): the server sends one test notification.
  const testBtn = document.getElementById("ntfy-test");
  if (testBtn) testBtn.onclick = async () => {
    try { await apiRequest("/notifications/test", "POST", {}); success("Test alert sent"); }
    catch (err) { fail(err); }
  };
}


// ================= START =================
// Pick the right page function (after we know the user's role).
const PAGES = { dashboard: dashboardPage, map: mapPage, reports: reportsPage, settings: settingsPage, check: checkPage, qr: qrPage, tasks: tasksPage, sync: syncPage, audit: auditPage };
(async () => {
  me = await ensureUser();
  if (isFieldWorker() && !["check", "tasks", "sync"].includes(PAGE)) {
    shell("Field operations only", "<p class='text-secondary'>Your Field Worker account can access field checks, assigned tasks and sync status. <a href='check.html'>Go to Field check</a></p>");
    return;
  }
  if (COORD_ONLY.includes(PAGE) && !isCoord()) {
    shell("Coordinators only", "<p class='text-secondary'>Your volunteer account cannot open this page. <a href='dashboard.html'>Back to the dashboard</a></p>");
    return;
  }
  (PAGES[PAGE] || tablePage)();
})();