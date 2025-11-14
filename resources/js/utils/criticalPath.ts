import { Task } from './ganttMapper';
import { differenceInDays, addDays, parseISO } from 'date-fns';

/**
 * Task with CPM calculations
 */
interface CPMTask extends Task {
    earlyStart: Date | null;
    earlyFinish: Date | null;
    lateStart: Date | null;
    lateFinish: Date | null;
    totalFloat: number; // Total slack time
    freeFloat: number; // Free slack time
    isCritical: boolean;
    duration: number; // in days
}

/**
 * Result of CPM calculation
 */
export interface CPMResult {
    tasks: CPMTask[];
    criticalPath: number[]; // Array of task IDs on critical path
    projectDuration: number; // Total project duration in days
    criticalPathTasks: CPMTask[]; // Tasks that are on the critical path
}

/**
 * Calculate task duration in days
 */
const calculateDuration = (task: Task): number => {
    if (!task.start_date || !task.due_date) {
        return 0;
    }

    const start = parseISO(task.start_date);
    const end = parseISO(task.due_date);
    const days = differenceInDays(end, start);

    return Math.max(days, 1); // Minimum 1 day
};

/**
 * Get all predecessors (dependencies) of a task
 */
const getPredecessors = (task: Task, allTasks: Task[]): Task[] => {
    if (!task.dependencies || task.dependencies.length === 0) {
        return [];
    }

    return task.dependencies
        .filter((dep) => dep.type === 'blocks') // Only blocking dependencies
        .map((dep) => allTasks.find((t) => t.id === dep.depends_on_task_id))
        .filter((t): t is Task => t !== undefined);
};

/**
 * Get all successors (tasks that depend on this task)
 */
const getSuccessors = (taskId: number, allTasks: Task[]): Task[] => {
    return allTasks.filter((task) =>
        task.dependencies?.some(
            (dep) => dep.depends_on_task_id === taskId && dep.type === 'blocks'
        )
    );
};

/**
 * Forward Pass: Calculate Early Start and Early Finish
 */
const forwardPass = (tasks: Task[]): Map<number, CPMTask> => {
    const cpmTasks = new Map<number, CPMTask>();

    // Initialize all tasks
    tasks.forEach((task) => {
        const duration = calculateDuration(task);
        cpmTasks.set(task.id, {
            ...task,
            earlyStart: null,
            earlyFinish: null,
            lateStart: null,
            lateFinish: null,
            totalFloat: 0,
            freeFloat: 0,
            isCritical: false,
            duration,
        });
    });

    // Topological sort to process tasks in dependency order
    const processed = new Set<number>();
    const queue: number[] = [];

    // Find tasks with no predecessors (start tasks)
    tasks.forEach((task) => {
        const predecessors = getPredecessors(task, tasks);
        if (predecessors.length === 0) {
            queue.push(task.id);
        }
    });

    // Process tasks
    while (queue.length > 0) {
        const taskId = queue.shift()!;
        if (processed.has(taskId)) continue;

        const cpmTask = cpmTasks.get(taskId)!;
        const predecessors = getPredecessors(cpmTask, tasks);

        // Calculate Early Start
        if (predecessors.length === 0) {
            // No predecessors: start at project start or task's actual start date
            cpmTask.earlyStart = cpmTask.start_date
                ? parseISO(cpmTask.start_date)
                : new Date();
        } else {
            // Early Start = max(predecessor Early Finish)
            const maxEarlyFinish = Math.max(
                ...predecessors.map((pred) => {
                    const predCPM = cpmTasks.get(pred.id)!;
                    return predCPM.earlyFinish
                        ? predCPM.earlyFinish.getTime()
                        : 0;
                })
            );
            cpmTask.earlyStart = new Date(maxEarlyFinish);
        }

        // Calculate Early Finish
        cpmTask.earlyFinish = addDays(cpmTask.earlyStart, cpmTask.duration);

        processed.add(taskId);

        // Add successors to queue
        const successors = getSuccessors(taskId, tasks);
        successors.forEach((successor) => {
            const allPredProcessed = getPredecessors(successor, tasks).every((pred) =>
                processed.has(pred.id)
            );
            if (allPredProcessed && !processed.has(successor.id)) {
                queue.push(successor.id);
            }
        });
    }

    return cpmTasks;
};

/**
 * Backward Pass: Calculate Late Start and Late Finish
 */
const backwardPass = (tasks: Task[], cpmTasks: Map<number, CPMTask>): void => {
    // Find project end date (max Early Finish)
    let projectEnd = new Date(0);
    cpmTasks.forEach((task) => {
        if (task.earlyFinish && task.earlyFinish > projectEnd) {
            projectEnd = task.earlyFinish;
        }
    });

    // Topological sort in reverse (from end to start)
    const processed = new Set<number>();
    const queue: number[] = [];

    // Find tasks with no successors (end tasks)
    tasks.forEach((task) => {
        const successors = getSuccessors(task.id, tasks);
        if (successors.length === 0) {
            queue.push(task.id);
        }
    });

    // Process tasks
    while (queue.length > 0) {
        const taskId = queue.shift()!;
        if (processed.has(taskId)) continue;

        const cpmTask = cpmTasks.get(taskId)!;
        const successors = getSuccessors(taskId, tasks);

        // Calculate Late Finish
        if (successors.length === 0) {
            // No successors: Late Finish = Early Finish
            cpmTask.lateFinish = cpmTask.earlyFinish;
        } else {
            // Late Finish = min(successor Late Start)
            const minLateStart = Math.min(
                ...successors.map((succ) => {
                    const succCPM = cpmTasks.get(succ.id)!;
                    return succCPM.lateStart ? succCPM.lateStart.getTime() : Infinity;
                })
            );
            cpmTask.lateFinish = new Date(minLateStart);
        }

        // Calculate Late Start
        if (cpmTask.lateFinish) {
            cpmTask.lateStart = addDays(cpmTask.lateFinish, -cpmTask.duration);
        }

        processed.add(taskId);

        // Add predecessors to queue
        const predecessors = getPredecessors(cpmTask, tasks);
        predecessors.forEach((predecessor) => {
            const allSuccProcessed = getSuccessors(predecessor.id, tasks).every((succ) =>
                processed.has(succ.id)
            );
            if (allSuccProcessed && !processed.has(predecessor.id)) {
                queue.push(predecessor.id);
            }
        });
    }
};

/**
 * Calculate Float (Slack) and identify Critical Path
 */
const calculateFloatAndCriticalPath = (cpmTasks: Map<number, CPMTask>): number[] => {
    const criticalPath: number[] = [];

    cpmTasks.forEach((task) => {
        if (task.earlyStart && task.lateStart && task.earlyFinish && task.lateFinish) {
            // Total Float = Late Start - Early Start (or Late Finish - Early Finish)
            task.totalFloat = differenceInDays(task.lateStart, task.earlyStart);

            // Task is critical if Total Float = 0
            task.isCritical = task.totalFloat === 0;

            if (task.isCritical) {
                criticalPath.push(task.id);
            }

            // Free Float = minimum Early Start of successors - Early Finish of this task
            // (Simplified: for now, we'll just use totalFloat)
            task.freeFloat = task.totalFloat;
        }
    });

    return criticalPath;
};

/**
 * Main CPM Algorithm
 * Calculates the critical path for a set of tasks
 */
export const calculateCriticalPath = (tasks: Task[]): CPMResult => {
    // Filter out tasks without dates
    const scheduledTasks = tasks.filter(
        (task) => task.start_date && task.due_date
    );

    if (scheduledTasks.length === 0) {
        return {
            tasks: [],
            criticalPath: [],
            projectDuration: 0,
            criticalPathTasks: [],
        };
    }

    // Forward pass
    const cpmTasks = forwardPass(scheduledTasks);

    // Backward pass
    backwardPass(scheduledTasks, cpmTasks);

    // Calculate float and identify critical path
    const criticalPath = calculateFloatAndCriticalPath(cpmTasks);

    // Calculate project duration
    let projectDuration = 0;
    cpmTasks.forEach((task) => {
        if (task.earlyFinish) {
            const duration = differenceInDays(
                task.earlyFinish,
                task.earlyStart || new Date()
            );
            if (duration > projectDuration) {
                projectDuration = duration;
            }
        }
    });

    const cpmTasksArray = Array.from(cpmTasks.values());
    const criticalPathTasks = cpmTasksArray.filter((task) => task.isCritical);

    return {
        tasks: cpmTasksArray,
        criticalPath,
        projectDuration,
        criticalPathTasks,
    };
};

/**
 * Get critical path statistics
 */
export const getCriticalPathStats = (cpmResult: CPMResult) => {
    return {
        totalTasks: cpmResult.tasks.length,
        criticalTasks: cpmResult.criticalPathTasks.length,
        criticalPercentage:
            cpmResult.tasks.length > 0
                ? Math.round(
                      (cpmResult.criticalPathTasks.length / cpmResult.tasks.length) * 100
                  )
                : 0,
        projectDuration: cpmResult.projectDuration,
        averageFloat:
            cpmResult.tasks.length > 0
                ? Math.round(
                      cpmResult.tasks.reduce((sum, task) => sum + task.totalFloat, 0) /
                          cpmResult.tasks.length
                  )
                : 0,
    };
};
