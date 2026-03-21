# ifmio SunVote Bridge Agent

Connects SunVote M30 wireless keypads to ifmio for live SVJ assembly voting.

## Testing (simulator)

```bash
cd tools/sunvote-bridge
npm install
IFMIO_API_URL=http://localhost:3000 BRIDGE_API_KEY=your-key-here npm run simulate
```

## Production

```bash
IFMIO_API_URL=https://app.ifmio.com BRIDGE_API_KEY=your-key npm start
```

## Keypad mapping

Button 1/A (green) = ANO, Button 2/B (red) = NE, Button 3/C (yellow) = ZDRŽET SE
