import { useState } from 'react';
import { Plus, Star, Trash2, Pencil, RefreshCw } from 'lucide-react';
import { Button, Badge, Modal, EmptyState } from '../../../shared/components';
import { BankSyncConfig } from './BankSyncConfig';
import { useToast } from '../../../shared/components/toast/Toast';
import { useBankAccounts, useCreateBankAccount, useUpdateBankAccount, useDeleteBankAccount } from '../api/finance.queries';
import { useProperties } from '../../properties/use-properties';
import type { ApiBankAccount } from '../api/finance.api';

const BANK_CODES: Record<string, string> = {
  '0100': 'Komerční banka',
  '0300': 'ČSOB',
  '0600': 'MONETA',
  '0800': 'Česká spořitelna',
  '2010': 'Fio banka',
  '2700': 'UniCredit Bank',
  '5500': 'Raiffeisenbank',
  '6210': 'mBank',
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  OPERATING: 'Běžný',
  REPAIR_FUND: 'Fond oprav',
  SAVINGS: 'Spořicí',
  OTHER: 'Jiný',
};

const CURRENCIES = ['CZK', 'EUR', 'USD'];

function formatAccountNumber(acc: ApiBankAccount) {
  const bankName = acc.bankCode ? BANK_CODES[acc.bankCode] : null;
  const base = `${acc.accountNumber}${acc.bankCode ? '/' + acc.bankCode : ''}`;
  return bankName ? `${base} (${bankName})` : base;
}

interface FormState {
  name: string;
  accountNumber: string;
  bankCode: string;
  iban: string;
  currency: string;
  accountType: string;
  isDefault: boolean;
  propertyId: string;
}

const emptyForm: FormState = {
  name: '', accountNumber: '', bankCode: '', iban: '',
  currency: 'CZK', accountType: 'OPERATING', isDefault: false, propertyId: '',
};

export function AccountsTab() {
  const toast = useToast();
  const { data: accounts = [], isLoading } = useBankAccounts();
  const { data: properties = [] } = useProperties();
  const createMut = useCreateBankAccount();
  const updateMut = useUpdateBankAccount();
  const deleteMut = useDeleteBankAccount();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<ApiBankAccount | null>(null);
  const [syncTarget, setSyncTarget] = useState<ApiBankAccount | null>(null);

  const activeAccounts = accounts.filter(a => a.isActive);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm, propertyId: properties[0]?.id ?? '' });
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (acc: ApiBankAccount) => {
    setEditId(acc.id);
    setForm({
      name: acc.name,
      accountNumber: acc.accountNumber,
      bankCode: acc.bankCode ?? '',
      iban: acc.iban ?? '',
      currency: acc.currency,
      accountType: acc.accountType ?? 'OPERATING',
      isDefault: acc.isDefault,
      propertyId: acc.propertyId ?? '',
    });
    setErrors({});
    setShowForm(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Název je povinný';
    if (!form.accountNumber.trim()) errs.accountNumber = 'Číslo účtu je povinné';
    if (!/^\d+$/.test(form.accountNumber.trim())) errs.accountNumber = 'Číslo účtu: pouze číslice';
    if (!form.bankCode.trim()) errs.bankCode = 'Kód banky je povinný';
    if (!/^\d{4}$/.test(form.bankCode.trim())) errs.bankCode = 'Kód banky: 4 číslice';
    if (form.iban && !/^CZ\d{22}$/.test(form.iban.replace(/\s/g, ''))) errs.iban = 'IBAN: formát CZ + 22 číslic';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    if (editId) {
      updateMut.mutate({
        id: editId,
        dto: {
          name: form.name.trim(),
          accountNumber: form.accountNumber.trim(),
          bankCode: form.bankCode.trim(),
          iban: form.iban.trim() || undefined,
          currency: form.currency,
          accountType: form.accountType,
          isDefault: form.isDefault,
        },
      }, {
        onSuccess: () => { toast.success('Účet upraven'); setShowForm(false); },
        onError: () => toast.error('Nepodařilo se upravit účet'),
      });
    } else {
      createMut.mutate({
        name: form.name.trim(),
        accountNumber: form.accountNumber.trim(),
        bankCode: form.bankCode.trim(),
        iban: form.iban.trim() || undefined,
        currency: form.currency,
        accountType: form.accountType,
        isDefault: form.isDefault,
        propertyId: form.propertyId || undefined,
      }, {
        onSuccess: () => { toast.success('Účet vytvořen'); setShowForm(false); },
        onError: () => toast.error('Nepodařilo se vytvořit účet'),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMut.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success('Účet smazán'); setDeleteTarget(null); },
      onError: () => toast.error('Nepodařilo se smazat účet'),
    });
  };

  const set = (key: keyof FormState, value: string | boolean) => setForm(f => ({ ...f, [key]: value }));

  const inputStyle = (field?: string): React.CSSProperties => ({
    width: '100%', padding: '8px 12px', borderRadius: 6, boxSizing: 'border-box',
    border: `1px solid ${field && errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
  });

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <div data-testid="finance-bank-accounts-list">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>
          {activeAccounts.length} {activeAccounts.length === 1 ? 'účet' : activeAccounts.length < 5 ? 'účty' : 'účtů'}
        </div>
        <Button variant="primary" icon={<Plus size={15} />} onClick={openCreate} data-testid="finance-bank-account-add-btn">
          Přidat bankovní účet
        </Button>
      </div>

      {isLoading ? <div className="text-muted" style={{ padding: 32, textAlign: 'center' }}>Načítání...</div> :
       activeAccounts.length === 0 ? (
        <EmptyState title="Žádné bankovní účty" description="Přidejte bankovní účet pro import výpisů a párování plateb." />
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {activeAccounts.map(acc => (
            <div
              key={acc.id}
              data-testid={`finance-bank-account-row-${acc.id}`}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '14px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {acc.name}
                  {acc.isDefault && <Star size={14} fill="var(--warning, #f59e0b)" color="var(--warning, #f59e0b)" />}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {formatAccountNumber(acc)}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <Badge variant="blue">{acc.currency}</Badge>
                  <Badge variant="muted">{ACCOUNT_TYPE_LABELS[acc.accountType ?? ''] || 'Běžný'}</Badge>
                  {acc.isDefault && <Badge variant="yellow">Výchozí</Badge>}
                  {acc._count?.transactions != null && (
                    <span className="text-muted" style={{ fontSize: '.75rem' }}>
                      {acc._count.transactions} transakcí
                    </span>
                  )}
                  {(acc as any).syncEnabled && (
                    <Badge variant={(acc as any).syncStatus === 'active' ? 'green' : (acc as any).syncStatus === 'error' ? 'red' : 'muted'}>
                      {(acc as any).syncStatus === 'active' ? '🔄 Auto-sync' : (acc as any).syncStatus === 'error' ? '⚠️ Sync chyba' : 'Sync vypnut'}
                    </Badge>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setSyncTarget(acc)}
                  data-testid={`finance-bank-account-sync-${acc.id}`}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-green, #22c55e)', padding: 4 }}
                  title="API Sync nastavení"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  onClick={() => openEdit(acc)}
                  data-testid={`finance-bank-account-edit-${acc.id}`}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: 4 }}
                  title="Upravit"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => setDeleteTarget(acc)}
                  data-testid={`finance-bank-account-delete-${acc.id}`}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }}
                  title="Smazat"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit form modal */}
      {showForm && (
        <Modal
          open
          onClose={() => setShowForm(false)}
          title={editId ? 'Upravit bankovní účet' : 'Nový bankovní účet'}
          data-testid="finance-bank-account-form"
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowForm(false)}>Zrušit</Button>
              <Button variant="primary" onClick={handleSave} disabled={isSaving} data-testid="finance-bank-account-form-save">
                {isSaving ? 'Ukládám...' : editId ? 'Uložit' : 'Vytvořit'}
              </Button>
            </div>
          }
        >
          {/* Property selector (only for create) */}
          {!editId && properties.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <label className="form-label">Nemovitost</label>
              <select value={form.propertyId} onChange={e => set('propertyId', e.target.value)} style={inputStyle()}>
                <option value="">— bez přiřazení —</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Název účtu *</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Fio hlavní"
              style={inputStyle('name')}
              data-testid="finance-bank-account-form-name"
            />
            {errors.name && <div style={{ color: 'var(--danger)', fontSize: '.8rem', marginTop: 2 }}>{errors.name}</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="form-label">Číslo účtu *</label>
              <input
                value={form.accountNumber}
                onChange={e => set('accountNumber', e.target.value)}
                placeholder="1234567890"
                style={inputStyle('accountNumber')}
                data-testid="finance-bank-account-form-number"
              />
              {errors.accountNumber && <div style={{ color: 'var(--danger)', fontSize: '.8rem', marginTop: 2 }}>{errors.accountNumber}</div>}
            </div>
            <div>
              <label className="form-label">Kód banky *</label>
              <input
                value={form.bankCode}
                onChange={e => set('bankCode', e.target.value)}
                placeholder="2010"
                maxLength={4}
                style={inputStyle('bankCode')}
                data-testid="finance-bank-account-form-bankCode"
              />
              {errors.bankCode && <div style={{ color: 'var(--danger)', fontSize: '.8rem', marginTop: 2 }}>{errors.bankCode}</div>}
            </div>
          </div>

          {/* Bank code hints */}
          <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(BANK_CODES).slice(0, 6).map(([code, name]) => (
              <button
                key={code}
                onClick={() => set('bankCode', code)}
                style={{
                  background: form.bankCode === code ? 'var(--primary)' : 'var(--surface-2, var(--surface))',
                  color: form.bankCode === code ? '#fff' : 'var(--text-muted)',
                  border: '1px solid var(--border)', borderRadius: 12,
                  padding: '2px 8px', cursor: 'pointer', fontSize: '.75rem',
                }}
              >
                {code} {name}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="form-label">IBAN (volitelný)</label>
            <input
              value={form.iban}
              onChange={e => set('iban', e.target.value.toUpperCase())}
              placeholder="CZ6508000000001234567890"
              style={inputStyle('iban')}
              data-testid="finance-bank-account-form-iban"
            />
            {errors.iban && <div style={{ color: 'var(--danger)', fontSize: '.8rem', marginTop: 2 }}>{errors.iban}</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="form-label">Měna</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value)} style={inputStyle()}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Typ účtu</label>
              <select value={form.accountType} onChange={e => set('accountType', e.target.value)} style={inputStyle()}>
                {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '.9rem' }}>
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={e => set('isDefault', e.target.checked)}
            />
            Výchozí účet pro tuto nemovitost
          </label>
        </Modal>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <Modal
          open
          onClose={() => setDeleteTarget(null)}
          title="Smazat bankovní účet"
          subtitle={deleteTarget.name}
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button onClick={() => setDeleteTarget(null)}>Zrušit</Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={deleteMut.isPending}
                data-testid="finance-bank-account-delete-confirm"
              >
                {deleteMut.isPending ? 'Mažu...' : 'Smazat'}
              </Button>
            </div>
          }
        >
          <p style={{ fontSize: '0.9rem', marginBottom: 8 }}>
            Opravdu chcete smazat účet <strong>{deleteTarget.name}</strong> ({deleteTarget.accountNumber})?
          </p>
          {(deleteTarget._count?.transactions ?? 0) > 0 && (
            <div style={{
              background: 'rgba(239,68,68,.08)', border: '1px solid var(--danger)',
              borderRadius: 6, padding: '8px 12px', fontSize: '0.85rem', color: 'var(--danger)',
            }}>
              Účet má {deleteTarget._count?.transactions} transakcí — bude deaktivován, nikoli smazán.
            </div>
          )}
        </Modal>
      )}

      {/* Sync config modal */}
      {syncTarget && (
        <BankSyncConfig
          bankAccountId={syncTarget.id}
          bankAccountName={syncTarget.name}
          onClose={() => setSyncTarget(null)}
        />
      )}
    </div>
  );
}
