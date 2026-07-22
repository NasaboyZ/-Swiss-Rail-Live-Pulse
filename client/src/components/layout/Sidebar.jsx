import { observer } from 'mobx-react-lite';
import { trainStore } from '../../stores';
import styles from './Sidebar.module.css';

const DELAY_OPTIONS = [
  { value: 0,  label: 'Alle' },
  { value: 3,  label: '≥ 3 min' },
  { value: 5,  label: '≥ 5 min' },
  { value: 10, label: '≥ 10 min' },
];

const Sidebar = observer(() => {
  const { filterDelayMin, filterCategory, availableCategories } = trainStore;

  return (
    <aside className={styles.sidebar} aria-label="Filter-Seitenleiste">
      <Section title="Filter">
        <FilterGroup label="Min. Verspätung">
          {DELAY_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              className={`${styles.chip} ${filterDelayMin === value ? styles.chipActive : ''}`}
              onClick={() => trainStore.setFilterDelay(value)}
              aria-pressed={filterDelayMin === value}
            >
              {label}
            </button>
          ))}
        </FilterGroup>

        <FilterGroup label="Kategorie">
          <select
            className={styles.select}
            value={filterCategory}
            onChange={(e) => trainStore.setFilterCategory(e.target.value)}
            aria-label="Zuggattung filtern"
          >
            <option value="">Alle Gattungen</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </FilterGroup>
      </Section>

      <Section title="Status-Legende">
        <LegendItem color="var(--status-green)"  label="Pünktlich (< 3 min)" />
        <LegendItem color="var(--status-orange)" label="Leichte Verspätung (< 10 min)" />
        <LegendItem color="var(--status-red)"    label="Starke Verspätung (≥ 10 min)" />
      </Section>

      <Section title="Knotenbahnhof">
        <div className={styles.stationCard}>
          <span className={styles.stationName}>Zürich HB</span>
          <span className={styles.stationId}>ID: 8503000</span>
          <a
            href="https://transport.opendata.ch"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.apiLink}
          >
            transport.opendata.ch ↗
          </a>
        </div>
      </Section>
    </aside>
  );
});

function Section({ title, children }) {
  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {children}
    </div>
  );
}

function FilterGroup({ label, children }) {
  return (
    <div className={styles.filterGroup}>
      <span className={styles.filterLabel}>{label}</span>
      <div className={styles.filterControls}>{children}</div>
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <div className={styles.legendItem}>
      <span
        className={styles.legendDot}
        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
        aria-hidden="true"
      />
      <span className={styles.legendLabel}>{label}</span>
    </div>
  );
}

export default Sidebar;
