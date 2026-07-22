import { makeAutoObservable, runInAction } from 'mobx';
import { fetchDepartures } from '../services/api';

/**
 * Central MobX store for live train data and UI filter state.
 *
 * ── Why MobX? ────────────────────────────────────────────────────────────
 * The dashboard has multiple independent consumers of the same data:
 * the departure table, the map (Step 2), and the stats header all react
 * to departures updates simultaneously. MobX's observable graph propagates
 * changes to every observer automatically without prop-drilling or manual
 * subscriptions — ideal for a live-data dashboard.
 *
 * ── Key MobX concepts used here ─────────────────────────────────────────
 * @observable  makeAutoObservable marks every property as observable and
 *              every method as an action automatically.
 * @computed    Getter properties (filteredDepartures, stats, …) are cached
 *              computed values — MobX only re-evaluates them when their
 *              observable dependencies actually change.
 * @action      Mutations to observables must happen inside actions.
 *              After an `await`, execution has left the action scope, so
 *              we wrap the state mutation in runInAction().
 */
class TrainStore {
  // ── Observables ───────────────────────────────────────────────────────
  departures = [];
  isLoading = false;
  error = null;
  lastUpdated = null;

  // Filter state — mutations go through setFilter* actions below
  filterDelayMin = 0;    // show only trains with delay ≥ this value
  filterCategory = '';   // 'IC' | 'IR' | 'S' | '' (all)

  /** @private */
  _pollingHandle = null;

  constructor() {
    // The second argument excludes _pollingHandle from the observable graph.
    // setInterval returns a number (or NodeJS.Timeout), not reactive data —
    // making it observable would cause unnecessary re-renders and MobX warnings.
    makeAutoObservable(this, { _pollingHandle: false });
  }

  // ── Computed values ───────────────────────────────────────────────────

  /** Departure list after applying current filter state. */
  get filteredDepartures() {
    return this.departures.filter((d) => {
      if (this.filterDelayMin > 0 && d.delayMinutes < this.filterDelayMin) return false;
      if (this.filterCategory && d.category !== this.filterCategory) return false;
      return true;
    });
  }

  /** KPI summary for the header cards — recomputed only when departures change. */
  get stats() {
    const total = this.departures.length;
    if (total === 0) return { total: 0, onTime: 0, delayed: 0, punctualityRate: 100, avgDelay: 0 };

    const onTime = this.departures.filter((d) => d.isOnTime).length;
    const avgDelay =
      this.departures.reduce((sum, d) => sum + d.delayMinutes, 0) / total;

    return {
      total,
      onTime,
      delayed: total - onTime,
      punctualityRate: Math.round((onTime / total) * 100),
      avgDelay: Math.round(avgDelay * 10) / 10,
    };
  }

  /** Unique train categories present in the current data — drives the filter dropdown. */
  get availableCategories() {
    return [...new Set(this.departures.map((d) => d.category).filter(Boolean))].sort();
  }

  // ── Actions ───────────────────────────────────────────────────────────

  setFilterDelay(minutes) {
    this.filterDelayMin = Number(minutes);
  }

  setFilterCategory(category) {
    this.filterCategory = category;
  }

  async loadDepartures(stationId) {
    this.isLoading = true;
    this.error = null;

    try {
      const data = await fetchDepartures(stationId);

      // runInAction is mandatory here: the await above crossed an async
      // boundary, exiting the original action scope. MobX strict mode
      // would throw without this wrapper.
      runInAction(() => {
        this.departures = data.departures;
        this.lastUpdated = new Date();
        this.isLoading = false;
      });
    } catch (err) {
      runInAction(() => {
        this.error = err.message;
        this.isLoading = false;
      });
    }
  }

  /** Starts polling and fires an immediate fetch so the UI isn't blank on load. */
  startPolling(stationId, intervalMs = 30_000) {
    // Guard against double-mount (React StrictMode fires effects twice in dev)
    this.stopPolling();
    this.loadDepartures(stationId);
    this._pollingHandle = setInterval(
      () => this.loadDepartures(stationId),
      intervalMs
    );
  }

  /** Must be called on component unmount to prevent memory leaks. */
  stopPolling() {
    if (this._pollingHandle !== null) {
      clearInterval(this._pollingHandle);
      this._pollingHandle = null;
    }
  }
}

// Export a singleton so every component shares the same reactive graph
export const trainStore = new TrainStore();
