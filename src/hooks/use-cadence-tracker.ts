"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Tone from 'tone';
import type { CadenceSettings, SessionStatus } from '@/lib/types';

type PermissionState = 'prompt' | 'granted' | 'denied';

interface CadenceTrackerProps {
  settings: CadenceSettings;
  status: 'idle' | 'running' | 'paused';
}

const STEP_DETECTION_THRESHOLD = 15;
const STEP_COOLDOWN_MS = 200; 

export function useCadenceTracker({ settings, status }: CadenceTrackerProps) {
  const [permission, setPermission] = useState<PermissionState>('prompt');
  const [cadence, setCadence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentTargetCadence, setCurrentTargetCadence] = useState(settings.min);
  
  const lastStepTime = useRef(0);
  const stepTimestamps = useRef<number[]>([]);
  
  const synth = useRef<Tone.Synth | null>(null);
  const metronomeLoop = useRef<Tone.Loop | null>(null);
  const adjustmentTimeout = useRef<NodeJS.Timeout | null>(null);
  const noteRef = useRef('C5'); // For metronome tone

  const speakText = useCallback((text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    } else {
        console.error("Browser does not support Speech Synthesis.");
    }
  }, []);

  useEffect(() => {
    let note = 'C5'; // In-zone / Default
    const zoneMargin = 3;
    if (status === 'running' && cadence > 0 && currentTargetCadence > 0) {
      if (cadence < currentTargetCadence - zoneMargin) {
        note = 'G4'; // Below zone
      } else if (cadence > currentTargetCadence + zoneMargin) {
        note = 'E5'; // Above zone
      }
    }
    noteRef.current = note;
  }, [cadence, currentTargetCadence, status]);

  const requestPermission = useCallback(async () => {
    if (typeof (DeviceMotionEvent as any).requestPermission !== 'function') {
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

  const calculateCadence = useCallback(() => {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    stepTimestamps.current = stepTimestamps.current.filter(ts => ts > oneMinuteAgo);
    
    const recentSteps = stepTimestamps.current.filter(ts => ts > now - 5000);
    if (recentSteps.length > 1) {
      const durationSeconds = (now - recentSteps[0]) / 1000;
      const newCadence = Math.round((recentSteps.length / durationSeconds) * 60);
      setCadence(newCadence);
    } else if (stepTimestamps.current.length === 0) {
      setCadence(0);
    }
  }, []);
  
  const handleMotionEvent = useCallback((event: DeviceMotionEvent) => {
    if (status !== 'running') return;

    const acceleration = event.accelerationIncludingGravity;
    if (acceleration && acceleration.y) {
      // Simple peak detection on the y-axis
      if (Math.abs(acceleration.y) > STEP_DETECTION_THRESHOLD) {
        const now = Date.now();
        if (now - lastStepTime.current > STEP_COOLDOWN_MS) {
          lastStepTime.current = now;
          stepTimestamps.current.push(now);
        }
      }
    }
  }, [status]);

  const simulateStep = useCallback(() => {
    const now = Date.now();
    if (now - lastStepTime.current > STEP_COOLDOWN_MS) {
        lastStepTime.current = now;
        stepTimestamps.current.push(now);
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (status === 'running') {
      interval = setInterval(calculateCadence, 1000);
    }
    return () => clearInterval(interval);
  }, [status, calculateCadence]);


  useEffect(() => {
    const clearAdjustment = () => {
      if (adjustmentTimeout.current) {
        clearTimeout(adjustmentTimeout.current);
        adjustmentTimeout.current = null;
      }
    };

    const schedule = (callback: () => void, delaySeconds: number) => {
      clearAdjustment();
      if (delaySeconds > 0) {
        adjustmentTimeout.current = setTimeout(callback, delaySeconds * 1000);
      }
    };

    let adjustmentState: 'holding-low' | 'increasing' | 'holding-high' | 'decreasing' = 'holding-low';

    const tick = () => {
        switch (adjustmentState) {
            case 'holding-low':
                adjustmentState = 'increasing';
                speakText('Up');
                schedule(tick, settings.holdLowDuration);
                break;
            case 'increasing':
                setCurrentTargetCadence(prev => {
                    const nextTarget = prev + settings.adjustUpRate;
                    if (nextTarget >= settings.max) {
                        adjustmentState = 'holding-high';
                        schedule(tick, settings.holdHighDuration);
                        return settings.max;
                    } else {
                        schedule(tick, settings.adjustUpInterval);
                        return nextTarget;
                    }
                });
                break;
            case 'holding-high':
                adjustmentState = 'decreasing';
                speakText('Down');
                schedule(tick, settings.holdHighDuration);
                break;
            case 'decreasing':
                setCurrentTargetCadence(prev => {
                    const nextTarget = prev - settings.adjustDownRate;
                    if (nextTarget <= settings.min) {
                        adjustmentState = 'holding-low';
                        schedule(tick, settings.holdLowDuration);
                        return settings.min;
                    } else {
                        schedule(tick, settings.adjustDownInterval);
                        return nextTarget;
                    }
                });
                break;
        }
    };

    if (status === 'running' && permission === 'granted') {
      window.addEventListener('devicemotion', handleMotionEvent);
      Tone.start();
      if (!synth.current) synth.current = new Tone.Synth().toDestination();

      if (settings.adjust) {
        adjustmentState = 'holding-low';
        setCurrentTargetCadence(settings.min);
        schedule(tick, 0.1); 
      } else {
        setCurrentTargetCadence((settings.min + settings.max) / 2);
      }
      
      const beatMultiplier = settings.beatFrequency === 'cycle' ? 2 : 1;
      metronomeLoop.current = new Tone.Loop(time => {
        synth.current?.triggerAttackRelease(noteRef.current, '8n', time);
      }, `${(60 / currentTargetCadence) * beatMultiplier}s`).start(0);

      Tone.Transport.start();
    } else {
      window.removeEventListener('devicemotion', handleMotionEvent);
      Tone.Transport.pause();
      clearAdjustment();
      if (metronomeLoop.current) {
        metronomeLoop.current.stop(0).dispose();
        metronomeLoop.current = null;
      }
      if (status === 'idle') {
        stepTimestamps.current = [];
        setCadence(0);
        setCurrentTargetCadence(settings.min);
        if (synth.current) {
          synth.current.dispose();
          synth.current = null;
        }
      }
    }
    
    return () => {
      window.removeEventListener('devicemotion', handleMotionEvent);
      if (metronomeLoop.current) {
        metronomeLoop.current.stop(0).dispose();
      }
      clearAdjustment();
      if (status === 'idle' && synth.current) {
        synth.current.dispose();
        synth.current = null;
      }
    };
  }, [status, permission, settings, handleMotionEvent, speakText]);

  useEffect(() => {
    if (status === 'running' && metronomeLoop.current && currentTargetCadence > 0) {
        const beatMultiplier = settings.beatFrequency === 'cycle' ? 2 : 1;
        metronomeLoop.current.interval = `${(60 / currentTargetCadence) * beatMultiplier}s`;
    }
  }, [currentTargetCadence, status, settings.beatFrequency]);

  return { cadence, permission, error, requestPermission, currentTargetCadence, totalSteps: stepTimestamps.current.length, simulateStep };
}
