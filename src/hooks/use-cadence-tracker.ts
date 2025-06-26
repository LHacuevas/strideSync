"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Tone from 'tone';
import type { CadenceSettings, SessionStatus } from '@/lib/types';

type PermissionState = 'prompt' | 'granted' | 'denied';

interface CadenceTrackerProps {
  settings: CadenceSettings;
  status: 'idle' | 'running' | 'paused';
}

const STEP_DETECTION_THRESHOLD = 15; // m/s^2, for accelerationIncludingGravity
const STEP_COOLDOWN_MS = 200; // Corresponds to a max of 300 SPM

export function useCadenceTracker({ settings, status }: CadenceTrackerProps) {
  const [permission, setPermission] = useState<PermissionState>('prompt');
  const [cadence, setCadence] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentTargetCadence, setCurrentTargetCadence] = useState(settings.min);
  
  const lastStepTime = useRef(0);
  const stepTimestamps = useRef<number[]>([]);
  
  const synth = useRef<Tone.Synth | null>(null);
  const metronomeLoop = useRef<Tone.Loop | null>(null);
  const adjustmentTimeout = useRef<NodeJS.Timeout | null>(null);
  const noteRef = useRef('C5'); // For metronome tone
  const lastMagnitude = useRef(0);
  const wakeLock = useRef<any>(null); // WakeLockSentinel

  const cadenceRef = useRef(0);
  useEffect(() => { cadenceRef.current = cadence; }, [cadence]);

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
    const requestMotionPermission = async () => {
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        return await (DeviceMotionEvent as any).requestPermission();
      }
      return 'granted';
    };
    
    const requestOrientationPermission = async () => {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        return await (DeviceOrientationEvent as any).requestPermission();
      }
      return 'granted';
    };

    try {
      const [motionState, orientationState] = await Promise.all([
          requestMotionPermission(),
          requestOrientationPermission()
      ]);

      if (motionState === 'granted' && orientationState === 'granted') {
        setPermission('granted');
      } else {
        setPermission('denied');
        setError('Motion access denied. You may need to grant it in your browser\'s settings.');
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

    const acc = event.accelerationIncludingGravity;

    if (acc && acc.x != null && acc.y != null && acc.z != null) {
      const magnitude = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
      const now = Date.now();

      if (magnitude > STEP_DETECTION_THRESHOLD && lastMagnitude.current <= STEP_DETECTION_THRESHOLD) {
          if (now - lastStepTime.current > STEP_COOLDOWN_MS) {
            lastStepTime.current = now;
            stepTimestamps.current.push(now);
            setTotalSteps(s => s + 1);
          }
      }
      lastMagnitude.current = magnitude;
    }
  }, [status]);

  const simulateStep = useCallback(() => {
    if (status !== 'running') return;
    const now = Date.now();
    if (now - lastStepTime.current > STEP_COOLDOWN_MS) {
        lastStepTime.current = now;
        stepTimestamps.current.push(now);
        setTotalSteps(s => s + 1);
    }
  }, [status]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (status === 'running') {
      interval = setInterval(calculateCadence, 1000);
    } else {
      lastMagnitude.current = 0;
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
                        speakText('Hold');
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
                        speakText('Hold');
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
      const acquireLock = async () => {
        if ('wakeLock' in navigator) {
          try {
            wakeLock.current = await navigator.wakeLock.request('screen');
            console.log('Screen Wake Lock is active.');
          } catch (err: any) {
            console.error(`Failed to acquire wake lock: ${err.name}, ${err.message}`);
          }
        }
      };
      acquireLock();

      window.addEventListener('devicemotion', handleMotionEvent, true);
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
      const initialTarget = settings.adjust ? settings.min : (settings.min + settings.max) / 2;
      const initialInterval = initialTarget > 0 ? (60 / initialTarget) * beatMultiplier : 1;

      metronomeLoop.current = new Tone.Loop(time => {
        if (cadenceRef.current >= 140) {
            synth.current?.triggerAttackRelease(noteRef.current, '8n', time);
        }
      }, `${initialInterval}s`).start(0);

      Tone.Transport.start();
    } else {
      const releaseLock = async () => {
        if (wakeLock.current) {
          await wakeLock.current.release();
          wakeLock.current = null;
        }
      };
      releaseLock();
      
      window.removeEventListener('devicemotion', handleMotionEvent, true);
      Tone.Transport.pause();
      clearAdjustment();
      if (metronomeLoop.current) {
        metronomeLoop.current.stop(0).dispose();
        metronomeLoop.current = null;
      }
      if (status === 'idle') {
        stepTimestamps.current = [];
        setCadence(0);
        setTotalSteps(0);
        setCurrentTargetCadence(settings.min);
        if (synth.current) {
          synth.current.dispose();
          synth.current = null;
        }
      }
    }
    
    return () => {
      window.removeEventListener('devicemotion', handleMotionEvent, true);
      if (metronomeLoop.current) {
        metronomeLoop.current.stop(0).dispose();
      }
      clearAdjustment();
      const releaseLock = async () => {
        if (wakeLock.current) {
          await wakeLock.current.release();
          wakeLock.current = null;
        }
      };
      releaseLock();
      if (status === 'idle' && synth.current) {
        synth.current.dispose();
        synth.current = null;
      }
    };
  }, [status, permission, settings, handleMotionEvent, speakText]);

  useEffect(() => {
    if (status === 'running' && metronomeLoop.current && currentTargetCadence > 0) {
        const beatMultiplier = settings.beatFrequency === 'cycle' ? 2 : 1;
        metronomeLoop.current.interval = (60 / currentTargetCadence) * beatMultiplier;
    }
  }, [currentTargetCadence, status, settings.beatFrequency]);

  return { cadence, permission, error, requestPermission, currentTargetCadence, totalSteps, simulateStep };
}
