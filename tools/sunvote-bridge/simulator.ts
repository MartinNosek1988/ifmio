/**
 * SunVote Vote Simulator
 *
 * Simulates keypad votes for testing the ifmio hardware voting flow.
 *
 * Usage:
 *   IFMIO_API_URL=http://localhost:3000 BRIDGE_API_KEY=xxx npx tsx simulator.ts
 *
 * Keys: 1=ANO 2=NE 3=ZDRZET a=all ANO n=all NE r=random q=quit
 */

const API_URL = process.env.IFMIO_API_URL || 'http://localhost:3000'
const BRIDGE_API_KEY = process.env.BRIDGE_API_KEY

if (!BRIDGE_API_KEY) {
  console.error('ERROR: BRIDGE_API_KEY required')
  process.exit(1)
}

const KEYPAD_IDS = process.env.KEYPAD_IDS?.split(',') ||
  ['501', '502', '503', '504', '505', '506', '507', '508', '509', '510']

async function sendVote(keypadId: string, choice: string) {
  try {
    const res = await fetch(`${API_URL}/api/v1/hardware/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Bridge-Api-Key': BRIDGE_API_KEY! },
      body: JSON.stringify({ keypadId, choice, timestamp: Date.now() }),
    })
    const data = await res.json()
    console.log(`  Keypad ${keypadId} → ${choice}: ${data.success ? '✓' : '✗ ' + data.error}`)
  } catch (e: any) {
    console.error(`  Keypad ${keypadId} failed:`, e.message)
  }
}

const choices = ['ANO', 'NE', 'ZDRZET']

console.log('═══════════════════════════════════════════════')
console.log('  ifmio SunVote SIMULATOR')
console.log(`  API: ${API_URL}`)
console.log(`  Keypads: ${KEYPAD_IDS.join(', ')}`)
console.log('')
console.log('  1=ANO 2=NE 3=ZDRZET a=all ANO n=all NE r=random q=quit')
console.log('═══════════════════════════════════════════════')

// Heartbeat
setInterval(async () => {
  await fetch(`${API_URL}/api/v1/hardware/ping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Bridge-Api-Key': BRIDGE_API_KEY! },
    body: JSON.stringify({ timestamp: Date.now(), keypadCount: KEYPAD_IDS.length }),
  }).catch(() => {})
}, 10000)

// Interactive input
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true)
}
process.stdin.resume()
process.stdin.setEncoding('utf-8')

process.stdin.on('data', async (key: string) => {
  if (key === 'q' || key === '\u0003') { console.log('\nSimulator stopped.'); process.exit(0) }
  const randomKeypad = () => KEYPAD_IDS[Math.floor(Math.random() * KEYPAD_IDS.length)]
  switch (key) {
    case '1': await sendVote(randomKeypad(), 'ANO'); break
    case '2': await sendVote(randomKeypad(), 'NE'); break
    case '3': await sendVote(randomKeypad(), 'ZDRZET'); break
    case 'a':
      console.log('All keypads → ANO')
      for (const id of KEYPAD_IDS) await sendVote(id, 'ANO')
      break
    case 'n':
      console.log('All keypads → NE')
      for (const id of KEYPAD_IDS) await sendVote(id, 'NE')
      break
    case 'r':
      console.log('Random votes from all keypads')
      for (const id of KEYPAD_IDS) await sendVote(id, choices[Math.floor(Math.random() * 3)])
      break
  }
})
