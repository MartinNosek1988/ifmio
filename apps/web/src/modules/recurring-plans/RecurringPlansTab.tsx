import { useState } from 'react';
import { Plus, Calendar, Clock } from 'lucide-react';
import { Badge, Button, EmptyState } from '../../shared/components';
import type { BadgeVariant } from '../../shared/components';
import { useRecurringPlans, useUpdateRecurringPlan, useDeleteRecurringPlan } from './api/recurring-plans.queries';
import { formatRecurrence, type RecurringPlan } from './api/recurring-plans.api';
import RecurringPlanForm from './RecurringPlanForm';

interface Props {
  assetId: string;
  propertyId?: string;
}

const PRIO_COLOR: Record<string, BadgeVariant> = {
  low: 'muted', medium: 'blue', high: 'yellow', urgent: 'red',
};

export default function RecurringPlansTab({ assetId, propertyId }: Props) {
  const { data: plans = [], isLoading } = useRecurringPlans({ assetId });
  const updateMutation = useUpdateRecurringPlan();
  const deleteMutation = useDeleteRecurringPlan();
  const [showForm, setShowForm] = useState(false);
  const [editPlan, setEditPlan] = useState<RecurringPlan | undefined>();

  const handleToggle = (plan: RecurringPlan) => {
    updateMutation.mutate({ id: plan.id, dto: { isActive: !plan.isActive } });
  };

  const handleDelete = (plan: RecurringPlan) => {
    if (confirm(`Smazat plán "${plan.title}"?`)) {
      deleteMutation.mutate(plan.id);
    }
  };

  if (isLoading) return <div className="text-muted" style={{ padding: 20 }}>Načítání...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Opakované činnosti</h3>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => { setEditPlan(undefined); setShowForm(true); }}>
          Nová opakovaná činnost
        </Button>
      </div>

      {plans.length === 0 ? (
        <EmptyState
          title="Žádné opakované činnosti"
          description="Pro toto zařízení zatím nejsou nastaveny žádné opakované činnosti."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={() => { setEditPlan(plan); setShowForm(true); }}
              onToggle={() => handleToggle(plan)}
              onDelete={() => handleDelete(plan)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <RecurringPlanForm
          assetId={assetId}
          propertyId={propertyId}
          existing={editPlan}
          onClose={() => { setShowForm(false); setEditPlan(undefined); }}
        />
      )}
    </div>
  );
}

function PlanCard({ plan, onEdit, onToggle }: {
  plan: RecurringPlan; onEdit: () => void; onToggle: () => void;
}) {
  const summary = formatRecurrence(plan);
  const nextDate = plan.nextPlannedAt ? new Date(plan.nextPlannedAt).toLocaleDateString('cs-CZ') : '—';
  const lastDate = plan.lastCompletedAt ? new Date(plan.lastCompletedAt).toLocaleDateString('cs-CZ') : '—';
  const genCount = plan._count?.generatedTickets ?? 0;

  return (
    <div style={{
      padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border)',
      background: plan.isActive ? 'var(--surface)' : 'var(--surface-2, var(--surface))',
      opacity: plan.isActive ? 1 : 0.7,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 4 }}>{plan.title}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Badge variant={plan.scheduleMode === 'calendar' ? 'blue' : 'purple'}>
              {plan.scheduleMode === 'calendar' ? <><Calendar size={12} style={{ marginRight: 3 }} />Kalendářní</> : <><Clock size={12} style={{ marginRight: 3 }} />Od provedení</>}
            </Badge>
            <Badge variant={plan.isActive ? 'green' : 'muted'}>{plan.isActive ? 'Aktivní' : 'Neaktivní'}</Badge>
            <Badge variant={PRIO_COLOR[plan.priority] ?? 'muted'}>{plan.priority}</Badge>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <Button size="sm" onClick={onEdit}>Upravit</Button>
          <Button size="sm" onClick={onToggle}>{plan.isActive ? 'Deaktivovat' : 'Aktivovat'}</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, fontSize: '0.82rem' }}>
        <InfoCell label="Frekvence" value={summary} />
        <InfoCell label="Další termín" value={nextDate} />
        <InfoCell label="Poslední provedení" value={lastDate} />
        <InfoCell label="Předstih" value={`${plan.leadDays} dní`} />
        {plan.assignee && <InfoCell label="Řešitel" value={plan.assignee.name} />}
        {genCount > 0 && <InfoCell label="Vygenerováno" value={`${genCount} požadavků`} />}
      </div>

      {plan.description && (
        <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: 8 }}>{plan.description}</div>
      )}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontWeight: 500 }}>{value}</div>
    </div>
  );
}
