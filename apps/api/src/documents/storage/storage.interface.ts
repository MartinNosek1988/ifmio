export interface StoredFile {
  key:      string
  url:      string
  size:     number
  mimeType: string
}

export interface IStorageProvider {
  save(file: Buffer, key: string, mimeType: string): Promise<StoredFile>
  getUrl(key: string): string
  delete(key: string): Promise<void>
}
