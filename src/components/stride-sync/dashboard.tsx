"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCadenceTracker } from '@/hooks/use-cadence-tracker';
import type { CadenceSettings, SessionStatus, SummaryData, Preset } from '@/lib/types';
import SettingsPanel from './settings-panel';
import RealtimeDisplay from './realtime-display';
import SessionControls from './session-controls';
import SummaryDisplay from './summary-display';
import CurrentSettingsDisplay from './current-settings-display';
import { Footprints, AlertTriangle, StepForward, Loader } from 'lucide-react';
import { speak } from '@/ai/flows/tts-flow';

const PRESETS: Preset[] = [
    { name: 'Steady Run', settings: { min: 170, max: 180, adjust: false, announcementInterval: 0 } },
    { name: 'Intervals', settings: { min: 165, max: 185, adjust: true, holdLowDuration: 60, adjustUpRate: 5, adjustUpInterval: 15, holdHighDuration: 60, adjustDownRate: 5, adjustDownInterval: 15, announcementInterval: 60 } },
    { name: 'Pyramid', settings: { min: 160, max: 180, adjust: true, holdLowDuration: 30, adjustUpRate: 2, adjustUpInterval: 10, holdHighDuration: 30, adjustDownRate: 2, adjustDownInterval: 10, announcementInterval: 45 } },
    { name: 'Warm-up', settings: { min: 155, max: 170, adjust: false, announcementInterval: 0 } },
];

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
  });
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [summary, setSummary] = useState<SummaryData>({ totalSteps: 0, sessionDuration: 0, avgCadence: 0, avgTargetCadence: 0, inZoneTime: 0 });
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);


  const { toast } = useToast();
  const { cadence, permission, error, requestPermission, currentTargetCadence, totalSteps, simulateStep } = useCadenceTracker({ settings, status });
  
  const cadences = useMemo(() => [], []);
  const targetCadences = useMemo(() => [], []);
  const inZoneTimestamps = useMemo(() => [], []);

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
    if (audioUrl && audioRef.current) {
        audioRef.current.play().catch(e => console.error("Audio playback failed", e));
    }
  }, [audioUrl]);

  useEffect(() => {
    if (status !== 'running' || !settings.announcementInterval || settings.announcementInterval === 0) {
      return;
    }

    const handleAnnouncement = async () => {
      if (summary.avgCadence > 0 && !isGeneratingSpeech) {
        const textToSpeak = `Average cadence is ${Math.round(summary.avgCadence)} steps per minute.`;
        setIsGeneratingSpeech(true);
        try {
          const result = await speak(textToSpeak);
          setAudioUrl(result.media);
        } catch (e) {
          console.error("TTS failed", e);
          toast({ variant: 'destructive', title: 'TTS Error', description: 'Could not generate audio announcement.' });
        } finally {
            setIsGeneratingSpeech(false);
        }
      }
    };

    const interval = setInterval(handleAnnouncement, settings.announcementInterval * 1000);
    return () => clearInterval(interval);
  }, [status, settings.announcementInterval, summary.avgCadence, toast, isGeneratingSpeech]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (status === 'running' && sessionStartTime) {
      interval = setInterval(() => {
        const duration = (Date.now() - sessionStartTime) / 1000;
        setSummary(prev => ({ ...prev, sessionDuration: duration, totalSteps }));

        if (cadence > 0) cadences.push(cadence);
        if (currentTargetCadence > 0) targetCadences.push(currentTargetCadence);
        const inZone = cadence >= settings.min && cadence <= settings.max;
        if(inZone) inZoneTimestamps.push(Date.now());

        const avgCadence = cadences.length ? cadences.reduce((a, b) => a + b, 0) / cadences.length : 0;
        const avgTargetCadence = targetCadences.length ? targetCadences.reduce((a, b) => a + b, 0) / targetCadences.length : 0;
        const inZoneTime = inZoneTimestamps.length ? (inZoneTimestamps.length) * 1 : 0; // Assuming 1s interval

        setSummary(prev => ({
          ...prev,
          avgCadence: avgCadence,
          avgTargetCadence: Math.round(avgTargetCadence),
          inZoneTime,
        }));

      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status, sessionStartTime, cadence, settings, totalSteps, currentTargetCadence, cadences, targetCadences, inZoneTimestamps]);

  const handleStatusChange = (newStatus: SessionStatus) => {
    if (newStatus === 'running' && status !== 'running') {
      if (status === 'idle') {
        setSessionStartTime(Date.now());
        setSummary({ totalSteps: 0, sessionDuration: 0, avgCadence: 0, avgTargetCadence: 0, inZoneTime: 0 });
        cadences.length = 0;
        targetCadences.length = 0;
        inZoneTimestamps.length = 0;
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
          <Footprints className="w-8 h-8 text-primary" />
          <CardTitle className="text-4xl font-bold font-headline tracking-tighter">StrideSync</CardTitle>
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
            />
            <SummaryDisplay summary={summary} status={status} />
            <SessionControls status={status} onStatusChange={handleStatusChange} />
             <div className="flex items-center justify-center gap-4 mt-2">
                <Button onClick={simulateStep} variant="outline" size="sm" disabled={status !== 'running'}>
                    <StepForward className="mr-2 h-4 w-4" />
                    Simulate Step
                </Button>
                {isGeneratingSpeech && <Loader className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
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
      <audio ref={audioRef} src={audioUrl || ''} className="hidden" />
    </Card>
  );
}
