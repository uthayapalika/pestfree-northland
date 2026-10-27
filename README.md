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
Workers can access field checks, assigned tasks, and Sync status; they can
submit checks and catches. Coordinators can assign a trap line or individual
follow-up task to a volunteer or field worker and track task completion. A
worker can optionally configure a private ntfy topic (at least 16 characters)
on the Field tasks page to receive direct assignment and reminder
notifications. Subscribe to the same topic in the ntfy app. The personal topic
is never returned in the public user profile.

Offline checks are queued on the device for the signed-in account and upload
when it reconnects. Failed uploads remain queued. Use **Sync status** to review
the queue, see failed-upload details, and retry. If a device has queued checks
for another account, those checks stay queued until that account signs in.
Older queued checks from before account-specific syncing require confirmation
before upload. Open the Field check page while online at least once so its trap
data and app files are available offline.

The map can search traps and filter by trap line, trap status, or overdue and
attention-needed state. It can center on the device's current location and fit
the visible traps. Browser location access requires HTTPS (or localhost).

Reports include date-range and trap-line/area filters, catches grouped by line
or month, species totals, overdue and never-checked summaries, and maintenance
follow-up. CSV and PDF exports use the selected filters. The Traps, Trap lines,
Catches, and Users tables also include search and category filters.

### Scheduled trap reminders

The daily reminder command checks the latest result for each trap and includes
traps that have never been checked, reached the due or overdue threshold, or
need attention (for example, bait needed, sprung, damaged, missing, or under
maintenance). It sends digest notifications only when there is something to
follow up. Where a trap line has workers with personal ntfy
topics, reminders are sent to those topics; workers without a personal topic
use the deployment's global topic. The digest includes trap codes and trap-line
names, but never GPS coordinates. A worker must subscribe to their private
topic in ntfy to receive direct alerts.

For Render, create a **Cron Job** using the same repository and Python build
setup as the web service. Set its command to `python -m app.reminders`, and
configure the same `DATABASE_URL`, `SECRET_KEY`, `NTFY_TOPIC`, and (if used)
`NTFY_TOKEN` and `NTFY_SERVER` environment variables. Set `DUE_AFTER_DAYS` and
`OVERDUE_AFTER_DAYS` only if you also change the matching thresholds in
`frontend/admin/assets/js/config.js`. Example daily cron schedule: `0 19 * * *`
(Render schedules use UTC; choose the UTC time appropriate for your team).
The cron job exits with an error if the notification cannot be sent, so a failed
run is visible in the Render job logs. Run the command once manually to confirm
the notification topic and database connection before relying on its schedule.

### Audit, imports, and QR labels

The coordinator-only **Audit history** page records who changed traps, users,
catches, tasks, and trap-line assignments, with before-and-after values where
available. Personal notification topic values are never written to the audit
log. The Traps page provides a CSV template and validated import; required
columns are `trap_line` and `trap_type`. Optional columns are `code`,
`general_area`, `exact_lat`, `exact_lng`, `is_sensitive`, and `status`. A trap
code is generated when omitted. Trap lines are matched by name. Imports are
atomic: any row error prevents the
entire batch from being applied. Updating existing traps requires selecting
the explicit update option in the import confirmation.

The existing **QR codes** page prints labels that open the corresponding
field-check form. On mobile, interactive controls have larger touch targets
and visible keyboard focus, and errors are announced in the page for assistive
technology.

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
