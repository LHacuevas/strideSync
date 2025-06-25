"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Tone from 'tone';
import type { CadenceSettings, SessionStatus } from '@/lib/types';

type PermissionState = 'prompt' | 'granted' | 'denied';

interface CadenceTrackerProps {
  settings: CadenceSettings;
  status: 'idle' | 'running' | 'paused';
}

const STEP_DETECTION_THRESHOLD = 2.0; // Adjusted for filtered acceleration magnitude
const STEP_COOLDOWN_MS = 200; // 300 SPM max

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

  // Refs for more robust step detection
  const gravity = useRef([0, 0, 0]);
  const lastMagnitude = useRef(0);

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
    // Standard permission request for DeviceMotion and DeviceOrientation which is required on iOS 13+
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
      // Requesting both seems to be more reliable in triggering the prompt.
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

    // We use `acceleration` which includes gravity, and then filter gravity out.
    const acc = event.acceleration;

    if (acc && acc.x != null && acc.y != null && acc.z != null) {
      const alpha = 0.8; // High-pass filter coefficient.

      // Isolate gravity from the sensor reading using a low-pass filter.
      gravity.current[0] = alpha * gravity.current[0] + (1 - alpha) * acc.x;
      gravity.current[1] = alpha * gravity.current[1] + (1 - alpha) * acc.y;
      gravity.current[2] = alpha * gravity.current[2] + (1 - alpha) * acc.z;

      // Remove the gravity component to get linear acceleration.
      const linearAcceleration = {
        x: acc.x - gravity.current[0],
        y: acc.y - gravity.current[1],
        z: acc.z - gravity.current[2],
      };
      
      const magnitude = Math.sqrt(
        linearAcceleration.x ** 2 +
        linearAcceleration.y ** 2 +
        linearAcceleration.z ** 2
      );

      // Simple peak detection: Look for a significant rise in acceleration magnitude.
      const now = Date.now();
      if (magnitude > STEP_DETECTION_THRESHOLD && lastMagnitude.current <= STEP_DETECTION_THRESHOLD) {
          if (now - lastStepTime.current > STEP_COOLDOWN_MS) {
            lastStepTime.current = now;
            stepTimestamps.current.push(now);
          }
      }
      lastMagnitude.current = magnitude;
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
    } else {
      lastMagnitude.current = 0;
      gravity.current = [0, 0, 0];
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
      // Add a listener for device motion events. 'true' for capture phase.
      window.addEventListener('devicemotion', handleMotionEvent, true);
      // Ensure the audio context is running
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
      // Use the initial target cadence for the loop setup. It will be updated by the other effect.
      const initialTarget = settings.adjust ? settings.min : (settings.min + settings.max) / 2;
      const initialInterval = initialTarget > 0 ? (60 / initialTarget) * beatMultiplier : 1;

      metronomeLoop.current = new Tone.Loop(time => {
        synth.current?.triggerAttackRelease(noteRef.current, '8n', time);
      }, `${initialInterval}s`).start(0);

      Tone.Transport.start();
    } else {
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

  return { cadence, permission, error, requestPermission, currentTargetCadence, totalSteps: stepTimestamps.current.length, simulateStep };
}
