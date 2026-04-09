import { chromium } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = 'https://ifmio.com'

const URLS = [
  '/cs/',
  '/cs/cenik/',
  '/cs/demo/',
  '/cs/kontakt/',
  '/cs/o-nas/',
  '/cs/kariera/',
  '/cs/blog/',
  '/cs/pravni-dokumenty/',
  '/cs/bezpecnost/',
  '/cs/reseni/svj/',
  '/cs/reseni/spravce/',
  '/cs/reseni/facility-management/',
  '/cs/reseni/udrzba/',
  '/cs/reseni/investori/',
  '/cs/platforma/evidence/',
  '/cs/platforma/finance/',
  '/cs/platforma/predpisy/',
  '/cs/platforma/konto/',
  '/cs/platforma/revize/',
  '/cs/platforma/pracovni-prikazy/',
  '/cs/platforma/komunikace/',
  '/cs/platforma/meridla/',
  '/cs/platforma/vyuctovani/',
  '/cs/platforma/mio-ai/',
  '/cs/platforma/portal/',
  '/cs/platforma/reporting/',
  '/cs/platforma/shromazdeni/',
  '/cs/platforma/mobilni-aplikace/',
  '/cs/platforma/banka/',
]

const OUT_DIR = path.join(__dirname, '../landing-audit-results')

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.setViewportSize({ width: 1280, height: 800 })

  const results: Array<{
    url: string
    title: string
    h1: string
    textLength: number
    hasContent: boolean
    hasNoindex: boolean
    screenshot: string
    verdict: string
  }> = []

  for (const urlPath of URLS) {
    const fullUrl = BASE_URL + urlPath
    console.log(`Auditing: ${fullUrl}`)

    try {
      await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(1500)

      const title = await page.title()
      const h1 = await page.$eval('h1', el => el.textContent?.trim() ?? '').catch(() => '(žádný h1)')
      const textLength = await page.evaluate(() => document.body.innerText.trim().length)
      const hasNoindex = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="robots"]')
        return meta?.getAttribute('content')?.includes('noindex') ?? false
      })

      const slug = urlPath.replace(/\//g, '_').replace(/^_|_$/g, '') || 'homepage'
      const screenshotPath = path.join(OUT_DIR, `${slug}.png`)
      await page.screenshot({ path: screenshotPath, fullPage: false })

      const hasContent = textLength > 300
      const verdict = hasNoindex
        ? 'NOINDEX'
        : hasContent
        ? 'OK'
        : textLength > 50
        ? 'STUB'
        : 'PRÁZDNÁ'

      results.push({
        url: urlPath,
        title,
        h1,
        textLength,
        hasContent,
        hasNoindex,
        screenshot: screenshotPath,
        verdict,
      })

      console.log(`  → ${verdict} | h1: "${h1}" | text: ${textLength} znaků`)
    } catch (err) {
      console.error(`  → CHYBA: ${err}`)
      results.push({
        url: urlPath,
        title: 'ERROR',
        h1: 'ERROR',
        textLength: 0,
        hasContent: false,
        hasNoindex: false,
        screenshot: '',
        verdict: 'CHYBA',
      })
    }
  }

  await browser.close()

  const report = results.map(r =>
    `${r.verdict.padEnd(10)} | ${String(r.textLength).padStart(6)} znaků | ${r.url.padEnd(45)} | h1: "${r.h1}"`
  ).join('\n')

  const summary = {
    ok: results.filter(r => r.verdict === 'OK').length,
    stub: results.filter(r => r.verdict === 'STUB').length,
    empty: results.filter(r => r.verdict === 'PRÁZDNÁ').length,
    noindex: results.filter(r => r.verdict === 'NOINDEX').length,
    error: results.filter(r => r.verdict === 'CHYBA').length,
  }

  const reportText = `
IFMIO LANDING PAGE AUDIT — ${new Date().toISOString()}
${'='.repeat(70)}

SOUHRN:
  OK (obsah):      ${summary.ok}
  STUB (málo):     ${summary.stub}
  PRÁZDNÁ:         ${summary.empty}
  NOINDEX:         ${summary.noindex}
  CHYBA:           ${summary.error}
  Celkem:          ${results.length}

DETAIL:
${'─'.repeat(70)}
${report}

STRÁNKY DOPORUČENÉ K ODEBRÁNÍ ZE SITEMAPA:
${results.filter(r => r.verdict === 'PRÁZDNÁ' || r.verdict === 'STUB').map(r => `  - ${r.url}`).join('\n') || '  (žádné)'}
`

  const reportPath = path.join(OUT_DIR, 'report.txt')
  fs.writeFileSync(reportPath, reportText)
  fs.writeFileSync(
    path.join(OUT_DIR, 'results.json'),
    JSON.stringify(results, null, 2)
  )

  console.log('\n' + reportText)
  console.log(`\nScreenshoty uloženy do: ${OUT_DIR}`)
  console.log(`Report uložen do: ${reportPath}`)
}

main().catch(console.error)
