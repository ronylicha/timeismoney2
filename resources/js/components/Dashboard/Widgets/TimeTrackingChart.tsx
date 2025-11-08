import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import ChartWidget from './ChartWidget';
import { TrendingUp } from 'lucide-react';

interface TimeTrackingChartProps {
    data: Array<{ date: string; hours: number; amount: number }>;
    isLoading?: boolean;
}

const TimeTrackingChart: React.FC<TimeTrackingChartProps> = ({ data, isLoading = false }) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
        }).format(amount);
    };

    return (
        <ChartWidget
            title="Tendance du suivi de temps"
            icon={TrendingUp}
            iconColor="text-blue-600 dark:text-blue-400"
            iconBgColor="bg-blue-100 dark:bg-blue-900"
            height={250}
            isLoading={isLoading}
        >
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                        dataKey="date"
                        stroke="#6b7280"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => {
                            const date = new Date(value);
                            return date.toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                            });
                        }}
                    />
                    <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
                    <Tooltip
                        formatter={(value: any, name: string) => {
                            if (name === 'hours') {
                                return `${value.toFixed(2)}h`;
                            }
                            return formatCurrency(value);
                        }}
                        labelFormatter={(label) => {
                            const date = new Date(label);
                            return date.toLocaleDateString('fr-FR');
                        }}
                    />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey="hours"
                        name="Heures"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        dot={{ fill: '#3B82F6', r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="amount"
                        name="Montant"
                        stroke="#10B981"
                        strokeWidth={2}
                        dot={{ fill: '#10B981', r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </ChartWidget>
    );
};

export default TimeTrackingChart;
