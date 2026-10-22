from pathlib import Path

boot = (
    '  <script>!function(){var t=localStorage.getItem("pfn-theme")||"dark";'
    'document.documentElement.setAttribute("data-theme",t);'
    'document.documentElement.setAttribute("data-bs-theme",t);}();</script>\n'
)
skip = {"login.html", "register.html"}
admin = Path(r"C:\Users\uthay\OneDrive\Documents\pestfree_northland\frontend\admin")
for p in admin.glob("*.html"):
    if p.name in skip:
        continue
    t = p.read_text(encoding="utf-8")
    t = t.replace('<html lang="en" data-bs-theme="dark">', '<html lang="en">')
    if "pfn-theme" not in t:
        t = t.replace('<meta charset="utf-8">\n', '<meta charset="utf-8">\n' + boot)
    if "assets/js/theme.js" not in t:
        t = t.replace("</head>", '  <script src="assets/js/theme.js"></script>\n</head>')
    p.write_text(t, encoding="utf-8")
    print("updated", p.name)
