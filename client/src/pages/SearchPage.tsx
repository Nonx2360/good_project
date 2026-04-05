import { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Search, SlidersHorizontal, X, Clock, CheckCircle2, AlertTriangle, ChevronUp, ChevronDown, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import { useLanguage } from '../context/LanguageContext';

type SortKey = 'part_name' | 'serial_number' | 'quantity' | 'expiry_date';
type SortDir = 'asc' | 'desc';
type Filter = 'all' | 'in_stock' | 'healthy' | 'warning' | 'expired';

function getPartStatus(part: any): 'in_stock' | 'expired' | 'warning' | 'healthy' {
  if (part.status === 'in_stock' || !part.status || !part.expiry_date) return 'in_stock';
  const days = dayjs(part.expiry_date).diff(dayjs(), 'day');
  if (days < 0) return 'expired';
  if (days <= 30) return 'warning';
  return 'healthy';
}

function StatusBadge({ part }: { part: any }) {
  const status = getPartStatus(part);
  const { t } = useLanguage();
  
  if (status === 'in_stock') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-slate-100 text-slate-600 border-slate-200">
        <Package className="w-3 h-3" /> {t('search.filterInStock')}
      </span>
    );
  }

  const days = dayjs(part.expiry_date).diff(dayjs(), 'day');
  
  if (status === 'expired') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-red-50 text-red-600 border-red-200">
        <AlertTriangle className="w-3 h-3" /> {t('search.filterExpired')} {Math.abs(days)}d ago
      </span>
    );
  }
  if (status === 'warning') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-amber-50 text-amber-600 border-amber-200">
        <Clock className="w-3 h-3" /> {days === 0 ? 'Expires Today' : `${days}d left`}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-600 border-emerald-200">
      <CheckCircle2 className="w-3 h-3" /> {t('search.filterActive')}
    </span>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronUp className="w-3 h-3 opacity-20" />;
  return dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
}

export default function SearchPage() {
  const { parts } = useStore();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('part_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    let list = [...parts];

    const q = query.toLowerCase();
    if (q) {
      list = list.filter((p: any) =>
        p.part_name?.toLowerCase().includes(q) ||
        p.serial_number?.toLowerCase().includes(q) ||
        String(p.id).includes(q)
      );
    }

    if (filter !== 'all') {
      list = list.filter((p: any) => getPartStatus(p) === filter);
    }

    list.sort((a: any, b: any) => {
      let av: any, bv: any;
      if (sortKey === 'expiry_date') {
        av = a.expiry_date ? dayjs(a.expiry_date).valueOf() : Infinity;
        bv = b.expiry_date ? dayjs(b.expiry_date).valueOf() : Infinity;
      } else {
        av = a[sortKey] ?? '';
        bv = b[sortKey] ?? '';
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [parts, query, filter, sortKey, sortDir]);

  const counts = useMemo(() => ({
    all: parts.length,
    in_stock: parts.filter((p: any) => getPartStatus(p) === 'in_stock').length,
    healthy: parts.filter((p: any) => getPartStatus(p) === 'healthy').length,
    warning: parts.filter((p: any) => getPartStatus(p) === 'warning').length,
    expired: parts.filter((p: any) => getPartStatus(p) === 'expired').length,
  }), [parts]);

  const filterButtons: { key: Filter; label: string; icon: any; color: string; active: string }[] = [
    { key: 'all', label: t('search.filterAll'), icon: SlidersHorizontal, color: 'text-slate-500', active: 'bg-slate-800 text-white border-slate-700' },
    { key: 'in_stock', label: t('search.filterInStock'), icon: Package, color: 'text-indigo-500', active: 'bg-indigo-600 text-white border-indigo-600' },
    { key: 'healthy', label: t('search.filterActive'), icon: CheckCircle2, color: 'text-green-500', active: 'bg-green-600 text-white border-green-600' },
    { key: 'warning', label: t('search.filterExpiring'), icon: Clock, color: 'text-amber-500', active: 'bg-amber-500 text-white border-amber-500' },
    { key: 'expired', label: t('search.filterExpired'), icon: AlertTriangle, color: 'text-red-500', active: 'bg-red-600 text-white border-red-600' },
  ];

  const cols: { key: SortKey; label: string }[] = [
    { key: 'part_name', label: t('dashboard.tablePartName') },
    { key: 'serial_number', label: t('dashboard.tableSerialNo') },
    { key: 'quantity', label: t('dashboard.tableQty') },
    { key: 'expiry_date', label: t('dashboard.tableExpiresOn') },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 h-full flex flex-col gap-6"
    >
      <div>
        <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3 mb-1">
          <Search className="text-indigo-500 w-7 h-7" />
          {t('search.title')}
        </h2>
        <p className="text-slate-400 text-sm">{t('search.subtitle')}</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        <input
          id="search-input"
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('search.placeholder')}
          className="w-full pl-12 pr-10 py-3.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm shadow-sm"
          autoFocus
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {filterButtons.map(btn => {
          const Icon = btn.icon;
          return (
            <button
              key={btn.key}
              id={`filter-${btn.key}`}
              onClick={() => setFilter(btn.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                filter === btn.key
                  ? btn.active
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-400'
              }`}
            >
              <Icon className={`w-4 h-4 ${filter === btn.key ? 'text-white' : btn.color}`} />
              {btn.label}
              <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${filter === btn.key ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                {counts[btn.key]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-700 text-sm text-slate-500 flex items-center justify-between">
          <span>
            {filtered.length === 0 ? t('search.noResults') : t('search.resultsCount', { count: filtered.length })}
            {query && <span className="ml-1">{t('search.resultsFor', { query })}</span>}
          </span>
          {(query || filter !== 'all') && (
            <button
              onClick={() => { setQuery(''); setFilter('all'); }}
              className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> {t('search.clearFilters')}
            </button>
          )}
        </div>

        <div className="overflow-auto flex-1">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">{t('inventory.tableId')}</th>
                {cols.map(col => (
                  <th
                    key={col.key}
                    className="px-6 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider cursor-pointer select-none hover:text-slate-800 dark:hover:text-white transition-colors"
                    onClick={() => handleSort(col.key)}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      <SortIcon active={sortKey === col.key} dir={sortDir} />
                    </span>
                  </th>
                ))}
                <th className="px-6 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">{t('inventory.tableStatus')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              <AnimatePresence mode="popLayout">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16">
                      <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-400 font-medium">{t('search.noResults')}</p>
                      <p className="text-slate-300 text-xs mt-1">{t('search.noResultsSub')}</p>
                    </td>
                  </tr>
                ) : filtered.map((p: any) => {
                  const status = getPartStatus(p);
                  const rowColor =
                    status === 'expired' ? 'bg-red-50/40 dark:bg-red-900/10' :
                    status === 'warning' ? 'bg-amber-50/40 dark:bg-amber-900/10' :
                    status === 'in_stock' ? 'bg-indigo-50/20 dark:bg-indigo-900/5' : '';
                  return (
                    <motion.tr
                      key={p.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors ${rowColor}`}
                    >
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs">#{String(p.id).padStart(4,'0')}</td>
                      <td className="px-6 py-4 font-semibold">{p.part_name}</td>
                      <td className="px-6 py-4 text-slate-500 font-mono text-xs">{p.serial_number || '—'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full font-bold text-xs">
                          {p.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {p.expiry_date ? dayjs(p.expiry_date).format('MMM DD, YYYY HH:mm') : '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <StatusBadge part={p} />
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
