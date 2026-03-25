import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '../../../shared/components'
import { useSaveZones, type FloorPlan, type FloorZoneType, type ZoneItem } from '../hooks/useFloorPlans'
import type { ApiUnit } from '../properties-api'

const ZONE_COLORS: Record<FloorZoneType, string> = {
  UNIT: '#3b82f6',
  COMMON_AREA: '#9ca3af',
  TECHNICAL: '#f97316',
  STORAGE: '#a78bfa',
  PARKING: '#6ee7b7',
  OTHER: '#d1d5db',
}

const ZONE_TYPE_LABELS: Record<FloorZoneType, string> = {
  UNIT: 'Jednotka',
  COMMON_AREA: 'Společné prostory',
  TECHNICAL: 'Technická místnost',
  STORAGE: 'Sklep / komora',
  PARKING: 'Garážové stání',
  OTHER: 'Jiné',
}

interface EditableZone {
  tempId: string
  id?: string
  unitId?: string
  label?: string
  zoneType: FloorZoneType
  polygon: Array<{ x: number; y: number }>
  color?: string
}

interface Props {
  floorPlan: FloorPlan
  propertyId: string
  units: ApiUnit[]
  onClose: () => void
}

let nextTempId = 1

export default function FloorPlanEditor({ floorPlan, propertyId, units, onClose }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const save = useSaveZones(propertyId, floorPlan.id)

  // Init zones from floorPlan
  const [zones, setZones] = useState<EditableZone[]>(() =>
    floorPlan.zones.map((z) => ({
      tempId: String(nextTempId++),
      id: z.id,
      unitId: z.unitId ?? undefined,
      label: z.label ?? undefined,
      zoneType: z.zoneType,
      polygon: z.polygon,
      color: z.color ?? undefined,
    }))
  )

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawingPoints, setDrawingPoints] = useState<Array<{ x: number; y: number }>>([])
  const [dragVertex, setDragVertex] = useState<{ zoneIdx: number; vertexIdx: number } | null>(null)
  const [history, setHistory] = useState<EditableZone[][]>([])

  const { imageWidth, imageHeight } = floorPlan

  const pushHistory = useCallback(() => {
    setHistory(prev => [...prev.slice(-20), zones.map(z => ({ ...z, polygon: [...z.polygon] }))])
  }, [zones])

  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      setZones(last)
      setSelectedIdx(null)
      return prev.slice(0, -1)
    })
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDrawing) {
          setIsDrawing(false)
          setDrawingPoints([])
        } else {
          setSelectedIdx(null)
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isDrawing, undo])

  const getRelativeCoords = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    const scaleX = imageWidth / rect.width
    const scaleY = imageHeight / rect.height
    return {
      x: ((e.clientX - rect.left) * scaleX) / imageWidth,
      y: ((e.clientY - rect.top) * scaleY) / imageHeight,
    }
  }, [imageWidth, imageHeight])

  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (dragVertex) return
    if (!isDrawing) {
      setSelectedIdx(null)
      return
    }
    const coords = getRelativeCoords(e)
    setDrawingPoints(prev => [...prev, coords])
  }, [isDrawing, getRelativeCoords, dragVertex])

  const handleSvgDoubleClick = useCallback(() => {
    if (!isDrawing || drawingPoints.length < 3) return
    pushHistory()
    const newZone: EditableZone = {
      tempId: String(nextTempId++),
      zoneType: 'UNIT',
      polygon: drawingPoints,
    }
    setZones(prev => [...prev, newZone])
    setSelectedIdx(zones.length)
    setIsDrawing(false)
    setDrawingPoints([])
  }, [isDrawing, drawingPoints, zones.length, pushHistory])

  const handleVertexMouseDown = useCallback((e: React.MouseEvent, zoneIdx: number, vertexIdx: number) => {
    e.stopPropagation()
    pushHistory()
    setDragVertex({ zoneIdx, vertexIdx })
    setSelectedIdx(zoneIdx)
  }, [pushHistory])

  const handleSvgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragVertex) return
    const coords = getRelativeCoords(e)
    setZones(prev => {
      const next = [...prev]
      const zone = { ...next[dragVertex.zoneIdx], polygon: [...next[dragVertex.zoneIdx].polygon] }
      zone.polygon[dragVertex.vertexIdx] = coords
      next[dragVertex.zoneIdx] = zone
      return next
    })
  }, [dragVertex, getRelativeCoords])

  const handleSvgMouseUp = useCallback(() => {
    setDragVertex(null)
  }, [])

  const handleVertexContextMenu = useCallback((e: React.MouseEvent, zoneIdx: number, vertexIdx: number) => {
    e.preventDefault()
    const zone = zones[zoneIdx]
    if (zone.polygon.length <= 3) return
    pushHistory()
    setZones(prev => {
      const next = [...prev]
      const z = { ...next[zoneIdx], polygon: next[zoneIdx].polygon.filter((_, i) => i !== vertexIdx) }
      next[zoneIdx] = z
      return next
    })
  }, [zones, pushHistory])

  const handleEdgeMidpointClick = useCallback((e: React.MouseEvent, zoneIdx: number, edgeIdx: number) => {
    e.stopPropagation()
    pushHistory()
    const zone = zones[zoneIdx]
    const p1 = zone.polygon[edgeIdx]
    const p2 = zone.polygon[(edgeIdx + 1) % zone.polygon.length]
    const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
    setZones(prev => {
      const next = [...prev]
      const z = { ...next[zoneIdx], polygon: [...next[zoneIdx].polygon] }
      z.polygon.splice(edgeIdx + 1, 0, mid)
      next[zoneIdx] = z
      return next
    })
  }, [zones, pushHistory])

  const deleteZone = useCallback((idx: number) => {
    pushHistory()
    setZones(prev => prev.filter((_, i) => i !== idx))
    setSelectedIdx(null)
  }, [pushHistory])

  const updateZoneProp = useCallback((idx: number, key: keyof EditableZone, value: unknown) => {
    setZones(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [key]: value }
      return next
    })
  }, [])

  const handleSave = () => {
    const items: ZoneItem[] = zones.map(z => ({
      id: z.id,
      unitId: z.unitId,
      label: z.label,
      zoneType: z.zoneType,
      polygon: z.polygon,
      color: z.color,
    }))
    save.mutate(items, { onSuccess: onClose })
  }

  const pointsString = (polygon: Array<{ x: number; y: number }>) =>
    polygon.map(p => `${p.x * imageWidth},${p.y * imageHeight}`).join(' ')

  const selected = selectedIdx != null ? zones[selectedIdx] : null

  return (
    <div style={{ display: 'flex', gap: 16, height: '80vh' }}>
      {/* Left: SVG canvas */}
      <div style={{ flex: 1, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
        <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <Button
            size="sm"
            variant={isDrawing ? 'primary' : 'default'}
            onClick={() => { setIsDrawing(!isDrawing); setDrawingPoints([]) }}
          >
            {isDrawing ? 'Kreslím… (ESC = zrušit)' : 'Kreslit zónu'}
          </Button>
          {isDrawing && drawingPoints.length >= 3 && (
            <Button size="sm" onClick={() => handleSvgDoubleClick()}>Dokončit ({drawingPoints.length} bodů)</Button>
          )}
          <div style={{ flex: 1 }} />
          <Button size="sm" onClick={undo} disabled={history.length === 0}>Zpět (Ctrl+Z)</Button>
        </div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${imageWidth} ${imageHeight}`}
          style={{ width: '100%', cursor: isDrawing ? 'crosshair' : 'default', display: 'block' }}
          onClick={handleSvgClick}
          onDoubleClick={handleSvgDoubleClick}
          onMouseMove={handleSvgMouseMove}
          onMouseUp={handleSvgMouseUp}
        >
          <image href={floorPlan.imageUrl} width={imageWidth} height={imageHeight} />

          {/* Existing zones */}
          {zones.map((zone, zIdx) => {
            const fill = zone.color ?? ZONE_COLORS[zone.zoneType] ?? ZONE_COLORS.OTHER
            const isSel = selectedIdx === zIdx
            return (
              <g key={zone.tempId}>
                <polygon
                  points={pointsString(zone.polygon)}
                  fill={fill}
                  fillOpacity={isSel ? 0.5 : 0.25}
                  stroke={isSel ? '#fff' : fill}
                  strokeWidth={isSel ? 3 : 2}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); setSelectedIdx(zIdx) }}
                />
                {/* Vertices (only for selected zone) */}
                {isSel && zone.polygon.map((p, vIdx) => (
                  <circle
                    key={vIdx}
                    cx={p.x * imageWidth}
                    cy={p.y * imageHeight}
                    r={6}
                    fill="#fff"
                    stroke={fill}
                    strokeWidth={2}
                    style={{ cursor: 'move' }}
                    onMouseDown={(e) => handleVertexMouseDown(e, zIdx, vIdx)}
                    onContextMenu={(e) => handleVertexContextMenu(e, zIdx, vIdx)}
                  />
                ))}
                {/* Edge midpoints (only for selected zone) */}
                {isSel && zone.polygon.map((p, eIdx) => {
                  const next = zone.polygon[(eIdx + 1) % zone.polygon.length]
                  return (
                    <circle
                      key={`mid-${eIdx}`}
                      cx={((p.x + next.x) / 2) * imageWidth}
                      cy={((p.y + next.y) / 2) * imageHeight}
                      r={4}
                      fill={fill}
                      fillOpacity={0.5}
                      stroke="#fff"
                      strokeWidth={1}
                      style={{ cursor: 'copy' }}
                      onClick={(e) => handleEdgeMidpointClick(e, zIdx, eIdx)}
                    />
                  )
                })}
              </g>
            )
          })}

          {/* Drawing in progress */}
          {isDrawing && drawingPoints.length > 0 && (
            <g>
              <polyline
                points={drawingPoints.map(p => `${p.x * imageWidth},${p.y * imageHeight}`).join(' ')}
                fill="none"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="6 3"
              />
              {drawingPoints.map((p, i) => (
                <circle key={i} cx={p.x * imageWidth} cy={p.y * imageHeight} r={5} fill="#3b82f6" stroke="#fff" strokeWidth={2} />
              ))}
            </g>
          )}
        </svg>
      </div>

      {/* Right sidebar: zone list + edit */}
      <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto' }}>
        <div style={{ fontWeight: 600, fontSize: '.9rem' }}>Zóny ({zones.length})</div>

        {zones.map((zone, idx) => (
          <div
            key={zone.tempId}
            style={{
              padding: '8px 10px',
              border: `1px solid ${selectedIdx === idx ? 'var(--primary, #6366f1)' : 'var(--border)'}`,
              borderRadius: 6,
              cursor: 'pointer',
              background: selectedIdx === idx ? 'var(--surface-hover, #f5f5ff)' : 'var(--surface)',
              fontSize: '.82rem',
            }}
            onClick={() => setSelectedIdx(idx)}
          >
            <div style={{ fontWeight: 500 }}>
              {zone.unitId ? units.find(u => u.id === zone.unitId)?.name ?? 'Jednotka' : zone.label ?? ZONE_TYPE_LABELS[zone.zoneType]}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '.75rem' }}>{ZONE_TYPE_LABELS[zone.zoneType]}</div>
          </div>
        ))}

        {/* Edit selected zone */}
        {selected && selectedIdx != null && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontWeight: 600, fontSize: '.85rem' }}>Upravit zónu</div>

            <label style={{ fontSize: '.8rem' }}>
              Typ
              <select
                className="form-control"
                value={selected.zoneType}
                onChange={(e) => updateZoneProp(selectedIdx, 'zoneType', e.target.value)}
                style={{ marginTop: 2 }}
              >
                {Object.entries(ZONE_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>

            {selected.zoneType === 'UNIT' && (
              <label style={{ fontSize: '.8rem' }}>
                Jednotka
                <select
                  className="form-control"
                  value={selected.unitId ?? ''}
                  onChange={(e) => updateZoneProp(selectedIdx, 'unitId', e.target.value || undefined)}
                  style={{ marginTop: 2 }}
                >
                  <option value="">— vybrat —</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>{u.name}{u.floor != null ? ` (${u.floor}. NP)` : ''}</option>
                  ))}
                </select>
              </label>
            )}

            {selected.zoneType !== 'UNIT' && (
              <label style={{ fontSize: '.8rem' }}>
                Popis
                <input
                  className="form-control"
                  value={selected.label ?? ''}
                  onChange={(e) => updateZoneProp(selectedIdx, 'label', e.target.value || undefined)}
                  placeholder="Chodba, Kotelna…"
                  style={{ marginTop: 2 }}
                />
              </label>
            )}

            <label style={{ fontSize: '.8rem' }}>
              Barva (volitelné)
              <input
                type="color"
                value={selected.color ?? ZONE_COLORS[selected.zoneType]}
                onChange={(e) => updateZoneProp(selectedIdx, 'color', e.target.value)}
                style={{ marginTop: 2, width: 40, height: 28, padding: 0, border: 'none' }}
              />
            </label>

            <Button size="sm" variant="danger" onClick={() => deleteZone(selectedIdx)}>Smazat zónu</Button>
          </div>
        )}

        <div style={{ marginTop: 'auto', display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <Button onClick={onClose}>Zrušit</Button>
          <Button variant="primary" onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? 'Ukládám…' : 'Uložit'}
          </Button>
        </div>
      </div>
    </div>
  )
}
