import { Badge } from '../../../shared/components'

const STATUS_CONFIG: Record<string, { label: string; variant: string }> = {
  draft: { label: 'Koncept', variant: 'muted' },
  sent: { label: 'Odesláno', variant: 'blue' },
  in_progress: { label: 'Probíhá', variant: 'yellow' },
  completed: { label: 'Podepsáno', variant: 'green' },
  expired: { label: 'Vypršelo', variant: 'red' },
  cancelled: { label: 'Zrušeno', variant: 'red' },
}

export function ESignStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft
  return <Badge variant={cfg.variant as any}>{cfg.label}</Badge>
}
