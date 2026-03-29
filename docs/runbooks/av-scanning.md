# Runbook: AV Scanning Pipeline

## Overview

Documents uploaded to ifmio can be scanned for malware before being made available.
Scanning is **disabled by default** (feature flag `AV_SCANNING_ENABLED=false`).

## Feature Flag

| Env Variable | Default | Effect |
|-------------|---------|--------|
| `AV_SCANNING_ENABLED` | `false` | `false`: documents get `scanStatus=skipped` immediately. `true`: documents start as `pending_scan` and must pass AV scanner. |

## Document Lifecycle

```
Upload → pending_scan → quarantined → clean → available
                                    → infected → BLOCKED
                                    → scan_error → retry
```

When `AV_SCANNING_ENABLED=false`:
```
Upload → skipped → available
```

## Scan Status Values

| Status | Download | Extraction | Meaning |
|--------|----------|------------|---------|
| `pending_scan` | blocked | blocked | Awaiting scanner |
| `quarantined` | blocked | blocked | Scan in progress |
| `clean` | allowed | allowed | No threats found |
| `infected` | **blocked** | **blocked** | Malware detected |
| `scan_error` | blocked | blocked | Scanner failed, will retry |
| `skipped` | allowed | allowed | Scanning disabled |

## ClamAV Sidecar (Future Implementation)

### Docker Compose Addition

```yaml
  clamav:
    image: clamav/clamav:1.3
    container_name: ifmio-clamav
    restart: unless-stopped
    ports:
      - "127.0.0.1:3310:3310"
    volumes:
      - clamav_db:/var/lib/clamav
    environment:
      - CLAMAV_NO_FRESHCLAMD=false   # auto-update virus definitions
    healthcheck:
      test: ["CMD", "clamdcheck"]
      interval: 60s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 2G   # ClamAV needs ~1.5GB for virus DB
```

### ClamAV Scanner Implementation (Sketch)

```typescript
// src/documents/scanner/clamav.scanner.ts
import * as net from 'net';

export class ClamAvScanner implements IScanner {
  private host = process.env.CLAMAV_HOST ?? 'localhost';
  private port = parseInt(process.env.CLAMAV_PORT ?? '3310', 10);

  async scan(buffer: Buffer, filename: string): Promise<ScanResult> {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(this.port, this.host);
      socket.write('zINSTREAM\0');

      // Send file in chunks (ClamAV protocol)
      const chunkSize = 2048;
      for (let i = 0; i < buffer.length; i += chunkSize) {
        const chunk = buffer.subarray(i, i + chunkSize);
        const sizeHeader = Buffer.alloc(4);
        sizeHeader.writeUInt32BE(chunk.length, 0);
        socket.write(sizeHeader);
        socket.write(chunk);
      }
      socket.write(Buffer.alloc(4, 0)); // end stream

      let response = '';
      socket.on('data', (data) => { response += data.toString(); });
      socket.on('end', () => {
        const durationMs = Date.now() - start;
        if (response.includes('OK')) {
          resolve({ clean: true, durationMs });
        } else {
          const match = response.match(/stream: (.+) FOUND/);
          resolve({ clean: false, threat: match?.[1], durationMs });
        }
      });
      socket.on('error', reject);
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      const socket = net.createConnection(this.port, this.host);
      return new Promise((resolve) => {
        socket.on('connect', () => { socket.end(); resolve(true); });
        socket.on('error', () => resolve(false));
      });
    } catch { return false; }
  }
}
```

## Monitoring

- Check for `INFECTED` log messages: `grep "INFECTED" /var/log/ifmio-api.log`
- Count pending scans: `SELECT COUNT(*) FROM documents WHERE "scanStatus" = 'pending_scan';`
- Check scan errors: `SELECT COUNT(*) FROM documents WHERE "scanStatus" = 'scan_error';`

## Troubleshooting

**All uploads blocked (pending_scan forever):**
- Check if `AV_SCANNING_ENABLED=true` but ClamAV is not running
- Quick fix: `UPDATE documents SET "scanStatus" = 'skipped' WHERE "scanStatus" = 'pending_scan';`
- Or disable: `AV_SCANNING_ENABLED=false` and restart API

**ClamAV out of memory:**
- ClamAV needs ~1.5 GB for virus DB. Ensure container has `memory: 2G` limit.
- Check with: `docker stats ifmio-clamav`

**Infected file found:**
- Document is permanently blocked (status `infected`)
- Admin should review and delete: `DELETE FROM documents WHERE id = '<id>';`
- Also clean storage: delete the file at `storageKey` path
