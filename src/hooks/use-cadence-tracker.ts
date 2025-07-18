"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Tone from 'tone';
import type { CadenceSettings, SessionStatus } from '@/lib/types';

type PermissionState = 'prompt' | 'granted' | 'denied';

interface CadenceTrackerProps {
  settings: CadenceSettings;
  status: 'idle' | 'running' | 'paused';
}

const STEP_DETECTION_THRESHOLD = 1.5; 
const STEP_COOLDOWN_MS = 200; // Corresponds to a max of 300 SPM

export function useCadenceTracker({ settings, status }: CadenceTrackerProps) {
  const [permission, setPermission] = useState<PermissionState>('prompt');
  const [cadence, setCadence] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentTargetCadence, setCurrentTargetCadence] = useState(settings.min);
  
  const lastStepTime = useRef(0);
  const stepTimestamps = useRef<number[]>([]);
  
  const synths = useRef<{
    inZone: Tone.Synth | null;
    belowZone: Tone.MembraneSynth | null;
    aboveZone: Tone.Synth | null;
  }>({ inZone: null, belowZone: null, aboveZone: null });

  const zoneRef = useRef<'in' | 'below' | 'above'>('in');
  const adjustmentTimeout = useRef<NodeJS.Timeout | null>(null);
  const metronomeLoop = useRef<Tone.Loop | null>(null);
  
  const wakeLock = useRef<any>(null); // WakeLockSentinel
  const lowPassFilter = useRef([0, 0, 0]);

  const cadenceRef = useRef(0);
  useEffect(() => { cadenceRef.current = cadence; }, [cadence]);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('strideSyncPermissionGranted') === 'true') {
      setTimeout(() => setPermission('granted'), 0);
    }
  }, []);

  // Determine which sound to play based on cadence vs target range
  useEffect(() => {
    let currentZone: 'in' | 'below' | 'above' = 'in';
    if (status === 'running' && cadence >= 140) {
      if (cadence < settings.min) {
        currentZone = 'below';
      } else if (cadence > settings.max) {
        currentZone = 'above';
      }
    }
    zoneRef.current = currentZone;
  }, [cadence, settings.min, settings.max, status]);


  const requestPermission = useCallback(async () => {
    const requestMotionPermission = async () => {
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        return await (DeviceMotionEvent as any).requestPermission();
      }
      return 'granted';
    };
    
    try {
      await Tone.start();
      const motionState = await requestMotionPermission();

      if (motionState === 'granted') {
        setPermission('granted');
        localStorage.setItem('strideSyncPermissionGranted', 'true');
      } else {
        setPermission('denied');
        setError('Motion access denied. You may need to grant it in your browser\'s settings.');
      }
    } catch (err) {
      setError('Error requesting permissions.');
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
    if (status !== 'running' || !event.acceleration) return;

    const acc = event.acceleration;
    if (acc && acc.x != null && acc.y != null && acc.z != null) {
        const alpha = 0.8;
        const [lx, ly, lz] = lowPassFilter.current;

        const gravityX = alpha * lx + (1 - alpha) * acc.x;
        const gravityY = alpha * ly + (1 - alpha) * acc.y;
        const gravityZ = alpha * lz + (1 - alpha) * acc.z;

        lowPassFilter.current = [gravityX, gravityY, gravityZ];

        const linearAccelerationX = acc.x - gravityX;
        const linearAccelerationY = acc.y - gravityY;
        const linearAccelerationZ = acc.z - gravityZ;
        
        const magnitude = Math.sqrt(linearAccelerationX**2 + linearAccelerationY**2 + linearAccelerationZ**2);
        
        const now = Date.now();
        if (magnitude > STEP_DETECTION_THRESHOLD && now - lastStepTime.current > STEP_COOLDOWN_MS) {
            lastStepTime.current = now;
            stepTimestamps.current.push(now);
            setTotalSteps(s => s + 1);
        }
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
    }
    return () => clearInterval(interval);
  }, [status, calculateCadence]);

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
          } catch (err: any) {
            console.log(`Could not acquire screen wake lock: ${err.name}. This is expected on some platforms and does not prevent the app from working.`);
          }
        }
      };
      acquireLock();

      window.addEventListener('devicemotion', handleMotionEvent, true);
      
      if (!synths.current.inZone) {
        synths.current.inZone = new Tone.Synth().toDestination();
        synths.current.belowZone = new Tone.MembraneSynth({ pitchDecay: 0.1, octaves: 2 }).toDestination();
        synths.current.aboveZone = new Tone.Synth({ oscillator: { type: 'triangle' } }).toDestination();
      }

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
            const { inZone, belowZone, aboveZone } = synths.current;
            switch (zoneRef.current) {
                case 'below':
                    belowZone?.triggerAttackRelease('C1', '8n', time); // Low drum-like sound
                    break;
                case 'above':
                    aboveZone?.triggerAttackRelease('A5', '8n', time); // High pitched, distinct sound
                    break;
                case 'in':
                default:
                    inZone?.triggerAttackRelease('C5', '8n', time); // Neutral click
                    break;
            }
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
        if (synths.current.inZone) {
          synths.current.inZone.dispose();
          synths.current.belowZone?.dispose();
          synths.current.aboveZone?.dispose();
          synths.current.inZone = null;
          synths.current.belowZone = null;
          synths.current.aboveZone = null;
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
      if (status === 'idle' && synths.current.inZone) {
          synths.current.inZone.dispose();
          synths.current.belowZone?.dispose();
          synths.current.aboveZone?.dispose();
          synths.current.inZone = null;
          synths.current.belowZone = null;
          synths.current.aboveZone = null;
      }
    };
  }, [status, permission, settings, handleMotionEvent, speakText, calculateCadence]);

  useEffect(() => {
    if (status === 'running' && metronomeLoop.current && currentTargetCadence > 0) {
        const beatMultiplier = settings.beatFrequency === 'cycle' ? 2 : 1;
        metronomeLoop.current.interval = (60 / currentTargetCadence) * beatMultiplier;
    }
  }, [currentTargetCadence, status, settings.beatFrequency]);

  return { cadence, permission, error, requestPermission, currentTargetCadence, totalSteps, simulateStep };
}
