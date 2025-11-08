<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Auth\TwoFactorController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\TimeEntryController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\AdminController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::post('/register', [RegisterController::class, 'register']);
Route::post('/login', [LoginController::class, 'login']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Authentication
    Route::post('/logout', [LoginController::class, 'logout']);
    Route::post('/logout-all', [LoginController::class, 'logoutAll']);
    Route::get('/user', function () {
        return auth()->user()->load(['tenant', 'teamMember', 'roles']);
    });

    // 2FA routes
    Route::prefix('2fa')->group(function () {
        Route::post('/verify', [LoginController::class, 'verify2FA']);
        Route::post('/recovery', [TwoFactorController::class, 'useRecoveryCode']);
        Route::post('/enable', [TwoFactorController::class, 'enable']);
        Route::post('/confirm', [TwoFactorController::class, 'confirm']);
        Route::post('/disable', [TwoFactorController::class, 'disable']);
        Route::post('/regenerate-codes', [TwoFactorController::class, 'regenerateRecoveryCodes']);
    });

    // User management
    Route::post('/users/register', [RegisterController::class, 'registerUser']);
    Route::apiResource('users', UserController::class);

    // Clients
    Route::apiResource('clients', ClientController::class);
    Route::get('/clients/{client}/contacts', [ClientController::class, 'contacts']);
    Route::post('/clients/{client}/contacts', [ClientController::class, 'addContact']);

    // Projects
    Route::apiResource('projects', ProjectController::class);
    Route::get('/projects/{project}/tasks', [ProjectController::class, 'tasks']);
    Route::get('/projects/{project}/time-entries', [ProjectController::class, 'timeEntries']);
    Route::get('/projects/{project}/kanban-tasks', [ProjectController::class, 'kanbanTasks']);
    Route::post('/projects/{project}/users', [ProjectController::class, 'assignUsers']);

    // Tasks
    Route::apiResource('tasks', TaskController::class);
    Route::post('/tasks/{task}/status', [TaskController::class, 'updateStatus']);
    Route::post('/tasks/{task}/assign', [TaskController::class, 'assignUsers']);
    Route::get('/tasks/kanban', [TaskController::class, 'kanban']);

    // Time Tracking
    Route::apiResource('time-entries', TimeEntryController::class);
    Route::post('/time-entries/start', [TimeEntryController::class, 'startTimer']);
    Route::post('/time-entries/stop', [TimeEntryController::class, 'stopTimer']);
    Route::post('/time-entries/pause', [TimeEntryController::class, 'pauseTimer']);
    Route::post('/time-entries/resume', [TimeEntryController::class, 'resumeTimer']);
    Route::get('/time-entries/current', [TimeEntryController::class, 'current']);
    Route::get('/time-entries/timesheet', [TimeEntryController::class, 'timesheet']);
    Route::get('/time-entries/export', [TimeEntryController::class, 'export']);
    Route::post('/timer/start', [TimeEntryController::class, 'startTimer']);
    Route::post('/timer/stop', [TimeEntryController::class, 'stopTimer']);
    Route::get('/timer/current', [TimeEntryController::class, 'currentTimer']);
    Route::post('/time-entries/{timeEntry}/approve', [TimeEntryController::class, 'approve']);
    Route::post('/time-entries/bulk-approve', [TimeEntryController::class, 'bulkApprove']);

    // Timesheet
    Route::get('/timesheet/week', [TimeEntryController::class, 'weeklyTimesheet']);
    Route::get('/timesheet/month', [TimeEntryController::class, 'monthlyTimesheet']);
    Route::post('/timesheet/submit', [TimeEntryController::class, 'submitTimesheet']);

    // Invoices
    Route::apiResource('invoices', InvoiceController::class);
    Route::post('/invoices/{invoice}/send', [InvoiceController::class, 'send']);
    Route::post('/invoices/{invoice}/mark-paid', [InvoiceController::class, 'markAsPaid']);
    Route::get('/invoices/{invoice}/pdf', [InvoiceController::class, 'downloadPdf']);
    Route::post('/invoices/{invoice}/chorus', [InvoiceController::class, 'sendToChorus']);
    Route::get('/invoices/{invoice}/audit-log', [InvoiceController::class, 'auditLog']);

    // Expenses
    Route::apiResource('expenses', ExpenseController::class);
    Route::post('/expenses/{expense}/approve', [ExpenseController::class, 'approve']);
    Route::post('/expenses/{expense}/attach-receipt', [ExpenseController::class, 'attachReceipt']);

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('/dashboard/activity', [DashboardController::class, 'activity']);
    Route::get('/dashboard/charts', [DashboardController::class, 'charts']);
    Route::get('/dashboard/widgets', [DashboardController::class, 'widgets']);
    Route::post('/dashboard/widgets', [DashboardController::class, 'saveWidget']);

    // Reports
    Route::get('/reports', [ReportController::class, 'index']);
    Route::post('/reports/generate', [ReportController::class, 'generate']);
    Route::get('/reports/{report}/download', [ReportController::class, 'download']);
    Route::get('/reports/fec', [ReportController::class, 'fecExport']);

    // Settings
    Route::get('/settings', [SettingsController::class, 'index']);
    Route::post('/settings', [SettingsController::class, 'update']);
    Route::get('/settings/tenant', [SettingsController::class, 'tenant']);
    Route::post('/settings/tenant', [SettingsController::class, 'updateTenant']);

    // Notifications
    Route::get('/notifications/preferences', [NotificationController::class, 'getPreferences']);
    Route::put('/notifications/preferences', [NotificationController::class, 'updatePreferences']);
    Route::post('/notifications/subscribe', [NotificationController::class, 'subscribe']);
    Route::post('/notifications/unsubscribe', [NotificationController::class, 'unsubscribe']);
    Route::get('/notifications/subscriptions', [NotificationController::class, 'getSubscriptions']);
    Route::delete('/notifications/subscriptions/{id}', [NotificationController::class, 'deleteSubscription']);
    Route::get('/notifications/history', [NotificationController::class, 'getHistory']);
    Route::put('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::put('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'getUnreadCount']);
    Route::post('/notifications/test', [NotificationController::class, 'testNotification']);
    Route::get('/notifications/vapid-key', [NotificationController::class, 'getVapidPublicKey']);

    // Admin Routes
    Route::prefix('admin')->middleware('auth:sanctum')->group(function () {
        // Dashboard Stats
        Route::get('/stats', [AdminController::class, 'getStats']);
        Route::get('/activity', [AdminController::class, 'getActivity']);
        Route::get('/revenue-chart', [AdminController::class, 'getRevenueChart']);
        Route::get('/user-growth-chart', [AdminController::class, 'getUserGrowthChart']);

        // User Management
        Route::get('/users', [AdminController::class, 'getUsers']);
        Route::post('/users/{id}/suspend', [AdminController::class, 'suspendUser']);
        Route::post('/users/{id}/activate', [AdminController::class, 'activateUser']);
        Route::post('/users/{id}/reset-password', [AdminController::class, 'resetUserPassword']);
        Route::delete('/users/{id}', [AdminController::class, 'deleteUser']);
        Route::post('/users/{id}/impersonate', [AdminController::class, 'impersonateUser']);
        Route::get('/users/export', [AdminController::class, 'exportUsers']);

        // Tenant Management
        Route::get('/tenants', [AdminController::class, 'getTenants']);
        Route::post('/tenants/{id}/suspend', [AdminController::class, 'suspendTenant']);
        Route::post('/tenants/{id}/activate', [AdminController::class, 'activateTenant']);
        Route::put('/tenants/{id}/plan', [AdminController::class, 'updateTenantPlan']);
        Route::delete('/tenants/{id}', [AdminController::class, 'deleteTenant']);

        // Audit Logs
        Route::get('/audit-logs', [AdminController::class, 'getAuditLogs']);
        Route::get('/audit-logs/export', [AdminController::class, 'exportAuditLogs']);

        // User Stats
        Route::get('/users/stats', [AdminController::class, 'getUserStats']);
    });
});