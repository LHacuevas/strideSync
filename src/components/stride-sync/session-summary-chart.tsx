"use client"

import type { ChartDataPoint, SummaryData } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

interface SessionSummaryChartProps {
    data: ChartDataPoint[];
    summary: Pick<SummaryData, 'belowZoneTime' | 'inZoneTime' | 'aboveZoneTime' | 'sessionDuration'>;
}

const formatTime = (seconds: number) => {
    if (typeof seconds !== 'number' || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function SessionSummaryChart({ data, summary }: SessionSummaryChartProps) {
    if (!data || data.length === 0) return null;

    const chartConfig = {
        actual: {
            label: "Your Cadence",
            color: "hsl(var(--primary))",
        },
        target: {
            label: "Target Cadence",
            color: "hsl(var(--accent))",
        },
    };
    
    const { belowZoneTime, inZoneTime, aboveZoneTime } = summary;
    const totalZoneTime = belowZoneTime + inZoneTime + aboveZoneTime;
    const belowPercentage = totalZoneTime > 0 ? (belowZoneTime / totalZoneTime) * 100 : 0;
    const inZonePercentage = totalZoneTime > 0 ? (inZoneTime / totalZoneTime) * 100 : 0;
    const abovePercentage = totalZoneTime > 0 ? (aboveZoneTime / totalZoneTime) * 100 : 0;

    return (
        <Card className="bg-muted/30 mt-6 border-dashed">
            <CardHeader>
                <CardTitle>Session Analysis</CardTitle>
                <CardDescription>Your performance versus the target cadence.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="h-60 w-full">
                     <ChartContainer config={chartConfig} className="w-full h-full">
                        <LineChart
                            data={data}
                            margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                            accessibilityLayer
                        >
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="time"
                                tickFormatter={formatTime}
                                type="number"
                                domain={['dataMin', 'dataMax']}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                            />
                            <YAxis
                                domain={['dataMin - 10', 'dataMax + 10']}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                width={80}
                                tickFormatter={(value) => `${Math.round(value)} SPM`}
                             />
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent indicator="line" />}
                            />
                            <ChartLegend content={<ChartLegendContent />} />
                            <Line type="monotone" dataKey="actual" stroke="var(--color-actual)" strokeWidth={2} dot={false} name="Actual" connectNulls />
                            <Line type="monotone" dataKey="target" stroke="var(--color-target)" strokeDasharray="5 5" strokeWidth={2} dot={false} name="Target" />
                        </LineChart>
                    </ChartContainer>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center pt-4">
                    <div>
                        <p className="text-2xl font-bold text-accent">{belowPercentage.toFixed(0)}%</p>
                        <p className="text-xs text-muted-foreground">Below Zone</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-primary">{inZonePercentage.toFixed(0)}%</p>
                        <p className="text-xs text-muted-foreground">In Zone</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-destructive">{abovePercentage.toFixed(0)}%</p>
                        <p className="text-xs text-muted-foreground">Above Zone</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
