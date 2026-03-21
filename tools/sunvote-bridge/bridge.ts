/**
 * SunVote Bridge Agent
 *
 * Runs on the operator's laptop, reads from SunVote USB receiver,
 * and POSTs vote data to the ifmio API.
 *
 * Usage:
 *   IFMIO_API_URL=https://app.ifmio.com BRIDGE_API_KEY=xxx npx tsx bridge.ts
 *
 * For testing without hardware:
 *   npx tsx simulator.ts
 */

const API_URL = process.env.IFMIO_API_URL || 'http://localhost:3000'
const BRIDGE_API_KEY = process.env.BRIDGE_API_KEY

if (!BRIDGE_API_KEY) {
  console.error('ERROR: BRIDGE_API_KEY environment variable required')
  console.error('Get it from ifmio: Assembly → Hardware Session → API Key')
  process.exit(1)
}

// Heartbeat every 10 seconds
setInterval(async () => {
  try {
    await fetch(`${API_URL}/api/v1/hardware/ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Bridge-Api-Key': BRIDGE_API_KEY },
      body: JSON.stringify({ timestamp: Date.now() }),
    })
  } catch (e: any) {
    console.error('Heartbeat failed:', e.message)
  }
}, 10000)

// Vote submission function (called by SDK event handler)
async function sendVote(keypadId: string, choice: 'ANO' | 'NE' | 'ZDRZET') {
  try {
    const res = await fetch(`${API_URL}/api/v1/hardware/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Bridge-Api-Key': BRIDGE_API_KEY },
      body: JSON.stringify({ keypadId, choice, timestamp: Date.now() }),
    })
    const data = await res.json()
    if (data.success) {
      console.log(`✓ Vote from keypad ${keypadId}: ${choice} → ${data.attendeeName}`)
    } else {
      console.warn(`✗ Vote rejected from keypad ${keypadId}: ${data.error}`)
    }
  } catch (e: any) {
    console.error(`✗ Failed to send vote from keypad ${keypadId}:`, e.message)
  }
}

// ─── PLACEHOLDER: SunVote SDK Integration ─────────────────────────
// When you have the SunVote SDK, replace this section with:
// import { SunVoteReceiver } from 'sunvote-sdk';
// const receiver = new SunVoteReceiver({ port: 'COM3', channel: 1 });
// receiver.on('vote', (event) => {
//   const choice = { 1: 'ANO', 2: 'NE', 3: 'ZDRZET' }[event.button];
//   if (choice) sendVote(event.keypadId, choice);
// });
// receiver.connect();
// ───────────────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════')
console.log('  ifmio SunVote Bridge Agent')
console.log(`  API: ${API_URL}`)
console.log('  Status: Waiting for SunVote SDK integration')
console.log('  Use "npm run simulate" for testing')
console.log('═══════════════════════════════════════════════')

// Keep process alive
process.stdin.resume()

// Export for potential SDK integration
export { sendVote }
