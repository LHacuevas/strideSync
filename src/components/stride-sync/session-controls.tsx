"use client";

import { Button } from '@/components/ui/button';
import type { SessionStatus } from '@/lib/types';
import { Play, Pause, Square, SkipForward, StepForward } from 'lucide-react';

interface SessionControlsProps {
  status: SessionStatus;
  onStatusChange: (status: SessionStatus) => void;
  onSimulateStep: () => void;
}

export default function SessionControls({ status, onStatusChange, onSimulateStep }: SessionControlsProps) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 w-full">
      {status === 'idle' && (
        <Button onClick={() => onStatusChange('running')} size="lg" className="flex-1 sm:flex-auto sm:w-48">
          <Play className="h-5 w-5" />
          <span className="hidden sm:inline">Start Session</span>
        </Button>
      )}

      {status === 'running' && (
        <>
          <Button onClick={() => onStatusChange('paused')} size="lg" variant="outline" className="flex-1 sm:flex-auto">
            <Pause className="h-5 w-5" />
            <span className="hidden sm:inline">Pause</span>
          </Button>
          <Button onClick={() => onStatusChange('idle')} size="lg" variant="destructive" className="flex-1 sm:flex-auto">
            <Square className="h-5 w-5" />
            <span className="hidden sm:inline">Stop</span>
          </Button>
          <Button onClick={onSimulateStep} variant="secondary" size="lg" className="flex-1 sm:flex-auto">
              <StepForward className="h-4 w-4" />
              <span className="hidden sm:inline">Simulate</span>
          </Button>
        </>
      )}

      {status === 'paused' && (
        <>
          <Button onClick={() => onStatusChange('running')} size="lg" variant="outline" className="flex-1 sm:flex-auto sm:w-36">
            <SkipForward className="h-5 w-5" />
            <span className="hidden sm:inline">Resume</span>
          </Button>
          <Button onClick={() => onStatusChange('idle')} size="lg" variant="destructive" className="flex-1 sm:flex-auto sm:w-36">
            <Square className="h-5 w-5" />
            <span className="hidden sm:inline">Stop</span>
          </Button>
        </>
      )}
    </div>
  );
}
