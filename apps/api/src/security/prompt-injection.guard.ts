/**
 * Lightweight prompt injection heuristics.
 *
 * Detects user messages that attempt to:
 * - Extract system prompt or developer instructions
 * - Exfiltrate raw tool output / JSON / internal IDs
 * - Access data outside the user's scope
 * - Execute or generate executable code
 * - Bypass security instructions ("ignore all previous instructions")
 *
 * Returns a refusal reason if the input is suspicious, or null if clean.
 * False positives are acceptable (over-refuse > under-refuse for security).
 */

interface InjectionCheckResult {
  blocked: boolean;
  reason: string | null;
  category: 'system_prompt_extraction' | 'data_exfiltration' | 'scope_bypass' | 'instruction_override' | 'code_execution' | null;
}

// ─── PATTERN GROUPS ─────────────────────────────────────────────

const SYSTEM_PROMPT_PATTERNS = [
  /(?:ukaž|zobraz|vypiš|přečti|dump|reveal|show|print|display|output|tell me)\s+(?:me\s+)?(?:your\s+)?(?:systém(?:ový|ové)?|system)\s*(?:prompt|instrukce|instructions|message|pravidla)/i,
  /(?:what|jaké|jaký)\s+(?:are|is|jsou|je)\s+(?:your|tvoje|tvé)\s+(?:system|systém)\s*(?:prompt|instrukce|instructions)/i,
  /(?:show|ukaž|reveal)\s+(?:me\s+)?(?:your\s+)?(?:system\s+)?prompt/i,
  /developer\s*(?:message|instructions|prompt|mode)/i,
  /(?:repeat|opakuj|echo)\s+(?:everything|all|vše|všechno)\s+(?:above|before|předchozí|výše)/i,
  /(?:ignore|ignoruj).{0,30}(?:previous|předchozí|above|výše).{0,30}(?:instructions?|instrukce|pravidla)/i,
];

const DATA_EXFILTRATION_PATTERNS = [
  /(?:dump|vypiš|show|zobraz)\s+(?:all|raw|complete|celý|celou|vše|surový?)\s+(?:json|data|database|databáz|db|output|výstup)/i,
  /(?:return|vrať|send|pošli)\s+(?:raw|surový?|unfiltered|nefiltrovaný?)\s+(?:json|data|tool|result|výsledek)/i,
  /(?:list|vypiš|show)\s+(?:me\s+)?(?:all|všechny?)\s+(?:api\s*keys?|secrets?|credentials?|passwords?|tokens?|tajemství|hesla?|klíče?)/i,
  /(?:show|list|dump|find|zobraz|vypiš)\s+(?:me\s+)?(?:all\s+)?(?:environment|env)\s*(?:variables?|proměnné?)/i,
  /(?:dump|show|list)\s+(?:all\s+)?(?:raw\s+)?(?:json|data)\s+(?:from|z)\s+(?:database|db|databáz)/i,
  /(?:\.env|process\.env|config\.get)/i,
  /\b(?:api[_\s]?keys?|secrets?|credentials?)\b.{0,15}\b(?:show|list|dump|find|get)\b/i,
];

const SCOPE_BYPASS_PATTERNS = [
  /(?:show|zobraz|ukaž|list|vypiš)\s+(?:tickets?|požadavk[yůe]|data)\s+(?:from|z|for|pro)\s+(?:all|other|jiných?|všech|cizích?)\s+(?:tenants?|properties|nemovitost|tenant)/i,
  /(?:switch|změň|přepni)\s+(?:to|na)\s+(?:another|jiný|different|cizí)\s+(?:tenant|property|account|účet)/i,
  /(?:bypass|obejdi|skip|přeskoč)\s+(?:tenant|scope|authorization|auth|autorizaci)/i,
  /(?:with|s)\s+(?:different|jiným?)\s+(?:tenantId|propertyId)/i,
];

const INSTRUCTION_OVERRIDE_PATTERNS = [
  /(?:ignore|ignoruj|forget|zapomeň|disregard|přestaň dodržovat)\s+(?:all|your|tvoje|tvé|the|ty|na)?\s*(?:previous|předchozí|above|safety|security|bezpečnostní|všechna|všechny)?\s*(?:instructions?|instrukce|rules?|pravidla|restrictions?|omezení|guidelines)/i,
  /(?:zapomeň|forget)\s+(?:na\s+)?(?:všechna?|all)\s+(?:pravidla|rules|instrukce|omezení)/i,
  /(?:you are|jsi)\s+(?:now|teď|nyní)\s+(?:a different|jiný|nový)\s+(?:AI|assistant|asistent|bot)/i,
  /(?:pretend|předstírej|act as|chovej se jako)\s+(?:you|ty)?\s*(?:have|máš|don't have|nemáš)\s+(?:no|žádné?)\s*(?:restrictions?|omezení|rules?|pravidla)/i,
  /odpovídej\s+bez\s+(?:omezení|pravidel|restrikcí)/i,
  /(?:\bDAN\b(?:\s+mode)?|jailbreak|escape\s+mode)/i,
];

const CODE_EXECUTION_PATTERNS = [
  /(?:execute|spusť|run|vykonej)\s+(?:this|tento|following|následující)\s+(?:code|kód|sql|query|script|příkaz)/i,
  /(?:sql|select|insert|update|delete|drop|alter)\s+(?:from|into|table|where)/i,
  /(?:\beval\s*\(|\bexec\s*\(|\bsystem\s*\(|\bos\.popen\s*\(|\bsubprocess\.\w+\s*\(|\bchild_process\b)/i,
];

// ─── MAIN CHECK ─────────────────────────────────────────────────

export function checkPromptInjection(input: string): InjectionCheckResult {
  const clean: InjectionCheckResult = { blocked: false, reason: null, category: null };

  if (!input || input.length < 5) return clean;

  for (const pattern of INSTRUCTION_OVERRIDE_PATTERNS) {
    if (pattern.test(input)) {
      return {
        blocked: true,
        reason: 'Nemohu ignorovat své bezpečnostní instrukce. Jak vám mohu jinak pomoci?',
        category: 'instruction_override',
      };
    }
  }

  for (const pattern of SYSTEM_PROMPT_PATTERNS) {
    if (pattern.test(input)) {
      return {
        blocked: true,
        reason: 'Nemohu zobrazit systémové instrukce ani interní konfiguraci. Mohu vám pomoci s provozními záležitostmi.',
        category: 'system_prompt_extraction',
      };
    }
  }

  for (const pattern of DATA_EXFILTRATION_PATTERNS) {
    if (pattern.test(input)) {
      return {
        blocked: true,
        reason: 'Nemohu zobrazit surová data, API klíče ani systémovou konfiguraci. Mohu vám ukázat přehledy a statistiky.',
        category: 'data_exfiltration',
      };
    }
  }

  for (const pattern of SCOPE_BYPASS_PATTERNS) {
    if (pattern.test(input)) {
      return {
        blocked: true,
        reason: 'Nemám přístup k datům jiných organizací. Mohu zobrazit pouze data ve vašem rozsahu oprávnění.',
        category: 'scope_bypass',
      };
    }
  }

  for (const pattern of CODE_EXECUTION_PATTERNS) {
    if (pattern.test(input)) {
      return {
        blocked: true,
        reason: 'Nemohu spouštět kód ani databázové příkazy. Mohu vám pomoci s provozními dotazy.',
        category: 'code_execution',
      };
    }
  }

  return clean;
}
