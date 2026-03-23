import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { DEMO_FORM } from '../../../data/landing-content'

const schema = z.object({
  name: z.string().min(1, 'Jméno je povinné'),
  email: z.string().email('Neplatný e-mail'),
  company: z.string().min(1, 'Název společnosti je povinný'),
  units: z.string().min(1, 'Vyberte počet jednotek'),
  phone: z.string().optional(),
  message: z.string().max(500, 'Max 500 znaků').optional(),
  gdpr: z.literal(true, { message: 'Souhlas je povinný' }),
})

type FormData = z.infer<typeof schema>

export function DemoForm() {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting, isValid } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
  })

  const onSubmit = async (data: FormData) => {
    setError(false)
    try {
      // Placeholder — will POST to /api/v1/demo when API exists
      console.log('Demo form submitted:', data)
      await new Promise(r => setTimeout(r, 1000))
      setSubmitted(true)
    } catch {
      setError(true)
    }
  }

  if (submitted) {
    return (
      <section className="section" id="demo" aria-label="Demo formulář">
        <div className="container demo-form__success">
          <div className="demo-form__success-icon">✅</div>
          <h2>{DEMO_FORM.successMessage}</h2>
        </div>
      </section>
    )
  }

  const inputClass = (field: keyof FormData) => `demo-form__input${errors[field] ? ' demo-form__input--error' : ''}`

  return (
    <section className="section" id="demo" aria-label="Demo formulář">
      <div className="container demo-form__layout">
        <div className="demo-form__content">
          <h2 className="section__headline">{DEMO_FORM.headline}</h2>
          <p className="section__subhead">{DEMO_FORM.subhead}</p>

          {error && <div className="demo-form__error-banner">{DEMO_FORM.errorMessage}</div>}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="demo-form__row">
              <div className="demo-form__field">
                <label htmlFor="demo-name">Jméno a příjmení *</label>
                <input id="demo-name" type="text" {...register('name')} className={inputClass('name')} />
                {errors.name && <span className="demo-form__field-error">{errors.name.message}</span>}
              </div>
              <div className="demo-form__field">
                <label htmlFor="demo-email">E-mail *</label>
                <input id="demo-email" type="email" {...register('email')} className={inputClass('email')} />
                {errors.email && <span className="demo-form__field-error">{errors.email.message}</span>}
              </div>
            </div>

            <div className="demo-form__row">
              <div className="demo-form__field">
                <label htmlFor="demo-company">Společnost *</label>
                <input id="demo-company" type="text" {...register('company')} className={inputClass('company')} />
                {errors.company && <span className="demo-form__field-error">{errors.company.message}</span>}
              </div>
              <div className="demo-form__field">
                <label htmlFor="demo-units">Počet jednotek *</label>
                <select id="demo-units" {...register('units')} className={inputClass('units')}>
                  <option value="">Vyberte...</option>
                  {DEMO_FORM.unitOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                {errors.units && <span className="demo-form__field-error">{errors.units.message}</span>}
              </div>
            </div>

            <div className="demo-form__field">
              <label htmlFor="demo-phone">Telefon</label>
              <input id="demo-phone" type="tel" {...register('phone')} className="demo-form__input" />
            </div>

            <div className="demo-form__field">
              <label htmlFor="demo-message">Zpráva</label>
              <textarea id="demo-message" rows={3} {...register('message')} className="demo-form__input" />
              {errors.message && <span className="demo-form__field-error">{errors.message.message}</span>}
            </div>

            <label className="demo-form__gdpr">
              <input type="checkbox" {...register('gdpr')} />
              <span>{DEMO_FORM.gdprCheckbox}</span>
            </label>
            {errors.gdpr && <span className="demo-form__field-error">{errors.gdpr.message}</span>}

            <button type="submit" className="btn btn--primary btn--lg demo-form__submit" disabled={isSubmitting || !isValid}>
              {isSubmitting ? DEMO_FORM.submitLoading : DEMO_FORM.submitButton}
            </button>
            <p className="demo-form__reassurance">{DEMO_FORM.reassurance}</p>
          </form>
        </div>

        <aside className="demo-form__sidebar">
          <h3>Co získáte</h3>
          <ul>
            {DEMO_FORM.benefitSidebar.map(b => (
              <li key={b}>✅ {b}</li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  )
}
