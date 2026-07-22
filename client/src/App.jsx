import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Train, Map } from 'lucide-react';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import DepartureBoard from './components/DepartureBoard';
import RoutePanel from './components/RoutePanel';
import styles from './App.module.css';

const TABS = [
  { id: 'departures', label: 'Abfahrten',    Icon: Train },
  { id: 'routes',     label: 'Verbindungen', Icon: Map   },
];

const App = observer(() => {
  const [activeTab, setActiveTab] = useState('departures');
  const onRoutes = activeTab === 'routes';

  return (
    <div className={styles.shell}>
      <Header />

      <nav className={styles.tabBar}>
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`${styles.tab} ${activeTab === id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </nav>

      <div className={styles.body}>
        {/* Sidebar only shown on Abfahrten tab */}
        {!onRoutes && <Sidebar />}

        {/* Departures tab — conditionally rendered (no MapLibre, safe to unmount) */}
        {!onRoutes && (
          <main className={styles.main}>
            <DepartureBoard />
          </main>
        )}

        {/* Routes tab — ALWAYS mounted so MapLibre is never torn down mid-session.
            display:none hides it; Map.jsx's ResizeObserver calls map.resize()
            when the container becomes visible again. */}
        <div
          className={styles.routeArea}
          style={{ display: onRoutes ? 'flex' : 'none' }}
        >
          <RoutePanel />
        </div>
      </div>
    </div>
  );
});

export default App;
