import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
    ArrowLeftIcon,
    PlusIcon,
    EyeIcon,
    PencilIcon,
    TrashIcon,
    ClockIcon,
    TagIcon,
    ChatBubbleLeftRightIcon,
    PaperClipIcon,
} from '@heroicons/react/24/outline';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    closestCorners,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';

interface Task {
    id: number;
    title: string;
    description: string;
    status: string;
    priority: string;
    due_date?: string;
    labels?: string[];
    code?: string;
    project?: {
        id: number;
        name: string;
    };
    users?: Array<{
        id: number;
        name: string;
    }>;
    _count?: {
        comments: number;
        attachments: number;
    };
}

interface TaskCardProps {
    task: Task;
    isDragging?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, isDragging = false }) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    const getPriorityColor = (priority: string) => {
        const colors = {
            low: 'border-l-gray-400',
            normal: 'border-l-blue-400',
            medium: 'border-l-yellow-400',
            high: 'border-l-orange-400',
            urgent: 'border-l-red-400',
        };
        return colors[priority as keyof typeof colors] || 'border-l-gray-400';
    };

    const getPriorityLabel = (priority: string) => {
        const labels = {
            low: t('tasks.priority.low'),
            normal: t('tasks.priority.normal'),
            medium: t('tasks.priority.medium'),
            high: t('tasks.priority.high'),
            urgent: t('tasks.priority.urgent'),
        };
        return labels[priority as keyof typeof labels] || priority;
    };

    const deleteTaskMutation = useMutation({
        mutationFn: async (taskId: number) => {
            await axios.delete(`/tasks/${taskId}`);
        },
        onSuccess: () => {
            toast.success(t('tasks.delete_success'));
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
        onError: () => {
            toast.error(t('tasks.delete_error'));
        }
    });

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(t('tasks.confirm_delete'))) {
            deleteTaskMutation.mutate(task.id);
        }
    };

    return (
        <div
            className={`bg-white rounded-lg p-4 shadow hover:shadow-md transition cursor-grab active:cursor-grabbing border-l-4 ${getPriorityColor(task.priority)} ${
                isDragging ? 'opacity-50' : ''
            }`}
        >
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-gray-900 flex-1 mr-2">{task.title}</h4>
                <div className="flex space-x-1 opacity-0 hover:opacity-100 transition-opacity">
                    <Link
                        to={`/tasks/${task.id}`}
                        className="p-1 text-gray-400 hover:text-blue-600 transition"
                        title={t('common.view')}
                    >
                        <EyeIcon className="h-4 w-4" />
                    </Link>
                    <Link
                        to={`/tasks/${task.id}/edit`}
                        className="p-1 text-gray-400 hover:text-green-600 transition"
                        title={t('common.edit')}
                    >
                        <PencilIcon className="h-4 w-4" />
                    </Link>
                    <button
                        onClick={handleDelete}
                        className="p-1 text-gray-400 hover:text-red-600 transition"
                        title={t('common.delete')}
                    >
                        <TrashIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
            
            {task.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {task.description}
                </p>
            )}

            <div className="flex items-center justify-between mb-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                    task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    task.priority === 'normal' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                }`}>
                    {getPriorityLabel(task.priority)}
                </span>
                
                {task.due_date && (
                    <div className="flex items-center text-xs text-gray-500">
                        <ClockIcon className="h-3 w-3 mr-1" />
                        {new Date(task.due_date).toLocaleDateString()}
                    </div>
                )}
            </div>

            {task.users && task.users.length > 0 && (
                <div className="flex items-center space-x-1 mb-2">
                    {task.users.slice(0, 3).map((user) => (
                        <div
                            key={user.id}
                            className="h-6 w-6 bg-gray-200 rounded-full flex items-center justify-center"
                            title={user.name}
                        >
                            <span className="text-xs font-medium text-gray-600">
                                {user.name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    ))}
                    {task.users.length > 3 && (
                        <div className="h-6 w-6 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                                +{task.users.length - 3}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {task.labels && task.labels.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {task.labels.slice(0, 2).map((label, index) => (
                        <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded"
                        >
                            <TagIcon className="h-3 w-3 mr-1" />
                            {label}
                        </span>
                    ))}
                    {task.labels.length > 2 && (
                        <span className="text-xs text-gray-500">+{task.labels.length - 2}</span>
                    )}
                </div>
            )}

            <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-3">
                    {task._count && task._count.comments > 0 && (
                        <div className="flex items-center">
                            <ChatBubbleLeftRightIcon className="h-3 w-3 mr-1" />
                            {task._count.comments}
                        </div>
                    )}
                    {task._count && task._count.attachments > 0 && (
                        <div className="flex items-center">
                            <PaperClipIcon className="h-3 w-3 mr-1" />
                            {task._count.attachments}
                        </div>
                    )}
                </div>
                {task.code && (
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        {task.code}
                    </span>
                )}
            </div>
        </div>
    );
};

interface DroppableTaskCardProps {
    task: Task;
}

const DroppableTaskCard: React.FC<DroppableTaskCardProps> = ({ task }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id.toString(),
        data: {
            type: 'task',
            task,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <TaskCard task={task} isDragging={isDragging} />
        </div>
    );
};

const KanbanBoard: React.FC = () => {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const isValidId = id && id !== 'new' && id !== 'undefined';
    const queryClient = useQueryClient();
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const { data: project, isLoading: loadingProject } = useQuery({
        queryKey: ['project', id],
        queryFn: async () => {
            const response = await axios.get(`/projects/${id}`);
            return response.data.data;
        },
        enabled: !!isValidId,
    });

    const { data: tasks, isLoading: loadingTasks } = useQuery({
        queryKey: ['tasks', id],
        queryFn: async () => {
            const response = await axios.get(`/tasks?project_id=${id}`);
            console.log('Kanban tasks response:', response.data);
            return response.data.data;
        },
        enabled: !!isValidId,
    });

    const updateTaskStatusMutation = useMutation({
        mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
            await axios.put(`/tasks/${taskId}`, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', id] });
        },
    });

    const columns = [
        { id: 'todo', name: t('tasks.status.todo'), color: 'bg-gray-200' },
        { id: 'in_progress', name: t('tasks.status.in_progress'), color: 'bg-blue-200' },
        { id: 'in_review', name: t('tasks.status.in_review'), color: 'bg-purple-200' },
        { id: 'done', name: t('tasks.status.done'), color: 'bg-green-200' },
    ];

    const getTasksByStatus = (status: string) => {
        if (!tasks) return [];
        const filtered = tasks.filter((task: Task) => task.status === status);
        console.log(`Tasks for status ${status}:`, filtered);
        return filtered;
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const task = tasks?.find((t: Task) => t.id.toString() === active.id);
        setActiveTask(task || null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) {
            setActiveTask(null);
            return;
        }

        const taskId = parseInt(active.id.toString());
        const newStatus = over.id.toString();

        // Find the task being dragged
        const task = tasks?.find((t: Task) => t.id === taskId);

        if (task && task.status !== newStatus) {
            // Optimistically update the UI
            queryClient.setQueryData(['tasks', id], (oldTasks: Task[] | undefined) => {
                if (!oldTasks) return oldTasks;
                return oldTasks.map((t) =>
                    t.id === taskId ? { ...t, status: newStatus } : t
                );
            });

            // Update on the server
            updateTaskStatusMutation.mutate({ taskId, status: newStatus });
        }

        setActiveTask(null);
    };

    if (loadingProject || loadingTasks) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="p-6">
                <div className="mb-8">
                    <div className="flex items-center mb-4">
                        <Link
                            to={`/projects/${id}`}
                            className="flex items-center text-gray-600 hover:text-gray-900 transition mr-4"
                        >
                            <ArrowLeftIcon className="h-5 w-5 mr-1" />
                            <span>{t('projects.back_to_project')}</span>
                        </Link>
                    </div>

                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{t('tasks.kanban_board')}</h1>
                            <p className="mt-2 text-gray-600">{project?.name}</p>
                        </div>
                        <Link
                            to={`/tasks/new?project_id=${id}`}
                            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                        >
                            <PlusIcon className="h-5 w-5" />
                            <span>{t('tasks.new_task')}</span>
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {columns.map((column) => {
                        const columnTasks = getTasksByStatus(column.id);

                        return (
                            <DroppableColumn
                                key={column.id}
                                column={column}
                                tasks={columnTasks}
                                t={t}
                            />
                        );
                    })}
                </div>
            </div>

            <DragOverlay>
                {activeTask ? <TaskCard task={activeTask} /> : null}
            </DragOverlay>
        </DndContext>
    );
};

interface DroppableColumnProps {
    column: { id: string; name: string; color: string };
    tasks: Task[];
    t: (key: string) => string;
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({ column, tasks, t }) => {
    const { setNodeRef } = useSortable({
        id: column.id,
        data: {
            type: 'column',
        },
    });

    return (
        <div ref={setNodeRef} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                    <div className={`h-3 w-3 rounded-full ${column.color}`}></div>
                    <h3 className="font-semibold text-gray-900">{column.name}</h3>
                    <span className="text-sm text-gray-500">({tasks.length})</span>
                </div>
            </div>

            <div className="space-y-3 min-h-[200px]">
                {tasks.map((task: Task) => (
                    <DroppableTaskCard key={task.id} task={task} />
                ))}

                {tasks.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm">
                        {t('tasks.no_tasks')}
                    </div>
                )}
            </div>
        </div>
    );
};

export default KanbanBoard;
