import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  residentSchema,
  residentDefaultValues,
  type ResidentFormValues,
} from './schemas/resident.schema';
import { useCreateResident, useUpdateResident } from './api/residents.queries';
import type { ApiResident } from './api/residents.api';
import { useProperties } from '../properties/use-properties';
import { useToast } from '../../shared/components/toast/Toast';
import { Modal, Button } from '../../shared/components';

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span style={{ color: '#ef4444', fontSize: 12, marginTop: 4, display: 'block' }}>
      {message}
    </span>
  );
}

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '8px 12px',
  border: `1px solid ${hasError ? 'var(--danger, #ef4444)' : 'var(--border, #d1d5db)'}`,
  borderRadius: 6,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
  background: 'var(--surface-2, var(--surface, #fff))',
  color: 'var(--text, #374151)',
});

function residentToFormValues(resident: ApiResident): Partial<ResidentFormValues> {
  return {
    firstName:  resident.firstName  ?? '',
    lastName:   resident.lastName   ?? '',
    email:      resident.email      ?? '',
    phone:      resident.phone      ?? '',
    role:       (resident.role as ResidentFormValues['role']) ?? 'tenant',
    propertyId: resident.propertyId ?? '',
    unitId:     resident.unitId     ?? '',
  };
}

interface Props {
  resident?: ApiResident;
  onClose: () => void;
}

export default function ResidentForm({ resident, onClose }: Props) {
  const isEdit = !!resident;
  const toast = useToast();
  const createMutation = useCreateResident();
  const updateMutation = useUpdateResident();
  const { data: properties = [] } = useProperties();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ResidentFormValues>({
    resolver: zodResolver(residentSchema),
    defaultValues: resident
      ? { ...residentDefaultValues, ...residentToFormValues(resident) }
      : residentDefaultValues,
  });

  // Reset when resident changes (edit mode)
  useEffect(() => {
    if (resident) {
      reset({ ...residentDefaultValues, ...residentToFormValues(resident) });
    }
  }, [resident?.id, reset]);

  // Reset unitId when property changes
  const selectedPropertyId = watch('propertyId');
  useEffect(() => {
    if (!isEdit) setValue('unitId', '');
  }, [selectedPropertyId, setValue, isEdit]);

  const onSubmit = async (values: ResidentFormValues) => {
    const payload = {
      firstName:  values.firstName,
      lastName:   values.lastName,
      role:       values.role,
      email:      values.email || undefined,
      phone:      values.phone || undefined,
      propertyId: values.propertyId || undefined,
      unitId:     values.unitId || undefined,
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: resident!.id, dto: payload });
        toast.success('Bydlici aktualizovan');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Bydlici vytvoren');
      }
      onClose();
    } catch {
      toast.error(isEdit ? 'Nepodarilo se aktualizovat' : 'Nepodarilo se vytvorit');
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Upravit bydliciho' : 'Novy bydlici'}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Zrusit</Button>
          <Button
            variant="primary"
            onClick={handleSubmit(onSubmit)}
            disabled={isLoading || isSubmitting || !isDirty}
          >
            {isSubmitting || isLoading ? 'Ukladam...' : isEdit ? 'Ulozit' : 'Vytvorit'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Jmeno + Prijmeni */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label className="form-label">Jmeno *</label>
            <input
              {...register('firstName')}
              style={inputStyle(!!errors.firstName)}
              placeholder="Jan"
              disabled={isLoading}
            />
            <FieldError message={errors.firstName?.message} />
          </div>
          <div>
            <label className="form-label">Prijmeni *</label>
            <input
              {...register('lastName')}
              style={inputStyle(!!errors.lastName)}
              placeholder="Novak"
              disabled={isLoading}
            />
            <FieldError message={errors.lastName?.message} />
          </div>
        </div>

        {/* Email + Telefon */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label className="form-label">Email</label>
            <input
              {...register('email')}
              type="email"
              style={inputStyle(!!errors.email)}
              placeholder="jan.novak@email.cz"
              disabled={isLoading}
            />
            <FieldError message={errors.email?.message} />
          </div>
          <div>
            <label className="form-label">Telefon</label>
            <input
              {...register('phone')}
              type="tel"
              style={inputStyle(!!errors.phone)}
              placeholder="+420 777 123 456"
              disabled={isLoading}
            />
            <FieldError message={errors.phone?.message} />
          </div>
        </div>

        {/* Role */}
        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Role *</label>
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <select {...field} style={{ ...inputStyle(!!errors.role), cursor: 'pointer' }} disabled={isLoading}>
                <option value="tenant">Najemce</option>
                <option value="owner">Vlastnik</option>
                <option value="member">Clen</option>
                <option value="contact">Kontakt</option>
              </select>
            )}
          />
          <FieldError message={errors.role?.message} />
        </div>

        {/* Nemovitost */}
        <div style={{ marginBottom: 14 }}>
          <label className="form-label">Nemovitost</label>
          <Controller
            name="propertyId"
            control={control}
            render={({ field }) => (
              <select {...field} style={{ ...inputStyle(!!errors.propertyId), cursor: 'pointer' }} disabled={isLoading}>
                <option value="">-- Vyber nemovitost --</option>
                {properties.map((p: { id: string; name: string }) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          />
          <FieldError message={errors.propertyId?.message} />
        </div>

        {/* Poznamka */}
        <div>
          <label className="form-label">Poznamka</label>
          <textarea
            {...register('note')}
            rows={2}
            style={{ ...inputStyle(!!errors.note), resize: 'vertical' as const }}
            placeholder="Interni poznamka..."
            disabled={isLoading}
          />
          <FieldError message={errors.note?.message} />
        </div>
      </form>
    </Modal>
  );
}
