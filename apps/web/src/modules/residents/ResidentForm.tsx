import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import {
  residentSchema,
  residentDefaultValues,
  type ResidentFormValues,
} from './schemas/resident.schema';
import { useCreateResident, useUpdateResident } from './api/residents.queries';
import { residentsApi, type ApiResident } from './api/residents.api';
import { useProperties } from '../properties/use-properties';
import { useToast } from '../../shared/components/toast/Toast';
import { Modal, Button } from '../../shared/components';

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span style={{ color: '#ef4444', fontSize: 12, marginTop: 4, display: 'block' }}>{message}</span>;
}

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%', padding: '8px 12px',
  border: `1px solid ${hasError ? 'var(--danger, #ef4444)' : 'var(--border, #d1d5db)'}`,
  borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  background: 'var(--surface-2, var(--surface, #fff))', color: 'var(--text, #374151)',
});

const hintStyle: React.CSSProperties = { fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 };

function residentToFormValues(r: ApiResident): Partial<ResidentFormValues> {
  return {
    isLegalEntity: r.isLegalEntity ?? false,
    firstName: r.firstName ?? '', lastName: r.lastName ?? '',
    email: r.email ?? '', phone: r.phone ?? '',
    role: (r.role as ResidentFormValues['role']) ?? 'tenant',
    propertyId: r.propertyId ?? '', unitId: r.unitId ?? '',
    ico: r.ico ?? '', dic: r.dic ?? '', companyName: r.companyName ?? '',
    correspondenceAddress: r.correspondenceAddress ?? '',
    correspondenceCity: r.correspondenceCity ?? '',
    correspondencePostalCode: r.correspondencePostalCode ?? '',
    dataBoxId: r.dataBoxId ?? '',
    birthDate: r.birthDate ? r.birthDate.slice(0, 10) : '',
    note: r.note ?? '',
  };
}

interface Props { resident?: ApiResident; onClose: () => void; }

export default function ResidentForm({ resident, onClose }: Props) {
  const isEdit = !!resident;
  const toast = useToast();
  const createMut = useCreateResident();
  const updateMut = useUpdateResident();
  const { data: properties = [] } = useProperties();
  const [aresLoading, setAresLoading] = useState(false);
  const [aresError, setAresError] = useState('');
  const [showAddress, setShowAddress] = useState(!!resident?.correspondenceAddress);
  const [showExtra, setShowExtra] = useState(!!resident?.dataBoxId);

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors, isDirty, isSubmitting } } = useForm<ResidentFormValues>({
    resolver: zodResolver(residentSchema),
    defaultValues: resident ? { ...residentDefaultValues, ...residentToFormValues(resident) } : residentDefaultValues,
  });

  useEffect(() => { if (resident) reset({ ...residentDefaultValues, ...residentToFormValues(resident) }); }, [resident?.id, reset]);

  const selectedPropertyId = watch('propertyId');
  useEffect(() => { if (!isEdit) setValue('unitId', ''); }, [selectedPropertyId, setValue, isEdit]);

  const isLegal = watch('isLegalEntity');

  const handleAres = async () => {
    const ico = watch('ico');
    if (!ico || ico.length < 8) { setAresError('Zadejte platné IČ (8 číslic)'); return; }
    setAresLoading(true); setAresError('');
    try {
      const data = await residentsApi.aresLookup(ico);
      if (data) {
        setValue('companyName', data.nazev ?? '', { shouldDirty: true });
        if (data.dic) setValue('dic', data.dic, { shouldDirty: true });
        // Fill address
        if (data.adresa) {
          let addr = data.adresa.ulice ?? '';
          if (data.adresa.obec && !addr) addr = data.adresa.obec;
          else if (data.adresa.ulice) {
            // Build full street with house numbers from textovaAdresa if available
          }
          if (addr) setValue('correspondenceAddress', addr, { shouldDirty: true });
          if (data.adresa.obec) setValue('correspondenceCity', data.adresa.obec, { shouldDirty: true });
          if (data.adresa.psc) setValue('correspondencePostalCode', data.adresa.psc, { shouldDirty: true });
          setShowAddress(true);
        }
        // Fill datová schránka
        if (data.datoveSchranky?.length) {
          setValue('dataBoxId', data.datoveSchranky[0], { shouldDirty: true });
          setShowExtra(true);
        }
        toast.success('Údaje načteny z ARES');
      } else {
        setAresError('IČ nenalezeno v ARES');
      }
    } catch { setAresError('Chyba při ověřování v ARES'); }
    finally { setAresLoading(false); }
  };

  const onSubmit = async (values: ResidentFormValues) => {
    const payload = {
      firstName: values.firstName, lastName: values.lastName, role: values.role,
      email: values.email || undefined, phone: values.phone || undefined,
      propertyId: values.propertyId || undefined, unitId: values.unitId || undefined,
      isLegalEntity: values.isLegalEntity,
      ico: values.ico || null, dic: values.dic || null, companyName: values.companyName || null,
      correspondenceAddress: values.correspondenceAddress || null,
      correspondenceCity: values.correspondenceCity || null,
      correspondencePostalCode: values.correspondencePostalCode || null,
      dataBoxId: values.dataBoxId || null,
      birthDate: values.birthDate || null, note: values.note || null,
    };
    try {
      if (isEdit) { await updateMut.mutateAsync({ id: resident!.id, dto: payload }); toast.success('Bydlící aktualizován'); }
      else { await createMut.mutateAsync(payload); toast.success('Bydlící vytvořen'); }
      onClose();
    } catch { toast.error(isEdit ? 'Nepodařilo se aktualizovat' : 'Nepodařilo se vytvořit'); }
  };

  const isLoading = createMut.isPending || updateMut.isPending;

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Upravit bydlícího' : 'Nový bydlící'}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="primary" onClick={handleSubmit(onSubmit)} disabled={isLoading || isSubmitting || !isDirty}>
            {isSubmitting || isLoading ? 'Ukládám...' : isEdit ? 'Uložit' : 'Vytvořit'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* ── Typ osoby ─────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {[{ v: false, l: 'Fyzická osoba' }, { v: true, l: 'Právnická osoba' }].map(({ v, l }) => (
            <button key={String(v)} type="button" onClick={() => setValue('isLegalEntity', v, { shouldDirty: true })}
              style={{
                flex: 1, padding: '8px 14px', borderRadius: 6, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                border: isLegal === v ? '2px solid var(--primary, #6366f1)' : '1px solid var(--border)',
                background: isLegal === v ? 'var(--primary, #6366f1)' : 'transparent',
                color: isLegal === v ? '#fff' : 'var(--text)',
              }}>{l}</button>
          ))}
        </div>

        {/* ── Fyzická osoba ──────────────────────────────────── */}
        {!isLegal && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label className="form-label">Jméno *</label>
                <input {...register('firstName')} style={inputStyle(!!errors.firstName)} placeholder="Jan" disabled={isLoading} />
                <FieldError message={errors.firstName?.message} />
              </div>
              <div>
                <label className="form-label">Příjmení *</label>
                <input {...register('lastName')} style={inputStyle(!!errors.lastName)} placeholder="Novák" disabled={isLoading} />
                <FieldError message={errors.lastName?.message} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="form-label">Datum narození</label>
              <input type="date" {...register('birthDate')} style={inputStyle(false)} disabled={isLoading} />
            </div>
          </>
        )}

        {/* ── Právnická osoba ────────────────────────────────── */}
        {isLegal && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label className="form-label">IČ</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input {...register('ico')} maxLength={8} placeholder="01234567" style={{ ...inputStyle(!!errors.ico), flex: 1 }} disabled={isLoading} />
                <button type="button" onClick={handleAres} disabled={aresLoading || isLoading}
                  style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                  <Search size={14} /> {aresLoading ? 'Hledám...' : 'ARES'}
                </button>
              </div>
              {aresError && <div style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: 2 }}>{aresError}</div>}
              <FieldError message={errors.ico?.message} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label className="form-label">Název firmy</label>
                <input {...register('companyName')} style={inputStyle(false)} placeholder="Firma s.r.o." disabled={isLoading} />
              </div>
              <div>
                <label className="form-label">DIČ</label>
                <input {...register('dic')} maxLength={12} style={inputStyle(false)} placeholder="CZ01234567" disabled={isLoading} />
              </div>
            </div>
            {/* Kontaktní osoba (firstName/lastName still needed for PO) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label className="form-label">Kontaktní osoba — jméno *</label>
                <input {...register('firstName')} style={inputStyle(!!errors.firstName)} placeholder="Jan" disabled={isLoading} />
                <FieldError message={errors.firstName?.message} />
              </div>
              <div>
                <label className="form-label">Kontaktní osoba — příjmení *</label>
                <input {...register('lastName')} style={inputStyle(!!errors.lastName)} placeholder="Novák" disabled={isLoading} />
                <FieldError message={errors.lastName?.message} />
              </div>
            </div>
          </>
        )}

        {/* ── Kontakt (both modes) ───────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label className="form-label">Email</label>
            <input {...register('email')} type="email" style={inputStyle(!!errors.email)} placeholder="jan@email.cz" disabled={isLoading} />
            <FieldError message={errors.email?.message} />
          </div>
          <div>
            <label className="form-label">Telefon</label>
            <input {...register('phone')} type="tel" style={inputStyle(!!errors.phone)} placeholder="+420 777 123 456" disabled={isLoading} />
            <FieldError message={errors.phone?.message} />
          </div>
        </div>

        {/* ── Role + Nemovitost ───────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label className="form-label">Role *</label>
            <Controller name="role" control={control} render={({ field }) => (
              <select {...field} style={{ ...inputStyle(!!errors.role), cursor: 'pointer' }} disabled={isLoading}>
                <option value="tenant">Nájemce</option>
                <option value="owner">Vlastník</option>
                <option value="member">Člen</option>
                <option value="contact">Kontakt</option>
              </select>
            )} />
            <FieldError message={errors.role?.message} />
          </div>
          <div>
            <label className="form-label">Nemovitost</label>
            <Controller name="propertyId" control={control} render={({ field }) => (
              <select {...field} style={{ ...inputStyle(false), cursor: 'pointer' }} disabled={isLoading}>
                <option value="">-- Vyberte --</option>
                {properties.map((p: { id: string; name: string }) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )} />
          </div>
        </div>

        {/* ── Korespondenční adresa (collapsible) ────────────── */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4 }}>
          <button type="button" onClick={() => setShowAddress(!showAddress)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)', fontSize: '0.85rem', fontWeight: 600, padding: 0, marginBottom: showAddress ? 10 : 0 }}>
            Korespondenční adresa {showAddress ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showAddress && (
            <div>
              <div style={{ marginBottom: 10 }}>
                <label className="form-label">Ulice a č.p.</label>
                <input {...register('correspondenceAddress')} style={inputStyle(false)} placeholder="Ulice 123" disabled={isLoading} />
                <div style={hintStyle}>Vyplňte pokud se liší od adresy jednotky</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 12 }}>
                <div>
                  <label className="form-label">Město</label>
                  <input {...register('correspondenceCity')} style={inputStyle(false)} disabled={isLoading} />
                </div>
                <div>
                  <label className="form-label">PSČ</label>
                  <input {...register('correspondencePostalCode')} maxLength={5} placeholder="11000" style={inputStyle(false)} disabled={isLoading} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Další údaje (collapsible) ──────────────────────── */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 12 }}>
          <button type="button" onClick={() => setShowExtra(!showExtra)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)', fontSize: '0.85rem', fontWeight: 600, padding: 0, marginBottom: showExtra ? 10 : 0 }}>
            Další údaje {showExtra ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showExtra && (
            <div>
              <div style={{ marginBottom: 10 }}>
                <label className="form-label">ID datové schránky</label>
                <input {...register('dataBoxId')} maxLength={50} style={inputStyle(false)} disabled={isLoading} />
                <div style={hintStyle}>Pro elektronické doručování</div>
              </div>
              <div>
                <label className="form-label">Poznámka</label>
                <textarea {...register('note')} rows={2} style={{ ...inputStyle(false), resize: 'vertical' as const }} placeholder="Interní poznámka..." disabled={isLoading} />
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
