import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import ChartWidget from './ChartWidget';
import { DollarSign } from 'lucide-react';

interface MonthlyRevenueChartProps {
    data: Array<{ month: string; invoiced: number; paid: number }>;
    isLoading?: boolean;
}

const MonthlyRevenueChart: React.FC<MonthlyRevenueChartProps> = ({ data, isLoading = false }) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
        }).format(amount);
    };

    return (
        <ChartWidget
            title="Revenu mensuel"
            icon={DollarSign}
            iconColor="text-green-600 dark:text-green-400"
            iconBgColor="bg-green-100 dark:bg-green-900"
            height={300}
            isLoading={isLoading}
        >
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="invoiced" name="Facturé" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="paid" name="Payé" fill="#10B981" radius={[8, 8, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </ChartWidget>
    );
};

export default MonthlyRevenueChart;
