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
  beatFrequency: 'step' | 'cycle';
}

export type SessionStatus = 'idle' | 'running' | 'paused';

export interface ChartDataPoint {
  time: number;
  actual: number | null;
  target: number;
}

export interface SummaryData {
  totalSteps: number;
  sessionDuration: number;
  avgCadence: number;
  avgTargetCadence: number;
  inZoneTime: number;
  belowZoneTime: number;
  aboveZoneTime: number;
  chartData: ChartDataPoint[];
}

export interface Preset {
  name: string;
  settings: Partial<CadenceSettings>;
}
