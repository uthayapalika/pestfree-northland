// config.js
// The only place you need to set your API address and the overdue rules.

// When these pages are served by the API itself (the frontend/ folder, port 8000) the
// API address is that same server, so phones and the installed app work automatically.
// Otherwise (e.g. VS Code Live Server) it uses the address below.
const API_URL = (location.protocol.startsWith("http") && location.port === "8000")
  ? location.origin
  : "http://127.0.0.1:8000";

// A trap is "due soon" (amber) after this many days without a check ...
const DUE_AFTER_DAYS = 14;
// ... and "overdue" (red) after this many.
const OVERDUE_AFTER_DAYS = 30;
