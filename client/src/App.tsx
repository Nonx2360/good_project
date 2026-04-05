import { useState } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LayoutDashboard, Settings as SettingsIcon, Package, LogOut, Menu, X, Search } from 'lucide-react';
import Dashboard from './pages/Dashboard.tsx';
import PartsManagement from './pages/PartsManagement.tsx';
import SettingsPage from './pages/SettingsPage.tsx';
import SearchPage from './pages/SearchPage.tsx';
import { useLanguage } from './context/LanguageContext';

// A small wrapper to handle sidebar closing on route change automatically for mobile
function NavLinks({ closeSidebar }: { closeSidebar: () => void }) {
  const location = useLocation();
  const { t } = useLanguage();
  
  const links = [
    { name: t('sidebar.dashboard'), path: '/', icon: LayoutDashboard, color: 'text-blue-500' },
    { name: t('sidebar.inventory'), path: '/parts', icon: Package, color: 'text-indigo-500' },
    { name: t('sidebar.search'), path: '/search', icon: Search, color: 'text-violet-500' },
    { name: t('sidebar.settings'), path: '/settings', icon: SettingsIcon, color: 'text-slate-500' },
  ];

  return (
    <nav className="mt-6 flex flex-col">
      {links.map((link) => (
        <Link
          key={link.path}
          to={link.path}
          onClick={closeSidebar}
          className={`flex items-center px-6 py-3 transition-colors gap-3 ${
            location.pathname === link.path 
              ? 'bg-slate-100 dark:bg-slate-700/50 border-r-4 border-indigo-500' 
              : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
          }`}
        >
          <link.icon className={`w-5 h-5 ${link.color}`} />
          <span className="font-medium text-sm md:text-base">{link.name}</span>
        </Link>
      ))}
    </nav>
  );
}

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <Router>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-900 border-none font-sans text-slate-800 dark:text-slate-200 overflow-hidden relative">
        <Toaster position="top-right" />
        
        {/* Mobile Header / Hamburger Menu */}
        <div className="md:hidden absolute top-0 left-0 w-full bg-white dark:bg-slate-800 shadow-sm z-20 flex justify-between items-center p-4">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-600">
            MachineTrack
          </h1>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Backdrop for Mobile */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside 
          className={`fixed md:relative top-0 left-0 h-full w-72 md:w-64 bg-white dark:bg-slate-800 shadow-2xl md:shadow-xl flex flex-col justify-between z-40 transform transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <div>
            <div className="p-6 hidden md:block">
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-600">
                MachineTrack
              </h1>
            </div>
            {/* Mobile Title with Close button */}
            <div className="p-6 md:hidden flex justify-between items-center border-b border-slate-100 dark:border-slate-700">
               <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-600">
                Menu
              </h1>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <NavLinks closeSidebar={() => setIsSidebarOpen(false)} />
          </div>

          <div className="p-6 border-t border-slate-50 dark:border-slate-700/50">
            <button className="flex items-center gap-3 text-slate-500 hover:text-red-500 transition-colors w-full text-left px-2 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10">
              <LogOut className="w-5 h-5" />
              <span className="font-medium text-sm md:text-base">{t('sidebar.logout')}</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto pt-20 md:pt-8 p-4 md:p-8 relative w-full">
          <div className="max-w-6xl mx-auto backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 min-h-full">
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
