import {
  Info, AlertTriangle, AlertCircle, CheckCircle,
  Bell, CreditCard, Home, Ticket,
  FileText, Gauge, Wrench,
} from 'lucide-react'
import type { ComponentType } from 'react'

export const TYPE_LABEL: Record<string, string> = {
  info: 'Informace',
  warning: 'Upozorneni',
  error: 'Chyba',
  success: 'Uspech',
  reminder_due: 'Upominka',
  new_debtor: 'Dluznik',
  unit_vacant: 'Volna jednotka',
  ticket_new: 'HelpDesk',
  payment_unmatched: 'Nesparovana platba',
  contract_expiring: 'Smlouva',
  meter_calibration: 'Meridlo',
  payment_due: 'Platba',
}

export const TYPE_COLOR: Record<string, string> = {
  info: '#3b82f6',
  warning: '#f59e0b',
  error: '#ef4444',
  success: '#22c55e',
  reminder_due: '#f59e0b',
  new_debtor: '#ef4444',
  unit_vacant: '#6366f1',
  ticket_new: '#8b5cf6',
  payment_unmatched: '#ef4444',
  contract_expiring: '#f97316',
  meter_calibration: '#06b6d4',
  payment_due: '#ef4444',
}

export const TYPE_ICON_COMPONENT: Record<string, ComponentType<{ size?: number }>> = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle,
  reminder_due: Bell,
  new_debtor: AlertTriangle,
  unit_vacant: Home,
  ticket_new: Ticket,
  payment_unmatched: CreditCard,
  contract_expiring: FileText,
  meter_calibration: Gauge,
  payment_due: CreditCard,
}

export const TYPE_ICON: Record<string, string> = {
  info: '\u2139\uFE0F',
  warning: '\u26A0\uFE0F',
  error: '\uD83D\uDED1',
  success: '\u2705',
  reminder_due: '\uD83D\uDD14',
  new_debtor: '\u26A0\uFE0F',
  unit_vacant: '\uD83C\uDFE0',
  ticket_new: '\uD83C\uDFAB',
  payment_unmatched: '\uD83D\uDCB3',
  contract_expiring: '\uD83D\uDCC4',
  meter_calibration: '\uD83D\uDCCA',
  payment_due: '\uD83D\uDCB0',
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'prave ted'
  if (m < 60) return `pred ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `pred ${h} h`
  const d = Math.floor(h / 24)
  if (d < 7) return `pred ${d} dny`
  return new Date(iso).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' })
}

export const FILTER_TYPES = [
  { key: 'all', label: 'Vse' },
  { key: 'unread', label: 'Neprectene' },
  { key: 'contract_expiring', label: 'Smlouvy' },
  { key: 'ticket_new', label: 'HelpDesk' },
  { key: 'meter_calibration', label: 'Meridla' },
  { key: 'reminder_due', label: 'Upominky' },
  { key: 'payment_unmatched', label: 'Platby' },
  { key: 'warning', label: 'Upozorneni' },
  { key: 'info', label: 'Informace' },
] as const
