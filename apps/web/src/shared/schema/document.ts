import type { BaseEntity } from './base';

export type AttachableType =
  | 'property' | 'unit' | 'occupancy' | 'asset'
  | 'work_order' | 'ticket' | 'contract' | 'prescription';

export interface Document extends BaseEntity {
  attachable_type: AttachableType;
  attachable_id: string;

  nazev: string;
  popis?: string;

  file_url?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;

  kategorie?: string;

  version: number;
  previous_version_id?: string;

  nahral_user_id: string;
}
