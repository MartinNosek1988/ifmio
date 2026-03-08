import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

interface AuthUser {
  id: string;
  tenantId: string;
  role: string;
}

export interface CalcInput {
  propertyId: string;
  totalAmount: number;
  description: string;
  type: 'advance' | 'service' | 'rent' | 'other';
  splitMethod: 'equal' | 'byArea';
  dueDay?: number;
  validFrom: string;
  validTo?: string;
}

export interface CalcPreviewItem {
  unitId: string;
  unitName: string;
  area: number | null;
  share: number;
  amount: number;
}

export interface CalcPreview {
  items: CalcPreviewItem[];
  totalAmount: number;
  splitMethod: string;
  unitsCount: number;
}

@Injectable()
export class PrescriptionCalcService {
  constructor(private prisma: PrismaService) {}

  async preview(user: AuthUser, input: CalcInput): Promise<CalcPreview> {
    const units = await this.prisma.unit.findMany({
      where: { propertyId: input.propertyId, property: { tenantId: user.tenantId } },
      orderBy: { name: 'asc' },
    });

    if (!units.length) {
      throw new BadRequestException('Nemovitost nemá žádné jednotky');
    }

    const items = this.calculateSplit(units, input.totalAmount, input.splitMethod);

    return {
      items,
      totalAmount: input.totalAmount,
      splitMethod: input.splitMethod,
      unitsCount: units.length,
    };
  }

  async execute(user: AuthUser, input: CalcInput) {
    const units = await this.prisma.unit.findMany({
      where: { propertyId: input.propertyId, property: { tenantId: user.tenantId } },
      orderBy: { name: 'asc' },
    });

    if (!units.length) {
      throw new BadRequestException('Nemovitost nemá žádné jednotky');
    }

    const items = this.calculateSplit(units, input.totalAmount, input.splitMethod);
    let created = 0;

    for (const item of items) {
      await this.prisma.prescription.create({
        data: {
          tenantId: user.tenantId,
          propertyId: input.propertyId,
          unitId: item.unitId,
          type: input.type,
          description: `${input.description} — ${item.unitName}`,
          amount: new Decimal(item.amount.toFixed(2)),
          dueDay: input.dueDay ?? 15,
          validFrom: new Date(input.validFrom),
          validTo: input.validTo ? new Date(input.validTo) : undefined,
        },
      });
      created++;
    }

    return { created, total: items.length, totalAmount: input.totalAmount };
  }

  private calculateSplit(
    units: Array<{ id: string; name: string; area: number | null }>,
    totalAmount: number,
    method: string,
  ): CalcPreviewItem[] {
    if (method === 'byArea') {
      const totalArea = units.reduce((s, u) => s + (u.area ?? 0), 0);
      if (totalArea <= 0) {
        throw new BadRequestException('Žádná jednotka nemá vyplněnou plochu — nelze dělit podle plochy');
      }

      return units.map((u) => {
        const area = u.area ?? 0;
        const share = totalArea > 0 ? area / totalArea : 0;
        return {
          unitId: u.id,
          unitName: u.name,
          area,
          share: Math.round(share * 10000) / 100,
          amount: Math.round(totalAmount * share * 100) / 100,
        };
      });
    }

    // equal split
    const share = 1 / units.length;
    const perUnit = Math.round((totalAmount / units.length) * 100) / 100;

    return units.map((u) => ({
      unitId: u.id,
      unitName: u.name,
      area: u.area,
      share: Math.round(share * 10000) / 100,
      amount: perUnit,
    }));
  }
}
