// config.js
// The only place you need to set your API address and the overdue rules.

// When these pages are served by the API itself, the API address is that same server:
//   - on your computer: http://127.0.0.1:8000  (the frontend/ folder, port 8000)
//   - hosted online (e.g. Render): https://your-app.onrender.com  (no port in the address)
// so phones and the installed app work automatically.
// Otherwise (e.g. VS Code Live Server, or opening the file directly) it uses the address below.
const SAME_SERVER = location.protocol.startsWith("http") &&
  (location.port === "8000" || location.port === ""); // "" = normal web address (https, port 443)

const API_URL = SAME_SERVER ? location.origin : "http://127.0.0.1:8000";

// A trap is "due soon" (amber) after this many days without a check ...
const DUE_AFTER_DAYS = 14;
// ... and "overdue" (red) after this many.
const OVERDUE_AFTER_DAYS = 30;