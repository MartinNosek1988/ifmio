import { create } from 'zustand';
import { loadFromStorage } from '../../core/storage';
import type { NonConformity, CorrectiveAction } from './types';

interface ComplianceState {
  nonConformities: NonConformity[];
  correctiveActions: CorrectiveAction[];
  load: () => void;
}

export const useComplianceStore = create<ComplianceState>((set) => ({
  nonConformities: [],
  correctiveActions: [],
  load: () => {
    set({
      nonConformities: loadFromStorage<NonConformity[]>('ifmio:non_conformities', []),
      correctiveActions: loadFromStorage<CorrectiveAction[]>('ifmio:corrective_actions', []),
    });
  },
}));
