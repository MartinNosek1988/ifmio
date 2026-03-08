import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Download, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { Modal, Button, Badge } from '../../../shared/components';
import { apiClient } from '../../../core/api/client';

interface ImportRow {
  rowIndex: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  propertyName?: string;
  unitName?: string;
  role?: string;
}

interface ValidationResult {
  valid: ImportRow[];
  invalid: Array<ImportRow & { errors: string[] }>;
  total: number;
  preview: boolean;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  total: number;
}

type Step = 'upload' | 'preview' | 'done';

export function ResidentImportWizard({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateMutation = useMutation({
    mutationFn: async (f: File) => {
      const fd = new FormData();
      fd.append('file', f);
      const res = await apiClient.post('/residents/import/validate', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data as ValidationResult;
    },
    onSuccess: (data) => {
      setValidation(data);
      setStep('preview');
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'Chyba při validaci souboru');
    },
  });

  const executeMutation = useMutation({
    mutationFn: async (rows: ImportRow[]) => {
      const res = await apiClient.post('/residents/import/execute', { rows });
      return res.data as ImportResult;
    },
    onSuccess: (data) => {
      setImportResult(data);
      setStep('done');
      queryClient.invalidateQueries({ queryKey: ['residents'] });
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'Chyba při importu');
    },
  });

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setError(null);
    }
  }, []);

  const handleValidate = () => {
    if (!file) return;
    setError(null);
    validateMutation.mutate(file);
  };

  const handleExecute = () => {
    if (!validation?.valid.length) return;
    executeMutation.mutate(validation.valid);
  };

  const handleDownloadTemplate = async () => {
    const res = await apiClient.get('/residents/import/template', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import-najemniku-sablona.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Import bydlících"
      subtitle={step === 'upload' ? 'Nahrajte CSV nebo XLSX soubor' : step === 'preview' ? 'Kontrola dat před importem' : 'Import dokončen'}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {step === 'upload' && (
            <>
              <Button onClick={onClose}>Zrušit</Button>
              <Button variant="primary" onClick={handleValidate} disabled={!file || validateMutation.isPending}>
                {validateMutation.isPending ? 'Validuji...' : 'Validovat'}
              </Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <Button onClick={() => { setStep('upload'); setValidation(null); }}>Zpět</Button>
              <Button variant="primary" onClick={handleExecute} disabled={!validation?.valid.length || executeMutation.isPending}>
                {executeMutation.isPending ? 'Importuji...' : `Importovat ${validation?.valid.length ?? 0} řádků`}
              </Button>
            </>
          )}
          {step === 'done' && <Button variant="primary" onClick={onClose}>Zavřít</Button>}
        </div>
      }
    >
      {error && (
        <div style={{ background: 'var(--danger-bg, #fef2f2)', border: '1px solid var(--danger, #ef4444)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.875rem', color: 'var(--danger, #ef4444)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}><X size={14} /></button>
        </div>
      )}

      {/* STEP: UPLOAD */}
      {step === 'upload' && (
        <div>
          <div style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: 32, textAlign: 'center', marginBottom: 16 }}>
            <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Vyberte soubor</div>
            <div className="text-muted text-sm" style={{ marginBottom: 12 }}>Podporované formáty: .xlsx, .csv</div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6, border: '1px solid var(--primary)', cursor: 'pointer', color: 'var(--primary)', fontWeight: 500 }}>
              <Upload size={15} /> Nahrát soubor
              <input type="file" accept=".xlsx,.csv" onChange={handleFileChange} style={{ display: 'none' }} />
            </label>
            {file && <div style={{ marginTop: 8, fontWeight: 500 }}>{file.name}</div>}
          </div>
          <button onClick={handleDownloadTemplate} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem' }}>
            <Download size={14} /> Stáhnout šablonu XLSX
          </button>
        </div>
      )}

      {/* STEP: PREVIEW */}
      {step === 'preview' && validation && (
        <div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1, padding: 12, borderRadius: 8, background: 'var(--surface-2)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{validation.total}</div>
              <div className="text-muted text-sm">Celkem řádků</div>
            </div>
            <div style={{ flex: 1, padding: 12, borderRadius: 8, background: 'var(--surface-2)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{validation.valid.length}</div>
              <div className="text-muted text-sm">Validních</div>
            </div>
            <div style={{ flex: 1, padding: 12, borderRadius: 8, background: 'var(--surface-2)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: validation.invalid.length ? 'var(--danger)' : 'var(--text-muted)' }}>{validation.invalid.length}</div>
              <div className="text-muted text-sm">Chybných</div>
            </div>
          </div>

          {validation.valid.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={16} style={{ color: 'var(--success)' }} /> Validní řádky ({validation.valid.length})
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-2)' }}>
                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>#</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>Jméno</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>Email</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>Nemovitost</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>Jednotka</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validation.valid.map((r) => (
                      <tr key={r.rowIndex} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '6px 10px' }}>{r.rowIndex}</td>
                        <td style={{ padding: '6px 10px', fontWeight: 500 }}>{r.firstName} {r.lastName}</td>
                        <td style={{ padding: '6px 10px' }}>{r.email || '—'}</td>
                        <td style={{ padding: '6px 10px' }}>{r.propertyName || '—'}</td>
                        <td style={{ padding: '6px 10px' }}>{r.unitName || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {validation.invalid.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={16} style={{ color: 'var(--danger)' }} /> Chybné řádky ({validation.invalid.length})
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {validation.invalid.map((r) => (
                  <div key={r.rowIndex} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, marginBottom: 6, fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: 500 }}>Řádek {r.rowIndex}: {r.firstName} {r.lastName}</div>
                    {r.errors.map((e, i) => (
                      <div key={i} style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 2 }}>• {e}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP: DONE */}
      {step === 'done' && importResult && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <CheckCircle size={48} style={{ color: 'var(--success)', marginBottom: 12 }} />
          <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>Import dokončen</div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 16 }}>
            <div>
              <Badge variant="green">{importResult.imported} importováno</Badge>
            </div>
            {importResult.skipped > 0 && (
              <div>
                <Badge variant="yellow">{importResult.skipped} přeskočeno</Badge>
              </div>
            )}
          </div>
          {importResult.errors.length > 0 && (
            <div style={{ textAlign: 'left', marginTop: 12, maxHeight: 150, overflowY: 'auto' }}>
              {importResult.errors.map((e, i) => (
                <div key={i} style={{ fontSize: '0.8rem', color: 'var(--danger)', marginBottom: 2 }}>• {e}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
