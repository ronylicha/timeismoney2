import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import TaskForm from '../components/Tasks/TaskForm';

interface Task {
    id: number;
    title: string;
    description?: string;
    status: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    type?: 'task' | 'bug' | 'feature' | 'improvement';
    project_id: number;
    parent_id?: number;
    estimated_hours?: number;
    start_date?: string;
    due_date?: string;
    is_billable?: boolean;
    hourly_rate?: number;
    labels?: string[];
    assigned_users?: number[];
}

const EditTask: React.FC = () => {
    const { id } = useParams<{ id: string }>();

    // Fetch task data
    const { data: task, isLoading, error } = useQuery({
        queryKey: ['task', id],
        queryFn: async () => {
            const response = await axios.get(`/tasks/${id}`);
            return response.data as Task;
        },
        enabled: !!id,
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !task) {
        return <Navigate to="/tasks" replace />;
    }

    return <TaskForm task={task} />;
};

export default EditTask;