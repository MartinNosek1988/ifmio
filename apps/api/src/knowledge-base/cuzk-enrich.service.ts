import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CuzkApiKnService } from '../integrations/cuzk/cuzk-api-kn.service'

@Injectable()
export class CuzkEnrichService {
  private readonly logger = new Logger(CuzkEnrichService.name)
  private isRunning = false

  constructor(
    private prisma: PrismaService,
    private cuzkApi: CuzkApiKnService,
  ) {}

  /** Daily auto-enrich: fetch ČÚZK data for buildings without units. Max ~60/day. */
  async runDailyEnrich(): Promise<{ enriched: number; failed: number; total: number }> {
    if (!this.cuzkApi.isConfigured) {
      this.logger.debug('ČÚZK API key not configured — skipping daily enrich')
      return { enriched: 0, failed: 0, total: 0 }
    }
    if (this.isRunning) {
      this.logger.warn('ČÚZK enrich already running — skipping')
      return { enriched: 0, failed: 0, total: 0 }
    }

    this.isRunning = true
    this.logger.log('ČÚZK daily enrich started')

    try {
      const buildings = await this.prisma.building.findMany({
        where: {
          ruianAddressId: { not: null },
          units: { none: {} },
        },
        select: { id: true, ruianAddressId: true, fullAddress: true },
        orderBy: { dataQualityScore: 'desc' },
        take: 60,
      })

      let enriched = 0
      let failed = 0

      for (const building of buildings) {
        try {
          const stavba = await this.cuzkApi.getStavbaByAdresniMisto(Number(building.ruianAddressId))
          if (!stavba) { failed++; continue }

          await this.prisma.building.update({
            where: { id: building.id },
            data: {
              landRegistrySheet: stavba.lv?.cislo?.toString(),
              cadastralTerritoryCode: stavba.lv?.katastralniUzemi?.kod?.toString(),
              cadastralTerritoryName: stavba.lv?.katastralniUzemi?.nazev,
            },
          })

          for (const jRef of stavba.jednotky ?? []) {
            const jednotka = await this.cuzkApi.getJednotkaDetail(jRef.id)
            if (!jednotka) continue

            const unitNumber = String(jednotka.cisloJednotky)
            await this.prisma.buildingUnit.upsert({
              where: { buildingId_unitNumber: { buildingId: building.id, unitNumber } },
              create: {
                buildingId: building.id,
                unitNumber,
                unitType: jednotka.zpusobVyuziti?.nazev?.includes('byt') ? 'APARTMENT' : 'NON_RESIDENTIAL',
                usage: jednotka.zpusobVyuziti?.nazev,
                shareNumerator: jednotka.podilNaSpolecnychCastechDomu?.citatel,
                shareDenominator: jednotka.podilNaSpolecnychCastechDomu?.jmenovatel,
                lvNumber: jednotka.lv?.cislo?.toString(),
                cuzkStavbaId: stavba.id,
              },
              update: {
                unitType: jednotka.zpusobVyuziti?.nazev?.includes('byt') ? 'APARTMENT' : 'NON_RESIDENTIAL',
                usage: jednotka.zpusobVyuziti?.nazev,
                shareNumerator: jednotka.podilNaSpolecnychCastechDomu?.citatel,
                shareDenominator: jednotka.podilNaSpolecnychCastechDomu?.jmenovatel,
                lvNumber: jednotka.lv?.cislo?.toString(),
                cuzkStavbaId: stavba.id,
              },
            })
          }

          enriched++
          await new Promise(r => setTimeout(r, 1000))
        } catch (err) {
          failed++
          this.logger.warn(`ČÚZK enrich failed for ${building.id}: ${err instanceof Error ? err.message : err}`)
        }
      }

      this.logger.log(`ČÚZK daily enrich done: ${enriched} enriched, ${failed} failed`)
      return { enriched, failed, total: buildings.length }
    } finally {
      this.isRunning = false
    }
  }
}
