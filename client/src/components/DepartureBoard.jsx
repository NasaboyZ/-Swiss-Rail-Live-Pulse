import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { trainStore } from '../stores';
import styles from './DepartureBoard.module.css';

const ZURICH_HB_ID = '8503000';
const POLL_INTERVAL_MS = 30_000;

/**
 * Main departure board — the first view the user sees.
 *
 * Uses observer() so MobX automatically re-renders when filteredDepartures,
 * isLoading, or error change, without any manual subscription management.
 */
const DepartureBoard = observer(() => {
  const { filteredDepartures, isLoading, error } = trainStore;

  useEffect(() => {
    trainStore.startPolling(ZURICH_HB_ID, POLL_INTERVAL_MS);
    // Cleanup: stop the setInterval when this component unmounts
    return () => trainStore.stopPolling();
  }, []);

  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <div className={styles.board}>
      <div className={styles.boardHead}>
        <h2 className={styles.boardTitle}>
          Live-Abfahrten
          {isLoading && (
            <span className={styles.refreshBadge} aria-label="Aktualisierung läuft">
              ↻ Refresh
            </span>
          )}
        </h2>
        <span className={styles.boardCount} aria-live="polite">
          {filteredDepartures.length} Züge
        </span>
      </div>

      {/* Show skeleton rows only on the very first load (no data yet) */}
      {isLoading && filteredDepartures.length === 0 ? (
        <SkeletonTable />
      ) : filteredDepartures.length === 0 ? (
        <EmptyState />
      ) : (
        <div className={styles.tableWrapper} role="region" aria-label="Abfahrtstafel">
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Zeit</th>
                <th scope="col">Zug</th>
                <th scope="col">Richtung</th>
                <th scope="col">Gleis</th>
                <th scope="col">Versptg.</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredDepartures.map((dep) => (
                <DepartureRow key={dep.id} dep={dep} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});

// ── Sub-components ────────────────────────────────────────────────────────

const DepartureRow = observer(({ dep }) => {
  const timeStr = dep.scheduledDeparture
    ? new Date(dep.scheduledDeparture).toLocaleTimeString('de-CH', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  const catKey = dep.category?.toLowerCase();

  return (
    <tr className={`${styles.row} ${styles[`row_${dep.status}`]}`}>
      <td className={styles.colTime}>
        <span className={styles.time}>{timeStr}</span>
      </td>

      <td className={styles.colTrain}>
        <span className={`${styles.trainBadge} ${styles[`badge_${catKey}`]}`}>
          {dep.trainName}
        </span>
      </td>

      <td className={styles.colDest}>{dep.destination ?? '—'}</td>

      <td className={styles.colPlatform}>
        <span className={styles.platform}>{dep.platform}</span>
      </td>

      <td className={styles.colDelay}>
        {dep.delayMinutes > 0 ? (
          <span className={`${styles.delay} ${styles[`delay_${dep.status}`]}`}>
            +{dep.delayMinutes} min
          </span>
        ) : (
          <span className={styles.delayNone}>—</span>
        )}
      </td>

      <td className={styles.colStatus}>
        <StatusPill status={dep.status} />
      </td>
    </tr>
  );
});

function StatusPill({ status }) {
  const labels = {
    on_time:     'Pünktlich',
    minor_delay: 'Verspätet',
    major_delay: 'Stark verspätet',
  };
  return (
    <span className={`${styles.pill} ${styles[`pill_${status}`]}`}>
      {labels[status] ?? status}
    </span>
  );
}

function SkeletonTable() {
  return (
    <div className={styles.tableWrapper} aria-busy="true" aria-label="Daten werden geladen">
      <table className={styles.table}>
        <thead>
          <tr>
            {['Zeit', 'Zug', 'Richtung', 'Gleis', 'Versptg.', 'Status'].map((h) => (
              <th key={h} scope="col">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }, (_, i) => (
            <tr key={i} className={styles.row}>
              {Array.from({ length: 6 }, (_, j) => (
                <td key={j}><span className={styles.skeleton} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState() {
  return (
    <div className={styles.empty} role="status">
      <span className={styles.emptyIcon}>🔍</span>
      <p>Keine Abfahrten entsprechen den aktuellen Filtern.</p>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className={styles.error} role="alert">
      <span className={styles.errorIcon}>⚠</span>
      <div>
        <strong>API-Fehler</strong>
        <p>{message}</p>
        <small>Stelle sicher, dass der Backend-Server läuft.</small>
      </div>
    </div>
  );
}

export default DepartureBoard;
