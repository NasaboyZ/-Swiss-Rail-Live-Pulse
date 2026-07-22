import { makeAutoObservable, runInAction } from 'mobx';
import { fetchConnections } from '../services/api';
import { interpolatePosition, getRouteProgress } from '../utils/interpolatePosition';

/**
 * MobX store for the route-finder feature.
 *
 * State flow:
 *   1. User types from/to → setFrom / setTo
 *   2. User submits → searchConnections() fetches from backend
 *   3. First connection is auto-selected → selectedConnection observable updates
 *   4. startPositionTracking() begins a 5-second tick updating trainPosition
 *   5. TrainMarker and DelayChart react automatically via observer()
 */
class ConnectionStore {
  from = '';
  to = '';
  connections = [];
  selectedConnection = null;
  trainPosition = null;    // { lat, lng } — interpolated live position
  passedCoords = [];       // route portion already traveled (green line)
  upcomingCoords = [];     // route portion still ahead (blue line)
  isLoading = false;
  error = null;

  /** @private — excluded from observable graph */
  _positionTimer = null;

  constructor() {
    makeAutoObservable(this, { _positionTimer: false });
  }

  // ── Computed ──────────────────────────────────────────────────────

  /** Stops with valid coordinates — used by MapRoute and MapMarker. */
  get routeCoordinates() {
    return (this.selectedConnection?.route ?? []).filter((s) => s.coordinates);
  }

  /** All route stops with delay data — drives the D3 bar chart. */
  get delayChartData() {
    return (this.selectedConnection?.route ?? [])
      .filter((s) => s.delay !== null && s.stationName)
      .map((s) => ({ stationName: s.stationName, delay: s.delay ?? 0 }));
  }

  /** Station endpoint markers — origin and destination circles. */
  get endpointMarkers() {
    const conn = this.selectedConnection;
    if (!conn) return [];
    return [conn.from, conn.to].filter((e) => e?.coordinates);
  }

  // ── Actions ───────────────────────────────────────────────────────

  setFrom(value) { this.from = value; }
  setTo(value)   { this.to = value; }

  selectConnection(conn) {
    this.selectedConnection = conn;
    this.startPositionTracking();
  }

  async searchConnections() {
    if (!this.from.trim() || !this.to.trim()) return;

    this.isLoading = true;
    this.error = null;

    try {
      const data = await fetchConnections(this.from.trim(), this.to.trim());
      runInAction(() => {
        this.connections = data.connections;
        this.isLoading = false;
        // Auto-select first connection so the map immediately shows something
        if (data.connections.length > 0) {
          this.selectedConnection = data.connections[0];
          this.startPositionTracking();
        }
      });
    } catch (err) {
      runInAction(() => {
        this.error = err.message;
        this.isLoading = false;
      });
    }
  }

  /** Tick every 5 seconds to update the interpolated train position. */
  startPositionTracking() {
    this.stopPositionTracking();
    this._tick();
    this._positionTimer = setInterval(() => this._tick(), 5_000);
  }

  stopPositionTracking() {
    if (this._positionTimer !== null) {
      clearInterval(this._positionTimer);
      this._positionTimer = null;
    }
  }

  _tick() {
    if (!this.selectedConnection) return;
    const now = Date.now();
    const pos = interpolatePosition(this.selectedConnection.route, now);
    const { passed, upcoming } = getRouteProgress(this.selectedConnection.route, now);

    // Fallback: if no timestamp data for progress, show the full route in blue
    const allCoords = this.selectedConnection.route
      .filter((s) => s.coordinates)
      .map((s) => s.coordinates);

    runInAction(() => {
      this.trainPosition = pos;
      this.passedCoords = passed;
      this.upcomingCoords = upcoming.length >= 2 ? upcoming : allCoords;
    });
  }
}

export const connectionStore = new ConnectionStore();
