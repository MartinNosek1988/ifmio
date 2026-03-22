import { useState, useMemo } from 'react'
import { Button, Badge, EmptyState, LoadingState } from '../../../shared/components'
import { useToast } from '../../../shared/components/toast/Toast'
import { useProperties, useProperty } from '../../properties/use-properties'
import { useBankAccounts } from '../api/finance.queries'
import { usePropertyComponents } from '../api/components.queries'
import { useMeters } from '../../meters/api/meters.queries'
import {
  usePropertyInitialBalances,
  useBulkSetOwnerBalances,
  useSetBankBalance,
  useSetFundBalance,
  useSetDeposit,
  useSetMeterReading,
} from '../api/initial-balances.queries'
import type { KontoStatusItem } from '../api/initial-balances.api'

/* ─── Formatting ──────────────────────────────────────────────── */

function fmtCzk(n: number) {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', minimumFractionDigits: 2 }).format(n)
}

/* ─── Styles ──────────────────────────────────────────────────── */

const sectionStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 10, marginBottom: 16, overflow: 'hidden',
}
const sectionHeaderStyle: React.CSSProperties = {
  padding: '12px 16px', fontWeight: 600, fontSize: '0.95rem',
  cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
}
const thStyle: React.CSSProperties = {
  padding: '8px 12px', fontWeight: 600, fontSize: '.8rem',
  color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border)',
}
const tdStyle: React.CSSProperties = { padding: '8px 12px', verticalAlign: 'middle' }
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 10px', borderRadius: 6, boxSizing: 'border-box',
  border: '1px solid var(--border)', background: 'var(--surface-2, var(--surface))',
  color: 'var(--text)', fontSize: '.85rem',
}
const selectStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)',
  background: 'var(--surface)', color: 'var(--text)', fontSize: '.85rem',
}

/* ─── Component ───────────────────────────────────────────────── */

export default function InitialBalancesTab() {
  const toast = useToast()
  const { data: properties = [] } = useProperties()
  const [propertyId, setPropertyId] = useState('')
  if (!propertyId && properties.length > 0) setPropertyId(properties[0].id)

  const [cutoverDate, setCutoverDate] = useState(new Date().toISOString().slice(0, 10))
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ owners: true })

  const { data: property } = useProperty(propertyId)
  const { data: ibData, isLoading } = usePropertyInitialBalances(propertyId || undefined)
  const { data: bankAccounts = [] } = useBankAccounts()
  const { data: components = [] } = usePropertyComponents(propertyId || undefined)
  const { data: metersData } = useMeters(propertyId ? { propertyId } : undefined)

  const bulkOwnerMut = useBulkSetOwnerBalances()
  const setBankMut = useSetBankBalance()
  const setFundMut = useSetFundBalance()
  const setDepositMut = useSetDeposit()
  const setMeterMut = useSetMeterReading()

  // Units with residents from konto status (more reliable — has residentId)
  const units = useMemo(() => {
    const propertyUnits = property?.units ?? []
    const status = ibData?.kontoStatus ?? []
    return propertyUnits.map(u => {
      const ks = status.find((s: KontoStatusItem) => s.unitId === u.id)
      const occ = u.occupancies?.find((o: any) => o.isActive && o.isPrimaryPayer)
      return {
        ...u,
        resident: ks ? { id: ks.residentId, firstName: ks.residentName.split(' ').slice(0, -1).join(' '), lastName: ks.residentName.split(' ').pop() ?? '' } :
          occ?.resident ? { id: '', firstName: occ.resident.firstName, lastName: occ.resident.lastName } : null,
        residentId: ks?.residentId ?? '',
      }
    })
  }, [property, ibData])

  // Owner balance form state: { [unitId]: { amount, note } }
  const [ownerForms, setOwnerForms] = useState<Record<string, { amount: string; note: string }>>({})
  const [bankForms, setBankForms] = useState<Record<string, { amount: string; note: string }>>({})
  const [fundForms, setFundForms] = useState<Record<string, { amount: string; note: string }>>({})
  const [depositForms, setDepositForms] = useState<Record<string, { amount: string; note: string }>>({})
  const [meterForms, setMeterForms] = useState<Record<string, { value: string; note: string }>>({})

  // Pre-fill from existing data
  useMemo(() => {
    if (!ibData) return
    const oForms: Record<string, { amount: string; note: string }> = {}
    for (const ib of ibData.ownerBalances) {
      if (ib.entityId) oForms[ib.entityId] = { amount: String(ib.amount), note: ib.note ?? '' }
    }
    setOwnerForms(prev => ({ ...oForms, ...prev }))

    const bForms: Record<string, { amount: string; note: string }> = {}
    for (const ib of ibData.bankBalances) {
      if (ib.entityId) bForms[ib.entityId] = { amount: String(ib.amount), note: ib.note ?? '' }
    }
    setBankForms(prev => ({ ...bForms, ...prev }))

    const fForms: Record<string, { amount: string; note: string }> = {}
    for (const ib of ibData.fundBalances) {
      if (ib.entityId) fForms[ib.entityId] = { amount: String(ib.amount), note: ib.note ?? '' }
    }
    setFundForms(prev => ({ ...fForms, ...prev }))

    const dForms: Record<string, { amount: string; note: string }> = {}
    for (const ib of ibData.deposits) {
      if (ib.entityId) dForms[ib.entityId] = { amount: String(ib.amount), note: ib.note ?? '' }
    }
    setDepositForms(prev => ({ ...dForms, ...prev }))

    const mForms: Record<string, { value: string; note: string }> = {}
    for (const ib of ibData.meterReadings) {
      if (ib.entityId) mForms[ib.entityId] = { value: String(ib.meterValue ?? 0), note: ib.note ?? '' }
    }
    setMeterForms(prev => ({ ...mForms, ...prev }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ibData])

  // Saved status helpers
  const ownerSaved = new Set(ibData?.ownerBalances.map(b => b.entityId) ?? [])
  const kontoMap = new Map((ibData?.kontoStatus ?? []).map((k: KontoStatusItem) => [k.unitId, k]))
  const bankSaved = new Set(ibData?.bankBalances.map(b => b.entityId) ?? [])
  const fundSaved = new Set(ibData?.fundBalances.map(b => b.entityId) ?? [])
  const depositSaved = new Set(ibData?.deposits.map(b => b.entityId) ?? [])
  const meterSaved = new Set(ibData?.meterReadings.map(b => b.entityId) ?? [])

  const propertyBankAccounts = bankAccounts.filter(a => a.propertyId === propertyId && a.isActive)
  const fundComponents = (components as any[]).filter(c => c.type === 'FUND' || c.type === 'REPAIR_FUND')
  const meters: any[] = Array.isArray(metersData) ? metersData : (metersData as any)?.data ?? []

  const toggle = (key: string) => setExpanded(e => ({ ...e, [key]: !e[key] }))

  // ─── HANDLERS ─────────────────────────────────────────────────

  const handleSaveOwners = () => {
    const items = units
      .filter(u => u.resident && ownerForms[u.id]?.amount)
      .map(u => ({
        unitId: u.id,
        residentId: u.residentId,
        amount: Number(ownerForms[u.id].amount),
        note: ownerForms[u.id].note || undefined,
      }))
      .filter(i => !isNaN(i.amount))

    if (items.length === 0) { toast.error('Žádné hodnoty k uložení'); return }

    bulkOwnerMut.mutate({ propertyId, cutoverDate, items }, {
      onSuccess: (res) => {
        toast.success(`Uloženo: ${res.processed}, přeskočeno: ${res.skipped}, chyb: ${res.errors}`)
      },
      onError: () => toast.error('Chyba při ukládání'),
    })
  }

  const handleSaveBank = (accId: string) => {
    const form = bankForms[accId]
    if (!form?.amount) return
    setBankMut.mutate({
      propertyId, bankAccountId: accId,
      amount: Number(form.amount), cutoverDate, note: form.note || undefined,
    }, {
      onSuccess: () => toast.success('Zůstatek uložen'),
      onError: () => toast.error('Chyba'),
    })
  }

  const handleSaveFund = (compId: string) => {
    const form = fundForms[compId]
    if (!form?.amount) return
    setFundMut.mutate({
      propertyId, componentId: compId,
      amount: Number(form.amount), cutoverDate, note: form.note || undefined,
    }, {
      onSuccess: () => toast.success('Fond uložen'),
      onError: () => toast.error('Chyba'),
    })
  }

  const handleSaveDeposit = (unitId: string, residentId: string) => {
    const form = depositForms[unitId]
    if (!form?.amount) return
    setDepositMut.mutate({
      propertyId, unitId, residentId,
      amount: Number(form.amount), cutoverDate, note: form.note || undefined,
    }, {
      onSuccess: () => toast.success('Kauce uložena'),
      onError: () => toast.error('Chyba'),
    })
  }

  const handleSaveMeter = (meterId: string) => {
    const form = meterForms[meterId]
    if (!form?.value) return
    setMeterMut.mutate({
      propertyId, meterId,
      value: Number(form.value), cutoverDate, note: form.note || undefined,
    }, {
      onSuccess: () => toast.success('Stav měřidla uložen'),
      onError: () => toast.error('Chyba'),
    })
  }

  // ─── SUMMARY ──────────────────────────────────────────────────

  const summary = useMemo(() => {
    const ownerItems = ibData?.ownerBalances ?? []
    const debts = ownerItems.filter(b => Number(b.amount) > 0).reduce((s, b) => s + Number(b.amount), 0)
    const overpayments = ownerItems.filter(b => Number(b.amount) < 0).reduce((s, b) => s + Math.abs(Number(b.amount)), 0)
    const deposits = (ibData?.deposits ?? []).reduce((s, b) => s + Number(b.amount), 0)
    const funds = (ibData?.fundBalances ?? []).reduce((s, b) => s + Number(b.amount), 0)
    const banks = (ibData?.bankBalances ?? []).reduce((s, b) => s + Number(b.amount), 0)
    return { debts, overpayments, deposits, funds, banks }
  }, [ibData])

  if (!propertyId) return <EmptyState title="Žádná nemovitost" />

  // ─── RENDER ───────────────────────────────────────────────────

  return (
    <div data-testid="initial-balances-tab">
      {/* Header */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        {properties.length > 1 && (
          <select value={propertyId} onChange={e => setPropertyId(e.target.value)} style={selectStyle}>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Datum přechodu:</label>
          <input
            type="date"
            value={cutoverDate}
            onChange={e => setCutoverDate(e.target.value)}
            style={{ ...inputStyle, width: 160 }}
            data-testid="initial-balances-cutover-date"
          />
        </div>
      </div>

      {isLoading && <LoadingState />}

      {/* Section 1: Owners */}
      <div style={sectionStyle} data-testid="initial-balances-owner-section">
        <div style={sectionHeaderStyle} onClick={() => toggle('owners')}>
          <span>1. Zůstatky vlastníků / nájemců</span>
          <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{expanded.owners ? '▼' : '▶'}</span>
        </div>
        {expanded.owners && (
          <div style={{ padding: '0 16px 16px' }}>
            <div className="text-muted" style={{ fontSize: '.8rem', marginBottom: 8 }}>
              Kladná hodnota = dluh, záporná = přeplatek
            </div>
            {units.length === 0 ? (
              <EmptyState title="Žádné jednotky" description="Nejprve vytvořte jednotky s bydlícími." />
            ) : (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Jednotka</th>
                      <th style={thStyle}>Vlastník / Nájemce</th>
                      <th style={{ ...thStyle, width: 160 }}>Dluh (+) / Přeplatek (−)</th>
                      <th style={{ ...thStyle, width: 180 }}>Poznámka</th>
                      <th style={{ ...thStyle, width: 80 }}>Stav</th>
                    </tr>
                  </thead>
                  <tbody>
                    {units.map(u => {
                      const form = ownerForms[u.id] ?? { amount: '', note: '' }
                      const saved = ownerSaved.has(u.id) || kontoMap.get(u.id)?.hasOpeningBalance
                      const amt = Number(form.amount)
                      return (
                        <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }} data-testid={`initial-balances-owner-row-${u.id}`}>
                          <td style={tdStyle}>{u.name}</td>
                          <td style={tdStyle}>{u.resident ? `${(u.resident as any).firstName} ${(u.resident as any).lastName}` : <span className="text-muted">— neobsazeno —</span>}</td>
                          <td style={tdStyle}>
                            <input
                              type="number"
                              value={form.amount}
                              onChange={e => setOwnerForms(f => ({ ...f, [u.id]: { ...f[u.id], amount: e.target.value, note: f[u.id]?.note ?? '' } }))}
                              placeholder="0"
                              style={{ ...inputStyle, color: amt > 0 ? 'var(--danger)' : amt < 0 ? 'var(--success)' : 'var(--text)' }}
                              disabled={!u.resident}
                              data-testid={`initial-balances-owner-amount-${u.id}`}
                            />
                          </td>
                          <td style={tdStyle}>
                            <input
                              value={form.note}
                              onChange={e => setOwnerForms(f => ({ ...f, [u.id]: { ...f[u.id], amount: f[u.id]?.amount ?? '', note: e.target.value } }))}
                              placeholder="—"
                              style={inputStyle}
                              disabled={!u.resident}
                            />
                          </td>
                          <td style={tdStyle}>
                            {saved ? <Badge variant="green">Uloženo</Badge> : <span className="text-muted">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="primary"
                    onClick={handleSaveOwners}
                    disabled={bulkOwnerMut.isPending}
                    data-testid="initial-balances-owner-save-all"
                  >
                    {bulkOwnerMut.isPending ? 'Ukládám...' : 'Uložit vše'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Section 2: Bank accounts */}
      <div style={sectionStyle} data-testid="initial-balances-bank-section">
        <div style={sectionHeaderStyle} onClick={() => toggle('banks')}>
          <span>2. Bankovní účty</span>
          <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{expanded.banks ? '▼' : '▶'}</span>
        </div>
        {expanded.banks && (
          <div style={{ padding: '0 16px 16px' }}>
            {propertyBankAccounts.length === 0 ? (
              <EmptyState title="Žádné bankovní účty" description="Přidejte účty v záložce Účty." />
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Účet</th>
                    <th style={thStyle}>Číslo</th>
                    <th style={{ ...thStyle, width: 160 }}>Zůstatek</th>
                    <th style={{ ...thStyle, width: 180 }}>Poznámka</th>
                    <th style={{ ...thStyle, width: 80 }}>Stav</th>
                    <th style={{ ...thStyle, width: 80 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {propertyBankAccounts.map(acc => {
                    const form = bankForms[acc.id] ?? { amount: '', note: '' }
                    const saved = bankSaved.has(acc.id)
                    return (
                      <tr key={acc.id} style={{ borderBottom: '1px solid var(--border)' }} data-testid={`initial-balances-bank-row-${acc.id}`}>
                        <td style={tdStyle}><span style={{ fontWeight: 500 }}>{acc.name}</span></td>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '.82rem' }}>{acc.accountNumber}/{acc.bankCode}</td>
                        <td style={tdStyle}>
                          <input type="number" value={form.amount}
                            onChange={e => setBankForms(f => ({ ...f, [acc.id]: { ...f[acc.id], amount: e.target.value, note: f[acc.id]?.note ?? '' } }))}
                            placeholder="0" style={inputStyle} />
                        </td>
                        <td style={tdStyle}>
                          <input value={form.note}
                            onChange={e => setBankForms(f => ({ ...f, [acc.id]: { ...f[acc.id], amount: f[acc.id]?.amount ?? '', note: e.target.value } }))}
                            placeholder="—" style={inputStyle} />
                        </td>
                        <td style={tdStyle}>{saved ? <Badge variant="green">Uloženo</Badge> : <span className="text-muted">—</span>}</td>
                        <td style={tdStyle}>
                          <Button size="sm" onClick={() => handleSaveBank(acc.id)} disabled={setBankMut.isPending}>Uložit</Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Section 3: Funds */}
      <div style={sectionStyle} data-testid="initial-balances-fund-section">
        <div style={sectionHeaderStyle} onClick={() => toggle('funds')}>
          <span>3. Fondy</span>
          <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{expanded.funds ? '▼' : '▶'}</span>
        </div>
        {expanded.funds && (
          <div style={{ padding: '0 16px 16px' }}>
            {fundComponents.length === 0 ? (
              <EmptyState title="Žádné fondy" description="Nejprve vytvořte fond ve Složkách předpisu." />
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Fond</th>
                    <th style={{ ...thStyle, width: 160 }}>Zůstatek</th>
                    <th style={{ ...thStyle, width: 180 }}>Poznámka</th>
                    <th style={{ ...thStyle, width: 80 }}>Stav</th>
                    <th style={{ ...thStyle, width: 80 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {fundComponents.map((c: any) => {
                    const form = fundForms[c.id] ?? { amount: '', note: '' }
                    const saved = fundSaved.has(c.id)
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={tdStyle}><span style={{ fontWeight: 500 }}>{c.name}</span></td>
                        <td style={tdStyle}>
                          <input type="number" value={form.amount}
                            onChange={e => setFundForms(f => ({ ...f, [c.id]: { ...f[c.id], amount: e.target.value, note: f[c.id]?.note ?? '' } }))}
                            placeholder="0" style={inputStyle} />
                        </td>
                        <td style={tdStyle}>
                          <input value={form.note}
                            onChange={e => setFundForms(f => ({ ...f, [c.id]: { ...f[c.id], amount: f[c.id]?.amount ?? '', note: e.target.value } }))}
                            placeholder="—" style={inputStyle} />
                        </td>
                        <td style={tdStyle}>{saved ? <Badge variant="green">Uloženo</Badge> : <span className="text-muted">—</span>}</td>
                        <td style={tdStyle}>
                          <Button size="sm" onClick={() => handleSaveFund(c.id)} disabled={setFundMut.isPending}>Uložit</Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Section 4: Deposits */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle} onClick={() => toggle('deposits')}>
          <span>4. Kauce</span>
          <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{expanded.deposits ? '▼' : '▶'}</span>
        </div>
        {expanded.deposits && (
          <div style={{ padding: '0 16px 16px' }}>
            {units.filter(u => u.resident).length === 0 ? (
              <EmptyState title="Žádní bydlící" description="Kauce se zadávají pro obsazené jednotky." />
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Jednotka</th>
                    <th style={thStyle}>Nájemce</th>
                    <th style={{ ...thStyle, width: 140 }}>Kauce (Kč)</th>
                    <th style={{ ...thStyle, width: 180 }}>Poznámka</th>
                    <th style={{ ...thStyle, width: 80 }}>Stav</th>
                    <th style={{ ...thStyle, width: 80 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {units.filter(u => u.resident).map(u => {
                    const form = depositForms[u.id] ?? { amount: '', note: '' }
                    const saved = depositSaved.has(u.id)
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={tdStyle}>{u.name}</td>
                        <td style={tdStyle}>{`${(u.resident as any).firstName} ${(u.resident as any).lastName}`}</td>
                        <td style={tdStyle}>
                          <input type="number" min="0" value={form.amount}
                            onChange={e => setDepositForms(f => ({ ...f, [u.id]: { ...f[u.id], amount: e.target.value, note: f[u.id]?.note ?? '' } }))}
                            placeholder="0" style={inputStyle} />
                        </td>
                        <td style={tdStyle}>
                          <input value={form.note}
                            onChange={e => setDepositForms(f => ({ ...f, [u.id]: { ...f[u.id], amount: f[u.id]?.amount ?? '', note: e.target.value } }))}
                            placeholder="—" style={inputStyle} />
                        </td>
                        <td style={tdStyle}>{saved ? <Badge variant="green">Uloženo</Badge> : <span className="text-muted">—</span>}</td>
                        <td style={tdStyle}>
                          <Button size="sm" onClick={() => handleSaveDeposit(u.id, u.residentId)} disabled={setDepositMut.isPending}>Uložit</Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Section 5: Meters */}
      <div style={sectionStyle} data-testid="initial-balances-meter-section">
        <div style={sectionHeaderStyle} onClick={() => toggle('meters')}>
          <span>5. Měřidla</span>
          <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{expanded.meters ? '▼' : '▶'}</span>
        </div>
        {expanded.meters && (
          <div style={{ padding: '0 16px 16px' }}>
            {(meters as any[]).length === 0 ? (
              <EmptyState title="Žádná měřidla" description="Nejprve přidejte měřidla v modulu Měřidla." />
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Měřidlo</th>
                    <th style={thStyle}>Typ</th>
                    <th style={{ ...thStyle, width: 140 }}>Počáteční stav</th>
                    <th style={{ ...thStyle, width: 180 }}>Poznámka</th>
                    <th style={{ ...thStyle, width: 80 }}>Stav</th>
                    <th style={{ ...thStyle, width: 80 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {(meters as any[]).map((m: any) => {
                    const form = meterForms[m.id] ?? { value: '', note: '' }
                    const saved = meterSaved.has(m.id)
                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={tdStyle}><span style={{ fontWeight: 500 }}>{m.name}</span></td>
                        <td style={tdStyle}><Badge variant="blue">{m.meterType ?? m.unit}</Badge></td>
                        <td style={tdStyle}>
                          <input type="number" min="0" step="0.001" value={form.value}
                            onChange={e => setMeterForms(f => ({ ...f, [m.id]: { ...f[m.id], value: e.target.value, note: f[m.id]?.note ?? '' } }))}
                            placeholder="0.000" style={inputStyle} />
                        </td>
                        <td style={tdStyle}>
                          <input value={form.note}
                            onChange={e => setMeterForms(f => ({ ...f, [m.id]: { ...f[m.id], value: f[m.id]?.value ?? '', note: e.target.value } }))}
                            placeholder="—" style={inputStyle} />
                        </td>
                        <td style={tdStyle}>{saved ? <Badge variant="green">Uloženo</Badge> : <span className="text-muted">—</span>}</td>
                        <td style={tdStyle}>
                          <Button size="sm" onClick={() => handleSaveMeter(m.id)} disabled={setMeterMut.isPending}>Uložit</Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Summary bar */}
      <div data-testid="initial-balances-summary" style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
        padding: '12px 16px', display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '.85rem',
      }}>
        <span>Dluhů: <strong style={{ color: 'var(--danger)' }}>{fmtCzk(summary.debts)}</strong></span>
        <span>Přeplatků: <strong style={{ color: 'var(--success)' }}>{fmtCzk(summary.overpayments)}</strong></span>
        <span>Kaucí: <strong>{fmtCzk(summary.deposits)}</strong></span>
        <span>Fondy: <strong>{fmtCzk(summary.funds)}</strong></span>
        <span>Banky: <strong>{fmtCzk(summary.banks)}</strong></span>
      </div>
    </div>
  )
}
