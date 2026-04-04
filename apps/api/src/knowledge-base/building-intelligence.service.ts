import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import QRCode from 'qrcode'

// ── Duplicate Detection ──────────────────────────────────────

export interface DuplicateResult {
  isDuplicate: boolean
  existingBuildingId?: string
  message: string
}

// ── Condition Prediction ─────────────────────────────────────

export interface ConditionPrediction {
  overallRisk: 'low' | 'medium' | 'high'
  components: Array<{
    name: string
    estimatedAge: number
    typicalLifespan: number
    remainingLife: number
    risk: 'ok' | 'attention' | 'critical'
    recommendation: string
  }>
}

const BUILDING_COMPONENTS = [
  { name: 'Stoupačky (voda)', lifespan: 40, types: ['panel', 'cihla'] },
  { name: 'Rozvody elektro', lifespan: 35, types: ['panel', 'cihla'] },
  { name: 'Střecha plochá', lifespan: 25, types: ['panel'] },
  { name: 'Střecha šikmá', lifespan: 50, types: ['cihla'] },
  { name: 'Výtah', lifespan: 30, types: ['panel', 'cihla'] },
  { name: 'Okna', lifespan: 25, types: ['panel', 'cihla'] },
  { name: 'Fasáda / zateplení', lifespan: 30, types: ['panel'] },
  { name: 'Rozvody plynu', lifespan: 40, types: ['panel', 'cihla'] },
  { name: 'Kotelna centrální', lifespan: 25, types: ['panel', 'cihla'] },
  { name: 'Kanalizace', lifespan: 50, types: ['panel', 'cihla'] },
  { name: 'Hromosvod', lifespan: 30, types: ['panel', 'cihla'] },
]

// ── Checklist ────────────────────────────────────────────────

export interface ChecklistItem {
  category: 'revize' | 'pozarni' | 'pojisteni' | 'energie' | 'udrzba'
  name: string
  period: string
  required: boolean
  note?: string
}

// ── Service ──────────────────────────────────────────────────

@Injectable()
export class BuildingIntelligenceService {
  constructor(private prisma: PrismaService) {}

  // ── Duplicate Detection ──────────────────────────────────

  async checkDuplicate(street: string, city: string): Promise<DuplicateResult | null> {
    if (!street || !city) return null

    const streetName = street.replace(/\s+\d+[\w/\s-]*$/, '').trim()
    if (streetName.length < 3) return null

    const existing = await this.prisma.building.findFirst({
      where: {
        street: { contains: streetName, mode: 'insensitive' },
        city: { equals: city, mode: 'insensitive' },
      },
    })

    if (!existing) return null

    return {
      isDuplicate: true,
      existingBuildingId: existing.id,
      message: 'Budova je již v databázi ifmio',
    }
  }

  // ── Condition Prediction ─────────────────────────────────

  predictCondition(constructionYear?: number, materialType?: string): ConditionPrediction {
    if (!constructionYear) return { overallRisk: 'medium', components: [] }

    const age = new Date().getFullYear() - constructionYear
    const material = materialType?.toLowerCase().includes('panel') ? 'panel' : 'cihla'

    const components = BUILDING_COMPONENTS
      .filter(c => c.types.includes(material))
      .map(c => {
        const remaining = c.lifespan - age
        return {
          name: c.name,
          estimatedAge: age,
          typicalLifespan: c.lifespan,
          remainingLife: remaining,
          risk: remaining > 5 ? 'ok' as const : remaining > 0 ? 'attention' as const : 'critical' as const,
          recommendation: remaining <= 0
            ? `Doporučena výměna/revize (po životnosti ${Math.abs(remaining)} let)`
            : remaining <= 5
              ? `Plánujte výměnu v příštích ${remaining} letech`
              : `V pořádku (zbývá ~${remaining} let)`,
        }
      })

    const criticalCount = components.filter(c => c.risk === 'critical').length
    const overallRisk = criticalCount >= 3 ? 'high' : criticalCount >= 1 ? 'medium' : 'low'

    return { overallRisk, components }
  }

  // ── Checklist ────────────────────────────────────────────

  generateChecklist(building: {
    constructionYear?: number
    numberOfFloors?: number
    numberOfUnits?: number
    materialType?: string
  }): ChecklistItem[] {
    const items: ChecklistItem[] = [
      { category: 'revize', name: 'Revize elektro', period: '5 let', required: true },
      { category: 'revize', name: 'Revize plynu', period: '3 roky', required: true },
      { category: 'revize', name: 'Revize komínů', period: '1 rok', required: true },
      { category: 'revize', name: 'Revize hromosvodů', period: '5 let', required: true },
      { category: 'pojisteni', name: 'Pojištění budovy', period: 'roční', required: true },
    ]

    if ((building.numberOfFloors ?? 0) > 3 || (building.numberOfUnits ?? 0) > 8) {
      items.push({ category: 'revize', name: 'Revize výtahu (provozní)', period: '3 měsíce', required: true })
      items.push({ category: 'revize', name: 'Inspekční prohlídka výtahu', period: '3 roky', required: true })
    }

    items.push({ category: 'pozarni', name: 'Kontrola hasicích přístrojů', period: '1 rok', required: true })
    items.push({ category: 'pozarni', name: 'Kontrola hydrantů', period: '1 rok', required: true })
    items.push({ category: 'pozarni', name: 'Požární prohlídka', period: '2 roky', required: true })

    if ((building.numberOfUnits ?? 0) > 20) {
      items.push({ category: 'pozarni', name: 'Revize EPS/EZS', period: '1 rok', required: true })
    }

    items.push({ category: 'energie', name: 'PENB průkaz', period: '10 let', required: true, note: 'Povinný při prodeji/pronájmu' })

    if (building.constructionYear && new Date().getFullYear() - building.constructionYear > 30) {
      items.push({ category: 'udrzba', name: 'Statický posudek', period: 'jednorázově', required: false, note: 'Doporučeno pro budovy starší 30 let' })
      items.push({ category: 'udrzba', name: 'Termovizní měření', period: '5 let', required: false, note: 'Odhalení tepelných mostů' })
    }

    return items
  }

  // ── QR Code ──────────────────────────────────────────────

  async generateQR(propertyId: string, baseUrl: string): Promise<string> {
    const portalUrl = `${baseUrl}/portal/${propertyId}`
    return QRCode.toDataURL(portalUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#0D9488', light: '#ffffff' },
    })
  }

  // ── Welcome Pack HTML ────────────────────────────────────

  generateWelcomePackHtml(property: {
    name: string
    address: string
    city: string
    postalCode?: string
    ico?: string
    contactName?: string
    contactEmail?: string
    contactPhone?: string
  }, qrDataUrl: string): string {
    return `<!DOCTYPE html>
<html lang="cs">
<head><meta charset="utf-8"><title>Welcome Pack — ${property.name}</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #1f2937; }
  h1 { color: #0D9488; border-bottom: 3px solid #0D9488; padding-bottom: 12px; }
  h2 { color: #374151; margin-top: 32px; }
  .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 16px 0; }
  .qr { text-align: center; margin: 32px 0; }
  .qr img { width: 200px; }
  .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 16px; }
  @media print { body { padding: 20px; } .card { break-inside: avoid; } }
</style></head>
<body>
  <h1>🏢 ${property.name}</h1>
  <p>${property.address}, ${property.city}${property.postalCode ? `, ${property.postalCode}` : ''}</p>
  ${property.ico ? `<p>IČO: ${property.ico}</p>` : ''}

  <h2>📞 Kontakt na správce</h2>
  <div class="card">
    ${property.contactName ? `<p><strong>${property.contactName}</strong></p>` : ''}
    ${property.contactEmail ? `<p>📧 ${property.contactEmail}</p>` : ''}
    ${property.contactPhone ? `<p>📱 ${property.contactPhone}</p>` : ''}
    <p><em>Hlášení závad a požadavků přes portál (QR kód níže)</em></p>
  </div>

  <h2>📱 Portál pro vlastníky a nájemníky</h2>
  <div class="qr">
    <img src="${qrDataUrl}" alt="QR kód pro přístup k portálu" />
    <p>Naskenujte QR kód pro přístup k portálu nemovitosti.</p>
  </div>

  <h2>📋 Důležité informace</h2>
  <div class="card">
    <ul>
      <li>Odpadky: kontejnery ve dvoře, svoz pondělí a čtvrtek</li>
      <li>Parkování: dle domovního řádu</li>
      <li>Klíče od společných prostor: u správce</li>
      <li>Havárie mimo pracovní dobu: volejte nonstop linku správce</li>
    </ul>
  </div>

  <div class="footer">
    <p>Vygenerováno systémem ifmio · ${new Date().toLocaleDateString('cs-CZ')}</p>
  </div>
</body></html>`
  }
}
