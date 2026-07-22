import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Clock, AlertTriangle, CheckCircle2, Train } from 'lucide-react';
import { connectionStore } from '../stores';
import { Map, MapControls, MapRoute, MapMarker, TrainMarker } from './map';
import { routeBounds } from '../utils/interpolatePosition';
import { useMap } from './map/MapContext';
import ConnectionSearch from './ConnectionSearch';
import DelayChart from './DelayChart';
import styles from './RoutePanel.module.css';

/**
 * Route-finder view — the main feature of Step 2.
 *
 * Layout:
 *   Left panel:  search form + connection cards
 *   Right panel: MapLibre map (route line + live train dot)
 *   Bottom:      D3 delay chart
 */
const RoutePanel = observer(() => {
  const { connections, selectedConnection, trainPosition, passedCoords, upcomingCoords } = connectionStore;

  return (
    <div className={styles.panel}>
      {/* ── Left: search + results ───────────────────────────── */}
      <aside className={styles.sidebar}>
        <ConnectionSearch />

        {connections.length > 0 && (
          <div className={styles.connectionList}>
            <p className={styles.listLabel}>{connections.length} Verbindung(en) gefunden</p>
            {connections.map((conn) => (
              <ConnectionCard
                key={conn.id}
                conn={conn}
                isSelected={selectedConnection?.id === conn.id}
                onSelect={() => connectionStore.selectConnection(conn)}
              />
            ))}
          </div>
        )}

        {selectedConnection && (
          <DelayChart />
        )}
      </aside>

      {/* ── Right: map ──────────────────────────────────────── */}
      <div className={styles.mapArea}>
        <Map center={[8.54, 47.37]} zoom={7.5}>
          <MapControls />
          <MapFitBounds route={selectedConnection?.route} />

          {/* Already-traveled portion — green, slightly thinner */}
          {passedCoords.length >= 2 && (
            <MapRoute
              coordinates={passedCoords}
              color="#059669"
              width={3}
              id="route-passed"
            />
          )}

          {/* Still-ahead portion — blue, full weight */}
          {upcomingCoords.length >= 2 && (
            <MapRoute
              coordinates={upcomingCoords}
              color="#2563eb"
              width={4}
              id="route-upcoming"
            />
          )}

          {/* Origin + destination markers */}
          {connectionStore.endpointMarkers.map((ep) => (
            <MapMarker
              key={ep.stationId}
              coordinates={ep.coordinates}
              color="#0f172a"
              size={12}
              tooltip={`${ep.stationName}${ep.delay > 0 ? ` · +${ep.delay} min` : ''}`}
            />
          ))}

          {/* Intermediate station dots */}
          {(selectedConnection?.route ?? [])
            .filter((s) => s.coordinates && s.stationName)
            .slice(1, -1)
            .map((stop, i) => (
              <MapMarker
                key={stop.stationId ?? i}
                coordinates={stop.coordinates}
                color="#94a3b8"
                size={7}
                tooltip={stop.stationName}
              />
            ))}

          {/* Live train position */}
          {trainPosition && (
            <TrainMarker
              coordinates={trainPosition}
              status={selectedConnection?.status}
              label={`${selectedConnection?.trainName} · ${
                selectedConnection?.totalDelay > 0
                  ? `+${selectedConnection.totalDelay} min`
                  : 'pünktlich'
              }`}
            />
          )}
        </Map>

        {/* Map legend overlay */}
        {selectedConnection && (
          <MapLegend connection={selectedConnection} />
        )}
      </div>
    </div>
  );
});

// ── Sub-components ────────────────────────────────────────────────

/** Fits the map viewport to the selected route bounds after data loads. */
function MapFitBounds({ route }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !route) return;
    const bounds = routeBounds(route);
    if (!bounds) return;

    map.fitBounds([bounds.sw, bounds.ne], { padding: 60, duration: 800 });
  }, [map, route]);

  return null;
}

function ConnectionCard({ conn, isSelected, onSelect }) {
  const dep = formatTime(conn.from?.departure);
  const arr = formatTime(conn.to?.arrival);
  const dur = formatDuration(conn.duration);

  const StatusIcon = conn.totalDelay >= 3
    ? AlertTriangle
    : CheckCircle2;

  return (
    <button
      className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
      onClick={onSelect}
      aria-pressed={isSelected}
    >
      <div className={styles.cardHeader}>
        <span className={`${styles.trainBadge} ${styles[`cat_${conn.category?.toLowerCase()}`]}`}>
          <Train size={11} />
          {conn.trainName}
        </span>
        <span className={`${styles.statusChip} ${styles[`status_${conn.status}`]}`}>
          <StatusIcon size={11} />
          {conn.totalDelay > 0 ? `+${conn.totalDelay} min` : 'Pünktlich'}
        </span>
      </div>

      <div className={styles.cardTimes}>
        <div className={styles.timeBlock}>
          <span className={styles.time}>{dep}</span>
          <span className={styles.station}>{conn.from?.stationName}</span>
        </div>
        <div className={styles.timeDivider}>
          <div className={styles.durationLine} />
          <span className={styles.duration}>
            <Clock size={10} /> {dur}
          </span>
        </div>
        <div className={styles.timeBlock}>
          <span className={styles.time}>{arr}</span>
          <span className={styles.station}>{conn.to?.stationName}</span>
        </div>
      </div>

      <div className={styles.cardFooter}>
        <span className={styles.stops}>{conn.route.length} Halte</span>
        {conn.from?.platform && (
          <span className={styles.platform}>Gleis {conn.from.platform}</span>
        )}
      </div>
    </button>
  );
}

function MapLegend({ connection }) {
  return (
    <div className={styles.legend}>
      <LegendItem color="#059669" size={10} label="Bereits gefahren" line />
      <LegendItem color="#2563eb" size={10} label="Noch ausstehend"  line />
      <LegendItem color="#0f172a" size={11} label="Start / Ziel" />
      <LegendItem color="#94a3b8" size={7}  label="Zwischenhalte" />
      <LegendItem
        color={
          connection.status === 'on_time'     ? '#059669' :
          connection.status === 'minor_delay' ? '#d97706' : '#dc2626'
        }
        size={16}
        label="Zugposition (live)"
        pulse
      />
    </div>
  );
}

function LegendItem({ color, size, label, pulse, line }) {
  return (
    <div className={styles.legendItem}>
      {line ? (
        <span
          className={styles.legendLine}
          style={{ background: color }}
        />
      ) : (
        <span
          className={styles.legendDot}
          style={{
            width: size,
            height: size,
            background: color,
            animation: pulse ? 'train-pulse 2s ease-in-out infinite' : undefined,
          }}
        />
      )}
      <span className={styles.legendLabel}>{label}</span>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function formatTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('de-CH', {
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(dur) {
  if (!dur) return '—';
  // SBB format: "00d01:30:00"
  const match = dur.match(/(\d+):(\d+):\d+$/);
  if (!match) return dur;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default RoutePanel;
