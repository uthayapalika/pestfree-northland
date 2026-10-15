"use strict";
// Shared by every page: small helpers, the top bar, and the login check.

const $app = document.getElementById("app");

const STATUS_LABELS = {
  empty: "Empty",
  caught: "Caught",
  bait_needed: "Bait needed",
  sprung: "Sprung",
};
const SPECIES = ["possum", "rat", "stoat", "mouse", "hedgehog", "other"];

// Builds page elements without innerHTML, so text from the server is always shown as plain text.
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

const field = (label, input) => h("label", { class: "field" }, h("span", {}, label), input);

function select(options, value) {
  const el = h("select", {}, options.map(([v, text]) => h("option", { value: v }, text)));
  if (value !== undefined) el.value = value;
  return el;
}

const alertBox = (message, kind = "error") =>
  h("div", { class: `alert ${kind}`, role: kind === "error" ? "alert" : "status" }, message);

const badge = (status) =>
  h("span", { class: `badge ${status || "none"}` }, STATUS_LABELS[status] || "Never checked");

function fmtDate(value) {
  if (!value) return "-";
  const hasZone = /[zZ]$|[+-]\d\d:?\d\d$/.test(value);
  const d = new Date(hasZone ? value : value + "Z"); // API times are UTC
  return d.toLocaleString("en-NZ", { dateStyle: "medium", timeStyle: "short" });
}

function toNumber(text, label) {
  if (text.trim() === "") return null;
  const n = Number(text);
  if (Number.isNaN(n)) throw new Error(`${label} must be a number.`);
  return n;
}

// Reads ?line=1&trap=2 from the address bar.
const param = (name) => new URLSearchParams(location.search).get(name);

// A message that survives a page reload or a move to another page (shown once).
function setFlash(text, kind = "ok") {
  try { sessionStorage.setItem("flash", JSON.stringify({ text, kind })); } catch (e) { /* ignore */ }
}
function takeFlash() {
  try {
    const raw = sessionStorage.getItem("flash");
    sessionStorage.removeItem("flash");
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// Wraps a form handler: stops the page reload, shows errors, disables the button while working.
function handler(msgBox, fn) {
  return async (ev) => {
    ev.preventDefault();
    msgBox.replaceChildren();
    const btn = ev.submitter;
    if (btn) btn.disabled = true;
    try {
      await fn(ev);
    } catch (e) {
      msgBox.replaceChildren(alertBox(e.message));
    } finally {
      if (btn) btn.disabled = false;
    }
  };
}

function show(node) {
  const f = takeFlash();
  if (f) node.prepend(alertBox(f.text, f.kind));
  $app.replaceChildren(node);
}

function logout() {
  Auth.clear();
  location.href = "login.html";
}

const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  lines: '<path d="M4 19c4-1 4-7 8-7s4-6 8-7"/><circle cx="4" cy="19" r="1.5"/><circle cx="20" cy="5" r="1.5"/>',
  reports: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-4 3-6 6.5-6s6.5 2 6.5 6"/>',
};

// Small fixed icon set (trusted strings written here, never user text).
function icon(name) {
  const t = document.createElement("template");
  t.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
  return t.content.firstChild;
}

// Fills the sidebar (only on pages that have one).
function renderNav() {
  const links = document.getElementById("navlinks");
  const user = document.getElementById("navuser");
  if (!links || !user) return;
  const here = location.pathname.split("/").pop();
  const parent = { "traps.html": "lines.html", "trap.html": "lines.html" };
  const active = parent[here] || here;
  const items = [["dashboard.html", "Dashboard", "dashboard"], ["lines.html", "Trap lines", "lines"]];
  if (Auth.role === "coordinator") {
    items.push(["reports.html", "Reports", "reports"], ["users.html", "Users", "users"]);
  }
  links.replaceChildren(...items.map(([href, text, name]) =>
    h("a", { class: "nv", href, "aria-current": active === href ? "page" : null }, icon(name), text)));
  user.replaceChildren(
    h("div", { class: "who" }, h("b", {}, Auth.name || "User"), h("span", {}, Auth.role)),
    h("button", { class: "link-btn", type: "button", onclick: logout }, "Log out"));
}

// access: "public" (login/register), "user" (any logged-in user) or "coordinator".
function requireAuth(access) {
  if (access === "public") {
    if (Auth.token) { location.replace("dashboard.html"); return false; }
    return true;
  }
  if (!Auth.token) { location.replace("login.html"); return false; }
  if (access === "coordinator" && Auth.role !== "coordinator") {
    renderNav();
    show(h("div", {}, alertBox("This page is for coordinators only.")));
    return false;
  }
  return true;
}

// Every page script calls this: check access, draw the top bar, build the page, show errors nicely.
async function startPage(access, build) {
  if (!requireAuth(access)) return;
  renderNav();
  $app.replaceChildren(h("p", { class: "muted" }, "Loading..."));
  try {
    show(await build());
  } catch (e) {
    if (e && e.redirecting) return; // moving to the login page; keep the message for it
    show(h("div", {}, alertBox(e.message)));
  }
}

function locationCell(t) {
  if (t.exact_lat !== null && t.exact_lng !== null) {
    return h("div", {}, `${t.exact_lat.toFixed(5)}, ${t.exact_lng.toFixed(5)}`,
      h("div", { class: "small muted" }, t.general_area));
  }
  return h("div", {}, t.general_area,
    h("div", { class: "small muted" }, t.is_sensitive ? "Exact location hidden" : "No coordinates recorded"));
}
