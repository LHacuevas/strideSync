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
    <div className="flex items-center justify-center gap-4 flex-wrap">
      {status === 'idle' && (
        <Button onClick={() => onStatusChange('running')} size="lg" className="w-48">
          <Play className="mr-2 h-5 w-5" />
          Start Session
        </Button>
      )}

      {status === 'running' && (
        <>
          <Button onClick={() => onStatusChange('paused')} size="lg" variant="outline">
            <Pause className="mr-2 h-5 w-5" />
            Pause
          </Button>
          <Button onClick={() => onStatusChange('idle')} size="lg" variant="destructive">
            <Square className="mr-2 h-5 w-5" />
            Stop
          </Button>
          <Button onClick={onSimulateStep} variant="secondary" size="lg">
              <StepForward className="mr-2 h-4 w-4" />
              Simulate
          </Button>
        </>
      )}

      {status === 'paused' && (
        <>
          <Button onClick={() => onStatusChange('running')} size="lg" variant="outline" className="w-36">
            <SkipForward className="mr-2 h-5 w-5" />
            Resume
          </Button>
          <Button onClick={() => onStatusChange('idle')} size="lg" variant="destructive" className="w-36">
            <Square className="mr-2 h-5 w-5" />
            Stop
          </Button>
        </>
      )}
    </div>
  );
}
