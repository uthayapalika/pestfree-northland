# PestFree Northland mobile app

Flutter field app for the Pest-Free Tracker API in the supplied production bundle. The mobile client uses the existing FastAPI routes and data contracts; it does not require a separate mobile backend.

## Included field workflows

- Volunteer account registration and bearer-token sign-in.
- Dashboard with trap line, trap, open task and attention-needed summaries.
- Assigned trap lines and searchable traps, with line filters.
- Record empty, caught, bait-needed or sprung checks; caught checks can record possum, rat, stoat, mouse, hedgehog or other.
- Assigned field tasks, with completion and reopen actions.
- **PestFree Neighbor Assist:** request a home visit or supply drop, then follow assignment and completion. Coordinators triage requests, assign volunteers and pick stock; stock movement is recorded when a delivery is completed.
- Accessibility option for larger text throughout the signed-in field app.
- Persistent on-device queue for checks submitted while offline. The queue syncs on a successful data refresh.
- Profile, role display, refresh and sign out.

The server remains the source of truth for account roles, location access, trap data and task assignments. Public registration creates volunteer accounts, matching `/auth/register`.

## Neighbor Assist workflow

An authenticated member can submit a request using a general area or suburb, a short description, an optional phone number and an optional preferred time. The form explicitly discourages entering an exact home address. Coordinators see and assign requests to volunteers or field workers. Supply requests must be assigned an in-stock inventory item and quantity. Completing a delivery atomically deducts that quantity and creates the backend's existing inventory movement record; an insufficient-stock conflict leaves the request open. Request visibility is limited to coordinators, the requester and the assigned volunteer. Audit records omit request descriptions and contact phone numbers.

The Python implementation lives in [neighbor_assist.py](./backend/pestfree-northland-production/app/api/neighbor_assist.py), with the coordinator experience also available in the Flutter app. The backend auto-creates the new table at application startup through its existing SQLAlchemy `create_all` lifecycle.

## Create native project scaffolding

Install Flutter (Dart 3.3 or newer), then from this folder run:

```sh
flutter create --platforms=android,ios .
flutter pub get
flutter run
```

Open this folder in Android Studio or VS Code. Flutter generates the platform runner folders; `lib/` and `pubspec.yaml` here are the app source.
The plain `flutter run` command uses the live Render API by default. Build an Android release APK with `flutter build apk --release`. iOS builds require macOS with Xcode.

## API address

The default API origin is the live Python FastAPI backend at `https://pestfree-northland.onrender.com`. The mobile app is a client of that backend; authentication, permissions, trap records, checks, catches and task state stay in Python and the existing database.

You can override the API origin at build or run time with `--dart-define=API_BASE_URL=...` (no trailing slash):

```sh
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000
```

- Android emulator to a backend on the development computer: `http://10.0.2.2:8000` (set this override when testing against a local backend).
- iOS simulator: `http://127.0.0.1:8000`.
- Physical phone: use the computer's LAN IP, for example `http://192.168.1.20:8000`, and ensure the phone can reach that port.
- Hosted production API: the default above. Render's free service may take a short time to wake from idle before the first request succeeds.

For local HTTP testing, the generated Android runner may need cleartext traffic enabled in `android/app/src/main/AndroidManifest.xml` by setting `android:usesCleartextTraffic="true"` on the `<application>` element. Keep production traffic on HTTPS.

## Run the backend

The Python FastAPI backend is the primary application service. Keep the deployed service and database as the source of truth; the Flutter app does not duplicate backend business logic or store authoritative records. The supplied backend is included in `backend/pestfree-northland-production`. In a separate terminal, start it from that directory using `python -m uvicorn app.main:app --reload`. The API health endpoint is `/health`, and the interactive API reference is `/docs`.

**Deployment order:** deploy the updated Python backend before using Neighbor Assist against Render. This workspace adds `/neighbor-assist/summary` and `/neighbor-assist/requests` routes, but the already-running Render service will not gain them until the changed backend is deployed. The existing health endpoint can still return `{"status":"ok"}` while that feature is not deployed.

If deploying this combined workspace as the Render service's repository, set the Python web service's Root Directory to `backend/pestfree-northland-production` so its existing `requirements.txt`, `app/` package and frontend assets remain the service root. Keep the current persistent database and environment variables. The new request table is created by the backend's existing startup table setup; no seed or database reset is needed.

## Notes

- Access tokens use platform secure storage. The pending check queue is stored locally and tied to the signed-in device; clearing app storage removes queued offline work.
- The app never displays GPS coordinates on the dashboard or trap list. API location permissions continue to be enforced by the backend.
- Coordinator administration (user management, imports, inventory, reports, audit, and trap-line administration) remains available in the existing web admin app. Neighbor Assist triage is available to coordinators in the mobile app.
