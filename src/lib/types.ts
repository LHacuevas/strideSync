export interface CadenceSettings {
  min: number;
  max: number;
  adjust: boolean;
  holdLowDuration: number; // in seconds
  adjustUpRate: number; // in SPM
  adjustUpInterval: number; // in seconds
  holdHighDuration: number; // in seconds
  adjustDownRate: number; // in SPM
  adjustDownInterval: number; // in seconds
  announcementInterval: number; // in seconds
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
