import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { FloorPlan, FloorPlanZone, FloorZoneType } from '../hooks/useFloorPlans'

const ZONE_COLORS: Record<FloorZoneType, string> = {
  UNIT: '#3b82f6',
  COMMON_AREA: '#9ca3af',
  TECHNICAL: '#f97316',
  STORAGE: '#a78bfa',
  PARKING: '#6ee7b7',
  OTHER: '#d1d5db',
}

interface Props {
  floorPlan: FloorPlan
  propertyId: string
}

export default function FloorPlanViewer({ floorPlan, propertyId }: Props) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [hoveredZone, setHoveredZone] = useState<FloorPlanZone | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  const { imageWidth, imageHeight } = floorPlan

  const handleZoneClick = useCallback((zone: FloorPlanZone) => {
    if (zone.unitId) {
      navigate(`/properties/${propertyId}/units/${zone.unitId}`)
    }
  }, [navigate, propertyId])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX + 12, y: e.clientY + 12 })
  }, [])

  const pointsString = (polygon: Array<{ x: number; y: number }>) =>
    polygon.map(p => `${p.x * imageWidth},${p.y * imageHeight}`).join(' ')

  return (
    <div>
      {/* Zoom controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button className="btn btn--sm" onClick={() => setScale(1)}>Přizpůsobit</button>
        <button className="btn btn--sm" onClick={() => setScale(s => Math.min(s + 0.25, 4))}>+</button>
        <button className="btn btn--sm" onClick={() => setScale(s => Math.max(s - 0.25, 0.25))}>−</button>
        <span style={{ fontSize: '.8rem', color: 'var(--text-muted)', alignSelf: 'center' }}>{Math.round(scale * 100)}%</span>
      </div>

      {/* SVG canvas */}
      <div
        ref={containerRef}
        style={{ overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8, maxHeight: '70vh' }}
        onMouseMove={handleMouseMove}
      >
        <svg
          viewBox={`0 0 ${imageWidth} ${imageHeight}`}
          style={{ width: imageWidth * scale, height: imageHeight * scale, display: 'block' }}
        >
          <image href={floorPlan.imageUrl} width={imageWidth} height={imageHeight} />

          {floorPlan.zones.map((zone) => {
            const fill = zone.color ?? ZONE_COLORS[zone.zoneType] ?? ZONE_COLORS.OTHER
            const isHovered = hoveredZone?.id === zone.id
            return (
              <polygon
                key={zone.id}
                points={pointsString(zone.polygon)}
                fill={fill}
                fillOpacity={isHovered ? 0.5 : 0.3}
                stroke={fill}
                strokeWidth={2}
                style={{ cursor: zone.unitId ? 'pointer' : 'default', transition: 'fill-opacity 0.15s' }}
                onMouseEnter={() => setHoveredZone(zone)}
                onMouseLeave={() => setHoveredZone(null)}
                onClick={() => handleZoneClick(zone)}
              />
            )
          })}
        </svg>
      </div>

      {/* Tooltip */}
      {hoveredZone && (
        <div
          style={{
            position: 'fixed',
            left: tooltipPos.x,
            top: tooltipPos.y,
            background: 'var(--surface, #fff)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: '.82rem',
            boxShadow: '0 4px 12px rgba(0,0,0,.15)',
            zIndex: 1000,
            pointerEvents: 'none',
            maxWidth: 220,
          }}
        >
          {hoveredZone.unit ? (
            <>
              <div style={{ fontWeight: 600 }}>{hoveredZone.unit.name}</div>
              {hoveredZone.unit.area != null && (
                <div style={{ color: 'var(--text-muted)' }}>{hoveredZone.unit.area} m²</div>
              )}
              <span
                className={`badge badge--${hoveredZone.unit.isOccupied ? 'blue' : 'muted'}`}
                style={{ fontSize: '.7rem', marginTop: 4 }}
              >
                {hoveredZone.unit.isOccupied ? 'obsazeno' : 'volné'}
              </span>
            </>
          ) : (
            <div style={{ fontWeight: 500 }}>
              {hoveredZone.label ?? hoveredZone.zoneType}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
