import { observer } from 'mobx-react-lite';
import { Search, ArrowRight, RotateCcw } from 'lucide-react';
import { connectionStore } from '../stores';
import styles from './ConnectionSearch.module.css';

/**
 * From / To search form with quick-select example routes.
 * Wires directly into ConnectionStore actions.
 */
const ConnectionSearch = observer(() => {
  const { from, to, isLoading, error } = connectionStore;

  const handleSubmit = (e) => {
    e.preventDefault();
    connectionStore.searchConnections();
  };

  const handleSwap = () => {
    const tmp = connectionStore.from;
    connectionStore.setFrom(connectionStore.to);
    connectionStore.setTo(tmp);
  };

  return (
    <div className={styles.wrapper}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.inputGroup}>
          <label className={styles.inputLabel} htmlFor="from-input">Von</label>
          <input
            id="from-input"
            className={styles.input}
            type="text"
            placeholder="z.B. Zürich HB"
            value={from}
            onChange={(e) => connectionStore.setFrom(e.target.value)}
            autoComplete="off"
            spellCheck="false"
          />
        </div>

        <button
          type="button"
          className={styles.swapBtn}
          onClick={handleSwap}
          title="Stationen tauschen"
          aria-label="Start und Ziel tauschen"
        >
          <RotateCcw size={14} />
        </button>

        <div className={styles.inputGroup}>
          <label className={styles.inputLabel} htmlFor="to-input">Nach</label>
          <input
            id="to-input"
            className={styles.input}
            type="text"
            placeholder="z.B. Bern"
            value={to}
            onChange={(e) => connectionStore.setTo(e.target.value)}
            autoComplete="off"
            spellCheck="false"
          />
        </div>

        <button
          type="submit"
          className={styles.searchBtn}
          disabled={isLoading || !from.trim() || !to.trim()}
          aria-label="Verbindungen suchen"
        >
          {isLoading ? (
            <span className={styles.spinner} aria-hidden="true" />
          ) : (
            <Search size={16} />
          )}
          <span>{isLoading ? 'Suche…' : 'Suchen'}</span>
        </button>
      </form>

      {/* Quick-select example routes so the demo works without typing */}
      <div className={styles.quickPicks}>
        <span className={styles.quickLabel}>Schnellwahl:</span>
        {QUICK_ROUTES.map(({ from: f, to: t }) => (
          <button
            key={`${f}-${t}`}
            className={styles.quickChip}
            onClick={() => {
              connectionStore.setFrom(f);
              connectionStore.setTo(t);
              connectionStore.searchConnections();
            }}
          >
            {f} <ArrowRight size={11} /> {t}
          </button>
        ))}
      </div>

      {error && (
        <p className={styles.error} role="alert">⚠ {error}</p>
      )}
    </div>
  );
});

const QUICK_ROUTES = [
  { from: 'Zürich HB', to: 'Bern' },
  { from: 'Zürich HB', to: 'Basel SBB' },
  { from: 'Bern', to: 'Genève' },
  { from: 'Zürich HB', to: 'Luzern' },
];

export default ConnectionSearch;
