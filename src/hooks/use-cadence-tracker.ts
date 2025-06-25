"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Tone from 'tone';

type PermissionState = 'prompt' | 'granted' | 'denied';

interface CadenceTrackerProps {
  settings: {
    min: number;
    max: number;
    adjust: boolean;
    adjustRate: number;
    adjustDuration: number;
  };
  status: 'idle' | 'running' | 'paused';
}

const STEP_DETECTION_THRESHOLD = 15;
const STEP_COOLDOWN_MS = 200; 

export function useCadenceTracker({ settings, status }: CadenceTrackerProps) {
  const [permission, setPermission] = useState<PermissionState>('prompt');
  const [cadence, setCadence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentTargetCadence, setCurrentTargetCadence] = useState((settings.min + settings.max) / 2);
  
  const lastStepTime = useRef(0);
  const stepTimestamps = useRef<number[]>([]);
  
  const synth = useRef<Tone.Synth | null>(null);
  const metronomeLoop = useRef<Tone.Loop | null>(null);
  const adjustmentInterval = useRef<NodeJS.Timeout | null>(null);

  const requestPermission = useCallback(async () => {
    if (typeof (DeviceMotionEvent as any).requestPermission !== 'function') {
      // For non-iOS 13+ browsers
      setPermission('granted');
      return;
    }
    try {
      const permissionState = await (DeviceMotionEvent as any).requestPermission();
      if (permissionState === 'granted') {
        setPermission('granted');
      } else {
        setPermission('denied');
        setError('Motion access denied. Please enable it in your browser settings.');
      }
    } catch (err) {
      setError('Error requesting motion permission.');
      console.error(err);
    }
  }, []);

  const handleMotionEvent = useCallback((event: DeviceMotionEvent) => {
    const { accelerationIncludingGravity } = event;
    if (!accelerationIncludingGravity) return;
  
    const y = accelerationIncludingGravity.y;
    if (y === null) return;
  
    const now = Date.now();
    if (y > STEP_DETECTION_THRESHOLD && now - lastStepTime.current > STEP_COOLDOWN_MS) {
      lastStepTime.current = now;
      stepTimestamps.current.push(now);
      
      const oneMinuteAgo = now - 60000;
      stepTimestamps.current = stepTimestamps.current.filter(ts => ts > oneMinuteAgo);
      
      const recentSteps = stepTimestamps.current.filter(ts => ts > now - 5000);
      if (recentSteps.length > 1) {
        const durationSeconds = (now - recentSteps[0]) / 1000;
        const newCadence = Math.round((recentSteps.length / durationSeconds) * 60);
        setCadence(newCadence);
      }
    }
  }, []);

  const startDynamicAdjustment = useCallback(() => {
    if (adjustmentInterval.current) clearInterval(adjustmentInterval.current);
    if (!settings.adjust || settings.adjustDuration <= 0) {
      setCurrentTargetCadence((settings.min + settings.max) / 2);
      return;
    };

    const initialTarget = (settings.min + settings.max) / 2;
    const finalTarget = initialTarget * (1 + settings.adjustRate / 100);
    const totalChange = finalTarget - initialTarget;
    const updatesPerSecond = 1;
    const totalUpdates = settings.adjustDuration * 60 * updatesPerSecond;
    const changePerUpdate = totalChange / totalUpdates;
    
    let currentTarget = initialTarget;
    setCurrentTargetCadence(currentTarget);

    adjustmentInterval.current = setInterval(() => {
      currentTarget += changePerUpdate;
      if ((changePerUpdate > 0 && currentTarget >= finalTarget) || (changePerUpdate < 0 && currentTarget <= finalTarget)) {
        currentTarget = finalTarget;
        if (adjustmentInterval.current) clearInterval(adjustmentInterval.current);
      }
      setCurrentTargetCadence(currentTarget);
    }, 1000 / updatesPerSecond);

  }, [settings]);

  useEffect(() => {
    if (status === 'running' && permission === 'granted') {
      window.addEventListener('devicemotion', handleMotionEvent);
      Tone.start();

      if (!synth.current) {
        synth.current = new Tone.Synth().toDestination();
      }
      
      startDynamicAdjustment();
      
      metronomeLoop.current = new Tone.Loop(time => {
        const inZone = cadence >= settings.min && cadence <= settings.max;
        synth.current?.triggerAttackRelease(inZone ? 'C5' : 'G4', '8n', time);
      }, `${60 / currentTargetCadence}s`).start(0);

      Tone.Transport.start();
    } else {
      window.removeEventListener('devicemotion', handleMotionEvent);
      Tone.Transport.pause();
      if (metronomeLoop.current) {
        metronomeLoop.current.stop(0).dispose();
        metronomeLoop.current = null;
      }
      if (adjustmentInterval.current) {
        clearInterval(adjustmentInterval.current);
        adjustmentInterval.current = null;
      }
      if (status === 'idle') {
        stepTimestamps.current = [];
        setCadence(0);
        setCurrentTargetCadence((settings.min + settings.max) / 2);
      }
    }
    
    return () => {
      window.removeEventListener('devicemotion', handleMotionEvent);
      if (metronomeLoop.current) {
        metronomeLoop.current.stop(0).dispose();
      }
      if (adjustmentInterval.current) {
        clearInterval(adjustmentInterval.current);
      }
      if (status === 'idle' && synth.current) {
        synth.current.dispose();
        synth.current = null;
      }
    };
  }, [status, permission, settings, handleMotionEvent, startDynamicAdjustment]);

  useEffect(() => {
    if (status === 'running' && metronomeLoop.current) {
      metronomeLoop.current.interval = `${60 / currentTargetCadence}s`;
    }
  }, [currentTargetCadence, status]);

  return { cadence, permission, error, requestPermission, currentTargetCadence, totalSteps: stepTimestamps.current.length };
}
