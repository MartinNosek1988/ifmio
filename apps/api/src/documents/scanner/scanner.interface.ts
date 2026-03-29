/**
 * AV Scanner interface.
 * Implementations: NoOpScanner (default), ClamAvScanner (future).
 */
export interface ScanResult {
  clean: boolean;
  threat?: string;   // e.g. "Eicar-Signature" — only set if infected
  error?: string;    // scanner error message
  durationMs: number;
}

export interface IScanner {
  scan(buffer: Buffer, filename: string): Promise<ScanResult>;
  isAvailable(): Promise<boolean>;
}
