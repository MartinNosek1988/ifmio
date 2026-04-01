export interface ValidationRule {
  validate: (value: unknown) => boolean
  message: string
}

export const validators = {
  required: (msg = 'Toto pole je povinné'): ValidationRule => ({
    validate: (v) => v != null && String(v).trim().length > 0,
    message: msg,
  }),

  minLength: (min: number, msg?: string): ValidationRule => ({
    validate: (v) => typeof v === 'string' && v.trim().length >= min,
    message: msg ?? `Minimální délka je ${min} znaků`,
  }),

  maxLength: (max: number, msg?: string): ValidationRule => ({
    validate: (v) => typeof v !== 'string' || v.length <= max,
    message: msg ?? `Maximální délka je ${max} znaků`,
  }),

  email: (msg = 'Zadejte platný email'): ValidationRule => ({
    validate: (v) => {
      if (!v || String(v).trim() === '') return true // optional by default
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v))
    },
    message: msg,
  }),

  phone: (msg = 'Zadejte platné telefonní číslo'): ValidationRule => ({
    validate: (v) => {
      if (!v || String(v).trim() === '') return true
      return /^(\+?\d{1,4}\s?)?\d{7,15}$/.test(String(v).replace(/\s/g, ''))
    },
    message: msg,
  }),

  ico: (msg = 'IČO musí mít přesně 8 číslic'): ValidationRule => ({
    validate: (v) => {
      if (!v || String(v).trim() === '') return true
      return /^\d{8}$/.test(String(v).trim())
    },
    message: msg,
  }),

  dic: (msg = 'DIČ musí začínat CZ a mít 8–10 číslic'): ValidationRule => ({
    validate: (v) => {
      if (!v || String(v).trim() === '') return true
      return /^CZ\d{8,10}$/.test(String(v).trim())
    },
    message: msg,
  }),

  postalCode: (msg = 'PSČ musí mít 5 číslic'): ValidationRule => ({
    validate: (v) => {
      if (!v || String(v).trim() === '') return true
      return /^\d{3}\s?\d{2}$/.test(String(v).trim())
    },
    message: msg,
  }),

  numeric: (msg = 'Zadejte číslo'): ValidationRule => ({
    validate: (v) => {
      if (v == null || String(v).trim() === '') return true
      return !isNaN(Number(v))
    },
    message: msg,
  }),

  min: (minVal: number, msg?: string): ValidationRule => ({
    validate: (v) => {
      if (v == null || String(v).trim() === '') return true
      return Number(v) >= minVal
    },
    message: msg ?? `Minimální hodnota je ${minVal}`,
  }),

  max: (maxVal: number, msg?: string): ValidationRule => ({
    validate: (v) => {
      if (v == null || String(v).trim() === '') return true
      return Number(v) <= maxVal
    },
    message: msg ?? `Maximální hodnota je ${maxVal}`,
  }),

  variableSymbol: (msg = 'Variabilní symbol může mít max 10 číslic'): ValidationRule => ({
    validate: (v) => {
      if (!v || String(v).trim() === '') return true
      return /^\d{1,10}$/.test(String(v).trim())
    },
    message: msg,
  }),

  bankAccount: (msg = 'Zadejte platné číslo účtu'): ValidationRule => ({
    validate: (v) => {
      if (!v || String(v).trim() === '') return true
      // Czech format: optional prefix-number/bankCode
      return /^(\d{1,6}-)?\d{1,10}\/\d{4}$/.test(String(v).trim())
    },
    message: msg,
  }),

  iban: (msg = 'Zadejte platný IBAN'): ValidationRule => ({
    validate: (v) => {
      if (!v || String(v).trim() === '') return true
      return /^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/.test(String(v).replace(/\s/g, '').toUpperCase())
    },
    message: msg,
  }),
}
