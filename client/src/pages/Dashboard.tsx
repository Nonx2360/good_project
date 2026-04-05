import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { AlertTriangle, Clock, ShieldCheck, Package, Timer, CalendarClock, TrendingDown } from 'lucide-react';
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
        `${d}d ${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`
      );
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiryDate, t]);

  return <span className="font-mono text-xs tabular-nums tracking-wide">{timeLeft}</span>;
}

const PIE_COLORS = ['#818CF8', '#34D399', '#FBBF24', '#F87171'];

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
      title: t('dashboard.statInStock'),
      value: stats.inStock,
      icon: Package,
      gradient: 'from-indigo-500 to-violet-500',
      iconBg: 'bg-indigo-500/10',
      iconColor: 'text-indigo-500',
    },
    {
      title: t('dashboard.statActive'),
      value: stats.active,
      icon: ShieldCheck,
      gradient: 'from-emerald-500 to-teal-500',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500',
    },
    {
      title: t('dashboard.statExpiring'),
      value: stats.warning,
      icon: Clock,
      gradient: 'from-amber-500 to-orange-500',
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
    },
    {
      title: t('dashboard.statExpired'),
      value: stats.expired,
      icon: AlertTriangle,
      gradient: 'from-rose-500 to-red-500',
      iconBg: 'bg-rose-500/10',
      iconColor: 'text-rose-500',
    },
  ];

  const criticalParts = parts.filter((p: any) => {
    if (p.status !== 'active' || !p.expiry_date) return false;
    const days = dayjs(p.expiry_date).diff(dayjs(), 'day');
    return days <= 30;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 md:p-8 h-full flex flex-col gap-6"
    >
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t('dashboard.title')}</h2>
        <p className="text-slate-400 text-sm mt-1">{t('dashboard.subtitle')}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">{card.title}</p>
              <div className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight">{card.value}</p>
            <div className={`h-1 w-12 rounded-full bg-gradient-to-r ${card.gradient} mt-3 opacity-60`} />
          </motion.div>
        ))}
      </div>

      {/* Middle Section: Chart + Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pie Chart */}
        <div className="md:col-span-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">{t('dashboard.chartTitle')}</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value" stroke="none">
                  {pieData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                  formatter={(val: any, name: any) => [`${val} ${t('dashboard.itemsCount')}`, name]}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">No data yet</div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 flex flex-col items-center justify-center text-center gap-2">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <CalendarClock className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-slate-400 font-medium">{t('dashboard.totalParts')}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 flex flex-col items-center justify-center text-center gap-2">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Timer className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-2xl font-bold">{criticalParts.length}</p>
            <p className="text-xs text-slate-400 font-medium">{t('dashboard.criticalItems')}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 flex flex-col items-center justify-center text-center gap-2">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-rose-500" />
            </div>
            <p className="text-2xl font-bold">{stats.expired}</p>
            <p className="text-xs text-slate-400 font-medium">{t('dashboard.needReplacement')}</p>
          </div>
        </div>
      </div>

      {/* Critical Items Table */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">{t('dashboard.criticalItems')}</h3>
              <p className="text-xs text-slate-400">{t('dashboard.criticalSubtitle')}</p>
            </div>
          </div>
          <span className="text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 px-2.5 py-1 rounded-full">{criticalParts.length} {t('dashboard.itemsCount')}</span>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-slate-50 dark:bg-slate-900 z-10">
              <tr>
                <th className="px-5 py-3 font-medium text-slate-400">{t('dashboard.tablePartName')}</th>
                <th className="px-5 py-3 font-medium text-slate-400">{t('dashboard.tableSerialNo')}</th>
                <th className="px-5 py-3 font-medium text-slate-400 text-center">{t('dashboard.tableQty')}</th>
                <th className="px-5 py-3 font-medium text-slate-400">{t('dashboard.tableTimeRemaining')}</th>
                <th className="px-5 py-3 font-medium text-slate-400 text-right">{t('dashboard.tableExpiresOn')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {criticalParts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <ShieldCheck className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm font-medium">{t('dashboard.noCritical')}</p>
                  </td>
                </tr>
              ) : criticalParts.map((part: any, i: number) => {
                const days = dayjs(part.expiry_date).diff(dayjs(), 'day');
                return (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    key={part.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-medium">{part.part_name}</td>
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{part.serial_number || '—'}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-xs font-semibold">{part.quantity}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      {days < 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 text-red-600 text-xs font-semibold border border-red-100">
                          <AlertTriangle className="w-3 h-3" />
                          {t('inventory.statusExpired')} {Math.abs(days)}d ago
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-600 text-xs font-semibold border border-amber-100">
                          <Timer className="w-3 h-3" />
                          <CountdownTimer expiryDate={part.expiry_date} />
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-400 font-mono text-xs">
                      {dayjs(part.expiry_date).format('DD MMM YYYY, HH:mm')}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
