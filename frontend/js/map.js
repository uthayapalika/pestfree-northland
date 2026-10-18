// Draws trap pins on a Leaflet map (CARTO basemap, built on OpenStreetMap data).
// Usage: PestMap.render(element, traps, lineId)
(function () {
  var COLOURS = { empty: "#2e7d32", caught: "#c62828", bait_needed: "#ef6c00", sprung: "#616161" };
  var BASE = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/";
  var loading = null;

  function whenInDom(el) {
    return new Promise(function (resolve) {
      var tries = 0;
      (function check() {
        if (el.isConnected || tries++ > 100) resolve();
        else requestAnimationFrame(check);
      })();
    });
  }

  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    if (loading) return loading;
    loading = Promise.all([
      new Promise(function (resolve, reject) {
        var css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = BASE + "leaflet.min.css";
        css.onload = resolve;
        css.onerror = function () { reject(new Error("Could not load map styles")); };
        document.head.appendChild(css);
      }),
      new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = BASE + "leaflet.min.js";
        s.onload = resolve;
        s.onerror = function () { reject(new Error("Could not load the map library")); };
        document.head.appendChild(s);
      })
    ]);
    return loading;
  }

  async function render(el, traps, lineId, height) {
    await whenInDom(el);
    el.style.cssText = "height:" + (height || "420px") + ";width:100%;border-radius:12px;margin:16px 0;background:#e8ece6;";

    var shown = traps.filter(function (t) { return t.exact_lat != null && t.exact_lng != null; });
    var hidden = traps.length - shown.length;

    if (!shown.length) {
      el.style.height = "auto";
      el.style.padding = "16px";
      el.textContent = "No exact locations to show on the map. Add a trap with a latitude and longitude below.";
      return;
    }
    try {
      await loadLeaflet();

      var map = L.map(el).setView([-35.7251, 174.3237], 10);

     L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, TomTom, Intermap, USGS, and others'
      }).addTo(map);

      var points = [];
      shown.forEach(function (t) {
        var point = [Number(t.exact_lat), Number(t.exact_lng)];
        var m = L.circleMarker(point, {
          radius: 10,
          color: "#ffffff",
          weight: 2,
          fillColor: COLOURS[t.last_status] || "#1565c0",
          fillOpacity: 1
        }).addTo(map);

        var box = document.createElement("div");
        var text = document.createElement("div");
        text.textContent = (t._lineName ? t._lineName + " / " : "") + t.code + " (" + t.trap_type + "): " + (t.last_status || "no checks yet");
        var link = document.createElement("a");
        link.href = "trap.html?line=" + (t._lineId || lineId) + "&trap=" + t.id;
        link.textContent = "Open trap";
        box.appendChild(text);
        box.appendChild(link);
        m.bindPopup(box);

        points.push(point);
      });
      map.fitBounds(points, { padding: [30, 30], maxZoom: 15 });
      setTimeout(function () { map.invalidateSize(); }, 200);

      if (hidden > 0) {
        var note = document.createElement("p");
        note.className = "muted";
        note.textContent = hidden + " trap(s) not shown on the map: location hidden or not set.";
        el.insertAdjacentElement("afterend", note);
      }
    } catch (err) {
      el.textContent = "Map error: " + err.message;
    }
  }

  window.PestMap = { render: render };
})();