"use client";

import type { CadenceSettings } from '@/lib/types';
import { Settings, ArrowDown, ArrowUp, Timer } from 'lucide-react';

interface CurrentSettingsDisplayProps {
  settings: CadenceSettings;
}

export default function CurrentSettingsDisplay({ settings }: CurrentSettingsDisplayProps) {
  return (
    <div className="mt-6 text-xs text-muted-foreground p-3 rounded-lg bg-muted/50 border border-dashed border-border">
      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Settings className="w-4 h-4" /> Current Configuration</h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <p><strong>Range:</strong> {settings.min} - {settings.max} SPM</p>
        <p><strong>Mode:</strong> {settings.adjust ? 'Dynamic' : 'Static'}</p>
        {settings.adjust && (
          <>
            <p className="flex items-center gap-1"><Timer className="w-3 h-3"/><strong>Hold Low:</strong> {settings.holdLowDuration}s</p>
            <p className="flex items-center gap-1"><Timer className="w-3 h-3"/><strong>Hold High:</strong> {settings.holdHighDuration}s</p>
            <p className="flex items-center gap-1"><ArrowUp className="w-3 h-3"/><strong>Increase:</strong> +{settings.adjustUpRate} SPM / {settings.adjustUpInterval}s</p>
            <p className="flex items-center gap-1"><ArrowDown className="w-3 h-3"/><strong>Decrease:</strong> -{settings.adjustDownRate} SPM / {settings.adjustDownInterval}s</p>
          </>
        )}
      </div>
    </div>
  );
}
