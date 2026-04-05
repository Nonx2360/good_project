import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { addPart, updatePart, deletePart, activatePart, deactivatePart } from '../api';
import { useStore } from '../store';
import { Plus, Edit2, Trash2, Download, Upload, X, FileSpreadsheet, FileDown, Play, Square, Clock, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Tooltip } from 'react-tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { useLanguage } from '../context/LanguageContext';

dayjs.extend(utc);
dayjs.extend(timezone);

const MySwal = withReactContent(Swal);

// Zod Schema — no expiry_date anymore
const partSchema = z.object({
  part_name: z.string().min(1, 'Part Name is required'),
  serial_number: z.string().optional(),
  quantity: z.number().min(0, 'Quantity cannot be negative'),
});
type PartFormData = z.infer<typeof partSchema>;

export default function PartsManagement() {
  const { parts, fetchParts } = useStore();
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activateModalOpen, setActivateModalOpen] = useState(false);
  const [activatingPartId, setActivatingPartId] = useState<number | null>(null);
  const [customDays, setCustomDays] = useState(30);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<PartFormData>({
    resolver: zodResolver(partSchema),
    defaultValues: { quantity: 1 }
  });

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  const onSubmit = async (data: PartFormData) => {
    try {
      if (editingId) {
        await updatePart(editingId, data);
        toast.success(t('inventory.toastSaveSuccess'));
      } else {
        await addPart(data);
        toast.success(t('inventory.toastAddSuccess'));
      }
      setIsModalOpen(false);
      reset();
      setEditingId(null);
      fetchParts();
    } catch (e) {
      toast.error('Failed to save part');
    }
  };

  const handleAdd = () => {
    setEditingId(null);
    reset();
    setIsModalOpen(true);
  };

  const handleEdit = (part: any) => {
    setEditingId(part.id);
    setValue('part_name', part.part_name);
    setValue('serial_number', part.serial_number || '');
    setValue('quantity', part.quantity);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    MySwal.fire({
      title: t('inventory.confirmDeleteTitle'),
      text: t('inventory.confirmDeleteText'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: t('inventory.confirmDeleteBtn'),
      cancelButtonText: t('inventory.btnCancel')
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deletePart(id);
          toast.success(t('inventory.toastDeleteSuccess'));
          fetchParts();
        } catch (e) {
          toast.error('Failed to delete');
        }
      }
    });
  };

  const handleActivateClick = (id: number) => {
    setActivatingPartId(id);
    setCustomDays(30);
    setActivateModalOpen(true);
  };

  const handleActivateConfirm = async (days: number) => {
    if (!activatingPartId) return;
    try {
      await activatePart(activatingPartId, days);
      toast.success(t('inventory.toastActivateSuccess', { days }));
      setActivateModalOpen(false);
      setActivatingPartId(null);
      fetchParts();
    } catch (e) {
      toast.error('Failed to activate part');
    }
  };

  const handleDeactivate = async (id: number) => {
    MySwal.fire({
      title: t('inventory.confirmDeactivateTitle'),
      text: t('inventory.confirmDeactivateText'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#6366f1',
      cancelButtonColor: '#64748b',
      confirmButtonText: t('inventory.confirmDeactivateBtn'),
      cancelButtonText: t('inventory.btnCancel')
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deactivatePart(id);
          toast.success(t('inventory.toastDeactivateSuccess'));
          fetchParts();
        } catch (e) {
          toast.error('Failed to deactivate part');
        }
      }
    });
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(parts.map((p: any) => ({
      [t('inventory.tableName')]: p.part_name,
      [t('inventory.tableSerial')]: p.serial_number,
      [t('inventory.tableQty')]: p.quantity,
      [t('inventory.tableStatus')]: p.status || 'in_stock',
      [t('inventory.tableExpiry')]: p.expiry_date || '',
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Parts");
    XLSX.writeFile(wb, "MachineParts.xlsx");
  };

  const downloadExample = () => {
    const sampleData = [
      { [t('inventory.tableName')]: 'Hydraulic Pump',    [t('inventory.tableSerial')]: 'HYD-0001', [t('inventory.tableQty')]: 2 },
      { [t('inventory.tableName')]: 'Air Filter',        [t('inventory.tableSerial')]: 'AIR-0042', [t('inventory.tableQty')]: 5 },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws['!cols'] = [{ wch: 24 }, { wch: 18 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Example Import');
    XLSX.writeFile(wb, 'MachineTrack_ImportExample.xlsx');
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        let imported = 0;
        for (const row of data as any[]) {
          const part_name = row[t('inventory.tableName')] || row.part_name;
          const serial_number = row[t('inventory.tableSerial')] || row.serial_number || '';
          const quantity = parseInt(row[t('inventory.tableQty')] || row.quantity || '1');
          
          if (part_name) {
            await addPart({ part_name, serial_number, quantity });
            imported++;
          }
        }
        toast.success(t('inventory.importSuccess', { count: imported }));
        fetchParts();
      } catch (err) {
        toast.error('Failed to parse Excel file.');
      }
    };
    reader.readAsBinaryString(file);
  }, [fetchParts, t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'text/csv': ['.csv'] },
    noClick: true 
  });

  const getStatusBadge = (part: any) => {
    if (part.status === 'in_stock' || !part.status) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-600">
          <Package className="w-3 h-3" /> {t('inventory.statusInStock')}
        </span>
      );
    }
    if (part.expiry_date) {
      const days = dayjs(part.expiry_date).diff(dayjs(), 'day');
      if (days < 0) {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-xs font-semibold border border-red-200">
            <AlertTriangle className="w-3 h-3" /> {t('inventory.statusExpired')}
          </span>
        );
      }
      if (days <= 30) {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-semibold border border-amber-200">
            <Clock className="w-3 h-3" /> {t('inventory.statusExpiring', { days })}
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold border border-emerald-200">
          <CheckCircle className="w-3 h-3" /> {t('inventory.statusActive')}
        </span>
      );
    }
    return null;
  };

  const presets = [
    { label: t('inventory.preset6Months'), days: 183 },
    { label: t('inventory.preset12Months'), days: 365 },
    { label: t('inventory.preset1Year'), days: 365 },
    { label: t('inventory.preset2Years'), days: 730 },
  ];

  return (
    <div {...getRootProps()} className="p-4 md:p-8 h-full flex flex-col relative focus:outline-none">
      <input {...getInputProps()} id="excel-upload" />
      {isDragActive && (
        <div className="absolute inset-0 z-50 bg-blue-500/10 backdrop-blur-sm border-4 border-dashed border-blue-500 rounded-3xl flex items-center justify-center">
          <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl">
            <FileSpreadsheet className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-bounce" />
            <h2 className="text-2xl font-bold text-blue-600">Drop Excel File Here</h2>
            <p className="text-slate-500 mt-2">{t('inventory.ttImport')}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h2 className="text-2xl md:text-3xl font-bold">{t('inventory.title')}</h2>
        <div className="flex flex-wrap gap-2 md:gap-3 w-full md:w-auto">
          <button 
            data-tooltip-id="tt" data-tooltip-content={t('inventory.ttImport')}
            onClick={() => document.getElementById('excel-upload')?.click()} 
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm transition-colors font-medium">
            <Upload className="w-4 h-4 text-blue-500" /> {t('inventory.import')}
          </button>
          
          <button onClick={exportExcel} data-tooltip-id="tt" data-tooltip-content={t('inventory.ttExport')} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm transition-colors font-medium">
            <Download className="w-4 h-4 text-green-500" /> {t('inventory.export')}
          </button>

          <button
            onClick={downloadExample}
            data-tooltip-id="tt"
            data-tooltip-content={t('inventory.ttExample')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-dashed border-violet-300 hover:bg-violet-50 text-violet-600 rounded-lg shadow-sm transition-colors font-medium"
          >
            <FileDown className="w-4 h-4" /> {t('inventory.exampleFormat')}
          </button>

          <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg shadow-md transition-all transform hover:scale-105 font-medium">
            <Plus className="w-4 h-4" /> {t('inventory.addPart')}
          </button>
        </div>
      </div>

      <motion.div layout className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col relative group">
        <div className="overflow-auto flex-1 p-0 m-0">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">{t('inventory.tableId')}</th>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">{t('inventory.tableName')}</th>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">{t('inventory.tableSerial')}</th>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-center">{t('inventory.tableQty')}</th>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">{t('inventory.tableStatus')}</th>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">{t('inventory.tableExpiry')}</th>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-right">{t('inventory.tableActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <AnimatePresence>
                {parts.map((p: any) => {
                   return (
                  <motion.tr 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -50 }} layout
                    key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">#{p.id.toString().padStart(4, '0')}</td>
                    <td className="px-6 py-4 font-medium">{p.part_name}</td>
                    <td className="px-6 py-4 text-slate-500">{p.serial_number || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-3 py-1 rounded-full font-bold">
                        {p.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(p)}</td>
                    <td className="px-6 py-4">
                      {p.expiry_date ? (
                        <span className="text-slate-700 dark:text-slate-300 font-mono text-xs">
                          {dayjs(p.expiry_date).format('MMM DD, YYYY HH:mm')}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">{t('inventory.notActivated')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {(p.status === 'in_stock' || !p.status) ? (
                          <button 
                            data-tooltip-id="tt" data-tooltip-content={t('inventory.ttActivate')}
                            onClick={() => handleActivateClick(p.id)} 
                            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded border border-transparent hover:border-green-200 transition-colors shadow-sm"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        ) : p.status === 'active' ? (
                          <button 
                            data-tooltip-id="tt" data-tooltip-content={t('inventory.ttDeactivate')}
                            onClick={() => handleDeactivate(p.id)} 
                            className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded border border-transparent hover:border-orange-200 transition-colors shadow-sm"
                          >
                            <Square className="w-4 h-4" />
                          </button>
                        ) : null}

                        <button data-tooltip-id="tt" data-tooltip-content={t('inventory.ttEdit')} onClick={() => handleEdit(p)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded border border-transparent hover:border-blue-200 transition-colors shadow-sm">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button data-tooltip-id="tt" data-tooltip-content={t('inventory.ttDelete')} onClick={() => handleDelete(p.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded border border-transparent hover:border-red-200 transition-colors shadow-sm">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );})}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>
      <Tooltip id="tt" place="top" style={{ borderRadius: '8px', padding: '6px 12px', fontSize: '12px' }} />

      {/* Add/Edit Part Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden m-4"
            >
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                  {editingId ? t('inventory.editModalTitle') : t('inventory.addModalTitle')}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-sm">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">{t('inventory.labelPartName')} <span className="text-red-500">*</span></label>
                    <input {...register('part_name')} type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 dark:bg-slate-900/50 transition-all font-medium" />
                    {errors.part_name && <p className="text-red-500 text-xs mt-1">{errors.part_name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">{t('inventory.labelSerialNo')}</label>
                    <input {...register('serial_number')} type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 dark:bg-slate-900/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">{t('inventory.labelQty')}</label>
                    <input {...register('quantity', { valueAsNumber: true })} type="number" min="0" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 dark:bg-slate-900/50 transition-all" />
                    {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity.message}</p>}
                  </div>
                  {!editingId && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                      <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{t('inventory.labelInStockInfo')}</span>
                    </div>
                  )}
                </div>
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 font-medium text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors">{t('inventory.btnCancel')}</button>
                  <button type="submit" className="px-6 py-2 font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-md transform hover:scale-105">
                    {editingId ? t('inventory.btnSaveChanges') : t('inventory.btnAddStock')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden m-4"
            >
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30">
                <h3 className="text-lg font-bold text-green-800 dark:text-green-200 flex items-center gap-2"><Play className="w-5 h-5" /> {t('inventory.activateModalTitle')}</h3>
                <button onClick={() => setActivateModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full bg-white dark:bg-slate-800 shadow-sm"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">{t('inventory.activateModalSub')}</p>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {presets.map((p) => (
                    <button key={p.label} onClick={() => handleActivateConfirm(p.days)} className="px-4 py-3 border-2 border-green-100 dark:border-green-800 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-xl text-green-700 dark:text-green-300 font-semibold transition-all text-sm hover:scale-105">{p.label}</button>
                  ))}
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">{t('inventory.customDuration')}</label>
                  <div className="flex gap-3">
                    <input type="number" min="1" value={customDays} onChange={(e) => setCustomDays(parseInt(e.target.value) || 1)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-green-500 outline-none bg-slate-50 dark:bg-slate-900/50 transition-all font-mono" />
                    <button onClick={() => handleActivateConfirm(customDays)} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow-md transition-all hover:scale-105">{t('inventory.btnActivate')}</button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">{t('inventory.expiresOnPrefix')} {dayjs().add(customDays, 'day').format('MMM DD, YYYY')}</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
