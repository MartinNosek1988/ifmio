import { Injectable, NotFoundException } from '@nestjs/common'
import PDFDocument from 'pdfkit'
import { PerRollamService } from './per-rollam.service'
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
  NEUSNASENO: 'NEUSNÁŠENÍSCHOPNÉ',
}

@Injectable()
export class PerRollamPdfService {
  constructor(private service: PerRollamService) {}

  async generateCoverLetter(user: AuthUser, votingId: string) {
    const voting = await this.service.findOne(user, votingId)
    const doc = new PDFDocument({ size: 'A4', margin: 50 })

    doc.fontSize(16).font('Helvetica-Bold')
      .text(voting.property.name ?? '', { align: 'center' }).moveDown(0.3)
    doc.fontSize(13)
      .text(`Hlasování per rollam č. ${voting.votingNumber}/${new Date(voting.deadline).getFullYear()}`, { align: 'center' })
      .moveDown(1)

    doc.font('Helvetica').fontSize(10)
      .text('Vážení vlastníci,').moveDown(0.3)
      .text(`výbor SVJ ${voting.property.name} vás žádá o vyjádření k následujícím záležitostem formou hlasování per rollam dle §1211–1214 občanského zákoníku.`)
      .moveDown(0.3)
      .text(`Termín pro odevzdání hlasů: ${new Date(voting.deadline).toLocaleDateString('cs-CZ')}`)
      .moveDown(1)

    // Items
    doc.font('Helvetica-Bold').fontSize(11).text('Hlasovací body:').moveDown(0.3)
    for (const item of voting.items) {
      doc.font('Helvetica-Bold').fontSize(10)
        .text(`${item.orderNumber}. ${item.title}`).moveDown(0.2)
      doc.font('Helvetica').fontSize(9)
      if (item.description) doc.text(item.description).moveDown(0.2)
      doc.text(`Požadovaná většina: ${MAJORITY_LABELS[item.majorityType] ?? item.majorityType}`).moveDown(0.5)
    }

    doc.moveDown(1)
    doc.font('Helvetica').fontSize(9)
      .text('Způsob hlasování:').moveDown(0.2)
      .text('• Online: hlasovací odkaz byl odeslán na váš e-mail').moveDown(0.1)
      .text('• Písemně: vyplňte přiložený hlasovací lístek a doručte výboru').moveDown(1)

    doc.fontSize(8).fillColor('#888')
      .text(`Vygenerováno systémem ifmio • ${new Date().toLocaleDateString('cs-CZ')}`, { align: 'center' })

    doc.end()
    return doc
  }

  async generateResults(user: AuthUser, votingId: string) {
    const voting = await this.service.findOne(user, votingId)
    const doc = new PDFDocument({ size: 'A4', margin: 50 })

    doc.fontSize(16).font('Helvetica-Bold')
      .text('Výsledky hlasování per rollam', { align: 'center' }).moveDown(0.3)
    doc.fontSize(10).font('Helvetica')
      .text(`${voting.property.name} — č. ${voting.votingNumber}/${new Date(voting.deadline).getFullYear()}`, { align: 'center' })
      .moveDown(1)

    const totalB = voting.ballots.length
    const submittedB = voting.ballots.filter(b => b.status !== 'PENDING').length
    const totalS = Number(voting.totalShares ?? 0)
    const respondedS = Number(voting.respondedShares ?? 0)
    const pct = totalS > 0 ? ((respondedS / totalS) * 100).toFixed(2) : '0.00'

    doc.fontSize(10)
      .text(`Celkem hlasovacích lístků: ${totalB}`).moveDown(0.2)
      .text(`Odevzdáno: ${submittedB} (${pct} % podílů)`).moveDown(0.2)
      .text(`Usnášeníschopné: ${voting.isQuorate ? 'Ano' : 'Ne'}`).moveDown(1)

    for (const item of voting.items) {
      doc.font('Helvetica-Bold').fontSize(11)
        .text(`Bod č. ${item.orderNumber}: ${item.title}`).moveDown(0.2)
      doc.font('Helvetica').fontSize(9)
        .text(`Většina: ${MAJORITY_LABELS[item.majorityType] ?? item.majorityType}`)
      if (item.result) {
        doc.font('Helvetica-Bold').text(`Výsledek: ${RESULT_LABELS[item.result] ?? item.result}`).moveDown(0.2)
        doc.font('Helvetica')
        const f = Number(item.votesFor ?? 0), a = Number(item.votesAgainst ?? 0), ab = Number(item.votesAbstain ?? 0)
        const tot = f + a + ab
        if (tot > 0) {
          doc.text(`Pro: ${((f / tot) * 100).toFixed(2)} % | Proti: ${((a / tot) * 100).toFixed(2)} % | Zdržel se: ${((ab / tot) * 100).toFixed(2)} %`)
        }
      } else {
        doc.text('Výsledek: Nevyhodnoceno')
      }
      doc.moveDown(0.8)
    }

    doc.moveDown(2).fontSize(8).fillColor('#888')
      .text(`Vygenerováno systémem ifmio • ${new Date().toLocaleDateString('cs-CZ')}`, { align: 'center' })

    doc.end()
    return doc
  }

  async generateBallot(user: AuthUser, votingId: string, ballotId: string) {
    const voting = await this.service.findOne(user, votingId)
    const ballot = voting.ballots.find(b => b.id === ballotId)
    if (!ballot) throw new NotFoundException('Hlasovací lístek nenalezen')

    const doc = new PDFDocument({ size: 'A4', margin: 50 })

    doc.fontSize(14).font('Helvetica-Bold')
      .text('HLASOVACÍ LÍSTEK', { align: 'center' }).moveDown(0.3)
    doc.fontSize(10).font('Helvetica')
      .text(`${voting.property.name} — Per rollam č. ${voting.votingNumber}`, { align: 'center' }).moveDown(1)

    doc.fontSize(10)
      .text(`Vlastník: ${ballot.name}`).moveDown(0.2)
      .text(`Jednotky: ${ballot.unitIds.join(', ') || '—'}`).moveDown(0.2)
      .text(`Podíl: ${(Number(ballot.totalShare) * 100).toFixed(4)} %`).moveDown(0.2)
      .text(`Termín: do ${new Date(voting.deadline).toLocaleDateString('cs-CZ')}`).moveDown(1)

    // Voting boxes
    for (const item of voting.items) {
      doc.font('Helvetica-Bold').fontSize(10)
        .text(`Bod ${item.orderNumber}: ${item.title}`).moveDown(0.3)
      doc.font('Helvetica').fontSize(10)
        .text('□ ANO        □ NE        □ ZDRŽUJI SE').moveDown(0.5)
    }

    doc.moveDown(1)
      .text('Datum: _______________     Podpis: _______________').moveDown(2)

    doc.fontSize(8).fillColor('#888')
      .text(`Vygenerováno systémem ifmio • ${new Date().toLocaleDateString('cs-CZ')}`, { align: 'center' })

    doc.end()
    return doc
  }
}
