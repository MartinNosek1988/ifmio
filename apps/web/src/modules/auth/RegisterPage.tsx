import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../core/api/client';
import { ArrowRight, ArrowLeft, LayoutGrid, FileText, Home, MapPin, Check } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import {
  INITIAL_WIZARD_STATE,
  getWizardSteps,
  type RegisterWizardState,
  type StepSetter,
} from './register.types';
import {
  SubjectTypeStep,
  OrganizationStep,
  PersonalStep,
  SupplierStep,
  PropertyStep,
  UnitStep,
  AddressStep,
  RegionStep,
  DoneStep,
} from './components/register';

const STEP_ICONS = { LayoutGrid, FileText, Home, MapPin, Check } as const;

export default function RegisterPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState<RegisterWizardState>(INITIAL_WIZARD_STATE);
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const steps = getWizardSteps(form.subjectType);
  const currentStepConfig = steps[currentStep];
  const isLastInputStep = currentStep === steps.length - 2;
  const isDoneStep = currentStepConfig?.id === 'done';

  const set: StepSetter = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key as string]) return prev;
      const { [key as string]: _, ...rest } = prev;
      return rest;
    });
  };

  function validateCurrentStep(): boolean {
    const e: Record<string, string> = {};
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    switch (currentStepConfig?.id) {
      case 'subject-type':
        if (!form.subjectType) e.subjectType = t('register.error.selectType');
        break;
      case 'organization':
        if (!form.tenantName.trim()) e.tenantName = t('register.error.required');
        if (!form.name.trim()) e.name = t('register.error.required');
        if (!form.email.trim()) e.email = t('register.error.required');
        else if (!emailRe.test(form.email)) e.email = t('register.error.emailFormat');
        if (!form.password || form.password.length < 8) e.password = t('register.error.passwordMin');
        break;
      case 'personal':
        if (!form.name.trim()) e.name = t('register.error.required');
        if (!form.email.trim()) e.email = t('register.error.required');
        else if (!emailRe.test(form.email)) e.email = t('register.error.emailFormat');
        if (!form.password || form.password.length < 8) e.password = t('register.error.passwordMin');
        break;
      case 'supplier':
        if (!form.supplierCompanyName.trim()) e.supplierCompanyName = t('register.error.required');
        if (!form.name.trim()) e.name = t('register.error.required');
        if (!form.email.trim()) e.email = t('register.error.required');
        else if (!emailRe.test(form.email)) e.email = t('register.error.emailFormat');
        if (!form.password || form.password.length < 8) e.password = t('register.error.passwordMin');
        if (form.supplierCategories.length === 0) e.supplierCategories = t('register.error.selectCategory');
        break;
      case 'property':
        if (!form.propertyAddress.trim()) e.propertyAddress = t('register.error.required');
        if (!form.propertyCity.trim()) e.propertyCity = t('register.error.required');
        break;
      case 'unit':
        if (!form.joinCode && !form.unitAddress.trim()) e.unitAddress = t('register.error.required');
        break;
      case 'address':
        if (!form.tenantJoinCode && !form.residenceAddress.trim()) e.residenceAddress = t('register.error.required');
        break;
      case 'region':
        if (!form.supplierRegionCity.trim()) e.supplierRegionCity = t('register.error.required');
        break;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!form.subjectType) return;
    if (!form.consentAccepted) {
      setError(t('register.error.consentRequired'));
      return;
    }

    const body: Record<string, unknown> = {
      subjectType: form.subjectType,
      name: form.name,
      email: form.email,
      password: form.password,
      phone: form.phone || undefined,
    };

    if (['svj_bd', 'spravce'].includes(form.subjectType)) {
      body.tenantName = form.tenantName;
      body.companyNumber = form.ico || undefined;
      body.vatNumber = form.dic || undefined;
    } else if (form.subjectType === 'dodavatel') {
      body.tenantName = form.supplierCompanyName || form.name;
      body.companyNumber = form.ico || undefined;
      body.vatNumber = form.dic || undefined;
      body.supplierCompanyName = form.supplierCompanyName;
      body.supplierIsOsvc = form.supplierIsOsvc;
      body.supplierCategories = form.supplierCategories;
      body.supplierDescription = form.supplierDescription || undefined;
      body.supplierRegionCity = form.supplierRegionCity;
      body.supplierRegionRadius = form.supplierRegionRadius;
      body.supplierRegionDistricts = form.supplierRegionDistricts;
    } else {
      body.tenantName = form.name;
    }

    setError('');
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/register', body);
      const { accessToken, refreshToken, user } = res.data;
      sessionStorage.setItem('ifmio:access_token', accessToken);
      sessionStorage.setItem('ifmio:refresh_token', refreshToken);
      sessionStorage.setItem('ifmio:user', JSON.stringify(user));
      setCurrentStep(steps.length - 1);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : t('register.error.submitFailed'));
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    if (!validateCurrentStep()) return;
    if (isLastInputStep) {
      handleSubmit();
      return;
    }
    setCurrentStep((s) => s + 1);
  }

  function handleBack() {
    if (currentStep === 0) return;
    if (currentStep === 1) {
      setForm((p) => ({ ...p, subjectType: null }));
    }
    setErrors({});
    setError('');
    setCurrentStep((s) => s - 1);
  }

  function renderStep() {
    switch (currentStepConfig?.id) {
      case 'subject-type':
        return <SubjectTypeStep value={form.subjectType} onChange={(v) => set('subjectType', v)} />;
      case 'organization':
        return <OrganizationStep form={form} set={set} errors={errors} />;
      case 'personal':
        return <PersonalStep form={form} set={set} errors={errors} />;
      case 'supplier':
        return <SupplierStep form={form} set={set} errors={errors} />;
      case 'property':
        return <PropertyStep form={form} set={set} errors={errors} />;
      case 'unit':
        return <UnitStep form={form} set={set} errors={errors} />;
      case 'address':
        return <AddressStep form={form} set={set} errors={errors} />;
      case 'region':
        return <RegionStep form={form} set={set} errors={errors} />;
      case 'done':
        return form.subjectType ? <DoneStep subjectType={form.subjectType} /> : null;
      default:
        return null;
    }
  }

  return (
    <AuthLayout
      headline={t('auth.layout.registerHeadline')}
      subtext={t('auth.layout.registerSubtext')}
      features={[
        { text: t('auth.layout.regFeature1') },
        { text: t('auth.layout.regFeature2') },
        { text: t('auth.layout.regFeature3') },
      ]}
    >
      {/* Stepper */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 28, flexWrap: 'wrap' }}>
        {steps.map((step, i) => {
          const Icon = STEP_ICONS[step.icon as keyof typeof STEP_ICONS] ?? Check;
          const isActive = i === currentStep;
          const isDone = i < currentStep;
          return (
            <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isActive ? '#0F6E56' : isDone ? '#E1F5EE' : '#F3F4F6',
                  color: isActive ? '#fff' : isDone ? '#0F6E56' : '#9CA3AF',
                }}
              >
                {isDone ? <Check size={16} /> : <Icon size={16} />}
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: isActive ? '#0F6E56' : '#9CA3AF',
                  fontWeight: isActive ? 600 : 400,
                  whiteSpace: 'nowrap',
                }}
              >
                {t(step.label)}
              </span>
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', color: '#DC2626', fontSize: '.85rem', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {renderStep()}

      {/* Consent on last input step */}
      {isLastInputStep && (
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', marginTop: 16 }}>
          <input
            type="checkbox"
            checked={form.consentAccepted}
            onChange={(e) => set('consentAccepted', e.target.checked)}
            style={{ marginTop: 2, accentColor: '#0F6E56' }}
          />
          <span style={{ fontSize: '13px', color: '#6B7280' }}>
            {t('register.consent')}{' '}
            <Link to="/terms" style={{ color: '#0F6E56', textDecoration: 'none' }}>{t('register.terms')}</Link>{' '}
            {t('register.and')}{' '}
            <Link to="/privacy" style={{ color: '#0F6E56', textDecoration: 'none' }}>{t('register.privacy')}</Link>
          </span>
        </label>
      )}

      {/* Navigation */}
      {!isDoneStep && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
          {currentStep > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 18px',
                background: '#F3F4F6',
                color: '#374151',
                border: 'none',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: '.9rem',
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <ArrowLeft size={16} /> {t('register.back')}
            </button>
          ) : (
            <div />
          )}
          {currentStep === 0 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!form.subjectType}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 18px',
                background: form.subjectType ? '#0F6E56' : '#D1D5DB',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: '.9rem',
                cursor: form.subjectType ? 'pointer' : 'not-allowed',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {t('register.continue')}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={loading || (isLastInputStep && !form.consentAccepted)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 18px',
                background: loading || (isLastInputStep && !form.consentAccepted) ? '#D1D5DB' : '#0F6E56',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: '.9rem',
                cursor: loading || (isLastInputStep && !form.consentAccepted) ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {isLastInputStep
                ? loading
                  ? t('register.submitting')
                  : t('register.submit')
                : t('register.continue')}
              {!isLastInputStep && <ArrowRight size={16} />}
            </button>
          )}
        </div>
      )}

      {!isDoneStep && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <span style={{ color: '#6B7280', fontSize: '.85rem' }}>
            {t('register.hasAccount')}{' '}
            <Link to="/login" style={{ color: '#0F6E56', textDecoration: 'none', fontWeight: 600 }}>
              {t('register.signIn')}
            </Link>
          </span>
        </div>
      )}
    </AuthLayout>
  );
}
