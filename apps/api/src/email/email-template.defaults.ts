export interface DefaultTemplate {
  code: string
  label: string
  subject: string
  body: string
  placeholders: string[]
}

const FONT_HEADING = "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
const FONT_BODY = "'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"

function wrap(content: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#F9FAFB;">
<tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
<tr><td style="padding:24px 32px;border-bottom:1px solid #E5E7EB;">
<span style="font-family:${FONT_HEADING};font-size:28px;font-weight:800;color:#0D9488;letter-spacing:-0.5px;">ifmio</span>
</td></tr>
<tr><td style="padding:32px;font-family:${FONT_BODY};font-size:15px;color:#374151;line-height:1.6;">
${content}
</td></tr>
<tr><td style="padding:24px 32px;background-color:#F9FAFB;border-top:1px solid #E5E7EB;">
<p style="margin:0;font-size:12px;color:#9CA3AF;">ifmio — Moderní správa nemovitostí · <a href="https://ifmio.com" style="color:#0D9488;text-decoration:none;">ifmio.com</a></p>
<p style="margin:8px 0 0;font-size:12px;color:#9CA3AF;">Tento email byl odeslán automaticky, neodpovídejte na něj.</p>
</td></tr>
</table>
</td></tr>
</table>`
}

function btn(text: string, url: string): string {
  return `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;">
<tr><td align="center" style="background-color:#0D9488;border-radius:8px;">
<a href="${url}" style="display:inline-block;padding:12px 32px;background-color:#0D9488;color:#FFFFFF;font-family:${FONT_BODY};font-size:16px;font-weight:600;text-decoration:none;border-radius:8px;line-height:1;">${text}</a>
</td></tr>
</table>`
}

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    code: 'welcome',
    label: 'Uvítací email',
    subject: 'Vítejte v {{tenantName}}',
    body: wrap(`
<h1 style="margin:0 0 16px;font-family:${FONT_HEADING};font-size:22px;font-weight:700;color:#0C1222;">Vítejte, {{name}}!</h1>
<p style="margin:0 0 16px;">Byl vám vytvořen přístup do systému <strong>{{tenantName}}</strong>.</p>
${btn('Přihlásit se', '{{loginUrl}}')}
<p style="margin:0;font-size:13px;color:#9CA3AF;">Pokud jste tento email neočekávali, ignorujte jej.</p>
`),
    placeholders: ['name', 'tenantName', 'loginUrl'],
  },
  {
    code: 'password_reset',
    label: 'Obnova hesla',
    subject: 'Obnova hesla — ifmio',
    body: wrap(`
<h1 style="margin:0 0 16px;font-family:${FONT_HEADING};font-size:22px;font-weight:700;color:#0C1222;">Obnova hesla</h1>
<p style="margin:0 0 16px;">Obdrželi jsme žádost o obnovu hesla pro váš účet.</p>
${btn('Nastavit nové heslo', '{{resetUrl}}')}
<p style="margin:0 0 8px;font-size:13px;color:#9CA3AF;">Odkaz je platný 1 hodinu.</p>
<p style="margin:0;font-size:13px;color:#9CA3AF;">Pokud jste o obnovu nežádali, ignorujte tento email.</p>
`),
    placeholders: ['resetUrl'],
  },
  {
    code: 'tenant_invitation',
    label: 'Pozvánka do organizace',
    subject: 'Pozvánka do {{tenantName}} — ifmio',
    body: wrap(`
<h1 style="margin:0 0 16px;font-family:${FONT_HEADING};font-size:22px;font-weight:700;color:#0C1222;">Pozvánka do {{tenantName}}</h1>
<p style="margin:0 0 16px;">Dobrý den, {{name}},</p>
<p style="margin:0 0 16px;">správce nemovitosti vás zve do systému ifmio.</p>
${btn('Přijmout pozvánku', '{{link}}')}
<p style="margin:0;font-size:13px;color:#9CA3AF;">Odkaz je platný 7 dní.</p>
`),
    placeholders: ['tenantName', 'name', 'link'],
  },
  {
    code: 'portal_invitation',
    label: 'Pozvánka do portálu vlastníka',
    subject: 'Přístup do portálu vlastníka — {{propertyName}}',
    body: wrap(`
<h1 style="margin:0 0 16px;font-family:${FONT_HEADING};font-size:22px;font-weight:700;color:#0C1222;">Portál vlastníka</h1>
<p style="margin:0 0 16px;">Dobrý den, {{name}},</p>
<p style="margin:0 0 16px;">byl Vám zřízen přístup do portálu vlastníka pro <strong>{{propertyName}}</strong>.</p>
${btn('Otevřít portál vlastníka', '{{portalUrl}}')}
<p style="margin:0;font-size:13px;color:#9CA3AF;">Tento odkaz je určen výhradně pro Vás. Nesdílejte jej s nikým.</p>
`),
    placeholders: ['name', 'propertyName', 'portalUrl'],
  },
  {
    code: 'esign_request',
    label: 'Žádost o elektronický podpis',
    subject: '{{documentTitle}} — žádost o elektronický podpis',
    body: wrap(`
<h1 style="margin:0 0 16px;font-family:${FONT_HEADING};font-size:22px;font-weight:700;color:#0C1222;">Elektronický podpis</h1>
<p style="margin:0 0 16px;">Dobrý den, {{name}},</p>
<p style="margin:0 0 16px;">{{message}}</p>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:16px 0;">
<tr><td style="padding:16px;background-color:#F0FDFA;border-radius:8px;border-left:4px solid #0D9488;">
<strong>Dokument:</strong> {{documentTitle}}
</td></tr>
</table>
${btn('Podepsat dokument', '{{signUrl}}')}
<p style="margin:0;font-size:13px;color:#9CA3AF;">Platnost do: {{expiresAt}}</p>
`),
    placeholders: ['name', 'documentTitle', 'message', 'signUrl', 'expiresAt'],
  },
  {
    code: 'per_rollam_voting',
    label: 'Hlasování per rollam',
    subject: 'Hlasování per rollam — {{votingTitle}}',
    body: wrap(`
<h1 style="margin:0 0 16px;font-family:${FONT_HEADING};font-size:22px;font-weight:700;color:#0C1222;">Hlasování per rollam</h1>
<p style="margin:0 0 16px;">Dobrý den, {{partyDisplayName}},</p>
<p style="margin:0 0 16px;">bylo zahájeno hlasování per rollam <strong>{{votingTitle}}</strong>.</p>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:16px 0;">
<tr><td style="padding:16px;background-color:#F0FDFA;border-radius:8px;border-left:4px solid #0D9488;">
<strong>Počet bodů:</strong> {{itemCount}}<br>
<strong>Termín:</strong> {{deadline}}
</td></tr>
</table>
${btn('Hlasovat', '{{voteUrl}}')}
<p style="margin:0;font-size:13px;color:#9CA3AF;">Pokud jste tento email neočekávali, kontaktujte správce nemovitosti.</p>
`),
    placeholders: ['partyDisplayName', 'votingTitle', 'itemCount', 'deadline', 'voteUrl'],
  },
]
