# 🚆 Swiss Rail Live Pulse

> **A Proof-of-Concept Real-time Transport Dashboard & Vector Visualizer**
> Built as a targeted portfolio project for [Trafit](https://www.trafit.ch) to showcase domain-specific interest in public transport software (`railOscope` & `OnTime`).

---

## 📌 Overview

**Swiss Rail Live Pulse** is a full-stack web application that fetches, processes, and visualizes real-time Swiss public transport (SBB) data — live, without any proprietary API keys.

The project is structured around two main views:

| View | What you see |
|------|-------------|
| **Abfahrten** (Departures) | Live departure board for any SBB station, color-coded by punctuality. Filter by delay threshold or train category in real time using MobX. |
| **Verbindungen** (Route Finder) | Enter any origin and destination → see all available connections, an interactive MapLibre map with the route drawn on it, a live-animated train position updated every 5 seconds, and a D3.js bar chart showing the delay profile at each stop along the route. |

---

## 🛠️ Tech Stack

| Layer     | Technology |
| --------- | ---------- |
| Frontend  | React 18, MobX 6, D3.js v7, MapLibre GL JS v4, Vite, CSS Modules |
| Backend   | Node.js 20, Express 4, node-cron |
| Database  | MongoDB 7 (via Mongoose) — optional; app runs without it |
| Data API  | [transport.opendata.ch](https://transport.opendata.ch) (public, no key required) |
| Map Style | CARTO Positron (free, no API key) |
| DevOps    | Docker, Docker Compose, multi-stage Dockerfile |

---

## ✨ What You Can Do

### Tab 1 — Abfahrten (Live Departure Board)

- See **live departures** from Zürich HB (or any 7-digit SBB station ID) — data refreshes every 30 seconds via MobX polling.
- **Filter by delay**: chips for 0 / 3 / 5 / 10 minutes; the table updates instantly, no reload.
- **Filter by train category**: IC, IR, S, RE, etc.
- **Color-coded status**: green = on time (< 3 min, matching the official SBB threshold), orange = minor delay (3–9 min), red = major delay (≥ 10 min).
- **KPI header**: shows total trains watched, average delay, and percentage on time — all computed by MobX and re-calculated on every data refresh.

### Tab 2 — Verbindungen (Route Finder + Map)

- Type any **origin and destination** (e.g. "Zürich HB" → "Bern") or click a quick-pick chip.
- Up to 4 connections are returned with departure/arrival times, total duration, train type, and delay status.
- **Click a connection card** to:
  - Draw the **route on the map** — a GeoJSON LineString rendered via MapLibre GL.
  - See the **split-color route line**: green = portion the train has already traveled, blue = portion still ahead. The split point updates every 5 seconds.
  - Watch the **live train position** — a pulsing dot that moves smoothly along the route using linear interpolation between SBB timetable timestamps.
  - See all **intermediate stations** as small dots on the map, with the origin and destination marked as larger pins.
  - The map **auto-fits** to the route bounds with a smooth animation.
- **D3.js delay chart** appears below the search panel showing delay in minutes at each stop along the route — bars are green / orange / red by the same thresholds used everywhere in the app. This is directly inspired by how Trafit's OnTime product visualizes punctuality across a journey.

---

## 🗂️ Project Structure

```
swiss-rail-live-pulse/
├── client/                              # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Header.jsx           # KPI bar (total trains, avg delay, % on time)
│   │   │   │   └── Sidebar.jsx          # Delay + category filters
│   │   │   ├── map/
│   │   │   │   ├── Map.jsx              # MapLibre GL wrapper (ResizeObserver, StrictMode-safe)
│   │   │   │   ├── MapRoute.jsx         # GeoJSON LineString layer
│   │   │   │   ├── MapMarker.jsx        # Station dot + animated train position marker
│   │   │   │   ├── MapControls.jsx      # Zoom / compass controls
│   │   │   │   └── MapContext.js        # React context sharing the map instance
│   │   │   ├── DepartureBoard.jsx       # Live departure table
│   │   │   ├── ConnectionSearch.jsx     # Origin / destination form + quick picks
│   │   │   ├── RoutePanel.jsx           # Route finder view (map + cards + chart)
│   │   │   └── DelayChart.jsx           # D3.js bar chart — delay per stop
│   │   ├── stores/
│   │   │   ├── TrainStore.js            # MobX store — departures, polling, filters
│   │   │   └── ConnectionStore.js       # MobX store — connections, train position, progress
│   │   ├── services/
│   │   │   └── api.js                   # Typed fetch wrappers
│   │   ├── utils/
│   │   │   └── interpolatePosition.js   # Train position math + route progress split
│   │   ├── App.jsx                      # Tab navigation (Abfahrten / Verbindungen)
│   │   └── index.css                    # Design tokens (light-mode CSS custom properties)
│   ├── nginx.conf
│   ├── vite.config.js
│   └── Dockerfile
│
├── server/                              # Node.js + Express backend
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js              # Mongoose — graceful start without MongoDB
│   │   ├── models/
│   │   │   └── DelayEvent.js            # MongoDB schema for historical snapshots
│   │   ├── services/
│   │   │   ├── sbbApiService.js         # transport.opendata.ch client + normalizers
│   │   │   └── delayTrackerService.js   # Cron job — snapshot every 2 minutes
│   │   ├── controllers/
│   │   │   ├── trainController.js       # Departures + station search
│   │   │   ├── connectionController.js  # Route finder
│   │   │   └── analyticsController.js  # Delay aggregation (requires MongoDB)
│   │   ├── routes/
│   │   │   ├── trains.js
│   │   │   ├── connections.js
│   │   │   └── analytics.js
│   │   └── app.js
│   └── Dockerfile
│
└── docker-compose.yml
```

---

## 🚀 Quick Start (Docker)

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

```bash
# 1. Clone
git clone https://github.com/NasaboyZ/swiss-rail-live-pulse.git
cd swiss-rail-live-pulse

# 2. Start everything (frontend + backend + MongoDB)
docker compose up --build

# 3. Open the app
open http://localhost:3000
```

---

## 💻 Local Development (without Docker)

> MongoDB is **optional** — the app starts and the departure board + route finder work without it. Only the historical analytics endpoints require a running MongoDB.

```bash
# Terminal 1 — backend
cd server
npm install
npm run dev          # http://localhost:3001

# Terminal 2 — frontend
cd client
npm install
npm run dev          # http://localhost:3000
```

The Vite dev server proxies `/api/*` to `localhost:3001` — no CORS setup needed.

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health + MongoDB connection state |
| GET | `/api/trains/departures?stationId=8503000&limit=40` | Live departure board |
| GET | `/api/trains/search?q=Bern` | Station search by name |
| GET | `/api/connections?from=Zürich HB&to=Bern&limit=4` | Route finder — returns connections with full stop coordinates |
| GET | `/api/analytics/delays?hours=24` | Hourly delay aggregation (requires MongoDB) |
| GET | `/api/analytics/top-delayed?limit=10` | Most delayed lines in last 24 h (requires MongoDB) |

---

## 🗺️ Roadmap

| Step | Status | Description |
|------|--------|-------------|
| 1 | ✅ Done | Backend API, live departure board, MobX polling store, reactive filters |
| 2 | ✅ Done | Route finder, MapLibre GL map, animated live train position, D3 delay chart per stop |
| 3 | 🔜 Next | Historical analytics dashboard — D3 line chart of delay trends from MongoDB |
| 4 | 🔜 Next | Responsive layout, additional stations, deployment notes |

---

## 🧠 Key Concepts Explained

### Train Position Interpolation

The live train dot is not fetched from any real-time GPS feed — there is none in the public SBB API. Instead, the position is computed mathematically:

1. The connections API returns a list of stops with scheduled **Unix timestamps** (seconds).
2. `interpolatePosition(route, Date.now())` finds the segment the train is currently in (departure timestamp of stop N ≤ now ≤ arrival timestamp of stop N+1).
3. It calculates a progress value `t ∈ [0, 1]` and linearly interpolates lat/lng between the two stops.
4. The result updates every 5 seconds via a `setInterval` in `ConnectionStore`.

This is the same principle used in rail visualization tools like Trafit's `railOscope`.

### Route Progress Split (Green / Blue Line)

`getRouteProgress(route, now)` splits the route into two coordinate arrays at the train's current position:

- **Green** — stops where `departureTimestamp ≤ now` (already passed), ending at the train position.
- **Blue** — the train position plus all future stops.

Two separate `MapRoute` components render these as independent MapLibre GL `LineString` layers, so the color boundary tracks the train in real time.

### Why MobX?

Both the departure board and the route finder have multiple independent consumers of the same state (header KPIs, the table, the map, the chart). MobX's observable graph propagates changes to every `observer()` component automatically. `runInAction()` after every `await` ensures mutations stay inside MobX's action scope across async boundaries. The `makeAutoObservable(this, { _pollingHandle: false })` exclusion prevents the interval handle from becoming an observable, which would cause MobX warnings.

### Why MapLibre GL (not a D3 SVG map)?

Topological rail routes follow real geography. MapLibre renders them as GeoJSON `LineString` features on a proper basemap with tile-based road and terrain context — the same approach as Trafit's `railOscope`. A D3 projection map would require custom GeoJSON for Switzerland and lose the contextual basemap.

### SBB Delay Thresholds

Swiss Federal Railways counts a train as **on time** if it departs within **3 minutes** of the scheduled time. The three-tier threshold used throughout (`< 3 min → on_time`, `3–9 min → minor_delay`, `≥ 10 min → major_delay`) mirrors this official definition.

### Graceful MongoDB Degradation

`connectDatabase()` catches connection errors and logs a warning instead of throwing. The cron job and analytics controllers guard with `if (!isConnected()) return`. This means the server starts and serves live data even if MongoDB is not installed — only the historical endpoints return 503.

---

## 📄 License

MIT — built for educational and portfolio purposes.
# -Swiss-Rail-Live-Pulse
