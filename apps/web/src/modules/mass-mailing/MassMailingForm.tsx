import { useState, useCallback } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Modal, FormSection, FormFooter, FormField } from '../../shared/components'
import { massMailingApi, type ApiCampaign } from './api/mass-mailing.api'
import { apiClient } from '../../core/api/client'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  editData?: ApiCampaign
}

type Channel = 'email' | 'sms' | 'both'
type RecipientType = 'all_owners' | 'all_tenants' | 'all_residents' | 'debtors' | 'custom'

interface PreviewRecipient {
  residentId: string
  email: string | null
  phone: string | null
  name: string
  propertyName: string | null
  hasContact: boolean
}

export function MassMailingForm({ open, onClose, onSuccess, editData }: Props) {
  const { t } = useTranslation()
  const [step, setStep] = useState(1)

  const CHANNEL_OPTIONS: { value: Channel; label: string }[] = [
    { value: 'email', label: t('massMailing.fields.channelEmail') },
    { value: 'sms', label: t('massMailing.fields.channelSms') },
    { value: 'both', label: t('massMailing.fields.channelBoth') },
  ]

  const RECIPIENT_OPTIONS: { value: RecipientType; label: string }[] = [
    { value: 'all_owners', label: t('massMailing.fields.recipientOwners') },
    { value: 'all_tenants', label: t('massMailing.fields.recipientTenants') },
    { value: 'all_residents', label: t('massMailing.fields.recipientAll') },
    { value: 'debtors', label: t('massMailing.fields.recipientDebtors') },
    { value: 'custom', label: t('massMailing.fields.recipientCustom') },
  ]

  // Form state
  const [name, setName] = useState(editData?.name ?? '')
  const [channel, setChannel] = useState<Channel>(editData?.channel ?? 'email')
  const [subject, setSubject] = useState(editData?.subject ?? '')
  const [body, setBody] = useState(editData?.body ?? '')
  const [recipientType, setRecipientType] = useState<RecipientType>((editData?.recipientType as RecipientType) ?? 'all_residents')

  // Property picker state
  const [allProperties, setAllProperties] = useState(true)
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([])

  // Recipient preview state
  const [recipientPreview, setRecipientPreview] = useState<PreviewRecipient[] | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set())

  // Load properties
  const { data: properties = [] } = useQuery<{ id: string; name: string; address?: string }[]>({
    queryKey: ['properties'],
    queryFn: () => apiClient.get('/properties').then(r => r.data),
    enabled: open,
  })

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editData
        ? massMailingApi.update(editData.id, payload)
        : massMailingApi.create(payload),
    onSuccess: () => {
      resetForm()
      onSuccess()
    },
  })

  const sendMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
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
    setSelectedPropertyIds([])
    setRecipientPreview(null)
    setExcludedIds(new Set())
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  const loadPreview = useCallback(async () => {
    setPreviewLoading(true)
    setExcludedIds(new Set())
    try {
      const res = await massMailingApi.previewRecipients({
        recipientType,
        propertyIds: allProperties ? [] : selectedPropertyIds,
        channel,
      })
      setRecipientPreview(res.recipients ?? [])
    } catch {
      setRecipientPreview([])
    } finally {
      setPreviewLoading(false)
    }
  }, [recipientType, allProperties, selectedPropertyIds, channel])

  function toggleProperty(id: string) {
    setSelectedPropertyIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    )
    setRecipientPreview(null)
  }

  function toggleExclude(residentId: string) {
    setExcludedIds((prev) => {
      const next = new Set(prev)
      if (next.has(residentId)) next.delete(residentId)
      else next.add(residentId)
      return next
    })
  }

  function toggleAllRecipients() {
    if (!recipientPreview) return
    if (excludedIds.size === 0) {
      setExcludedIds(new Set(recipientPreview.map((r) => r.residentId)))
    } else {
      setExcludedIds(new Set())
    }
  }

  const effectivePropertyIds = allProperties ? [] : selectedPropertyIds
  const includedRecipients = recipientPreview?.filter((r) => !excludedIds.has(r.residentId)) ?? []
  const noContactRecipients = recipientPreview?.filter((r) => !r.hasContact) ?? []

  const buildPayload = () => {
    const base: Record<string, unknown> = { name, channel, subject, body, recipientType, propertyIds: effectivePropertyIds }
    if (recipientType === 'custom' && recipientPreview) {
      base.recipientIds = includedRecipients.map((r) => r.residentId)
    }
    return base
  }

  const canProceedStep1 = !!(name.trim() && subject.trim() && body.trim())
  const canProceedStep2 = !!recipientType && (allProperties || selectedPropertyIds.length > 0)

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={editData ? t('massMailing.edit') : t('massMailing.create')}
      subtitle={t('massMailing.step', { current: step, total: 3 })}
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
        <FormSection title={t('massMailing.sections.content')}>
          <FormField label={t('massMailing.fields.name')} name="name">
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('massMailing.fields.namePlaceholder')}
            />
          </FormField>

          <FormField label={t('massMailing.fields.channel')} name="channel">
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

          <FormField label={t('massMailing.fields.subject')} name="subject">
            <input
              type="text"
              className="form-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('massMailing.fields.subjectPlaceholder')}
            />
          </FormField>

          <FormField label={t('massMailing.fields.body')} name="body" helpText={t('massMailing.fields.bodyHelp', { jmeno: '{{jmeno}}', email: '{{email}}' })}>
            <textarea
              className="form-input"
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('massMailing.fields.bodyPlaceholder')}
              style={{ resize: 'vertical' }}
            />
          </FormField>

          <FormFooter
            onCancel={handleClose}
            onSubmit={() => setStep(2)}
            isValid={canProceedStep1}
            submitLabel={t('massMailing.continue')}
            cancelLabel={t('massMailing.cancel')}
          />
        </FormSection>
      )}

      {/* Step 2: Recipients */}
      {step === 2 && (
        <FormSection title={t('massMailing.sections.recipients')}>
          {/* Property picker */}
          <FormField label={t('massMailing.fields.properties')} name="propertyIds">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={allProperties}
                onChange={(e) => {
                  setAllProperties(e.target.checked)
                  setRecipientPreview(null)
                }}
              />
              <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{t('massMailing.fields.allProperties')}</span>
            </label>

            {!allProperties && (
              <div style={{
                maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border, #e5e7eb)',
                borderRadius: 8, padding: 8, display: 'flex', flexDirection: 'column', gap: 4,
              }}>
                {properties.map((p) => (
                  <label
                    key={p.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                      padding: '4px 8px', borderRadius: 4,
                      background: selectedPropertyIds.includes(p.id) ? 'rgba(99,102,241,0.05)' : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPropertyIds.includes(p.id)}
                      onChange={() => toggleProperty(p.id)}
                    />
                    <span style={{ fontSize: '0.83rem' }}>
                      {p.name}{p.address ? ` — ${p.address}` : ''}
                    </span>
                  </label>
                ))}
                {properties.length === 0 && (
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: 8 }}>
                    {t('massMailing.noProperties')}
                  </span>
                )}
              </div>
            )}
          </FormField>

          {/* Recipient type */}
          <FormField label={t('massMailing.fields.recipientType')} name="recipientType">
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
                    onChange={() => {
                      setRecipientType(opt.value)
                      setRecipientPreview(null)
                    }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: recipientType === opt.value ? 500 : 400 }}>
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </FormField>

          {/* Load preview button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <button
              type="button"
              onClick={loadPreview}
              disabled={previewLoading || !canProceedStep2}
              style={{
                padding: '8px 20px', borderRadius: 6, fontSize: '0.85rem', fontWeight: 500,
                background: 'var(--primary, #6366f1)', color: '#fff', border: 'none', cursor: 'pointer',
                opacity: previewLoading || !canProceedStep2 ? 0.5 : 1,
              }}
            >
              {previewLoading ? t('massMailing.loadingPreview') : t('massMailing.loadPreview')}
            </button>
            {recipientPreview && (
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {t('massMailing.selectedCount', {
                  selected: includedRecipients.length,
                  total: recipientPreview.length,
                })}
              </span>
            )}
          </div>

          {/* Recipient preview table */}
          {recipientPreview && recipientPreview.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {noContactRecipients.length > 0 && (
                <div style={{
                  padding: '8px 12px', borderRadius: 6, marginBottom: 8,
                  background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)',
                  fontSize: '0.82rem', color: '#92400e',
                }}>
                  {t('massMailing.noContactWarning', { count: noContactRecipients.length })}
                </div>
              )}

              {recipientType === 'custom' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                  <button
                    type="button"
                    onClick={toggleAllRecipients}
                    style={{
                      padding: '4px 12px', borderRadius: 4, fontSize: '0.78rem',
                      background: 'transparent', border: '1px solid var(--border, #e5e7eb)',
                      cursor: 'pointer', color: 'var(--text-muted)',
                    }}
                  >
                    {excludedIds.size === 0 ? t('massMailing.deselectAll') : t('massMailing.selectAll')}
                  </button>
                </div>
              )}

              <div style={{
                maxHeight: 260, overflowY: 'auto', border: '1px solid var(--border, #e5e7eb)',
                borderRadius: 8,
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border, #e5e7eb)', background: 'var(--bg-muted, #f9fafb)' }}>
                      {recipientType === 'custom' && <th style={{ width: 36, padding: '6px 8px' }} />}
                      <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500 }}>{t('massMailing.previewName')}</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500 }}>{t('massMailing.previewEmail')}</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 500 }}>{t('massMailing.previewProperty')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipientPreview.map((r) => {
                      const excluded = excludedIds.has(r.residentId)
                      return (
                        <tr
                          key={r.residentId}
                          style={{
                            borderBottom: '1px solid var(--border, #e5e7eb)',
                            opacity: !r.hasContact ? 0.45 : excluded ? 0.6 : 1,
                            background: !r.hasContact ? 'rgba(239,68,68,0.03)' : 'transparent',
                          }}
                        >
                          {recipientType === 'custom' && (
                            <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={!excluded && r.hasContact}
                                disabled={!r.hasContact}
                                onChange={() => toggleExclude(r.residentId)}
                              />
                            </td>
                          )}
                          <td style={{ padding: '4px 8px' }}>
                            {r.name}
                            {!r.hasContact && (
                              <span title={t('massMailing.noContactTooltip')} style={{ marginLeft: 4, color: '#ef4444' }}>
                                &#9888;
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '4px 8px', color: r.email ? 'inherit' : 'var(--text-muted)' }}>
                            {r.email ?? '—'}
                          </td>
                          <td style={{ padding: '4px 8px' }}>{r.propertyName ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {recipientPreview && recipientPreview.length === 0 && (
            <div style={{
              padding: '12px 16px', borderRadius: 8, marginTop: 8,
              background: 'var(--bg-muted, #f9fafb)',
              fontSize: '0.82rem', color: 'var(--text-muted)',
            }}>
              {t('massMailing.noRecipients')}
            </div>
          )}

          <FormFooter
            onCancel={() => setStep(1)}
            onSubmit={() => setStep(3)}
            isValid={canProceedStep2}
            submitLabel={t('massMailing.continue')}
            cancelLabel={t('massMailing.back')}
          />
        </FormSection>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <FormSection title={t('massMailing.sections.summary')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px 16px', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{t('massMailing.reviewChannel')}</span>
              <span>{CHANNEL_OPTIONS.find((o) => o.value === channel)?.label}</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{t('massMailing.reviewRecipients')}</span>
              <span>{RECIPIENT_OPTIONS.find((o) => o.value === recipientType)?.label}</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{t('massMailing.reviewSubject')}</span>
              <span>{subject}</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{t('massMailing.reviewProperties')}</span>
              <span>{allProperties ? t('massMailing.fields.allProperties') : `${selectedPropertyIds.length} ${t('massMailing.propertiesSelected')}`}</span>
            </div>

            {/* Recipient count summary */}
            {recipientPreview && (
              <div style={{
                padding: '10px 16px', borderRadius: 8,
                background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
                fontSize: '0.85rem',
              }}>
                <strong>{t('massMailing.recipientsSummary')}</strong>{' '}
                {t('massMailing.selectedCount', {
                  selected: includedRecipients.length,
                  total: recipientPreview.length,
                })}
                {noContactRecipients.length > 0 && (
                  <span style={{ color: '#d97706', marginLeft: 8 }}>
                    ({t('massMailing.noContactWarning', { count: noContactRecipients.length })})
                  </span>
                )}
              </div>
            )}

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
            onSubmit={() => sendMutation.mutate(buildPayload())}
            isSubmitting={createMutation.isPending || sendMutation.isPending}
            submitLabel={t('massMailing.sendNow')}
            cancelLabel={t('massMailing.back')}
            showDraft
            onSaveDraft={() => createMutation.mutate(buildPayload())}
          />

          {(createMutation.isError || sendMutation.isError) && (
            <div style={{ marginTop: 12, color: 'var(--danger, #ef4444)', fontSize: '0.82rem' }}>
              {t('massMailing.error')}
            </div>
          )}
        </FormSection>
      )}
    </Modal>
  )
}
