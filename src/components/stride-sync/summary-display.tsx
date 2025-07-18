"use client";

import type { SummaryData, SessionStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SessionSummaryChart from './session-summary-chart';

interface SummaryDisplayProps {
    summary: SummaryData;
    status: SessionStatus;
}

const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function SummaryDisplay({ summary, status }: SummaryDisplayProps) {
    if (status === 'idle' && summary.sessionDuration === 0) {
        return null;
    }

    if (status === 'idle') {
        // Post-session summary
        return (
            <div className="w-full">
                <Card className="bg-muted/50 border-dashed">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-medium text-center">
                            Last Session Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="flex flex-col">
                                <span className="text-xl sm:text-2xl font-bold">{formatDuration(summary.sessionDuration)}</span>
                                <span className="text-xs text-muted-foreground">Duration</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xl sm:text-2xl font-bold">{summary.totalSteps}</span>
                                <span className="text-xs text-muted-foreground">Total Steps</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xl sm:text-2xl font-bold">{Math.round(summary.avgCadence)}</span>
                                <span className="text-xs text-muted-foreground">Avg. SPM</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <SessionSummaryChart data={summary.chartData} summary={summary} />
            </div>
        );
    }
    
    // Live summary
    const inZonePercentage = summary.sessionDuration > 0 ? (summary.inZoneTime / summary.sessionDuration) * 100 : 0;
    return (
        <div className="w-full">
            <Card className="bg-muted/50 border-dashed">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium text-center">
                        Live Summary
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                        <div className="flex flex-col">
                            <span className="text-xl sm:text-2xl font-bold">{formatDuration(summary.sessionDuration)}</span>
                            <span className="text-xs text-muted-foreground">Duration</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl sm:text-2xl font-bold">{summary.totalSteps}</span>
                            <span className="text-xs text-muted-foreground">Total Steps</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl sm:text-2xl font-bold">{Math.round(summary.avgCadence)}</span>
                            <span className="text-xs text-muted-foreground">Avg. SPM</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl sm:text-2xl font-bold">{inZonePercentage.toFixed(0)}%</span>
                            <span className="text-xs text-muted-foreground">In Zone</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
