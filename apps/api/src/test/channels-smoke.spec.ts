import { GoSmsProvider } from '../communication/channels/gosms.provider'
import { WhatsAppProvider } from '../communication/channels/whatsapp.provider'
import { IsdsProvider } from '../communication/channels/isds.provider'
import { DopisOnlineProvider } from '../communication/channels/dopisonline.provider'

describe('Communication Channels (smoke)', () => {

  describe('GoSMS', () => {
    it('should report not configured without env vars', () => {
      const provider = new GoSmsProvider()
      expect(provider.isConfigured()).toBe(false)
      expect(provider.channelName).toBe('sms')
    })

    it('should reject invalid phone number', async () => {
      const provider = new GoSmsProvider()
      const result = await provider.send({
        recipient: { phone: '777123456' },
        subject: 'Test',
        bodyText: 'Test SMS',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('WhatsApp', () => {
    it('should report not configured without env vars', () => {
      const provider = new WhatsAppProvider()
      expect(provider.isConfigured()).toBe(false)
      expect(provider.channelName).toBe('whatsapp')
    })

    it('should reject invalid phone', async () => {
      const provider = new WhatsAppProvider()
      const result = await provider.send({
        recipient: { phone: 'invalid' },
        subject: 'Test',
        bodyText: 'Test WhatsApp',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('ISDS', () => {
    it('should report not configured', () => {
      const provider = new IsdsProvider()
      expect(provider.isConfigured()).toBe(false)
    })

    it('should validate dataBoxId format', async () => {
      const provider = new IsdsProvider()
      const result = await provider.send({
        recipient: { dataBoxId: 'invalid!' },
        subject: 'Test',
        bodyText: 'Test',
      })
      expect(result.success).toBe(false)
      expect(result.error).toContain('datov')
    })
  })

  describe('DopisOnline', () => {
    it('should report not configured', () => {
      const provider = new DopisOnlineProvider()
      expect(provider.isConfigured()).toBe(false)
    })

    it('should reject missing address', async () => {
      const provider = new DopisOnlineProvider()
      const result = await provider.send({
        recipient: {},
        subject: 'Test',
        bodyText: 'Test letter',
      })
      expect(result.success).toBe(false)
      expect(result.error).toContain('adres')
    })
  })
})
