/**
 * CLI command to import RÚIAN VFR data into local PostgreSQL tables.
 *
 * Usage:
 *   npx ts-node apps/api/src/commands/ruian-vfr-import.command.ts
 *   # or with bun:
 *   bun run apps/api/src/commands/ruian-vfr-import.command.ts
 */
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module'
import { RuianVfrImportService } from '../knowledge-base/ruian-vfr/ruian-vfr-import.service'

async function main() {
  console.log('🏗️  Starting RÚIAN VFR import...')
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  })

  const importService = app.get(RuianVfrImportService)
  const result = await importService.runFullImport()

  console.log(`\n✅ Import finished: ${result.status}`)
  if (result.logId) {
    const log = await importService.getLatestLog()
    if (log) {
      console.log(`   Records: ${log.recordsTotal} total, ${log.recordsInserted} inserted, ${log.recordsUpdated} updated`)
      console.log(`   Duration: ${Math.round(log.durationMs / 1000)}s`)
      if (log.error) console.log(`   Error: ${log.error}`)
    }
  }

  const counts = await importService.getCounts()
  console.log(`\n📊 Table counts:`)
  console.log(`   Obce: ${counts.obec}`)
  console.log(`   Ulice: ${counts.ulice}`)
  console.log(`   Stavební objekty: ${counts.stavebniObjekt}`)
  console.log(`   Adresní místa: ${counts.adresniMisto}`)

  await app.close()
}

main().catch(err => {
  console.error('❌ Import failed:', err)
  process.exit(1)
})
