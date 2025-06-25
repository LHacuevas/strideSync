export interface CadenceSettings {
  min: number;
  max: number;
  adjust: boolean;
  adjustRate: number;
  adjustDuration: number;
}

export type SessionStatus = 'idle' | 'running' | 'paused';

export interface SummaryData {
  totalSteps: number;
  sessionDuration: number;
  avgCadence: number;
  avgTargetCadence: number;
  inZoneTime: number;
}

export interface Preset {
  name: string;
  settings: Partial<CadenceSettings>;
}
