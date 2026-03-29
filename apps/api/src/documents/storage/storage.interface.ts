export interface StoredFile {
  key:      string
  url:      string
  size:     number
  mimeType: string
}

export interface IStorageProvider {
  save(file: Buffer, key: string, mimeType: string): Promise<StoredFile>
  read(key: string): Promise<Buffer>
  getUrl(key: string): string
  delete(key: string): Promise<void>
}
