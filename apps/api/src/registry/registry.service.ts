import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

/** Extract only year from "YYYY-MM-DD" string */
function rokFromDatum(datum: string | null | undefined): number | undefined {
  if (!datum || datum.length < 4) return undefined
  const year = parseInt(datum.slice(0, 4), 10)
  return isNaN(year) ? undefined : year
}

@Injectable()
export class RegistryService {
  constructor(private readonly prisma: PrismaService) {}

  async searchPersons(q: string, rok?: number) {
    const where: any = {
      lastName: { contains: q, mode: 'insensitive' },
    }
    if (rok) {
      where.datumNarozeni = { startsWith: String(rok) }
    }

    const persons = await this.prisma.kbPerson.findMany({
      where,
      select: {
        id: true, firstName: true, lastName: true, titulPred: true, datumNarozeni: true,
        _count: { select: { engagements: { where: { aktivni: true } } } },
      },
      take: 20,
      orderBy: { lastName: 'asc' },
    })

    return persons.map(p => ({
      id: p.id,
      jmeno: p.firstName,
      prijmeni: p.lastName,
      titulPred: p.titulPred,
      rokNarozeni: rokFromDatum(p.datumNarozeni),
      aktivniAngazmaCelkem: p._count.engagements,
    }))
  }

  async getPersonProfile(id: string) {
    const person = await this.prisma.kbPerson.findUnique({
      where: { id },
      include: {
        engagements: {
          orderBy: [{ aktivni: 'desc' }, { datumZapisu: 'desc' }],
          select: {
            id: true, ico: true, nazevFirmy: true, funkce: true,
            od: true, do: true, aktivni: true,
            partnerIco: true, partnerNazev: true,
          },
        },
      },
    })
    if (!person) return null

    // Enrich engagements with org legalFormCode
    const icos = [...new Set(person.engagements.map(e => e.ico))]
    const orgs = await this.prisma.kbOrganization.findMany({
      where: { ico: { in: icos } },
      select: { ico: true, legalFormCode: true },
    })
    const orgMap = new Map(orgs.map(o => [o.ico, o.legalFormCode]))

    return {
      id: person.id,
      jmeno: person.firstName,
      prijmeni: person.lastName,
      titulPred: person.titulPred,
      titulZa: person.titulZa,
      rokNarozeni: rokFromDatum(person.datumNarozeni),
      // adresu NEVRACÍME (GDPR)
      engagements: person.engagements.map(e => ({
        ...e,
        pravniForma: orgMap.get(e.ico) ?? undefined,
      })),
    }
  }

  async getOrganizationProfile(ico: string) {
    const org = await this.prisma.kbOrganization.findUnique({
      where: { ico },
      select: {
        ico: true, name: true, legalFormCode: true, street: true,
        dateEstablished: true, dateCancelled: true, isActive: true, spisovaZnacka: true,
      },
    })
    if (!org) return null

    const engagements = await this.prisma.kbPersonEngagement.findMany({
      where: { ico },
      include: {
        person: { select: { id: true, firstName: true, lastName: true, titulPred: true, datumNarozeni: true } },
      },
      orderBy: [{ aktivni: 'desc' }, { datumZapisu: 'desc' }],
    })

    const mapEngagement = (e: typeof engagements[0]) => ({
      engagementId: e.id,
      funkce: e.funkce,
      od: e.od,
      do: e.do,
      aktivni: e.aktivni,
      personId: e.person?.id,
      jmeno: e.person?.firstName,
      prijmeni: e.person?.lastName,
      titulPred: e.person?.titulPred,
      rokNarozeni: rokFromDatum(e.person?.datumNarozeni),
      partnerIco: e.partnerIco,
      partnerNazev: e.partnerNazev,
    })

    return {
      ico: org.ico,
      nazev: org.name,
      pravniForma: org.legalFormCode,
      sidlo: org.street,
      datumVzniku: org.dateEstablished,
      datumZaniku: org.dateCancelled,
      aktivni: org.isActive,
      spisovaZnacka: org.spisovaZnacka,
      statutarniOrgan: engagements.filter(e => e.aktivni).map(mapEngagement),
      historieCas: engagements.filter(e => !e.aktivni).map(mapEngagement),
    }
  }

  async getOrganizationPersons(ico: string) {
    const engagements = await this.prisma.kbPersonEngagement.findMany({
      where: { ico },
      include: {
        person: { select: { id: true, firstName: true, lastName: true, titulPred: true, datumNarozeni: true } },
      },
      orderBy: [{ aktivni: 'desc' }, { datumZapisu: 'desc' }],
    })

    return engagements.map(e => ({
      engagementId: e.id,
      funkce: e.funkce,
      od: e.od,
      do: e.do,
      aktivni: e.aktivni,
      personId: e.person?.id,
      jmeno: e.person?.firstName,
      prijmeni: e.person?.lastName,
      titulPred: e.person?.titulPred,
      rokNarozeni: rokFromDatum(e.person?.datumNarozeni),
      partnerIco: e.partnerIco,
      partnerNazev: e.partnerNazev,
    }))
  }
}
