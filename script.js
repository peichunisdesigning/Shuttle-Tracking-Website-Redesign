  const TAB_TITLES = {
    home: 'Shuttle Tracker',
    map: 'Live Map',
    routes: 'Routes',
    schedule: 'Schedule',
    alerts: 'Alerts'
  };
  const ROUTE_TITLES = {
    'tempe-poly': 'Tempe ⇄ Polytechnic',
    'tempe-downtown': 'Tempe ⇄ Downtown',
    'tempe-west': 'Tempe ⇄ West'
  };
  let currentTab = 'home';
  let lastTab = 'home';

  function goTab(tab) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById('page-' + tab).classList.remove('hidden');
    document.querySelectorAll('.primary-switch-btn, .more-item').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.getElementById('headerTitle').textContent = TAB_TITLES[tab];
    document.getElementById('backBtn').style.display = 'none';
    document.getElementById('headerMark').style.display = 'flex';
    currentTab = tab;
    lastTab = tab;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function goRoute(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById('page-route-detail').classList.remove('hidden');
    document.getElementById('headerTitle').textContent = ROUTE_TITLES[id] || 'Route';
    document.getElementById('backBtn').style.display = 'flex';
    document.getElementById('headerMark').style.display = 'none';
    document.querySelectorAll('.primary-switch-btn, .more-item').forEach(t => t.classList.remove('active'));
    currentTab = 'route-detail';
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  document.getElementById('backBtn').addEventListener('click', () => goTab(lastTab));

  function openMore() { document.getElementById('moreMenu').classList.add('open'); }
  function closeMore() { document.getElementById('moreMenu').classList.remove('open'); }
  document.getElementById('moreBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('moreMenu').classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#moreMenu') && !e.target.closest('#moreBtn')) closeMore();
  });

  function toggleSheet() {
    document.getElementById('mapSheet').classList.toggle('collapsed');
  }

  let map;
  let mapMarkers = {};
  const STOPS = {
    'forest-lemon':   { name: 'Forest & Lemon',          address: '901 S Forest Ave, Tempe, AZ 85281' },
    'univ-rural':     { name: 'Univ Dr & Rural Rd',       address: 'University Dr & Rural Rd, Tempe, AZ 85281' },
    'simulator':      { name: 'Simulator Building',        address: 'Simulator Building, Mesa, AZ 85212' },
    'parking-lot-37': { name: 'Parking Lot 37',           address: 'Parking Lot 37, Mesa, AZ 85212' },
    'central-polk':   { name: 'Central Ave & Polk St',    address: 'Central Ave & Polk St, Phoenix, AZ 85004' },
    'univ-way-n':     { name: 'University Way N',          address: 'University Way N, Phoenix, AZ 85004' },
    'univ-way-west':  { name: 'University Way N',          address: 'University Way N, Glendale, AZ 85306' }
  };
  function openStopDetail(id) {
    const s = STOPS[id]; if (!s) return;
    document.getElementById('sheetStopName').textContent = s.name;
    document.getElementById('sheetStopAddress').textContent = s.address;
    document.getElementById('gmapsLink').href = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(s.address);
    document.getElementById('mapSheet').classList.remove('collapsed');
    Object.values(mapMarkers).forEach(el => el.classList.remove('selected'));
    if (mapMarkers[id]) mapMarkers[id].classList.add('selected');
    if (map && STOP_LNGLAT[id]) map.flyTo({ center: STOP_LNGLAT[id], zoom: 15, duration: 600 });
  }
  function copyAddress() {
    const addr = document.getElementById('sheetStopAddress').textContent;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(addr).then(() => {
        const lbl = document.getElementById('copyBtnLabel');
        const orig = 'Copy address';
        lbl.textContent = '✓ Copied!';
        toast('📋 Address copied to clipboard');
        setTimeout(() => { lbl.textContent = orig; }, 2000);
      });
    } else {
      toast('📋 ' + addr);
    }
  }

  let notified = false;
  function toggleNotify() {
    notified = !notified;
    const btn = document.getElementById('notifyBtn');
    const lbl = document.getElementById('notifyLabel');
    if (notified) {
      btn.classList.add('active');
      lbl.textContent = '✓ Alert set — we’ll notify you';
      toast('🔔 Alert set for 5 min before arrival');
    } else {
      btn.classList.remove('active');
      lbl.textContent = 'Notify 5 min before arrival';
    }
  }

  let toastTimer;
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
  }

  // Refresh button
  let elapsed = 12;
  function updateStamp() {
    document.getElementById('lastUpdated').textContent = elapsed + 's ago';
  }
  setInterval(() => { elapsed++; updateStamp(); }, 1000);
  document.getElementById('refreshBtn').addEventListener('click', () => {
    const btn = document.getElementById('refreshBtn');
    btn.classList.add('spinning');
    setTimeout(() => {
      btn.classList.remove('spinning');
      btn.style.transform = '';
      elapsed = 0;
      updateStamp();
      // Tick down ETA
      const eta = document.getElementById('etaNum');
      if (eta) {
        const n = Math.max(0, parseInt(eta.textContent) - 1);
        eta.textContent = n;
      }
    }, 600);
  });

  // ─── Schedule data: routes serving each stop ───
  const STOP_SCHEDULES = {
    'forest-lemon': {
      name: 'Forest & Lemon',
      routes: [
        { name: 'Tempe ⇄ Polytechnic', color: 'var(--maroon-700)', interval: 'Every 15 min',
          times: ['7:00','7:15','7:30','7:45','8:00','8:15','8:30','8:45','9:00','9:15','9:30','9:45','10:00'] },
        { name: 'Tempe ⇄ Downtown', color: 'var(--campus-downtown)', interval: 'Every 15 min',
          times: ['7:00','7:15','7:30','7:45','8:00','8:15','8:30','8:45','9:00','9:15','9:30','9:45','10:00'] },
        { name: 'Tempe ⇄ West', color: 'var(--campus-west)', interval: 'Every 15 min',
          times: ['7:00','7:15','7:30','7:45','8:00','8:15','8:30','8:45','9:00','9:15','9:30','9:45','10:00'] }
      ]
    },
    'univ-rural': {
      name: 'Univ Dr & Rural Rd',
      routes: [
        { name: 'Tempe ⇄ Polytechnic', color: 'var(--maroon-700)', interval: 'Every 15 min',
          times: ['7:05','7:20','7:35','7:50','8:05','8:20','8:35','8:50','9:05','9:20','9:35','9:50','10:05'] }
      ]
    },
    'simulator': {
      name: 'Simulator Building',
      routes: [
        { name: 'Tempe ⇄ Polytechnic', color: 'var(--maroon-700)', interval: 'Every 15 min',
          times: ['7:20','7:35','7:50','8:05','8:20','8:35','8:50','9:05','9:20','9:35','9:50','10:05','10:20'] }
      ]
    },
    'parking-lot-37': {
      name: 'Parking Lot 37',
      routes: [
        { name: 'Tempe ⇄ Polytechnic', color: 'var(--maroon-700)', interval: 'Every 15 min',
          times: ['7:30','7:45','8:00','8:15','8:30','8:45','9:00','9:15','9:30','9:45','10:00','10:15','10:30'] }
      ]
    },
    'central-polk': {
      name: 'Central Ave & Polk St',
      routes: [
        { name: 'Tempe ⇄ Downtown', color: 'var(--campus-downtown)', interval: 'Every 15 min',
          times: ['7:20','7:35','7:50','8:05','8:20','8:35','8:50','9:05','9:20','9:35','9:50','10:05','10:20'] }
      ]
    },
    'univ-way-n': {
      name: 'University Way N (Downtown)',
      routes: [
        { name: 'Tempe ⇄ Downtown', color: 'var(--campus-downtown)', interval: 'Every 15 min',
          times: ['7:30','7:45','8:00','8:15','8:30','8:45','9:00','9:15','9:30','9:45','10:00','10:15','10:30'] }
      ]
    },
    'univ-way-west': {
      name: 'University Way N (West)',
      routes: [
        { name: 'Tempe ⇄ West', color: 'var(--campus-west)', interval: 'Every 15 min',
          times: ['7:30','7:45','8:00','8:15','8:30','8:45','9:00','9:15','9:30','9:45','10:00','10:15','10:30'] }
      ]
    }
  };

  // Pretend "now" = 8:55 — anything earlier is passed, the next is highlighted
  function timeToMin(t) { const [h,m] = t.split(':').map(Number); return h*60+m; }
  const NOW_MIN = 8*60 + 55;

  function renderSchedule() {
    const sel = document.getElementById('stopSelect');
    if (!sel) return;
    const stop = STOP_SCHEDULES[sel.value];
    const container = document.getElementById('scheduleContent');
    if (!stop) return;

    let html = `<div style="font-size:13px;color:var(--ink-700);margin-bottom:14px"><strong style="color:var(--ink-900)">${stop.routes.length} routes</strong> pass through this stop today</div>`;

    stop.routes.forEach(r => {
      let nextFound = false;
      const cells = r.times.map(t => {
        const m = timeToMin(t);
        if (m < NOW_MIN) return `<div class="time-cell passed">${t}</div>`;
        if (!nextFound) { nextFound = true; return `<div class="time-cell next">${t}</div>`; }
        return `<div class="time-cell">${t}</div>`;
      }).join('');

      html += `
        <h3 class="section-title" style="margin-top:18px">${r.name}</h3>
        <div class="schedule-card">
          <div class="schedule-head" style="background:${r.color}">
            <div class="schedule-head-name">Departures from ${stop.name}</div>
            <div class="schedule-head-meta">${r.interval.toUpperCase()}</div>
          </div>
          <div class="schedule-times">${cells}</div>
        </div>`;
    });

    container.innerHTML = html;
  }
  renderSchedule();

  // ── Mapbox GL JS ──
  mapboxgl.accessToken = 'pk.eyJ1Ijoia2ltYmVybHljaGVucXEiLCJhIjoiY21vdG56YnprMDB2MjJxcHhnemwyNDFiZSJ9.eTNCp4m9rcyam4XPoSgCgA';

  const STOP_LNGLAT = {
    'forest-lemon':   [-111.9372, 33.4175],
    'univ-rural':     [-111.9269, 33.4229],
    'simulator':      [-111.6758, 33.3057],
    'parking-lot-37': [-111.6741, 33.3042],
    'central-polk':   [-112.0740, 33.4483],
    'univ-way-n':     [-112.0700, 33.4538],
    'univ-way-west':  [-112.1539, 33.6064]
  };

  const mapContainer = document.getElementById('mapbox-map');
  mapContainer.innerHTML = '';

  map = new mapboxgl.Map({
    container: 'mapbox-map',
    style: 'mapbox://styles/kimberlychenqq/cmotczmr9000701r98hef51xd',
    center: [-111.9281, 33.4242],
    zoom: 13,
    attributionControl: false
  });

  map.on('load', () => {
    // ===== 配色（從 CSS 變數讀取）=====
    const root = getComputedStyle(document.documentElement);
    const campusColors = {
      'Tempe Campus':            root.getPropertyValue('--campus-tempe').trim(),
      'Polytechnic Campus':      root.getPropertyValue('--campus-poly').trim(),
      'Downtown Phoenix Campus': root.getPropertyValue('--campus-downtown').trim(),
      'West Campus':             root.getPropertyValue('--campus-west').trim()
    };
    const stopColors = {
      'Tempe':            root.getPropertyValue('--campus-tempe').trim(),
      'Polytechnic':      root.getPropertyValue('--campus-poly').trim(),
      'Downtown Phoenix': root.getPropertyValue('--campus-downtown').trim(),
      'West':             root.getPropertyValue('--campus-west').trim()
    };

    // ===== 1. GeoJSON 資料 =====
    const campusData = {
      "type": "FeatureCollection",
      "features": [
        // ── Campus Polygons ──
        {
          "type": "Feature",
          "properties": { "name": "Tempe Campus" },
          "geometry": {
            "type": "Polygon",
            "coordinates": [[
              [-111.9420, 33.4140], [-111.9420, 33.4275],
              [-111.9230, 33.4275], [-111.9230, 33.4140],
              [-111.9420, 33.4140]
            ]]
          }
        },
        {
          "type": "Feature",
          "properties": { "name": "Polytechnic Campus" },
          "geometry": {
            "type": "Polygon",
            "coordinates": [[
              [-111.6860, 33.2985], [-111.6860, 33.3110],
              [-111.6650, 33.3110], [-111.6650, 33.2985],
              [-111.6860, 33.2985]
            ]]
          }
        },
        {
          "type": "Feature",
          "properties": { "name": "Downtown Phoenix Campus" },
          "geometry": {
            "type": "Polygon",
            "coordinates": [[
              [-112.0790, 33.4480], [-112.0790, 33.4590],
              [-112.0640, 33.4590], [-112.0640, 33.4480],
              [-112.0790, 33.4480]
            ]]
          }
        },
        {
          "type": "Feature",
          "properties": { "name": "West Campus" },
          "geometry": {
            "type": "Polygon",
            "coordinates": [[
              [-112.1660, 33.6010], [-112.1660, 33.6130],
              [-112.1430, 33.6130], [-112.1430, 33.6010],
              [-112.1660, 33.6010]
            ]]
          }
        },
        // ── Stop Points ──
        {
          "type": "Feature",
          "properties": { "name": "Forest & Lemon", "campus": "Tempe" },
          "geometry": { "type": "Point", "coordinates": [-111.9372, 33.4175] }
        },
        {
          "type": "Feature",
          "properties": { "name": "Univ Dr & Rural Rd", "campus": "Tempe" },
          "geometry": { "type": "Point", "coordinates": [-111.9269, 33.4229] }
        },
        {
          "type": "Feature",
          "properties": { "name": "Simulator Building", "campus": "Polytechnic" },
          "geometry": { "type": "Point", "coordinates": [-111.6758, 33.3057] }
        },
        {
          "type": "Feature",
          "properties": { "name": "Parking Lot 37", "campus": "Polytechnic" },
          "geometry": { "type": "Point", "coordinates": [-111.6741, 33.3042] }
        },
        {
          "type": "Feature",
          "properties": { "name": "Central Ave & Polk St", "campus": "Downtown Phoenix" },
          "geometry": { "type": "Point", "coordinates": [-112.0740, 33.4483] }
        },
        {
          "type": "Feature",
          "properties": { "name": "University Way N", "campus": "Downtown Phoenix" },
          "geometry": { "type": "Point", "coordinates": [-112.0700, 33.4538] }
        },
        {
          "type": "Feature",
          "properties": { "name": "University Way N", "campus": "West" },
          "geometry": { "type": "Point", "coordinates": [-112.1539, 33.6064] }
        }
      ]
    };

    // ===== 2. 拆出 polygon 和 stops =====
    const polygons = {
      type: "FeatureCollection",
      features: campusData.features.filter(f => f.geometry.type === "Polygon")
    };
    const geoStops = campusData.features.filter(f => f.geometry.type === "Point");

    // ===== 3. 畫 campus 範圍 =====
    map.addSource('campus', { type: 'geojson', data: polygons });

    map.addLayer({
      id: 'campus-fill',
      type: 'fill',
      source: 'campus',
      paint: {
        'fill-color': [
          'match', ['get', 'name'],
          'Tempe Campus',            campusColors['Tempe Campus'],
          'Polytechnic Campus',      campusColors['Polytechnic Campus'],
          'Downtown Phoenix Campus', campusColors['Downtown Phoenix Campus'],
          'West Campus',             campusColors['West Campus'],
          '#999999'
        ],
        'fill-opacity': 0.12
      }
    });

    map.addLayer({
      id: 'campus-outline',
      type: 'line',
      source: 'campus',
      paint: {
        'line-color': [
          'match', ['get', 'name'],
          'Tempe Campus',            campusColors['Tempe Campus'],
          'Polytechnic Campus',      campusColors['Polytechnic Campus'],
          'Downtown Phoenix Campus', campusColors['Downtown Phoenix Campus'],
          'West Campus',             campusColors['West Campus'],
          '#999999'
        ],
        'line-width': 1.5,
        'line-opacity': 0.5
      }
    });

    // ===== 4. 加站牌 pin（顏色根據 campus 變化）=====
    geoStops.forEach(stop => {
      const color = stopColors[stop.properties.campus] || '#666';
      const el = document.createElement('div');
      el.style.cssText = `width:16px;height:16px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.2);cursor:pointer;`;
      new mapboxgl.Marker(el)
        .setLngLat(stop.geometry.coordinates)
        .setPopup(new mapboxgl.Popup({ offset: 12 }).setHTML(`<strong>${stop.properties.name}</strong>`))
        .addTo(map);
    });

    // Stop markers
    Object.entries(STOP_LNGLAT).forEach(([id]) => {
      const isMain = id === 'forest-lemon';
      const el = document.createElement('button');
      el.className = 'map-pin';
      el.style.cssText = 'position:static;transform:none;';
      el.innerHTML = isMain
        ? `<div class="map-pin-dot gold" style="width:32px;height:32px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg></div>`
        : `<div class="map-pin-dot"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="6"/></svg></div>`;
      el.addEventListener('click', () => openStopDetail(id));
      mapMarkers[id] = el;
      new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat(STOP_LNGLAT[id])
        .addTo(map);
    });

    // Animated bus marker
    const busEl = document.createElement('div');
    busEl.id = 'busMarker';
    busEl.className = 'map-bus';
    busEl.style.cssText = 'position:static;transform:none;';
    busEl.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="14" rx="2"/><path d="M4 11h16M7 17v2M17 17v2"/></svg>`;

    const busMapMarker = new mapboxgl.Marker({ element: busEl, anchor: 'center' })
      .setLngLat([-111.9372, 33.4175])
      .addTo(map);

    const busRoute = [
      [-111.9372, 33.4175],
      [-111.9320, 33.4163],
      [-111.9240, 33.4148],
      [-111.9150, 33.4141],
      [-111.9073, 33.4138]
    ];
    let busIdx = 0;
    setInterval(() => {
      busIdx = (busIdx + 1) % busRoute.length;
      busMapMarker.setLngLat(busRoute[busIdx]);
    }, 2000);
  });

  // Map control buttons
  document.querySelector('.map-ctrl-btn[aria-label="Zoom in"]').onclick = () => map.zoomIn();
  document.querySelector('.map-ctrl-btn[aria-label="Zoom out"]').onclick = () => map.zoomOut();
  document.querySelector('.map-ctrl-btn[aria-label="Recenter"]').onclick = () => {
    map.flyTo({ center: [-111.9281, 33.4242], zoom: 13 });
    toast('📍 Centered on campus');
  };

  // Resize map when switching to map tab
  document.querySelector('[data-tab="map"]').addEventListener('click', () => {
    setTimeout(() => map.resize(), 100);
  });
