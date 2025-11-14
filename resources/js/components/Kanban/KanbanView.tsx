import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import axios from 'axios';
import {
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
    useDroppable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

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

interface KanbanViewProps {
    tasks: Task[];
    projectId: string;
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
            low: 'border-l-gray-400 dark:border-l-gray-500',
            normal: 'border-l-blue-400 dark:border-l-blue-500',
            medium: 'border-l-yellow-400 dark:border-l-yellow-500',
            high: 'border-l-orange-400 dark:border-l-orange-500',
            urgent: 'border-l-red-400 dark:border-l-red-500',
        };
        return colors[priority as keyof typeof colors] || 'border-l-gray-400 dark:border-l-gray-500';
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
            queryClient.invalidateQueries({ queryKey: ['project', task.project?.id.toString()] });
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
            className={`group bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm hover:shadow-lg transition-all duration-200 cursor-grab active:cursor-grabbing border-l-4 ${getPriorityColor(task.priority)} ${
                isDragging ? 'opacity-50 rotate-2 scale-105' : 'hover:scale-[1.02]'
            }`}
        >
            <div className="flex justify-between items-start mb-3">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex-1 mr-2 leading-snug">{task.title}</h4>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Link
                        to={`/tasks/${task.id}`}
                        className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all"
                        title={t('common.view')}
                    >
                        <EyeIcon className="h-4 w-4" />
                    </Link>
                    <Link
                        to={`/tasks/${task.id}/edit`}
                        className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-all"
                        title={t('common.edit')}
                    >
                        <PencilIcon className="h-4 w-4" />
                    </Link>
                    <button
                        onClick={handleDelete}
                        className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                        title={t('common.delete')}
                    >
                        <TrashIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {task.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {task.description}
                </p>
            )}

            <div className="flex items-center justify-between mb-3">
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shadow-sm ${
                    task.priority === 'urgent' ? 'bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900/40 dark:to-red-800/40 text-red-700 dark:text-red-300' :
                    task.priority === 'high' ? 'bg-gradient-to-r from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/40 text-orange-700 dark:text-orange-300' :
                    task.priority === 'medium' ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 dark:from-yellow-900/40 dark:to-yellow-800/40 text-yellow-700 dark:text-yellow-300' :
                    task.priority === 'normal' ? 'bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 text-blue-700 dark:text-blue-300' :
                    'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-300'
                }`}>
                    {getPriorityLabel(task.priority)}
                </span>

                {task.due_date && (
                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 font-medium">
                        <ClockIcon className="h-3.5 w-3.5 mr-1" />
                        {new Date(task.due_date).toLocaleDateString()}
                    </div>
                )}
            </div>

            {task.users && task.users.length > 0 && (
                <div className="flex items-center -space-x-2 mb-3">
                    {task.users.slice(0, 3).map((user) => (
                        <div
                            key={user.id}
                            className="h-7 w-7 bg-gradient-to-br from-blue-400 to-purple-500 dark:from-blue-500 dark:to-purple-600 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-800 shadow-sm"
                            title={user.name}
                        >
                            <span className="text-xs font-bold text-white">
                                {user.name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    ))}
                    {task.users.length > 3 && (
                        <div className="h-7 w-7 bg-gradient-to-br from-gray-400 to-gray-500 dark:from-gray-600 dark:to-gray-700 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-800 shadow-sm">
                            <span className="text-xs font-bold text-white">
                                +{task.users.length - 3}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {task.labels && task.labels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {task.labels.slice(0, 2).map((label, index) => (
                        <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 text-indigo-700 dark:text-indigo-300 rounded-full shadow-sm"
                        >
                            <TagIcon className="h-3 w-3 mr-1" />
                            {label}
                        </span>
                    ))}
                    {task.labels.length > 2 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">+{task.labels.length - 2}</span>
                    )}
                </div>
            )}

            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                    {task._count && task._count.comments > 0 && (
                        <div className="flex items-center font-medium">
                            <ChatBubbleLeftRightIcon className="h-3.5 w-3.5 mr-1" />
                            {task._count.comments}
                        </div>
                    )}
                    {task._count && task._count.attachments > 0 && (
                        <div className="flex items-center font-medium">
                            <PaperClipIcon className="h-3.5 w-3.5 mr-1" />
                            {task._count.attachments}
                        </div>
                    )}
                </div>
                {task.code && (
                    <span className="font-mono text-xs bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 px-2.5 py-1 rounded-md font-semibold shadow-sm">
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

interface DroppableColumnProps {
    column: { id: string; name: string; color: string };
    tasks: Task[];
    t: (key: string) => string;
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({ column, tasks, t }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: column.id,
        data: {
            type: 'column',
            status: column.id,
        },
    });

    const taskIds = tasks.map((task) => task.id.toString());

    return (
        <div
            ref={setNodeRef}
            className={`bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-900/30 rounded-xl p-4 transition-all duration-200 ${
                isOver ? 'ring-2 ring-blue-400 dark:ring-blue-500 bg-blue-50/50 dark:bg-blue-900/20 scale-[1.02]' : ''
            }`}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                    <div className={`h-3 w-3 rounded-full ${column.color} shadow-sm`}></div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">{column.name}</h3>
                    <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full">
                        {tasks.length}
                    </span>
                </div>
            </div>

            <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-3 min-h-[200px]">
                    {tasks.map((task: Task) => (
                        <DroppableTaskCard key={task.id} task={task} />
                    ))}

                    {tasks.length === 0 && (
                        <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm font-medium">
                            {t('tasks.no_tasks')}
                        </div>
                    )}
                </div>
            </SortableContext>
        </div>
    );
};

const KanbanView: React.FC<KanbanViewProps> = ({ tasks, projectId }) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const updateTaskStatusMutation = useMutation({
        mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
            const response = await axios.patch(`/tasks/${taskId}`, { status });
            return response.data;
        },
        onMutate: async ({ taskId, status }) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['project', projectId] });

            // Snapshot the previous value
            const previousData = queryClient.getQueryData(['project', projectId]);

            // Optimistically update to the new value
            queryClient.setQueryData(['project', projectId], (oldData: any) => {
                if (!oldData?.tasks) return oldData;
                return {
                    ...oldData,
                    tasks: oldData.tasks.map((t: Task) =>
                        t.id === taskId ? { ...t, status } : t
                    ),
                };
            });

            // Return context with the snapshot
            return { previousData };
        },
        onSuccess: () => {
            toast.success(t('tasks.update_success'));
            queryClient.invalidateQueries({ queryKey: ['project', projectId] });
        },
        onError: (_error, _variables, context: any) => {
            // Rollback optimistic update on error
            if (context?.previousData) {
                queryClient.setQueryData(['project', projectId], context.previousData);
            }
            toast.error(t('tasks.update_error'));
        },
    });

    const columns = [
        { id: 'todo', name: t('tasks.status.todo'), color: 'bg-gray-400 dark:bg-gray-500' },
        { id: 'in_progress', name: t('tasks.status.in_progress'), color: 'bg-blue-400 dark:bg-blue-500' },
        { id: 'in_review', name: t('tasks.status.in_review'), color: 'bg-purple-400 dark:bg-purple-500' },
        { id: 'done', name: t('tasks.status.done'), color: 'bg-green-400 dark:bg-green-500' },
    ];

    const getTasksByStatus = (status: string) => {
        if (!tasks) return [];
        return tasks.filter((task: Task) => task.status === status);
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const task = tasks?.find((t: Task) => t.id.toString() === active.id);
        setActiveTask(task || null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over) {
            return;
        }

        const taskId = parseInt(active.id.toString());
        const newStatus = over.id.toString();

        // Find the task being dragged
        const task = tasks?.find((t: Task) => t.id === taskId);

        // Only update if status actually changed
        if (task && task.status !== newStatus) {
            // Mutation handles optimistic update and rollback in onMutate/onError
            updateTaskStatusMutation.mutate({ taskId, status: newStatus });
        }
    };

    if (!tasks || tasks.length === 0) {
        return (
            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg p-12 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">{t('tasks.no_tasks')}</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
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

            <DragOverlay dropAnimation={null}>
                {activeTask ? (
                    <div className="rotate-3 scale-105 opacity-90">
                        <TaskCard task={activeTask} />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};

export default KanbanView;
