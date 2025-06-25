"use client";

import type { CadenceSettings, Preset } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Settings, Zap, Volume2, Music4 } from 'lucide-react';

interface SettingsPanelProps {
  settings: CadenceSettings;
  setSettings: (value: React.SetStateAction<CadenceSettings>) => void;
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
            <Slider
              id="cadence-range"
              min={150}
              max={200}
              step={1}
              value={[settings.min, settings.max]}
              onValueChange={([min, max]) => setSettings(s => ({ ...s, min, max }))}
              disabled={disabled}
            />
            <div className="flex justify-between items-center text-sm text-muted-foreground px-1">
              <span>Min: {settings.min}</span>
              <span>Max: {settings.max}</span>
            </div>
          </div>
          <Separator />
          <div className="space-y-3">
            <Label className="font-medium flex items-center gap-2">
              <Music4 className="w-4 h-4 text-accent" />
              Beat Frequency
            </Label>
            <RadioGroup
              value={settings.beatFrequency}
              onValueChange={(value: 'step' | 'cycle') => setSettings(s => ({ ...s, beatFrequency: value }))}
              className="flex items-center gap-6 pt-1"
              disabled={disabled}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="step" id="r1" />
                <Label htmlFor="r1" className="font-normal">Each Step</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cycle" id="r2" />
                <Label htmlFor="r2" className="font-normal">Each Leg Cycle</Label>
              </div>
            </RadioGroup>
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
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="hold-low">Hold Low (s)</Label>
                        <Input id="hold-low" type="number" value={settings.holdLowDuration} onChange={(e) => setSettings(s => ({ ...s, holdLowDuration: parseInt(e.target.value) || 0 }))} disabled={disabled} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="hold-high">Hold High (s)</Label>
                        <Input id="hold-high" type="number" value={settings.holdHighDuration} onChange={(e) => setSettings(s => ({ ...s, holdHighDuration: parseInt(e.target.value) || 0 }))} disabled={disabled} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="adjust-up-rate">Increase (+SPM)</Label>
                        <Input id="adjust-up-rate" type="number" value={settings.adjustUpRate} onChange={(e) => setSettings(s => ({ ...s, adjustUpRate: parseInt(e.target.value) || 0 }))} disabled={disabled} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="adjust-up-interval">... every (s)</Label>
                        <Input id="adjust-up-interval" type="number" value={settings.adjustUpInterval} onChange={(e) => setSettings(s => ({ ...s, adjustUpInterval: parseInt(e.target.value) || 0 }))} disabled={disabled} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="adjust-down-rate">Decrease (-SPM)</Label>
                        <Input id="adjust-down-rate" type="number" value={settings.adjustDownRate} onChange={(e) => setSettings(s => ({ ...s, adjustDownRate: parseInt(e.target.value) || 0 }))} disabled={disabled} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="adjust-down-interval">... every (s)</Label>
                        <Input id="adjust-down-interval" type="number" value={settings.adjustDownInterval} onChange={(e) => setSettings(s => ({ ...s, adjustDownInterval: parseInt(e.target.value) || 0 }))} disabled={disabled} />
                    </div>
                </div>
              </div>
            )}
          </div>
          <Separator />
           <div className="space-y-4">
                <Label htmlFor="announcement-interval" className="font-medium flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-accent" />
                    Voice Announcements
                </Label>
                <div className="flex items-center gap-2">
                    <Input 
                        id="announcement-interval" 
                        type="number" 
                        value={settings.announcementInterval} 
                        onChange={(e) => setSettings(s => ({ ...s, announcementInterval: parseInt(e.target.value) || 0 }))} 
                        disabled={disabled}
                        className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">seconds interval (0 to disable)</span>
                </div>
           </div>
          <Separator />
           <div className="space-y-3">
             <Label className="font-medium">Presets</Label>
             <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
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
