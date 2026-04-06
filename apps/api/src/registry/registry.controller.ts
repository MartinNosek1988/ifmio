import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { PrismaService } from '../prisma/prisma.service'

@ApiTags('Registry')
@ApiBearerAuth()
@Controller('registry')
export class RegistryController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('persons/search')
  @ApiOperation({ summary: 'Hledat osoby v KB' })
  async searchPersons(
    @Query('q') q?: string,
    @Query('datumNarozeni') datumNarozeni?: string,
  ) {
    if (!q || q.length < 2) return []

    const where: any = {
      lastName: { contains: q, mode: 'insensitive' },
    }
    if (datumNarozeni) {
      where.datumNarozeni = datumNarozeni
    }

    return this.prisma.kbPerson.findMany({
      where,
      include: {
        engagements: {
          orderBy: [{ aktivni: 'desc' }, { datumZapisu: 'desc' }],
          take: 5,
        },
      },
      take: 20,
      orderBy: { lastName: 'asc' },
    })
  }

  @Get('persons/:id')
  @ApiOperation({ summary: 'Profil osoby z KB' })
  async getPersonProfile(@Param('id') id: string) {
    const person = await this.prisma.kbPerson.findUnique({
      where: { id },
      include: {
        engagements: {
          orderBy: [{ aktivni: 'desc' }, { datumZapisu: 'desc' }],
        },
      },
    })
    if (!person) throw new NotFoundException('Osoba nenalezena')

    // Enrich engagements with org data
    const icos = [...new Set(person.engagements.map(e => e.ico))]
    const orgs = await this.prisma.kbOrganization.findMany({
      where: { ico: { in: icos } },
      select: { ico: true, name: true, legalFormCode: true, isActive: true },
    })
    const orgMap = new Map(orgs.map(o => [o.ico, o]))

    return {
      ...person,
      engagements: person.engagements.map(e => ({
        ...e,
        organization: orgMap.get(e.ico) ?? null,
      })),
    }
  }

  @Get('organizations/:ico')
  @ApiOperation({ summary: 'Profil organizace z KB' })
  async getOrganizationProfile(@Param('ico') ico: string) {
    const org = await this.prisma.kbOrganization.findUnique({
      where: { ico },
    })
    if (!org) throw new NotFoundException('Organizace nenalezena')

    const engagements = await this.prisma.kbPersonEngagement.findMany({
      where: { ico },
      include: {
        person: { select: { id: true, firstName: true, lastName: true, titulPred: true, datumNarozeni: true } },
      },
      orderBy: [{ aktivni: 'desc' }, { datumZapisu: 'desc' }],
    })

    return { ...org, engagements }
  }
}
