import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { FormSection } from '../../shared/components/FormSection'
import { FormField } from '../../shared/components/FormField'
import { useCreateProperty, useUpdateProperty, useProperty } from './use-properties'
import { AddressAutocomplete } from '../../shared/components/AddressAutocomplete'
import type { PropertyLegalMode, AccountingSystemType } from './properties-api'
import { Info, Search, ArrowLeft } from 'lucide-react'
import { integrationsApi } from '../integrations/api/integrations.api'
import { apiClient } from '../../core/api/client'
import { LoadingState } from '../../shared/components'
import { useToast } from '../../shared/components/toast/Toast'
import { Link } from 'react-router-dom'

const PROPERTY_TYPES = [
  { value: 'bytdum', label: 'Bytový dům' },
  { value: 'roddum', label: 'Rodinný dům' },
  { value: 'komer', label: 'Komerční' },
  { value: 'prumysl', label: 'Průmyslový' },
  { value: 'pozemek', label: 'Pozemek' },
  { value: 'garaz', label: 'Garáž' },
]

const OWNERSHIP_TYPES = [
  { value: 'vlastnictvi', label: 'Vlastnictví' },
  { value: 'druzstvo', label: 'Družstvo' },
  { value: 'pronajem', label: 'Pronájem' },
]

const LEGAL_MODES: { value: PropertyLegalMode; label: string }[] = [
  { value: 'SVJ', label: 'SVJ (Společenství vlastníků)' },
  { value: 'BD', label: 'Bytové družstvo' },
  { value: 'RENTAL', label: 'Pronájem' },
  { value: 'OWNERSHIP', label: 'Vlastnictví' },
  { value: 'OTHER', label: 'Jiná' },
]

const ACCOUNTING_SYSTEMS: { value: AccountingSystemType; label: string }[] = [
  { value: 'NONE', label: 'Bez napojení' },
  { value: 'POHODA', label: 'Pohoda' },
  { value: 'MONEY_S3', label: 'Money S3' },
  { value: 'PREMIER', label: 'Premier' },
  { value: 'VARIO', label: 'Vario' },
]

export default function PropertyFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const isEdit = !!id

  const { data: property, isLoading: loadingProperty } = useProperty(id ?? '')
  const createMutation = useCreateProperty()
  const updateMutation = useUpdateProperty()

  if (isEdit && loadingProperty) return <LoadingState text="Načítání nemovitosti..." />

  return <PropertyFormInner
    property={isEdit ? property : undefined}
    isEdit={isEdit}
    createMutation={createMutation}
    updateMutation={updateMutation}
    navigate={navigate}
    toast={toast}
    queryClient={queryClient}
  />
}

function PropertyFormInner({ property, isEdit, createMutation, updateMutation, navigate, toast, queryClient }: any) {
  const [form, setForm] = useState({
    name: property?.name || '',
    address: property?.address || '',
    city: property?.city || '',
    postalCode: property?.postalCode || '',
    type: property?.type || 'bytdum',
    ownership: property?.ownership || 'vlastnictvi',
    legalMode: (property?.legalMode || 'OWNERSHIP') as PropertyLegalMode,
    ico: property?.ico || '',
    dic: property?.dic || '',
    isVatPayer: property?.isVatPayer || false,
    managedFrom: property?.managedFrom ? property.managedFrom.slice(0, 10) : '',
    managedTo: property?.managedTo ? property.managedTo.slice(0, 10) : '',
    accountingSystem: (property?.accountingSystem || 'NONE') as AccountingSystemType,
    cadastralArea: property?.cadastralArea || '',
    landRegistrySheet: property?.landRegistrySheet || '',
  })

  // Sync form state when property data arrives after initial render (edit mode)
  useEffect(() => {
    if (!property) return
    setForm({
      name: property.name || '', address: property.address || '',
      city: property.city || '', postalCode: property.postalCode || '',
      type: property.type || 'bytdum', ownership: property.ownership || 'vlastnictvi',
      legalMode: (property.legalMode || 'OWNERSHIP') as PropertyLegalMode,
      ico: property.ico || '', dic: property.dic || '',
      isVatPayer: property.isVatPayer || false,
      managedFrom: property.managedFrom ? property.managedFrom.slice(0, 10) : '',
      managedTo: property.managedTo ? property.managedTo.slice(0, 10) : '',
      accountingSystem: (property.accountingSystem || 'NONE') as AccountingSystemType,
      cadastralArea: property.cadastralArea || '',
      landRegistrySheet: property.landRegistrySheet || '',
    })
  }, [property])

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [aresLoading, setAresLoading] = useState(false)
  const [aresError, setAresError] = useState('')
  const [aresSuccess, setAresSuccess] = useState('')
  const [aresDefunct, setAresDefunct] = useState('')
  const [ruianVerified, setRuianVerified] = useState(false)
  const [enrichmentLoading, setEnrichmentLoading] = useState(false)
  const [enrichmentResult, setEnrichmentResult] = useState<any>(null)

  const set = (key: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }))

  const validateField = (field: string, value: string) => {
    const errs = { ...errors }
    switch (field) {
      case 'name': errs.name = value.trim() ? '' : 'Název je povinný'; break
      case 'address': errs.address = value.trim() ? '' : 'Adresa je povinná'; break
      case 'city': errs.city = value.trim() ? '' : 'Město je povinné'; break
      case 'postalCode':
        errs.postalCode = !value.trim() ? 'PSČ je povinné' :
          !/^\d{3}\s?\d{2}$/.test(value.trim()) ? 'PSČ musí mít 5 číslic' : ''
        break
      case 'ico':
        errs.ico = value && !/^\d{0,8}$/.test(value) ? 'IČ musí mít max 8 číslic' : ''
        break
    }
    Object.keys(errs).forEach(k => { if (!errs[k]) delete errs[k] })
    setErrors(errs)
  }

  const handleBlur = (field: string) => {
    validateField(field, String((form as Record<string, unknown>)[field] ?? ''))
  }

  const detectLegalMode = (pravniForma: string): PropertyLegalMode => {
    const lower = (pravniForma || '').toLowerCase()
    if (lower.includes('společenství vlastníků') || lower.includes('svj')) return 'SVJ'
    if (lower.includes('družstvo')) return 'BD'
    return 'OWNERSHIP'
  }

  const handleAres = async () => {
    if (!form.ico || form.ico.length < 8) { setAresError('Zadejte platné IČ (8 číslic)'); return }
    setAresLoading(true); setAresError(''); setAresDefunct(''); setAresSuccess('')
    try {
      const data = await integrationsApi.ares.lookupByIco(form.ico)
      if (data) {
        let addr = ''
        if (data.adresa.ulice) {
          addr = data.adresa.ulice
          if (data.adresa.cisloPopisne) addr += ` ${data.adresa.cisloPopisne}`
          if (data.adresa.cisloOrientacni) addr += `/${data.adresa.cisloOrientacni}`
        } else if (data.textovaAdresa) {
          addr = data.textovaAdresa
        }

        // Auto-detect SVJ/BD from legal form
        const detectedMode = detectLegalMode(data.pravniForma)

        setForm((f) => ({
          ...f,
          dic: data.dic ?? f.dic,
          name: f.name || data.nazev, // don't overwrite if already filled
          address: f.address || addr,
          city: f.city || data.adresa.obec,
          postalCode: f.postalCode || data.adresa.psc,
          legalMode: detectedMode,
          isVatPayer: !!(data.dic ?? f.dic),
        }))

        if (data.datumZaniku) setAresDefunct(data.datumZaniku)

        const filled: string[] = []
        if (data.nazev) filled.push('název')
        if (addr) filled.push('adresa')
        if (data.adresa.obec) filled.push('město')
        if (data.adresa.psc) filled.push('PSČ')
        if (data.dic) filled.push('DIČ')
        const typeLabel = detectedMode === 'SVJ' ? ' (SVJ)' : detectedMode === 'BD' ? ' (Bytové družstvo)' : ''
        setAresSuccess(`ARES: ${data.nazev}${typeLabel} — načteno (${filled.join(', ')})`)
      } else {
        setAresError('IČ nenalezeno v ARES')
      }
    } catch (err) {
      console.error('ARES lookup failed:', err)
      setAresError('Chyba při ověřování v ARES')
    } finally {
      setAresLoading(false)
    }
  }

  const showIcoFields = ['SVJ', 'BD', 'OTHER'].includes(form.legalMode)
  const showDicFields = showIcoFields && form.ico.length > 0

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Název je povinný'
    if (!form.address.trim()) errs.address = 'Adresa je povinná'
    if (!form.city.trim()) errs.city = 'Město je povinné'
    if (!form.postalCode.trim()) errs.postalCode = 'PSČ je povinné'
    if (form.ico && !/^\d{0,8}$/.test(form.ico)) errs.ico = 'IČ musí být max 8 číslic'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    const payload = {
      name: form.name, address: form.address, city: form.city,
      postalCode: form.postalCode, type: form.type, ownership: form.ownership,
      legalMode: form.legalMode, ico: form.ico || null, dic: form.dic || null,
      isVatPayer: form.isVatPayer, managedFrom: form.managedFrom || null,
      managedTo: form.managedTo || null,
      accountingSystem: form.accountingSystem !== 'NONE' ? form.accountingSystem : null,
      cadastralArea: form.cadastralArea || null, landRegistrySheet: form.landRegistrySheet || null,
    }
    try {
      if (isEdit) {
        if (!property?.id) { toast.error('Nemovitost nenalezena'); navigate('/properties'); return }
        await updateMutation.mutateAsync({ id: property.id, data: payload })
        toast.success('Nemovitost uložena')
        navigate(`/properties/${property.id}`)
      } else {
        const res = await createMutation.mutateAsync(payload)
        toast.success('Nemovitost vytvořena')
        queryClient.invalidateQueries({ queryKey: ['properties'] })
        navigate(`/properties/${res.id}`)
      }
    } catch {
      toast.error('Nepodařilo se uložit nemovitost')
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  const inputStyle = (field?: string): React.CSSProperties => ({
    width: '100%', padding: '8px 12px', borderRadius: 6,
    border: `1px solid ${field && errors[field] ? 'var(--danger)' : 'var(--border)'}`,
    background: 'var(--surface-2, var(--surface))', color: 'var(--text)', boxSizing: 'border-box',
  })

  const formatPsc = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 5)
    return digits.length > 3 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 16px 100px' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: '0.85rem' }}>
        <Link to="/properties" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Nemovitosti
        </Link>
        <span style={{ color: 'var(--text-muted)' }}>›</span>
        <span style={{ color: 'var(--dark)', fontWeight: 500 }}>{isEdit ? 'Upravit nemovitost' : 'Nová nemovitost'}</span>
      </div>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>
        {isEdit ? `Upravit — ${property?.name}` : 'Nová nemovitost'}
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 24 }}>
        Vyplňte údaje o nemovitosti
      </p>

      {/* RÚIAN Address Autocomplete */}
      {!isEdit && (
        <div style={{ marginBottom: 24, padding: 16, background: 'var(--primary-50, #f0fdfa)', borderRadius: 10, border: '1px solid var(--primary-100, #ccfbf1)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-dark)', marginBottom: 8 }}>
            Vyhledat adresu v RÚIAN
          </div>
          <AddressAutocomplete
            onSelect={async (addr) => {
              setForm(f => ({
                ...f,
                address: addr.street,
                city: addr.city,
                postalCode: formatPsc(addr.postalCode),
              }))
              setRuianVerified(true)

              // Enrichment chain
              setEnrichmentLoading(true)
              try {
                const res = await apiClient.post('/knowledge-base/enrich', {
                  street: addr.street, city: addr.city,
                  district: addr.district, postalCode: addr.postalCode,
                  houseNumber: addr.street?.match(/\d+/)?.[0],
                  lat: addr.lat, lng: addr.lng, ruianCode: addr.ruianCode,
                })
                setEnrichmentResult(res.data)
                // Auto-fill from enrichment
                const org = res.data?.freeData?.organization
                if (org) {
                  setForm(f => ({
                    ...f,
                    name: f.name || org.name,
                    ico: f.ico || org.ico,
                    dic: f.dic || org.dic || '',
                    legalMode: org.type === 'SVJ' ? 'SVJ' as PropertyLegalMode : org.type === 'BD' ? 'BD' as PropertyLegalMode : f.legalMode,
                    isVatPayer: !!(org.dic || f.dic),
                  }))
                }
              } catch { /* enrichment failed — basic RÚIAN data still filled */ }
              finally { setEnrichmentLoading(false) }
            }}
            placeholder="Začněte psát adresu nemovitosti..."
          />
          {ruianVerified && (
            <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--success, #16a34a)', display: 'flex', alignItems: 'center', gap: 4 }}>
              ✓ Adresa ověřena z RÚIAN
            </div>
          )}
          {enrichmentLoading && (
            <div style={{ marginTop: 8, fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              ⏳ Vyhledávám údaje o budově (ARES, ČÚZK)...
            </div>
          )}
          {enrichmentResult && !enrichmentLoading && (
            <div style={{ marginTop: 10, padding: 12, background: 'var(--gray-50)', borderRadius: 8, fontSize: '0.82rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--dark)', marginBottom: 6 }}>
                ✅ Nalezeno ({enrichmentResult.sources?.join(', ')}) — skóre {enrichmentResult.qualityScore}/100
              </div>
              {enrichmentResult.freeData?.organization && (
                <div style={{ marginBottom: 6 }}>
                  <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 4, background: 'var(--primary-50)', color: 'var(--primary)', fontWeight: 600, fontSize: '0.72rem', marginRight: 6 }}>
                    {enrichmentResult.freeData.organization.type}
                  </span>
                  <strong>{enrichmentResult.freeData.organization.name}</strong>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>IČO: {enrichmentResult.freeData.organization.ico}</span>
                </div>
              )}
              {enrichmentResult.freeData?.statutoryBodies?.length > 0 && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Statutární orgán: {enrichmentResult.freeData.statutoryBodies.map((sb: any) => `${sb.role}: ${sb.fullName}`).join(', ')}
                </div>
              )}
              {enrichmentResult.paidDataAvailable?.length > 0 && (
                <div style={{ marginTop: 8, padding: '6px 10px', background: 'var(--warning-light, #fef3c7)', borderRadius: 6, fontSize: '0.75rem', color: '#92400e' }}>
                  🔒 Dostupné placené zdroje: {enrichmentResult.paidDataAvailable.map((p: any) => p.name).join(', ')} — brzy dostupné
                </div>
              )}
            </div>
          )}
          <div style={{ marginTop: 6, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            nebo vyplňte adresu ručně níže
          </div>
        </div>
      )}

      {/* Main form card */}
      <div style={{ background: 'var(--card-bg, #fff)', borderRadius: 12, border: '1px solid var(--border)', padding: '20px 24px' }}>

        {/* Sekce 1: Identifikace */}
        <FormSection title="Identifikace" collapsible={false}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <FormField label="Typ nemovitosti" name="type">
              <select data-testid="property-form-type" value={form.type} onChange={(e) => set('type', e.target.value)} style={inputStyle()}>
                {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </FormField>
            <FormField label="Typ vlastnictví" name="ownership">
              <select data-testid="property-form-ownership" value={form.ownership} onChange={(e) => set('ownership', e.target.value)} style={inputStyle()}>
                {OWNERSHIP_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="Název" name="name" error={errors.name} data-testid-error="property-form-error-name">
            <input data-testid="property-form-name" value={form.name} onChange={(e) => set('name', e.target.value)} onBlur={() => handleBlur('name')} style={inputStyle('name')} />
          </FormField>
          <FormField label="Adresa" name="address" error={errors.address} data-testid-error="property-form-error-address">
            <input data-testid="property-form-address" value={form.address} onChange={(e) => set('address', e.target.value)} onBlur={() => handleBlur('address')} style={inputStyle('address')} />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12 }}>
            <FormField label="Město" name="city" error={errors.city} data-testid-error="property-form-error-city">
              <input data-testid="property-form-city" value={form.city} onChange={(e) => set('city', e.target.value)} onBlur={() => handleBlur('city')} style={inputStyle('city')} />
            </FormField>
            <FormField label="PSČ" name="postalCode" error={errors.postalCode} data-testid-error="property-form-error-postalCode">
              <input data-testid="property-form-zip" value={form.postalCode} onChange={(e) => set('postalCode', e.target.value)} onBlur={() => handleBlur('postalCode')} style={inputStyle('postalCode')} />
            </FormField>
          </div>
        </FormSection>

        {/* Sekce 2: Právní režim */}
        <FormSection title="Právní a účetní údaje" subtitle="Právní forma, IČ, DIČ, účetní systém" defaultExpanded={isEdit || showIcoFields}
          badge={<span title="Určuje chování systému"><Info size={14} style={{ color: 'var(--text-muted)' }} /></span>}>
          <FormField label="Právní forma" name="legalMode">
            <select data-testid="property-form-legalMode" value={form.legalMode} onChange={(e) => set('legalMode', e.target.value)} style={{ ...inputStyle(), fontWeight: 500 }}>
              {LEGAL_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </FormField>
          {showIcoFields && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <FormField label="IČ" name="ico" error={errors.ico} required={false}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input data-testid="property-form-ico" value={form.ico} onChange={(e) => set('ico', e.target.value.replace(/\D/g, '').slice(0, 8))} onBlur={() => handleBlur('ico')} placeholder="01234567" maxLength={8} style={{ ...inputStyle('ico'), flex: 1, fontFamily: 'var(--font-mono, monospace)' }} />
                    <button type="button" onClick={handleAres} disabled={aresLoading || isPending} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      <Search size={13} /> {aresLoading ? '...' : 'ARES'}
                    </button>
                  </div>
                </FormField>
                {aresError && <div style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: -8, marginBottom: 8 }}>{aresError}</div>}
                {aresSuccess && <div style={{ color: 'var(--success)', fontSize: '0.78rem', marginTop: -8, marginBottom: 8 }}>{aresSuccess}</div>}
                {aresDefunct && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: 4, padding: '4px 8px', color: 'var(--danger)', fontSize: '0.78rem', marginTop: -8, marginBottom: 8 }}>Zaniklý subjekt ({aresDefunct})</div>}
              </div>
              {showDicFields && (
                <FormField label="DIČ" name="dic" required={false}>
                  <input data-testid="property-form-dic" value={form.dic} onChange={(e) => set('dic', e.target.value.slice(0, 12))} placeholder="CZ01234567" maxLength={12} style={{ ...inputStyle(), fontFamily: 'var(--font-mono, monospace)' }} />
                </FormField>
              )}
            </div>
          )}
          {showDicFields && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer', marginTop: 4 }}>
              <input type="checkbox" checked={form.isVatPayer} onChange={(e) => set('isVatPayer', e.target.checked)} /> Plátce DPH
            </label>
          )}
          <FormField label="Účetní systém" name="accountingSystem" required={false}>
            <select value={form.accountingSystem} onChange={(e) => set('accountingSystem', e.target.value)} style={inputStyle()}>
              {ACCOUNTING_SYSTEMS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </FormField>
        </FormSection>

        {/* Sekce 3: Kontakty */}
        <FormSection title="Kontaktní údaje" defaultExpanded={false}>
          <FormField label="Kontaktní osoba" name="contactName" required={false} pii>
            <input disabled placeholder="Bude doplněno v detailu nemovitosti" style={{ ...inputStyle(), opacity: 0.5 }} />
          </FormField>
        </FormSection>

        {/* Sekce 4: Správa */}
        <FormSection title="Správa a katastr" defaultExpanded={false}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Ve správě od" name="managedFrom" required={false}>
              <input type="date" value={form.managedFrom} onChange={(e) => set('managedFrom', e.target.value)} style={inputStyle()} />
            </FormField>
            <FormField label="Ve správě do" name="managedTo" required={false}>
              <input type="date" value={form.managedTo} onChange={(e) => set('managedTo', e.target.value)} style={inputStyle()} />
            </FormField>
          </div>
          {form.managedTo && (
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '6px 10px', fontSize: '0.8rem', color: '#b45309', marginBottom: 12 }}>
              Nemovitost bude označena jako vyřazená ze správy.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Katastrální území" name="cadastralArea" required={false}>
              <input value={form.cadastralArea} onChange={(e) => set('cadastralArea', e.target.value)} placeholder="Vysočany" style={inputStyle()} />
            </FormField>
            <FormField label="List vlastnictví (LV)" name="landRegistrySheet" required={false}>
              <input value={form.landRegistrySheet} onChange={(e) => set('landRegistrySheet', e.target.value)} placeholder="1234" style={inputStyle()} />
            </FormField>
          </div>
        </FormSection>
      </div>

      {/* Sticky footer */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'var(--card-bg, #fff)', borderTop: '1px solid var(--border)',
        padding: '12px 24px', display: 'flex', justifyContent: 'center',
      }}>
        <div style={{ maxWidth: 800, width: '100%', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn" onClick={() => navigate('/properties')} data-testid="property-form-cancel">Zrušit</button>
          <button className="btn btn--primary" onClick={handleSubmit} disabled={isPending} data-testid="property-form-save">
            {isPending ? 'Ukládám...' : isEdit ? 'Uložit nemovitost' : 'Vytvořit nemovitost'}
          </button>
        </div>
      </div>
    </div>
  )
}
