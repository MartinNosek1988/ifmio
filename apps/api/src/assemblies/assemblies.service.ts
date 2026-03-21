import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Decimal } from '@prisma/client/runtime/library'
import type { AuthUser } from '@ifmio/shared-types'
import type { MajorityType, VoteChoice } from '@prisma/client'

@Injectable()
export class AssembliesService {
  constructor(private prisma: PrismaService) {}

  // ─── ASSEMBLY CRUD ─────────────────────────────────────────────

  async findAll(user: AuthUser, query: { propertyId?: string; status?: string }) {
    const where: any = { tenantId: user.tenantId }
    if (query.propertyId) where.propertyId = query.propertyId
    if (query.status) where.status = query.status

    return this.prisma.assembly.findMany({
      where,
      include: {
        property: { select: { id: true, name: true } },
        _count: { select: { agendaItems: true, attendees: true } },
        agendaItems: { select: { id: true, result: true, requiresVote: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    })
  }

  async findOne(user: AuthUser, id: string) {
    const assembly = await this.prisma.assembly.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        property: { select: { id: true, name: true, address: true, city: true } },
        agendaItems: {
          orderBy: { orderNumber: 'asc' },
          include: {
            counterProposals: { orderBy: { orderNumber: 'asc' } },
            _count: { select: { votes: true } },
          },
        },
        attendees: {
          orderBy: { name: 'asc' },
          include: { _count: { select: { votes: true } } },
        },
      },
    })
    if (!assembly) throw new NotFoundException('Shromáždění nenalezeno')
    return assembly
  }

  async create(user: AuthUser, dto: any) {
    const maxNum = await this.prisma.assembly.aggregate({
      where: { tenantId: user.tenantId, propertyId: dto.propertyId },
      _max: { assemblyNumber: true },
    })

    return this.prisma.assembly.create({
      data: {
        tenantId: user.tenantId,
        propertyId: dto.propertyId,
        title: dto.title,
        description: dto.description,
        assemblyNumber: (maxNum._max.assemblyNumber ?? 0) + 1,
        scheduledAt: new Date(dto.scheduledAt),
        location: dto.location,
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
    if (dto.scheduledAt !== undefined) data.scheduledAt = new Date(dto.scheduledAt)
    if (dto.location !== undefined) data.location = dto.location
    if (dto.notes !== undefined) data.notes = dto.notes

    return this.prisma.assembly.update({ where: { id }, data })
  }

  async remove(user: AuthUser, id: string) {
    const assembly = await this.findOne(user, id)
    if (assembly.status !== 'DRAFT') {
      throw new BadRequestException('Smazat lze pouze shromáždění ve stavu Příprava')
    }
    await this.prisma.assembly.delete({ where: { id } })
    return { success: true }
  }

  // ─── STATUS TRANSITIONS ────────────────────────────────────────

  async publish(user: AuthUser, id: string) {
    const assembly = await this.findOne(user, id)
    if (assembly.status !== 'DRAFT') throw new BadRequestException('Publikovat lze pouze z přípravy')
    return this.prisma.assembly.update({ where: { id }, data: { status: 'PUBLISHED' } })
  }

  async start(user: AuthUser, id: string) {
    const assembly = await this.findOne(user, id)
    if (assembly.status !== 'PUBLISHED') throw new BadRequestException('Zahájit lze pouze publikované shromáždění')
    const quorum = await this.calculateQuorum(id, user.tenantId)
    return this.prisma.assembly.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        totalShares: quorum.totalShares,
        presentShares: quorum.presentShares,
        isQuorate: quorum.isQuorate,
      },
    })
  }

  async complete(user: AuthUser, id: string) {
    const assembly = await this.findOne(user, id)
    if (assembly.status !== 'IN_PROGRESS') throw new BadRequestException('Ukončit lze pouze probíhající shromáždění')
    return this.prisma.assembly.update({
      where: { id },
      data: { status: 'COMPLETED', endedAt: new Date() },
    })
  }

  async cancel(user: AuthUser, id: string) {
    await this.findOne(user, id)
    return this.prisma.assembly.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })
  }

  // ─── AGENDA ITEMS ──────────────────────────────────────────────

  async addAgendaItem(user: AuthUser, assemblyId: string, dto: any) {
    await this.findOne(user, assemblyId)
    const maxOrder = await this.prisma.assemblyAgendaItem.aggregate({
      where: { assemblyId },
      _max: { orderNumber: true },
    })

    return this.prisma.assemblyAgendaItem.create({
      data: {
        assemblyId,
        orderNumber: (maxOrder._max.orderNumber ?? 0) + 1,
        title: dto.title,
        description: dto.description,
        requiresVote: dto.requiresVote ?? true,
        majorityType: (dto.majorityType ?? 'NADPOLOVICNI_PRITOMNYCH') as MajorityType,
        isCounterProposal: dto.isCounterProposal ?? false,
        parentItemId: dto.parentItemId,
        notes: dto.notes,
      },
    })
  }

  async updateAgendaItem(user: AuthUser, assemblyId: string, itemId: string, dto: any) {
    await this.findOne(user, assemblyId)
    const data: any = {}
    if (dto.title !== undefined) data.title = dto.title
    if (dto.description !== undefined) data.description = dto.description
    if (dto.requiresVote !== undefined) data.requiresVote = dto.requiresVote
    if (dto.majorityType !== undefined) data.majorityType = dto.majorityType
    if (dto.notes !== undefined) data.notes = dto.notes

    return this.prisma.assemblyAgendaItem.update({ where: { id: itemId }, data })
  }

  async deleteAgendaItem(user: AuthUser, assemblyId: string, itemId: string) {
    await this.findOne(user, assemblyId)
    await this.prisma.assemblyAgendaItem.delete({ where: { id: itemId } })
    return { success: true }
  }

  async reorderAgendaItems(user: AuthUser, assemblyId: string, itemIds: string[]) {
    await this.findOne(user, assemblyId)
    const updates = itemIds.map((id, index) =>
      this.prisma.assemblyAgendaItem.update({ where: { id }, data: { orderNumber: index + 1 } }),
    )
    await this.prisma.$transaction(updates)
    return { success: true }
  }

  // ─── ATTENDANCE ────────────────────────────────────────────────

  async listAttendees(user: AuthUser, assemblyId: string) {
    await this.findOne(user, assemblyId)
    return this.prisma.assemblyAttendee.findMany({
      where: { assemblyId },
      orderBy: { name: 'asc' },
    })
  }

  async addAttendee(user: AuthUser, assemblyId: string, dto: any) {
    await this.findOne(user, assemblyId)
    return this.prisma.assemblyAttendee.create({
      data: {
        assemblyId,
        name: dto.name,
        principalId: dto.principalId,
        partyId: dto.partyId,
        unitIds: dto.unitIds ?? [],
        totalShare: dto.totalShare,
        isPresent: dto.isPresent ?? true,
        hasPowerOfAttorney: dto.hasPowerOfAttorney ?? false,
        powerOfAttorneyFrom: dto.powerOfAttorneyFrom,
        notes: dto.notes,
      },
    })
  }

  async updateAttendee(user: AuthUser, assemblyId: string, attendeeId: string, dto: any) {
    await this.findOne(user, assemblyId)
    const data: any = {}
    if (dto.isPresent !== undefined) data.isPresent = dto.isPresent
    if (dto.leftAt !== undefined) data.leftAt = new Date(dto.leftAt)
    if (dto.hasPowerOfAttorney !== undefined) data.hasPowerOfAttorney = dto.hasPowerOfAttorney
    if (dto.powerOfAttorneyFrom !== undefined) data.powerOfAttorneyFrom = dto.powerOfAttorneyFrom
    if (dto.keypadId !== undefined) data.keypadId = dto.keypadId
    if (dto.notes !== undefined) data.notes = dto.notes

    return this.prisma.assemblyAttendee.update({ where: { id: attendeeId }, data })
  }

  async removeAttendee(user: AuthUser, assemblyId: string, attendeeId: string) {
    await this.findOne(user, assemblyId)
    await this.prisma.assemblyAttendee.delete({ where: { id: attendeeId } })
    return { success: true }
  }

  async populateAttendees(user: AuthUser, assemblyId: string) {
    const assembly = await this.findOne(user, assemblyId)

    // Get all active unit ownerships for this property
    const ownerships = await this.prisma.unitOwnership.findMany({
      where: {
        tenantId: user.tenantId,
        unit: { propertyId: assembly.propertyId },
        isActive: true,
        OR: [{ validTo: null }, { validTo: { gt: new Date() } }],
      },
      include: {
        unit: { select: { id: true, name: true, commonAreaShare: true } },
        party: { select: { id: true, displayName: true } },
      },
    })

    // Group by party (one person may own multiple units)
    const byParty = new Map<string, {
      partyId: string
      name: string
      unitIds: string[]
      totalShare: number
    }>()

    for (const o of ownerships) {
      const key = o.partyId
      const share = o.unit.commonAreaShare ? Number(o.unit.commonAreaShare) : 0
      if (!byParty.has(key)) {
        byParty.set(key, {
          partyId: o.partyId,
          name: o.party.displayName,
          unitIds: [o.unit.id],
          totalShare: share,
        })
      } else {
        const entry = byParty.get(key)!
        if (!entry.unitIds.includes(o.unit.id)) {
          entry.unitIds.push(o.unit.id)
          entry.totalShare += share
        }
      }
    }

    // Check existing attendees to avoid duplicates
    const existing = await this.prisma.assemblyAttendee.findMany({
      where: { assemblyId },
      select: { partyId: true },
    })
    const existingPartyIds = new Set(existing.map(a => a.partyId).filter(Boolean))

    const created: any[] = []
    for (const entry of byParty.values()) {
      if (existingPartyIds.has(entry.partyId)) continue

      const attendee = await this.prisma.assemblyAttendee.create({
        data: {
          assemblyId,
          partyId: entry.partyId,
          name: entry.name,
          unitIds: entry.unitIds,
          totalShare: entry.totalShare,
          isPresent: false, // Will be checked in on-site
        },
      })
      created.push(attendee)
    }

    return { created: created.length, attendees: created }
  }

  // ─── QUORUM ────────────────────────────────────────────────────

  async calculateQuorum(assemblyId: string, tenantId: string) {
    const assembly = await this.prisma.assembly.findFirst({
      where: { id: assemblyId, tenantId },
    })
    if (!assembly) throw new NotFoundException('Shromáždění nenalezeno')

    // Total shares: sum of all unit commonAreaShare for this property
    const units = await this.prisma.unit.findMany({
      where: { propertyId: assembly.propertyId },
      select: { commonAreaShare: true },
    })
    const totalShares = units.reduce((sum, u) => sum + (u.commonAreaShare ? Number(u.commonAreaShare) : 0), 0)

    // Present shares: sum of present attendees' totalShare
    const attendees = await this.prisma.assemblyAttendee.findMany({
      where: { assemblyId, isPresent: true, leftAt: null },
      select: { totalShare: true },
    })
    const presentShares = attendees.reduce((sum, a) => sum + Number(a.totalShare), 0)

    const quorumPercentage = totalShares > 0 ? (presentShares / totalShares) * 100 : 0
    const isQuorate = quorumPercentage > 50

    // Update assembly
    await this.prisma.assembly.update({
      where: { id: assemblyId },
      data: {
        totalShares: totalShares,
        presentShares: presentShares,
        isQuorate,
      },
    })

    return { totalShares, presentShares, quorumPercentage, isQuorate }
  }

  async getQuorum(user: AuthUser, assemblyId: string) {
    await this.findOne(user, assemblyId)
    return this.calculateQuorum(assemblyId, user.tenantId)
  }

  // ─── VOTING ────────────────────────────────────────────────────

  async recordVotes(user: AuthUser, assemblyId: string, agendaItemId: string, votes: { attendeeId: string; choice: string }[]) {
    await this.findOne(user, assemblyId)

    // Lookup attendee shares
    const attendees = await this.prisma.assemblyAttendee.findMany({
      where: { assemblyId },
      select: { id: true, totalShare: true },
    })
    const shareMap = new Map(attendees.map(a => [a.id, Number(a.totalShare)]))

    const upserts = votes.map(v => {
      const shareWeight = shareMap.get(v.attendeeId) ?? 0
      return this.prisma.assemblyVote.upsert({
        where: { agendaItemId_attendeeId: { agendaItemId, attendeeId: v.attendeeId } },
        update: { choice: v.choice as VoteChoice, shareWeight },
        create: {
          agendaItemId,
          attendeeId: v.attendeeId,
          choice: v.choice as VoteChoice,
          shareWeight,
        },
      })
    })

    await this.prisma.$transaction(upserts)
    return { recorded: votes.length }
  }

  async getVotes(user: AuthUser, assemblyId: string, agendaItemId: string) {
    await this.findOne(user, assemblyId)
    return this.prisma.assemblyVote.findMany({
      where: { agendaItemId },
      include: { attendee: { select: { id: true, name: true, totalShare: true } } },
      orderBy: { attendee: { name: 'asc' } },
    })
  }

  async evaluateVote(user: AuthUser, assemblyId: string, agendaItemId: string) {
    const assembly = await this.findOne(user, assemblyId)

    const item = assembly.agendaItems.find(i => i.id === agendaItemId)
    if (!item) throw new NotFoundException('Bod programu nenalezen')

    const votes = await this.prisma.assemblyVote.findMany({ where: { agendaItemId } })

    let votesFor = 0, votesAgainst = 0, votesAbstain = 0
    for (const v of votes) {
      const w = Number(v.shareWeight)
      if (v.choice === 'ANO') votesFor += w
      else if (v.choice === 'NE') votesAgainst += w
      else votesAbstain += w
    }

    const totalShares = assembly.totalShares ? Number(assembly.totalShares) : 0
    const presentShares = assembly.presentShares ? Number(assembly.presentShares) : 0

    let result: 'SCHVALENO' | 'NESCHVALENO' | 'NEUSNASENO'

    if (!assembly.isQuorate) {
      result = 'NEUSNASENO'
    } else {
      const majority = item.majorityType as string
      let threshold: number
      if (majority === 'NADPOLOVICNI_PRITOMNYCH') {
        threshold = presentShares / 2
      } else if (majority === 'NADPOLOVICNI_VSECH') {
        threshold = totalShares / 2
      } else if (majority === 'KVALIFIKOVANA') {
        threshold = totalShares * 0.75
      } else {
        // JEDNOMYSLNA
        threshold = totalShares
      }

      result = votesFor > threshold ? 'SCHVALENO' : 'NESCHVALENO'
      // For JEDNOMYSLNA, it must be exactly equal (all shares voting yes)
      if (majority === 'JEDNOMYSLNA') {
        result = votesFor >= totalShares && votesAgainst === 0 && votesAbstain === 0
          ? 'SCHVALENO' : 'NESCHVALENO'
      }
    }

    await this.prisma.assemblyAgendaItem.update({
      where: { id: agendaItemId },
      data: { votesFor, votesAgainst, votesAbstain, result },
    })

    return {
      result,
      votesFor,
      votesAgainst,
      votesAbstain,
      totalShares,
      presentShares,
      majorityType: item.majorityType,
    }
  }
}
