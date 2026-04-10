import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

export interface ExtractedExpenseData {
  vendor?: string;
  vendorIco?: string;
  amount?: number;
  vatRate?: number;
  vatAmount?: number;
  amountTotal?: number;
  receiptDate?: string;
  receiptNumber?: string;
  description?: string;
  category?: string;
  confidence: number;
}

@Injectable()
export class ExpenseAiService {
  private readonly logger = new Logger(ExpenseAiService.name);
  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  async extractFromImage(imageBase64: string, mimeType: string): Promise<ExtractedExpenseData> {
    const prompt = `Analyzuj tento doklad/paragon a extrahuj data ve formátu JSON.
Vrať POUZE platný JSON bez markdown backticks.

Požadovaná pole:
- vendor: název obchodu nebo dodavatele (string)
- vendorIco: IČO dodavatele pokud je uvedeno (string nebo null)
- amount: základ bez DPH v Kč (number nebo null)
- vatRate: sazba DPH v % (0, 12, nebo 21, nebo null)
- vatAmount: výše DPH v Kč (number nebo null)
- amountTotal: celková částka k úhradě v Kč (number) — POVINNÉ
- receiptDate: datum dokladu ve formátu YYYY-MM-DD (string nebo null)
- receiptNumber: číslo dokladu/paragonu (string nebo null)
- description: stručný popis co bylo zakoupeno (string)
- category: odhadovaná kategorie z: material, fuel, transport, tools, services, accommodation, food, other
- confidence: tvá jistota 0.0–1.0`;

    try {
      const response = await this.getClient().messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: imageBase64.replace(/^data:[^;]+;base64,/, '') },
            },
            { type: 'text', text: prompt },
          ],
        }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
      const clean = text.replace(/```json\n?|\n?```/g, '').trim();
      const data = JSON.parse(clean);

      return {
        vendor: data.vendor ?? undefined,
        vendorIco: data.vendorIco ?? undefined,
        amount: data.amount ?? undefined,
        vatRate: data.vatRate ?? undefined,
        vatAmount: data.vatAmount ?? undefined,
        amountTotal: data.amountTotal ?? 0,
        receiptDate: data.receiptDate ?? undefined,
        receiptNumber: data.receiptNumber ?? undefined,
        description: data.description ?? undefined,
        category: data.category ?? undefined,
        confidence: data.confidence ?? 0.5,
      };
    } catch (err) {
      this.logger.error('Expense AI extraction failed', err);
      return { confidence: 0, amountTotal: 0 };
    }
  }
}
