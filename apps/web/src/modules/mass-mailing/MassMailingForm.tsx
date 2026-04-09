import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Modal, FormSection, FormFooter, FormField } from '../../shared/components'
import { massMailingApi, type ApiCampaign } from './api/mass-mailing.api'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  editData?: ApiCampaign
}

type Channel = 'email' | 'sms' | 'both'
type RecipientType = 'all_owners' | 'all_tenants' | 'all_residents' | 'debtors' | 'custom'

const CHANNEL_OPTIONS: { value: Channel; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'both', label: 'Oboji' },
]

const RECIPIENT_OPTIONS: { value: RecipientType; label: string }[] = [
  { value: 'all_owners', label: 'Vlastnici' },
  { value: 'all_tenants', label: 'Najemnici' },
  { value: 'all_residents', label: 'Vsichni' },
  { value: 'debtors', label: 'Dluznici' },
  { value: 'custom', label: 'Vlastni' },
]

export function MassMailingForm({ open, onClose, onSuccess, editData }: Props) {
  const [step, setStep] = useState(1)

  // Form state
  const [name, setName] = useState(editData?.name ?? '')
  const [channel, setChannel] = useState<Channel>(editData?.channel ?? 'email')
  const [subject, setSubject] = useState(editData?.subject ?? '')
  const [body, setBody] = useState(editData?.body ?? '')
  const [recipientType, setRecipientType] = useState<RecipientType>((editData?.recipientType as RecipientType) ?? 'all_residents')
  const [allProperties, setAllProperties] = useState(true)

  const createMutation = useMutation({
    mutationFn: (payload: any) =>
      editData
        ? massMailingApi.update(editData.id, payload)
        : massMailingApi.create(payload),
    onSuccess: () => {
      resetForm()
      onSuccess()
    },
  })

  const sendMutation = useMutation({
    mutationFn: async (payload: any) => {
      const campaign = editData
        ? await massMailingApi.update(editData.id, payload)
        : await massMailingApi.create(payload)
      await massMailingApi.send(campaign.id)
      return campaign
    },
    onSuccess: () => {
      resetForm()
      onSuccess()
    },
  })

  function resetForm() {
    setStep(1)
    setName('')
    setChannel('email')
    setSubject('')
    setBody('')
    setRecipientType('all_residents')
    setAllProperties(true)
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  const payload = { name, channel, subject, body, recipientType, allProperties }
  const canProceedStep1 = !!(name.trim() && subject.trim() && body.trim())
  const canProceedStep2 = !!recipientType

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={editData ? 'Upravit kampan' : 'Nova kampan'}
      subtitle={`Krok ${step} / 3`}
      wide
    >
      {/* Step indicators */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            style={{
              flex: 1, height: 4, borderRadius: 2,
              background: s <= step ? 'var(--primary, #6366f1)' : 'var(--border, #e5e7eb)',
              transition: 'background 0.2s',
            }}
          />
        ))}
      </div>

      {/* Step 1: Content */}
      {step === 1 && (
        <FormSection title="Obsah zpravy">
          <FormField label="Nazev kampane" name="name">
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="napr. Oznameni o schuzi"
            />
          </FormField>

          <FormField label="Kanal" name="channel">
            <div style={{ display: 'flex', gap: 8 }}>
              {CHANNEL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setChannel(opt.value)}
                  style={{
                    flex: 1, padding: '8px 16px', borderRadius: 6,
                    border: `2px solid ${channel === opt.value ? 'var(--primary, #6366f1)' : 'var(--border, #e5e7eb)'}`,
                    background: channel === opt.value ? 'rgba(99,102,241,0.08)' : 'transparent',
                    color: channel === opt.value ? 'var(--primary, #6366f1)' : 'var(--text)',
                    fontWeight: channel === opt.value ? 600 : 400,
                    cursor: 'pointer', fontSize: '0.85rem',
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Predmet" name="subject">
            <input
              type="text"
              className="form-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Predmet zpravy"
            />
          </FormField>

          <FormField label="Text zpravy" name="body" helpText="Dostupne promenne: {{jmeno}}, {{email}}">
            <textarea
              className="form-input"
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Napiste text zpravy..."
              style={{ resize: 'vertical' }}
            />
          </FormField>

          <FormFooter
            onCancel={handleClose}
            onSubmit={() => setStep(2)}
            isValid={canProceedStep1}
            submitLabel="Pokracovat"
            cancelLabel="Zrusit"
          />
        </FormSection>
      )}

      {/* Step 2: Recipients */}
      {step === 2 && (
        <FormSection title="Prijemci">
          <FormField label="Nemovitosti" name="propertyIds">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={allProperties}
                onChange={(e) => setAllProperties(e.target.checked)}
              />
              <span style={{ fontSize: '0.85rem' }}>Vsechny nemovitosti</span>
            </label>
          </FormField>

          <FormField label="Typ prijemcu" name="recipientType">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {RECIPIENT_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
                    border: `1px solid ${recipientType === opt.value ? 'var(--primary, #6366f1)' : 'var(--border, #e5e7eb)'}`,
                    background: recipientType === opt.value ? 'rgba(99,102,241,0.05)' : 'transparent',
                  }}
                >
                  <input
                    type="radio"
                    name="recipientType"
                    value={opt.value}
                    checked={recipientType === opt.value}
                    onChange={() => setRecipientType(opt.value)}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: recipientType === opt.value ? 500 : 400 }}>
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </FormField>

          {recipientType === 'custom' && (
            <div style={{
              padding: '12px 16px', borderRadius: 8,
              background: 'var(--bg-muted, #f9fafb)',
              fontSize: '0.82rem', color: 'var(--text-muted)',
            }}>
              Vlastni vyber bude dostupny po vytvoreni kampane
            </div>
          )}

          <FormFooter
            onCancel={() => setStep(1)}
            onSubmit={() => setStep(3)}
            isValid={canProceedStep2}
            submitLabel="Pokracovat"
            cancelLabel="Zpet"
          />
        </FormSection>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <FormSection title="Shrnuti">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 16px', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Kanal:</span>
              <span>{CHANNEL_OPTIONS.find((o) => o.value === channel)?.label}</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Prijemci:</span>
              <span>{RECIPIENT_OPTIONS.find((o) => o.value === recipientType)?.label}</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Predmet:</span>
              <span>{subject}</span>
            </div>

            <div style={{
              marginTop: 8, padding: '12px 16px', borderRadius: 8,
              background: 'var(--bg-muted, #f9fafb)',
              fontSize: '0.82rem', color: 'var(--text)',
              maxHeight: 160, overflowY: 'auto',
              whiteSpace: 'pre-wrap',
            }}>
              {body}
            </div>
          </div>

          <FormFooter
            onCancel={() => setStep(2)}
            onSubmit={() => sendMutation.mutate(payload)}
            isSubmitting={createMutation.isPending || sendMutation.isPending}
            submitLabel="Odeslat ihned"
            cancelLabel="Zpet"
            showDraft
            onSaveDraft={() => createMutation.mutate(payload)}
          />

          {(createMutation.isError || sendMutation.isError) && (
            <div style={{ marginTop: 12, color: 'var(--danger, #ef4444)', fontSize: '0.82rem' }}>
              Doslo k chybe. Zkuste to prosim znovu.
            </div>
          )}
        </FormSection>
      )}
    </Modal>
  )
}
