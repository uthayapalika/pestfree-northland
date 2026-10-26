# Pest-Free Tracker (backend)

1. Create an environment and install:  python -m venv .venv
   then activate it and run:  pip install -r requirements.txt
2. Create sample data:  python -m app.seed
3. Start the server:  python -m uvicorn app.main:app --reload
   Open http://127.0.0.1:8000/docs
   The web app is served by the same server at http://127.0.0.1:8000/
   Open the tracker at http://127.0.0.1:8000/admin/login.html

Demo logins:
  coordinator@example.com / Coord1234
  volunteer@example.com   / Volun1234

Run tests:  python -m pytest

The admin pages use the API in `app/` and default to the same origin as the
web app. If you host the frontend separately, set `apiBase` in
`frontend/admin/assets/js/config.js` to the API server's origin.

### Render notification setup

The app's local ntfy topic is only a development fallback. In Render, open the
web service's **Environment** settings and set `NTFY_TOPIC` to a new,
hard-to-guess topic used only by this deployment. Do not reuse the example or
local topic. If publishing to ntfy.sh with an authenticated topic, also set
`NTFY_TOKEN` to the publisher access token; the app sends it as a bearer token.
`NTFY_SERVER` defaults to `https://ntfy.sh` and only needs to be set when using
a different ntfy server.

After changing environment variables, redeploy the service. In the ntfy app,
subscribe to the new topic; the admin **Get alerts** button displays the
configured topic. ntfy.sh may rate-limit unauthenticated publishing from shared
hosting IP addresses, so use an authenticated token or a server you control if
the hosted service continues returning HTTP 429.
