import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle } from 'lucide-react';
import { Modal, Button, Badge } from '../../../shared/components';
import { apiClient } from '../../../core/api/client';
import { useProperties } from '../../properties/use-properties';
import { formatKc } from '../../../shared/utils/format';

interface CalcPreviewItem {
  unitId: string;
  unitName: string;
  area: number | null;
  share: number;
  amount: number;
}

interface CalcPreview {
  items: CalcPreviewItem[];
  totalAmount: number;
  splitMethod: string;
  unitsCount: number;
}

type Step = 'form' | 'preview' | 'done';

const TYPE_LABELS: Record<string, string> = {
  advance: 'Záloha',
  service: 'Služba',
  rent: 'Nájem',
  other: 'Ostatní',
};

export function PrescriptionCalc({ onClose }: { onClose: () => void }) {
  const { data: properties = [] } = useProperties();
  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CalcPreview | null>(null);
  const [created, setCreated] = useState(0);

  // Form state
  const [propertyId, setPropertyId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<string>('advance');
  const [splitMethod, setSplitMethod] = useState<string>('equal');
  const [dueDay, setDueDay] = useState('15');
  const [validFrom, setValidFrom] = useState(new Date().toISOString().slice(0, 10));
  const [validTo, setValidTo] = useState('');

  const buildInput = () => ({
    propertyId,
    totalAmount: parseFloat(totalAmount),
    description,
    type: type as 'advance' | 'service' | 'rent' | 'other',
    splitMethod: splitMethod as 'equal' | 'byArea',
    dueDay: parseInt(dueDay) || 15,
    validFrom,
    ...(validTo ? { validTo } : {}),
  });

  const previewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/finance/calc/preview', buildInput());
      return res.data as CalcPreview;
    },
    onSuccess: (data) => {
      setPreview(data);
      setStep('preview');
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'Chyba při kalkulaci');
    },
  });

  const executeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/finance/calc/execute', buildInput());
      return res.data as { created: number };
    },
    onSuccess: (data) => {
      setCreated(data.created);
      setStep('done');
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'Chyba při vytváření předpisů');
    },
  });

  const isFormValid = propertyId && totalAmount && parseFloat(totalAmount) > 0 && description && validFrom;

  return (
    <Modal
      open
      onClose={onClose}
      title="Kalkulačka předpisů"
      subtitle={step === 'form' ? 'Rozložte náklady na jednotky' : step === 'preview' ? 'Náhled rozložení' : 'Předpisy vytvořeny'}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {step === 'form' && (
            <>
              <Button onClick={onClose}>Zrušit</Button>
              <Button variant="primary" onClick={() => { setError(null); previewMutation.mutate(); }} disabled={!isFormValid || previewMutation.isPending}>
                {previewMutation.isPending ? 'Počítám...' : 'Spočítat'}
              </Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <Button onClick={() => setStep('form')}>Zpět</Button>
              <Button variant="primary" onClick={() => { setError(null); executeMutation.mutate(); }} disabled={executeMutation.isPending}>
                {executeMutation.isPending ? 'Vytvářím...' : `Vytvořit ${preview?.items.length ?? 0} předpisů`}
              </Button>
            </>
          )}
          {step === 'done' && <Button variant="primary" onClick={onClose}>Zavřít</Button>}
        </div>
      }
    >
      {error && (
        <div style={{ background: 'var(--danger-bg, #fef2f2)', border: '1px solid var(--danger, #ef4444)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.875rem', color: 'var(--danger, #ef4444)' }}>
          {error}
        </div>
      )}

      {/* FORM */}
      {step === 'form' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="form-label">Nemovitost *</label>
            <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
              <option value="">-- Vyber nemovitost --</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Popis *</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Např. Fond oprav Q1/2026"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Celková částka (Kč) *</label>
              <input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="50000" min="0" step="0.01"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label className="form-label">Typ</label>
              <select value={type} onChange={(e) => setType(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Rozdělit</label>
              <select value={splitMethod} onChange={(e) => setSplitMethod(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
                <option value="equal">Rovnoměrně</option>
                <option value="byArea">Podle plochy (m²)</option>
              </select>
            </div>
            <div>
              <label className="form-label">Den splatnosti</label>
              <input type="number" value={dueDay} onChange={(e) => setDueDay(e.target.value)} min="1" max="28"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Platnost od *</label>
              <input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label className="form-label">Platnost do</label>
              <input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW */}
      {step === 'preview' && preview && (
        <div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1, padding: 12, borderRadius: 8, background: 'var(--surface-2)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{formatKc(preview.totalAmount)}</div>
              <div className="text-muted text-sm">Celková částka</div>
            </div>
            <div style={{ flex: 1, padding: 12, borderRadius: 8, background: 'var(--surface-2)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{preview.unitsCount}</div>
              <div className="text-muted text-sm">Jednotek</div>
            </div>
            <div style={{ flex: 1, padding: 12, borderRadius: 8, background: 'var(--surface-2)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{preview.splitMethod === 'byArea' ? 'Podle plochy' : 'Rovnoměrně'}</div>
              <div className="text-muted text-sm">Metoda</div>
            </div>
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Jednotka</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Plocha</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Podíl</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Částka</th>
                </tr>
              </thead>
              <tbody>
                {preview.items.map((item) => (
                  <tr key={item.unitId} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 500 }}>{item.unitName}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{item.area != null ? `${item.area} m²` : '—'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>{item.share.toFixed(1)} %</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{formatKc(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DONE */}
      {step === 'done' && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <CheckCircle size={48} style={{ color: 'var(--success)', marginBottom: 12 }} />
          <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>Předpisy vytvořeny</div>
          <Badge variant="green">{created} předpisů vytvořeno</Badge>
        </div>
      )}
    </Modal>
  );
}
