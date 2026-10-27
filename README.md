# Pest-Free Tracker

1. Create and activate an environment: `python -m venv .venv`
2. Install dependencies: `pip install -r requirements.txt`
3. For **local development only**, create sample data with `python -m app.seed`.
   **This command deletes all data in the configured database. Never run it on
   the hosted/production database.**
4. Start the server: `python -m uvicorn app.main:app --reload`
5. Open `http://127.0.0.1:8000/admin/login.html`; API docs are at
   `http://127.0.0.1:8000/docs`.

Run tests with `python -m pytest`.

The database entity-relationship diagram is in [docs/erd.md](docs/erd.md).

Use a unique `SECRET_KEY` and a persistent PostgreSQL database for a hosted
deployment. Set `DATABASE_URL` and `SECRET_KEY` in the hosting provider's
environment settings; never commit them. SQLite is intended for local use.
Public registration is enabled locally and disabled by default on Render. To
enable volunteer self-registration on Render, set `PUBLIC_REGISTRATION_ENABLED`
to `true`; hosted public sign-up cannot create coordinator accounts. Create an
initial coordinator from a trusted shell connected to the configured database:
`python -m app.create_coordinator --name "Coordinator Name" --email "name@example.com`.
The command prompts for the password without putting it in shell history.

### Backup and recovery

For local SQLite databases, create a consistent snapshot with:

```powershell
python -m app.backup create --output "C:\secure-backups\pestfree.db"
```

Keep backups outside the repository, restrict access because they contain
personal and exact-location data, and periodically test a recovery on a copy:

```powershell
python -m app.backup restore --input "C:\secure-backups\pestfree.db"
```

Restore asks for confirmation and creates a timestamped pre-restore copy before
replacing the configured SQLite database. Stop the app before restoring. This
utility supports file-based SQLite only.

For Render PostgreSQL, use the database service's **Recovery** page. Paid
PostgreSQL instances provide point-in-time recovery (currently 3 days on Hobby
and 7 days on Pro or higher); free instances do not. Trigger recovery to a new
database, validate the restored data, and only then update the web service's
`DATABASE_URL`. Do not restore an export over a database containing important
data. Create and download logical exports periodically for long-term retention;
Render retains exports for 7 days. For free databases, use `pg_dump` from a
trusted machine or a scheduled backup job that stores encrypted backups in
separate storage. Follow the [Render PostgreSQL backup and recovery guide](https://render.com/docs/postgresql-backups)
for current steps and restore commands.

The admin pages use the API in `app/` and default to the same origin as the
web app. If you host the frontend separately, set `apiBase` in
`frontend/admin/assets/js/config.js` to the API server's origin.

### Trap status and maintenance

Coordinators can set a trap's status to **Active**, **Needs bait**, **Damaged**,
**Missing**, or **Under maintenance** from the Traps page. They can also add
dated maintenance notes; coordinators and volunteers can view those records.
On startup, the app adds the status column to an existing traps table and
creates the maintenance log table without removing existing trap data.

### Field Worker accounts and offline checks

Coordinators can create **Field Worker** accounts from the Users page. Field
Workers are directed to the Field check page and cannot access the other admin
pages; they can submit checks and catches. Offline checks are queued on the
device for the signed-in account and upload when it reconnects. If a device has
queued checks for another account, those checks stay queued until that account
signs in. Older queued checks from before account-specific syncing require
confirmation before upload. Open the Field check page while online at least
once so its trap data and app files are available offline.

The map can search traps and filter by trap line, trap status, or overdue and
attention-needed state. It can center on the device's current location and fit
the visible traps. Browser location access requires HTTPS (or localhost).

Reports include date-range and trap-line/area filters, catches grouped by line
or month, species totals, overdue and never-checked summaries, and maintenance
follow-up. CSV and PDF exports use the selected filters. The Traps, Trap lines,
Catches, and Users tables also include search and category filters.

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
