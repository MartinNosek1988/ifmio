export interface DefaultTemplate {
  code: string
  label: string
  subject: string
  body: string
  placeholders: string[]
}

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    code: 'welcome',
    label: 'Uvítací email',
    subject: 'Vítejte v {{tenantName}}',
    body: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#374151">
<div style="background:#1e1b4b;padding:24px;border-radius:8px 8px 0 0"><h1 style="color:#fff;margin:0;font-size:24px">ifmio</h1></div>
<div style="border:1px solid #e5e7eb;border-top:none;padding:32px;border-radius:0 0 8px 8px">
<h2 style="color:#111827">Vítejte, {{name}}!</h2>
<p>Byl vám vytvořen přístup do systému {{tenantName}}.</p>
<a href="{{loginUrl}}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0">Přihlásit se</a>
<p style="color:#6b7280;font-size:13px;margin-top:24px">Pokud jste tento email neočekávali, ignorujte jej.</p>
</div></div>`,
    placeholders: ['name', 'tenantName', 'loginUrl'],
  },
  {
    code: 'password_reset',
    label: 'Obnova hesla',
    subject: 'Obnova hesla — ifmio',
    body: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#374151">
<div style="background:#1e1b4b;padding:24px;border-radius:8px 8px 0 0"><h1 style="color:#fff;margin:0;font-size:24px">ifmio</h1></div>
<div style="border:1px solid #e5e7eb;border-top:none;padding:32px;border-radius:0 0 8px 8px">
<h2>Obnova hesla</h2>
<p>Obdrželi jsme žádost o obnovu hesla pro váš účet.</p>
<a href="{{resetUrl}}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0">Nastavit nové heslo</a>
<p style="color:#6b7280;font-size:13px">Odkaz je platný 1 hodinu. Pokud jste o obnovu nežádali, ignorujte tento email.</p>
</div></div>`,
    placeholders: ['resetUrl'],
  },
  {
    code: 'tenant_invitation',
    label: 'Pozvánka do organizace',
    subject: 'Pozvánka do {{tenantName}} — ifmio',
    body: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
<div style="background:#1e1b4b;padding:20px 24px;border-radius:8px 8px 0 0"><h1 style="color:#fff;margin:0;font-size:20px">ifmio</h1></div>
<div style="border:1px solid #e5e7eb;border-top:none;padding:32px;border-radius:0 0 8px 8px">
<h2>Byli jste pozváni do {{tenantName}}</h2>
<p>Dobrý den, {{name}},</p>
<p>správce nemovitosti vás zve do klientského portálu ifmio.</p>
<a href="{{link}}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:16px 0">Přijmout pozvánku a nastavit heslo</a>
<p style="color:#6b7280;font-size:12px">Odkaz je platný 7 dní.</p>
</div></div>`,
    placeholders: ['tenantName', 'name', 'link'],
  },
  {
    code: 'portal_invitation',
    label: 'Pozvánka do portálu vlastníka',
    subject: 'Přístup do portálu vlastníka — {{propertyName}}',
    body: `<p>Dobrý den, {{name}},</p>
<p>byl Vám zřízen přístup do portálu vlastníka pro {{propertyName}}.</p>
<p><a href="{{portalUrl}}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Otevřít portál vlastníka</a></p>
<p style="color:#888;font-size:13px">Tento odkaz je určen výhradně pro Vás. Nesdílejte jej s nikým.</p>
<p>S pozdravem,<br>správa nemovitosti</p>`,
    placeholders: ['name', 'propertyName', 'portalUrl'],
  },
  {
    code: 'esign_request',
    label: 'Žádost o elektronický podpis',
    subject: '{{documentTitle}} — žádost o elektronický podpis',
    body: `<p>Dobrý den, {{name}},</p>
<p>{{message}}</p>
<p>Dokument: <strong>{{documentTitle}}</strong></p>
<p><a href="{{signUrl}}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Podepsat dokument</a></p>
<p style="color:#888;font-size:13px">Platnost do: {{expiresAt}}</p>`,
    placeholders: ['name', 'documentTitle', 'message', 'signUrl', 'expiresAt'],
  },
  {
    code: 'per_rollam_voting',
    label: 'Hlasování per rollam',
    subject: 'Hlasování per rollam — {{votingTitle}}',
    body: `<p>Dobrý den, {{partyDisplayName}},</p>
<p>bylo zahájeno hlasování per rollam <strong>{{votingTitle}}</strong>.</p>
<p>Počet bodů k hlasování: <strong>{{itemCount}}</strong></p>
<p>Termín pro hlasování: <strong>{{deadline}}</strong></p>
<p><a href="{{voteUrl}}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Hlasovat</a></p>
<p style="color:#888;font-size:13px">Pokud jste tento email neočekávali, kontaktujte správce nemovitosti.</p>`,
    placeholders: ['partyDisplayName', 'votingTitle', 'itemCount', 'deadline', 'voteUrl'],
  },
]
