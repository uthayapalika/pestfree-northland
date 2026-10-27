// api.js
// Simple helper that talks to the pest API.
// Needs config.js loaded first (it provides API_URL).


// Get the login token saved in the browser.
function getToken() {
  return localStorage.getItem("token");
}

// Save the token after login.
function saveToken(token) {
  localStorage.setItem("token", token);
}

// Get the logged-in user's details (name, email, role).
function getUser() {
  try { return JSON.parse(localStorage.getItem("user")) || {}; } catch (e) { return {}; }
}

// Remove the token and send the user back to the login page.
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  if (window.caches) caches.delete("pestfree-api-private-v2"); // forget cached data for the next person on this device
  window.location.href = "login.html";
}


// Main function: every API call goes through here.
//   path   = the route, e.g. "/traps"
//   method = GET, POST, PUT or DELETE (GET by default)
//   body   = data to send (optional)
async function apiRequest(path, method = "GET", body = null) {
  // Tell the server we are sending JSON.
  const headers = { "Content-Type": "application/json" };

  // If logged in, send the token so the server knows who we are.
  const token = getToken();
  if (token) headers["Authorization"] = "Bearer " + token;

  // Send the request to the API.
  const response = await fetch(API_URL + path, {
    method: method,
    headers: headers,
    body: body ? JSON.stringify(body) : null,
  });

  // Read the reply (some replies are empty, so ignore errors).
  let data = null;
  try {
    data = await response.json();
  } catch (e) {}

  // 401 = server rejected our token. Show the error (use Log out to sign in again).
  if (response.status === 401 && !path.startsWith("/auth")) {
    throw new Error("401 Not authorised for " + path + ": " + ((data && data.message) || "token rejected"));
  }

  // Any other error: throw it so the page can show the message.
  if (!response.ok) {
    // Show the status code and route so we can see which one is wrong (e.g. 404 = route not found).
    let why = (data && (data.message || data.error || data.detail)) || response.statusText || "no details";
    // FastAPI sends 422 problems as a list: [{loc:["body","general_area"], msg:"Field required"}]
    if (Array.isArray(why)) why = why.map((d) => ((d.loc || []).slice(1).join(".") || "data") + ": " + d.msg).join("; ");
    let hint = "";
    // If we never got the route list, the route name above is only a guess - say so.
    if (response.status === 404 && ROUTES && !ROUTES.all.length) {
      hint = " | Could not read " + API_URL + "/openapi.json so this route is a guess. Open that address in your browser and send me what you see.";
    }
    throw new Error(response.status + " on " + method + " " + API_URL + path + " - " + why + hint);
  }

  return data;
}


// Traps are listed under each line; other resources have direct collection routes.
const trapsApi = {
  list: async () => {
    const lines = await apiRequest("/trap-lines");
    const groups = await Promise.all(lines.map((line) =>
      apiRequest("/trap-lines/" + line.id + "/traps")
    ));
    return groups.flat();
  },
  add: async (data) => {
    const { trap_line_id, ...body } = data; // the line id goes in the address, not the body
    return apiRequest("/trap-lines/" + trap_line_id + "/traps", "POST", body);
  },
  update: async (id, data) => apiRequest("/traps/" + id, "PUT", data),
  remove: async (id) => apiRequest("/traps/" + id, "DELETE"),
};
const linesApi = {
  list: () => apiRequest("/trap-lines"),
  add: (data) => apiRequest("/trap-lines", "POST", data),
  update: (id, data) => apiRequest("/trap-lines/" + id, "PUT", data),
  remove: (id) => apiRequest("/trap-lines/" + id, "DELETE"),
};
const catchesApi = {
  list: () => apiRequest("/catches"),
  add: (data) => apiRequest("/catches", "POST", data),
  update: (id, data) => apiRequest("/catches/" + id, "PUT", data),
  remove: (id) => apiRequest("/catches/" + id, "DELETE"),
};
const usersApi = {
  list: () => apiRequest("/users"),
  add: (data) => apiRequest("/users", "POST", data),
  update: async (id, data) => apiRequest("/users/" + id, "PUT", data),
  remove: async (id) => apiRequest("/users/" + id, "DELETE"),
};

// Ready-made calls used by the pages.
const api = {
  // ---- Login / Register ----
  login: async (email, password) => {
    const data = await apiRequest("/auth/login", "POST", { email, password });

    // APIs name the token differently, so try the common names.
    const inner = data.data || {};
    const token = data.token || data.accessToken || data.access_token || data.jwt ||
                  inner.token || inner.accessToken || inner.access_token;

    // No token = we would be "logged in" with nothing, so stop and say why.
    if (!token) throw new Error("Login worked but no token found. API replied: " + JSON.stringify(data));

    saveToken(token);
    // Ask the API who this is (name + role) so pages can hide what a volunteer may not use.
    let user = data.user || inner.user || { email, role: data.role };
    try { user = await apiRequest("/auth/me"); } catch (e) {}
    localStorage.setItem("user", JSON.stringify(user));
    return data;
  },
  register: (name, email, password) =>
    apiRequest("/auth/register", "POST", { name, email, password }),

  // ---- Traps (also used by the map) ----
  getTraps: trapsApi.list, addTrap: trapsApi.add, updateTrap: trapsApi.update, deleteTrap: trapsApi.remove,
  // ---- Trap lines ----
  getLines: linesApi.list, addLine: linesApi.add, updateLine: linesApi.update, deleteLine: linesApi.remove,
  // ---- Catches ----
  getCatches: catchesApi.list, addCatch: catchesApi.add, updateCatch: catchesApi.update, deleteCatch: catchesApi.remove,
  // ---- Users ----
  getUsers: usersApi.list, addUser: usersApi.add, updateUser: usersApi.update, deleteUser: usersApi.remove,
  // ---- Checks and catches (this API creates a catch inside a check) ----
  getTrapChecks: (trapId) => apiRequest("/traps/" + trapId + "/checks"),
  getTrapHistory: (trapId) => apiRequest("/traps/" + trapId + "/history"),
  getTrapMaintenance: (trapId) => apiRequest("/traps/" + trapId + "/maintenance"),
  addTrapMaintenance: (trapId, data) =>
    apiRequest("/traps/" + trapId + "/maintenance", "POST", data),
  addCheck: (trapId, data) => apiRequest("/traps/" + trapId + "/checks", "POST", data),
  addCatchToCheck: (checkId, species) => apiRequest("/checks/" + checkId + "/catches", "POST", { species }),
  getReport: (group = "line") => apiRequest("/reports/catches?group=" + group), // group = "line" or "month"
  getTasks: () => apiRequest("/tasks"),
  addTask: (data) => apiRequest("/tasks", "POST", data),
  setTaskStatus: (id, status) => apiRequest("/tasks/" + id, "PATCH", { status }),
  getLineAssignments: (lineId) => apiRequest("/trap-lines/" + lineId + "/assignments"),
  getMyLineAssignments: () => apiRequest("/my/trap-line-assignments"),
  assignLine: (lineId, userId) =>
    apiRequest("/trap-lines/" + lineId + "/assignments", "POST", { user_id: userId }),
  removeLineAssignment: (id) => apiRequest("/trap-line-assignments/" + id, "DELETE"),
  setNotificationTopic: (topic) =>
    apiRequest("/users/me/notification-topic", "PUT", { topic: topic || null }),
  getAudit: (params = "") => apiRequest("/audit" + params),
  importTraps: (rows, updateExisting) =>
    apiRequest("/imports/traps", "POST", { rows, update_existing: updateExisting }),
};

// Make sure we know the user's role (older logins only saved the email).
async function ensureUser() {
  const u = getUser();
  if (u.role && u.name) return u;
  try {
    const fresh = await apiRequest("/auth/me");
    localStorage.setItem("user", JSON.stringify(fresh));
    return fresh;
  } catch (e) { return u; } // offline: use what we have
}


// ---------- Offline outbox ----------
// When there is no signal, checks are saved here (on this device) and sent later.
const Outbox = {
  all() { try { return JSON.parse(localStorage.getItem("outbox")) || []; } catch (e) { return []; } },
  history() { try { return JSON.parse(localStorage.getItem("syncHistory")) || []; } catch (e) { return []; } },
  record(job, status, error = "") {
    const history = this.history();
    history.unshift({
      label: job.label || "Field check",
      owner_id: job.owner_id || null,
      queued_at: job.queued_at || null,
      status,
      error,
      changed_at: new Date().toISOString(),
    });
    localStorage.setItem("syncHistory", JSON.stringify(history.slice(0, 200)));
    window.dispatchEvent(new Event("sync-history-changed"));
  },
  save(items) {
    localStorage.setItem("outbox", JSON.stringify(items));
    window.dispatchEvent(new Event("outbox-changed"));
  },
  count() { return this.all().length; },
  // job = { path, body, label }
  add(job) {
    const userId = getUser().id;
    if (!userId) throw new Error("Cannot queue this check without a signed-in user.");
    this.save([...this.all(), {
      ...job,
      owner_id: userId,
      queued_at: new Date().toISOString(),
    }]);
  },
  // Send everything waiting. Stops quietly if the signal is still missing.
  async flush({ includeUnassigned = false } = {}) {
    const result = { sent: 0, failed: [], blocked: 0, unassigned: 0 };
    if (this.busy || !navigator.onLine || !getToken()) return result;
    this.busy = true;
    try {
      const ownerId = getUser().id;
      const items = this.all();
      const remaining = [];
      for (let index = 0; index < items.length; index++) {
        const job = items[index];
        if (!ownerId || (job.owner_id && String(job.owner_id) !== String(ownerId))) {
          result.blocked++;
          remaining.push(job);
          continue;
        }
        if (!job.owner_id && !includeUnassigned) {
          result.unassigned++;
          remaining.push(job);
          continue;
        }
        try {
          await apiRequest(job.path, "POST", job.body);
          result.sent++;
          this.record(job, "uploaded");
        } catch (err) {
          if (err instanceof TypeError || String(err.message).startsWith("401")) {
            result.failed.push({ label: job.label, error: err.message });
            this.record(job, "failed", err.message);
            remaining.push(...items.slice(index));
            break;
          }
          result.failed.push({ label: job.label, error: err.message });
          remaining.push(job);
          this.record(job, "failed", err.message);
        }
      }
      this.save(remaining);
    } finally { this.busy = false; }
    return result;
  },
};
