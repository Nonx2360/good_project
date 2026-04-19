import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { AlertTriangle, ShieldCheck, Package, Timer, CalendarClock, TrendingDown, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { useLanguage } from '../context/LanguageContext';

dayjs.extend(utc);
dayjs.extend(timezone);

function parseBangkokDate(raw: string): dayjs.Dayjs {
  if (/T|\d{2}:\d{2}/.test(raw)) return dayjs(raw);
  return dayjs.tz(raw, 'Asia/Bangkok');
}

function CountdownTimer({ expiryDate }: { expiryDate: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    const update = () => {
      const now = dayjs();
      const target = parseBangkokDate(expiryDate);
      const diff = target.diff(now);

      if (diff <= 0) {
        setTimeLeft(t('dashboard.statExpired').toUpperCase());
        return;
      }

      const totalSec = Math.floor(diff / 1000);
      const d = Math.floor(totalSec / 86400);
      const h = Math.floor((totalSec % 86400) / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;

      setTimeLeft(
        `${d}d ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      );
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiryDate, t]);

  return (
    <span
      className="badge badge--alert"
      style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.7rem' }}
    >
      <Timer size={10} aria-hidden="true" />
      {timeLeft}
    </span>
  );
}

const PIE_COLORS = ['#5E667A', '#9BA1B0', '#FF453A', '#2B303B'];

export default function Dashboard() {
  const { parts, stats, fetchParts } = useStore();
  const { t } = useLanguage();

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  const pieData = [
    { name: t('dashboard.statInStock'), value: stats.inStock },
    { name: t('dashboard.statActive'), value: stats.good },
    { name: t('dashboard.statExpiring'), value: stats.warning },
    { name: t('dashboard.statExpired'), value: stats.expired },
  ].filter(d => d.value > 0);

  const statCards = [
    {
      id: 'in-stock',
      title: t('dashboard.statInStock'),
      value: stats.inStock,
      icon: Package,
      isAlert: false,
    },
    {
      id: 'active',
      title: t('dashboard.statActive'),
      value: stats.active,
      icon: ShieldCheck,
      isAlert: false,
    },
    {
      id: 'expiring',
      title: t('dashboard.statExpiring'),
      value: stats.warning,
      icon: Clock,
      isAlert: stats.warning > 0,
    },
    {
      id: 'expired',
      title: t('dashboard.statExpired'),
      value: stats.expired,
      icon: AlertTriangle,
      isAlert: stats.expired > 0,
    },
  ];

  const criticalParts = parts.filter((p: any) => {
    if (p.status !== 'active' || !p.expiry_date) return false;
    const days = dayjs(p.expiry_date).diff(dayjs(), 'day');
    return days <= 30;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Page Header */}
      <header className="page-header">
        <div>
          <h1 className="page-title">{t('dashboard.title')}</h1>
          <p className="page-subtitle">{t('dashboard.subtitle')}</p>
        </div>
      </header>

      {/* Stat Cards — flat grid, number-dominant */}
      <section aria-label="Summary statistics" className="dashboard-grid">
        {statCards.map((card, i) => (
          <motion.article
            key={card.id}
            id={`stat-${card.id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`stat-card${card.isAlert ? ' stat-card--alert' : ''}`}
            aria-label={`${card.title}: ${card.value}`}
          >
            <card.icon className="stat-card__icon" aria-hidden="true" />
            <p className="stat-card__label">{card.title}</p>
            <p
              className="stat-card__value"
              style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}
            >
              {card.value}
            </p>
          </motion.article>
        ))}
      </section>

      {/* Chart + Mini Metrics */}
      <section aria-label="Visual breakdown" className="widget-grid">
        {/* Pie Chart */}
        <div className="widget">
          <h2 className="widget__title">{t('dashboard.chartTitle')}</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    fontFamily: 'var(--font-family-mono)',
                    fontSize: '12px',
                    color: 'var(--color-text-primary)',
                  }}
                  formatter={(val: any, name: any) => [`${val} ${t('dashboard.itemsCount')}`, name]}
                />
                <Legend
                  iconType="circle"
                  iconSize={7}
                  wrapperStyle={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-family-mono)',
                    color: 'var(--color-text-secondary)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ border: 'none', padding: 'var(--space-6) 0' }}>
              <Package className="empty-state__icon" aria-hidden="true" />
              <p className="empty-state__text">
                No parts tracked yet — add inventory to see the breakdown.
              </p>
            </div>
          )}
        </div>

        {/* Secondary metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--space-4)', alignContent: 'start' }}>
          {[
            { id: 'total-parts', Icon: CalendarClock, value: stats.total, label: t('dashboard.totalParts') },
            { id: 'critical-count', Icon: Timer, value: criticalParts.length, label: t('dashboard.criticalItems'), alert: criticalParts.length > 0 },
            { id: 'expired-count', Icon: TrendingDown, value: stats.expired, label: t('dashboard.needReplacement'), alert: stats.expired > 0 },
          ].map(({ id, Icon, value, label, alert }) => (
            <article
              key={id}
              id={id}
              className={`widget${alert ? ' stat-card--alert' : ''}`}
              style={{ alignItems: 'flex-start' }}
              aria-label={`${label}: ${value}`}
            >
              <Icon
                size={18}
                style={{ color: alert ? 'var(--color-alert-base)' : 'var(--color-text-tertiary)', marginBottom: 'var(--space-3)' }}
                aria-hidden="true"
              />
              <p
                style={{
                  fontFamily: 'var(--font-family-mono)',
                  fontSize: '2rem',
                  fontWeight: 600,
                  lineHeight: 1.1,
                  color: alert ? 'var(--color-alert-base)' : 'var(--color-text-primary)',
                }}
              >
                {value}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                {label}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Critical Items Table */}
      <section aria-label="Critical expiry items" style={{ marginTop: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <div>
            <h2 className="page-title" style={{ fontSize: '1rem' }}>{t('dashboard.criticalItems')}</h2>
            <p className="page-subtitle">{t('dashboard.criticalSubtitle')}</p>
          </div>
          {criticalParts.length > 0 && (
            <span className="badge badge--alert">
              <AlertTriangle size={10} aria-hidden="true" />
              {criticalParts.length} {t('dashboard.itemsCount')}
            </span>
          )}
        </div>

        <div className="data-table-container">
          <table className="data-table" aria-label="Parts expiring within 30 days">
            <thead>
              <tr>
                <th scope="col">{t('dashboard.tablePartName')}</th>
                <th scope="col">{t('dashboard.tableSerialNo')}</th>
                <th scope="col" className="center">{t('dashboard.tableQty')}</th>
                <th scope="col">{t('dashboard.tableTimeRemaining')}</th>
                <th scope="col" className="right">{t('dashboard.tableExpiresOn')}</th>
              </tr>
            </thead>
            <tbody>
              {criticalParts.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 'var(--space-8) var(--space-4)', textAlign: 'center' }}>
                    <ShieldCheck
                      size={36}
                      style={{ color: 'var(--color-text-tertiary)', margin: '0 auto var(--space-3)' }}
                      aria-hidden="true"
                    />
                    <p style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>{t('dashboard.noCritical')}</p>
                    <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.8rem', marginTop: 'var(--space-1)' }}>
                      All tracked parts are within their valid service window.
                    </p>
                  </td>
                </tr>
              ) : criticalParts.map((part: any, i: number) => {
                const days = dayjs(part.expiry_date).diff(dayjs(), 'day');
                return (
                  <motion.tr
                    key={part.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <td className="strong">{part.part_name}</td>
                    <td className="mono" style={{ fontSize: '0.75rem' }}>
                      {part.serial_number || '—'}
                    </td>
                    <td className="center">
                      <span className="badge badge--neutral">{part.quantity}</span>
                    </td>
                    <td>
                      {days < 0 ? (
                        <span className="badge badge--alert">
                          <AlertTriangle size={9} aria-hidden="true" />
                          {t('inventory.statusExpired')} {Math.abs(days)}d ago
                        </span>
                      ) : (
                        <CountdownTimer expiryDate={part.expiry_date} />
                      )}
                    </td>
                    <td className="right mono" style={{ fontSize: '0.75rem' }}>
                      {dayjs(part.expiry_date).format('DD MMM YYYY, HH:mm')}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </motion.div>
  );
}
