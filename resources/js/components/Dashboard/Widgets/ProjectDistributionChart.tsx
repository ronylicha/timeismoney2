import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ChartWidget from './ChartWidget';
import { Briefcase } from 'lucide-react';

interface ProjectDistributionChartProps {
    data: Array<{ name: string; value: number; hours: number }>;
    isLoading?: boolean;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const ProjectDistributionChart: React.FC<ProjectDistributionChartProps> = ({
    data,
    isLoading = false,
}) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
        }).format(amount);
    };

    return (
        <ChartWidget
            title="Répartition des projets"
            icon={Briefcase}
            iconColor="text-purple-600 dark:text-purple-400"
            iconBgColor="bg-purple-100 dark:bg-purple-900"
            height={250}
            isLoading={isLoading}
        >
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                            `${name} (${((percent as number) * 100).toFixed(0)}%)`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value: any, name: string, props: any) => {
                            return [
                                formatCurrency(Number(value)),
                                `${props.payload.hours.toFixed(2)}h`,
                            ];
                        }}
                    />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </ChartWidget>
    );
};

export default ProjectDistributionChart;
