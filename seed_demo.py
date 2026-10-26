"""seed_demo.py - adds sample Auckland trap lines (suburbs and reserves), traps and catches through your API.

Usage (PowerShell, from your project folder):
    python seed_demo.py https://pestfree-northland.onrender.com you@example.com your-password
    python seed_demo.py https://pestfree-northland.onrender.com you@example.com your-password --reset

 - Without --reset: adds only what is missing, so it is safe to run again.
 - With --reset: first DELETES ALL trap lines, traps and catches, then adds the demo data again.
   Use this only on a demo database, never on real data.

Log in with your coordinator account. Coordinates are approximate and made up for a demo.
NOTE: each new trap and catch sends an ntfy alert, so mute the topic in the ntfy app while seeding (a full first run sends about 50 alerts).
"""
import json
import sys
import urllib.error
import urllib.request

# (code, trap type, latitude, longitude, is_sensitive)
# Sensitive = a trap in a private backyard, so its exact location is hidden from volunteers.
LINES = [
    {
        "name": "Mount Eden Line",
        "general_area": "Mount Eden, Auckland",
        "traps": [
            ("ME-01", "possum",   -36.8752, 174.7631, False),  # reserve near the maunga
            ("ME-02", "rat",      -36.8779, 174.7612, False),
            ("ME-03", "rat",      -36.8801, 174.7589, True),   # private backyard
            ("ME-04", "hedgehog", -36.8788, 174.7662, False),
        ],
    },
    {
        "name": "Epsom Line",
        "general_area": "Epsom, Auckland",
        "traps": [
            ("EP-01", "possum", -36.8962, 174.7803, False),    # edge of Cornwall Park
            ("EP-02", "rat",    -36.8921, 174.7742, True),     # private backyard
            ("EP-03", "mouse",  -36.8903, 174.7721, False),
        ],
    },
    {
        "name": "Mount Roskill Line",
        "general_area": "Mount Roskill, Auckland",
        "traps": [
            ("MR-01", "rat",      -36.9097, 174.7329, False),
            ("MR-02", "possum",   -36.9112, 174.7351, False),
            ("MR-03", "mouse",    -36.9125, 174.7372, True),   # private backyard
            ("MR-04", "hedgehog", -36.9139, 174.7391, False),
        ],
    },
    {
        "name": "Auckland CBD Line",
        "general_area": "Auckland CBD",
        "traps": [
            ("CB-01", "rat",   -36.8512, 174.7685, False),     # Albert Park
            ("CB-02", "rat",   -36.8498, 174.7662, False),
            ("CB-03", "mouse", -36.8461, 174.7611, False),     # laneway
        ],
    },
    {
        "name": "Grey Lynn Line",
        "general_area": "Grey Lynn and Western Springs, Auckland",
        "traps": [
            ("GL-01", "possum", -36.8668, 174.7226, False),    # Western Springs
            ("GL-02", "rat",    -36.8631, 174.7215, False),
            ("GL-03", "rat",    -36.8650, 174.7240, True),     # private backyard
        ],
    },
    # ---------------- More suburbs ----------------
    {
        "name": "Remuera Line",
        "general_area": "Remuera, Auckland",
        "traps": [
            ("RM-01", "rat",    -36.8782, 174.8001, False),
            ("RM-02", "possum", -36.8801, 174.8023, False),
            ("RM-03", "mouse",  -36.8815, 174.7994, True),     # private backyard
        ],
    },
    {
        "name": "Mount Albert Line",
        "general_area": "Mount Albert, Auckland",
        "traps": [
            ("MA-01", "rat",      -36.8884, 174.7152, False),
            ("MA-02", "possum",   -36.8899, 174.7178, False),
            ("MA-03", "hedgehog", -36.8911, 174.7139, False),
        ],
    },
    {
        "name": "Onehunga Line",
        "general_area": "Onehunga, Auckland",
        "traps": [
            ("ON-01", "rat",   -36.9221, 174.7831, False),
            ("ON-02", "mouse", -36.9238, 174.7852, False),
            ("ON-03", "rat",   -36.9250, 174.7819, True),      # private backyard
        ],
    },
    # ---------------- Reserves and parks ----------------
    {
        "name": "Auckland Domain Reserve Line",
        "general_area": "Auckland Domain, Parnell",
        "traps": [
            ("AD-01", "rat",      -36.8598, 174.7762, False),
            ("AD-02", "possum",   -36.8621, 174.7788, False),
            ("AD-03", "stoat",    -36.8634, 174.7751, False),
            ("AD-04", "hedgehog", -36.8587, 174.7791, False),
        ],
    },
    {
        "name": "Cornwall Park Reserve Line",
        "general_area": "Cornwall Park and One Tree Hill",
        "traps": [
            ("CP-01", "possum", -36.8988, 174.7821, False),
            ("CP-02", "rat",    -36.9006, 174.7849, False),
            ("CP-03", "stoat",  -36.9019, 174.7824, False),
            ("CP-04", "mouse",  -36.8973, 174.7858, False),
        ],
    },
    {
        "name": "Wai o Taiki Bush Reserve Line",
        "general_area": "Wai o Taiki Bush Reserve, St Heliers",
        "traps": [
            ("WT-01", "rat",    -36.8498, 174.8658, False),
            ("WT-02", "possum", -36.8512, 174.8674, False),
            ("WT-03", "mouse",  -36.8521, 174.8650, False),
        ],
    },
    {
        "name": "Waitakere Ranges Bush Line",
        "general_area": "Waitakere Ranges Regional Park",
        "traps": [
            ("WR-01", "possum", -36.9246, 174.6038, False),
            ("WR-02", "possum", -36.9271, 174.6064, False),
            ("WR-03", "rat",    -36.9293, 174.6089, False),
            ("WR-04", "stoat",  -36.9312, 174.6012, False),
            ("WR-05", "stoat",  -36.9334, 174.6041, True),     # sensitive: native species habitat
        ],
    },
    {
        "name": "Shakespear Regional Park Line",
        "general_area": "Shakespear Regional Park, Whangaparaoa",
        "traps": [
            ("SP-01", "rat",      -36.6190, 174.8230, False),
            ("SP-02", "stoat",    -36.6213, 174.8255, False),
            ("SP-03", "mouse",    -36.6236, 174.8219, True),   # sensitive: breeding habitat
            ("SP-04", "hedgehog", -36.6168, 174.8271, False),
        ],
    },
    {
        "name": "Tawharanui Sanctuary Line",
        "general_area": "Tawharanui Regional Park",
        "traps": [
            ("TW-01", "stoat",  -36.3735, 174.8330, False),
            ("TW-02", "rat",    -36.3760, 174.8352, False),
            ("TW-03", "mouse",  -36.3781, 174.8318, False),
            ("TW-04", "possum", -36.3799, 174.8347, True),     # sensitive: protected species area
        ],
    },
]

# Catches to record: trap code -> species (only for traps created in this run)
CATCHES = [("ME-01", "possum"), ("ME-02", "rat"), ("EP-01", "possum"), ("MR-01", "rat"),
           ("MR-04", "hedgehog"), ("CB-01", "rat"), ("GL-01", "possum"),
           ("RM-02", "possum"), ("MA-01", "rat"), ("AD-02", "possum"), ("AD-03", "stoat"),
           ("CP-01", "possum"), ("CP-04", "mouse"), ("WT-01", "rat"), ("WR-01", "possum"),
           ("WR-03", "rat"), ("WR-04", "stoat"), ("SP-02", "stoat"), ("TW-02", "rat")]


def call(base, method, path, body=None, token=None):
    """Send one request to the API and return the reply as Python data."""
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(base + path, data=data, headers=headers, method=method)
    try:
        # Long timeout: the free Render service can take ~1 minute to wake up.
        with urllib.request.urlopen(request, timeout=120) as reply:
            text = reply.read().decode()
            return json.loads(text) if text else {}
    except urllib.error.HTTPError as err:
        raise SystemExit(f"{method} {path} failed ({err.code}): {err.read().decode()[:300]}")


def reset_everything(base, token):
    """Delete every trap (its check history and catches go with it) and then every trap line."""
    for line in call(base, "GET", "/trap-lines", token=token):
        for trap in call(base, "GET", f"/trap-lines/{line['id']}/traps", token=token):
            call(base, "DELETE", f"/traps/{trap['id']}", token=token)
        call(base, "DELETE", f"/trap-lines/{line['id']}", token=token)
        print(f"Deleted line: {line['name']}")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    reset = "--reset" in sys.argv
    if len(args) != 3:
        raise SystemExit(__doc__)
    base, email, password = args[0].rstrip("/"), args[1], args[2]

    if reset and input("This DELETES ALL trap lines, traps and catches. Type RESET to continue: ") != "RESET":
        raise SystemExit("Cancelled.")

    print("Logging in (the first request may take a minute if the site is asleep)...")
    token = call(base, "POST", "/auth/login", {"email": email, "password": password})["access_token"]

    if reset:
        reset_everything(base, token)

    existing_lines = {l["name"]: l["id"] for l in call(base, "GET", "/trap-lines", token=token)}
    new_trap_ids = {}  # only traps created in this run get catches (so re-running adds no duplicates)

    for line in LINES:
        line_id = existing_lines.get(line["name"])
        if line_id is None:
            line_id = call(base, "POST", "/trap-lines",
                           {"name": line["name"], "general_area": line["general_area"]}, token)["id"]
            print(f"Trap line: {line['name']}")
        else:
            print(f"Trap line already exists: {line['name']}")

        have = {t["code"] for t in call(base, "GET", f"/trap-lines/{line_id}/traps", token=token)}
        for code, trap_type, lat, lng, sensitive in line["traps"]:
            if code in have:
                continue  # already there, skip
            trap = call(base, "POST", f"/trap-lines/{line_id}/traps", {
                "code": code, "trap_type": trap_type,
                "exact_lat": lat, "exact_lng": lng, "is_sensitive": sensitive,
            }, token)
            new_trap_ids[code] = trap["id"]
            print(f"   trap {code} ({trap_type})" + (" - sensitive" if sensitive else ""))

    for code, species in CATCHES:
        if code in new_trap_ids:
            call(base, "POST", "/catches", {"trap_id": new_trap_ids[code], "species": species}, token)
            print(f"Catch: {species} in {code}")

    print("Done.")


main()
