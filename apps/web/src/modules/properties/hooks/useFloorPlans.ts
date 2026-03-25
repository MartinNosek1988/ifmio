import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../../core/api/client'

// ─── Types ────────────────────────────────────────────────────────

export type FloorZoneType = 'UNIT' | 'COMMON_AREA' | 'TECHNICAL' | 'STORAGE' | 'PARKING' | 'OTHER'

export interface FloorPlanZone {
  id: string
  floorPlanId: string
  unitId: string | null
  label: string | null
  zoneType: FloorZoneType
  polygon: Array<{ x: number; y: number }>
  color: string | null
  unit?: {
    id: string
    name: string
    floor: number | null
    area: number | null
    isOccupied: boolean
  } | null
}

export interface FloorPlan {
  id: string
  tenantId: string
  propertyId: string
  floor: number
  label: string | null
  imageUrl: string
  imageWidth: number
  imageHeight: number
  scaleMetersPerPixel: number | null
  sortOrder: number
  zones: FloorPlanZone[]
  createdAt: string
  updatedAt: string
}

export interface ZoneItem {
  id?: string
  unitId?: string
  label?: string
  zoneType: FloorZoneType
  polygon: Array<{ x: number; y: number }>
  color?: string
}

// ─── Query keys ───────────────────────────────────────────────────

const KEYS = {
  byProperty: (propertyId: string) => ['floor-plans', 'property', propertyId] as const,
  detail: (id: string) => ['floor-plans', id] as const,
}

// ─── Queries ──────────────────────────────────────────────────────

export function useFloorPlans(propertyId: string) {
  return useQuery({
    queryKey: KEYS.byProperty(propertyId),
    queryFn: () => apiClient.get<FloorPlan[]>(`/floor-plans/property/${propertyId}`).then(r => r.data),
    enabled: !!propertyId,
  })
}

export function useFloorPlan(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => apiClient.get<FloorPlan>(`/floor-plans/${id}`).then(r => r.data),
    enabled: !!id,
  })
}

// ─── Mutations ────────────────────────────────────────────────────

export function useCreateFloorPlan(propertyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient.post<FloorPlan>('/floor-plans', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.byProperty(propertyId) }),
  })
}

export function useUpdateFloorPlan(propertyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { label?: string; floor?: number; sortOrder?: number } }) =>
      apiClient.patch<FloorPlan>(`/floor-plans/${id}`, data).then(r => r.data),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.byProperty(propertyId) })
      qc.invalidateQueries({ queryKey: KEYS.detail(vars.id) })
    },
  })
}

export function useDeleteFloorPlan(propertyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/floor-plans/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.byProperty(propertyId) }),
  })
}

export function useSaveZones(propertyId: string, floorPlanId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (zones: ZoneItem[]) =>
      apiClient.put<FloorPlanZone[]>(`/floor-plans/${floorPlanId}/zones`, { zones }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.byProperty(propertyId) })
      qc.invalidateQueries({ queryKey: KEYS.detail(floorPlanId) })
    },
  })
}

export function useReplaceFloorPlanImage(propertyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      apiClient.put(`/floor-plans/${id}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.byProperty(propertyId) })
      qc.invalidateQueries({ queryKey: KEYS.detail(vars.id) })
    },
  })
}
