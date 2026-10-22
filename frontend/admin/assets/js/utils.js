// utils.js
// Small helpers shared by the pages: dates, overdue status, CSV download, GPS distance.
// Uses DUE_AFTER_DAYS / OVERDUE_AFTER_DAYS from config.js, or 14 / 30 if config.js is an old copy.
const dueDays = () => (typeof DUE_AFTER_DAYS !== "undefined" ? DUE_AFTER_DAYS : 14);
const overdueDays = () => (typeof OVERDUE_AFTER_DAYS !== "undefined" ? OVERDUE_AFTER_DAYS : 30);

// The API sends UTC times without a "Z" - add it so the browser reads them as UTC.
function parseDate(s) {
  if (!s) return null;
  let t = String(s);
  if (!/[zZ]$|[+-]\d\d:?\d\d$/.test(t)) t += "Z";
  const d = new Date(t);
  return isNaN(d) ? null : d;
}
function daysSince(s) {
  const d = parseDate(s);
  return d ? Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000)) : null;
}
function ago(s) {
  const n = daysSince(s);
  return n === null ? "never checked" : n === 0 ? "today" : n === 1 ? "yesterday" : n + " days ago";
}

// Overdue status of one trap (uses last_checked_at from the API).
function trapState(t) {
  const d = daysSince(t.last_checked_at);
  if (d === null) return { key: "never", label: "Never checked", color: "#8b9a93", days: null };
  if (d >= overdueDays()) return { key: "overdue", label: "Overdue", color: "#e5534b", days: d };
  if (d >= dueDays()) return { key: "due", label: "Due soon", color: "#e0a526", days: d };
  return { key: "ok", label: "Up to date", color: "#3fb27f", days: d };
}
// The last check said the trap needs bait or has sprung.
const needsAttention = (t) => t.last_status === "bait_needed" || t.last_status === "sprung";

// Small coloured pill, e.g. "Overdue · 41d".
function stateBadge(t) {
  const s = trapState(t);
  return `<span class="badge" style="background:${s.color};color:#08110f">${s.label}${s.days != null ? " · " + s.days + "d" : ""}</span>`;
}

// Download rows (array of objects) as a CSV file that opens correctly in Excel.
function downloadCSV(filename, rows, columns) {
  columns = columns || Object.keys(rows[0] || {});
  const cell = (v) => {
    if (v == null) return "";
    let s = String(v);
    // Stop text that starts with = + - @ from running as a spreadsheet formula (numbers are fine).
    if (typeof v === "string" && /^[=+\-@]/.test(s) && isNaN(Number(s))) s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const text = [columns.join(","), ...rows.map((r) => columns.map((c) => cell(r[c])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["\ufeff" + text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Distance in metres between two GPS points.
function distanceM(lat1, lon1, lat2, lon2) {
  const rad = Math.PI / 180, dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}
const fmtDist = (m) => (m < 1000 ? Math.round(m) + " m" : (m / 1000).toFixed(1) + " km");
