export * from './common';
export * from './auth';
export * from './property';
export { PROPERTY_TYPE_CONFIG, getPropertyTypeConfig, getPropertyTypeLabel, getTerminology, hasFeature, getTypesByCategory, getPropertyTypeOptions, PropertyType as PropertyTypeEnum } from './property-type-config';
export type { PropertyCategory, PropertyTerminology, PropertyFeatures, PropertyValidation, PropertyUiConfig, PropertyDetailTab, UnitColumnId, PersonColumnId, PropertyLegalReference, PropertyTypeDefinition } from './property-type-config';
export * from './resident';
export * from './finance';
