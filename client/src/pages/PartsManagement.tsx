import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { addPart, updatePart, deletePart, activatePart, deactivatePart } from '../api';
import { useStore } from '../store';
import {
  Plus, Edit2, Trash2, Download, Upload, X,
  FileSpreadsheet, FileDown, Play, Square,
  Clock, Package, AlertTriangle, CheckCircle
} from 'lucide-react';
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

const partSchema = z.object({
  part_name: z.string().min(1, 'Part name is required'),
  serial_number: z.string().optional(),
  quantity: z.number().min(0, 'Quantity cannot be negative'),
});

type PartFormData = z.infer<typeof partSchema>;

function getStatusBadge(part: any, t: (key: string, params?: any) => string) {
  if (part.status === 'in_stock' || !part.status) {
    return (
      <span className="badge badge--neutral">
        <Package size={9} aria-hidden="true" />
        {t('inventory.statusInStock')}
      </span>
    );
  }

  if (part.expiry_date) {
    const days = dayjs(part.expiry_date).diff(dayjs(), 'day');

    if (days < 0) {
      return (
        <span className="badge badge--alert">
          <AlertTriangle size={9} aria-hidden="true" />
          {t('inventory.statusExpired')}
        </span>
      );
    }
    if (days <= 30) {
      return (
        <span className="badge badge--alert">
          <Clock size={9} aria-hidden="true" />
          {t('inventory.statusExpiring', { days })}
        </span>
      );
    }
    return (
      <span className="badge badge--neutral">
        <CheckCircle size={9} aria-hidden="true" />
        {t('inventory.statusActive')}
      </span>
    );
  }
  return null;
}

export default function PartsManagement() {
  const { parts, fetchParts } = useStore();
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activateModalOpen, setActivateModalOpen] = useState(false);
  const [activatingPartId, setActivatingPartId] = useState<number | null>(null);
  const [customDays, setCustomDays] = useState(30);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PartFormData>({
    resolver: zodResolver(partSchema),
    defaultValues: { quantity: 1 },
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
    } catch {
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
      confirmButtonColor: '#FF453A',
      cancelButtonColor: '#2B303B',
      confirmButtonText: t('inventory.confirmDeleteBtn'),
      cancelButtonText: t('inventory.btnCancel'),
      background: '#151821',
      color: '#F2F3F5',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deletePart(id);
          toast.success(t('inventory.toastDeleteSuccess'));
          fetchParts();
        } catch {
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
    } catch {
      toast.error('Failed to activate part');
    }
  };

  const handleDeactivate = async (id: number) => {
    MySwal.fire({
      title: t('inventory.confirmDeactivateTitle'),
      text: t('inventory.confirmDeactivateText'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#F2F3F5',
      cancelButtonColor: '#2B303B',
      confirmButtonText: t('inventory.confirmDeactivateBtn'),
      cancelButtonText: t('inventory.btnCancel'),
      background: '#151821',
      color: '#F2F3F5',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deactivatePart(id);
          toast.success(t('inventory.toastDeactivateSuccess'));
          fetchParts();
        } catch {
          toast.error('Failed to deactivate part');
        }
      }
    });
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      parts.map((p: any) => ({
        [t('inventory.tableName')]: p.part_name,
        [t('inventory.tableSerial')]: p.serial_number,
        [t('inventory.tableQty')]: p.quantity,
        [t('inventory.tableStatus')]: p.status || 'in_stock',
        [t('inventory.tableExpiry')]: p.expiry_date || '',
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Parts');
    XLSX.writeFile(wb, 'MachineParts.xlsx');
  };

  const downloadExample = () => {
    const sampleData = [
      { [t('inventory.tableName')]: 'Hydraulic Pump', [t('inventory.tableSerial')]: 'HYD-0001', [t('inventory.tableQty')]: 2 },
      { [t('inventory.tableName')]: 'Air Filter', [t('inventory.tableSerial')]: 'AIR-0042', [t('inventory.tableQty')]: 5 },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws['!cols'] = [{ wch: 24 }, { wch: 18 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Example Import');
    XLSX.writeFile(wb, 'MachineTrack_ImportExample.xlsx');
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
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
        } catch {
          toast.error('Failed to parse Excel file.');
        }
      };
      reader.readAsBinaryString(file);
    },
    [fetchParts, t]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    },
    noClick: true,
  });

  const presets = [
    { label: t('inventory.preset6Months'), days: 183 },
    { label: t('inventory.preset12Months'), days: 365 },
    { label: t('inventory.preset1Year'), days: 365 },
    { label: t('inventory.preset2Years'), days: 730 },
  ];

  return (
    <div
      {...getRootProps()}
      style={{ position: 'relative', outline: 'none' }}
    >
      <input {...getInputProps()} id="excel-upload" aria-label="Upload Excel file" />

      {/* Drag overlay */}
      {isDragActive && (
        <div className="dropzone" aria-live="polite" role="status">
          <div className="dropzone-content">
            <FileSpreadsheet className="dropzone-icon" aria-hidden="true" />
            <p style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600, fontSize: '1.1rem', marginBottom: 'var(--space-2)' }}>
              Drop to import
            </p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
              {t('inventory.ttImport')}
            </p>
          </div>
        </div>
      )}

      {/* Page Header */}
      <header className="page-header">
        <div>
          <h1 className="page-title">{t('inventory.title')}</h1>
          <p className="page-subtitle">
            {parts.length > 0
              ? `${parts.length} part${parts.length !== 1 ? 's' : ''} in registry`
              : 'No parts registered yet'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <button
            id="btn-import"
            className="btn btn--secondary"
            onClick={() => document.getElementById('excel-upload')?.click()}
            aria-label={t('inventory.ttImport')}
            data-tooltip-id="inv-tooltip"
            data-tooltip-content={t('inventory.ttImport')}
          >
            <Upload size={15} aria-hidden="true" />
            {t('inventory.import')}
          </button>

          <button
            id="btn-export"
            className="btn btn--secondary"
            onClick={exportExcel}
            aria-label={t('inventory.ttExport')}
            data-tooltip-id="inv-tooltip"
            data-tooltip-content={t('inventory.ttExport')}
          >
            <Download size={15} aria-hidden="true" />
            {t('inventory.export')}
          </button>

          <button
            id="btn-example"
            className="btn btn--secondary"
            onClick={downloadExample}
            aria-label={t('inventory.ttExample')}
            data-tooltip-id="inv-tooltip"
            data-tooltip-content={t('inventory.ttExample')}
          >
            <FileDown size={15} aria-hidden="true" />
            {t('inventory.exampleFormat')}
          </button>

          <button
            id="btn-add-part"
            className="btn btn--primary"
            onClick={handleAdd}
            aria-label={t('inventory.addPart')}
          >
            <Plus size={15} aria-hidden="true" />
            {t('inventory.addPart')}
          </button>
        </div>
      </header>

      {/* Parts Table */}
      <section aria-label="Parts inventory">
        {parts.length === 0 ? (
          <div className="empty-state">
            <Package className="empty-state__icon" aria-hidden="true" />
            <p className="empty-state__title">Parts inventory is empty</p>
            <p className="empty-state__text">
              Add your first item to start tracking parts, expiry dates, and service windows.
              You can also import from an Excel file using the button above.
            </p>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table" aria-label="Parts inventory table">
              <thead>
                <tr>
                  <th scope="col">{t('inventory.tableId')}</th>
                  <th scope="col">{t('inventory.tableName')}</th>
                  <th scope="col">{t('inventory.tableSerial')}</th>
                  <th scope="col" className="center">{t('inventory.tableQty')}</th>
                  <th scope="col">{t('inventory.tableStatus')}</th>
                  <th scope="col">{t('inventory.tableExpiry')}</th>
                  <th scope="col" className="right">{t('inventory.tableActions')}</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {parts.map((p: any) => (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -20 }}
                      layout
                    >
                      <td className="mono" style={{ fontSize: '0.75rem' }}>
                        #{p.id.toString().padStart(4, '0')}
                      </td>
                      <td className="strong">{p.part_name}</td>
                      <td className="mono" style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                        {p.serial_number || '—'}
                      </td>
                      <td className="center">
                        <span className="badge badge--neutral">{p.quantity}</span>
                      </td>
                      <td>{getStatusBadge(p, t)}</td>
                      <td className="mono" style={{ fontSize: '0.75rem' }}>
                        {p.expiry_date
                          ? dayjs(p.expiry_date).format('MMM DD, YYYY HH:mm')
                          : <span style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>{t('inventory.notActivated')}</span>
                        }
                      </td>
                      <td className="right">
                        <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
                          {(p.status === 'in_stock' || !p.status) ? (
                            <button
                              id={`btn-activate-${p.id}`}
                              className="btn btn--ghost"
                              style={{ padding: 'var(--space-1) var(--space-2)' }}
                              onClick={() => handleActivateClick(p.id)}
                              aria-label={`${t('inventory.ttActivate')} ${p.part_name}`}
                              data-tooltip-id="inv-tooltip"
                              data-tooltip-content={t('inventory.ttActivate')}
                            >
                              <Play size={14} aria-hidden="true" />
                            </button>
                          ) : p.status === 'active' ? (
                            <button
                              id={`btn-deactivate-${p.id}`}
                              className="btn btn--ghost"
                              style={{ padding: 'var(--space-1) var(--space-2)' }}
                              onClick={() => handleDeactivate(p.id)}
                              aria-label={`${t('inventory.ttDeactivate')} ${p.part_name}`}
                              data-tooltip-id="inv-tooltip"
                              data-tooltip-content={t('inventory.ttDeactivate')}
                            >
                              <Square size={14} aria-hidden="true" />
                            </button>
                          ) : null}

                          <button
                            id={`btn-edit-${p.id}`}
                            className="btn btn--ghost"
                            style={{ padding: 'var(--space-1) var(--space-2)' }}
                            onClick={() => handleEdit(p)}
                            aria-label={`${t('inventory.ttEdit')} ${p.part_name}`}
                            data-tooltip-id="inv-tooltip"
                            data-tooltip-content={t('inventory.ttEdit')}
                          >
                            <Edit2 size={14} aria-hidden="true" />
                          </button>

                          <button
                            id={`btn-delete-${p.id}`}
                            className="btn btn--ghost text-alert"
                            style={{ padding: 'var(--space-1) var(--space-2)' }}
                            onClick={() => handleDelete(p.id)}
                            aria-label={`${t('inventory.ttDelete')} ${p.part_name}`}
                            data-tooltip-id="inv-tooltip"
                            data-tooltip-content={t('inventory.ttDelete')}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Tooltip
        id="inv-tooltip"
        place="top"
        className="app-tooltip"
      />

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <motion.div
              className="modal"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.15 }}
            >
              <div className="modal__header">
                <h2 className="modal__title" id="modal-title">
                  {editingId ? t('inventory.editModalTitle') : t('inventory.addModalTitle')}
                </h2>
                <button
                  className="modal__close"
                  onClick={() => setIsModalOpen(false)}
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="modal__body">
                  <div className="form-group">
                    <label className="form-label" htmlFor="field-part-name">
                      {t('inventory.labelPartName')} <span aria-hidden="true" style={{ color: 'var(--color-alert-base)' }}>*</span>
                    </label>
                    <input
                      id="field-part-name"
                      {...register('part_name')}
                      type="text"
                      className="form-input"
                      aria-required="true"
                      aria-invalid={!!errors.part_name}
                      aria-describedby={errors.part_name ? 'error-part-name' : undefined}
                    />
                    {errors.part_name && (
                      <p id="error-part-name" className="form-error" role="alert">
                        {errors.part_name.message}
                      </p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="field-serial">
                      {t('inventory.labelSerialNo')}
                    </label>
                    <input
                      id="field-serial"
                      {...register('serial_number')}
                      type="text"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="field-qty">
                      {t('inventory.labelQty')}
                    </label>
                    <input
                      id="field-qty"
                      {...register('quantity', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      className="form-input"
                      aria-invalid={!!errors.quantity}
                      aria-describedby={errors.quantity ? 'error-qty' : undefined}
                    />
                    {errors.quantity && (
                      <p id="error-qty" className="form-error" role="alert">
                        {errors.quantity.message}
                      </p>
                    )}
                  </div>

                  {!editingId && (
                    <div
                      style={{
                        display: 'flex',
                        gap: 'var(--space-2)',
                        padding: 'var(--space-3)',
                        background: 'var(--color-bg-elevated)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      <Clock size={14} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                      <span>{t('inventory.labelInStockInfo')}</span>
                    </div>
                  )}
                </div>

                <div className="modal__footer">
                  <button
                    type="button"
                    id="btn-cancel-modal"
                    className="btn btn--ghost"
                    onClick={() => setIsModalOpen(false)}
                  >
                    {t('inventory.btnCancel')}
                  </button>
                  <button
                    type="submit"
                    id="btn-submit-part"
                    className="btn btn--primary"
                  >
                    {editingId ? t('inventory.btnSaveChanges') : t('inventory.btnAddStock')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Activate Modal */}
      <AnimatePresence>
        {activateModalOpen && (
          <div
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="activate-modal-title"
          >
            <motion.div
              className="modal"
              style={{ maxWidth: 420 }}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.15 }}
            >
              <div className="modal__header">
                <h2 className="modal__title" id="activate-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Play size={16} aria-hidden="true" />
                  {t('inventory.activateModalTitle')}
                </h2>
                <button
                  className="modal__close"
                  onClick={() => setActivateModalOpen(false)}
                  aria-label="Close activate modal"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="modal__body">
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--space-4)' }}>
                  {t('inventory.activateModalSub')}
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 'var(--space-2)',
                    marginBottom: 'var(--space-5)',
                  }}
                  role="group"
                  aria-label="Duration presets"
                >
                  {presets.map((p) => (
                    <button
                      key={p.label}
                      id={`preset-${p.days}`}
                      className="btn btn--secondary"
                      style={{ justifyContent: 'center', padding: 'var(--space-3)' }}
                      onClick={() => handleActivateConfirm(p.days)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
                  <label className="form-label" htmlFor="field-custom-days">
                    {t('inventory.customDuration')}
                  </label>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <input
                      id="field-custom-days"
                      type="number"
                      min="1"
                      value={customDays}
                      onChange={(e) => setCustomDays(parseInt(e.target.value) || 1)}
                      className="form-input"
                      aria-label="Custom duration in days"
                    />
                    <button
                      id="btn-activate-custom"
                      className="btn btn--primary"
                      style={{ flexShrink: 0 }}
                      onClick={() => handleActivateConfirm(customDays)}
                    >
                      {t('inventory.btnActivate')}
                    </button>
                  </div>
                  <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.75rem', marginTop: 'var(--space-2)', fontFamily: 'var(--font-family-mono)' }}>
                    {t('inventory.expiresOnPrefix')} {dayjs().add(customDays, 'day').format('MMM DD, YYYY')}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
