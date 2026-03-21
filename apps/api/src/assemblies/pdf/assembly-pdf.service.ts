import { Injectable } from '@nestjs/common'
import PDFDocument from 'pdfkit'
import { AssembliesService } from '../assemblies.service'
import type { AuthUser } from '@ifmio/shared-types'

const MAJORITY_LABELS: Record<string, string> = {
  NADPOLOVICNI_PRITOMNYCH: 'Nadpoloviční přítomných',
  NADPOLOVICNI_VSECH: 'Nadpoloviční všech',
  KVALIFIKOVANA: 'Kvalifikovaná (75 %)',
  JEDNOMYSLNA: 'Jednomyslná (100 %)',
}
const RESULT_LABELS: Record<string, string> = {
  SCHVALENO: 'SCHVÁLENO',
  NESCHVALENO: 'NESCHVÁLENO',
  NEUSNASENO: 'NEHLASOVÁNO',
}

@Injectable()
export class AssemblyPdfService {
  constructor(private assemblies: AssembliesService) {}

  async generateMinutes(user: AuthUser, assemblyId: string) {
    const assembly = await this.assemblies.findOne(user, assemblyId)
    const doc = new PDFDocument({ size: 'A4', margin: 50 })

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('ifmio', { align: 'center' }).moveDown(0.3)
    doc.fontSize(14).text('Zápis ze shromáždění', { align: 'center' }).moveDown(0.5)
    doc.fontSize(10).font('Helvetica')
      .text(`${assembly.property.name}`, { align: 'center' }).moveDown(1)

    // 1. Basic info
    doc.font('Helvetica-Bold').fontSize(11).text('1. Základní údaje').moveDown(0.3)
    doc.font('Helvetica').fontSize(10)
    doc.text(`Název: ${assembly.title}`).moveDown(0.2)
    doc.text(`Datum: ${assembly.scheduledAt.toLocaleDateString('cs-CZ')} ${assembly.scheduledAt.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}`).moveDown(0.2)
    doc.text(`Místo: ${assembly.location}`).moveDown(0.2)
    const totalS = Number(assembly.totalShares ?? 0)
    const presentS = Number(assembly.presentShares ?? 0)
    const pct = totalS > 0 ? ((presentS / totalS) * 100).toFixed(2) : '0.00'
    doc.text(`Přítomné podíly: ${pct} %`).moveDown(0.2)
    doc.text(`Usnášeníschopné: ${assembly.isQuorate ? 'Ano' : 'Ne'}`).moveDown(1)

    // 2. Attendees
    doc.font('Helvetica-Bold').fontSize(11).text('2. Přítomní vlastníci').moveDown(0.3)
    doc.font('Helvetica').fontSize(9)
    const presentAttendees = assembly.attendees.filter(a => a.isPresent)
    for (const att of presentAttendees) {
      const share = (Number(att.totalShare) * 100).toFixed(4)
      const poa = att.hasPowerOfAttorney ? ` (plná moc od: ${att.powerOfAttorneyFrom ?? '?'})` : ''
      doc.text(`• ${att.name} — podíl ${share} %${poa}`).moveDown(0.1)
    }
    doc.moveDown(0.5)

    // 3. Program
    doc.font('Helvetica-Bold').fontSize(11).text('3. Program shromáždění').moveDown(0.3)
    for (const item of assembly.agendaItems) {
      doc.font('Helvetica-Bold').fontSize(10)
        .text(`Bod č. ${item.orderNumber}: ${item.title}`).moveDown(0.2)
      doc.font('Helvetica').fontSize(9)
      if (item.description) doc.text(item.description).moveDown(0.2)
      if (item.requiresVote) {
        doc.text(`Typ většiny: ${MAJORITY_LABELS[item.majorityType] ?? item.majorityType}`)
        if (item.result) {
          const totalVotes = Number(item.votesFor ?? 0) + Number(item.votesAgainst ?? 0) + Number(item.votesAbstain ?? 0)
          const forPct = totalVotes > 0 ? ((Number(item.votesFor ?? 0) / totalVotes) * 100).toFixed(2) : '0.00'
          const againstPct = totalVotes > 0 ? ((Number(item.votesAgainst ?? 0) / totalVotes) * 100).toFixed(2) : '0.00'
          const abstainPct = totalVotes > 0 ? ((Number(item.votesAbstain ?? 0) / totalVotes) * 100).toFixed(2) : '0.00'
          doc.text(`Výsledek: ${RESULT_LABELS[item.result] ?? item.result}`)
          doc.text(`Pro: ${forPct} % | Proti: ${againstPct} % | Zdržel se: ${abstainPct} %`)
        } else {
          doc.text('Výsledek: Nehlasováno')
        }
      } else {
        doc.text('(Informační bod — bez hlasování)')
      }
      doc.moveDown(0.5)
    }

    // 4. Footer
    doc.moveDown(1)
    doc.font('Helvetica-Bold').fontSize(11).text('4. Závěr').moveDown(0.3)
    doc.font('Helvetica').fontSize(9)
    if (assembly.startedAt) doc.text(`Shromáždění zahájeno: ${assembly.startedAt.toLocaleString('cs-CZ')}`).moveDown(0.2)
    if (assembly.endedAt) doc.text(`Shromáždění ukončeno: ${assembly.endedAt.toLocaleString('cs-CZ')}`).moveDown(0.2)
    if (assembly.notes) doc.text(`Poznámky: ${assembly.notes}`).moveDown(0.2)

    doc.moveDown(2)
    doc.fontSize(8).fillColor('#888')
      .text(`Vygenerováno systémem ifmio • ${new Date().toLocaleDateString('cs-CZ')}`, { align: 'center' })

    doc.end()
    return doc
  }

  async generateAttendance(user: AuthUser, assemblyId: string) {
    const assembly = await this.assemblies.findOne(user, assemblyId)
    const doc = new PDFDocument({ size: 'A4', margin: 50 })

    doc.fontSize(16).font('Helvetica-Bold')
      .text(`${assembly.property.name}`, { align: 'center' }).moveDown(0.3)
    doc.fontSize(14).text('Prezenční listina', { align: 'center' }).moveDown(0.3)
    doc.fontSize(10).font('Helvetica')
      .text(`Shromáždění č. ${assembly.assemblyNumber} — ${assembly.scheduledAt.toLocaleDateString('cs-CZ')}`, { align: 'center' })
      .moveDown(1)

    // Table header
    const startX = 50
    const colWidths = [30, 180, 80, 100, 100]
    let y = doc.y

    doc.font('Helvetica-Bold').fontSize(9)
    doc.text('#', startX, y, { width: colWidths[0] })
    doc.text('Jméno vlastníka', startX + colWidths[0], y, { width: colWidths[1] })
    doc.text('Jednotky', startX + colWidths[0] + colWidths[1], y, { width: colWidths[2] })
    doc.text('Podíl', startX + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3] })
    doc.text('Podpis', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y, { width: colWidths[4] })
    y += 18
    doc.moveTo(startX, y).lineTo(startX + 490, y).stroke()
    y += 6

    // Table rows
    doc.font('Helvetica').fontSize(9)
    assembly.attendees.forEach((att, i) => {
      if (y > 750) { doc.addPage(); y = 50 }
      const share = (Number(att.totalShare) * 100).toFixed(4) + ' %'
      doc.text(String(i + 1), startX, y, { width: colWidths[0] })
      doc.text(att.name, startX + colWidths[0], y, { width: colWidths[1] })
      doc.text(att.unitIds.length > 0 ? att.unitIds.join(', ').slice(0, 15) : '—', startX + colWidths[0] + colWidths[1], y, { width: colWidths[2] })
      doc.text(share, startX + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3] })
      doc.text('_____________', startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y, { width: colWidths[4] })
      y += 22
    })

    // Footer
    const totalP = Number(assembly.totalShares ?? 0)
    const presentP = Number(assembly.presentShares ?? 0)
    doc.moveDown(2)
    doc.fontSize(10).font('Helvetica-Bold')
      .text(`Celkem přítomno: ${assembly.attendees.filter(a => a.isPresent).length} vlastníků, podíl ${totalP > 0 ? ((presentP / totalP) * 100).toFixed(2) : '0.00'} %`)

    doc.end()
    return doc
  }

  async generateVotingReport(user: AuthUser, assemblyId: string) {
    const assembly = await this.assemblies.findOne(user, assemblyId)
    const doc = new PDFDocument({ size: 'A4', margin: 50 })

    doc.fontSize(16).font('Helvetica-Bold')
      .text('Souhrnný protokol hlasování', { align: 'center' }).moveDown(0.3)
    doc.fontSize(10).font('Helvetica')
      .text(`${assembly.property.name} — Shromáždění č. ${assembly.assemblyNumber}`, { align: 'center' })
      .text(assembly.scheduledAt.toLocaleDateString('cs-CZ'), { align: 'center' }).moveDown(1)

    const votingItems = assembly.agendaItems.filter(i => i.requiresVote)

    for (const item of votingItems) {
      doc.font('Helvetica-Bold').fontSize(11)
        .text(`Bod č. ${item.orderNumber}: ${item.title}`).moveDown(0.2)
      doc.font('Helvetica').fontSize(9)
      doc.text(`Typ většiny: ${MAJORITY_LABELS[item.majorityType] ?? item.majorityType}`)

      if (item.result) {
        doc.font('Helvetica-Bold')
          .text(`Výsledek: ${RESULT_LABELS[item.result] ?? item.result}`).moveDown(0.2)
        doc.font('Helvetica')

        const votesForN = Number(item.votesFor ?? 0)
        const votesAgainstN = Number(item.votesAgainst ?? 0)
        const votesAbstainN = Number(item.votesAbstain ?? 0)
        const totalV = votesForN + votesAgainstN + votesAbstainN
        if (totalV > 0) {
          doc.text(`Pro: ${((votesForN / totalV) * 100).toFixed(2)} % | Proti: ${((votesAgainstN / totalV) * 100).toFixed(2)} % | Zdržel se: ${((votesAbstainN / totalV) * 100).toFixed(2)} %`)
        }
      } else {
        doc.text('Výsledek: Nehlasováno')
      }
      doc.moveDown(0.8)
    }

    doc.moveDown(2)
    doc.fontSize(8).fillColor('#888')
      .text(`Vygenerováno systémem ifmio • ${new Date().toLocaleDateString('cs-CZ')}`, { align: 'center' })

    doc.end()
    return doc
  }
}
