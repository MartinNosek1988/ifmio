/**
 * Shared email layout helpers — ifmio brand design system.
 *
 * Colors: teal primary (#0D9488), clean white header, gray-50 background
 * Typography: Plus Jakarta Sans headings, DM Sans body (system-ui fallback)
 * Layout: table-based for Outlook compatibility, inline styles only
 */

const FONT_HEADING = "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
const FONT_BODY = "'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"

export function emailLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!--[if mso]><style>table,td{font-family:Arial,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;font-family:${FONT_BODY};">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#F9FAFB;">
<tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
<!-- HEADER -->
<tr><td style="padding:24px 32px;border-bottom:1px solid #E5E7EB;">
<span style="font-family:${FONT_HEADING};font-size:28px;font-weight:800;color:#0D9488;text-decoration:none;letter-spacing:-0.5px;">ifmio</span>
</td></tr>
<!-- CONTENT -->
<tr><td style="padding:32px;">
${content}
</td></tr>
<!-- FOOTER -->
<tr><td style="padding:24px 32px;background-color:#F9FAFB;border-top:1px solid #E5E7EB;">
<p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.5;font-family:${FONT_BODY};">
ifmio — Moderní správa nemovitostí<br>
<a href="https://ifmio.com" style="color:#0D9488;text-decoration:none;">ifmio.com</a>
</p>
<p style="margin:8px 0 0;font-size:12px;color:#9CA3AF;font-family:${FONT_BODY};">
Tento email byl odeslán automaticky, neodpovídejte na něj.
</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

export function emailButton(text: string, url: string): string {
  return `
<table cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;">
<tr><td align="center" style="background-color:#0D9488;border-radius:8px;">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="18%" strokecolor="#0D9488" fillcolor="#0D9488">
<w:anchorlock/>
<center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:600;">${text}</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="${url}" style="display:inline-block;padding:12px 32px;background-color:#0D9488;color:#FFFFFF;font-family:${FONT_BODY};font-size:16px;font-weight:600;text-decoration:none;border-radius:8px;line-height:1;">
${text}
</a>
<!--<![endif]-->
</td></tr>
</table>`
}

export function emailHeading(text: string): string {
  return `<h1 style="margin:0 0 16px;font-family:${FONT_HEADING};font-size:22px;font-weight:700;color:#0C1222;line-height:1.3;">${text}</h1>`
}

export function emailText(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;font-family:${FONT_BODY};">${text}</p>`
}

export function emailMutedText(text: string): string {
  return `<p style="margin:0 0 16px;font-size:13px;color:#9CA3AF;line-height:1.5;font-family:${FONT_BODY};">${text}</p>`
}

export function emailInfoBox(content: string): string {
  return `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:16px 0;">
<tr><td style="padding:16px;background-color:#F0FDFA;border-radius:8px;border-left:4px solid #0D9488;">
${content}
</td></tr>
</table>`
}

export function emailWarningBox(content: string): string {
  return `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:16px 0;">
<tr><td style="padding:16px;background-color:#FEF3C7;border-radius:8px;border-left:4px solid #F59E0B;">
${content}
</td></tr>
</table>`
}

export function emailDangerBox(content: string): string {
  return `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:16px 0;">
<tr><td style="padding:16px;background-color:#FEF2F2;border-radius:8px;border-left:4px solid #EF4444;">
${content}
</td></tr>
</table>`
}

export function emailDetailRow(label: string, value: string): string {
  return `<tr>
<td style="padding:8px 12px;font-size:13px;color:#6B7280;border-bottom:1px solid #F3F4F6;width:140px;font-family:${FONT_BODY};">${label}</td>
<td style="padding:8px 12px;font-size:13px;color:#0C1222;border-bottom:1px solid #F3F4F6;font-family:${FONT_BODY};">${value}</td>
</tr>`
}

export function emailDetailTable(rows: Array<{ label: string; value: string }>): string {
  return `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:16px 0;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB;">
${rows.map(r => emailDetailRow(r.label, r.value)).join('')}
</table>`
}

export function emailSeverityBadge(label: string, color: string): string {
  return `<span style="display:inline-block;padding:2px 10px;background:${color};color:#fff;border-radius:10px;font-size:11px;font-weight:600;font-family:${FONT_BODY};">${label}</span>`
}
