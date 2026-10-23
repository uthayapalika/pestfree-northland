// admin.js
// Builds every admin page (the HTML files only have an empty #content box).
// Needs config.js, api.js, utils.js and auth.js loaded first.

const PAGE = document.body.dataset.page;          // which page we are on
const content = document.getElementById("content"); // where we draw the page
let me = getUser();                                // logged-in user (refreshed from the API at the bottom)
const isCoord = () => me.role === "coordinator";   // volunteers get a smaller menu and no edit buttons

// Menu links: [page name, label, icon, coordinator only?]
const NAV = [
  ["dashboard", "Dashboard", "speedometer2"], ["check", "Field check", "clipboard-check"],
  ["map", "Map", "map"], ["traps", "Traps", "geo-alt"], ["lines", "Trap lines", "diagram-3"],
  ["catches", "Catches", "bug"], ["reports", "Reports", "bar-chart", true],
  ["qr", "QR codes", "qr-code", true], ["users", "Users", "people", true], ["settings", "Settings", "gear"],
];
const COORD_ONLY = NAV.filter((n) => n[3]).map((n) => n[0]);

// The API may reply with [..] or {data:[..]} - this accepts both.
const list = (r) => (Array.isArray(r) ? r : (r && r.data) || []);

// Make text safe to put inside HTML.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

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
  const links = NAV.filter((n) => !n[3] || isCoord()).map(([id, label, icon]) =>
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
          <div id="err" class="alert alert-danger d-none"></div>${inner}
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


// ================= ADD / EDIT FORM (centered modal) =================
// Shows ONE form with every field.
//   title  = heading, fields = list of field names, values = current values (for edit)
//   save   = async function that gets the typed data and sends it to the API
// The form stays open (with the error shown) if save() fails, so nothing typed is lost.
// Gives back true if saved, false if the user cancelled.
function openForm(title, fields, values = {}, save, choices = {}) {
  return new Promise((resolve) => {
    const lists = {}; // the dropdown options actually shown, per field
    // Pick the input type from the field name / current value.
    const typeOf = (f, v) => (typeof v === "number" || /^(lat|lng)$|_id$|_lat$|_lng$/.test(f)) ? "number"
                           : /email/.test(f) ? "email" : /password/.test(f) ? "password" : /_at$/.test(f) ? "datetime-local" : /date/.test(f) ? "date" : "text";

    // One input per field (everything is required except description/notes).
    const inputs = fields.map((f) => {
      const label = LABELS[f] || f.replace(/_/g, " ");

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
        value="${esc(v)}" ${/description|notes|checked_at/.test(f) ? "" : "required"}></div>`;
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

    // Save pressed: check the fields, read them, call save().
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      form.classList.add("was-validated");
      if (!form.checkValidity()) return; // browser highlights the missing field

      const data = {};
      fields.forEach((f) => {
        const input = form.elements[f];
        if (lists[f]) { // dropdown: give back the original value (number / true / false / text)
          data[f] = lists[f].find((o) => String(o.value) === input.value).value;
          return;
        }
        data[f] = input.type === "number" ? (input.value === "" ? null : Number(input.value)) : input.value.trim();
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
    el.addEventListener("hidden.bs.modal", () => { el.remove(); resolve(saved); });
    el.addEventListener("shown.bs.modal", () => el.querySelector("input, select").focus());
    modal.show();
  });
}


// ================= MAP =================
async function mapPage() {
  shell("Map", `
    <div class="d-flex flex-wrap gap-3 align-items-center mb-3">
      <select id="lineFilter" class="form-select form-select-sm w-auto"><option value="">All trap lines</option></select>
      <div class="form-check form-switch mb-0"><input class="form-check-input" type="checkbox" id="onlyDue">
        <label class="form-check-label small" for="onlyDue">Only overdue / needs attention</label></div>
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
  let fitted = false;
  function draw() {
    layer.clearLayers();
    const line = document.getElementById("lineFilter").value;
    const only = document.getElementById("onlyDue").checked;
    const points = [];
    traps.forEach((t) => {
      if (t.exact_lat == null || t.exact_lng == null) return;
      if (line && String(t.trap_line_id) !== line) return;
      const s = trapState(t), warn = needsAttention(t);
      if (only && !(s.key === "overdue" || s.key === "never" || warn)) return;
      L.circleMarker([t.exact_lat, t.exact_lng], {
        radius: warn ? 12 : 10, color: warn ? "#6f2dbd" : "#0b1512", weight: warn ? 4 : 2, fillColor: s.color, fillOpacity: 0.95,
      }).addTo(layer).bindPopup(
        `<b>${esc(t.code)}</b> (${esc(t.trap_type)})<br>${esc(lineName[t.trap_line_id] || "")} - ${esc(t.general_area)}<br>
         ${stateBadge(t)}<br>Last check: ${esc(ago(t.last_checked_at))}<br>Result: ${esc((t.last_status || "none").replace("_", " "))}<br>
         <a href="check.html?trap=${esc(t.id)}">Log a check</a>`);
      points.push([t.exact_lat, t.exact_lng]);
    });
    if (!fitted && points.length) { map.fitBounds(points, { padding: [40, 40], maxZoom: 15 }); fitted = true; }
  }
  document.getElementById("lineFilter").onchange = draw;
  document.getElementById("onlyDue").onchange = draw;
  draw();

  // Coordinators: clicking the map opens the Add trap form with the clicked position filled in.
  if (isCoord()) map.on("click", async (e) => {
    const fields = CRUD.traps.addFields;
    let choices;
    try { choices = await loadChoices(fields); } catch (err) { return fail(err); }
    const saved = await openForm("Add trap", fields, {
      is_sensitive: false,
      exact_lat: Number(e.latlng.lat.toFixed(6)), exact_lng: Number(e.latlng.lng.toFixed(6)),
    }, async (data) => { await api.addTrap(data); success("Trap added"); }, choices);
    if (saved) mapPage();
  });
}


// ================= DROPDOWN CHOICES =================
// Friendlier labels for some fields.
const LABELS = { trap_line_id: "Trap line", trap_id: "Trap", is_sensitive: "Sensitive location?", species: "Species caught", notes: "Notes (optional)", checked_at: "Checked at (optional)", can_view_exact_location: "Can see exact locations?" };

// Fixed lists. Add or remove words here to change what users can pick.
const opt = (arr) => arr.map((v) => ({ value: v, label: v }));
const FIXED = {
  species:      opt(["possum", "rat", "stoat", "mouse", "hedgehog", "other"]),
  trap_type:    opt(["possum", "rat", "stoat"]),
  last_status:  opt(["caught", "empty", "bait_needed", "sprung"]),
  is_sensitive: [{ value: true, label: "Yes" }, { value: false, label: "No" }],
  can_view_exact_location: [{ value: true, label: "Yes" }, { value: false, label: "No" }],
  role:         opt(["volunteer", "coordinator"]),
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
  traps:   { title: "Traps",      one: "trap",      fields: ["code"], editFields: ["code", "trap_type", "general_area", "is_sensitive", "exact_lat", "exact_lng"], addFields: ["trap_line_id", "code", "trap_type", "general_area", "is_sensitive", "exact_lat", "exact_lng"],  load: api.getTraps,   add: api.addTrap,   update: api.updateTrap,   remove: api.deleteTrap,
             // extra read-only columns: line name + overdue status
             decorate: async (rows) => { const ln = await lineNames(); rows.forEach((r) => { r.trap_line = ln[r.trap_line_id] || ""; r.check_state = trapState(r).label; }); } },
  lines:   { title: "Trap lines", one: "trap line", fields: ["name", "general_area"],          load: api.getLines,   add: api.addLine,   update: api.updateLine,   remove: api.deleteLine },
  catches: { title: "Catches",    one: "catch",     fields: ["trap_id", "species"], editFields: ["species"], addFields: ["trap_id", "species", "notes", "checked_at"], load: api.getCatches, add: api.addCatch, update: api.updateCatch, remove: api.deleteCatch,
             volunteerCan: ["add"],
             decorate: async (rows) => { const ln = await lineNames(); const byId = Object.fromEntries(list(await api.getTraps()).map((t) => [t.id, t]));
               rows.forEach((r) => { const t = byId[r.trap_id]; r.trap_code = t ? t.code : ""; r.trap_line = t ? (ln[t.trap_line_id] || "") : ""; }); } },
  users:   { title: "Users",      one: "user",      fields: ["name", "email", "role"], addFields: ["name", "email", "password", "role"], load: api.getUsers, add: api.addUser, update: api.updateUser, remove: api.deleteUser },
};

async function tablePage() {
  const cfg = CRUD[PAGE];
  const can = (action) => isCoord() || (cfg.volunteerCan || []).includes(action);
  const addButton = cfg.add && can("add") ? `<button id="add" class="btn btn-primary mb-3"><i class="bi bi-plus-lg"></i> Add ${cfg.one}</button>` : "";
  const csvButton = `<button id="csv" class="btn btn-outline-secondary mb-3 ${addButton ? "ms-2" : ""}"><i class="bi bi-download"></i> Export CSV</button>`;
  shell(cfg.title, addButton + csvButton + "<div id='body'>Loading...</div>");

  try {
    const rows = list(await cfg.load());
    if (cfg.decorate) { try { await cfg.decorate(rows); } catch (e) {} }

    // Use the columns the API really sends (skips id, dates added by the server, and nested objects).
    const skip = ["id", "created_at", "updated_at"];
    const fields = rows.length
      ? Object.keys(rows[0]).filter((k) => !skip.includes(k) && typeof rows[0][k] !== "object")
      : cfg.fields;

    // Build the table.
    const cell = (f, r) => (f === "check_state" ? stateBadge(r) : esc(r[f]));
    const pretty = (f) => LABELS[f] || f.replace(/_/g, " ");
    const head = ["id", ...fields].map((f) => `<th>${esc(pretty(f))}</th>`).join("") + "<th></th>";
    const body = rows.map((r) => `<tr>` + ["id", ...fields].map((f) => `<td>${cell(f, r)}</td>`).join("") +
      `<td class="text-end text-nowrap">
        ${PAGE === "traps" && isCoord() ? `<button class="btn btn-sm btn-outline-secondary" data-qr="${esc(r.id)}" title="QR code"><i class="bi bi-qr-code"></i></button>` : ""}
        ${cfg.update && can("edit") ? `<button class="btn btn-sm btn-outline-primary" data-edit="${esc(r.id)}"><i class="bi bi-pencil"></i> Edit</button>` : ""}
        ${cfg.remove && can("delete") ? `<button class="btn btn-sm btn-outline-danger" data-del="${esc(r.id)}"><i class="bi bi-trash"></i> Delete</button>` : ""}</td></tr>`).join("");
    document.getElementById("body").innerHTML =
      `<div class="card"><div class="card-body table-responsive"><table id="tbl" class="table mb-0"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></div>`;

    // Make the table searchable/sortable if DataTables is loaded.
    if (window.jQuery && jQuery.fn.DataTable && rows.length) jQuery("#tbl").DataTable();

    // Export every row to a CSV file.
    document.getElementById("csv").onclick = () => {
      if (!rows.length) return fail(new Error("There is nothing to export yet."));
      downloadCSV(PAGE + "-" + new Date().toISOString().slice(0, 10) + ".csv", rows, ["id", ...fields]);
    };

    // QR button -> show this trap's QR code.
    document.querySelectorAll("[data-qr]").forEach((b) => b.onclick = () =>
      showQR(rows.find((r) => String(r.id) === b.dataset.qr)));

    // Add button -> open the form.
    if (addButton) document.getElementById("add").onclick = async () => {
      const addFields = cfg.addFields || fields;
      let choices;
      try { choices = await loadChoices(addFields); } catch (err) { return fail(err); }
      const saved = await openForm("Add " + cfg.one, addFields,
        cfg.addFields ? { is_sensitive: false } : PAGE === "catches" ? { checked_at: new Date().toISOString().slice(0, 16) } : {},
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


// ================= FIELD CHECK (phone friendly) =================
// Pick a trap (search, nearest by GPS, or arrive from its QR code), tap the result, save.
// With no signal the check is stored on the device and uploaded later.
async function checkPage() {
  shell("Field check", "<div id='body'>Loading...</div>");
  let traps = [], lines = [];
  try { [traps, lines] = (await Promise.all([api.getTraps(), api.getLines()])).map(list); } catch (err) { return showError(err); }
  const lineName = Object.fromEntries(lines.map((l) => [l.id, l.name]));
  const STATUS = [["empty", "Empty", "check-circle"], ["caught", "Caught", "bug-fill"], ["bait_needed", "Bait needed", "basket"], ["sprung", "Sprung", "exclamation-triangle"]];
  const S = { trap: null, status: "", species: "", notes: "", q: "", near: false, saving: false };
  const preset = new URLSearchParams(location.search).get("trap"); // from a QR code
  if (preset) S.trap = traps.find((t) => String(t.id) === preset) || null;
  const box = document.getElementById("body");

  function listHtml() {
    const q = S.q.toLowerCase();
    let items = traps.filter((t) => (t.code + " " + (lineName[t.trap_line_id] || "") + " " + (t.general_area || "")).toLowerCase().includes(q));
    if (S.near) items.sort((a, b) => (a._d ?? Infinity) - (b._d ?? Infinity));
    return items.slice(0, 12).map((t) => `<button class="tile list" data-act="pick" data-id="${esc(t.id)}">
      <div class="d-flex justify-content-between align-items-center"><b>${esc(t.code)}</b>${stateBadge(t)}</div>
      <small class="text-secondary">${esc(lineName[t.trap_line_id] || "")} - ${esc(t.trap_type)}${S.near && t._d != null ? " - " + fmtDist(t._d) : ""}</small></button>`).join("")
      || "<p class='text-secondary'>No trap matches.</p>";
  }

  function render() {
    const pending = Outbox.count();
    let html = pending ? `<div class="alert alert-warning d-flex justify-content-between align-items-center">
      <span>${pending} check${pending > 1 ? "s" : ""} waiting to upload</span><button class="btn btn-sm btn-warning" data-act="sync">Sync now</button></div>` : "";
    if (!S.trap) {
      html += `<div class="d-grid gap-2 mb-3">
          <button class="btn btn-primary btn-lg py-3" data-act="near"><i class="bi bi-crosshair"></i> Find nearest traps</button>
          <input id="q" class="form-control form-control-lg" placeholder="Search by trap code or line" value="${esc(S.q)}"></div>
        <div id="list">${listHtml()}</div>`;
    } else {
      const t = S.trap, ready = S.status && (S.status !== "caught" || S.species);
      html += `<button class="btn btn-sm btn-outline-secondary mb-3" data-act="back"><i class="bi bi-arrow-left"></i> Choose another trap</button>
        <div class="card mb-3"><div class="card-body">
          <div class="d-flex justify-content-between align-items-start"><div><div class="h3 mb-0">${esc(t.code)}</div>
            <div class="text-secondary small">${esc(lineName[t.trap_line_id] || "")} - ${esc(t.trap_type)} - ${esc(t.general_area)}</div></div>${stateBadge(t)}</div>
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
      Outbox.add(job);                                                 // no signal: keep it on the device
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
    else if (act === "sync") Outbox.flush().then((r) => { if (r.sent) success(r.sent + " uploaded"); r.failed.forEach((f) => fail(new Error(f.label + ": " + f.error))); render(); });
    else if (act === "near") {
      if (!navigator.geolocation) return fail(new Error("This device has no GPS."));
      b.disabled = true; b.textContent = "Finding you...";
      const stop = (msg) => { S.near = false; traps.forEach((t) => { t._d = null; }); fail(new Error(msg)); render(); };
      navigator.geolocation.getCurrentPosition((p) => {
        traps.forEach((t) => { t._d = t.exact_lat == null || t.exact_lng == null ? null : distanceM(p.coords.latitude, p.coords.longitude, t.exact_lat, t.exact_lng); });
        if (!traps.some((t) => t._d != null)) return stop("Your account cannot see exact trap locations. Search by code or scan the trap's QR code instead.");
        S.near = true; render();
      }, (err) => {
        stop(err.code === 1
          ? "Location is blocked. Click the location/padlock icon in the address bar, set Location to Allow, then try again. On Windows also check Settings > Privacy & security > Location. On a phone: Settings > Site settings > Location."
          : err.code === 3 ? "Finding your location took too long. Move to open sky and try again, or search by trap code."
          : "Your location is not available right now. Search by trap code instead.");
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
  shell("Reports", "<div id='body'>Loading...</div>");
  try {
    const [traps, lines] = (await Promise.all([api.getTraps(), api.getLines()])).map(list);
    const lineName = Object.fromEntries(lines.map((l) => [l.id, l.name]));
    let rep = null;
    try { rep = await api.getReport(group); } catch (e) { showError(e); }
    const repRows = rep && Array.isArray(rep.rows) ? rep.rows : [];
    const rows = Object.fromEntries(repRows.map((r) => [r.label, r.catches]));
    const status = count(traps.map((t) => ({ s: t.last_status || "not checked yet" })), "s");
    const state = count(traps.map((t) => ({ s: trapState(t).label })), "s");
    document.getElementById("body").innerHTML = `
      <div class="d-flex flex-wrap gap-2 align-items-center mb-4">
        <label class="small text-secondary" for="grp">Group catches by</label>
        <select id="grp" class="form-select form-select-sm w-auto"><option value="line">Trap line</option><option value="month">Month</option></select>
        <button id="csvRep" class="btn btn-sm btn-outline-secondary"><i class="bi bi-download"></i> Export report CSV</button>
        <button id="csvTraps" class="btn btn-sm btn-outline-secondary"><i class="bi bi-download"></i> Export all traps CSV</button>
      </div>
      <div class="row g-4">
        <div class="col-lg-4"><h2 class="h5">Catches by ${esc((rep && rep.group) || group)}${rep ? " (total " + esc(rep.total) + ")" : ""}</h2>${countTable(rows, "Group")}</div>
        <div class="col-lg-4"><h2 class="h5">Traps by last status</h2>${countTable(status, "Status")}</div>
        <div class="col-lg-4"><h2 class="h5">Traps by check status</h2>${countTable(state, "Status")}</div>
      </div>`;
    const sel = document.getElementById("grp");
    sel.value = group;
    sel.onchange = () => reportsPage(sel.value);
    document.getElementById("csvRep").onclick = () => repRows.length
      ? downloadCSV("catches-by-" + group + ".csv", repRows.map((r) => ({ [group]: r.label, catches: r.catches })))
      : fail(new Error("There is nothing to export yet."));
    document.getElementById("csvTraps").onclick = () => traps.length
      ? downloadCSV("traps-" + new Date().toISOString().slice(0, 10) + ".csv", traps.map((t) => ({
          code: t.code, trap_line: lineName[t.trap_line_id] || "", type: t.trap_type, area: t.general_area,
          last_status: t.last_status || "", last_checked_at: t.last_checked_at || "", days_since_check: daysSince(t.last_checked_at) ?? "", check_state: trapState(t).label })))
      : fail(new Error("There are no traps to export."));
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
    </div>`);
  if (window.PFNTheme) PFNTheme.set(PFNTheme.get());
  document.getElementById("out2").onclick = logout;
  document.getElementById("sync").onclick = async () => {
    const r = await Outbox.flush();
    document.getElementById("qn").textContent = Outbox.count();
    success(r.sent ? r.sent + " uploaded" : "Nothing to upload");
    r.failed.forEach((f) => fail(new Error(f.label + ": " + f.error)));
  };
  const inst = document.getElementById("install");
  if (window.deferredInstall) inst.classList.remove("d-none");
  inst.onclick = () => { window.deferredInstall.prompt(); };
}


// ================= START =================
// Pick the right page function (after we know the user's role).
const PAGES = { dashboard: dashboardPage, map: mapPage, reports: reportsPage, settings: settingsPage, check: checkPage, qr: qrPage };
(async () => {
  me = await ensureUser();
  if (COORD_ONLY.includes(PAGE) && !isCoord()) {
    shell("Coordinators only", "<p class='text-secondary'>Your volunteer account cannot open this page. <a href='dashboard.html'>Back to the dashboard</a></p>");
    return;
  }
  (PAGES[PAGE] || tablePage)();
})();