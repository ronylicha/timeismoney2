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
use App\Http\Controllers\Api\InvoiceTypeController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\QuoteController;
use App\Http\Controllers\Api\CreditNoteController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\StripeWebhookController;
use App\Http\Controllers\Api\GoogleCalendarController;
use App\Http\Controllers\Api\TenantSettingsController;
use App\Http\Controllers\Api\ComplianceController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::post('/register', [RegisterController::class, 'register']);
Route::post('/login', [LoginController::class, 'login']);

// Stripe Webhook (must be public for Stripe to access)
Route::post('/webhooks/stripe', [StripeWebhookController::class, 'handleWebhook'])->name('stripe.webhook');

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
    Route::patch('/users/{user}/password', [UserController::class, 'updateUserPassword']); // Admin/Manager change user password
    Route::put('/users/{user}', [UserController::class, 'updateUser']); // Admin/Manager update user information
    Route::apiResource('users', UserController::class);

    // Profile management (current user)
    Route::get('/user/profile', [UserController::class, 'profile']);
    Route::patch('/user/profile', [UserController::class, 'updateProfile']);
    Route::post('/user/avatar', [UserController::class, 'uploadAvatar']);
    Route::patch('/user/password', [UserController::class, 'updatePassword']);
    Route::patch('/user/preferences', [UserController::class, 'updatePreferences']);

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

    // Time Tracking - Specific routes MUST come before apiResource
    Route::post('/time-entries/start', [TimeEntryController::class, 'startTimer']);
    Route::post('/time-entries/stop', [TimeEntryController::class, 'stopTimer']);
    Route::post('/time-entries/pause', [TimeEntryController::class, 'pauseTimer']);
    Route::post('/time-entries/resume', [TimeEntryController::class, 'resumeTimer']);
    Route::get('/time-entries/current', [TimeEntryController::class, 'current']);
    Route::get('/time-entries/timesheet', [TimeEntryController::class, 'timesheet']);
    Route::get('/time-entries/export', [TimeEntryController::class, 'export']);
    Route::post('/time-entries/bulk-approve', [TimeEntryController::class, 'bulkApprove']);
    Route::post('/time-entries/{timeEntry}/approve', [TimeEntryController::class, 'approve']);
    Route::apiResource('time-entries', TimeEntryController::class);

    // Timer shortcuts (legacy)
    Route::post('/timer/start', [TimeEntryController::class, 'startTimer']);
    Route::post('/timer/stop', [TimeEntryController::class, 'stopTimer']);
    Route::get('/timer/current', [TimeEntryController::class, 'currentTimer']);

    // Timesheet
    Route::get('/timesheet/week', [TimeEntryController::class, 'weeklyTimesheet']);
    Route::get('/timesheet/month', [TimeEntryController::class, 'monthlyTimesheet']);
    Route::post('/timesheet/submit', [TimeEntryController::class, 'submitTimesheet']);

    // Invoices
    Route::apiResource('invoices', InvoiceController::class);
    Route::post('/invoices/{invoice}/send', [InvoiceController::class, 'send']);
    Route::post('/invoices/{invoice}/validate', [InvoiceController::class, 'validate']);
    Route::post('/invoices/{invoice}/send-reminder', [InvoiceController::class, 'sendReminder']);
    Route::post('/invoices/{invoice}/mark-paid', [InvoiceController::class, 'markAsPaid']);
    Route::get('/invoices/{invoice}/pdf', [InvoiceController::class, 'downloadPdf']);
    Route::get('/invoices/{invoice}/facturx', [InvoiceController::class, 'downloadFacturX']);
    Route::post('/invoices/{invoice}/generate-facturx', [InvoiceController::class, 'generateFacturX']);
    Route::post('/invoices/{invoice}/chorus', [InvoiceController::class, 'sendToChorus']);
    Route::get('/invoices/{invoice}/audit-log', [InvoiceController::class, 'auditLog']);

    // French Invoice Types (Acomptes, Solde)
    Route::get('/invoices/available-advances/{clientId}', [InvoiceTypeController::class, 'getAvailableAdvances']);
    Route::post('/invoices/advance', [InvoiceTypeController::class, 'createAdvanceInvoice']);
    Route::post('/invoices/final', [InvoiceTypeController::class, 'createFinalInvoice']);
    Route::get('/invoices/advance-stats/{clientId}', [InvoiceTypeController::class, 'getAdvanceStats']);

    // French Compliance (Conformité française)
    Route::prefix('compliance')->group(function () {
        Route::get('/metrics', [ComplianceController::class, 'getMetrics']);
        Route::get('/non-compliant', [ComplianceController::class, 'getNonCompliantInvoices']);
        Route::get('/sequential-check', [ComplianceController::class, 'checkSequentialNumbering']);
        Route::post('/integrity-report', [ComplianceController::class, 'generateIntegrityReport']);
        Route::post('/invoices/{invoice}/validate', [ComplianceController::class, 'validateInvoice']);
        Route::post('/invoices/{invoice}/qr-code', [ComplianceController::class, 'generateSepaQrCode']);
        
        // FEC Export routes
        Route::post('/export/fec', [ComplianceController::class, 'exportFec']);
        Route::get('/invoices/{invoice}/audit-trail', [ComplianceController::class, 'exportInvoiceAuditTrail']);
        Route::post('/invoices/batch/audit-trail', [ComplianceController::class, 'exportBatchAuditTrail']);
    });

    // Quotes
    Route::apiResource('quotes', QuoteController::class);
    Route::post('/quotes/{quote}/send', [QuoteController::class, 'send']);
    Route::post('/quotes/{quote}/accept', [QuoteController::class, 'accept']);
    Route::post('/quotes/{quote}/reject', [QuoteController::class, 'reject']);
    Route::post('/quotes/{quote}/cancel', [QuoteController::class, 'cancel']);
    Route::post('/quotes/{quote}/convert', [QuoteController::class, 'convertToInvoice']);
    Route::get('/quotes/{quote}/pdf', [QuoteController::class, 'downloadPdf']);

    // Credit Notes
    Route::apiResource('credit-notes', CreditNoteController::class);
    Route::post('/credit-notes/{credit_note}/issue', [CreditNoteController::class, 'issue']);
    Route::post('/credit-notes/{credit_note}/send', [CreditNoteController::class, 'send']);
    Route::post('/credit-notes/{credit_note}/apply', [CreditNoteController::class, 'apply']);
    Route::get('/credit-notes/{credit_note}/pdf', [CreditNoteController::class, 'downloadPdf']);
    Route::post('/credit-notes/from-invoice', [CreditNoteController::class, 'createFromInvoice']);
    Route::get('/credit-notes/{credit_note}/facturx', [CreditNoteController::class, 'downloadFacturX']);
    Route::post('/credit-notes/{credit_note}/generate-facturx', [CreditNoteController::class, 'generateFacturX']);
    
    // Invoice - Credit Notes operations
    Route::post('/invoices/{invoice}/create-credit-note', [InvoiceController::class, 'createCreditNote']);
    Route::post('/invoices/{invoice}/cancel', [InvoiceController::class, 'cancelInvoice']);
    Route::get('/invoices/{invoice}/credit-notes', [InvoiceController::class, 'getCreditNotes']);

    // Payments (Stripe)
    Route::apiResource('payments', PaymentController::class)->only(['index', 'show']);
    Route::get('/payments/config', [PaymentController::class, 'getPublishableKey']);
    Route::post('/payments/invoices/{invoice}/checkout-session', [PaymentController::class, 'createCheckoutSession']);
    Route::post('/payments/invoices/{invoice}/payment-intent', [PaymentController::class, 'createPaymentIntent']);
    Route::post('/payments/payment-intents/{paymentIntent}/confirm', [PaymentController::class, 'confirmPayment']);
    Route::get('/payments/payment-intents/{paymentIntent}/status', [PaymentController::class, 'getPaymentStatus']);
    Route::post('/payments/payment-intents/{paymentIntent}/cancel', [PaymentController::class, 'cancelPayment']);
    Route::post('/payments/{payment}/refund', [PaymentController::class, 'refundPayment']);

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

    // Stripe Settings (Tenant-specific)
    Route::get('/settings/stripe', [SettingsController::class, 'getStripeSettings']);
    Route::post('/settings/stripe', [SettingsController::class, 'updateStripeSettings']);
    Route::post('/settings/stripe/test', [SettingsController::class, 'testStripeConnection']);
    Route::post('/settings/stripe/disable', [SettingsController::class, 'disableStripe']);

    // Tenant Billing Settings
    Route::get('/settings/billing', [TenantSettingsController::class, 'getBillingSettings']);
    Route::post('/settings/billing', [TenantSettingsController::class, 'updateBillingSettings']);
    Route::post('/settings/billing/logo', [TenantSettingsController::class, 'uploadLogo']);
    Route::delete('/settings/billing/logo', [TenantSettingsController::class, 'deleteLogo']);
    
    // VAT Threshold Status (for dashboard widget)
    Route::get('/tenant/vat-threshold-status', [TenantSettingsController::class, 'getVatThresholdStatus']);

    // VAT threshold status
    Route::get('/vat/status', function () {
        $tenant = auth()->user()->tenant;
        $yearlyRevenue = $tenant->vat_threshold_year_total ?? $tenant->calculateYearlyRevenue();
        $threshold = $tenant->vat_threshold_services ?? 36800;
        $percentage = $threshold > 0 ? ($yearlyRevenue / $threshold) * 100 : 0;
        
        return response()->json([
            'vat_subject' => $tenant->vat_subject,
            'yearly_revenue' => $yearlyRevenue,
            'threshold' => $threshold,
            'percentage' => round($percentage, 1),
            'is_approaching' => $tenant->isApproachingVatThreshold(),
            'threshold_exceeded_at' => $tenant->vat_threshold_exceeded_at,
            'auto_apply_vat' => $tenant->auto_apply_vat_on_threshold,
        ]);
    });

    // Google Calendar Integration
    Route::get('/google-calendar/status', [GoogleCalendarController::class, 'status']);
    Route::get('/google-calendar/connect', [GoogleCalendarController::class, 'connect']);
    Route::post('/google-calendar/callback', [GoogleCalendarController::class, 'callback']);
    Route::post('/google-calendar/disconnect', [GoogleCalendarController::class, 'disconnect']);
    Route::get('/google-calendar/calendars', [GoogleCalendarController::class, 'calendars']);
    Route::post('/google-calendar/settings', [GoogleCalendarController::class, 'updateSettings']);
    Route::post('/google-calendar/toggle-sync', [GoogleCalendarController::class, 'toggleSync']);

    // Notifications
    Route::get('/notifications', [\App\Http\Controllers\NotificationController::class, 'index']);
    Route::get('/notifications/preferences', [\App\Http\Controllers\NotificationController::class, 'getPreferences']);
    Route::put('/notifications/preferences', [\App\Http\Controllers\NotificationController::class, 'updatePreferences']);
    Route::post('/notifications/subscribe', [NotificationController::class, 'subscribe']);
    Route::post('/notifications/unsubscribe', [NotificationController::class, 'unsubscribe']);
    Route::get('/notifications/subscriptions', [NotificationController::class, 'getSubscriptions']);
    Route::delete('/notifications/subscriptions/{id}', [NotificationController::class, 'deleteSubscription']);
    Route::get('/notifications/history', [NotificationController::class, 'getHistory']);
    Route::put('/notifications/{id}/read', [\App\Http\Controllers\NotificationController::class, 'markAsRead']);
    Route::put('/notifications/read-all', [\App\Http\Controllers\NotificationController::class, 'markAllAsRead']);
    Route::get('/notifications/unread-count', [\App\Http\Controllers\NotificationController::class, 'unreadCount']);
    Route::delete('/notifications/{id}', [\App\Http\Controllers\NotificationController::class, 'destroy']);
    Route::post('/notifications/test', [NotificationController::class, 'testNotification']);
    Route::get('/notifications/vapid-key', [NotificationController::class, 'getVapidPublicKey']);

    // Timer notifications
    Route::post('/notifications/timer-started', [\App\Http\Controllers\NotificationController::class, 'timerStarted']);
    Route::post('/notifications/timer-stopped', [\App\Http\Controllers\NotificationController::class, 'timerStopped']);
    Route::post('/notifications/timer-long-running', [\App\Http\Controllers\NotificationController::class, 'timerLongRunning']);

    // Invoice notifications
    Route::post('/notifications/invoice-created', [\App\Http\Controllers\NotificationController::class, 'invoiceCreated']);
    Route::post('/notifications/payment-received', [\App\Http\Controllers\NotificationController::class, 'paymentReceived']);

    // Project notifications
    Route::post('/notifications/project-deadline', [\App\Http\Controllers\NotificationController::class, 'projectDeadlineApproaching']);
    Route::post('/notifications/task-assigned', [\App\Http\Controllers\NotificationController::class, 'taskAssigned']);

    // Admin Routes (Super Admin only)
    Route::prefix('admin')->middleware(['auth:sanctum', 'super_admin'])->group(function () {
        // Dashboard Stats
        Route::get('/stats', [AdminController::class, 'getStats']);
        Route::get('/activity', [AdminController::class, 'getActivity']);
        Route::get('/revenue-chart', [AdminController::class, 'getRevenueChart']);
        Route::get('/user-growth-chart', [AdminController::class, 'getUserGrowthChart']);
        Route::get('/reports', [AdminController::class, 'getReportsData']);

        // Billing
        Route::get('/billing/overview', [AdminController::class, 'getBillingOverview']);
        Route::get('/billing/subscriptions', [AdminController::class, 'getSubscriptions']);
        Route::get('/billing/payments', [AdminController::class, 'getPaymentHistory']);
        Route::get('/billing/revenue-breakdown', [AdminController::class, 'getRevenueBreakdown']);

        // Monitoring
        Route::get('/monitoring/metrics', [AdminController::class, 'getSystemMetrics']);
        Route::get('/monitoring/errors', [AdminController::class, 'getErrors']);
        Route::get('/monitoring/performance', [AdminController::class, 'getPerformanceMetrics']);
        Route::get('/monitoring/health', [AdminController::class, 'getServiceHealth']);

        // Notifications
        Route::get('/notifications', [AdminController::class, 'getSystemNotifications']);
        Route::post('/notifications/{id}/read', [AdminController::class, 'markNotificationRead']);
        Route::get('/notifications/alert-rules', [AdminController::class, 'getAlertRules']);

        // User Management (routes without {id} must come first)
        Route::get('/users/stats', [AdminController::class, 'getUserStats']);
        Route::get('/users/export', [AdminController::class, 'exportUsers']);
        Route::get('/users', [AdminController::class, 'getUsers']);
        Route::post('/users', [AdminController::class, 'storeUser']);
        Route::get('/users/{id}', [AdminController::class, 'showUser']);
        Route::put('/users/{id}', [AdminController::class, 'updateUser']);
        Route::delete('/users/{id}', [AdminController::class, 'deleteUser']);
        Route::post('/users/{id}/suspend', [AdminController::class, 'suspendUser']);
        Route::post('/users/{id}/activate', [AdminController::class, 'activateUser']);
        Route::post('/users/{id}/reset-password', [AdminController::class, 'resetUserPassword']);
        Route::post('/users/{id}/assign-role', [AdminController::class, 'assignRole']);
        Route::post('/users/{id}/impersonate', [AdminController::class, 'impersonateUser']);

        // Tenant Management
        Route::get('/tenants', [AdminController::class, 'getTenants']);
        Route::post('/tenants/{id}/suspend', [AdminController::class, 'suspendTenant']);
        Route::post('/tenants/{id}/activate', [AdminController::class, 'activateTenant']);
        Route::delete('/tenants/{id}', [AdminController::class, 'deleteTenant']);

        // Audit Logs
        Route::get('/audit-logs', [AdminController::class, 'getAuditLogs']);
        Route::get('/audit-logs/export', [AdminController::class, 'exportAuditLogs']);

        // System Settings
        Route::get('/system-settings', [AdminController::class, 'getSystemSettings']);
        Route::post('/system-settings', [AdminController::class, 'saveSystemSettings']);
    });
});
