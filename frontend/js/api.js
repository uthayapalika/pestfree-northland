"use strict";

const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.apiBase) || "";

// Small wrapper around localStorage that still works if the browser blocks it.
const memory = {};
const store = {
  get(key) {
    try { return localStorage.getItem(key); } catch (e) { return memory[key] || null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { memory[key] = value; }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch (e) { delete memory[key]; }
  },
};

const Auth = {
  get token() { return store.get("token"); },
  get role() { return store.get("role"); },
  get name() { return store.get("name") || ""; },
  save(token, role) { store.set("token", token); store.set("role", role); },
  setName(name) { store.set("name", name); },
  clear() { ["token", "role", "name"].forEach((k) => store.remove(k)); },
};

// Turns the API's error body into one readable sentence.
function formatError(data, status) {
  if (data && typeof data.detail === "string") return data.detail;
  if (data && Array.isArray(data.detail)) {
    return data.detail
      .map((d) => {
        const field = (d.loc || []).filter((x) => x !== "body").join(" ");
        return field ? `${field}: ${d.msg}` : d.msg;
      })
      .join("; ");
  }
  return `Something went wrong (error ${status}). Is the server running?`;
}

async function api(path, options = {}) {
  const { method = "GET", body } = options;
  const headers = { "Content-Type": "application/json" };
  if (Auth.token) headers.Authorization = `Bearer ${Auth.token}`;

  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    throw new Error("Cannot reach the server. Check that the API is running.");
  }

  let data = null;
  try { data = await res.json(); } catch (e) { /* no JSON body */ }

  if (res.status === 401 && Auth.token) {
    Auth.clear();
    try {
      sessionStorage.setItem("flash", JSON.stringify({ text: "Your session has ended. Please log in again.", kind: "error" }));
    } catch (e) { /* ignore */ }
    location.replace("login.html");
    const ended = new Error("Your session has ended. Please log in again.");
    ended.redirecting = true; // tells the page to stay quiet while we move to the login page
    throw ended;
  }
  if (!res.ok) throw new Error(formatError(data, res.status));
  return data;
}
// Adds a "Map" link to the sidebar on every page.
(function () {
  function addMapLink() {
    var nav = document.getElementById("navlinks");
    if (!nav || nav.querySelector('a[href="map.html"]')) return;
    var ref = nav.querySelector('a[href="lines.html"]') || nav.querySelector("a");
    if (!ref) return;

    var link = ref.cloneNode(true);
    link.setAttribute("href", "map.html");
    link.classList.remove("active");
    link.removeAttribute("aria-current");

    // Replace the label text but keep the icon.
    var walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
    var node, last = null;
    while ((node = walker.nextNode())) { if (node.nodeValue.trim()) last = node; }
    if (last) last.nodeValue = " Map";

    if (/map\.html$/.test(location.pathname)) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    }
    ref.insertAdjacentElement("afterend", link);
  }

  function start() {
    var nav = document.getElementById("navlinks");
    if (!nav) return;
    addMapLink();
    new MutationObserver(addMapLink).observe(nav, { childList: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();