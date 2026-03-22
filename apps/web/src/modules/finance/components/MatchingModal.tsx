import { useState } from 'react';
import { Modal, Button, Badge, EmptyState } from '../../../shared/components';
import { useToast } from '../../../shared/components/toast/Toast';
import { formatKc, formatCzDate } from '../../../shared/utils/format';
import { useMatchSuggestions, useManualMatch, useUnmatchTransaction } from '../api/finance.queries';
import type { FinTransaction } from '../types';
import type { MatchTarget, MatchSuggestion } from '../api/finance.api';

type Tab = 'konto' | 'invoice' | 'component' | 'no_effect';

const TAB_CONFIG: Array<{ key: Tab; label: string; target: MatchTarget }> = [
  { key: 'konto', label: 'Konto', target: 'KONTO' },
  { key: 'invoice', label: 'Doklad', target: 'INVOICE' },
  { key: 'component', label: 'Složka', target: 'COMPONENT' },
  { key: 'no_effect', label: 'Bez vlivu', target: 'NO_EFFECT' },
];

const NO_EFFECT_PRESETS = [
  'Bankovní poplatek',
  'Úrok z vkladu',
  'Interní převod',
  'Storno transakce',
];

const CONFIDENCE_LABELS: Record<string, { label: string; color: 'green' | 'yellow' | 'blue' | 'muted' }> = {
  exact: { label: 'Přesná shoda', color: 'green' },
  vs_match: { label: 'Shoda VS', color: 'yellow' },
  amount_match: { label: 'Shoda částky', color: 'blue' },
  none: { label: '—', color: 'muted' },
};

export default function MatchingModal({ tx, onClose }: {
  tx: FinTransaction;
  onClose: () => void;
}) {
  const toast = useToast();
  const isMatched = tx.status === 'matched';
  const defaultTab: Tab = tx.typ === 'vydej' ? 'invoice' : 'konto';
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [matchAmount, setMatchAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const { data: suggestions = [], isLoading: loadingSuggestions } = useMatchSuggestions(
    isMatched ? null : tx.id,
  );
  const manualMatchMut = useManualMatch();
  const unmatchMut = useUnmatchTransaction();

  const handleMatch = () => {
    const tabConfig = TAB_CONFIG.find(t => t.key === activeTab);
    if (!tabConfig) return;

    const dto: { target: MatchTarget; entityId?: string; amount?: number; note?: string } = {
      target: tabConfig.target,
    };

    if (activeTab !== 'no_effect' && selectedEntity) {
      dto.entityId = selectedEntity;
    }

    if (matchAmount && Number(matchAmount) > 0) {
      dto.amount = Number(matchAmount);
    }

    if (note.trim()) {
      dto.note = note.trim();
    }

    manualMatchMut.mutate({ txId: tx.id, dto }, {
      onSuccess: () => {
        toast.success('Transakce úspěšně spárována');
        onClose();
      },
      onError: () => toast.error('Chyba při párování'),
    });
  };

  const handleUnmatch = () => {
    unmatchMut.mutate(tx.id, {
      onSuccess: () => {
        toast.success('Párování zrušeno');
        onClose();
      },
      onError: () => toast.error('Chyba při rušení párování'),
    });
  };

  const filteredSuggestions = suggestions.filter((s: MatchSuggestion) => {
    if (activeTab === 'konto') return s.entityType === 'prescription';
    if (activeTab === 'invoice') return s.entityType === 'invoice';
    return false;
  });

  const canConfirm = activeTab === 'no_effect' || activeTab === 'component' || !!selectedEntity;

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: 6, boxSizing: 'border-box' as const,
    border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))', color: 'var(--text)',
  };

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={isMatched ? 'Detail párování' : 'Párovat transakci'}
      data-testid="finance-match-modal"
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {isMatched && (
            <Button
              variant="danger"
              onClick={handleUnmatch}
              disabled={unmatchMut.isPending}
              data-testid="finance-unmatch-btn"
            >
              {unmatchMut.isPending ? 'Ruším...' : 'Zrušit párování'}
            </Button>
          )}
          <Button onClick={onClose}>Zavřít</Button>
          {!isMatched && (
            <Button
              variant="primary"
              onClick={handleMatch}
              disabled={!canConfirm || manualMatchMut.isPending}
              data-testid="finance-match-confirm-btn"
            >
              {manualMatchMut.isPending ? 'Párování...' : 'Potvrdit párování'}
            </Button>
          )}
        </div>
      }
    >
      {/* Transaction header */}
      <div style={{
        background: 'var(--surface-2)', borderRadius: 8, padding: 12, marginBottom: 16,
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, fontSize: '0.85rem',
      }}>
        <div>
          <div className="text-muted">Datum</div>
          <div style={{ fontWeight: 500 }}>{formatCzDate(tx.datum)}</div>
        </div>
        <div>
          <div className="text-muted">Částka</div>
          <div style={{ fontWeight: 600, color: tx.typ === 'prijem' ? 'var(--success)' : 'var(--danger)' }}>
            {tx.typ === 'prijem' ? '+' : '-'}{formatKc(tx.castka)}
          </div>
        </div>
        <div>
          <div className="text-muted">VS</div>
          <div style={{ fontFamily: 'monospace' }}>{tx.vs || '—'}</div>
        </div>
        <div>
          <div className="text-muted">Protiúčet</div>
          <div className="text-sm">{tx.protiUcet || '—'}</div>
        </div>
      </div>

      {/* Match details for already matched */}
      {isMatched && (
        <div style={{
          border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 16,
          fontSize: '0.875rem',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <span className="text-muted">Cíl: </span>
              <strong>{tx.matchTarget ? ({
                KONTO: 'Konto', INVOICE: 'Doklad', COMPONENT: 'Složka',
                NO_EFFECT: 'Bez vlivu', UNSPECIFIED: 'Neuvedeno',
              }[tx.matchTarget]) : '—'}</strong>
            </div>
            <div>
              <span className="text-muted">Spárováno: </span>
              {tx.matchedAt ? formatCzDate(tx.matchedAt) : '—'}
            </div>
            {tx.matchNote && (
              <div style={{ gridColumn: '1 / -1' }}>
                <span className="text-muted">Poznámka: </span>{tx.matchNote}
              </div>
            )}
            {tx.prescriptionDesc && (
              <div style={{ gridColumn: '1 / -1' }}>
                <span className="text-muted">Předpis: </span>{tx.prescriptionDesc}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs (only for unmatched) */}
      {!isMatched && (
        <>
          <div className="tabs" style={{ marginBottom: 16 }}>
            {TAB_CONFIG.map(t => (
              <button
                key={t.key}
                className={`tab-btn${activeTab === t.key ? ' active' : ''}`}
                onClick={() => { setActiveTab(t.key); setSelectedEntity(null); }}
                data-testid={`finance-match-tab-${t.key}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Konto / Invoice tab — suggestions list */}
          {(activeTab === 'konto' || activeTab === 'invoice') && (
            <div style={{ maxHeight: 350, overflowY: 'auto', marginBottom: 12 }}>
              {loadingSuggestions && <div className="text-muted" style={{ padding: 16, textAlign: 'center' }}>Načítám návrhy...</div>}
              {!loadingSuggestions && filteredSuggestions.length === 0 && (
                <EmptyState
                  title={activeTab === 'konto' ? 'Žádné otevřené předpisy' : 'Žádné nezaplacené doklady'}
                  description="Zkuste jiný typ párování."
                />
              )}
              {filteredSuggestions.map((s: MatchSuggestion) => {
                const isSelected = selectedEntity === s.entityId;
                const conf = CONFIDENCE_LABELS[s.confidence] || CONFIDENCE_LABELS.none;
                return (
                  <div
                    key={s.entityId}
                    onClick={() => setSelectedEntity(isSelected ? null : s.entityId)}
                    data-testid={`finance-match-suggestion-${s.entityId}`}
                    style={{
                      padding: 12, border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 8, marginBottom: 8, cursor: 'pointer', background: 'var(--surface)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{s.label}</div>
                      <div className="text-muted text-sm" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {s.period && <span>Období: {s.period}</span>}
                        {s.residentName && <span>Plátce: {s.residentName}</span>}
                        {s.vs && <span style={{ fontFamily: 'monospace' }}>VS: {s.vs}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                        {formatKc(s.outstanding ?? s.amount)}
                      </div>
                      <Badge variant={conf.color}>{conf.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Component tab */}
          {activeTab === 'component' && (
            <div style={{ padding: 16, textAlign: 'center' }}>
              <div className="text-muted" style={{ marginBottom: 8 }}>
                Přiřazení ke složce předpisu — zadejte ID složky ručně nebo vyberte v sekci Složky předpisu.
              </div>
              <input
                value={selectedEntity || ''}
                onChange={(e) => setSelectedEntity(e.target.value || null)}
                placeholder="ID složky předpisu"
                style={inputStyle}
                data-testid="finance-match-component-id"
              />
            </div>
          )}

          {/* No effect tab */}
          {activeTab === 'no_effect' && (
            <div style={{ marginBottom: 12 }}>
              <div className="text-muted text-sm" style={{ marginBottom: 8 }}>
                Transakce bude zaznamenána bez finančního vlivu na konto.
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {NO_EFFECT_PRESETS.map(preset => (
                  <button
                    key={preset}
                    onClick={() => setNote(preset)}
                    data-testid={`finance-match-preset-${preset.replace(/\s/g, '-')}`}
                    style={{
                      padding: '4px 10px', borderRadius: 16, fontSize: '0.82rem', cursor: 'pointer',
                      border: '1px solid var(--border)', background: note === preset ? 'var(--primary)' : 'var(--surface)',
                      color: note === preset ? '#fff' : 'var(--text)',
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Amount + Note (shared bottom section) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginTop: 8 }}>
            <div>
              <label className="form-label">Částka (nepovinná)</label>
              <input
                type="number"
                value={matchAmount}
                onChange={(e) => setMatchAmount(e.target.value)}
                placeholder={String(tx.castka)}
                style={inputStyle}
                data-testid="finance-match-amount"
              />
              <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: 2 }}>
                Pro částečné párování zadejte menší částku
              </div>
            </div>
            <div>
              <label className="form-label">Poznámka</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Volitelná poznámka..."
                style={inputStyle}
                data-testid="finance-match-note"
              />
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
