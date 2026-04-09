import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyScopeService } from '../common/services/property-scope.service';
import { BuildingEnrichmentService } from '../knowledge-base/building-enrichment.service';
import { AresService } from '../integrations/ares/ares.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import type { PropertyType, OwnershipType, PropertyLegalMode, AccountingSystem } from '@prisma/client';
import type { AuthUser } from '@ifmio/shared-types';

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);

  constructor(
    private prisma: PrismaService,
    private scope: PropertyScopeService,
    private enrichment: BuildingEnrichmentService,
    private aresService: AresService,
  ) {}

  async create(tenantId: string, dto: CreatePropertyDto) {
    const property = await this.prisma.property.create({
      data: {
        tenantId,
        name: dto.name,
        address: dto.address,
        city: dto.city,
        postalCode: dto.postalCode,
        type: dto.type as PropertyType,
        ownership: dto.ownership as OwnershipType,
        ico: dto.ico,
        dic: dto.dic,
        isVatPayer: dto.isVatPayer,
        legalMode: dto.legalMode as PropertyLegalMode | undefined,
        accountingSystem: dto.accountingSystem as AccountingSystem | undefined,
        managedFrom: dto.managedFrom ? new Date(dto.managedFrom) : undefined,
        managedTo: dto.managedTo ? new Date(dto.managedTo) : undefined,
        cadastralArea: dto.cadastralArea,
        landRegistrySheet: dto.landRegistrySheet,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        website: dto.website,
        websiteNote: dto.websiteNote,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
      include: { units: true },
    });

    // Knowledge Base enrichment (async, non-blocking)
    this.enrichment.enrichFromProperty({
      id: property.id,
      address: property.address,
      city: property.city,
      postalCode: property.postalCode,
      ico: property.ico,
    }).catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn('KB enrichment failed', { error: msg });
    });

    // ARES + Justice enrichment (async, non-blocking)
    if (property.ico) {
      this.enrichProperty(property.id).catch(err =>
        this.logger.warn(`Registry enrichment failed for property ${property.id}`, { error: String(err) }),
      );
    }

    return property;
  }

  async findAll(user: AuthUser) {
    const ids = await this.scope.getAccessiblePropertyIds(user);
    const where: Record<string, unknown> = {
      tenantId: user.tenantId,
      status: { not: 'archived' },
    };
    if (ids !== null) {
      where.id = { in: ids };
    }

    return this.prisma.property.findMany({
      where,
      // units[] excluded from list — use detail endpoint for full units
      include: { _count: { select: { units: true, residents: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(user: AuthUser, id: string) {
    await this.scope.verifyPropertyAccess(user, id);

    const property = await this.prisma.property.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        units: true,
        _count: { select: { residents: true, prescriptions: true } },
      },
    });
    if (!property) throw new NotFoundException('Nemovitost nenalezena');

    // Compute active prescriptions count + monthly volume
    let activePrescriptions = 0;
    let monthlyVolume = 0;
    try {
      const prescriptionAgg = await this.prisma.prescription.aggregate({
        where: {
          tenantId: user.tenantId,
          propertyId: id,
          status: 'active',
          validFrom: { lte: new Date() },
          OR: [{ validTo: null }, { validTo: { gte: new Date() } }],
        },
        _count: true,
        _sum: { amount: true },
      });
      activePrescriptions = prescriptionAgg._count;
      monthlyVolume = prescriptionAgg._sum.amount ? Number(prescriptionAgg._sum.amount) : 0;
    } catch {
      // Prescription aggregation may fail if schema is out of sync — don't crash detail
    }

    return {
      ...property,
      activePrescriptions,
      monthlyVolume,
    };
  }

  async update(user: AuthUser, id: string, dto: UpdatePropertyDto) {
    const existing = await this.findOne(user, id);
    const updated = await this.prisma.property.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
        ...(dto.type !== undefined && { type: dto.type as PropertyType }),
        ...(dto.ownership !== undefined && { ownership: dto.ownership as OwnershipType }),
        ...(dto.ico !== undefined && { ico: dto.ico }),
        ...(dto.dic !== undefined && { dic: dto.dic }),
        ...(dto.isVatPayer !== undefined && { isVatPayer: dto.isVatPayer }),
        ...(dto.legalMode !== undefined && { legalMode: dto.legalMode as PropertyLegalMode }),
        ...(dto.accountingSystem !== undefined && { accountingSystem: dto.accountingSystem as AccountingSystem }),
        ...(dto.managedFrom !== undefined && { managedFrom: dto.managedFrom ? new Date(dto.managedFrom) : null }),
        ...(dto.managedTo !== undefined && { managedTo: dto.managedTo ? new Date(dto.managedTo) : null }),
        ...(dto.cadastralArea !== undefined && { cadastralArea: dto.cadastralArea || null }),
        ...(dto.landRegistrySheet !== undefined && { landRegistrySheet: dto.landRegistrySheet || null }),
        ...(dto.contactName !== undefined && { contactName: dto.contactName || null }),
        ...(dto.contactEmail !== undefined && { contactEmail: dto.contactEmail || null }),
        ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone || null }),
        ...(dto.website !== undefined && { website: dto.website || null }),
        ...(dto.websiteNote !== undefined && { websiteNote: dto.websiteNote || null }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
      },
      include: { units: true },
    });

    // Re-enrich if IČO changed
    if (dto.ico !== undefined && dto.ico !== existing.ico && dto.ico) {
      this.enrichProperty(id).catch(err =>
        this.logger.warn(`Registry enrichment failed for property ${id}`, { error: String(err) }),
      );
    }

    return updated;
  }

  async archive(user: AuthUser, id: string) {
    await this.findOne(user, id);
    return this.prisma.property.update({
      where: { id },
      data: { status: 'archived' },
    });
  }

  async getNav(user: AuthUser, id: string) {
    const scopeWhere = await this.scope.scopeByPropertyId(user)
    const properties = await this.prisma.property.findMany({
      where: { tenantId: user.tenantId, status: 'active', ...scopeWhere } as any,
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    })
    const idx = properties.findIndex(p => p.id === id)
    if (idx < 0) throw new NotFoundException('Nemovitost nenalezena')
    return {
      total: properties.length,
      current: idx + 1,
      prevId: idx > 0 ? properties[idx - 1].id : null,
      nextId: idx < properties.length - 1 ? properties[idx + 1].id : null,
    }
  }

  /**
   * Enrich property with ARES data (basic + VR statutory body).
   * Called automatically on create/update with IČO, or manually via POST /properties/:id/enrich.
   */
  async enrichProperty(propertyId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, ico: true },
    });
    if (!property?.ico) return { enriched: false, reason: 'no_ico' };

    const aresData = await this.aresService.enrichByIco(property.ico);

    // Link statutory members to KbPerson by lastName+datumNarozeni (batch)
    if (aresData.statutarniOrgan?.clenove) {
      const matchable = aresData.statutarniOrgan.clenove.filter(
        (c: any) => Boolean(c.prijmeni && c.datumNarozeni),
      );

      if (matchable.length > 0) {
        try {
          const persons = await this.prisma.kbPerson.findMany({
            where: {
              OR: matchable.map((c: any) => ({
                lastName: c.prijmeni,
                datumNarozeni: c.datumNarozeni,
              })),
            },
            select: { id: true, lastName: true, datumNarozeni: true },
          });

          const personByKey = new Map<string, string>();
          for (const p of persons) {
            const key = `${p.lastName}::${p.datumNarozeni ? new Date(p.datumNarozeni).toISOString() : ''}`;
            if (!personByKey.has(key)) personByKey.set(key, p.id);
          }

          for (const clen of matchable) {
            const key = `${clen.prijmeni}::${clen.datumNarozeni ? new Date(clen.datumNarozeni).toISOString() : ''}`;
            const kbPersonId = personByKey.get(key);
            if (kbPersonId) clen.kbPersonId = kbPersonId;
          }
        } catch { /* non-critical */ }
      }
    }

    const updated = await this.prisma.property.update({
      where: { id: propertyId },
      data: {
        aresData: aresData as any,
        enrichedAt: new Date(),
      },
      select: { aresData: true, enrichedAt: true },
    });

    return { aresData: updated.aresData, enrichedAt: updated.enrichedAt };
  }

  async getKbOrganization(ico: string) {
    const org = await this.prisma.kbOrganization.findUnique({
      where: { ico },
    });
    if (!org) return null;

    const engagements = await this.prisma.kbPersonEngagement.findMany({
      where: { ico },
      include: {
        person: { select: { id: true, firstName: true, lastName: true, titulPred: true, datumNarozeni: true } },
      },
      orderBy: [{ aktivni: 'desc' }, { datumZapisu: 'desc' }],
    });

    return { ...org, engagements };
  }
}
