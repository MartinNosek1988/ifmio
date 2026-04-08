export * from './common';
export * from './auth';
export * from './property';
export * from './ares.types';

// Field Service
export interface WorkOrderMaterial {
  id: string;
  workOrderId: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  catalogCode?: string;
}

export interface WorkOrderSchedule {
  userId: string;
  userName: string;
  workOrders: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    scheduledTimeFrom?: string;
    scheduledTimeTo?: string;
    property?: { name: string; address: string };
  }>;
}
export { PropertyType, PROPERTY_TYPE_CONFIG, getPropertyTypeConfig, getPropertyTypeLabel, getTerminology, hasFeature, getTypesByCategory, getPropertyTypeOptions } from './property-type-config';
export type { PropertyCategory, PropertyTerminology, PropertyFeatures, PropertyValidation, PropertyUiConfig, PropertyDetailTab, UnitColumnId, PersonColumnId, PropertyLegalReference, PropertyTypeDefinition } from './property-type-config';
export * from './resident';
export * from './finance';
