import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { RequestMeta } from './auth.service'

import * as geoip from 'geoip-lite'

interface RiskFactor {
  factor: string
  score: number
  detail: string
}

interface GeoData {
  country: string | null
  city: string | null
  lat: number | null
  lon: number | null
}

export interface RiskResult {
  score: number
  factors: RiskFactor[]
  action: 'allow' | 'challenge' | 'block'
  geo: GeoData
}

const CHALLENGE_THRESHOLD = 50
const BLOCK_THRESHOLD = 80

@Injectable()
export class RiskScoringService {
  private readonly logger = new Logger(RiskScoringService.name)

  constructor(private prisma: PrismaService) {}

  async evaluateLogin(userId: string, tenantId: string | null, meta?: RequestMeta): Promise<RiskResult> {
    const geo = this.geoLookup(meta?.ip)
    try {
      return await this.doEvaluateLogin(userId, meta, geo)
    } catch (err) {
      // Graceful degradation — if risk tables don't exist yet, allow login
      this.logger.warn(`Risk scoring failed (graceful pass-through): ${(err as Error).message}`)
      return { score: 0, factors: [], action: 'allow', geo }
    }
  }

  private async doEvaluateLogin(userId: string, meta: RequestMeta | undefined, geo: GeoData): Promise<RiskResult> {
    const factors: RiskFactor[] = []

    // 1. Check failed login count in last hour
    const failedRecent = await this.countRecentFailedLogins(userId, 60)
    if (failedRecent >= 5) {
      factors.push({ factor: 'brute_force', score: 40, detail: `${failedRecent} neúspěšných pokusů za poslední hodinu` })
    } else if (failedRecent >= 3) {
      factors.push({ factor: 'failed_attempts', score: 20, detail: `${failedRecent} neúspěšné pokusy za poslední hodinu` })
    }

    // 2. New IP address
    const knownIp = await this.isKnownIp(userId, meta?.ip)
    if (!knownIp && meta?.ip) {
      factors.push({ factor: 'new_ip', score: 15, detail: `Nová IP adresa: ${meta.ip}` })
    }

    // 3. New user agent
    const knownUa = await this.isKnownUserAgent(userId, meta?.userAgent)
    if (!knownUa && meta?.userAgent) {
      factors.push({ factor: 'new_device', score: 10, detail: 'Nové zařízení' })
    }

    // 4. New country
    if (geo.country) {
      const knownCountry = await this.isKnownCountry(userId, geo.country)
      if (!knownCountry) {
        factors.push({ factor: 'new_country', score: 25, detail: `Nová země: ${geo.country}` })
      }
    }

    // 5. Impossible travel detection
    const travelFactor = await this.checkImpossibleTravel(userId, geo, meta?.ip)
    if (travelFactor) {
      factors.push(travelFactor)
    }

    // 6. Odd-hour login (00:00–05:00 local time — assume Europe/Prague)
    const hour = new Date().getUTCHours() + 1 // CET rough offset
    if (hour >= 0 && hour < 5) {
      factors.push({ factor: 'odd_hour', score: 10, detail: `Přihlášení v ${hour}:00` })
    }

    const score = Math.min(100, factors.reduce((sum, f) => sum + f.score, 0))
    const action: RiskResult['action'] =
      score >= BLOCK_THRESHOLD ? 'block' :
      score >= CHALLENGE_THRESHOLD ? 'challenge' : 'allow'

    if (score > 0) {
      this.logger.log(`Risk score for user ${userId}: ${score} (${action}) — factors: ${factors.map(f => f.factor).join(', ')}`)
    }

    return { score, factors, action, geo }
  }

  async logRisk(userId: string, tenantId: string | null, meta: RequestMeta | undefined, result: RiskResult, loginSuccess: boolean) {
    await this.prisma.loginRiskLog.create({
      data: {
        userId,
        tenantId,
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent?.slice(0, 500),
        country: result.geo.country,
        city: result.geo.city,
        lat: result.geo.lat,
        lon: result.geo.lon,
        riskScore: result.score,
        riskFactors: result.factors as any,
        action: result.action,
        loginSuccess,
      },
    }).catch(err => this.logger.error('Failed to log risk', err))
  }

  /** Get risk history for admin dashboard */
  async getRiskHistory(tenantId: string, days = 7) {
    const since = new Date(Date.now() - days * 86_400_000)
    return this.prisma.loginRiskLog.findMany({
      where: { tenantId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  }

  /** Get risk stats for security dashboard */
  async getRiskStats(tenantId: string) {
    const since24h = new Date(Date.now() - 86_400_000)
    const since7d = new Date(Date.now() - 7 * 86_400_000)

    const [total24h, blocked24h, challenged24h, total7d, highRisk7d] = await Promise.all([
      this.prisma.loginRiskLog.count({ where: { tenantId, createdAt: { gte: since24h } } }),
      this.prisma.loginRiskLog.count({ where: { tenantId, action: 'block', createdAt: { gte: since24h } } }),
      this.prisma.loginRiskLog.count({ where: { tenantId, action: 'challenge', createdAt: { gte: since24h } } }),
      this.prisma.loginRiskLog.count({ where: { tenantId, createdAt: { gte: since7d } } }),
      this.prisma.loginRiskLog.count({ where: { tenantId, riskScore: { gte: CHALLENGE_THRESHOLD }, createdAt: { gte: since7d } } }),
    ])

    return { total24h, blocked24h, challenged24h, total7d, highRisk7d }
  }

  // ─── Private helpers ──────────────────────────────────────────

  private geoLookup(ip?: string): GeoData {
    const empty: GeoData = { country: null, city: null, lat: null, lon: null }
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return empty
    }
    try {
      const geo = geoip.lookup(ip)
      if (!geo) return empty
      return {
        country: geo.country ?? null,
        city: geo.city ?? null,
        lat: geo.ll?.[0] ?? null,
        lon: geo.ll?.[1] ?? null,
      }
    } catch {
      return empty
    }
  }

  private async countRecentFailedLogins(userId: string, minutes: number): Promise<number> {
    const since = new Date(Date.now() - minutes * 60_000)
    return this.prisma.auditLog.count({
      where: {
        userId,
        action: 'LOGIN_FAIL',
        createdAt: { gte: since },
      },
    })
  }

  private async isKnownIp(userId: string, ip?: string): Promise<boolean> {
    if (!ip) return true
    const recent = await this.prisma.loginRiskLog.findFirst({
      where: { userId, ipAddress: ip, loginSuccess: true },
    })
    if (recent) return true
    // Also check refresh tokens
    const token = await this.prisma.refreshToken.findFirst({
      where: { userId, ipAddress: ip },
    })
    return !!token
  }

  private async isKnownUserAgent(userId: string, ua?: string): Promise<boolean> {
    if (!ua) return true
    // Check if this device was seen in successful logins
    const recent = await this.prisma.loginRiskLog.findFirst({
      where: { userId, userAgent: ua.slice(0, 500), loginSuccess: true },
    })
    return !!recent
  }

  private async isKnownCountry(userId: string, country: string): Promise<boolean> {
    const recent = await this.prisma.loginRiskLog.findFirst({
      where: { userId, country, loginSuccess: true },
    })
    return !!recent
  }

  private async checkImpossibleTravel(userId: string, currentGeo: GeoData, currentIp?: string): Promise<RiskFactor | null> {
    if (!currentGeo.lat || !currentGeo.lon) return null

    // Find last successful login with geo data
    const last = await this.prisma.loginRiskLog.findFirst({
      where: {
        userId,
        loginSuccess: true,
        lat: { not: null },
        lon: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!last || !last.lat || !last.lon) return null

    // Same IP = same location, no travel
    if (currentIp && last.ipAddress === currentIp) return null

    const distanceKm = this.haversineDistance(
      last.lat, last.lon,
      currentGeo.lat, currentGeo.lon,
    )

    const timeDiffHours = (Date.now() - last.createdAt.getTime()) / 3_600_000

    if (timeDiffHours <= 0 || distanceKm < 100) return null

    // Max plausible speed: 900 km/h (commercial flight)
    const speedKmH = distanceKm / timeDiffHours

    if (speedKmH > 900) {
      return {
        factor: 'impossible_travel',
        score: 35,
        detail: `${Math.round(distanceKm)} km za ${timeDiffHours.toFixed(1)}h (${Math.round(speedKmH)} km/h) — z ${last.city ?? last.country ?? '?'} do ${currentGeo.city ?? currentGeo.country ?? '?'}`,
      }
    }

    return null
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Earth radius in km
    const dLat = this.toRad(lat2 - lat1)
    const dLon = this.toRad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }

  private toRad(deg: number): number {
    return deg * Math.PI / 180
  }
}
