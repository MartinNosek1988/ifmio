import { useState, useEffect, useMemo } from 'react';
import { Modal, Badge, Button } from '../../shared/components';
import { useResidentsStore, type Resident } from './residents-store';
import { loadFromStorage } from '../../core/storage';
import { formatKc, formatCzDate } from '../../shared/utils/format';
import ResidentForm from './ResidentForm';
import { usePrescriptions } from '../finance/api/finance.queries';
import { mapPrescription } from '../finance/api/finance.mappers';

interface Props {
  resident: Resident;
  onClose: () => void;
  onUpdated: () => void;
}

type DetailTab = 'prehled' | 'smlouva' | 'finance' | 'dokumenty' | 'komunikace' | 'historie';

const TABS: { key: DetailTab; label: string }[] = [
  { key: 'prehled', label: 'Přehled' },
  { key: 'smlouva', label: 'Smlouva' },
  { key: 'finance', label: 'Finance' },
  { key: 'dokumenty', label: 'Dokumenty' },
  { key: 'komunikace', label: 'Komunikace' },
  { key: 'historie', label: 'Historie' },
];

export default function ResidentDetailModal({ resident, onClose, onUpdated }: Props) {
  const [tab, setTab] = useState<DetailTab>('prehled');
  const [showEdit, setShowEdit] = useState(false);
  const { getLeasesByResident, terminateLease, load: loadResidents } = useResidentsStore();

  useEffect(() => { loadResidents(); }, []);

  const properties = loadFromStorage<Record<string, unknown>[]>('estateos_properties', []);
  const units = loadFromStorage<Record<string, unknown>[]>('estateos_units', []);
  const documents = loadFromStorage<Record<string, unknown>[]>('estateos_documents', []);

  const prop = properties.find(p => String(p.id) === String(resident.propId));
  const unit = units.find(u => String(u.id) === String(resident.jednotkaId));
  const leases = getLeasesByResident(String(resident.id));

  // Prescriptions from API
  const { data: presData } = usePrescriptions();
  const allPrescriptions = useMemo(() => (presData?.data ?? []).map(mapPrescription), [presData]);
  const myPredpisy = useMemo(() => allPrescriptions.filter(p =>
    String(p.tenantId) === String(resident.id) ||
    (resident.jednotkaId && String(p.jednotkaId) === String(resident.jednotkaId))
  ), [allPrescriptions, resident.id, resident.jednotkaId]);
  const myDocs = documents.filter(d =>
    String(d.propId) === String(resident.propId)
  );

  const celkovyDluh = myPredpisy
    .filter(p => p.status !== 'paid')
    .reduce((sum, p) => sum + (p.kUhrade ?? 0), 0);

  const initials = resident.jmeno.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
      <Modal open onClose={onClose} wide
        title=""
        footer={<Button onClick={onClose}>Zavřít</Button>}
      >
        {/* Custom header inside modal body */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: '1.2rem', flexShrink: 0,
              }}>
                {initials}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{resident.jmeno}</h2>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 2 }}>
                  {String(prop?.nazev || prop?.name || `#${resident.propId}`)}
                  {unit ? ` · Jednotka ${unit.cislo}` : ''}
                </div>
              </div>
            </div>
            <Button size="sm" onClick={() => setShowEdit(true)}>Upravit</Button>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <Badge variant={resident.status === 'aktivni' ? 'green' : 'red'}>
              {resident.status === 'aktivni' ? 'Aktivní' : resident.status === 'vystehovan' ? 'Vystěhovaný' : 'Neaktivní'}
            </Badge>
            {celkovyDluh > 0 && <Badge variant="red">Dluh: {formatKc(celkovyDluh)}</Badge>}
          </div>

          {/* Tabs */}
          <div className="tabs">
            {TABS.map(t => (
              <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`}
                onClick={() => setTab(t.key)}>
                {t.label}
                {t.key === 'finance' && celkovyDluh > 0 ? ' !' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* ── TAB: PŘEHLED ───────────────────────────────────────────── */}
        {tab === 'prehled' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <InfoField label="Jméno" value={resident.jmeno} />
              <InfoField label="Email" value={resident.email} href={resident.email ? `mailto:${resident.email}` : undefined} />
              <InfoField label="Telefon" value={resident.telefon} />
              <InfoField label="Nastěhování" value={formatCzDate(resident.datumNastehovani)} />
              {resident.datumVystehovani && <InfoField label="Vystěhování" value={formatCzDate(resident.datumVystehovani)} />}
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 10, fontSize: '0.9rem' }}>Bydliště</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.875rem' }}>
                <div>
                  <div className="text-muted text-sm">Nemovitost</div>
                  <div style={{ fontWeight: 500 }}>{String(prop?.nazev || prop?.name || '—')}</div>
                  {prop?.ulice != null && <div className="text-muted text-sm">{String(prop.ulice)}, {String(prop.mesto || '')}</div>}
                </div>
                {unit && (
                  <div>
                    <div className="text-muted text-sm">Jednotka</div>
                    <div style={{ fontWeight: 500 }}>č. {String(unit.cislo)}</div>
                    <div className="text-muted text-sm">
                      {String(unit.typ || unit.type)} · {String(unit.plocha || unit.podlahova_plocha)} m²
                      {unit.najemne ? ` · ${formatKc(Number(unit.najemne))}/měs` : ''}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {resident.poznamka && (
              <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12, fontSize: '0.875rem' }}>
                <div className="text-muted text-sm" style={{ marginBottom: 4 }}>POZNÁMKA</div>
                {resident.poznamka}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: SMLOUVA ───────────────────────────────────────────── */}
        {tab === 'smlouva' && (
          <div>
            {leases.length === 0 ? (
              <EmptyTab text="Žádná nájemní smlouva" />
            ) : leases.map(l => (
              <div key={l.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{l.najemnik}</div>
                    <div className="text-muted text-sm">
                      {formatCzDate(l.datumOd)} — {l.datumDo ? formatCzDate(l.datumDo) : 'na dobu neurčitou'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Badge variant={l.status === 'aktivni' ? 'green' : l.status === 'ukoncena' ? 'red' : 'yellow'}>
                      {l.status === 'aktivni' ? 'Aktivní' : l.status === 'ukoncena' ? 'Ukončena' : 'Připravovaná'}
                    </Badge>
                    {l.status === 'aktivni' && (
                      <Button size="sm" variant="danger" onClick={() => {
                        if (confirm('Ukončit smlouvu k dnešnímu datu?')) {
                          terminateLease(l.id);
                          loadResidents();
                        }
                      }}>Ukončit</Button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, fontSize: '0.85rem' }}>
                  <div>
                    <div className="text-muted">Měsíční nájem</div>
                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>{formatKc(l.mesicniNajem)}</div>
                  </div>
                  {l.kauce != null && (
                    <div>
                      <div className="text-muted">Kauce</div>
                      <div style={{ fontWeight: 500 }}>{formatKc(l.kauce)}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-muted">Jednotka</div>
                    <div style={{ fontWeight: 500 }}>{unit ? String(unit.cislo) : l.jednotkaId || '—'}</div>
                  </div>
                </div>
                {l.poznamka && (
                  <div style={{ marginTop: 10, fontSize: '0.85rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                    {l.poznamka}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── TAB: FINANCE ───────────────────────────────────────────── */}
        {tab === 'finance' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              <StatCard label="CELKEM PŘEDPISŮ" value={String(myPredpisy.length)} />
              <StatCard label="DLUH K ÚHRADĚ" value={formatKc(celkovyDluh)}
                color={celkovyDluh > 0 ? 'var(--danger)' : 'var(--success)'} />
              <StatCard label="ZAPLACENO"
                value={formatKc(myPredpisy.filter(p => p.status === 'paid').reduce((s, p) => s + p.castka, 0))}
                color="var(--success)" />
            </div>

            {myPredpisy.length === 0 ? (
              <EmptyTab text="Žádné finanční předpisy" />
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '6px 0', fontWeight: 500 }} className="text-muted">POPIS</th>
                    <th style={{ textAlign: 'left', padding: '6px 0', fontWeight: 500 }} className="text-muted">SPLATNOST</th>
                    <th style={{ textAlign: 'left', padding: '6px 0', fontWeight: 500 }} className="text-muted">STATUS</th>
                    <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 500 }} className="text-muted">K ÚHRADĚ</th>
                  </tr>
                </thead>
                <tbody>
                  {myPredpisy.map(p => {
                    const overdue = p.splatnost < new Date().toISOString().slice(0, 10) && p.status !== 'paid';
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 0' }}>{p.popis}</td>
                        <td style={{ padding: '8px 0', color: overdue ? 'var(--danger)' : 'var(--text-muted)' }}>{formatCzDate(p.splatnost)}</td>
                        <td style={{ padding: '8px 0' }}>
                          <Badge variant={p.status === 'paid' ? 'green' : overdue ? 'red' : 'yellow'}>
                            {p.status === 'paid' ? 'Zaplaceno' : p.status === 'partial' ? 'Částečně' : overdue ? 'Po splatnosti' : 'Čeká'}
                          </Badge>
                        </td>
                        <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: (p.kUhrade ?? 0) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                          {formatKc(p.kUhrade ?? 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── TAB: DOKUMENTY ─────────────────────────────────────────── */}
        {tab === 'dokumenty' && (
          <div>
            {myDocs.length === 0 ? (
              <EmptyTab text="Žádné dokumenty" />
            ) : myDocs.map(d => (
              <div key={String(d.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{String(d.nazev || d.name || d.id)}</div>
                  <div className="text-muted text-sm">{formatCzDate(String(d.created_at || ''))}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TAB: KOMUNIKACE ────────────────────────────────────────── */}
        {tab === 'komunikace' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {resident.email && (
                <a href={`mailto:${resident.email}`} style={{ textDecoration: 'none' }}>
                  <Button>Poslat email</Button>
                </a>
              )}
              {resident.telefon && (
                <a href={`tel:${resident.telefon}`} style={{ textDecoration: 'none' }}>
                  <Button>Zavolat</Button>
                </a>
              )}
            </div>
            <EmptyTab text="Žádná komunikace" sub="Historie komunikace bude zobrazena zde" />
          </div>
        )}

        {/* ── TAB: HISTORIE ──────────────────────────────────────────── */}
        {tab === 'historie' && (
          <div style={{ paddingLeft: 8 }}>
            {[
              { datum: resident.created_at, text: 'Bydlící přidán do systému', type: 'create' as const },
              { datum: resident.datumNastehovani, text: 'Nastěhování', type: 'move' as const },
              ...leases.map(l => ({
                datum: l.datumOd,
                text: `Nájemní smlouva ${formatCzDate(l.datumOd)} — ${l.datumDo ? formatCzDate(l.datumDo) : 'na dobu neurčitou'}, ${formatKc(l.mesicniNajem)}/měs`,
                type: 'lease' as const,
              })),
              ...myPredpisy.filter(p => p.status === 'paid').map(p => ({
                datum: p.updated_at || p.datum,
                text: `Uhrazen předpis: ${p.popis}`,
                type: 'payment' as const,
              })),
              ...(resident.datumVystehovani ? [{ datum: resident.datumVystehovani, text: 'Vystěhování', type: 'move' as const }] : []),
            ]
              .filter(item => item.datum)
              .sort((a, b) => (a.datum || '').localeCompare(b.datum || ''))
              .map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 14, position: 'relative' }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                    background: item.type === 'payment' ? 'var(--success)' : item.type === 'lease' ? 'var(--primary)' : 'var(--text-muted)',
                  }} />
                  <div>
                    <div style={{ fontSize: '0.875rem' }}>{item.text}</div>
                    <div className="text-muted text-sm">{formatCzDate(item.datum || '')}</div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Modal>

      {showEdit && (
        <ResidentForm resident={resident} onClose={() => { setShowEdit(false); loadResidents(); onUpdated(); }} />
      )}
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function InfoField({ label, value, href }: { label: string; value?: string; href?: string }) {
  return (
    <div>
      <div className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      {href && value
        ? <a href={href} style={{ color: 'var(--primary)', fontSize: '0.9rem', textDecoration: 'none' }}>{value}</a>
        : <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{value || '—'}</div>
      }
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: '1.1rem', color }}>{value}</div>
    </div>
  );
}

function EmptyTab({ text, sub }: { text: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{text}</div>
      {sub && <div style={{ fontSize: '0.85rem' }}>{sub}</div>}
    </div>
  );
}
