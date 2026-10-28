# Pest-Free Tracker user manual

This guide describes features implemented in the application. It does not assume that unimplemented features exist.

## 1. Before you start

### System requirements

- A modern browser: Chrome/Edge, Firefox or Safari
- Internet access for normal use
- An HTTPS website or localhost for PWA installation and geolocation
- A supported account created by an administrator or through public registration

### Access

Local development URL:

```text
http://127.0.0.1:8000/admin/login.html
```

Hosted URL:

```text
https://pestfree-northland.onrender.com/admin/login.html
```

Confirm the hosted URL with the system owner before using it.

### Account types

| Role | Main abilities |
|---|---|
| Volunteer | View permitted trap/line data and map locations, record checks/catches, view relevant catch/check information and tasks. |
| Field worker | Use Field check, assigned Field tasks and Sync status. Backend routing restricts access to broader administrative pages. |
| Coordinator/administrator | Manage trap lines, traps, users, reports, QR codes, inventory, audit history, assignments and notification tests. |

Exact trap coordinates may be hidden. Coordinators can grant a volunteer exact-location access, but ordinary volunteers do not receive this permission automatically.

## 2. Register and sign in

### Register a volunteer account

1. Open the login page.
2. Select the registration option.
3. Enter a name of at least 2 characters.
4. Enter a valid email address.
5. Enter a password of at least 8 characters.
6. Submit the registration form.
7. Sign in with the registered email and password.

Public registration creates a volunteer account. On the hosted Render service, public registration cannot create a coordinator account. Coordinator accounts must be created by a trusted administrator/account in the database or the coordinator user-management page.

**Screenshot placeholder: Registration form**

```text
[INSERT SCREENSHOT: registration form]
```

### Sign in

1. Open the login page.
2. Enter your email and password.
3. Select **Login**.
4. The system opens the Dashboard unless you are a field worker or another frontend route requires a role-specific page.

**Screenshot placeholder: Login page**

```text
[INSERT SCREENSHOT: login page]
```

If login fails:

- Confirm the account and password.
- Check whether the server is running or the hosted service is awake.
- Ask a coordinator to confirm the account has not been removed or changed.

## 3. Dashboard navigation

Use the sidebar to move between pages. On a narrow phone screen, use the menu button to open it.

Ordinary users see common pages according to role; coordinators see additional management pages.

Common navigation includes:

- Dashboard
- Field check
- Field tasks
- Sync status
- Map
- Traps
- Trap lines
- Catches
- Settings

Coordinator-only navigation includes:

- Reports
- QR codes
- Inventory
- Audit history
- Users

**Screenshot placeholder: Dashboard navigation**

```text
[INSERT SCREENSHOT: desktop navigation]
[INSERT SCREENSHOT: mobile menu]
```

### Dashboard summary

The dashboard shows operational totals such as traps, active traps, checks, catches and attention-needed items, subject to account permissions. Coordinators receive an additional team dashboard with worker activity and task status filters for 7 days, 30 days or all time.

## 4. View the map

1. Open **Map**.
2. View trap markers and trap-line context.
3. Tap a marker for trap details.
4. Use the filters to limit displayed traps by line, status or attention state.
5. Grant location access to center the map on the device if needed.
6. If exact locations are unavailable, use trap code/search or QR information instead.

HTTPS or localhost is required for browser location access. If the browser blocks it, use the search/filter controls or enable location permission in browser settings.

**Screenshot placeholder: Map**

```text
[INSERT SCREENSHOT: map with trap markers]
```

## 5. Record a field check

1. Open **Field check**.
2. Search for a trap by code, line or general area.
3. Select a trap from the list.
4. Choose the result:
   - Empty
   - Caught
   - Bait needed
   - Sprung
5. If the catch result is **Caught**, select a species.
6. Add optional notes.
7. Select **Save check**.

For a caught trap, this process creates a catch linked to the check.

**Screenshot placeholder: Field check form**

```text
[INSERT SCREENSHOT: trap selection]
[INSERT SCREENSHOT: check status form]
```

### QR-prefilled field check

A QR code generated from the **QR codes** page contains a URL such as:

```text
check.html?trap=<trap-id>
```

1. Scan the QR code with the device camera or QR scanner.
2. Open the link in the browser while signed in.
3. Confirm that the target trap is preselected.
4. Choose the check result and save.

If the QR code belongs to a trap the account cannot access, the page shows a warning and allows normal trap selection. The QR URL does not reveal exact sensitive coordinates in the link.

**Screenshot placeholder: QR check**

```text
[INSERT SCREENSHOT: QR scan prompt/result]
```

## 6. View checks, catches and maintenance

### Checks and catches

Open **Catches** to view recent catch records and trap context. Coordinators and volunteers can view it; field-worker frontend access is restricted.

Coordinators can edit or delete catch species from the relevant table controls, subject to backend authorization.

Open **Traps**, select a trap's history/details controls and review its last check, status and history where exposed by the interface.

### Maintenance

Coordinators can record maintenance notes for a trap. Maintenance history is available to coordinators and volunteers that can access that route. Notes include the recorded date and user.

## 7. Manage trap lines and traps

These workflows are primarily coordinator workflows.

### Create or edit a trap line

1. Open **Trap lines**.
2. Select **Add** or use the existing row's edit control.
3. Enter a name and general area.
4. Save.

Only coordinators can create, update or delete trap lines.

### Create or edit a trap

1. Open **Traps**.
2. Select **Add trap** or edit an existing trap.
3. Select a trap line.
4. Enter/select the trap type.
5. Enter code if needed. A code can be generated when omitted.
6. Enter general area or use the line area behavior.
7. Set optional exact coordinates and status.
8. Set inspection interval from 1 to 365 days.
9. Save.

Sensitive traps require both exact latitude and longitude. Only coordinators can modify traps. Coordinates may remain hidden from unauthorized accounts.

**Screenshot placeholder: Trap management**

```text
[INSERT SCREENSHOT: trap list]
[INSERT SCREENSHOT: trap form]
```

### Import traps

Coordinators can import trap rows from a CSV-based interface.

1. Open **Traps**.
2. Use **Import CSV**.
3. Select whether existing matching trap codes should be updated.
4. Upload/select the CSV and review the row summary.
5. Correct errors if the import reports rejected rows.

The import uses existing trap-line names and supports code, trap type, area, coordinates, sensitivity, status and inspection interval.

## 8. Reports

Reports are coordinator-only.

1. Open **Reports**.
2. Choose the date range and trap line/area filter where shown.
3. Choose catch grouping by trap line or month.
4. Review catches, species totals, overdue/never-checked summaries and maintenance follow-up.
5. Export filtered CSV or print/save as PDF when needed.

Exports include the trap-line performance summary and filtered trap/catch views implemented in the frontend.

**Screenshot placeholder: Reports**

```text
[INSERT SCREENSHOT: report filters]
[INSERT SCREENSHOT: trap-line performance report]
```

## 9. Field tasks and assignments

### Coordinator assigns work

1. Open **Field tasks**.
2. Select an assignee who is a volunteer or field worker.
3. Select a trap or trap line.
4. Enter a title, optional notes and due date.
5. Assign the task.

The coordinator can assign trap lines and individual tasks. NTFY notifications may be sent when the server has notification configuration.

### Worker completes work

1. Open **Field tasks**.
2. Review tasks assigned to the signed-in account.
3. Open the related trap/page if needed.
4. Mark the task **Completed** after the field work is finished.

Field workers see only tasks assigned to them. Coordinators can see all tasks and assignment status.

### Personal notification topic

A worker may configure a private notification topic in **Field tasks**.

1. Enter a topic with at least 16 characters.
2. Use only letters, numbers, underscores or hyphens.
3. Save the topic.
4. Subscribe to the same topic in the ntfy app.

The server never displays the existing private topic after it is saved.

**Screenshot placeholder: Field tasks**

```text
[INSERT SCREENSHOT: coordinator task assignment]
[INSERT SCREENSHOT: worker task list]
```

## 10. Inventory

Inventory is coordinator-only.

1. Open **Inventory**.
2. Review item quantity, reorder level and reorder status.
3. Select **Add item** to create a bait, equipment, maintenance or other item.
4. Enter name, category, unit, opening quantity and reorder level.
5. Select **Adjust** to add or issue stock.
6. Enter a non-zero whole-number stock change and a reason.

Negative stock is prevented. A positive change restocks; a negative change uses or issues stock.

**Screenshot placeholder: Inventory**

```text
[INSERT SCREENSHOT: inventory page]
[INSERT SCREENSHOT: stock adjustment dialog]
```

## 11. Users and audit history

### Manage users

Only coordinators can open **Users**.

1. Open **Users**.
2. Add a user with a name, email, password and role.
3. Edit role/profile/exact-location permission if needed.
4. Delete a user only if that user has no recorded trap checks.

A coordinator cannot delete the signed-in account or remove the signed-in account's coordinator role.

### Audit history

Open **Audit history** to review changes to traps, users, catches and trap lines. Filter by record type and record ID if needed. The details view shows before/after JSON for available events.

Some records do not have a one-to-one friendly label in the audit page, especially task/assignment events. Audit is a change history, not a complete database backup.

**Screenshot placeholder: User/audit pages**

```text
[INSERT SCREENSHOT: users list]
[INSERT SCREENSHOT: audit details]
```

## 12. Offline use and sync

### What works offline

- The app shell and previously cached pages/scripts can open after a secure visit.
- Previously cached trap and API GET data may be available.
- Previously viewed map tiles can remain cached.
- Field checks can be saved while offline and uploaded later.

Offline mode does not guarantee that every page or every latest record is available. Inventory edits, task changes and live management operations require server access.

### Queue a field check

1. Open Field check.
2. Visit once while online so trap data is available.
3. If the connection is lost, complete a trap check and save.
4. The application stores the check for the signed-in account.
5. Open **Sync status** for queued and recent activity.
6. When online, select **Retry my queued checks**.

The queue is private to the account that created it. The app can block checks queued by another account.

**Screenshot placeholder: Sync status**

```text
[INSERT SCREENSHOT: offline notice]
[INSERT SCREENSHOT: sync queue]
```

If an upload fails, the detail remains visible and may be retried. Fix server/network problems before retrying duplicate-sensitive operations.

## 13. Install the PWA

PWA installation works over HTTPS or localhost.

### Android/Chrome/Edge

1. Open the application in a supporting browser.
2. Open Settings or the address menu.
3. Select **Install app** when offered.
4. If the Settings page shows **Install App**, select it.
5. Confirm the installation.

### iPhone/iPad Safari

1. Open the application in Safari.
2. Tap **Share**.
3. Select **Add to Home Screen**.
4. Confirm and optionally enable the Open as Web App option.
5. Tap Add.

The app includes the **Log a check** PWA shortcut. Installation prompts depend on browser support and hosting security.

**Screenshot placeholder: PWA install**

```text
[INSERT SCREENSHOT: install prompt]
```

## 14. Notifications

### Server/global notifications

Coordinators can send a test alert from Settings. Notifications use an ntfy server/topic when configured. Depending on server configuration, the system may notify about new traps, catches, assignments and reminders.

To receive notifications:

1. Subscribe to the configured ntfy topic in the ntfy app.
2. Keep global topics private when intended for the team only.
3. Do not publish passwords or exact private trap locations in notifications.

Notifications cannot be guaranteed to work until the server topic and network delivery are manually verified.

## 15. Image uploads

No image/photo upload feature is implemented. The app currently supports text notes and QR links only.

## 16. Troubleshooting

| Problem | What to do |
|---|---|
| Login rejected | Confirm email/password and account role. |
| Page is missing | Field-worker accounts only see Field check, Field tasks and Sync status. |
| Map blank or tiles missing | Check internet/browser tile access and refresh. |
| Map location unavailable | Use HTTPS/localhost and allow location permission. |
| Exact locations hidden | Request exact-location permission from a coordinator. |
| QR code opens wrong trap | Verify the QR URL contains the intended trap ID and regenerate it. |
| Offline page is stale | Open it once online after deploying updates. |
| Check is stuck in sync queue | Open Sync status, confirm network access and retry. |
| Duplicate task/trap import | Review existing names/codes; import can skip or reject duplicates. |
| Inventory goes below zero | The system prevents negative stock; reduce a larger adjustment or add stock first. |
| Notification did not arrive | Confirm server topic configuration and topic subscription. |
| PWA install button absent | Use HTTPS, a supported browser and wait for browser install criteria. |
| PDF export not opening | Allow pop-ups for the site and use browser print-to-PDF. |

## 17. Logout and account security

1. Open the sidebar.
2. Select **Log out**.
3. Confirm you are on the login page.

Logout removes the local token and user record and clears the private API cache. Use logout on shared devices.

Security reminders:

- Do not share passwords or tokens.
- Use a unique password.
- Close the browser after using a shared device.
- Keep notification topics private.
- Do not send exact sensitive trap locations through unsafe channels.
- A coordinator can change exact-location permission and account roles, so confirm changes carefully.
