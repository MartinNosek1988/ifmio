import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InvoicesService } from './invoices.service';
import type { AuthUser } from '@ifmio/shared-types';

const MODEL_ID = 'claude-haiku-4-5-20251001';
const BATCH_DISCOUNT = 0.5; // 50% discount on batch API
const MODEL_PRICING = { input: 1.00, output: 5.00 };
const USD_CZK_RATE = 23.0;

const SYSTEM_PROMPT = `Jsi expert na extrakci dat z českých faktur.
Extrahuj strukturovaná data z faktury a vrať POUZE validní JSON objekt.
Pokud pole není na faktuře uvedeno, vrať null pro dané pole.
Číselné hodnoty vrať jako čísla (ne stringy).
Data vrať ve formátu YYYY-MM-DD.
IČO je 8místné číslo bez mezer. DIČ začíná "CZ" + IČO.`;

const USER_PROMPT_BASE = `Extrahuj data z této faktury a vrať JSON:
{"number":null,"supplierName":null,"supplierIco":null,"supplierDic":null,"buyerName":null,"buyerIco":null,"buyerDic":null,"description":null,"amountBase":null,"vatAmount":null,"amountTotal":null,"vatRate":null,"issueDate":null,"duzp":null,"dueDate":null,"variableSymbol":null,"constantSymbol":null,"specificSymbol":null,"paymentIban":null,"currency":"CZK","paymentMethod":null}
Vrať POUZE JSON, žádný jiný text.`;

@Injectable()
export class AiBatchService {
  private readonly logger = new Logger(AiBatchService.name);
  private readonly apiKey: string | undefined;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private invoicesService: InvoicesService,
  ) {
    this.apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
  }

  private async buildFewShotSection(tenantId: string): Promise<string> {
    const patterns = await this.prisma.supplierExtractionPattern.findMany({
      where: { tenantId },
      orderBy: { usageCount: 'desc' },
      take: 5,
    });

    if (patterns.length === 0) return '';

    let section = '\n\nVzory z předchozích faktur v systému:\n';
    for (const pattern of patterns) {
      section += `\nDodavatel ${pattern.supplierName ?? pattern.supplierIco} (IČO: ${pattern.supplierIco}):\n`;
      const examples = pattern.fieldExamples as Record<string, string>;
      for (const [field, val] of Object.entries(examples)) {
        section += `  - ${field}: ${val}\n`;
      }
      if (pattern.hints) {
        section += `  Poznámka: ${pattern.hints}\n`;
      }
    }
    section += '\nPokud faktura pochází od některého z těchto dodavatelů, použij tyto vzory jako referenci pro formát a hodnoty polí.';
    return section;
  }

  async createBatch(user: AuthUser, items: { pdfBase64: string; fileName?: string }[]) {
    if (!this.apiKey) throw new BadRequestException('AI extrakce není dostupná — ANTHROPIC_API_KEY není nastaven');
    if (items.length === 0) throw new BadRequestException('Žádné soubory k zpracování');
    if (items.length > 100) throw new BadRequestException('Maximálně 100 souborů v jednom batchi');

    // Create batch record
    const batch = await this.prisma.aiExtractionBatch.create({
      data: {
        tenantId: user.tenantId,
        status: 'pending',
        totalCount: items.length,
        createdBy: user.id,
      },
    });

    // Create batch items
    const batchItems = await Promise.all(
      items.map((item, idx) =>
        this.prisma.aiExtractionBatchItem.create({
          data: {
            batchId: batch.id,
            customId: `${batch.id}_${idx}`,
            fileName: item.fileName,
            pdfBase64: item.pdfBase64,
            status: 'pending',
          },
        }),
      ),
    );

    // Build few-shot section
    const fewShotSection = await this.buildFewShotSection(user.tenantId);
    const userPrompt = USER_PROMPT_BASE + fewShotSection;

    // Build Anthropic Batch API request
    const requests = batchItems.map((item) => ({
      custom_id: item.id,
      params: {
        model: MODEL_ID,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user' as const,
            content: [
              {
                type: 'document' as const,
                source: {
                  type: 'base64' as const,
                  media_type: 'application/pdf' as const,
                  data: item.pdfBase64,
                },
              },
              { type: 'text' as const, text: userPrompt },
            ],
          },
        ],
      },
    }));

    // Submit to Anthropic Batch API
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages/batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'message-batches-2024-09-24',
        },
        body: JSON.stringify({ requests }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        this.logger.error(`Batch API submission failed: ${response.status} ${errBody}`);
        await this.prisma.aiExtractionBatch.update({
          where: { id: batch.id },
          data: { status: 'failed' },
        });
        throw new BadRequestException('Odeslání batche selhalo: ' + response.status);
      }

      const result = await response.json() as { id: string };

      await this.prisma.aiExtractionBatch.update({
        where: { id: batch.id },
        data: {
          anthropicBatchId: result.id,
          status: 'submitted',
          submittedAt: new Date(),
        },
      });

      // Estimate cost: items × ~1500 tokens × pricing × 50% discount
      const estimatedCostUsd = items.length * 1500 * (MODEL_PRICING.input / 1e6) * BATCH_DISCOUNT;

      return {
        batchId: batch.id,
        anthropicBatchId: result.id,
        itemCount: items.length,
        estimatedCostUsd: Math.round(estimatedCostUsd * 1e6) / 1e6,
        estimatedCostCzk: Math.round(estimatedCostUsd * USD_CZK_RATE * 100) / 100,
      };
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      this.logger.error(`Batch API error: ${e.message}`);
      await this.prisma.aiExtractionBatch.update({
        where: { id: batch.id },
        data: { status: 'failed' },
      });
      throw new BadRequestException('Odeslání batche selhalo: ' + (e.message || 'neznámá chyba'));
    }
  }

  async checkBatch(tenantId: string, batchId: string) {
    const batch = await this.prisma.aiExtractionBatch.findFirst({
      where: { id: batchId, tenantId },
    });
    if (!batch) throw new NotFoundException('Batch nenalezen');
    if (!batch.anthropicBatchId) throw new BadRequestException('Batch nebyl odeslán');

    if (batch.status === 'completed' || batch.status === 'failed') {
      return this.getBatchWithItems(tenantId, batchId);
    }

    // Poll Anthropic for status
    const statusRes = await fetch(
      `https://api.anthropic.com/v1/messages/batches/${batch.anthropicBatchId}`,
      {
        headers: {
          'x-api-key': this.apiKey!,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'message-batches-2024-09-24',
        },
      },
    );

    if (!statusRes.ok) {
      this.logger.error(`Batch status check failed: ${statusRes.status}`);
      return { ...batch, items: [] };
    }

    const statusData = await statusRes.json() as {
      processing_status: string;
      results_url?: string;
      request_counts?: { processing: number; succeeded: number; errored: number; canceled: number; expired: number };
    };

    if (statusData.processing_status === 'in_progress') {
      await this.prisma.aiExtractionBatch.update({
        where: { id: batchId },
        data: { status: 'processing' },
      });
      return {
        ...batch,
        status: 'processing',
        requestCounts: statusData.request_counts,
        items: [],
      };
    }

    if (statusData.processing_status === 'ended') {
      await this.processCompletedBatch(batch.id, batch.tenantId, batch.anthropicBatchId, batch.createdBy);
      return this.getBatchWithItems(tenantId, batchId);
    }

    return { ...batch, status: batch.status, items: [] };
  }

  private async processCompletedBatch(
    batchId: string,
    tenantId: string,
    anthropicBatchId: string,
    createdBy: string | null,
  ) {
    // Download results (streaming JSONL)
    const resultsRes = await fetch(
      `https://api.anthropic.com/v1/messages/batches/${anthropicBatchId}/results`,
      {
        headers: {
          'x-api-key': this.apiKey!,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'message-batches-2024-09-24',
        },
      },
    );

    if (!resultsRes.ok) {
      this.logger.error(`Batch results download failed: ${resultsRes.status}`);
      await this.prisma.aiExtractionBatch.update({
        where: { id: batchId },
        data: { status: 'failed' },
      });
      return;
    }

    const body = await resultsRes.text();
    const lines = body.split('\n').filter((l) => l.trim());

    let processedCount = 0;
    let failedCount = 0;
    let totalCostUsd = 0;

    for (const line of lines) {
      try {
        const result = JSON.parse(line) as {
          custom_id: string;
          result: {
            type: string;
            message?: {
              content: Array<{ type: string; text?: string }>;
              usage?: { input_tokens: number; output_tokens: number };
            };
            error?: { message: string };
          };
        };

        const itemId = result.custom_id;

        if (result.result.type === 'succeeded' && result.result.message) {
          const msg = result.result.message;
          const textBlock = msg.content.find((c) => c.type === 'text');
          const inputTokens = msg.usage?.input_tokens ?? 0;
          const outputTokens = msg.usage?.output_tokens ?? 0;

          // 50% discount for batch
          const costUsd =
            ((inputTokens / 1e6) * MODEL_PRICING.input +
              (outputTokens / 1e6) * MODEL_PRICING.output) *
            BATCH_DISCOUNT;
          totalCostUsd += costUsd;

          let extractedData: Record<string, unknown> | null = null;
          let confidence = 'low';

          if (textBlock?.text) {
            try {
              extractedData = JSON.parse(
                textBlock.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim(),
              );
              const keyFields = ['number', 'supplierName', 'amountTotal', 'issueDate', 'variableSymbol'];
              const filled = keyFields.filter(
                (k) => extractedData![k] != null && extractedData![k] !== '',
              ).length;
              confidence = filled >= 4 ? 'high' : filled >= 2 ? 'medium' : 'low';
            } catch {
              // JSON parse failed
            }
          }

          await this.prisma.aiExtractionBatchItem.update({
            where: { id: itemId },
            data: {
              status: 'completed',
              extractedData: (extractedData as Prisma.InputJsonValue) ?? Prisma.JsonNull,
              confidence,
              inputTokens,
              outputTokens,
              costUsd,
              completedAt: new Date(),
            },
          });

          // Log in AiExtractionLog
          await this.prisma.aiExtractionLog.create({
            data: {
              tenantId,
              model: MODEL_ID,
              inputTokens,
              outputTokens,
              costUsd,
              confidence,
              success: !!extractedData,
              createdBy,
            },
          });

          processedCount++;
        } else {
          // Failed result
          await this.prisma.aiExtractionBatchItem.update({
            where: { id: itemId },
            data: {
              status: 'failed',
              errorMessage: result.result.error?.message ?? 'Unknown error',
              completedAt: new Date(),
            },
          });
          failedCount++;
        }
      } catch (e: any) {
        this.logger.error(`Failed to process batch result line: ${e.message}`);
        failedCount++;
      }
    }

    await this.prisma.aiExtractionBatch.update({
      where: { id: batchId },
      data: {
        status: 'completed',
        processedCount,
        failedCount,
        totalCostUsd,
        completedAt: new Date(),
      },
    });

    // Send notification
    if (createdBy) {
      await this.prisma.notification.create({
        data: {
          tenantId,
          userId: createdBy,
          type: 'AI_BATCH_COMPLETED',
          title: 'Dávkové zpracování dokončeno',
          body: `${processedCount} faktur bylo zpracováno. Zkontrolujte výsledky.`,
          entityId: batchId,
          entityType: 'AiExtractionBatch',
        },
      });
    }
  }

  async getBatchWithItems(tenantId: string, batchId: string) {
    const batch = await this.prisma.aiExtractionBatch.findFirst({
      where: { id: batchId, tenantId },
      include: {
        items: {
          select: {
            id: true,
            customId: true,
            fileName: true,
            status: true,
            extractedData: true,
            confidence: true,
            invoiceId: true,
            errorMessage: true,
            inputTokens: true,
            outputTokens: true,
            costUsd: true,
            completedAt: true,
            // Deliberately omitting pdfBase64 — too large for list
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!batch) throw new NotFoundException('Batch nenalezen');
    return batch;
  }

  async getBatchItemPdf(tenantId: string, batchId: string, itemId: string): Promise<string> {
    const item = await this.prisma.aiExtractionBatchItem.findFirst({
      where: { id: itemId, batch: { id: batchId, tenantId } },
      select: { pdfBase64: true },
    });
    if (!item) throw new NotFoundException('Položka nenalezena');
    return item.pdfBase64;
  }

  async saveBatchInvoices(
    user: AuthUser,
    batchId: string,
    approvedItems: Array<{ itemId: string; corrections?: Record<string, any> }>,
  ) {
    const batch = await this.prisma.aiExtractionBatch.findFirst({
      where: { id: batchId, tenantId: user.tenantId, status: 'completed' },
    });
    if (!batch) throw new NotFoundException('Batch nenalezen nebo není dokončen');

    const results: Array<{ itemId: string; success: boolean; invoiceId?: string; error?: string }> = [];

    for (const { itemId, corrections } of approvedItems) {
      try {
        const item = await this.prisma.aiExtractionBatchItem.findFirst({
          where: { id: itemId, batchId: batch.id, status: 'completed' },
        });
        if (!item || !item.extractedData) {
          results.push({ itemId, success: false, error: 'Položka nenalezena nebo nemá data' });
          continue;
        }

        const extracted = item.extractedData as Record<string, any>;
        const data = { ...extracted, ...corrections };

        const invoice = await this.prisma.invoice.create({
          data: {
            tenantId: user.tenantId,
            number: data.number || `BATCH-${Date.now()}`,
            type: 'received',
            supplierName: data.supplierName || undefined,
            supplierIco: data.supplierIco || undefined,
            supplierDic: data.supplierDic || undefined,
            buyerName: data.buyerName || undefined,
            buyerIco: data.buyerIco || undefined,
            buyerDic: data.buyerDic || undefined,
            description: data.description || undefined,
            amountBase: Number(data.amountBase) || 0,
            vatRate: Number(data.vatRate) || 0,
            vatAmount: Number(data.vatAmount) || 0,
            amountTotal: Number(data.amountTotal) || 0,
            issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
            duzp: data.duzp ? new Date(data.duzp) : undefined,
            dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
            variableSymbol: data.variableSymbol || undefined,
            constantSymbol: data.constantSymbol || undefined,
            specificSymbol: data.specificSymbol || undefined,
            paymentIban: data.paymentIban || undefined,
            currency: data.currency || 'CZK',
          },
        });

        await this.prisma.aiExtractionBatchItem.update({
          where: { id: itemId },
          data: { invoiceId: invoice.id },
        });

        // Save extraction pattern for few-shot learning
        try {
          await this.invoicesService.saveExtractionPattern(user, invoice.id, extracted);
        } catch {
          // Non-critical
        }

        results.push({ itemId, success: true, invoiceId: invoice.id });
      } catch (e: any) {
        results.push({ itemId, success: false, error: e.message });
      }
    }

    return {
      saved: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  async listBatches(user: AuthUser) {
    return this.prisma.aiExtractionBatch.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { items: true } },
      },
    });
  }

  /** Called by CronService to poll pending batches */
  async pollPendingBatches() {
    const pending = await this.prisma.aiExtractionBatch.findMany({
      where: { status: { in: ['submitted', 'processing'] } },
    });

    for (const batch of pending) {
      try {
        await this.checkBatch(batch.tenantId, batch.id);
      } catch (e: any) {
        this.logger.error(`Batch poll failed for ${batch.id}: ${e.message}`);
      }
    }

    if (pending.length > 0) {
      this.logger.log(`Polled ${pending.length} pending batches`);
    }
  }
}
