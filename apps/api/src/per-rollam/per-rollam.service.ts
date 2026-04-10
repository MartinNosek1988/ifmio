import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from '../email/email.service'
import { randomUUID } from 'crypto'
import type { AuthUser } from '@ifmio/shared-types'
import type { MajorityType, VoteChoice } from '@prisma/client'

/** Shared vote evaluation logic — reusable for both Assembly and PerRollam */
export function evaluateMajority(
  votesFor: number, votesAgainst: number, votesAbstain: number,
  totalShares: number, presentShares: number,
  majorityType: string, isQuorate: boolean,
): 'SCHVALENO' | 'NESCHVALENO' | 'NEUSNASENO' {
  if (!isQuorate) return 'NEUSNASENO'

  if (majorityType === 'JEDNOMYSLNA') {
    return votesFor >= totalShares && votesAgainst === 0 && votesAbstain === 0
      ? 'SCHVALENO' : 'NESCHVALENO'
  }

  let threshold: number
  if (majorityType === 'NADPOLOVICNI_PRITOMNYCH') threshold = presentShares / 2
  else if (majorityType === 'NADPOLOVICNI_VSECH') threshold = totalShares / 2
  else threshold = totalShares * 0.75 // KVALIFIKOVANA

  return votesFor > threshold ? 'SCHVALENO' : 'NESCHVALENO'
}

@Injectable()
export class PerRollamService {
  private readonly logger = new Logger(PerRollamService.name)

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  // ─── CRUD ──────────────────────────────────────────────────────

  async findAll(user: AuthUser, query: { propertyId?: string; status?: string }) {
    const where: any = { tenantId: user.tenantId }
    if (query.propertyId) where.propertyId = query.propertyId
    if (query.status) where.status = query.status

    return this.prisma.perRollamVoting.findMany({
      where,
      include: {
        property: { select: { id: true, name: true } },
        _count: { select: { items: true, ballots: true } },
      },
      orderBy: { deadline: 'desc' },
    })
  }

  async findOne(user: AuthUser, id: string) {
    const voting = await this.prisma.perRollamVoting.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        property: { select: { id: true, name: true, address: true, city: true } },
        items: { orderBy: { orderNumber: 'asc' } },
        ballots: { orderBy: { name: 'asc' } },
      },
    })
    if (!voting) throw new NotFoundException('Hlasování per rollam nenalezeno')
    return voting
  }

  async create(user: AuthUser, dto: any) {
    const maxNum = await this.prisma.perRollamVoting.aggregate({
      where: { tenantId: user.tenantId, propertyId: dto.propertyId },
      _max: { votingNumber: true },
    })

    return this.prisma.perRollamVoting.create({
      data: {
        tenantId: user.tenantId,
        propertyId: dto.propertyId,
        title: dto.title,
        description: dto.description,
        votingNumber: (maxNum._max.votingNumber ?? 0) + 1,
        deadline: new Date(dto.deadline),
        documentIds: dto.documentIds ?? [],
        notes: dto.notes,
      },
      include: { property: { select: { id: true, name: true } } },
    })
  }

  async update(user: AuthUser, id: string, dto: any) {
    await this.findOne(user, id)
    const data: any = {}
    if (dto.title !== undefined) data.title = dto.title
    if (dto.description !== undefined) data.description = dto.description
    if (dto.deadline !== undefined) data.deadline = new Date(dto.deadline)
    if (dto.documentIds !== undefined) data.documentIds = dto.documentIds
    if (dto.notes !== undefined) data.notes = dto.notes
    return this.prisma.perRollamVoting.update({ where: { id }, data })
  }

  async remove(user: AuthUser, id: string) {
    const voting = await this.findOne(user, id)
    if (voting.status !== 'DRAFT') throw new BadRequestException('Smazat lze pouze hlasování ve stavu Příprava')
    await this.prisma.perRollamVoting.delete({ where: { id } })
    return { success: true }
  }

  // ─── ITEMS ─────────────────────────────────────────────────────

  async addItem(user: AuthUser, votingId: string, dto: any) {
    await this.findOne(user, votingId)
    const maxOrder = await this.prisma.perRollamItem.aggregate({
      where: { votingId },
      _max: { orderNumber: true },
    })
    return this.prisma.perRollamItem.create({
      data: {
        votingId,
        orderNumber: (maxOrder._max.orderNumber ?? 0) + 1,
        title: dto.title,
        description: dto.description,
        majorityType: (dto.majorityType ?? 'NADPOLOVICNI_VSECH') as MajorityType,
      },
    })
  }

  async updateItem(user: AuthUser, votingId: string, itemId: string, dto: any) {
    await this.findOne(user, votingId)
    const data: any = {}
    if (dto.title !== undefined) data.title = dto.title
    if (dto.description !== undefined) data.description = dto.description
    if (dto.majorityType !== undefined) data.majorityType = dto.majorityType
    return this.prisma.perRollamItem.update({ where: { id: itemId }, data })
  }

  async deleteItem(user: AuthUser, votingId: string, itemId: string) {
    await this.findOne(user, votingId)
    await this.prisma.perRollamItem.delete({ where: { id: itemId } })
    return { success: true }
  }

  // ─── STATUS TRANSITIONS ────────────────────────────────────────

  async publish(user: AuthUser, id: string) {
    const voting = await this.findOne(user, id)
    if (voting.status !== 'DRAFT') throw new BadRequestException('Publikovat lze pouze z přípravy')
    if (new Date(voting.deadline) <= new Date()) throw new BadRequestException('Termín hlasování musí být v budoucnosti')
    if (voting.items.length === 0) throw new BadRequestException('Hlasování musí mít alespoň jeden bod')

    // Generate ballots from unit ownerships
    const ownerships = await this.prisma.unitOwnership.findMany({
      where: {
        tenantId: user.tenantId,
        unit: { propertyId: voting.propertyId },
        isActive: true,
        OR: [{ validTo: null }, { validTo: { gt: new Date() } }],
      },
      include: {
        unit: { select: { id: true, commonAreaShare: true } },
        party: { select: { id: true, displayName: true } },
      },
    })

    // Group by party
    const byParty = new Map<string, { partyId: string; name: string; unitIds: string[]; totalShare: number }>()
    for (const o of ownerships) {
      const share = o.unit.commonAreaShare ? Number(o.unit.commonAreaShare) : 0
      if (!byParty.has(o.partyId)) {
        byParty.set(o.partyId, { partyId: o.partyId, name: o.party.displayName, unitIds: [o.unit.id], totalShare: share })
      } else {
        const e = byParty.get(o.partyId)!
        if (!e.unitIds.includes(o.unit.id)) { e.unitIds.push(o.unit.id); e.totalShare += share }
      }
    }

    let ballotsCreated = 0
    for (const entry of byParty.values()) {
      const token = randomUUID()
      await this.prisma.perRollamBallot.create({
        data: {
          votingId: id,
          partyId: entry.partyId,
          name: entry.name,
          unitIds: entry.unitIds,
          totalShare: entry.totalShare,
          accessToken: token,
          tokenExpiresAt: voting.deadline,
        },
      })
      this.logger.log(`Ballot URL: /hlasovani/${token} — ${entry.name}`)
      ballotsCreated++
    }

    await this.prisma.perRollamVoting.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    })

    // Send email notifications to ballot holders
    let emailsSent = 0
    let emailsFailed = 0
    const createdBallots = await this.prisma.perRollamBallot.findMany({
      where: { votingId: id },
      include: { party: { select: { email: true, displayName: true } } },
    })

    const frontendUrl = process.env.FRONTEND_URL || (process.env.DOMAIN ? `https://${process.env.DOMAIN}` : '')

    for (const ballot of createdBallots) {
      if (!ballot.party?.email) continue
      try {
        const deadline = new Date(voting.deadline).toLocaleDateString('cs-CZ')
        await this.email.send({
          to: ballot.party.email,
          subject: `Hlasování per rollam — ${voting.title}`,
          html: `
            <p>Dobrý den, ${ballot.party.displayName},</p>
            <p>bylo zahájeno hlasování per rollam <strong>${voting.title}</strong>.</p>
            <p>Počet bodů k hlasování: <strong>${voting.items.length}</strong></p>
            <p>Termín pro hlasování: <strong>${deadline}</strong></p>
            ${frontendUrl ? `<p><a href="${frontendUrl}/hlasovani/${ballot.accessToken}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Hlasovat</a></p>` : ''}
            <p style="color:#888;font-size:13px;">Pokud jste tento email neočekávali, kontaktujte správce nemovitosti.</p>
          `,
        })
        emailsSent++
      } catch (err) {
        emailsFailed++
        this.logger.error(`Per rollam email failed for ${ballot.party.email}: ${err}`)
      }
    }

    return { ballotsCreated, emailsSent, emailsFailed }
  }

  async close(user: AuthUser, id: string) {
    const voting = await this.findOne(user, id)
    if (voting.status !== 'PUBLISHED') throw new BadRequestException('Uzavřít lze pouze publikované hlasování')
    return this.prisma.perRollamVoting.update({ where: { id }, data: { status: 'CLOSED' } })
  }

  async evaluate(user: AuthUser, id: string) {
    const voting = await this.findOne(user, id)
    if (voting.status !== 'CLOSED') throw new BadRequestException('Vyhodnotit lze pouze uzavřené hlasování')

    const totalShares = voting.ballots.reduce((s, b) => s + Number(b.totalShare), 0)
    const respondedBallots = voting.ballots.filter(b => b.status === 'SUBMITTED' || b.status === 'MANUAL_ENTRY')
    const respondedShares = respondedBallots.reduce((s, b) => s + Number(b.totalShare), 0)
    const isQuorate = totalShares > 0 && (respondedShares / totalShares) > 0.5

    // Evaluate each item
    for (const item of voting.items) {
      const responses = await this.prisma.perRollamResponse.findMany({ where: { itemId: item.id } })

      let votesFor = 0, votesAgainst = 0, votesAbstain = 0
      for (const r of responses) {
        const w = Number(r.shareWeight)
        if (r.choice === 'ANO') votesFor += w
        else if (r.choice === 'NE') votesAgainst += w
        else votesAbstain += w
      }

      // Non-respondents count as abstain
      const respondedInItem = responses.reduce((s, r) => s + Number(r.shareWeight), 0)
      votesAbstain += totalShares - respondedInItem

      const result = evaluateMajority(votesFor, votesAgainst, votesAbstain, totalShares, respondedShares, item.majorityType, isQuorate)

      await this.prisma.perRollamItem.update({
        where: { id: item.id },
        data: { votesFor, votesAgainst, votesAbstain, result },
      })
    }

    await this.prisma.perRollamVoting.update({
      where: { id },
      data: { totalShares, respondedShares, isQuorate },
    })

    return { totalShares, respondedShares, isQuorate, items: voting.items.length }
  }

  async notifyResults(user: AuthUser, id: string) {
    const voting = await this.findOne(user, id)
    if (voting.status !== 'CLOSED' && voting.status !== 'COMPLETED') {
      throw new BadRequestException('Výsledky lze oznámit pouze po uzavření')
    }
    return this.prisma.perRollamVoting.update({
      where: { id },
      data: { status: 'COMPLETED', resultsNotifiedAt: new Date() },
    })
  }

  async cancel(user: AuthUser, id: string) {
    await this.findOne(user, id)
    return this.prisma.perRollamVoting.update({ where: { id }, data: { status: 'CANCELLED' } })
  }

  // ─── BALLOTS ───────────────────────────────────────────────────

  async listBallots(user: AuthUser, votingId: string) {
    await this.findOne(user, votingId)
    return this.prisma.perRollamBallot.findMany({
      where: { votingId },
      include: { _count: { select: { responses: true } } },
      orderBy: { name: 'asc' },
    })
  }

  async manualEntry(user: AuthUser, votingId: string, ballotId: string, votes: { itemId: string; choice: string }[]) {
    await this.findOne(user, votingId)
    const ballot = await this.prisma.perRollamBallot.findFirst({ where: { id: ballotId, votingId } })
    if (!ballot) throw new NotFoundException('Hlasovací lístek nenalezen')

    const shareWeight = Number(ballot.totalShare)
    const upserts = votes.map(v =>
      this.prisma.perRollamResponse.upsert({
        where: { itemId_ballotId: { itemId: v.itemId, ballotId } },
        update: { choice: v.choice as VoteChoice, shareWeight },
        create: { itemId: v.itemId, ballotId, choice: v.choice as VoteChoice, shareWeight },
      }),
    )
    await this.prisma.$transaction(upserts)

    await this.prisma.perRollamBallot.update({
      where: { id: ballotId },
      data: { status: 'MANUAL_ENTRY', submittedAt: new Date(), submissionMethod: 'MANUAL' },
    })

    return { recorded: votes.length }
  }

  // ─── PUBLIC BALLOT ─────────────────────────────────────────────

  async getBallotByToken(accessToken: string) {
    const ballot = await this.prisma.perRollamBallot.findUnique({
      where: { accessToken },
      include: {
        voting: {
          include: {
            property: { select: { name: true } },
            items: { orderBy: { orderNumber: 'asc' } },
          },
        },
        responses: true,
      },
    })
    if (!ballot) throw new NotFoundException('Hlasovací lístek nenalezen nebo je neplatný')
    return ballot
  }

  async submitBallot(accessToken: string, votes: { itemId: string; choice: string }[]) {
    const ballot = await this.getBallotByToken(accessToken)

    if (ballot.tokenExpiresAt && new Date() > ballot.tokenExpiresAt) {
      throw new BadRequestException('Termín pro hlasování vypršel')
    }
    if (ballot.voting.status !== 'PUBLISHED') {
      throw new BadRequestException('Hlasování není aktivní')
    }
    if (ballot.status !== 'PENDING') {
      throw new BadRequestException('Hlasy již byly zaznamenány')
    }

    const shareWeight = Number(ballot.totalShare)
    const creates = votes.map(v =>
      this.prisma.perRollamResponse.create({
        data: { itemId: v.itemId, ballotId: ballot.id, choice: v.choice as VoteChoice, shareWeight },
      }),
    )
    await this.prisma.$transaction(creates)

    await this.prisma.perRollamBallot.update({
      where: { id: ballot.id },
      data: { status: 'SUBMITTED', submittedAt: new Date(), submissionMethod: 'ONLINE' },
    })

    return { success: true }
  }

  // ─── PROGRESS ──────────────────────────────────────────────────

  async getProgress(user: AuthUser, votingId: string) {
    await this.findOne(user, votingId)
    const ballots = await this.prisma.perRollamBallot.findMany({ where: { votingId } })
    const total = ballots.length
    const submitted = ballots.filter(b => b.status !== 'PENDING').length
    const pending = total - submitted
    const totalShares = ballots.reduce((s, b) => s + Number(b.totalShare), 0)
    const respondedShares = ballots.filter(b => b.status !== 'PENDING').reduce((s, b) => s + Number(b.totalShare), 0)
    return { total, submitted, pending, totalShares, respondedShares, shareProgress: totalShares > 0 ? (respondedShares / totalShares) * 100 : 0 }
  }
}
