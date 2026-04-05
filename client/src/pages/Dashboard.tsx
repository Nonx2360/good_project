import { useEffect } from 'react';
import { useStore } from '../store';
import { AlertTriangle, Clock, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import Typewriter from 'typewriter-effect';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import dayjs from 'dayjs';

const COLORS = ['#10B981', '#F59E0B', '#EF4444'];

export default function Dashboard() {
  const { parts, stats, fetchParts } = useStore();

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  const pieData = [
    { name: 'Healthy', value: stats.good },
    { name: 'Expiring Soon', value: stats.warning },
    { name: 'Expired', value: stats.expired },
  ];

  const statCards = [
    { title: 'Total Parts', value: stats.total, icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'Expiring Soon', value: stats.warning, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-100' },
    { title: 'Expired Parts', value: stats.expired, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-100' }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 h-full flex flex-col"
    >
      <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 flex flex-wrap items-center gap-2 md:gap-3">
        Dashboard Overview
        <span className="text-sm md:text-xl font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          <Typewriter
            options={{
              strings: ['Real-time monitoring', 'Automated tracking', 'Stay up to date'],
              autoStart: true,
              loop: true,
              delay: 50,
            }}
          />
        </span>
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          {statCards.map((card, i) => (
            <motion.div 
              key={card.title}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-100 dark:border-slate-700 flex items-center justify-between"
            >
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">{card.title}</p>
                <p className={`text-4xl font-bold ${card.color}`}>
                  {card.value}
                </p>
              </div>
              <div className={`w-14 h-14 ${card.bg} ${card.color} rounded-full flex items-center justify-center shadow-inner`}>
                <card.icon className="w-7 h-7" />
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Recharts Pie Chart */}
        <div className="col-span-1 bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 border border-slate-100 flex flex-col justify-center items-center h-full">
          <h3 className="text-sm font-bold text-slate-600 mb-2">Inventory Health</h3>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={pieData} innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value" stroke="none">
                {pieData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(val: any) => [val, 'Parts']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-100 dark:border-slate-700 p-6 overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Critical Items (Expiring within 30 days)
        </h3>
        
        <div className="flex-1 overflow-auto pr-2">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="uppercase tracking-wider border-b-2 border-slate-200 dark:border-slate-700 pt-4 pb-4 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <tr>
                <th className="px-6 py-4 font-medium text-slate-500">Part Name</th>
                <th className="px-6 py-4 font-medium text-slate-500">SN</th>
                <th className="px-6 py-4 font-medium text-slate-500 text-center">Quantity</th>
                <th className="px-6 py-4 font-medium text-slate-500 text-right">Status / Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {parts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-500">Loading...</td>
                </tr>
              ) : parts.map((part: any, i: number) => {
                const days = dayjs(part.expiry_date).diff(dayjs(), 'day');
                if (days > 30) return null;
                
                return (
                  <motion.tr 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={part.id} 
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium">{part.part_name}</td>
                    <td className="px-6 py-4 text-slate-500">{part.serial_number || 'N/A'}</td>
                    <td className="px-6 py-4 text-center">
                       <span className="bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-md font-medium">
                          {part.quantity}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2 items-center">
                      {days < 0 ? (
                        <span className="px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">
                          Expired {Math.abs(days)} days ago
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200">
                          {days === 0 ? 'Expires Today' : `In ${days} days`}
                        </span>
                      )}
                      <span className="text-slate-400 ml-2 font-mono text-xs">{dayjs(part.expiry_date).format('MMM DD, YYYY')}</span>
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
