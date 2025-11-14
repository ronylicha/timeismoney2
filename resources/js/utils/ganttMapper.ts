import { format, parse, isValid, addDays } from 'date-fns';

/**
 * Task interface from backend
 */
export interface Task {
    id: number;
    title: string;
    description?: string;
    status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    start_date?: string | null;
    due_date?: string | null;
    estimated_hours?: number | null;
    actual_hours?: number;
    tracked_hours?: number;
    progress?: number;
    assigned_to?: {
        id: number;
        name: string;
    };
    dependencies?: Array<{
        id: number;
        depends_on_task_id: number;
        type: 'blocks' | 'related';
    }>;
    parent_task_id?: number | null;
    code?: string;
}

/**
 * Gantt task interface for frappe-gantt
 */
export interface GanttTask {
    id: string;
    name: string;
    start: string; // YYYY-MM-DD format
    end: string; // YYYY-MM-DD format
    progress: number; // 0-100
    dependencies?: string; // comma-separated task IDs
    custom_class?: string; // for styling
}

/**
 * Maps task status to progress percentage if progress is not defined
 */
const getProgressFromStatus = (status: Task['status']): number => {
    const statusProgressMap: Record<Task['status'], number> = {
        todo: 0,
        in_progress: 50,
        in_review: 75,
        done: 100,
        cancelled: 0,
    };
    return statusProgressMap[status] || 0;
};

/**
 * Maps task priority to CSS class for styling
 */
export const getPriorityClass = (priority: Task['priority']): string => {
    const priorityClassMap: Record<Task['priority'], string> = {
        low: 'bar-low',
        normal: 'bar-normal',
        high: 'bar-high',
        urgent: 'bar-urgent',
    };
    return priorityClassMap[priority] || 'bar-normal';
};

/**
 * Maps task status to CSS class for styling
 */
export const getStatusClass = (status: Task['status']): string => {
    const statusClassMap: Record<Task['status'], string> = {
        todo: 'bar-todo',
        in_progress: 'bar-progress',
        in_review: 'bar-review',
        done: 'bar-completed',
        cancelled: 'bar-cancelled',
    };
    return statusClassMap[status] || 'bar-todo';
};

/**
 * Validates if a date string is valid
 */
const isValidDateString = (dateStr: string | null | undefined): boolean => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return isValid(date) && !isNaN(date.getTime());
};

/**
 * Estimates end date based on start date and estimated hours
 */
const estimateEndDate = (startDate: string, estimatedHours: number): string => {
    const start = new Date(startDate);
    // Assuming 8 working hours per day
    const estimatedDays = Math.ceil(estimatedHours / 8);
    const endDate = addDays(start, estimatedDays > 0 ? estimatedDays : 1);
    return format(endDate, 'yyyy-MM-dd');
};

/**
 * Maps a single task from backend format to Gantt format
 */
export const mapTaskToGantt = (task: Task): GanttTask | null => {
    // Skip tasks without dates
    if (!isValidDateString(task.start_date) && !isValidDateString(task.due_date)) {
        return null;
    }

    // Calculate start and end dates
    let startDate = task.start_date || task.due_date!;
    let endDate = task.due_date || task.start_date!;

    // If only start date is provided and we have estimated hours, calculate end date
    if (isValidDateString(startDate) && !isValidDateString(endDate) && task.estimated_hours) {
        endDate = estimateEndDate(startDate, task.estimated_hours);
    }

    // If end date is before start date, swap them
    if (new Date(endDate) < new Date(startDate)) {
        [startDate, endDate] = [endDate, startDate];
    }

    // Ensure dates are in YYYY-MM-DD format
    const formattedStart = format(new Date(startDate!), 'yyyy-MM-dd');
    const formattedEnd = format(new Date(endDate!), 'yyyy-MM-dd');

    // Get progress from task or infer from status
    const progress = task.progress ?? getProgressFromStatus(task.status);

    // Map dependencies to comma-separated string
    const dependencies = task.dependencies
        ?.filter((dep) => dep.type === 'blocks') // Only include blocking dependencies
        .map((dep) => String(dep.depends_on_task_id))
        .join(',');

    // Combine status and priority classes
    const customClass = `${getStatusClass(task.status)} ${getPriorityClass(task.priority)}`;

    return {
        id: String(task.id),
        name: task.title,
        start: formattedStart,
        end: formattedEnd,
        progress,
        dependencies: dependencies || undefined,
        custom_class: customClass,
    };
};

/**
 * Maps an array of tasks to Gantt format, filtering out invalid tasks
 */
export const mapTasksToGantt = (tasks: Task[]): GanttTask[] => {
    return tasks
        .map(mapTaskToGantt)
        .filter((task): task is GanttTask => task !== null);
};

/**
 * Filters tasks that don't have valid dates (unscheduled tasks)
 */
export const getUnscheduledTasks = (tasks: Task[]): Task[] => {
    return tasks.filter(
        (task) => !isValidDateString(task.start_date) && !isValidDateString(task.due_date)
    );
};

/**
 * Gets tasks that are scheduled (have valid dates)
 */
export const getScheduledTasks = (tasks: Task[]): Task[] => {
    return tasks.filter(
        (task) => isValidDateString(task.start_date) || isValidDateString(task.due_date)
    );
};

/**
 * Validates if task dependencies form a circular loop
 */
export const hasCircularDependency = (
    taskId: number,
    dependsOnId: number,
    allTasks: Task[]
): boolean => {
    const visited = new Set<number>();
    const recursionStack = new Set<number>();

    const hasCycle = (currentId: number): boolean => {
        if (recursionStack.has(currentId)) {
            return true; // Found a cycle
        }

        if (visited.has(currentId)) {
            return false; // Already checked this path
        }

        visited.add(currentId);
        recursionStack.add(currentId);

        const currentTask = allTasks.find((t) => t.id === currentId);
        if (currentTask?.dependencies) {
            for (const dep of currentTask.dependencies) {
                if (hasCycle(dep.depends_on_task_id)) {
                    return true;
                }
            }
        }

        recursionStack.delete(currentId);
        return false;
    };

    // Temporarily add the new dependency and check for cycles
    const taskToCheck = allTasks.find((t) => t.id === taskId);
    if (taskToCheck) {
        const tempDependencies = taskToCheck.dependencies || [];
        taskToCheck.dependencies = [
            ...tempDependencies,
            { id: -1, depends_on_task_id: dependsOnId, type: 'blocks' },
        ];

        const result = hasCycle(taskId);

        // Restore original dependencies
        taskToCheck.dependencies = tempDependencies;
        return result;
    }

    return false;
};

/**
 * Checks if a task's dates conflict with its dependencies
 */
export const hasDateConflict = (task: Task, allTasks: Task[]): boolean => {
    if (!task.dependencies || task.dependencies.length === 0 || !task.start_date) {
        return false;
    }

    const taskStartDate = new Date(task.start_date);

    for (const dependency of task.dependencies) {
        if (dependency.type !== 'blocks') continue;

        const dependentTask = allTasks.find((t) => t.id === dependency.depends_on_task_id);
        if (!dependentTask || !dependentTask.due_date) continue;

        const dependentEndDate = new Date(dependentTask.due_date);

        // If this task starts before its dependency ends, there's a conflict
        if (taskStartDate < dependentEndDate) {
            return true;
        }
    }

    return false;
};
