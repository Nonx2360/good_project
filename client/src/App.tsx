import { useState } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LayoutDashboard, Settings as SettingsIcon, Package, Menu, X, Search, LogOut } from 'lucide-react';
import Dashboard from './pages/Dashboard.tsx';
import PartsManagement from './pages/PartsManagement.tsx';
import SettingsPage from './pages/SettingsPage.tsx';
import SearchPage from './pages/SearchPage.tsx';
import { useLanguage } from './context/LanguageContext';

function NavLinks({ closeSidebar }: { closeSidebar: () => void }) {
  const location = useLocation();
  const { t } = useLanguage();

  const links = [
    { name: t('sidebar.dashboard'), path: '/', icon: LayoutDashboard },
    { name: t('sidebar.inventory'), path: '/parts', icon: Package },
    { name: t('sidebar.search'), path: '/search', icon: Search },
    { name: t('sidebar.settings'), path: '/settings', icon: SettingsIcon },
  ];

  return (
    <nav aria-label="Primary navigation" style={{ marginTop: '8px' }}>
      {links.map((link) => {
        const isActive = location.pathname === link.path;
        return (
          <Link
            key={link.path}
            to={link.path}
            onClick={closeSidebar}
            aria-current={isActive ? 'page' : undefined}
            className={`sidebar__nav-item${isActive ? ' sidebar__nav-item--active' : ''}`}
          >
            <link.icon className="sidebar__nav-icon" aria-hidden="true" />
            <span>{link.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <Router>
      <div className="app-layout">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--color-bg-surface)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-family-mono)',
              fontSize: '0.875rem',
            },
          }}
        />

        {/* Mobile backdrop */}
        {isSidebarOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`sidebar${isSidebarOpen ? ' sidebar--open' : ''}`}
          aria-label="Application sidebar"
        >
          <div className="sidebar__header">
            <span className="sidebar__title">MachineTrack</span>
            <button
              className="sidebar__close"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>

          <NavLinks closeSidebar={() => setIsSidebarOpen(false)} />

          <div className="sidebar__footer">
            <button
              className="btn btn--ghost"
              style={{ width: '100%', justifyContent: 'flex-start' }}
              aria-label={t('sidebar.logout')}
            >
              <LogOut size={16} aria-hidden="true" />
              <span>{t('sidebar.logout')}</span>
            </button>
          </div>
        </aside>

        {/* Main area */}
        <main className="main-content" id="main-content">
          {/* Mobile top bar */}
          <header className="main-content__header" role="banner">
            <button
              className="main-content__menu-btn"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open sidebar menu"
              aria-expanded={isSidebarOpen}
              aria-controls="sidebar"
            >
              <Menu size={22} />
            </button>
            <span className="sidebar__title">MachineTrack</span>
            <div style={{ width: 22 }} />
          </header>

          <div className="main-content__container">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/parts" element={<PartsManagement />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
