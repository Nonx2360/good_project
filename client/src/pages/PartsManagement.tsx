import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { addPart, updatePart, deletePart } from '../api';
import { useStore } from '../store';
import { Plus, Edit2, Trash2, Download, Upload, X, FileSpreadsheet } from 'lucide-react';
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

const MySwal = withReactContent(Swal);

// Zod Schema
const partSchema = z.object({
  part_name: z.string().min(1, 'Part Name is required'),
  serial_number: z.string().optional(),
  quantity: z.number().min(0, 'Quantity cannot be negative'),
  expiry_date: z.string().min(1, 'Expiry Date is required'),
});
type PartFormData = z.infer<typeof partSchema>;

export default function PartsManagement() {
  const { parts, fetchParts } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

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
        toast.success('Part updated successfully');
      } else {
        await addPart(data);
        toast.success('Part added successfully');
      }
      setIsModalOpen(false);
      reset();
      setEditingId(null);
      fetchParts();
    } catch (e) {
      toast.error('Failed to save part');
    }
  };

  const handleEdit = (part: any) => {
    setEditingId(part.id);
    setValue('part_name', part.part_name);
    setValue('serial_number', part.serial_number || '');
    setValue('quantity', part.quantity);
    setValue('expiry_date', part.expiry_date);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    MySwal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deletePart(id);
          toast.success('Deleted successfully');
          fetchParts();
        } catch (e) {
          toast.error('Failed to delete');
        }
      }
    });
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(parts.map((p: any) => ({
      'Part Name': p.part_name,
      'Serial Number': p.serial_number,
      'Quantity': p.quantity,
      'Expiry Date': p.expiry_date
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Parts");
    XLSX.writeFile(wb, "MachineParts.xlsx");
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
          const part_name = row['Part Name'] || row.part_name;
          const serial_number = row['Serial Number'] || row.serial_number || '';
          const quantity = parseInt(row['Quantity'] || row.quantity || '1');
          let expiry_date = row['Expiry Date'] || row.expiry_date;
          
          if (part_name && expiry_date) {
            if (typeof expiry_date === 'number') {
               const date = new Date((expiry_date - (25567 + 2)) * 86400 * 1000);
               expiry_date = date.toISOString().split('T')[0];
            }
            await addPart({ part_name, serial_number, quantity, expiry_date });
            imported++;
          }
        }
        toast.success(`Imported ${imported} parts successfully`);
        fetchParts();
      } catch (err) {
        console.error(err);
        toast.error('Failed to parse Excel file.');
      }
    };
    reader.readAsBinaryString(file);
  }, [fetchParts]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'text/csv': ['.csv'] },
    noClick: true 
  });

  return (
    <div {...getRootProps()} className="p-8 h-full flex flex-col relative focus:outline-none">
      <input {...getInputProps()} id="excel-upload" />
      {isDragActive && (
        <div className="absolute inset-0 z-50 bg-blue-500/10 backdrop-blur-sm border-4 border-dashed border-blue-500 rounded-3xl flex items-center justify-center">
          <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl">
            <FileSpreadsheet className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-bounce" />
            <h2 className="text-2xl font-bold text-blue-600">Drop Excel File Here</h2>
            <p className="text-slate-500 mt-2">Release to completely sync your inventory.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h2 className="text-2xl md:text-3xl font-bold">Parts Inventory</h2>
        <div className="flex flex-wrap gap-2 md:gap-3 w-full md:w-auto">
          <button 
            data-tooltip-id="tt" data-tooltip-content="Drag & Drop an Excel file or click to import"
            onClick={() => document.getElementById('excel-upload')?.click()} 
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm transition-colors font-medium">
            <Upload className="w-4 h-4 text-blue-500" /> Import
          </button>
          
          <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm transition-colors font-medium">
            <Download className="w-4 h-4 text-green-500" /> Export
          </button>

          <button onClick={() => { setEditingId(null); reset(); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg shadow-md transition-all transform hover:scale-105 font-medium">
            <Plus className="w-4 h-4" /> Add Part
          </button>
        </div>
      </div>

      <motion.div layout className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col relative group">
        <div className="overflow-auto flex-1 p-0 m-0">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">ID</th>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Part Name</th>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Serial No.</th>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-center">Quantity</th>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Expiry Date</th>
                <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <AnimatePresence>
                {parts.map((p: any) => {
                   const isExpired = dayjs(p.expiry_date).isBefore(dayjs(), 'day');
                   return (
                  <motion.tr 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -50 }}
                    layout
                    key={p.id} 
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">#{p.id.toString().padStart(4, '0')}</td>
                    <td className="px-6 py-4 font-medium">{p.part_name}</td>
                    <td className="px-6 py-4 text-slate-500">{p.serial_number || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-3 py-1 rounded-full font-bold">
                        {p.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       {isExpired ? (
                          <span className="text-red-500 font-bold">{dayjs(p.expiry_date).format('MMM DD, YYYY')}</span>
                       ) : (
                          <span className="text-slate-700 dark:text-slate-300 font-medium">{dayjs(p.expiry_date).format('MMM DD, YYYY')}</span>
                       )}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button data-tooltip-id="tt" data-tooltip-content="Edit Part" onClick={() => handleEdit(p)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded border border-transparent hover:border-blue-200 transition-colors shadow-sm">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button data-tooltip-id="tt" data-tooltip-content="Delete forever" onClick={() => handleDelete(p.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded border border-transparent hover:border-red-200 transition-colors shadow-sm">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                )})}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>
      <Tooltip id="tt" place="top" style={{ borderRadius: '8px', padding: '6px 12px', fontSize: '12px' }} />

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden m-4"
            >
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                  {editingId ? 'Edit Part' : 'Add New Part'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-sm">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Part Name <span className="text-red-500">*</span></label>
                    <input {...register('part_name')} type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 dark:bg-slate-900/50 transition-all font-medium" placeholder="e.g. Hydraulic Pump" />
                    {errors.part_name && <p className="text-red-500 text-xs mt-1">{errors.part_name.message}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Serial Number</label>
                    <input {...register('serial_number')} type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 dark:bg-slate-900/50 transition-all" placeholder="e.g. HYD-2938" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Quantity</label>
                      <input {...register('quantity', { valueAsNumber: true })} type="number" min="0" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 dark:bg-slate-900/50 transition-all" />
                      {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Expiry Date <span className="text-red-500">*</span></label>
                      <input {...register('expiry_date')} type="date" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 dark:bg-slate-900/50 transition-all" />
                      {errors.expiry_date && <p className="text-red-500 text-xs mt-1">{errors.expiry_date.message}</p>}
                    </div>
                  </div>
                </div>
                
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 font-medium text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="px-6 py-2 font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all shadow-md transform hover:scale-105">
                    {editingId ? 'Save Changes' : 'Create Part'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
