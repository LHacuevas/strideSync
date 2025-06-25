"use client";

import type { CadenceSettings, Preset } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Settings, Zap, ChevronsUpDown } from 'lucide-react';

interface SettingsPanelProps {
  settings: CadenceSettings;
  setSettings: React.Dispatch<React.SetStateAction<CadenceSettings>>;
  presets: Preset[];
  onSelectPreset: (preset: Preset) => void;
  disabled: boolean;
}

export default function SettingsPanel({ settings, setSettings, presets, onSelectPreset, disabled }: SettingsPanelProps) {
  return (
    <Accordion type="single" collapsible className="w-full" disabled={disabled}>
      <AccordionItem value="settings">
        <AccordionTrigger className="text-lg font-semibold">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-6 pt-4">
          <div className="space-y-4">
            <Label htmlFor="cadence-range" className="font-medium">Cadence Range (SPM)</Label>
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>{settings.min}</span>
              <span>{(settings.min + settings.max) / 2}</span>
              <span>{settings.max}</span>
            </div>
            <Slider
              id="cadence-range"
              min={80}
              max={240}
              step={1}
              value={[settings.min, settings.max]}
              onValueChange={([min, max]) => setSettings(s => ({ ...s, min, max }))}
              disabled={disabled}
            />
          </div>
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="dynamic-adjust" className="font-medium flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent" />
                Dynamic Adjustment
              </Label>
              <Switch
                id="dynamic-adjust"
                checked={settings.adjust}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, adjust: checked }))}
                disabled={disabled}
              />
            </div>
            {settings.adjust && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="adjust-rate">Increase Rate (%)</Label>
                  <Input
                    id="adjust-rate"
                    type="number"
                    value={settings.adjustRate}
                    onChange={(e) => setSettings(s => ({ ...s, adjustRate: parseInt(e.target.value, 10) || 0 }))}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adjust-duration">Duration (min)</Label>
                  <Input
                    id="adjust-duration"
                    type="number"
                    value={settings.adjustDuration}
                    onChange={(e) => setSettings(s => ({ ...s, adjustDuration: parseInt(e.target.value, 10) || 0 }))}
                    disabled={disabled}
                  />
                </div>
              </div>
            )}
          </div>
          <Separator />
           <div className="space-y-3">
             <Label className="font-medium">Presets</Label>
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {presets.map(preset => (
                    <Button
                        key={preset.name}
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectPreset(preset)}
                        disabled={disabled}
                        className="text-xs sm:text-sm"
                    >
                        {preset.name}
                    </Button>
                ))}
             </div>
           </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
