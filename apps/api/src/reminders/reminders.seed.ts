export const DEFAULT_REMINDER_TEMPLATES = [
  {
    level:    'first' as const,
    name:     '1. upomínka',
    subject:  'Upomínka platby — {{amount}} Kč',
    dueDays:  14,
    isDefault: true,
    body: `Vážený/á {{firstName}} {{lastName}},

dovolujeme si Vás upozornit, že na Vašem účtu evidujeme
nedoplatek ve výši {{amount}} Kč.

Prosíme o úhradu do {{dueDate}}.

V případě, že jste platbu již provedl/a, tuto zprávu ignorujte.

S pozdravem,
{{tenantName}}`,
  },
  {
    level:    'second' as const,
    name:     '2. upomínka',
    subject:  'Druhá upomínka platby — {{amount}} Kč',
    dueDays:  7,
    isDefault: true,
    body: `Vážený/á {{firstName}} {{lastName}},

přes naši předchozí upomínku evidujeme dosud neuhrazený
nedoplatek ve výši {{amount}} Kč.

Žádáme Vás o neprodlenou úhradu nejpozději do {{dueDate}}.

Upozorňujeme, že v případě neuhrazení bude pohledávka
předána k dalšímu řešení.

S pozdravem,
{{tenantName}}`,
  },
  {
    level:    'third' as const,
    name:     '3. upomínka (předžalobní)',
    subject:  'Předžalobní upomínka — {{amount}} Kč',
    dueDays:  7,
    isDefault: true,
    body: `Vážený/á {{firstName}} {{lastName}},

tímto Vás vyzýváme k úhradě dlužné částky {{amount}} Kč
v poslední lhůtě do {{dueDate}}.

Po marném uplynutí této lhůty budeme nuceni věc předat
právnímu zástupci k vymáhání pohledávky soudní cestou,
přičemž veškeré náklady řízení půjdou k Vaší tíži.

S pozdravem,
{{tenantName}}`,
  },
]
