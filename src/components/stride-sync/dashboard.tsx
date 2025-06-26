"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCadenceTracker } from '@/hooks/use-cadence-tracker';
import type { CadenceSettings, SessionStatus, SummaryData, Preset, ChartDataPoint } from '@/lib/types';
import SettingsPanel from './settings-panel';
import RealtimeDisplay from './realtime-display';
import SessionControls from './session-controls';
import SummaryDisplay from './summary-display';
import CurrentSettingsDisplay from './current-settings-display';
import { Footprints, AlertTriangle } from 'lucide-react';

const PRESETS: Preset[] = [
    { name: 'Steady Run', settings: { min: 170, max: 180, adjust: false, announcementInterval: 0, beatFrequency: 'step' } },
    { name: 'Intervals', settings: { min: 165, max: 185, adjust: true, holdLowDuration: 60, adjustUpRate: 5, adjustUpInterval: 15, holdHighDuration: 60, adjustDownRate: 5, adjustDownInterval: 15, announcementInterval: 60, beatFrequency: 'step' } },
    { name: 'Pyramid', settings: { min: 160, max: 180, adjust: true, holdLowDuration: 30, adjustUpRate: 2, adjustUpInterval: 10, holdHighDuration: 30, adjustDownRate: 2, adjustDownInterval: 10, announcementInterval: 45, beatFrequency: 'cycle' } },
    { name: 'Warm-up', settings: { min: 155, max: 170, adjust: false, announcementInterval: 0, beatFrequency: 'step' } },
];

const initialSummary: SummaryData = {
    totalSteps: 0,
    sessionDuration: 0,
    avgCadence: 0,
    avgTargetCadence: 0,
    inZoneTime: 0,
    belowZoneTime: 0,
    aboveZoneTime: 0,
    chartData: [],
};

export default function StrideSyncDashboard() {
  const [settings, setSettings] = useState<CadenceSettings>({
    min: 160,
    max: 175,
    adjust: false,
    holdLowDuration: 30,
    adjustUpRate: 2,
    adjustUpInterval: 10,
    holdHighDuration: 30,
    adjustDownRate: 2,
    adjustDownInterval: 10,
    announcementInterval: 0,
    beatFrequency: 'step',
  });
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [summary, setSummary] = useState<SummaryData>(initialSummary);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const { toast } = useToast();
  const { cadence, permission, error, requestPermission, currentTargetCadence, totalSteps, simulateStep } = useCadenceTracker({ settings, status });
  
  const liveCadenceHistory = useRef<number[]>([]);
  const liveTargetCadenceHistory = useRef<number[]>([]);
  const liveChartData = useRef<ChartDataPoint[]>([]);

  const stateRef = useRef({ cadence, totalSteps, currentTargetCadence });
  useEffect(() => {
    stateRef.current = { cadence, totalSteps, currentTargetCadence };
  }, [cadence, totalSteps, currentTargetCadence]);

  useEffect(() => {
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error,
      });
    }
  }, [error, toast]);
  
  useEffect(() => {
    if (status !== 'running' || !settings.announcementInterval || settings.announcementInterval === 0) {
      return;
    }

    const handleAnnouncement = () => {
      const currentAvg = summary.avgCadence;
      if (currentAvg > 0) {
        if ('speechSynthesis' in window) {
            const textToSpeak = `Average cadence is ${Math.round(currentAvg)} steps per minute.`;
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utterance.lang = 'en-US';
            window.speechSynthesis.speak(utterance);
        } else {
            console.error("Browser does not support Speech Synthesis.");
            toast({ variant: 'destructive', title: 'TTS Error', description: 'Your browser does not support voice announcements.' });
        }
      }
    };

    const interval = setInterval(handleAnnouncement, settings.announcementInterval * 1000);
    return () => clearInterval(interval);
  }, [status, settings.announcementInterval, summary.avgCadence, toast]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (status === 'running' && sessionStartTime) {
      interval = setInterval(() => {
        const { cadence: currentCadence, totalSteps: currentTotalSteps, currentTargetCadence: currentTarget } = stateRef.current;
        const duration = (Date.now() - sessionStartTime) / 1000;
        const isCadenceValid = currentCadence > 0 && currentCadence >= 140;

        liveChartData.current.push({ time: duration, actual: isCadenceValid ? currentCadence : null, target: currentTarget });

        setSummary(prevSummary => {
            let { inZoneTime, belowZoneTime, aboveZoneTime } = prevSummary;
            
            if (isCadenceValid) {
                liveCadenceHistory.current.push(currentCadence);
                if (currentTarget > 0) {
                    liveTargetCadenceHistory.current.push(currentTarget);
                }

                const zoneMargin = 3;
                if (currentCadence < currentTarget - zoneMargin) {
                    belowZoneTime += 1;
                } else if (currentCadence > currentTarget + zoneMargin) {
                    aboveZoneTime += 1;
                } else {
                    inZoneTime += 1;
                }
            }
            
            const avgCadence = liveCadenceHistory.current.length > 0 ? liveCadenceHistory.current.reduce((a, b) => a + b, 0) / liveCadenceHistory.current.length : 0;
            const avgTargetCadence = liveTargetCadenceHistory.current.length > 0 ? liveTargetCadenceHistory.current.reduce((a, b) => a + b, 0) / liveTargetCadenceHistory.current.length : 0;

            return {
              sessionDuration: duration,
              totalSteps: currentTotalSteps,
              avgCadence,
              avgTargetCadence: Math.round(avgTargetCadence),
              inZoneTime,
              belowZoneTime,
              aboveZoneTime,
              chartData: [...liveChartData.current],
            };
        });

      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status, sessionStartTime]);

  const handleStatusChange = (newStatus: SessionStatus) => {
    if (newStatus === 'running' && status !== 'running') {
      if (status === 'idle') {
        liveCadenceHistory.current = [];
        liveTargetCadenceHistory.current = [];
        liveChartData.current = [];
        setSummary(initialSummary);
        setSessionStartTime(Date.now());
      } else { // Resuming from pause
        setSessionStartTime(prev => prev ? Date.now() - (summary.sessionDuration * 1000) : Date.now());
      }
    }
    setStatus(newStatus);
  };

  const handleSelectPreset = (preset: Preset) => {
    setSettings(prev => ({ ...prev, ...preset.settings }));
    setActivePreset(preset.name);
    toast({
      title: 'Preset Loaded',
      description: `${preset.name} settings have been applied.`,
    });
  };
  
  const handleSettingsChange = (value: React.SetStateAction<CadenceSettings>) => {
    setSettings(value);
    setActivePreset(null);
  }

  return (
    <Card className="w-full max-w-lg mx-auto shadow-2xl bg-card/80 backdrop-blur-sm border-primary/20">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center gap-2 mb-2">
          <Footprints className="w-6 h-6 text-primary" />
          <CardTitle className="text-xl font-bold font-headline tracking-tighter">StrideSync</CardTitle>
        </div>
        <CardDescription>Your personal running cadence coach</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-8">
        {permission === 'granted' ? (
          <>
            <RealtimeDisplay
              cadence={cadence}
              targetCadence={currentTargetCadence}
              range={{ min: settings.min, max: settings.max }}
              status={status}
              isDynamic={settings.adjust}
            />
            <SummaryDisplay summary={summary} status={status} />
            <SessionControls 
              status={status} 
              onStatusChange={handleStatusChange} 
              onSimulateStep={simulateStep}
            />
            <CurrentSettingsDisplay settings={settings} activePreset={activePreset} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8 rounded-lg bg-muted/50">
            <AlertTriangle className="w-12 h-12 text-accent mb-4" />
            <h3 className="text-lg font-semibold mb-2">Motion Access Required</h3>
            <p className="text-muted-foreground mb-6">
              StrideSync needs access to your device's motion sensors to track your cadence.
            </p>
            <Button onClick={requestPermission} size="lg">
              Grant Access
            </Button>
            {permission === 'denied' && <p className="text-destructive text-sm mt-4">Permission was denied. You may need to grant it in your browser's settings.</p>}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <SettingsPanel
          settings={settings}
          setSettings={handleSettingsChange}
          presets={PRESETS}
          onSelectPreset={handleSelectPreset}
          disabled={status !== 'idle'}
        />
      </CardFooter>
    </Card>
  );
}
