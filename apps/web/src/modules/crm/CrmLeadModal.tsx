import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Phone, Mail, Users, Monitor, FileText, ArrowRight, Trash2,
} from 'lucide-react'
import { Modal } from '../../shared/components/Modal'
import { FormField } from '../../shared/components/FormField'
import { Badge } from '../../shared/components/Badge'
import { LoadingSpinner } from '../../shared/components'
import { crmPipelineApi } from './api/crm-pipeline.api'
import type { CrmLead, CrmActivity } from './api/crm-pipeline.api'

// ── Constants ────────────────────────────────────

const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'demo', 'note', 'stage_change'] as const

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  call: <Phone size={14} />,
  email: <Mail size={14} />,
  meeting: <Users size={14} />,
  demo: <Monitor size={14} />,
  note: <FileText size={14} />,
  stage_change: <ArrowRight size={14} />,
}

// ── Styles ───────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid var(--border, #d1d5db)',
  fontSize: '0.82rem',
  background: 'var(--input-bg, #fff)',
  width: '100%',
}

const panelStyle: React.CSSProperties = {
  display: 'flex',
  gap: 24,
  flexWrap: 'wrap',
}

const leftPanel: React.CSSProperties = {
  flex: '1 1 340px',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
}

const rightPanel: React.CSSProperties = {
  flex: '1 1 300px',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  maxHeight: 500,
  overflowY: 'auto',
}

// ── Props ────────────────────────────────────────

interface Props {
  leadId?: string
  onClose: () => void
  onSaved: () => void
}

// ── Component ────────────────────────────────────

export default function CrmLeadModal({ leadId, onClose, onSaved }: Props) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const isEdit = !!leadId

  const STAGE_OPTIONS = [
    { value: 'new_lead', label: t('crm.lead.stages.new_lead') },
    { value: 'contacted', label: t('crm.lead.stages.contacted') },
    { value: 'demo_scheduled', label: t('crm.lead.stages.demo_scheduled') },
    { value: 'demo_done', label: t('crm.lead.stages.demo_done') },
    { value: 'trial', label: t('crm.lead.stages.trial') },
    { value: 'negotiation', label: t('crm.lead.stages.negotiation') },
    { value: 'won', label: t('crm.lead.stages.won') },
    { value: 'lost', label: t('crm.lead.stages.lost') },
    { value: 'not_interested', label: t('crm.lead.stages.not_interested') },
  ]

  const LEAD_TYPE_OPTIONS = [
    { value: 'property_manager', label: t('crm.lead.leadTypes.property_manager') },
    { value: 'svj_direct', label: t('crm.lead.leadTypes.svj_direct') },
    { value: 'bd_direct', label: t('crm.lead.leadTypes.bd_direct') },
    { value: 'other', label: t('crm.lead.leadTypes.other') },
  ]

  const PRIORITY_OPTIONS = [
    { value: 'low', label: t('crm.lead.priorities.low') },
    { value: 'medium', label: t('crm.lead.priorities.medium') },
    { value: 'high', label: t('crm.lead.priorities.high') },
  ]

  const ACTIVITY_LABELS: Record<string, string> = {
    call: t('crm.lead.activityTypes.call'),
    email: t('crm.lead.activityTypes.email'),
    meeting: t('crm.lead.activityTypes.meeting'),
    demo: t('crm.lead.activityTypes.demo'),
    note: t('crm.lead.activityTypes.note'),
    stage_change: t('crm.lead.activityTypes.stage_change'),
  }

  const { data: lead, isLoading } = useQuery<CrmLead>({
    queryKey: ['crm-pipeline', 'detail', leadId],
    queryFn: () => crmPipelineApi.getById(leadId!),
    enabled: isEdit,
  })

  // Form state
  const [form, setForm] = useState({
    companyName: '',
    ico: '',
    address: '',
    city: '',
    leadType: 'svj_direct',
    priority: 'medium',
    stage: 'new_lead',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    contactRole: '',
    estimatedUnits: '',
    estimatedMrr: '',
    nextFollowUpAt: '',
    note: '',
    source: '',
  })

  useEffect(() => {
    if (lead) {
      setForm({
        companyName: lead.companyName ?? '',
        ico: lead.ico ?? '',
        address: lead.address ?? '',
        city: lead.city ?? '',
        leadType: lead.leadType ?? 'svj_direct',
        priority: lead.priority ?? 'medium',
        stage: lead.stage ?? 'new_lead',
        contactName: lead.contactName ?? '',
        contactEmail: lead.contactEmail ?? '',
        contactPhone: lead.contactPhone ?? '',
        contactRole: lead.contactRole ?? '',
        estimatedUnits: lead.estimatedUnits != null ? String(lead.estimatedUnits) : '',
        estimatedMrr: lead.estimatedMrr != null ? String(lead.estimatedMrr) : '',
        nextFollowUpAt: lead.nextFollowUpAt ? lead.nextFollowUpAt.slice(0, 10) : '',
        note: lead.note ?? '',
        source: lead.source ?? '',
      })
    }
  }, [lead])

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  // Mutations
  const saveMut = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        ...form,
        estimatedUnits: form.estimatedUnits ? Number(form.estimatedUnits) : undefined,
        estimatedMrr: form.estimatedMrr ? Number(form.estimatedMrr) : undefined,
        nextFollowUpAt: form.nextFollowUpAt || undefined,
      }
      return isEdit
        ? crmPipelineApi.update(leadId!, payload)
        : crmPipelineApi.create(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-pipeline'] })
      onSaved()
    },
  })

  const deleteMut = useMutation({
    mutationFn: () => crmPipelineApi.remove(leadId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-pipeline'] })
      onClose()
    },
  })

  // Activity add
  const [actType, setActType] = useState<string>('note')
  const [actTitle, setActTitle] = useState('')
  const [actBody, setActBody] = useState('')

  const activityMut = useMutation({
    mutationFn: () =>
      crmPipelineApi.addActivity(leadId!, {
        type: actType,
        title: actTitle,
        body: actBody || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-pipeline', 'detail', leadId] })
      setActTitle('')
      setActBody('')
    },
  })

  if (isEdit && isLoading) {
    return (
      <Modal open onClose={onClose} title={t('crm.lead.loading')} extraWide>
        <LoadingSpinner />
      </Modal>
    )
  }

  const activities: CrmActivity[] = lead?.activities ?? []
  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  )

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? lead?.companyName ?? 'Lead' : t('crm.lead.createTitle')}
      subtitle={isEdit ? `Stage: ${STAGE_OPTIONS.find((s) => s.value === lead?.stage)?.label ?? lead?.stage}` : undefined}
      extraWide
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', width: '100%' }}>
          <div>
            {isEdit && (
              <button
                className="btn btn--sm"
                style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={() => {
                  if (confirm(t('crm.lead.deleteConfirm'))) deleteMut.mutate()
                }}
                disabled={deleteMut.isPending}
              >
                <Trash2 size={14} /> {t('crm.lead.delete')}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn--sm" onClick={onClose}>
              {t('crm.lead.cancel')}
            </button>
            <button
              className="btn btn--primary btn--sm"
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending || !form.companyName}
            >
              {saveMut.isPending ? t('crm.lead.saving') : isEdit ? t('crm.lead.save') : t('crm.lead.createCta')}
            </button>
          </div>
        </div>
      }
    >
      <div style={panelStyle}>
        {/* Left panel — Lead info */}
        <div style={leftPanel}>
          <FormField label={t('crm.lead.fields.companyName')} name="companyName">
            <input
              id="companyName"
              style={inputStyle}
              value={form.companyName}
              onChange={(e) => set('companyName', e.target.value)}
            />
          </FormField>
          <FormField label={t('crm.lead.fields.ico')} name="ico" required={false}>
            <input
              id="ico"
              style={inputStyle}
              value={form.ico}
              onChange={(e) => set('ico', e.target.value)}
            />
          </FormField>
          <FormField label={t('crm.lead.fields.address')} name="address" required={false}>
            <input
              id="address"
              style={inputStyle}
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
            />
          </FormField>
          <FormField label={t('crm.lead.fields.city')} name="city" required={false}>
            <input
              id="city"
              style={inputStyle}
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
            />
          </FormField>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <FormField label={t('crm.lead.fields.leadType')} name="leadType">
                <select
                  id="leadType"
                  style={inputStyle}
                  value={form.leadType}
                  onChange={(e) => set('leadType', e.target.value)}
                >
                  {LEAD_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </FormField>
            </div>
            <div style={{ flex: 1 }}>
              <FormField label={t('crm.lead.fields.priority')} name="priority">
                <select
                  id="priority"
                  style={inputStyle}
                  value={form.priority}
                  onChange={(e) => set('priority', e.target.value)}
                >
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </FormField>
            </div>
          </div>

          <FormField label={t('crm.lead.fields.stage')} name="stage">
            <select
              id="stage"
              style={inputStyle}
              value={form.stage}
              onChange={(e) => set('stage', e.target.value)}
            >
              {STAGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </FormField>

          <div style={{ borderTop: '1px solid var(--border, #e5e7eb)', margin: '8px 0' }} />

          <FormField label={t('crm.lead.fields.contactName')} name="contactName" required={false}>
            <input
              id="contactName"
              style={inputStyle}
              value={form.contactName}
              onChange={(e) => set('contactName', e.target.value)}
            />
          </FormField>
          <FormField label={t('crm.lead.fields.contactEmail')} name="contactEmail" required={false}>
            <input
              id="contactEmail"
              type="email"
              style={inputStyle}
              value={form.contactEmail}
              onChange={(e) => set('contactEmail', e.target.value)}
            />
          </FormField>
          <FormField label={t('crm.lead.fields.contactPhone')} name="contactPhone" required={false}>
            <input
              id="contactPhone"
              style={inputStyle}
              value={form.contactPhone}
              onChange={(e) => set('contactPhone', e.target.value)}
            />
          </FormField>
          <FormField label={t('crm.lead.fields.contactRole')} name="contactRole" required={false}>
            <input
              id="contactRole"
              style={inputStyle}
              value={form.contactRole}
              onChange={(e) => set('contactRole', e.target.value)}
            />
          </FormField>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <FormField label={t('crm.lead.fields.estimatedUnits')} name="estimatedUnits" required={false}>
                <input
                  id="estimatedUnits"
                  type="number"
                  style={inputStyle}
                  value={form.estimatedUnits}
                  onChange={(e) => set('estimatedUnits', e.target.value)}
                />
              </FormField>
            </div>
            <div style={{ flex: 1 }}>
              <FormField label={t('crm.lead.fields.estimatedMrr')} name="estimatedMrr" required={false}>
                <input
                  id="estimatedMrr"
                  type="number"
                  style={inputStyle}
                  value={form.estimatedMrr}
                  onChange={(e) => set('estimatedMrr', e.target.value)}
                />
              </FormField>
            </div>
          </div>

          <FormField label={t('crm.lead.fields.nextFollowUpAt')} name="nextFollowUpAt" required={false}>
            <input
              id="nextFollowUpAt"
              type="date"
              style={inputStyle}
              value={form.nextFollowUpAt}
              onChange={(e) => set('nextFollowUpAt', e.target.value)}
            />
          </FormField>

          <FormField label={t('crm.lead.fields.source')} name="source" required={false}>
            <input
              id="source"
              style={inputStyle}
              value={form.source}
              onChange={(e) => set('source', e.target.value)}
            />
          </FormField>

          <FormField label={t('crm.lead.fields.note')} name="note" required={false}>
            <textarea
              id="note"
              style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
            />
          </FormField>
        </div>

        {/* Right panel — Activities timeline */}
        {isEdit && (
          <div style={rightPanel}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>{t('crm.lead.activities')}</div>

            {/* Add activity form */}
            <div
              style={{
                background: 'var(--card-bg, #f9fafb)',
                borderRadius: 8,
                border: '1px solid var(--border, #e5e7eb)',
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ACTIVITY_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setActType(t)}
                    style={{
                      padding: '3px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border, #d1d5db)',
                      background: actType === t ? 'var(--primary, #6366f1)' : 'transparent',
                      color: actType === t ? '#fff' : 'var(--text)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {ACTIVITY_ICONS[t]} {ACTIVITY_LABELS[t]}
                  </button>
                ))}
              </div>
              <input
                style={inputStyle}
                placeholder={t('crm.lead.activityPlaceholder')}
                value={actTitle}
                onChange={(e) => setActTitle(e.target.value)}
              />
              <textarea
                style={{ ...inputStyle, minHeight: 40, resize: 'vertical' }}
                placeholder={t('crm.lead.activityBodyPlaceholder')}
                value={actBody}
                onChange={(e) => setActBody(e.target.value)}
              />
              <button
                className="btn btn--primary btn--sm"
                disabled={!actTitle || activityMut.isPending}
                onClick={() => activityMut.mutate()}
                style={{ alignSelf: 'flex-end' }}
              >
                {activityMut.isPending ? t('crm.lead.addingActivity') : t('crm.lead.addActivity')}
              </button>
            </div>

            {/* Activity timeline */}
            {sortedActivities.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: 16 }}>
                {t('crm.lead.noActivities')}
              </div>
            )}
            {sortedActivities.map((act) => (
              <div
                key={act.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  padding: '8px 0',
                  borderBottom: '1px solid var(--border, #f0f0f0)',
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'var(--card-bg, #f3f4f6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: 'var(--text-muted)',
                  }}
                >
                  {ACTIVITY_ICONS[act.type] ?? <FileText size={14} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{act.title}</span>
                    <Badge variant="muted">{ACTIVITY_LABELS[act.type] ?? act.type}</Badge>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {new Date(act.occurredAt).toLocaleString('cs-CZ')}
                  </div>
                  {act.body && (
                    <div style={{ fontSize: '0.8rem', marginTop: 4, color: 'var(--text)' }}>
                      {act.body}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
