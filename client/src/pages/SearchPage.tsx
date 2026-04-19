import { useState, useMemo } from 'react';
import { useStore } from '../store';
import {
  Search, SlidersHorizontal, X, Clock,
  CheckCircle2, AlertTriangle, ChevronUp, ChevronDown, Package
} from 'lucide-react';
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
  const days = part.expiry_date ? dayjs(part.expiry_date).diff(dayjs(), 'day') : null;

  if (status === 'in_stock') {
    return (
      <span className="badge badge--neutral" aria-label={t('search.filterInStock')}>
        <Package size={9} aria-hidden="true" />
        {t('search.filterInStock')}
      </span>
    );
  }
  if (status === 'expired') {
    return (
      <span className="badge badge--alert" aria-label={`${t('search.filterExpired')} ${Math.abs(days!)}d ago`}>
        <AlertTriangle size={9} aria-hidden="true" />
        {t('search.filterExpired')} {Math.abs(days!)}d ago
      </span>
    );
  }
  if (status === 'warning') {
    return (
      <span className="badge badge--alert" aria-label={days === 0 ? 'Expires today' : `${days}d left`}>
        <Clock size={9} aria-hidden="true" />
        {days === 0 ? 'Expires today' : `${days}d left`}
      </span>
    );
  }
  return (
    <span className="badge badge--neutral" aria-label={t('search.filterActive')}>
      <CheckCircle2 size={9} aria-hidden="true" />
      {t('search.filterActive')}
    </span>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  const opacity = active ? 1 : 0.25;
  return dir === 'asc' || !active
    ? <ChevronUp size={11} style={{ opacity }} aria-hidden="true" />
    : <ChevronDown size={11} style={{ opacity }} aria-hidden="true" />;
}

const FILTER_KEYS: { key: Filter; icon: any }[] = [
  { key: 'all',      icon: SlidersHorizontal },
  { key: 'in_stock', icon: Package },
  { key: 'healthy',  icon: CheckCircle2 },
  { key: 'warning',  icon: Clock },
  { key: 'expired',  icon: AlertTriangle },
];

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
    all:      parts.length,
    in_stock: parts.filter((p: any) => getPartStatus(p) === 'in_stock').length,
    healthy:  parts.filter((p: any) => getPartStatus(p) === 'healthy').length,
    warning:  parts.filter((p: any) => getPartStatus(p) === 'warning').length,
    expired:  parts.filter((p: any) => getPartStatus(p) === 'expired').length,
  }), [parts]);

  const filterLabels: Record<Filter, string> = {
    all:      t('search.filterAll'),
    in_stock: t('search.filterInStock'),
    healthy:  t('search.filterActive'),
    warning:  t('search.filterExpiring'),
    expired:  t('search.filterExpired'),
  };

  const cols: { key: SortKey; label: string }[] = [
    { key: 'part_name',    label: t('dashboard.tablePartName') },
    { key: 'serial_number',label: t('dashboard.tableSerialNo') },
    { key: 'quantity',     label: t('dashboard.tableQty') },
    { key: 'expiry_date',  label: t('dashboard.tableExpiresOn') },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Page Header */}
      <header className="page-header">
        <div>
          <h1 className="page-title">{t('search.title')}</h1>
          <p className="page-subtitle">{t('search.subtitle')}</p>
        </div>
      </header>

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: 'var(--space-4)' }}>
        <Search
          size={16}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 'var(--space-3)',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-tertiary)',
            pointerEvents: 'none',
          }}
        />
        <input
          id="search-input"
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('search.placeholder')}
          className="form-input"
          style={{ paddingLeft: 'calc(var(--space-3) * 2 + 16px)', paddingRight: query ? 'var(--space-8)' : 'var(--space-3)' }}
          aria-label={t('search.placeholder')}
          autoFocus
        />
        {query && (
          <button
            id="btn-clear-query"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            style={{
              position: 'absolute',
              right: 'var(--space-3)',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--color-text-tertiary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <nav
        aria-label="Filter by part status"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-5)',
        }}
      >
        {FILTER_KEYS.map(({ key, icon: Icon }) => {
          const isActive = filter === key;
          const isAlert = (key === 'warning' || key === 'expired') && isActive;
          return (
            <button
              key={key}
              id={`filter-${key}`}
              onClick={() => setFilter(key)}
              aria-pressed={isActive}
              aria-label={`Filter: ${filterLabels[key]} (${counts[key]})`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-2) var(--space-3)',
                fontFamily: 'var(--font-family-mono)',
                fontSize: '0.75rem',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${isActive ? (isAlert ? 'var(--color-alert-border)' : 'var(--color-border-active)') : 'var(--color-border)'}`,
                background: isActive
                  ? (isAlert ? 'var(--color-alert-bg)' : 'var(--color-bg-elevated)')
                  : 'transparent',
                color: isActive
                  ? (isAlert ? 'var(--color-alert-text)' : 'var(--color-text-primary)')
                  : 'var(--color-text-secondary)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={12} aria-hidden="true" />
              {filterLabels[key]}
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: isAlert && isActive ? 'var(--color-alert-text)' : 'var(--color-text-tertiary)',
                }}
              >
                {counts[key]}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Results Summary Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-3)',
          fontFamily: 'var(--font-family-mono)',
          fontSize: '0.75rem',
          color: 'var(--color-text-tertiary)',
        }}
      >
        <span>
          {filtered.length === 0
            ? t('search.noResults')
            : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}${query ? ` for "${query}"` : ''}`}
        </span>
        {(query || filter !== 'all') && (
          <button
            id="btn-clear-filters"
            onClick={() => { setQuery(''); setFilter('all'); }}
            aria-label="Clear all filters"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
              background: 'none',
              border: 'none',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-family-mono)',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            <X size={11} aria-hidden="true" />
            {t('search.clearFilters')}
          </button>
        )}
      </div>

      {/* Results Table */}
      <section aria-label="Search results">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <Search className="empty-state__icon" aria-hidden="true" />
            <p className="empty-state__title">No parts match your search</p>
            <p className="empty-state__text">
              {query
                ? `Nothing found for "${query}". Try a different name, serial number, or ID.`
                : 'No parts match the active filter. Try selecting a different status.'}
            </p>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table" aria-label="Search results table">
              <thead>
                <tr>
                  <th scope="col">{t('inventory.tableId')}</th>
                  {cols.map(col => (
                    <th
                      key={col.key}
                      scope="col"
                      onClick={() => handleSort(col.key)}
                      aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {col.label}
                        <SortIcon active={sortKey === col.key} dir={sortDir} />
                      </span>
                    </th>
                  ))}
                  <th scope="col" className="right">{t('inventory.tableStatus')}</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {filtered.map((p: any) => {
                    const status = getPartStatus(p);
                    const isAlertRow = status === 'expired' || status === 'warning';
                    return (
                      <motion.tr
                        key={p.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={isAlertRow ? { background: 'var(--color-alert-bg)' } : {}}
                      >
                        <td className="mono" style={{ fontSize: '0.75rem' }}>
                          #{String(p.id).padStart(4, '0')}
                        </td>
                        <td className="strong">{p.part_name}</td>
                        <td className="mono" style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                          {p.serial_number || '—'}
                        </td>
                        <td className="center">
                          <span className="badge badge--neutral">{p.quantity}</span>
                        </td>
                        <td className="mono" style={{ fontSize: '0.75rem' }}>
                          {p.expiry_date ? dayjs(p.expiry_date).format('MMM DD, YYYY HH:mm') : '—'}
                        </td>
                        <td className="right">
                          <StatusBadge part={p} />
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </section>
    </motion.div>
  );
}
