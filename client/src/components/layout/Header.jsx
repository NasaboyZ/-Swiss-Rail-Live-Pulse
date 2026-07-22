import { observer } from 'mobx-react-lite';
import { trainStore } from '../../stores';
import styles from './Header.module.css';

/**
 * Top navigation bar.
 * observer() makes this component re-render whenever any observable it reads
 * changes — here: stats, lastUpdated, isLoading.
 */
const Header = observer(() => {
  const { stats, lastUpdated, isLoading } = trainStore;

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.brandIcon} aria-hidden="true">🚄</span>
        <div className={styles.brandText}>
          <span className={styles.brandTitle}>Swiss Rail Live Pulse</span>
          <span className={styles.brandSub}>Zürich HB · Echtzeit-Monitor</span>
        </div>
      </div>

      <div className={styles.kpis} role="list" aria-label="Key performance indicators">
        <KpiCard label="Abfahrten" value={stats.total} />
        <KpiCard
          label="Pünktlich"
          value={`${stats.punctualityRate}%`}
          variant={stats.punctualityRate >= 80 ? 'success' : 'danger'}
        />
        <KpiCard
          label="Verspätet"
          value={stats.delayed}
          variant={stats.delayed > 0 ? 'warning' : 'neutral'}
        />
        <KpiCard
          label="Ø Verspätung"
          value={`${stats.avgDelay} min`}
          variant={stats.avgDelay >= 5 ? 'danger' : 'neutral'}
        />
      </div>

      <div className={styles.liveStatus} aria-live="polite">
        <span
          className={`${styles.dot} ${isLoading ? styles.dotPulsing : styles.dotLive}`}
          aria-hidden="true"
        />
        <span className={styles.statusText}>
          {isLoading
            ? 'Aktualisierung…'
            : lastUpdated
              ? `Aktualisiert ${formatTime(lastUpdated)}`
              : 'Verbinde…'}
        </span>
      </div>
    </header>
  );
});

function KpiCard({ label, value, variant = 'neutral' }) {
  return (
    <div className={`${styles.kpi} ${styles[`kpi_${variant}`]}`} role="listitem">
      <span className={styles.kpiValue}>{value}</span>
      <span className={styles.kpiLabel}>{label}</span>
    </div>
  );
}

function formatTime(date) {
  return date.toLocaleTimeString('de-CH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default Header;
