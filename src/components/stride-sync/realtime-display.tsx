"use client";

import { cn } from "@/lib/utils";
import type { SessionStatus } from "@/lib/types";
import { Progress } from "@/components/ui/progress";
import { Target } from "lucide-react";

interface RealtimeDisplayProps {
  cadence: number;
  targetCadence: number;
  range: { min: number; max: number };
  status: SessionStatus;
  isDynamic: boolean;
}

export default function RealtimeDisplay({ cadence, targetCadence, range, status, isDynamic }: RealtimeDisplayProps) {
  const zoneMargin = 3;
  const inZone = status === 'running' && Math.abs(cadence - targetCadence) <= zoneMargin;
  const isIdle = status === 'idle';

  const progress = isIdle ? 50 : Math.max(0, Math.min(100, ((cadence - range.min) / (range.max - range.min)) * 100));

  const colorClass = isIdle
    ? "text-muted-foreground"
    : inZone
    ? "text-primary"
    : "text-accent";

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="relative">
        <div
          className={cn(
            "text-8xl md:text-9xl font-bold tracking-tighter transition-colors duration-300",
            colorClass
          )}
        >
          {isIdle ? '...' : cadence}
        </div>
        <div className="absolute -bottom-2 w-full text-center text-lg font-medium text-muted-foreground">SPM</div>
        {inZone && status === 'running' && (
          <div className="absolute inset-0 -z-10 bg-primary/20 rounded-full animate-pulse blur-2xl"></div>
        )}
      </div>

      <div className="w-full max-w-xs space-y-2">
         <div className="flex items-center justify-center gap-2 font-medium text-muted-foreground">
            <Target className="w-4 h-4" />
            <span>Target: {Math.round(targetCadence)} SPM {isDynamic && `(${range.min}-${range.max})`}</span>
         </div>
        <Progress value={progress} className={cn("h-3 transition-all", inZone && status !== 'idle' ? "[&>div]:bg-primary" : "[&>div]:bg-accent")} />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{range.min}</span>
          <span>{range.max}</span>
        </div>
      </div>
    </div>
  );
}
