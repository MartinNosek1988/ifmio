import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PropertyPickerState {
  /** Globally selected property ID (null = all properties) */
  selectedPropertyId: string | null
  /** Active financial context ID for the selected property */
  selectedFinancialContextId: string | null
  /** Set the global property filter */
  setProperty: (propertyId: string | null) => void
  /** Set the financial context for the selected property */
  setFinancialContext: (contextId: string | null) => void
  /** Clear both property and context selection */
  clear: () => void
}

export const usePropertyPickerStore = create<PropertyPickerState>()(
  persist(
    (set) => ({
      selectedPropertyId: null,
      selectedFinancialContextId: null,
      setProperty: (propertyId) => set({
        selectedPropertyId: propertyId,
        selectedFinancialContextId: null, // reset context when property changes
      }),
      setFinancialContext: (contextId) => set({ selectedFinancialContextId: contextId }),
      clear: () => set({ selectedPropertyId: null, selectedFinancialContextId: null }),
    }),
    {
      name: 'ifmio-property-picker',
    },
  ),
)
